import { AsyncLocalStorage } from 'node:async_hooks';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface RequestLog {
  request_id: string;
  method: string;
  path: string;
  status?: number;
  item_count?: number;
  char_count?: number;
  model?: string;
  duration_ms?: number;
  success?: boolean;
  error_code?: string;
  error_detail?: string;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const OMIT_KEYS = new Set([
  'authorization',
  'token',
  'api_key',
  'apikey',
  'password',
  'secret',
  'embedding',
  'embeddings',
  'vector',
  'text',
  'texts',
  'prompt',
  'messages',
  'input',
  'content',
  'query',
]);

const QUIET_PATHS = new Set(['/health/live', '/health/ready']);

const requestStore = new AsyncLocalStorage<{ request_id: string }>();

let minLevel: LogLevel = 'info';

export function configureLogger(level: string | undefined): void {
  const normalized = (level ?? 'info').toLowerCase();
  minLevel =
    normalized === 'debug' ||
    normalized === 'info' ||
    normalized === 'warn' ||
    normalized === 'error'
      ? normalized
      : 'info';
}

export function runWithLogContext<T>(requestId: string, fn: () => T): T {
  return requestStore.run({ request_id: requestId }, fn);
}

export function redact(value: string): string {
  return value
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\b(cfut_|sk-|eyJ)[A-Za-z0-9._-]+/g, '[redacted]')
    .replace(/\bINTERNAL_API_TOKEN\b\s*[:=]\s*\S+/gi, 'INTERNAL_API_TOKEN=[redacted]')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeValue(value: unknown, key?: string): unknown {
  if (value === undefined) {
    return undefined;
  }
  if (key && OMIT_KEYS.has(key.toLowerCase())) {
    return '[omitted]';
  }
  if (typeof value === 'string') {
    return redact(value).slice(0, 500);
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 24).map((item) => sanitizeValue(item));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [nestedKey, nested] of Object.entries(value)) {
      const cleaned = sanitizeValue(nested, nestedKey);
      if (cleaned !== undefined) {
        out[nestedKey] = cleaned;
      }
    }
    return out;
  }
  return String(value);
}

export function log(level: LogLevel, event: string, fields: Record<string, unknown> = {}): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) {
    return;
  }
  const ctx = requestStore.getStore();
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(ctx?.request_id ? { request_id: ctx.request_id } : {}),
    ...(sanitizeValue(fields) as Record<string, unknown>),
  };
  const line = JSON.stringify(payload);
  if (level === 'error' || level === 'warn') {
    console.error(line);
    return;
  }
  console.log(line);
}

export const logger = {
  debug: (event: string, fields: Record<string, unknown> = {}): void => log('debug', event, fields),
  info: (event: string, fields: Record<string, unknown> = {}): void => log('info', event, fields),
  warn: (event: string, fields: Record<string, unknown> = {}): void => log('warn', event, fields),
  error: (event: string, fields: Record<string, unknown> = {}): void => log('error', event, fields),
};

export function logRequest(entry: RequestLog): void {
  if (QUIET_PATHS.has(entry.path) && entry.success !== false) {
    logger.debug('http.request', { ...entry });
    return;
  }
  logger.info('http.request', { ...entry });
}

export function loggableErrorDetail(error: {
  details: Record<string, unknown>;
}): string | undefined {
  if (typeof error.details.upstream === 'string' && error.details.upstream) {
    return redact(error.details.upstream).slice(0, 240);
  }
  if (Array.isArray(error.details.issues) && error.details.issues.length > 0) {
    return JSON.stringify(error.details.issues).slice(0, 240);
  }
  return undefined;
}
