export function newRequestId(incoming: string | undefined): string {
  if (incoming && incoming.trim().length > 0 && incoming.length <= 128) {
    return incoming.trim();
  }
  return crypto.randomUUID();
}

export function countChars(texts: string[]): number {
  return texts.reduce((sum, text) => sum + text.length, 0);
}
