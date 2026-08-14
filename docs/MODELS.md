# Models

All inference is Cloudflare Workers AI. Model IDs are wrangler vars and can be overridden.

| Role    | ID                              | Notes                                                                                         |
| ------- | ------------------------------- | --------------------------------------------------------------------------------------------- |
| Fast    | `@cf/qwen/qwen3-30b-a3b-fp8`    | MoE, ~3B active params per pass. Segment classify, emotions, stage-1 candidates, most polish. |
| Quality | `@cf/openai/gpt-oss-120b`       | 120B class, 128K context, structured responses. Judge, Ask synthesis, high-stakes reasoning.  |
| Embed   | `@cf/qwen/qwen3-embedding-0.6b` | 1024-dim, 8,192-token context. Replaces BGE-small 384-dim.                                    |
| Rerank  | `@cf/baai/bge-reranker-base`    | Query + passages → relevance scores.                                                          |

Docs:

- https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/
- https://developers.cloudflare.com/workers-ai/models/qwen3-embedding-0.6b/
- https://developers.cloudflare.com/workers-ai/models/bge-reranker-base/
- https://blog.cloudflare.com/openai-gpt-oss-on-workers-ai/

## Routing rules

1. Per-segment or high-volume → fast path.
2. Whole-call reasoning and judge → quality path.
3. Never send the full transcript to 120B when candidates already exist; send candidates + relevant segments.
4. Embeddings and rerank never go through chat models.
5. Generation is optional (`ENABLE_GENERATION=false` → `GENERATION_DISABLED`).

## Neuron costs (indicative, Cloudflare accounting)

GPT-OSS-120B (published equivalents):

- ~31,818 neurons / million input tokens
- ~68,182 neurons / million output tokens

Example 5k in + 2k out ≈ 295 neurons.

Qwen3-30B-A3B input is listed around 4,625 neurons / million tokens — use it for volume.

Free allocation: 10,000 neurons/day on Workers Free. Exhaustion returns `QUOTA_EXCEEDED` and does not auto-bill on that plan.

## Strict JSON

Chat models are prompted for JSON only. Output is parsed, validated with zod, and repaired **once**. A second failure is `SCHEMA_INVALID`. Classify and emotion batches are chunked (3–4 items) so Qwen does not hit max_tokens and return truncated JSON.

Models must return segment IDs, never timestamps or invented quotes.

## Generation guard

`/v1/generate` returns prose, not JSON, so it gets its own gate. Every generation is validated
against `generationResultSchema` (`src/ai/schemas.ts`) **before** it is returned — the service
cannot hand back a string it has not parsed.

The schema rejects a generation that carries scaffolding the model can only have copied from
its own prompt or chat template:

| Pattern id             | Catches                                      |
| ---------------------- | -------------------------------------------- |
| `chat_template_token`  | `<\                                          |
| `special_token`        | `<s>`, `</s>`, `<think>`                     |
| `instruction_token`    | `[INST]`, `[/INST]`, `[SYS]`                 |
| `role_marker`          | `assistant:`, `system:`, `user:`             |
| `score_placeholder`    | `score:` and the JSON key form `"score":`    |
| `template_placeholder` | `{{`, `}}`                                   |
| `json_preamble`        | "Here is the JSON", "here's the output", …   |
| `prompt_echo`          | the prompt's own `Input:` header echoed back |

`grounded` is pinned to the literal `false` in the same schema, so no future edit can ship a
generation that claims factual grounding.

On mismatch the service makes **one** aimed retry — the validator's reason codes are attached to
the prompt so the second attempt is corrective, not a blind re-roll — and then fails. There is no
third attempt and no way to configure one. The failure is `SCHEMA_INVALID` carrying
`details.reason = "LLM_SCHEMA_MISMATCH"` and `details.violations` (reason codes only). The
rejected text is never returned, and never logged: prose that looks like a finding is exactly
what the evidence gate exists to stop, and echoing it under a different key would defeat the
guard.

## Rerank ordering

`/v1/rerank` returns `items` sorted by score descending, with ties broken by input order so two
identical requests rank identically. A non-finite score from the model sorts last rather than
scrambling the array (NaN makes every comparison false). An empty `passages` array is an ordinary
empty result — `200` with `items: []`, and no inference call is spent.

## Buying-intent dimensions

The UI renders exactly eight dimensions. `DIMENSION_MAP` in `src/taxonomies/sales-labels.ts` is
the single source of truth for which of the 24 sales labels lights which one, so the API never
has to guess — a guessed segment of the proof ring renders identically to a proven one.

Rules, enforced by `test/unit/dimension-map.test.ts`: every label in `SALES_LABELS` is a key of
`DIMENSION_MAP`; every label maps to **exactly one** dimension or explicitly to `null`; every
dimension has at least one contributing label.

| Dimension                    | Contributing labels                                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `pain_identified`            | `pain_point`                                                                                                           |
| `business_impact_identified` | `customer_concern`                                                                                                     |
| `decision_maker_identified`  | `decision_maker_identified`                                                                                            |
| `economic_buyer_identified`  | `economic_buyer_identified`                                                                                            |
| `timeline_identified`        | `purchase_timeline`                                                                                                    |
| `next_meeting_committed`     | `next_meeting_commitment`                                                                                              |
| `competitor_active`          | `competitor_mention`, `competitor_preference`                                                                          |
| `blocker_active`             | `pricing_objection`, `security_blocker`, `technical_blocker`, `budget_blocker`, `timing_blocker`, `explicit_rejection` |

Informational only (`null` — scored, but evidence for none of the eight):

| Label                                                                    | Why not a dimension                                                                                                                                                               |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `positive_buying_signal`, `negative_buying_signal`                       | Intent, scored on its own axis. Promoting an intent score into an evidence dimension merges two axes that are kept independent on purpose.                                        |
| `customer_praise`                                                        | Sentiment, not progress.                                                                                                                                                          |
| `customer_commitment`, `seller_commitment`                               | A commitment to send a deck or make an introduction is real, but it is not a booked next meeting. Mapping it would light `next_meeting_committed` for a meeting nobody agreed to. |
| `feature_requirement`, `integration_requirement`, `out_of_scope_request` | Describe what the product must do, not how far the deal has progressed.                                                                                                           |
| `customer_question`, `clarification_needed`                              | Conversation texture, not proof of a dimension.                                                                                                                                   |

Two judgement calls worth knowing about:

- **`timing_blocker` → `blocker_active`, not `timeline_identified`.** "We can't do this before
  Q3" is an obstacle; "we'll decide in Q3" is a plan. Only `purchase_timeline` means the second.
- **`business_impact_identified` is the weakest-supported dimension.** The 24 labels contain no
  dedicated impact label, and one label cannot feed two dimensions, so `pain_point` goes to
  `pain_identified` and `customer_concern` — the closest thing to a stated consequence — carries
  impact on its own. Adding a `business_impact` label is the real fix; it changes the public
  catalogue at `GET /v1/sales-labels`, so it needs coordinating with deal-truth-api.
