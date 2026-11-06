/**
 * The activity feed (O6): one sentence per audit entry the organization's
 * members may see (`org_activity()` filters which). Pure, so it is unit
 * tested; a new action in the feed needs a sentence here.
 */
export type ActivityEntry = {
  action: string;
  actorName: string | null;
  metadata: Record<string, unknown>;
};

const ROLE_NOUNS: Record<string, string> = {
  owner: "the Owner",
  admin: "an Admin",
  member: "a Member",
};

/** Which part of the settings an `organization.updated` entry touched. */
const FIELD_AREAS: Record<string, string> = {
  name: "the organization details",
  country: "the organization details",
  default_currency: "the organization details",
  address: "the organization details",
  tax_id: "the organization details",
  logo_path: "the logo",
  email: "the public profile",
  whatsapp_number: "the public profile",
  website: "the public profile",
  description: "the public profile",
  category_slugs: "the public profile",
  settings: "the pricing & document defaults",
};

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

export function describeActivity({ action, actorName, metadata }: ActivityEntry): string {
  const actor = actorName ?? "Someone";
  const text = (key: string) =>
    typeof metadata[key] === "string" ? (metadata[key] as string) : "";
  const role = (key: string) => ROLE_NOUNS[text(key)] ?? "a Member";

  switch (action) {
    case "organization.created":
      return `${actor} created the organization`;
    case "organization.updated": {
      const fields = Array.isArray(metadata.fields) ? (metadata.fields as string[]) : [];
      const areas = [...new Set(fields.map((field) => FIELD_AREAS[field]).filter(Boolean))];
      return `${actor} updated ${list(areas) || "the organization"}`;
    }
    case "organization.ownership_transferred":
      return `${text("from") || actor} made ${text("to") || "a member"} the Owner`;
    case "organization.restored":
      return `${actor} restored the organization`;
    case "member.invited":
      return metadata.resent
        ? `${actor} renewed the invite for ${text("email")}`
        : `${actor} invited ${text("email")} as ${role("org_role")}`;
    case "member.invite_revoked":
      return `${actor} revoked the invite for ${text("email")}`;
    case "member.joined":
      return `${actor} joined as ${role("org_role")}`;
    case "member.role_changed":
      return `${actor} made ${text("name") || "a member"} ${role("to")}`;
    case "member.removed":
      return `${actor} removed ${text("name") || "a member"}`;
    case "member.left":
      return `${text("name") || actor} left the organization`;
    case "account.deleted":
      return "A member deleted their account";
    default:
      return `${actor}: ${action}`;
  }
}
