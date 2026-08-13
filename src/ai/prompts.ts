import { BUYING_INTENT, DEAL_SIGNALS, SALES_EMOTIONS } from '../taxonomies/emotions';

export const JSON_SYSTEM = `You are Deal Truth ML, an inference worker for sales-call intelligence.
/no_think
Do not use chain-of-thought or reasoning. Return ONLY valid JSON. No markdown, no commentary, no timestamps, no invented quotes.
Never merge emotion, buying intent, and deal signals into one score.
Factual claims must reference existing transcript segment IDs only.
Do not claim the output is factually grounded beyond the provided text.`;

export function classifyPrompt(
  items: { id: string; text: string }[],
  labels: { id: string; hypothesis: string }[],
): string {
  return `Score each text against the candidate labels from 0.0 to 1.0.
Use the hypothesis as the meaning of the label.
Return compact JSON only. For each item include at most 8 labels with score >= 0.35. Omit the rest. No reasoning.

Labels:
${labels.map((label) => `- ${label.id}: ${label.hypothesis}`).join('\n')}

Items:
${items.map((item) => `- id=${item.id} text=${JSON.stringify(item.text)}`).join('\n')}

Return JSON:
{"items":[{"id":"...","labels":[{"id":"...","score":0.82}]}]}`;
}

export function emotionsPrompt(items: { id: string; text: string }[]): string {
  return `Classify each sales utterance. Keep three independent axes. Do not merge them.

Emotion labels (choose scores for all): ${SALES_EMOTIONS.join(', ')}
Buying intent labels (choose scores for all): ${BUYING_INTENT.join(', ')}
Deal signal labels (choose scores for all): ${DEAL_SIGNALS.join(', ')}

Example: "I absolutely love this product, but finance froze our budget until next year."
- emotion: enthusiastic high
- buying_intent: negative/weak
- deal_signals: budget_blocker high

Items:
${items.map((item) => `- id=${item.id} text=${JSON.stringify(item.text)}`).join('\n')}

Return JSON:
{"items":[{"id":"...","emotion":[{"label":"enthusiastic","score":0.0}],"buying_intent":[{"label":"negative","score":0.0}],"deal_signals":[{"label":"budget_blocker","score":0.0}]}]}`;
}

export function generatePrompt(task: string, input: string): string {
  const instructions: Record<string, string> = {
    summary_fallback:
      'Write a concise call summary from the input. Do not invent facts. Do not claim grounding.',
    email_polish:
      'Polish the follow-up email wording. Preserve meaning and sentence count. Do not add commitments.',
    battlecard_polish:
      'Polish the next-call battlecard wording. Do not add facts that are not in the input.',
    qa_synthesis:
      'Synthesize an answer from retrieved passages. Cite segment IDs already present in the input. Do not invent evidence.',
  };
  const instruction = instructions[task] ?? 'Rewrite the input helpfully without adding facts.';
  return `${instruction}\n\nInput:\n${input}`;
}

export function candidatesPrompt(
  segments: { id: string; speaker_role: string; text: string }[],
): string {
  const body = segments
    .map((segment) => `[${segment.id}|${segment.speaker_role}] ${segment.text}`)
    .join('\n');
  return `Stage 1 — fast candidate generation.
From the diarized transcript, list possible pains, blockers, commitments, competitors, signals, objections, and reality checks.
Use only provided segment IDs. Do not invent quotes or timestamps.

Transcript:
${body}

Return JSON:
{"pains":[{"type":"pain","summary":"...","segment_ids":["..."],"confidence":0.0}],"blockers":[],"commitments":[],"competitors":[],"signals":[],"objections":[],"reality_checks":[]}`;
}

export function judgePrompt(
  candidates: unknown,
  relevantSegments: { id: string; speaker_role: string; text: string }[],
): string {
  const context = relevantSegments
    .map((segment) => `[${segment.id}|${segment.speaker_role}] ${segment.text}`)
    .join('\n');
  return `Stage 2 — high-quality judge.
Given candidates and only the relevant transcript context, keep only supported insights.
Drop unsupported claims. Do not invent timestamps or quotes. Reference segment IDs only.

Candidates:
${JSON.stringify(candidates)}

Relevant context:
${context}

Return JSON:
{"customer_truth":[{"summary":"...","segment_ids":["..."],"severity":"high","confidence":0.0,"supported":true}],"objections":[],"commitments":[],"risks":[],"competitors":[],"buying_signals":[],"reality_checks":[]}`;
}

export function repairPrompt(invalid: string, schemaHint: string): string {
  return `The previous output was invalid. Return ONLY valid JSON matching this shape: ${schemaHint}

Invalid output:
${invalid.slice(0, 4000)}`;
}
