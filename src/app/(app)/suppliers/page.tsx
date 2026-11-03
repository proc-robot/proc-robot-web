import type { Metadata } from "next";
import { APP_NAV } from "@/components/app/nav";
import { ComingSoon } from "@/components/navigation/ComingSoon";
import { navItem } from "@/components/navigation/types";

const item = navItem(APP_NAV, "/suppliers");

export const metadata: Metadata = { title: item.label };

export default function SuppliersPage() {
  return <ComingSoon item={item} brand />;
}
