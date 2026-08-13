/** OpenAPI 3.1 for Deal Truth ML. Served at GET /openapi.json; Swagger UI at GET /docs. */

const errorSchema = {
  type: 'object',
  required: ['error', 'request_id'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message', 'retryable'],
      properties: {
        code: { type: 'string', example: 'INVALID_REQUEST' },
        message: { type: 'string' },
        retryable: { type: 'boolean' },
        details: { type: 'object', additionalProperties: true },
      },
    },
    request_id: { type: 'string', format: 'uuid' },
  },
} as const;

const bearer = [{ BearerAuth: [] }];

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
          '200': jsonResponse('Emotion axes', { type: 'object', additionalProperties: true }),
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
          '200': jsonResponse('results[].labels', { type: 'object', additionalProperties: true }),
        },
      },
    },
    '/emotion': {
      post: {
        tags: ['compat'],
        operationId: 'emotionCompat',
        summary: 'Backend alias: emotion + intent + deal signals as labels',
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
          '200': jsonResponse('results[].labels', { type: 'object', additionalProperties: true }),
        },
      },
    },
    '/embed': {
      post: {
        tags: ['compat'],
        operationId: 'embedCompat',
        summary: 'Backend alias: embeddings',
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
          '200': jsonResponse('results[].embedding', {
            type: 'object',
            additionalProperties: true,
          }),
        },
      },
    },
    '/generate': {
      post: {
        tags: ['compat'],
        operationId: 'generateCompat',
        summary: 'Backend alias: prompt → text',
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
          '200': jsonResponse('{ text }', { type: 'object', additionalProperties: true }),
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
