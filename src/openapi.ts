/** OpenAPI 3.1 for Deal Truth ML. Served at GET /openapi.json; Swagger UI at GET /docs. */

/**
 * Emitted codes. `UPSTREAM_FAILED` is registered as the reserved successor name for
 * `UPSTREAM_AI_ERROR` (same 502, same retryable) and is not currently emitted — see
 * docs/API.md.
 */
const ERROR_CODES = [
  'INVALID_REQUEST',
  'NOT_FOUND',
  'AUTH_FAILED',
  'BATCH_TOO_LARGE',
  'TEXT_TOO_LONG',
  'QUOTA_EXCEEDED',
  'GENERATION_DISABLED',
  'UPSTREAM_AI_ERROR',
  'UPSTREAM_FAILED',
  'UPSTREAM_TIMEOUT',
  'SCHEMA_INVALID',
  'INTERNAL_ERROR',
] as const;

const errorSchema = {
  type: 'object',
  description:
    'Both shapes always hold: the nested `error` object is the shipped contract, and `error_code` / `message` are hoisted copies of the same two values. They can never disagree.',
  required: ['error', 'error_code', 'message', 'request_id'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message', 'retryable', 'details'],
      properties: {
        code: { type: 'string', enum: ERROR_CODES, example: 'INVALID_REQUEST' },
        message: { type: 'string', example: 'Request body must be valid JSON.' },
        retryable: { type: 'boolean', example: false },
        details: {
          type: 'object',
          additionalProperties: true,
          description:
            'Code-specific context. `model` names the failing model on UPSTREAM_AI_ERROR and UPSTREAM_TIMEOUT.',
          example: { reason: 'malformed_json' },
        },
      },
    },
    error_code: {
      type: 'string',
      enum: ERROR_CODES,
      description: 'Mirror of error.code.',
      example: 'INVALID_REQUEST',
    },
    message: {
      type: 'string',
      description: 'Mirror of error.message.',
      example: 'Request body must be valid JSON.',
    },
    request_id: { type: 'string', example: '8b1f0c2e-5d4a-4a1b-9d0e-2f6b7c8a9d01' },
  },
} as const;

const bearer = [{ BearerAuth: [] }];

/**
 * Compat routes are marked, never broken. `Sunset` is the earliest date they may stop
 * answering; they stay until deal-truth-api has migrated to /v1.
 */
const COMPAT_SUNSET = 'Thu, 31 Dec 2026 23:59:59 GMT';

function compatHeaders(successor: string): Record<string, unknown> {
  return {
    Deprecation: {
      description: 'RFC 9745. Always `true` on this route.',
      schema: { type: 'string', example: 'true' },
    },
    Sunset: {
      description: 'RFC 8594 HTTP-date. Earliest date this route may stop answering.',
      schema: { type: 'string', example: COMPAT_SUNSET },
    },
    Link: {
      description: 'Points at the versioned replacement.',
      schema: { type: 'string', example: `<${successor}>; rel="successor-version"` },
    },
  };
}

const scoredAxis = {
  type: 'array',
  description:
    'Labels that cleared the threshold on this axis, highest score first. Empty means the axis was scored and nothing was confident — not that the axis is missing. Labels are never merged or deduped across axes.',
  items: {
    type: 'object',
    required: ['label', 'score'],
    properties: {
      label: { type: 'string', example: 'enthusiastic' },
      score: { type: 'number', minimum: 0, maximum: 1 },
    },
  },
} as const;

const emotionsResponseSchema = {
  type: 'object',
  required: ['items', 'model', 'request_id'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'emotion', 'buying_intent', 'deal_signals', 'unavailable'],
        properties: {
          id: { type: 'string', description: 'Echoes the request item id.' },
          emotion: scoredAxis,
          buying_intent: scoredAxis,
          deal_signals: scoredAxis,
          unavailable: {
            type: 'object',
            description:
              'Per axis: true when that axis could not be scored at all. The empty array beside it means unknown, not neutral. Axes fail independently — one unavailable axis never invalidates the other two.',
            required: ['emotion', 'buying_intent', 'deal_signals'],
            properties: {
              emotion: { type: 'boolean' },
              buying_intent: { type: 'boolean' },
              deal_signals: { type: 'boolean' },
            },
          },
        },
      },
    },
    model: { type: 'string' },
    request_id: { type: 'string' },
  },
} as const;

const notifyRequestSchema = {
  type: 'object',
  required: ['type'],
  description:
    'One alert event. `type` selects which of the other fields apply. No webhook URL may appear anywhere in this body.',
  properties: {
    type: {
      type: 'string',
      enum: ['claim_refused', 'dimension_lost'],
      description: 'Which event to render.',
      example: 'claim_refused',
    },
    claim: {
      type: 'string',
      description: 'claim_refused, required. The claim the evidence gate refused.',
      example: 'Customer has budget approved for this quarter',
    },
    error_code: {
      type: 'string',
      description: "claim_refused, required. The gate's refusal code. Always rendered.",
      example: 'EVIDENCE_UNSUPPORTED',
    },
    reason: {
      type: 'string',
      description: 'claim_refused, optional. Renders as `_none supplied_` when absent.',
      example: 'No segment supports this claim.',
    },
    evidence: {
      type: 'string',
      description:
        'claim_refused, optional. Transcript quote. Rendered as an *Evidence* section only when supplied; otherwise the blocks state that none was given.',
      example: 'Finance has not signed off yet.',
    },
    dimension: {
      type: 'string',
      description: 'dimension_lost, required. The dimension that was proven and is now gone.',
      example: 'timeline_identified',
    },
    from: {
      type: 'string',
      description: 'dimension_lost, required. Previous state.',
      example: 'proven',
    },
    to: {
      type: 'string',
      description: 'dimension_lost, required. Current state.',
      example: 'missing',
    },
  },
} as const;

const notifyResponseSchema = {
  type: 'object',
  required: ['blocks', 'request_id'],
  properties: {
    blocks: {
      type: 'array',
      description:
        'Slack Block Kit blocks. POST them to your own webhook as {"blocks": …}; this service never does.',
      items: { type: 'object', additionalProperties: true },
    },
    request_id: {
      type: 'string',
      description: 'Correlation id. Not part of the Slack payload.',
      example: '8b1f0c2e-5d4a-4a1b-9d0e-2f6b7c8a9d01',
    },
  },
} as const;

function jsonBody(schema: Record<string, unknown>, example?: unknown): Record<string, unknown> {
  return {
    required: true,
    content: {
      'application/json': {
        schema,
        ...(example !== undefined ? { example } : {}),
      },
    },
  };
}

function jsonResponse(description: string, schema: Record<string, unknown>, example?: unknown) {
  return {
    description,
    content: {
      'application/json': {
        schema,
        ...(example !== undefined ? { example } : {}),
      },
    },
  };
}

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Deal Truth ML',
    version: '0.1.0',
    description:
      'Cloudflare Worker inference router for Deal Truth. Emotion, buying intent, and deal signals stay separate. Factual claims are not grounded here — the API layer owns evidence.',
  },
  tags: [
    { name: 'health', description: 'Liveness and readiness' },
    { name: 'v1', description: 'Versioned Worker API' },
    { name: 'compat', description: 'Unversioned aliases for deal-truth DealTruthMLClient' },
    { name: 'reference', description: 'Allowlisted markdown docs' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description:
          'Required only when INTERNAL_API_TOKEN is set. Local default is empty (auth off).',
      },
    },
    schemas: {
      ErrorEnvelope: errorSchema,
    },
  },
  paths: {
    '/health/live': {
      get: {
        tags: ['health'],
        operationId: 'healthLive',
        summary: 'Liveness',
        responses: {
          '200': jsonResponse('Worker is up', {
            type: 'object',
            properties: { status: { type: 'string', example: 'ok' } },
          }),
        },
      },
    },
    '/health/ready': {
      get: {
        tags: ['health'],
        operationId: 'healthReady',
        summary: 'Readiness (AI binding + model IDs)',
        responses: {
          '200': jsonResponse('Ready', { type: 'object', additionalProperties: true }),
          '503': jsonResponse('Not ready', { type: 'object', additionalProperties: true }),
        },
      },
    },
    '/openapi.json': {
      get: {
        tags: ['health'],
        operationId: 'openapiJson',
        summary: 'OpenAPI document',
        responses: { '200': { description: 'OpenAPI 3.1 JSON' } },
      },
    },
    '/docs': {
      get: {
        tags: ['health'],
        operationId: 'swaggerUi',
        summary: 'Swagger UI',
        responses: { '200': { description: 'HTML' } },
      },
    },
    '/v1/models': {
      get: {
        tags: ['v1'],
        operationId: 'listModels',
        summary: 'Model routing manifest',
        security: bearer,
        responses: {
          '200': jsonResponse('Models', { type: 'object', additionalProperties: true }),
        },
      },
    },
    '/v1/sales-labels': {
      get: {
        tags: ['v1'],
        operationId: 'listSalesLabels',
        summary: 'Default 24-label catalogue',
        security: bearer,
        responses: {
          '200': jsonResponse('Labels', { type: 'object', additionalProperties: true }),
        },
      },
    },
    '/v1/classify': {
      post: {
        tags: ['v1'],
        operationId: 'classifyV1',
        summary: 'Multi-label classify (items + optional candidate_labels)',
        security: bearer,
        requestBody: jsonBody(
          {
            type: 'object',
            required: ['items'],
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'text'],
                  properties: { id: { type: 'string' }, text: { type: 'string' } },
                },
              },
              candidate_labels: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'hypothesis'],
                  properties: {
                    id: { type: 'string' },
                    hypothesis: { type: 'string' },
                    threshold: { type: 'number' },
                  },
                },
              },
              threshold: { type: 'number' },
              top_k: { type: 'integer' },
            },
          },
          {
            items: [{ id: '1', text: 'We cannot buy until security approves it.' }],
          },
        ),
        responses: {
          '200': jsonResponse('Classified items', { type: 'object', additionalProperties: true }),
        },
      },
    },
    '/v1/emotions': {
      post: {
        tags: ['v1'],
        operationId: 'emotionsV1',
        summary: 'Emotion, buying intent, and deal signals (separate axes)',
        security: bearer,
        requestBody: jsonBody(
          {
            type: 'object',
            required: ['items'],
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'text'],
                  properties: { id: { type: 'string' }, text: { type: 'string' } },
                },
              },
              threshold: { type: 'number' },
              top_k: { type: 'integer' },
            },
          },
          {
            items: [{ id: '1', text: 'This is impressive, but finance froze the budget.' }],
          },
        ),
        responses: {
          '200': jsonResponse(
            'Three independently-scored axes per item. All three keys are always present.',
            emotionsResponseSchema,
            {
              items: [
                {
                  id: '1',
                  emotion: [{ label: 'enthusiastic', score: 0.9 }],
                  buying_intent: [{ label: 'negative', score: 0.7 }],
                  deal_signals: [{ label: 'budget_blocker', score: 0.85 }],
                  unavailable: { emotion: false, buying_intent: false, deal_signals: false },
                },
              ],
              model: '@cf/qwen/qwen3-30b-a3b-fp8',
              request_id: '…',
            },
          ),
        },
      },
    },
    '/v1/embeddings': {
      post: {
        tags: ['v1'],
        operationId: 'embeddingsV1',
        summary: '1024-dim embeddings',
        security: bearer,
        requestBody: jsonBody(
          {
            type: 'object',
            required: ['items'],
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'text'],
                  properties: { id: { type: 'string' }, text: { type: 'string' } },
                },
              },
              normalize: { type: 'boolean' },
            },
          },
          { items: [{ id: '1', text: 'security approval required' }] },
        ),
        responses: {
          '200': jsonResponse('Vectors', { type: 'object', additionalProperties: true }),
        },
      },
    },
    '/v1/rerank': {
      post: {
        tags: ['v1'],
        operationId: 'rerankV1',
        summary: 'Rerank passages for a query',
        security: bearer,
        requestBody: jsonBody(
          {
            type: 'object',
            required: ['query', 'passages'],
            properties: {
              query: { type: 'string' },
              passages: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'text'],
                  properties: { id: { type: 'string' }, text: { type: 'string' } },
                },
              },
              top_k: { type: 'integer' },
            },
          },
          {
            query: 'security blocker',
            passages: [{ id: 'p1', text: 'We need SOC2 before we can buy.' }],
          },
        ),
        responses: {
          '200': jsonResponse('Ranked passages', { type: 'object', additionalProperties: true }),
        },
      },
    },
    '/v1/generate': {
      post: {
        tags: ['v1'],
        operationId: 'generateV1',
        summary: 'Ungrounded generation (summary/email/battlecard/qa)',
        security: bearer,
        requestBody: jsonBody(
          {
            type: 'object',
            required: ['input'],
            properties: {
              task: {
                type: 'string',
                enum: ['summary_fallback', 'email_polish', 'battlecard_polish', 'qa_synthesis'],
              },
              input: { type: 'string' },
              max_new_tokens: { type: 'integer' },
            },
          },
          { task: 'summary_fallback', input: 'Customer needs security review before purchase.' },
        ),
        responses: {
          '200': jsonResponse('Generated text', { type: 'object', additionalProperties: true }),
        },
      },
    },
    '/v1/analyze-call': {
      post: {
        tags: ['v1'],
        operationId: 'analyzeCallV1',
        summary: 'Two-stage call analysis (fast candidates + quality judge)',
        security: bearer,
        requestBody: jsonBody(
          {
            type: 'object',
            required: ['segments'],
            properties: {
              segments: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'text'],
                  properties: {
                    id: { type: 'string' },
                    speaker_role: { type: 'string' },
                    text: { type: 'string' },
                  },
                },
              },
            },
          },
          {
            segments: [
              {
                id: 's1',
                speaker_role: 'customer',
                text: 'We cannot buy until security approves it.',
              },
            ],
          },
        ),
        responses: {
          '200': jsonResponse('Call analysis', { type: 'object', additionalProperties: true }),
        },
      },
    },
    '/v1/notify/preview': {
      post: {
        tags: ['v1'],
        operationId: 'notifyPreviewV1',
        summary: 'Render an alert event as Slack Block Kit (pure formatter)',
        description:
          'Runs no model and sends nothing. No webhook URL is ever accepted, stored, echoed or posted to — a body carrying webhook_url, webhook, url, callback_url, slack_webhook_url, hook_url or destination is refused with 400, and any URL inside free text is replaced with "[link removed]". The caller posts the returned blocks itself.',
        security: bearer,
        requestBody: jsonBody(notifyRequestSchema, {
          type: 'claim_refused',
          claim: 'Customer has budget approved for this quarter',
          error_code: 'EVIDENCE_UNSUPPORTED',
          reason: 'No segment supports this claim.',
          evidence: 'Finance has not signed off yet.',
        }),
        responses: {
          '200': jsonResponse('Slack Block Kit payload', notifyResponseSchema, {
            blocks: [
              { type: 'header', text: { type: 'plain_text', text: 'Claim refused' } },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '*Claim*\n> Customer has budget approved for this quarter',
                },
              },
              {
                type: 'section',
                fields: [
                  { type: 'mrkdwn', text: '*Error code*\n`EVIDENCE_UNSUPPORTED`' },
                  { type: 'mrkdwn', text: '*Reason*\nNo segment supports this claim.' },
                ],
              },
              {
                type: 'section',
                text: { type: 'mrkdwn', text: '*Evidence*\n> Finance has not signed off yet.' },
              },
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: 'Deal Truth ML preview — rendered only. This service holds no webhook URL and sent nothing.',
                  },
                ],
              },
            ],
            request_id: '8b1f0c2e-5d4a-4a1b-9d0e-2f6b7c8a9d01',
          }),
          '400': jsonResponse(
            'Unknown type, missing required field, or a body carrying a webhook URL',
            errorSchema,
          ),
        },
      },
    },
    '/v1/reference': {
      get: {
        tags: ['reference'],
        operationId: 'listReference',
        summary: 'Allowlisted markdown catalog',
        responses: {
          '200': jsonResponse('Catalog', { type: 'object', additionalProperties: true }),
        },
      },
    },
    '/v1/reference/{name}': {
      get: {
        tags: ['reference'],
        operationId: 'getReference',
        summary: 'One markdown doc',
        parameters: [
          {
            name: 'name',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'API.md' },
          },
        ],
        responses: {
          '200': {
            description: 'Markdown',
            content: { 'text/markdown': { schema: { type: 'string' } } },
          },
          '404': jsonResponse('Unknown document', errorSchema),
        },
      },
    },
    '/classify': {
      post: {
        tags: ['compat'],
        operationId: 'classifyCompat',
        summary: 'Backend alias: texts + optional labels',
        deprecated: true,
        description:
          'Deprecated, not removed — the live Python pipeline still calls it. Use POST /v1/classify. Responses carry Deprecation, Sunset and Link headers.',
        security: bearer,
        requestBody: jsonBody(
          {
            type: 'object',
            required: ['texts'],
            properties: {
              texts: { type: 'array', items: { type: 'string' } },
              labels: { type: 'array', items: { type: 'string' } },
            },
          },
          { texts: ['We cannot buy until security approves it.'] },
        ),
        responses: {
          '200': {
            ...jsonResponse('results[].labels', { type: 'object', additionalProperties: true }),
            headers: compatHeaders('/v1/classify'),
          },
        },
      },
    },
    '/emotion': {
      post: {
        tags: ['compat'],
        operationId: 'emotionCompat',
        summary: 'Backend alias: emotion + intent + deal signals as labels',
        deprecated: true,
        description:
          'Deprecated, not removed — the live Python pipeline still calls it. Flattens the three axes into one `labels` array and so cannot carry the `unavailable` flag; that loss is why it is deprecated. Use POST /v1/emotions.',
        security: bearer,
        requestBody: jsonBody(
          {
            type: 'object',
            required: ['texts'],
            properties: { texts: { type: 'array', items: { type: 'string' } } },
          },
          { texts: ['This is impressive, but there is no budget this year.'] },
        ),
        responses: {
          '200': {
            ...jsonResponse('results[].labels', { type: 'object', additionalProperties: true }),
            headers: compatHeaders('/v1/emotions'),
          },
        },
      },
    },
    '/embed': {
      post: {
        tags: ['compat'],
        operationId: 'embedCompat',
        summary: 'Backend alias: embeddings',
        deprecated: true,
        description:
          'Deprecated, not removed — the live Python pipeline still calls it. Use POST /v1/embeddings.',
        security: bearer,
        requestBody: jsonBody(
          {
            type: 'object',
            required: ['texts'],
            properties: { texts: { type: 'array', items: { type: 'string' } } },
          },
          { texts: ['security approval required'] },
        ),
        responses: {
          '200': {
            ...jsonResponse('results[].embedding', {
              type: 'object',
              additionalProperties: true,
            }),
            headers: compatHeaders('/v1/embeddings'),
          },
        },
      },
    },
    '/generate': {
      post: {
        tags: ['compat'],
        operationId: 'generateCompat',
        summary: 'Backend alias: prompt → text',
        deprecated: true,
        description:
          'Deprecated, not removed — the live Python pipeline still calls it. Use POST /v1/generate.',
        security: bearer,
        requestBody: jsonBody(
          {
            type: 'object',
            required: ['prompt'],
            properties: {
              prompt: { type: 'string' },
              max_tokens: { type: 'integer' },
            },
          },
          { prompt: 'Summarize the call.', max_tokens: 40 },
        ),
        responses: {
          '200': {
            ...jsonResponse('{ text }', { type: 'object', additionalProperties: true }),
            headers: compatHeaders('/v1/generate'),
          },
        },
      },
    },
  },
};

export function swaggerUiHtml(specUrl = '/openapi.json'): string {
  const spec = specUrl.replace(/[^a-zA-Z0-9./_-]/g, '');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Deal Truth ML — Swagger</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css"/>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: ${JSON.stringify(spec)},
      dom_id: '#swagger-ui',
      deepLinking: true,
      persistAuthorization: true,
    });
  </script>
</body>
</html>`;
}
