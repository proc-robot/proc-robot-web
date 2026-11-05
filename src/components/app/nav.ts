import {
  Building2,
  CreditCard,
  FileText,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  Package,
  Settings,
  Store,
  Truck,
} from "lucide-react";
import type { NavGroup } from "@/components/navigation/types";

/**
 * The signed-in workspace's sidebar — the only place its navigation is defined.
 * A new page is a `page.tsx` under `src/app/(app)/` plus an entry here.
 * Features come from CORE_FEATURES.md; task ids from TASKS.md.
 *
 * Paths carry no `/app` prefix: the workspace is served on app.proc-robot.com
 * (host routing in src/proxy.ts, Phase 0), so `/projects` is the real URL.
 * Price discovery and costing live inside a project, not in the sidebar.
 */
export const APP_NAV: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        phase: "MVP",
        description: "Your active projects, recent documents, credit balance and team activity.",
        tasks: ["T1.1.7", "T1.10.5"],
      },
      {
        label: "Projects",
        href: "/projects",
        icon: FolderKanban,
        phase: "MVP",
        description:
          "Tenders and jobs: upload specifications, review the extracted items, find prices and cost the quotation.",
        tasks: ["T1.2", "T1.3", "T1.5", "T1.6", "T1.8"],
      },
      {
        label: "RFQs & Quotations",
        href: "/documents",
        icon: FileText,
        phase: "MVP",
        description:
          "Every RFQ and Sales Quotation across your projects, with status, revisions and downloads.",
        tasks: ["T1.9"],
      },
      {
        label: "Customers",
        href: "/customers",
        icon: Building2,
        phase: "MVP",
        description: "Your customer directory, used on projects and quotations.",
        tasks: ["T1.2.4"],
      },
    ],
  },
  {
    label: "Sourcing",
    items: [
      {
        label: "My Suppliers",
        href: "/suppliers",
        icon: Truck,
        phase: "MVP",
        description: "Your private supplier directory, price lists and price history.",
        tasks: ["T1.4"],
      },
      {
        label: "Saleable items",
        href: "/saleable-items",
        icon: Package,
        phase: "P3",
        description:
          "Products your organization offers. Other organizations can find them and request a quote.",
        tasks: ["T3.3"],
      },
      {
        label: "Marketplace",
        href: "/marketplace",
        icon: Store,
        phase: "P3",
        description:
          "Search items published by other organizations, then request a quote or contact the supplier.",
        tasks: ["T3.4"],
      },
      {
        label: "Quote requests",
        href: "/quote-requests",
        icon: Inbox,
        phase: "P3",
        description: "Quote requests sent and received between organizations.",
        tasks: ["T3.4"],
      },
    ],
  },
  {
    label: "Organization",
    items: [
      {
        label: "Templates",
        href: "/templates",
        icon: LayoutTemplate,
        phase: "MVP",
        description: "Your RFQ and quotation templates (DOCX/XLSX) and their field mapping.",
        tasks: ["T1.9.5", "T1.9.6", "T1.9.7", "T1.9.8"],
      },
      {
        label: "Billing & credits",
        href: "/billing",
        icon: CreditCard,
        phase: "MVP",
        description:
          "Your plan, credit balance and credit ledger. Online payment through Stripe arrives in P2.",
        tasks: ["T1.10", "T2.1"],
      },
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
        phase: "MVP",
        description:
          "Organization profile, members and invites, tax rates, numbering and pricing defaults.",
        tasks: ["T1.1"],
      },
    ],
  },
];
