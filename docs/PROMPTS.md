# Prompts

System contract (all JSON tasks):

- Return only valid JSON.
- No markdown, commentary, timestamps, or invented quotes.
- Never merge emotion, buying intent, and deal signals.
- Factual claims reference existing segment IDs only.
- Do not claim factual grounding beyond the provided text.

Exact templates live in `src/ai/prompts.ts`.

## Fast classify

Score each item against each candidate hypothesis 0.0–1.0. Shape: `{items:[{id, labels:[{id, score}]}]}`.

## Emotions

Three independent axes with full label lists from `src/taxonomies/emotions.ts`. The prompt includes the “love the product / budget frozen” example so the model keeps praise and commercial blockers apart.

## Stage 1 candidates (Qwen)

Input: `[segmentId|speaker_role] text`. Output groups: pains, blockers, commitments, competitors, signals, objections, reality_checks. Each row: type, summary, segment_ids, optional confidence.

## Stage 2 judge (GPT-OSS-120B)

Input: JSON candidates + only the referenced segments (fallback: first 20). Output: customer_truth, objections, commitments, risks, competitors, buying_signals, reality_checks. Drop unsupported claims.

## Generation tasks

| Task | Instruction | Model |
|---|---|---|
| `summary_fallback` | Concise summary. No invented facts. | fast |
| `email_polish` | Polish wording. Preserve meaning. No new commitments. | fast |
| `battlecard_polish` | Polish battlecard. No new facts. | fast |
| `qa_synthesis` | Answer from retrieved passages. Cite provided segment IDs. | quality |

## Repair

One follow-up: “previous output was invalid, return only valid JSON matching the requested schema.”
