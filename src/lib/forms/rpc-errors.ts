/**
 * Turns an error raised by one of our Postgres functions into a message for
 * the user. The functions raise short codes as the message (see CLAUDE.md →
 * Database); plan limits put the limit's name in `details`.
 */
type RpcError = { message: string; details?: string | null } | null | undefined;

const MESSAGES: Record<string, string> = {
  already_in_organization: "You already belong to an organization.",
  invite_not_found: "This invite is no longer valid. Ask for a new one.",
  not_allowed: "You don't have permission to do that.",
  already_member: "That person is already a member of your organization.",
  invalid_role: "That role can't be given through an invite.",
  invalid_email: "Enter a valid email address.",
  no_organization: "Create or join an organization first.",
  not_signed_in: "Your session has ended. Please sign in again.",
};

const PLAN_LIMITS: Record<string, string> = {
  seats: "Your plan has no free seats. Remove a member or a pending invite, or upgrade the plan.",
  active_projects:
    "Your plan's limit on open projects is reached. Archive or close a project, or upgrade the plan.",
};

export const GENERIC_ERROR = "Something went wrong. Please try again.";

export function rpcErrorMessage(error: RpcError, fallback: string = GENERIC_ERROR): string {
  if (!error) return fallback;
  if (error.message === "plan_limit_reached") {
    return PLAN_LIMITS[error.details ?? ""] ?? "Your plan's limit is reached. Upgrade the plan.";
  }
  return MESSAGES[error.message] ?? fallback;
}
