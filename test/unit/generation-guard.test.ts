import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/index';
import type { AiBinding } from '../../src/ai/client';
import type { Env } from '../../src/env';
import {
  GENERATE_TASKS,
  SCAFFOLD_PATTERNS,
  generatedTextSchema,
  generationResultSchema,
  scaffoldViolations,
} from '../../src/ai/schemas';
import { LLM_SCHEMA_MISMATCH } from '../../src/services/generate';

const SAMPLE = 'Thanks for the time today. I will send the security questionnaire tonight.';

/**
 * Replies in order; the last reply repeats once the script runs out. Nothing throws, so the
 * call count is exactly the number of generation attempts the service chose to make.
 */
class ScriptedAi implements AiBinding {
  readonly calls: { model: string; inputs: Record<string, unknown> }[] = [];

  constructor(private readonly replies: string[]) {}

  async run(model: string, inputs: Record<string, unknown> = {}): Promise<unknown> {
    this.calls.push({ model, inputs });
    const index = Math.min(this.calls.length - 1, this.replies.length - 1);
    return { response: this.replies[index] };
  }

  promptAt(attempt: number): string {
    const messages = this.calls[attempt]?.inputs.messages;
    if (!Array.isArray(messages)) {
      return '';
    }
    return messages
      .map((message) => String((message as { content?: unknown }).content ?? ''))
      .join('\n');
  }
}

function envFor(ai: AiBinding, overrides: Partial<Env> = {}): Env {
  return {
    AI: ai,
    INTERNAL_API_TOKEN: '',
    ENABLE_GENERATION: 'true',
    MAX_BATCH_SIZE: '32',
    MAX_TEXT_CHARS: '8000',
    LOG_LEVEL: 'error',
    FAST_MODEL_ID: '@cf/qwen/qwen3-30b-a3b-fp8',
    QUALITY_MODEL_ID: '@cf/openai/gpt-oss-120b',
    EMBEDDING_MODEL_ID: '@cf/qwen/qwen3-embedding-0.6b',
    RERANK_MODEL_ID: '@cf/baai/bge-reranker-base',
    EMBEDDING_DIMENSION: '1024',
    ...overrides,
  };
}

async function post(
  path: string,
  body: unknown,
  ai: AiBinding,
  overrides: Partial<Env> = {},
): Promise<{ status: number; raw: string; json: Record<string, unknown> }> {
  const response = await createApp(envFor(ai, overrides)).request(`http://ml${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const raw = await response.text();
  return { status: response.status, raw, json: JSON.parse(raw) as Record<string, unknown> };
}

/** Every string value anywhere in the envelope, not just `text`. */
function stringLeaves(value: unknown, acc: string[] = []): string[] {
  if (typeof value === 'string') {
    acc.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) {
      stringLeaves(item, acc);
    }
  } else if (typeof value === 'object' && value !== null) {
    for (const [key, nested] of Object.entries(value)) {
      acc.push(key);
      stringLeaves(nested, acc);
    }
  }
  return acc;
}

/**
 * Scaffolding anywhere in a response body — key or value, at any depth. Leaves are checked
 * rather than the raw serialization because JSON's own nesting emits `}}`, which is a real
 * leak signal inside generated prose but is just punctuation in the envelope around it.
 */
function bodyViolations(json: unknown): string[] {
  return [...new Set(stringLeaves(json).flatMap((leaf) => scaffoldViolations(leaf)))];
}

/** Scaffolding a prompt must not name, so the model cannot copy it back. `prompt_echo` is
 *  excluded on purpose: the prompt is allowed to contain its own `Input:` header. */
function promptViolations(prompt: string): string[] {
  return scaffoldViolations(prompt).filter((id) => id !== 'prompt_echo');
}

function errorOf(json: Record<string, unknown>): {
  code: string;
  message: string;
  details: Record<string, unknown>;
} {
  return json.error as { code: string; message: string; details: Record<string, unknown> };
}

// Everything the model can only have copied from its prompt or its chat template.
const LEAKED = [
  'assistant: Sure!',
  'Here is the JSON you asked for.',
  '<|im_start|>assistant',
  'Summary {{summary}} with score: 0.91',
  '{"score": 0.91}',
  '<think>the user wants a summary</think>',
  'system: You are Deal Truth ML.',
  '[INST] rewrite this [/INST]',
  'Input:\nThanks for the time today.',
];

describe('scaffolding detection', () => {
  it('flags each token class the guard exists for', () => {
    expect(scaffoldViolations('assistant: Sure!')).toContain('role_marker');
    expect(scaffoldViolations('<|im_end|>')).toContain('chat_template_token');
    expect(scaffoldViolations('confidence score: 0.9')).toContain('score_placeholder');
    expect(scaffoldViolations('Hello {{name}}')).toContain('template_placeholder');
    expect(scaffoldViolations('Here is the JSON:')).toContain('json_preamble');
  });

  it('rejects every leaked sample and accepts clean prose', () => {
    for (const leak of LEAKED) {
      expect(generatedTextSchema.safeParse(leak).success, `accepted a leak: ${leak}`).toBe(false);
    }
    const clean = generatedTextSchema.safeParse(
      '  The customer needs security sign-off before renewal.  ',
    );
    expect(clean.success).toBe(true);
    expect(clean.success && clean.data).toBe(
      'The customer needs security sign-off before renewal.',
    );
  });

  it('rejects an empty or whitespace-only generation', () => {
    expect(generatedTextSchema.safeParse('').success).toBe(false);
    expect(generatedTextSchema.safeParse('   \n\t ').success).toBe(false);
  });

  it('never claims grounding in a validated result', () => {
    const grounded = generationResultSchema.safeParse({
      text: 'A clean summary.',
      task: 'summary_fallback',
      model: '@cf/qwen/qwen3-30b-a3b-fp8',
      grounded: true,
      metadata: { max_new_tokens: 180, temperature: 0 },
    });
    expect(grounded.success, 'grounded:true must not be representable').toBe(false);
  });

  it('carries no g flag on any pattern', () => {
    // A /g/ regex keeps `lastIndex` between `.test()` calls and would pass every second string.
    for (const rule of SCAFFOLD_PATTERNS) {
      expect(rule.pattern.global, `${rule.id} is global`).toBe(false);
    }
  });
});

describe('POST /v1/generate keeps the real wire contract', () => {
  it('accepts {task, input} and returns ungrounded metadata', async () => {
    const ai = new ScriptedAi(['The customer will send the security questionnaire tonight.']);
    const { status, json } = await post(
      '/v1/generate',
      { task: 'summary_fallback', input: SAMPLE },
      ai,
    );
    expect(status).toBe(200);
    expect(json.text).toBe('The customer will send the security questionnaire tonight.');
    expect(json.grounded).toBe(false);
    expect(json.task).toBe('summary_fallback');
    expect(bodyViolations(json)).toEqual([]);
  });

  it('rejects the {task, text} shape rather than silently accepting it', async () => {
    // The route takes `input`, not `text`, and `summary` is not one of the four tasks.
    const ai = new ScriptedAi(['ignored']);
    const { status, json } = await post('/v1/generate', { task: 'summary', text: SAMPLE }, ai);
    expect(status).toBe(400);
    expect(errorOf(json).code).toBe('INVALID_REQUEST');
    expect(ai.calls).toHaveLength(0);
  });
});

describe('a leaked generation never reaches the caller', () => {
  it('returns the named error instead of the text, for every task', async () => {
    for (const task of GENERATE_TASKS) {
      const ai = new ScriptedAi(['assistant: Here is the JSON {{"score": 0.91}}']);
      const { status, json, raw } = await post('/v1/generate', { task, input: SAMPLE }, ai);
      expect(status, `${task} leaked through`).toBe(502);
      const error = errorOf(json);
      expect(error.code).toBe('SCHEMA_INVALID');
      expect(error.details.reason).toBe(LLM_SCHEMA_MISMATCH);
      expect(error.details.task).toBe(task);
      expect(json.text, 'no prose may accompany the error').toBeUndefined();
      expect(raw).not.toContain('Here is the JSON');
      expect(bodyViolations(json), `${task} body carried scaffolding`).toEqual([]);
    }
  });

  it('never lets any leaked sample out of any route', async () => {
    for (const leak of LEAKED) {
      const ai = new ScriptedAi([leak]);
      const v1 = await post('/v1/generate', { task: 'email_polish', input: SAMPLE }, ai);
      expect(v1.status, `v1 returned ${leak}`).toBe(502);
      expect(bodyViolations(v1.json)).toEqual([]);

      const compat = await post('/generate', { prompt: SAMPLE }, new ScriptedAi([leak]));
      expect(compat.status, `compat returned ${leak}`).toBe(502);
      expect(errorOf(compat.json).details.reason).toBe(LLM_SCHEMA_MISMATCH);
      expect(bodyViolations(compat.json)).toEqual([]);
    }
  });

  it('reports reason codes only — never the rejected text', async () => {
    const ai = new ScriptedAi(['assistant: Here is the JSON {{"score": 0.91}}']);
    const { json } = await post('/v1/generate', { task: 'qa_synthesis', input: SAMPLE }, ai);
    const violations = errorOf(json).details.violations as string[];
    expect(violations.length).toBeGreaterThan(0);
    for (const violation of violations) {
      expect(violation).toMatch(/^(scaffolding:[a-z_]+|generation:[a-z_]+)$/);
    }
    expect(violations).toContain('scaffolding:role_marker');
  });

  it('rejects an empty generation as a mismatch, not as an empty answer', async () => {
    const ai = new ScriptedAi(['   ']);
    const { status, json } = await post(
      '/v1/generate',
      { task: 'battlecard_polish', input: SAMPLE },
      ai,
    );
    // An all-whitespace body reaches extractGeneratedText as "no text" upstream; either way the
    // caller gets a named failure and never an empty string presented as a finished answer.
    expect(status).toBe(502);
    expect(['SCHEMA_INVALID', 'UPSTREAM_AI_ERROR']).toContain(errorOf(json).code);
    expect(json.text).toBeUndefined();
  });
});

describe('the retry is bounded and aimed', () => {
  it('retries exactly once, then fails cleanly', async () => {
    const ai = new ScriptedAi(['assistant: still template text with score: 0.4']);
    const { status, json } = await post(
      '/v1/generate',
      { task: 'summary_fallback', input: SAMPLE },
      ai,
    );
    expect(ai.calls, 'one attempt plus exactly one retry').toHaveLength(2);
    expect(status).toBe(502);
    expect(errorOf(json).details.attempts).toBe(2);
  });

  it('attaches the parse error to the retry prompt', async () => {
    const ai = new ScriptedAi([
      'assistant: Here is the JSON',
      'Security review is the blocker; the customer sends the questionnaire tonight.',
    ]);
    const { status, json, raw } = await post(
      '/v1/generate',
      { task: 'summary_fallback', input: SAMPLE },
      ai,
    );
    expect(status).toBe(200);
    expect(json.text).toBe(
      'Security review is the blocker; the customer sends the questionnaire tonight.',
    );
    expect(raw, 'the rejected first attempt must not ride along').not.toContain('Here is the JSON');
    expect(ai.calls).toHaveLength(2);
    const retry = ai.promptAt(1);
    expect(retry).toContain('rejected by an automatic validator');
    expect(retry).toContain('scaffolding:role_marker');
    // The retry prompt describes the ban in words; naming the tokens literally would feed the
    // model the very strings it just leaked.
    expect(promptViolations(retry), 'the retry prompt itself names a banned token').toEqual([]);
    expect(bodyViolations(json)).toEqual([]);
  });

  it('does not retry a generation that was already clean', async () => {
    const ai = new ScriptedAi(['A concise, clean summary of the call.']);
    const { status } = await post('/v1/generate', { task: 'email_polish', input: SAMPLE }, ai);
    expect(status).toBe(200);
    expect(ai.calls).toHaveLength(1);
  });
});
