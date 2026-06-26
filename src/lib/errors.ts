export type ErrorCategory =
  | "auth"
  | "network"
  | "parse"
  | "validation"
  | "storage"
  | "ai"
  | "unknown";

export class AppError extends Error {
  readonly category: ErrorCategory;

  constructor(
    message: string,
    category: ErrorCategory = "unknown",
    cause?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.category = category;
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export function toAppError(
  error: unknown,
  category: ErrorCategory = "unknown",
  fallbackMessage = "Something went wrong",
): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error)
    return new AppError(error.message || fallbackMessage, category, error);
  if (typeof error === "string") return new AppError(error, category);
  return new AppError(fallbackMessage, category, error);
}
