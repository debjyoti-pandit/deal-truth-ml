import { z } from 'zod';

const unitScore = z.coerce.number().transform((value) => Math.min(1, Math.max(0, value)));

export const scoredLabelSchema = z.object({
  id: z.string().min(1),
  score: unitScore,
});

export const classifyItemSchema = z.object({
  id: z.coerce.string(),
  labels: z.array(scoredLabelSchema).default([]),
});

export const classifyResponseSchema = z.object({
  items: z.array(classifyItemSchema),
});

export const emotionBlockSchema = z.object({
  label: z.string().min(1),
  score: unitScore,
});

// Partial rows are usable: a missing axis must not fail parsing (strict parsing made the
// repair pass return empty items and the API saw all-empty labels). It stays `undefined`
// rather than defaulting to `[]` so the service can tell "scored, nothing confident" from
// "never scored" — the two mean opposite things downstream and `[]` cannot carry both.
export const emotionItemSchema = z.object({
  id: z.coerce.string(),
  emotion: z.array(emotionBlockSchema).optional(),
  buying_intent: z.array(emotionBlockSchema).optional(),
  deal_signals: z.array(emotionBlockSchema).optional(),
});

export const emotionResponseSchema = z.object({
  items: z.array(emotionItemSchema),
});

export const candidateInsightSchema = z.object({
  type: z.string(),
  summary: z.string(),
  segment_ids: z.array(z.union([z.string(), z.number()])),
  speaker_role: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const candidatesSchema = z.object({
  pains: z.array(candidateInsightSchema).default([]),
  blockers: z.array(candidateInsightSchema).default([]),
  commitments: z.array(candidateInsightSchema).default([]),
  competitors: z.array(candidateInsightSchema).default([]),
  signals: z.array(candidateInsightSchema).default([]),
  objections: z.array(candidateInsightSchema).default([]),
  reality_checks: z.array(candidateInsightSchema).default([]),
});

export const judgedInsightSchema = z.object({
  summary: z.string(),
  segment_ids: z.array(z.union([z.string(), z.number()])),
  severity: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  supported: z.boolean().optional(),
});

export const analyzeCallSchema = z.object({
  customer_truth: z.array(judgedInsightSchema).default([]),
  objections: z.array(judgedInsightSchema).default([]),
  commitments: z.array(judgedInsightSchema).default([]),
  risks: z.array(judgedInsightSchema).default([]),
  competitors: z.array(judgedInsightSchema).default([]),
  buying_signals: z.array(judgedInsightSchema).default([]),
  reality_checks: z.array(judgedInsightSchema).default([]),
});

export const GENERATE_TASKS = [
  'summary_fallback',
  'email_polish',
  'battlecard_polish',
  'qa_synthesis',
] as const;

export type GenerateTask = (typeof GENERATE_TASKS)[number];

// Scaffolding the model can only have got from its own prompt or chat template. None of it is
// a generated answer, so none of it may reach a response body — a leaked `score:` or
// `assistant:` reads downstream as model prose that looks like a finding, which is exactly
// what the evidence gate exists to stop. Detection is a property of the schema, not of prompt
// wording, so no prompt regression can reopen the hole. Patterns are deliberately unanchored
// and carry no `g` flag (a `g` regex keeps `lastIndex` between `.test()` calls and would skip
// every second match).
export const SCAFFOLD_PATTERNS: { id: string; pattern: RegExp }[] = [
  // <|im_start|>, <|im_end|>, <|endoftext|>, and every other chat-template delimiter.
  { id: 'chat_template_token', pattern: /<\||\|>/ },
  { id: 'special_token', pattern: /<\/?(?:s|think|thinking)>/i },
  { id: 'instruction_token', pattern: /\[\/?(?:INST|SYS)\]/i },
  { id: 'role_marker', pattern: /(?:^|[\s"'*`>\]])(?:assistant|system|user)\s*:/i },
  // Bare `score:` and the JSON key form `"score":` — the quote sits between the word and the
  // colon, so a naive /\bscore\s*:/ misses exactly the shape the model actually echoes.
  { id: 'score_placeholder', pattern: /\bscore\b["']?\s*:/i },
  { id: 'template_placeholder', pattern: /\{\{|\}\}/ },
  {
    id: 'json_preamble',
    pattern: /here\s+(?:is|are|'s)\s+(?:the|your|a|an)?\s*(?:json|output|result|response)/i,
  },
  // The generate prompt's own `Input:` header echoed back as a line of its own.
  { id: 'prompt_echo', pattern: /^[ \t]*input[ \t]*:[ \t]*$/im },
];

/** Scaffolding pattern ids present in `text`. Empty means the string is safe to return. */
export function scaffoldViolations(text: string): string[] {
  return [...new Set(SCAFFOLD_PATTERNS.filter((rule) => rule.pattern.test(text)).map((r) => r.id))];
}

export const generatedTextSchema = z
  .string()
  .trim()
  .min(1, 'generation:empty_text')
  .superRefine((value, ctx) => {
    for (const id of scaffoldViolations(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `scaffolding:${id}` });
    }
  });

// The whole envelope is validated, not just the prose: `grounded` is pinned to the literal
// `false` so no future edit can ship a generation that claims factual grounding.
export const generationResultSchema = z.object({
  text: generatedTextSchema,
  task: z.enum(GENERATE_TASKS),
  model: z.string().min(1, 'generation:missing_model'),
  grounded: z.literal(false),
  metadata: z.object({
    max_new_tokens: z.number().int().positive(),
    temperature: z.number().min(0).max(1),
  }),
});

export type ClassifyResponse = z.infer<typeof classifyResponseSchema>;
export type EmotionResponse = z.infer<typeof emotionResponseSchema>;
export type Candidates = z.infer<typeof candidatesSchema>;
export type AnalyzeCall = z.infer<typeof analyzeCallSchema>;
export type GenerationResult = z.infer<typeof generationResultSchema>;
