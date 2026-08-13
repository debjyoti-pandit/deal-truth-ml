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

The JSON template uses placeholders (`<your estimate>`) with a scoring rubric — **never literal
numbers**. Qwen echoes literal template scores verbatim (every match came back `0.82` before
this was fixed), which flattens the confidence values the API uses for thresholds.

## Emotions

Three independent axes with full label lists from `src/taxonomies/emotions.ts`. The prompt includes the “love the product / budget frozen” example so the model keeps praise and commercial blockers apart.

The worked example carries its own realistic scores and the prompt says “never copy scores
from this prompt”. The previous template hardcoded `"score":0.0`, the model echoed it, and
every label fell below the 0.2 threshold — the API saw permanently empty emotion labels.
Per axis the model returns only labels scoring ≥ 0.25 (max 4).

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
