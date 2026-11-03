import type { Metadata } from "next";
import { ADMIN_NAV } from "@/components/admin/nav";
import { ComingSoon } from "@/components/navigation/ComingSoon";
import { navItem } from "@/components/navigation/types";

const item = navItem(ADMIN_NAV, "/admin/search-providers");

export const metadata: Metadata = { title: item.label };

export default function AdminSearchProvidersPage() {
  return <ComingSoon item={item} />;
}
