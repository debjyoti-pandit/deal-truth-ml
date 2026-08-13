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

### `GET /health/live`

Process/worker is up.

### `GET /health/ready`

AI binding present, generation flag, model IDs, embedding dimension, batch limits.

### `GET /v1/models`

Routing manifest: fast, quality, embeddings (with dimension), rerank, generation enabled.

### `GET /v1/sales-labels`

Default 24-label catalogue: `id`, `display_name`, `hypothesis`, `category`, `threshold`.

### `POST /v1/classify`

Request: `{ items: [{id, text}], candidate_labels?: [{id, hypothesis, threshold?}], multi_label?, threshold?, top_k? }`.

If `candidate_labels` is omitted, the catalogue is used. Fast path. Response labels include `passed_threshold`.

### `POST /v1/emotions`

Request: `{ items: [{id, text}], threshold?, top_k? }`.

Response per item: `emotion`, `buying_intent`, `deal_signals` arrays — never merged, never called buying intent under an emotion field.

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

| Route | Request | Response |
|---|---|---|
| `POST /classify` | `{ texts, labels? }` | `{ results: [{ labels: [{label, score}] }] }` |
| `POST /emotion` | `{ texts }` | `{ results: [{ labels: [{label, score}] }] }` |
| `POST /embed` | `{ texts }` | `{ results: [{ embedding: number[] }] }` |
| `POST /generate` | `{ prompt, max_tokens? }` | `{ text }` |

The parser in `deal-truth/app/ml/__init__.py` accepts `results` / `data` / `items`.
