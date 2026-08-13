# API

Base URL is the Worker origin. JSON only. `X-Request-ID` is accepted and returned.

## Auth

If `INTERNAL_API_TOKEN` is set, send `Authorization: Bearer <token>` on all `/v1/*` routes and on `/classify`, `/emotion`, `/embed`, `/generate`.

`GET /health/live` and `GET /health/ready` stay open.

## Error envelope

```json
{
  "error": {
    "code": "MODEL_NOT_READY_OR_NAMED_CODE",
    "message": "Human readable.",
    "retryable": true,
    "details": {}
  },
  "request_id": "..."
}
```

Named codes: `INVALID_REQUEST`, `BATCH_TOO_LARGE` (413), `TEXT_TOO_LONG` (413), `AUTH_FAILED` (401), `UPSTREAM_AI_ERROR` (502), `SCHEMA_INVALID` (502), `QUOTA_EXCEEDED` (429, retryable), `GENERATION_DISABLED` (503), `INTERNAL_ERROR` (500).

Stack traces are never returned.

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

Default 24-label catalogue: `id`, `display_name`, `hypothesis`, `category`, `threshold`.

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

Request: `{ query, passages: [{id, text}], top_k? }`. Response: ranked `{id, score, index}`.

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

## Compat aliases (backend `DealTruthMLClient`)

| Route            | Request                                                            | Response                                      |
| ---------------- | ------------------------------------------------------------------ | --------------------------------------------- |
| `POST /classify` | `{ texts, labels? }` (omit `labels` to use the 24-label catalogue) | `{ results: [{ labels: [{label, score}] }] }` |
| `POST /emotion`  | `{ texts }`                                                        | `{ results: [{ labels: [{label, score}] }] }` |
| `POST /embed`    | `{ texts }`                                                        | `{ results: [{ embedding: number[] }] }`      |
| `POST /generate` | `{ prompt, max_tokens? }`                                          | `{ text }`                                    |

The parser in `deal-truth/app/ml/__init__.py` accepts `results` / `data` / `items`.

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

- **Base URL resolution** (API side): `ML_SERVICE_BASE_URL` → `https://{ML_NGROK_DOMAIN}` →
  `http://localhost:8081`. `make up` here writes `ML_NGROK_DOMAIN` into `deal-truth/.env`.
- **Auth**: API sends `Authorization: Bearer {ML_SERVICE_API_KEY}`; must equal this Worker's
  `INTERNAL_API_TOKEN` (both empty locally). Ngrok hosts get `ngrok-skip-browser-warning`.
- **Timeout**: the API allows a **300s** read timeout because compat classify/emotion chunk
  batches sequentially inside a single HTTP request.
- **Labels**: compat `/classify` returns slug ids (`pain_point`); the API maps them back to
  its extractor keys (`pain point`) with `canonical_sales_label`, so either form is safe.
- **Embeddings**: `/embed` vectors are 1024-dim and stored in pgvector `vector(1024)`
  (`transcript_chunks.embedding`, API migration `0002_embedding_1024`).
- **Degradation**: on `AUTH_FAILED`/5xx/timeout the API raises named `ML_*` errors; the
  pipeline finishes `PARTIAL` with deterministic analysis intact, and Ask-the-Call falls back
  to lexical retrieval (`retrieval_lexical_fallback`). An outage here never blocks transcripts
  or deterministic metrics.
