/** Errors safe to show to the user. Anything else becomes a generic message. */
export class AppError extends Error {
  constructor(message: string, public code: string = "APP_ERROR") {
    super(message);
    this.name = "AppError";
  }
}

export class AuthError extends AppError {
  constructor(message = "Your session has expired. Please log in again.") {
    super(message, "AUTH");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have permission to do that.") {
    super(message, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "We couldn't find what you were looking for.") {
    super(message, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "That time slot is no longer available.") {
    super(message, "CONFLICT");
  }
}

export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.message.startsWith("SS:")) return error.message.slice(3);
  return "Something went wrong. Please try again.";
}
