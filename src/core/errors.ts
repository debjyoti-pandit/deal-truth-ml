export type ErrorCode =
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'BATCH_TOO_LARGE'
  | 'TEXT_TOO_LONG'
  | 'AUTH_FAILED'
  | 'UPSTREAM_AI_ERROR'
  | 'UPSTREAM_FAILED'
  | 'UPSTREAM_TIMEOUT'
  | 'SCHEMA_INVALID'
  | 'QUOTA_EXCEEDED'
  | 'GENERATION_DISABLED'
  | 'INTERNAL_ERROR';

const RETRYABLE: Record<ErrorCode, boolean> = {
  INVALID_REQUEST: false,
  NOT_FOUND: false,
  BATCH_TOO_LARGE: false,
  TEXT_TOO_LONG: false,
  AUTH_FAILED: false,
  UPSTREAM_AI_ERROR: true,
  UPSTREAM_FAILED: true,
  UPSTREAM_TIMEOUT: true,
  SCHEMA_INVALID: true,
  QUOTA_EXCEEDED: true,
  GENERATION_DISABLED: false,
  INTERNAL_ERROR: true,
};

const STATUS: Record<ErrorCode, number> = {
  INVALID_REQUEST: 400,
  NOT_FOUND: 404,
  BATCH_TOO_LARGE: 413,
  TEXT_TOO_LONG: 413,
  AUTH_FAILED: 401,
  UPSTREAM_AI_ERROR: 502,
  UPSTREAM_FAILED: 502,
  UPSTREAM_TIMEOUT: 504,
  SCHEMA_INVALID: 502,
  QUOTA_EXCEEDED: 429,
  GENERATION_DISABLED: 503,
  INTERNAL_ERROR: 500,
};

/**
 * Codes that mean "the model call itself failed", as opposed to a bad request or a
 * bug on this side. Used to decide which errors may be re-classified as a timeout and
 * annotated with the failing model id.
 *
 * `UPSTREAM_AI_ERROR` is the code this service actually emits for a failed model call
 * and is the live contract the Python client reads. `UPSTREAM_FAILED` is its reserved
 * successor name — same 502, same `retryable: true` — kept here so both are defined and
 * treated identically wherever upstream failures are handled. See docs/API.md.
 */
const UPSTREAM_CODES = new Set<ErrorCode>([
  'UPSTREAM_AI_ERROR',
  'UPSTREAM_FAILED',
  'UPSTREAM_TIMEOUT',
]);

export function isUpstreamCode(code: ErrorCode): boolean {
  return UPSTREAM_CODES.has(code);
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly status: number;
  readonly details: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.retryable = RETRYABLE[code];
    this.status = STATUS[code];
    this.details = details;
  }
}

export interface ErrorEnvelope {
  /** Existing live contract. Never removed — deal-truth's Python client reads this. */
  error: {
    code: ErrorCode;
    message: string;
    retryable: boolean;
    details: Record<string, unknown>;
  };
  /** Mirror of `error.code`, hoisted so a caller can read one key without a nested get. */
  error_code: ErrorCode;
  /** Mirror of `error.message`. Always identical to it — never a second, different text. */
  message: string;
  request_id: string;
}

/**
 * Both shapes hold at once, deliberately: the nested `error` object is the shipped
 * contract, and `error_code` / `message` are hoisted mirrors of it. They are copies of
 * the same values, never independent fields, so the two can never disagree.
 */
export function errorEnvelope(error: AppError, requestId: string): ErrorEnvelope {
  return {
    error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      details: error.details,
    },
    error_code: error.code,
    message: error.message,
    request_id: requestId,
  };
}
