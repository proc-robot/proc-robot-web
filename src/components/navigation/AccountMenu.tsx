"use client";

import { useTransition } from "react";
import { ChevronsUpDown, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { signOut } from "@/lib/auth/actions";
import type { Account } from "@/lib/auth/session";

function initials(name: string) {
  const parts = name
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase();
}

/**
 * The signed-in user in the sidebar footer: name and organization, with a
 * menu holding their email and sign-out. Profile and "sign out of all
 * devices" join it with T1.1.1 / T1.1.2. One organization per user, so there
 * is nothing to switch (TASKS.md T0.1.8).
 */
export function AccountMenu({ account }: { account: Account }) {
  const { isMobile } = useSidebar();
  const [isPending, startTransition] = useTransition();

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            size="lg"
            tooltip={account.name}
            aria-label={`Account: ${account.name}`}
            className="data-[state=open]:bg-sidebar-accent"
          >
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground"
              aria-hidden
            >
              {initials(account.name)}
            </span>
            <span className="grid min-w-0 flex-1 leading-tight">
              <span className="truncate text-sm">{account.name}</span>
              {account.organizationName && (
                <span className="truncate text-xs opacity-70">{account.organizationName}</span>
              )}
            </span>
            <ChevronsUpDown className="ml-auto opacity-60" aria-hidden />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side={isMobile ? "top" : "right"} align="end" className="min-w-56">
          <DropdownMenuLabel className="grid font-normal">
            <span className="text-sm font-medium">{account.name}</span>
            <span className="text-xs text-muted-foreground">{account.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={isPending} onSelect={() => startTransition(() => signOut())}>
            <LogOut aria-hidden />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
