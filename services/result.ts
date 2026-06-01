export type ServiceErrorCode = "TIMEOUT" | "NOT_FOUND" | "UPSTREAM" | "VALIDATION" | "CONFIG";

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: ServiceErrorCode };
