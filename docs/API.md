# API

Base URL is the Worker origin. JSON only. `X-Request-ID` is accepted and returned.

## Auth

If `INTERNAL_API_TOKEN` is set, send `Authorization: Bearer <token>` on all `/v1/*` routes and on `/classify`, `/emotion`, `/embed`, `/generate`.

`GET /health/live` and `GET /health/ready` stay open.

## Error envelope

Every error body carries **both** the nested `error` object and the hoisted `error_code` /
`message` mirrors. The nested object is the shipped contract the Python client reads and is
never removed; the top-level keys are copies of the same two values, so the two can never
disagree.

```json
{
  "error": {
    "code": "UPSTREAM_TIMEOUT",
    "message": "Upstream model @cf/qwen/qwen3-embedding-0.6b timed out.",
    "retryable": true,
    "details": { "model": "@cf/qwen/qwen3-embedding-0.6b" }
  },
  "error_code": "UPSTREAM_TIMEOUT",
  "message": "Upstream model @cf/qwen/qwen3-embedding-0.6b timed out.",
  "request_id": "8b1f0c2e-5d4a-4a1b-9d0e-2f6b7c8a9d01"
}
```

| Field             | Meaning                                                                                                | Example                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `error.code`      | Named code from the table below. The canonical field.                                                  | `"UPSTREAM_TIMEOUT"`                     |
| `error.message`   | Human-readable, safe to log. Never a stack trace, never a token.                                       | `"Request body must be valid JSON."`     |
| `error.retryable` | Whether retrying the identical request could succeed.                                                  | `true`                                   |
| `error.details`   | Code-specific context. Always an object, often `{}`.                                                   | `{ "model": "@cf/openai/gpt-oss-120b" }` |
| `error_code`      | Mirror of `error.code`. Always identical to it.                                                        | `"NOT_FOUND"`                            |
| `message`         | Mirror of `error.message`. Always identical to it.                                                     | `"Unknown route."`                       |
| `request_id`      | Echo of the request's `X-Request-ID`, or a generated UUID. Also returned as the `X-Request-ID` header. | `"8b1f0c2e-…"`                           |

### Codes

| Code                  | Status | Retryable | When                                                                       |
| --------------------- | ------ | --------- | -------------------------------------------------------------------------- |
| `INVALID_REQUEST`     | 400    | no        | Bad or missing fields, **or a body that is not valid JSON**.               |
| `NOT_FOUND`           | 404    | no        | Unknown route, or an unknown/blocked `/v1/reference/{name}`.               |
| `AUTH_FAILED`         | 401    | no        | Missing or wrong bearer token while `INTERNAL_API_TOKEN` is set.           |
| `BATCH_TOO_LARGE`     | 413    | no        | More items than `MAX_BATCH_SIZE`.                                          |
| `TEXT_TOO_LONG`       | 413    | no        | An item longer than `MAX_TEXT_CHARS`.                                      |
| `QUOTA_EXCEEDED`      | 429    | yes       | Workers AI neuron budget exhausted.                                        |
| `GENERATION_DISABLED` | 503    | no        | `ENABLE_GENERATION=false` and a generation route was called.               |
| `UPSTREAM_AI_ERROR`   | 502    | yes       | The model call failed. `details.model` names the model that failed.        |
| `UPSTREAM_FAILED`     | 502    | yes       | **Reserved successor name for `UPSTREAM_AI_ERROR`** — see the note below.  |
| `UPSTREAM_TIMEOUT`    | 504    | yes       | The model call timed out. `details.model` names the model that timed out.  |
| `SCHEMA_INVALID`      | 502    | yes       | The model answered with something that is not the expected JSON shape.     |
| `INTERNAL_ERROR`      | 500    | yes       | A fault on this side. Never used for a bad request or an upstream failure. |

**`UPSTREAM_FAILED` is defined but not emitted.** The wire code for a failed model call is
`UPSTREAM_AI_ERROR`, which is what `deal-truth-api` matches on today. `UPSTREAM_FAILED` is
registered with the identical status (502) and `retryable: true` so the two are already
interchangeable; when the Python client stops matching the old name, the emitted code can be
switched without any other behaviour changing. Treat them as equivalent.

**`details.model`** is present on `UPSTREAM_AI_ERROR` and `UPSTREAM_TIMEOUT`. It is the model
id of the **most recent failed model call in that request** — for a two-stage route such as
`/v1/analyze-call`, the stage that actually fell over.

A 404 says 404 and a malformed body says 400, so the status alone tells you which side of the
wire to look at. Stack traces are never returned.

## Endpoints

### `GET /docs`

Swagger UI (same role as Deal Truth API `/docs`). Spec: `GET /openapi.json`.

### `GET /health/live`

Process/worker is up.

### `GET /health/ready`

AI binding present, generation flag, model IDs, embedding dimension, batch limits.

### `GET /v1/models`

Routing manifest: fast, quality, embeddings (with dimension), rerank, generation enabled.

### `GET /v1/reference`

Allowlisted markdown catalog (public, no bearer). Alias: `GET /api/v1/reference`.

### `GET /v1/reference/{name}`

Raw markdown for one allowlisted file (for example `API.md`, `MODELS.md`). Unknown names and path traversal return 404. Alias: `GET /api/v1/reference/{name}`.

### `GET /v1/sales-labels`

Default 24-label catalogue plus the dimension mapping the proof ring is drawn from:

- `labels` — 24 entries: `id`, `display_name`, `hypothesis`, `category`, `threshold`.
- `dimensions` — the 8 buying-intent dimensions the UI renders, in render order.
- `dimension_map` — every label id to exactly one dimension, or `null` for informational
  labels that contribute to no dimension. Shipped here so `deal-truth-api` never has to
  hardcode or guess the mapping. Full table with rationale: [MODELS.md](MODELS.md).

### `POST /v1/classify`

Request: `{ items: [{id, text}], candidate_labels?: [{id, hypothesis, threshold?}], multi_label?, threshold?, top_k? }`.

If `candidate_labels` is omitted, the catalogue is used. Fast path. Response labels include `passed_threshold`.

### `POST /v1/emotions`

Request: `{ items: [{id, text}], threshold?, top_k? }`. `threshold` defaults to `0.2`, `top_k` to `6`.

Response per item: `emotion`, `buying_intent` and `deal_signals` arrays, plus an `unavailable`
object. **All four keys are always present** — an axis is never `null` and never omitted.

```json
{
  "items": [
    {
      "id": "segment-1",
      "emotion": [{ "label": "enthusiastic", "score": 0.9 }],
      "buying_intent": [{ "label": "negative", "score": 0.7 }],
      "deal_signals": [{ "label": "budget_blocker", "score": 0.85 }],
      "unavailable": { "emotion": false, "buying_intent": false, "deal_signals": false }
    }
  ],
  "model": "@cf/qwen/qwen3-30b-a3b-fp8",
  "request_id": "…"
}
```

| Field                | Meaning                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<axis>`             | Labels from that axis's taxonomy that scored ≥ `threshold`, highest first, capped at `top_k`. Duplicate labels within one axis collapse to the highest score. |
| `<axis>: []`         | The axis **was** scored and nothing was confident. A genuinely flat utterance.                                                                                |
| `unavailable.<axis>` | `true` when the axis could not be scored at all — the empty array beside it means **unknown, not neutral**.                                                   |

Why the flag exists: `[]` alone cannot distinguish "the customer was neutral" from "we never
got an answer", and the second must not be rendered as the first. Axes fail **independently**;
one unavailable axis never invalidates the other two.

An axis becomes `unavailable` when the model omits it from a row, drops the item from its
response, or the inference call for that item's chunk fails. If **every** chunk fails the
route returns `502 UPSTREAM_AI_ERROR` rather than a 200 of empty axes, so the API's
`ML_*` → `PARTIAL` degradation still fires.

Item ids must be unique — duplicates return `400 INVALID_REQUEST`. Scores are attributed by
id, so two items sharing one id could not be told apart and the second would inherit the
first's scores while reporting `unavailable: false`.

**Labels stay namespaced to their axis.** `neutral` is a member of both `emotion` and
`buying_intent` and means something different on each; the axes are never merged and never
deduped against each other.

### `POST /v1/embeddings`

Request: `{ items: [{id, text}], normalize? }`. Response: `id`, `vector`, `dimension`, `normalized`.

### `POST /v1/rerank`

Request: `{ query, passages: [{id, text}], top_k? }`.
Response: `{ items: [{id, score, index}], model, request_id }`.

`bge-reranker-base` scores every passage against the query. `id` is the caller's own passage id;
`index` is that passage's position in the request array. Guarantees Ask-the-Call can rely on:

- **Ranked.** `items` is sorted by `score` descending. The model's own row order is never trusted.
- **Stable.** Ties break by input order, so two identical requests rank identically. Evidence does
  not reshuffle between two identical asks.
- **Total.** Every passage comes back unless `top_k` cuts it. A score the model returns as
  non-numeric sorts last rather than scrambling the ranking — it never drops the passage.
- **`top_k` applies after ranking**, not before, and is capped at 50.

An empty `passages` array is an ordinary empty result, not a client error: `200` with
`{"items": []}`, and no inference call is spent. Retrieval finding nothing is a normal outcome for
Ask, and a `400` there reads to the caller as a bug in its own query construction.

Limits: more than `MAX_BATCH_SIZE` passages is `413 BATCH_TOO_LARGE`; a passage or query over
`MAX_TEXT_CHARS` is `413 TEXT_TOO_LONG`.

### `POST /v1/generate`

Tasks: `summary_fallback`, `email_polish`, `battlecard_polish`, `qa_synthesis`.

Returns `{ text, task, model, grounded: false, metadata }`. Never claims factual grounding. `qa_synthesis` uses the quality model; other tasks use the fast model.

### `POST /v1/analyze-call`

Request: `{ segments: [{id, speaker_role, text}] }`.

Stage 1 Qwen candidates, stage 2 GPT-OSS judge. Response:

```json
{
  "customer_truth": [],
  "objections": [],
  "commitments": [],
  "risks": [],
  "competitors": [],
  "buying_signals": [],
  "reality_checks": [],
  "models": { "candidates": "...", "judge": "..." }
}
```

Each insight carries `segment_ids` only.

### `POST /v1/notify/preview`

Pure formatter: renders one alert event into Slack [Block Kit](https://api.slack.com/block-kit)
blocks. It runs no model, opens no connection, and **never accepts, stores, echoes or posts to
a webhook URL** — the caller posts the returned `blocks` itself.

Request — `type` selects the event:

```json
{
  "type": "claim_refused",
  "claim": "Customer has budget approved for this quarter",
  "error_code": "EVIDENCE_UNSUPPORTED",
  "reason": "No segment supports this claim.",
  "evidence": "Finance has not signed off yet."
}
```

| Field        | Event            | Required | Meaning                                                                                                                              | Example                             |
| ------------ | ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| `type`       | both             | yes      | `"claim_refused"` or `"dimension_lost"`. Anything else is a 400.                                                                     | `"claim_refused"`                   |
| `claim`      | `claim_refused`  | yes      | The claim the evidence gate refused. Rendered as a quote.                                                                            | `"Customer has budget approved"`    |
| `error_code` | `claim_refused`  | yes      | The gate's refusal code. Always rendered in the blocks.                                                                              | `"EVIDENCE_UNSUPPORTED"`            |
| `reason`     | `claim_refused`  | no       | Why it was refused. Absent renders as `_none supplied_`.                                                                             | `"No segment supports this claim."` |
| `evidence`   | `claim_refused`  | no       | Transcript quote. Rendered as an `*Evidence*` section **only when supplied**; otherwise the blocks say outright that none was given. | `"Finance has not signed off yet."` |
| `dimension`  | `dimension_lost` | yes      | The dimension that was proven last call and is now gone.                                                                             | `"timeline_identified"`             |
| `from`       | `dimension_lost` | yes      | Previous state.                                                                                                                      | `"proven"`                          |
| `to`         | `dimension_lost` | yes      | Current state.                                                                                                                       | `"missing"`                         |

Response:

```json
{
  "blocks": [
    { "type": "header", "text": { "type": "plain_text", "text": "Claim refused" } },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Claim*\n> Customer has budget approved for this quarter"
      }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Error code*\n`EVIDENCE_UNSUPPORTED`" },
        { "type": "mrkdwn", "text": "*Reason*\nNo segment supports this claim." }
      ]
    },
    {
      "type": "section",
      "text": { "type": "mrkdwn", "text": "*Evidence*\n> Finance has not signed off yet." }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "Deal Truth ML preview — rendered only. This service holds no webhook URL and sent nothing."
        }
      ]
    }
  ],
  "request_id": "8b1f0c2e-…"
}
```

| Field        | Meaning                                                                   | Example        |
| ------------ | ------------------------------------------------------------------------- | -------------- |
| `blocks`     | Slack Block Kit array. POST it to your own webhook as `{"blocks": …}`.    | see above      |
| `request_id` | Correlation id, same as every other route. Not part of the Slack payload. | `"8b1f0c2e-…"` |

`dimension_lost` renders a `Dimension lost` header, the dimension, and `*Was*` / `*Now*` fields.

**Webhook safety.** The invariant is that no destination can travel through this service:

- A body carrying `webhook_url`, `webhook`, `url`, `callback_url`, `slack_webhook_url`,
  `hook_url` or `destination` is refused with `400 INVALID_REQUEST` and
  `details.rejected_fields` listing the offending **names** (never their values). Refusing
  loudly rather than ignoring means a caller can never believe an alert was delivered when
  nothing was sent.
- Any URL pasted into free text (`claim`, `reason`, `evidence`, …) is replaced with
  `[link removed]` before rendering, so a webhook cannot survive a round trip.
- `&`, `<` and `>` are escaped, which also disarms Slack's `<url|label>` link syntax.
- Strings are trimmed to 2000 characters (128 for `error_code`, `dimension`, `from`, `to`) to
  stay inside Slack's block limits.

## Compat aliases (backend `DealTruthMLClient`)

| Route            | Request                                                            | Response                                      |
| ---------------- | ------------------------------------------------------------------ | --------------------------------------------- |
| `POST /classify` | `{ texts, labels? }` (omit `labels` to use the 24-label catalogue) | `{ results: [{ labels: [{label, score}] }] }` |
| `POST /emotion`  | `{ texts }`                                                        | `{ results: [{ labels: [{label, score}] }] }` |
| `POST /embed`    | `{ texts }`                                                        | `{ results: [{ embedding: number[] }] }`      |
| `POST /generate` | `{ prompt, max_tokens? }`                                          | `{ text }`                                    |

The parser in `deal-truth/app/ml/__init__.py` accepts `results` / `data` / `items`.

### Deprecated — but still live

All four aliases are **deprecated, not removed**. They keep answering exactly as before, byte
for byte, and are only marked. They will not be deleted until `deal-truth-api` has migrated to
the `/v1` routes; deleting them earlier would break the running pipeline.

Every response from `/classify`, `/emotion`, `/embed` and `/generate` carries:

| Header        | Value                                     | Meaning                                                         |
| ------------- | ----------------------------------------- | --------------------------------------------------------------- |
| `Deprecation` | `true`                                    | RFC 9745. This route is deprecated as of now.                   |
| `Sunset`      | `Thu, 31 Dec 2026 23:59:59 GMT`           | RFC 8594 HTTP-date. Earliest date the route may stop answering. |
| `Link`        | `</v1/emotions>; rel="successor-version"` | Where to go instead. Per route, see below.                      |

| Compat route | `Link` successor |
| ------------ | ---------------- |
| `/classify`  | `/v1/classify`   |
| `/emotion`   | `/v1/emotions`   |
| `/embed`     | `/v1/embeddings` |
| `/generate`  | `/v1/generate`   |

Each call also logs a warning so the remaining callers can be chased by name rather than
guessed at:

```json
{
  "level": "warn",
  "event": "compat.deprecated_route",
  "path": "/emotion",
  "successor": "/v1/emotions",
  "sunset": "Thu, 31 Dec 2026 23:59:59 GMT",
  "user_agent": "deal-truth-api/1.4 python-httpx/0.27",
  "request_id": "8b1f0c2e-…"
}
```

`user_agent` is the caller's `User-Agent`, or `"unknown"` when it sends none.

The `/v1` routes carry **no** `Deprecation` or `Sunset` header.

**Compat `/emotion` cannot carry the `unavailable` flag.** It flattens the three axes into
one `labels` array, so an axis that was never scored is indistinguishable from one that
scored nothing. The route still returns `200` in that case, deliberately: models drop items
from a batch routinely, and failing the call would turn an ordinary partial result into a
fake outage on the pipeline that still depends on this route. An unscored item simply comes
back with no labels — it asserts nothing, so nothing unsupported ships, but the loss is
invisible to the caller. It is logged as `emotion.compat_axis_lost`. This is the concrete
reason the route is deprecated; use `/v1/emotions` for per-axis degradation.

## Consumer behavior (deal-truth-api)

What the backend does with these routes — useful when debugging an integration:

- **Base URL resolution** (API side): `ML_SERVICE_BASE_URL` → `http://localhost:8081` (local
  wrangler dev). Deployed service: `https://deal-truth-ml.debjyotipandit35.workers.dev`. The ngrok fallback
  (`ML_NGROK_DOMAIN`) is retired — the API no longer reads it.
- **Auth**: API sends `Authorization: Bearer {ML_SERVICE_API_KEY}`; must equal this Worker's
  `INTERNAL_API_TOKEN` (both empty locally). Ngrok hosts get `ngrok-skip-browser-warning`.
- **Batching**: the API speaks `/v1` and chunks classify/emotions/embeddings client-side to
  its `ML_MAX_BATCH_SIZE` (default 32 — keep it ≤ this Worker's `MAX_BATCH_SIZE`, which
  `/health/ready` advertises), reassembling results in input order. An hour-long call is many
  bounded requests; `413 BATCH_TOO_LARGE` should never occur in normal operation.
- **Timeout**: the API allows a **300s** read timeout **per request**; this Worker further
  sub-chunks LLM prompts internally (3–4 items per model call).
- **Labels**: compat `/classify` returns slug ids (`pain_point`); the API maps them back to
  its extractor keys (`pain point`) with `canonical_sales_label`, so either form is safe.
- **Embeddings**: `/embed` vectors are 1024-dim and stored in pgvector `vector(1024)`
  (`transcript_chunks.embedding`, API migration `0002_embedding_1024`).
- **Degradation**: on `AUTH_FAILED`/5xx/timeout the API raises named `ML_*` errors; the
  pipeline finishes `PARTIAL` with deterministic analysis intact, and Ask-the-Call falls back
  to lexical retrieval (`retrieval_lexical_fallback`). An outage here never blocks transcripts
  or deterministic metrics.
