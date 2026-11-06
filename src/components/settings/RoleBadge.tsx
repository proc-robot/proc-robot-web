import { Badge } from "@/components/ui/badge";
import type { OrgRole } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

/** An organization role as a neutral chip (the Owner stands out a little). */
export function RoleBadge({ role }: { role: OrgRole }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full border-pr-border-card font-medium",
        role === "owner" ? "bg-pr-success-tint text-pr-accent" : "bg-pr-neutral-chip text-pr-ink",
      )}
    >
      {ROLE_LABELS[role]}
    </Badge>
  );
}
