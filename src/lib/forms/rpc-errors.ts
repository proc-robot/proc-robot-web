/**
 * Turns an error raised by one of our Postgres functions into a message for
 * the user. The functions raise short codes as the message (see CLAUDE.md →
 * Database); plan limits put the limit's name in `details`, and invalid
 * fields (`invalid_field`) put the field's name there.
 */
type RpcError = { message: string; details?: string | null } | null | undefined;

const MESSAGES: Record<string, string> = {
  already_in_organization: "You already belong to an organization.",
  invite_not_found: "This invite is no longer valid. Ask for a new one.",
  not_allowed: "You don't have permission to do that.",
  already_member: "That person is already a member of your organization.",
  invalid_role: "That role can't be given this way.",
  invalid_email: "Enter a valid email address.",
  no_organization: "Create or join an organization first.",
  not_signed_in: "Your session has ended. Please sign in again.",
  member_not_found: "That person is no longer a member of your organization.",
  owner_must_transfer:
    "As the Owner, transfer ownership to another member first, or delete the organization.",
  confirmation_mismatch: "The name doesn't match. Type the organization's name exactly.",
  organization_not_restorable: "This organization can no longer be restored.",
  project_not_found: "This project no longer exists.",
  project_archived: "This project is archived. Set it back to Active to add or read documents.",
  invalid_file: "This file can't be added. Upload it again.",
  unsupported_file: "Upload an Excel (.xlsx, .xls), CSV or PDF file.",
  file_not_found: "The upload didn't finish. Try again.",
  document_not_found: "This document no longer exists.",
  document_not_ready: "This document isn't ready to be read yet.",
  document_busy: "Wait until the document has been read.",
};

const PLAN_LIMITS: Record<string, string> = {
  seats: "Your plan has no free seats. Remove a member or a pending invite, or upgrade the plan.",
  active_projects:
    "Your plan's limit on open projects is reached. Archive or close a project, or upgrade the plan.",
};

/** One message per field the database checks (the `detail` of `invalid_field`). */
export const INVALID_FIELD_MESSAGES: Record<string, string> = {
  name: "Enter a name of up to 200 characters.",
  contact_name: "Keep the contact's name under 120 characters.",
  phone: "Enter the number with digits, spaces and + ( ) - . / only.",
  notes: "Keep the notes under 2,000 characters.",
  reference_no: "Keep the reference under 100 characters.",
  deadline: "Enter a valid date.",
  delivery_country: "Choose the delivery country.",
  delivery_city: "Keep the city under 100 characters.",
  full_name: "Keep your name under 120 characters.",
  timezone: "Choose a time zone from the list.",
  address: "Keep the address under 500 characters.",
  tax_id: "Keep the tax ID under 50 characters.",
  email: "Enter a valid email address.",
  whatsapp_number: "Enter the number with its country code, e.g. +65 9123 4567.",
  website: "Enter the full address, starting with https://.",
  description: "Keep the description under 1,000 characters.",
  category_slugs: "Choose categories from the list.",
  "settings.tax_rate": "Enter a tax rate from 0 to 100.",
  "settings.tax_label": "Keep the tax name to 20 characters.",
  "settings.default_markup_pct": "Enter a markup from 0 to 1000.",
  "settings.minimum_margin_pct": "Enter a margin from 0 to below 100.",
  "settings.numbering.sales_quote":
    "Use letters, numbers, - _ . / and the codes {YYYY}, {YY}, {MM} and {NNNN}.",
  "settings.numbering.rfq":
    "Use letters, numbers, - _ . / and the codes {YYYY}, {YY}, {MM} and {NNNN}.",
  "settings.rounding": "Choose how prices are rounded.",
  "settings.rounding.increment": "Enter a rounding step above 0.",
  "settings.email_signature": "Keep the signature under 2,000 characters.",
};

export const GENERIC_ERROR = "Something went wrong. Please try again.";

export function rpcErrorMessage(error: RpcError, fallback: string = GENERIC_ERROR): string {
  if (!error) return fallback;
  if (error.message === "insufficient_credits") {
    const left = Number(error.details);
    return Number.isFinite(left)
      ? `Not enough credits: ${left} left. Plan credits renew every month.`
      : "Not enough credits. Plan credits renew every month.";
  }
  if (error.message === "plan_limit_reached") {
    return PLAN_LIMITS[error.details ?? ""] ?? "Your plan's limit is reached. Upgrade the plan.";
  }
  if (error.message === "invalid_field") {
    return INVALID_FIELD_MESSAGES[error.details ?? ""] ?? "One of the fields is not valid.";
  }
  return MESSAGES[error.message] ?? fallback;
}

/**
 * The form field behind an `invalid_field` error, through the form's own map
 * from database field (`settings.tax_rate`) to form field (`taxRate`), so
 * the message lands under the right input.
 */
export function rpcFieldErrors(
  error: RpcError,
  fields: Record<string, string>,
): Record<string, string> | undefined {
  if (error?.message !== "invalid_field" || !error.details) return undefined;
  const field = fields[error.details];
  return field ? { [field]: rpcErrorMessage(error) } : undefined;
}
