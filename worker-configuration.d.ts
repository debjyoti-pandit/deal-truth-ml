interface Ai {
  run(model: string, inputs?: Record<string, unknown>): Promise<unknown>;
}

declare global {
  interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
    passThroughOnException(): void;
  }
}

export {};
