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
}

function sanitize(entry: RequestLog): RequestLog {
  return { ...entry };
}

export function logRequest(entry: RequestLog): void {
  console.log(JSON.stringify(sanitize(entry)));
}
