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

function sanitize(entry: RequestLog): RequestLog {
  return { ...entry };
}

export function logRequest(entry: RequestLog): void {
  console.log(JSON.stringify(sanitize(entry)));
}

export function loggableErrorDetail(error: { details: Record<string, unknown> }): string | undefined {
  if (typeof error.details.upstream === 'string' && error.details.upstream) {
    return error.details.upstream.slice(0, 240);
  }
  if (Array.isArray(error.details.issues) && error.details.issues.length > 0) {
    return JSON.stringify(error.details.issues).slice(0, 240);
  }
  return undefined;
}
