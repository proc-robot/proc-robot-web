"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ChevronsUpDown, LogOut, Settings, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { initials } from "@/lib/initials";

/**
 * The signed-in user in the sidebar footer: picture, name and organization,
 * with a menu holding their email, their account page (T1.1.1–T1.1.3), the
 * organization's settings and sign-out. One organization per user, so there
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
            <Avatar className="size-8 shrink-0">
              {account.avatarUrl && <AvatarImage src={account.avatarUrl} alt="" />}
              <AvatarFallback className="bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                {initials(account.name)}
              </AvatarFallback>
            </Avatar>
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
          {account.organizationId && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/account">
                  <UserRound aria-hidden />
                  Your account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings aria-hidden />
                  Organization settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem disabled={isPending} onSelect={() => startTransition(() => signOut())}>
            <LogOut aria-hidden />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
