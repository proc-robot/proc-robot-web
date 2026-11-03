import {
  Building2,
  Cpu,
  Database,
  FileSearch,
  Gauge,
  Globe,
  ScrollText,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Wallet,
} from "lucide-react";
import type { NavGroup } from "@/components/navigation/types";

/**
 * The Super Admin console's sidebar — the only place its navigation is defined.
 * A new page is a `page.tsx` under `src/app/admin/` plus an entry here.
 * Sections follow CORE_FEATURES.md §15; task ids come from TASKS.md.
 */
export const ADMIN_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: Gauge,
        phase: "MVP",
        description:
          "Platform metrics: organizations, users, documents, offers, extraction accuracy, AI and search cost.",
        tasks: ["T1.12.1"],
      },
    ],
  },
  {
    label: "Tenants",
    items: [
      {
        label: "Organizations",
        href: "/admin/organizations",
        icon: Building2,
        phase: "MVP",
        description:
          "Every organization: view, edit, suspend or reactivate, verify as a supplier, assign a plan.",
        tasks: ["T1.12.2"],
      },
      {
        label: "Users",
        href: "/admin/users",
        icon: Users,
        phase: "MVP",
        description:
          "Every user: roles, move between organizations, disable, sign out, invites, read-only “view as org”.",
        tasks: ["T1.12.3", "T1.12.4"],
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        label: "Data",
        href: "/admin/data",
        icon: Database,
        phase: "MVP",
        description:
          "Browse and fix data across organizations: projects, documents, items, suppliers, prices, quotations.",
        tasks: ["T1.12.5"],
      },
      {
        label: "Catalog & moderation",
        href: "/admin/catalog",
        icon: ShieldCheck,
        phase: "MVP",
        description:
          "Seed the catalog for pilots, review new organizations’ first items, handle reports, manage categories and units.",
        tasks: ["T1.12.6", "T2.3.6", "T3.1.6"],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "AI & jobs",
        href: "/admin/jobs",
        icon: Cpu,
        phase: "MVP",
        description:
          "Queue and job monitor, retries, dead letters, per-document AI traces and model settings.",
        tasks: ["T1.12.7"],
      },
      {
        label: "Audit log",
        href: "/admin/audit-log",
        icon: ScrollText,
        phase: "MVP",
        description: "Immutable log of sensitive actions, with filters and CSV export.",
        tasks: ["T1.12.12"],
      },
    ],
  },
  {
    label: "Search",
    items: [
      {
        label: "Search providers",
        href: "/admin/search-providers",
        icon: Search,
        phase: "MVP",
        description:
          "SerpAPI, DataForSEO, Claude web search and Icecat: on/off, per-country order, health, usage, budgets and API keys.",
        tasks: ["T1.12.9"],
      },
      {
        label: "Regions & websites",
        href: "/admin/search-regions",
        icon: Globe,
        phase: "MVP",
        description:
          "Search countries and each country’s trusted, neutral and blocked websites, with CSV import/export.",
        tasks: ["T1.12.10"],
      },
    ],
  },
  {
    label: "Platform",
    items: [
      {
        label: "Billing & credits",
        href: "/admin/billing",
        icon: Wallet,
        phase: "MVP",
        description:
          "Credit ledgers and manual adjustments now; Stripe subscriptions, packs and the webhook log in P3.",
        tasks: ["T1.12.11", "T3.3.10"],
      },
      {
        label: "Platform settings",
        href: "/admin/settings",
        icon: SlidersHorizontal,
        phase: "MVP",
        description:
          "Default templates, FX rates, email and upload limits, credit rates, feature flags, announcements.",
        tasks: ["T1.12.8"],
      },
      {
        label: "Public SEO",
        href: "/admin/seo",
        icon: FileSearch,
        phase: "MVP",
        description:
          "What each public page publishes to search engines: title, description, share image and live JSON-LD.",
        tasks: [],
      },
    ],
  },
];
