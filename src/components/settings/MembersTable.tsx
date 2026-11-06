"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  changeMemberRole,
  leaveOrganization,
  removeMember,
  transferOwnership,
} from "@/app/(app)/settings/actions";
import type { OrgRole } from "@/lib/auth/session";
import { initials } from "@/lib/initials";
import { RoleBadge } from "./RoleBadge";

export type Member = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: OrgRole;
};

type Pending = { kind: "remove" | "transfer"; member: Member } | { kind: "leave" } | null;

/**
 * The organization's members (O4). Owner and Admins change roles and remove
 * members; only the Owner transfers ownership; anyone but the Owner can leave.
 * The database enforces the same rules (CORE_FEATURES.md §17).
 */
export function MembersTable({
  members,
  currentUserId,
  currentRole,
}: {
  members: Member[];
  currentUserId: string;
  currentRole: OrgRole;
}) {
  const [pending, setPending] = useState<Pending>(null);
  const [isChanging, startChange] = useTransition();
  const canManage = currentRole === "owner" || currentRole === "admin";

  function setRole(member: Member, role: "admin" | "member") {
    startChange(async () => {
      const result = await changeMemberRole(member.id, role);
      if (result.ok)
        toast.success(`${member.name} is now ${role === "admin" ? "an Admin" : "a Member"}.`);
      else toast.error(result.error);
    });
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const isSelf = member.id === currentUserId;
            const manageable = canManage && !isSelf && member.role !== "owner";
            const canLeave = isSelf && member.role !== "owner";
            return (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt="" />}
                      <AvatarFallback className="bg-pr-neutral-chip text-xs font-semibold">
                        {initials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="grid min-w-0">
                      <span className="truncate font-medium">
                        {member.name}
                        {isSelf && (
                          <span className="font-normal text-pr-text-tertiary"> (you)</span>
                        )}
                      </span>
                      <span className="truncate text-xs text-pr-text-tertiary">{member.email}</span>
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <RoleBadge role={member.role} />
                </TableCell>
                <TableCell>
                  {(manageable || canLeave) && (
                    // Not modal: a modal menu would hand focus back after the dialog opened.
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isChanging}
                          aria-label={`Actions for ${member.name}`}
                        >
                          <MoreHorizontal aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {manageable && member.role === "member" && (
                          <DropdownMenuItem onSelect={() => setRole(member, "admin")}>
                            Make Admin
                          </DropdownMenuItem>
                        )}
                        {manageable && member.role === "admin" && (
                          <DropdownMenuItem onSelect={() => setRole(member, "member")}>
                            Make Member
                          </DropdownMenuItem>
                        )}
                        {manageable && currentRole === "owner" && (
                          <DropdownMenuItem
                            onSelect={() => setPending({ kind: "transfer", member })}
                          >
                            Transfer ownership
                          </DropdownMenuItem>
                        )}
                        {manageable && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => setPending({ kind: "remove", member })}
                            >
                              Remove from organization
                            </DropdownMenuItem>
                          </>
                        )}
                        {canLeave && (
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setPending({ kind: "leave" })}
                          >
                            Leave organization
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <ConfirmAction
        open={pending?.kind === "remove"}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending?.kind === "remove" ? `Remove ${pending.member.name}?` : ""}
        description={
          <p>
            They lose access to the organization at once and are signed out. Their work stays with
            the organization.
          </p>
        }
        confirmLabel="Remove"
        destructive
        successMessage="Member removed."
        onConfirm={() =>
          pending?.kind === "remove" ? removeMember(pending.member.id) : Promise.resolve()
        }
      />
      <ConfirmAction
        open={pending?.kind === "transfer"}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending?.kind === "transfer" ? `Make ${pending.member.name} the Owner?` : ""}
        description={
          <p>
            The Owner manages billing and can delete the organization. You become an Admin, and only
            the new Owner can give ownership back.
          </p>
        }
        confirmLabel="Transfer ownership"
        successMessage="Ownership transferred."
        onConfirm={() =>
          pending?.kind === "transfer" ? transferOwnership(pending.member.id) : Promise.resolve()
        }
      />
      <ConfirmAction
        open={pending?.kind === "leave"}
        onOpenChange={(open) => !open && setPending(null)}
        title="Leave the organization?"
        description={
          <p>You lose access to its projects and documents. An Admin can invite you again.</p>
        }
        confirmLabel="Leave"
        destructive
        onConfirm={() => leaveOrganization()}
      />
    </>
  );
}
