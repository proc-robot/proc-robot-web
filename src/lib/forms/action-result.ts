import type { z } from "zod";

/**
 * The one return shape for Server Actions that a form calls.
 *
 * Actions return failures instead of throwing: a thrown error reaches the
 * browser as a generic message in production, while a returned one keeps its
 * text and its field errors. Throw only for bugs.
 */
export type ActionSuccess<T> = { ok: true; data: T };
export type ActionFailure = {
  ok: false;
  /** Shown as a toast. Translate it in workspace actions. */
  error: string;
  /** First message per field, keyed by React Hook Form's dot path ("items.0.quantity"). */
  fieldErrors?: Record<string, string>;
};
export type ActionResult<T = undefined> = ActionSuccess<T> | ActionFailure;

export function actionOk(): ActionSuccess<undefined>;
export function actionOk<T>(data: T): ActionSuccess<T>;
export function actionOk<T>(data?: T): ActionSuccess<T | undefined> {
  return { ok: true, data };
}

export function actionError(error: string, fieldErrors?: Record<string, string>): ActionFailure {
  return fieldErrors && Object.keys(fieldErrors).length > 0
    ? { ok: false, error, fieldErrors }
    : { ok: false, error };
}

/** Zod issues → `{ "items.0.quantity": "…" }`, keeping the first message per field. */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.map(String).join(".");
    if (path && !(path in fieldErrors)) fieldErrors[path] = issue.message;
  }
  return fieldErrors;
}

/**
 * The failure for input that fails the schema on the server. Actions always
 * re-validate: the browser's check is a convenience, and anyone can call a
 * Server Action with any payload. An issue on the whole object (a refine
 * without a path) becomes the toast message.
 */
export function invalidInput(
  error: z.ZodError,
  message = "Please check the highlighted fields.",
): ActionFailure {
  const formIssue = error.issues.find((issue) => issue.path.length === 0);
  return actionError(formIssue?.message ?? message, zodFieldErrors(error));
}
