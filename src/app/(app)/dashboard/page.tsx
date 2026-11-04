import type { Metadata } from "next";
import { APP_NAV } from "@/components/app/nav";
import { WorkerCheck } from "@/components/app/WorkerCheck";
import { ComingSoon } from "@/components/navigation/ComingSoon";
import { navItem } from "@/components/navigation/types";

const item = navItem(APP_NAV, "/dashboard");

export const metadata: Metadata = { title: item.label };

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <ComingSoon item={item} brand />
      <WorkerCheck />
    </div>
  );
}
