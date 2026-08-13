export type ErrorCode =
  | 'INVALID_REQUEST'
  | 'BATCH_TOO_LARGE'
  | 'TEXT_TOO_LONG'
  | 'AUTH_FAILED'
  | 'UPSTREAM_AI_ERROR'
  | 'SCHEMA_INVALID'
  | 'QUOTA_EXCEEDED'
  | 'GENERATION_DISABLED'
  | 'INTERNAL_ERROR';

const RETRYABLE: Record<ErrorCode, boolean> = {
  INVALID_REQUEST: false,
  BATCH_TOO_LARGE: false,
  TEXT_TOO_LONG: false,
  AUTH_FAILED: false,
  UPSTREAM_AI_ERROR: true,
  SCHEMA_INVALID: true,
  QUOTA_EXCEEDED: true,
  GENERATION_DISABLED: false,
  INTERNAL_ERROR: true,
};

const STATUS: Record<ErrorCode, number> = {
  INVALID_REQUEST: 400,
  BATCH_TOO_LARGE: 413,
  TEXT_TOO_LONG: 413,
  AUTH_FAILED: 401,
  UPSTREAM_AI_ERROR: 502,
  SCHEMA_INVALID: 502,
  QUOTA_EXCEEDED: 429,
  GENERATION_DISABLED: 503,
  INTERNAL_ERROR: 500,
};

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

export function errorEnvelope(
  error: AppError,
  requestId: string,
): {
  error: { code: ErrorCode; message: string; retryable: boolean; details: Record<string, unknown> };
  request_id: string;
} {
  return {
    error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      details: error.details,
    },
    request_id: requestId,
  };
}
