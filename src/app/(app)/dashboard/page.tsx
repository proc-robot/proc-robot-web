import type { Metadata } from "next";
import { APP_NAV } from "@/components/app/nav";
import { ActivityFeed } from "@/components/app/ActivityFeed";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { WorkerCheck } from "@/components/app/WorkerCheck";
import { navItem } from "@/components/navigation/types";

const item = navItem(APP_NAV, "/dashboard");

export const metadata: Metadata = { title: item.label };

/**
 * The workspace home. Team activity is live (T1.1.7); active projects,
 * recent documents and the credit balance join with T1.2, T1.9 and T1.10.5.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader title={item.label} description={item.description} />
      <div className="max-w-2xl">
        <SectionCard id="activity" title="Team activity">
          <ActivityFeed />
        </SectionCard>
      </div>
      <WorkerCheck />
    </div>
  );
}
