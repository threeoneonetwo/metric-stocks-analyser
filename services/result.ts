export type ServiceErrorCode = "TIMEOUT" | "NOT_FOUND" | "UPSTREAM" | "VALIDATION";

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: ServiceErrorCode };
