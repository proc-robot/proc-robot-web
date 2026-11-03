"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { FormatSwitcher } from "./FormatSwitcher";
import { activeItem, isLive, type NavGroup } from "./types";

export type FooterLink = { label: string; href: string; icon: LucideIcon };

/**
 * The chrome shared by the signed-in workspace and the Super Admin console:
 * a collapsible sidebar (icons only when collapsed; a sheet on mobile), a top
 * bar with the trigger and the current location, and the page content.
 *
 * The two sections differ only in their nav config and their theme scope:
 * `(app)` passes `className="theme-brand"` (navy sidebar, cream content),
 * `/admin` passes nothing and keeps the zinc tokens. It is a Client Component
 * because the active item comes from `usePathname`; pages render inside it
 * as Server Components through `children`.
 */
export function SectionShell({
  sectionLabel,
  homeHref,
  groups,
  footerLinks = [],
  className,
  children,
}: {
  /** Shown under the wordmark and in the top bar, e.g. "Workspace". */
  sectionLabel: string;
  homeHref: string;
  groups: NavGroup[];
  footerLinks?: FooterLink[];
  className?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const current = activeItem(groups, pathname);

  return (
    <SidebarProvider className={className}>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild tooltip="Proc-Robot">
                <Link href={homeHref}>
                  <Image
                    src="/brand/proc-robot-head.png"
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 shrink-0"
                  />
                  <span className="grid leading-tight">
                    <span className="font-newsreader text-lg font-medium">Proc-Robot</span>
                    <span className="text-xs opacity-70">{sectionLabel}</span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <nav aria-label={`${sectionLabel} navigation`}>
            {groups.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        {isLive(item) ? (
                          <SidebarMenuButton
                            asChild
                            isActive={current?.href === item.href}
                            tooltip={item.label}
                            className="data-[active=true]:shadow-[inset_3px_0_0_var(--sidebar-primary)]"
                          >
                            <Link href={item.href}>
                              <item.icon />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        ) : (
                          <>
                            <SidebarMenuButton disabled tooltip={`${item.label} (${item.phase})`}>
                              <item.icon />
                              <span>{item.label}</span>
                            </SidebarMenuButton>
                            <SidebarMenuBadge className="opacity-60">{item.phase}</SidebarMenuBadge>
                          </>
                        )}
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </nav>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            {footerLinks.map((link) => (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton asChild tooltip={link.label}>
                  <Link href={link.href}>
                    <link.icon />
                    <span>{link.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <FormatSwitcher />
            {/* Placeholder until Supabase Auth lands (TASKS.md T0.3): the
                user's name, organization and a sign-out menu go here. */}
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" tooltip="Not signed in" className="cursor-default">
                <UserRound />
                <span className="grid leading-tight">
                  <span className="text-sm">Not signed in</span>
                  <span className="text-xs opacity-70">Sign-in arrives in Phase 0</span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      {/* min-w-0: a flex child defaults to min-width:auto, so one wide child
          (a JSON <pre>, a data table) would stretch the column past the
          viewport instead of scrolling inside its own box. */}
      <SidebarInset className="min-w-0">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
          <p className="text-sm text-muted-foreground">
            {sectionLabel}
            {current && (
              <>
                <span className="mx-1.5" aria-hidden>
                  /
                </span>
                <span className={cn("font-medium text-foreground")}>{current.label}</span>
              </>
            )}
          </p>
        </header>
        <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
