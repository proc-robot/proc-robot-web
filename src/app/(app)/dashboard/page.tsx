import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { APP_NAV } from "@/components/app/nav";
import { ActivityFeed } from "@/components/app/ActivityFeed";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { WorkerCheck } from "@/components/app/WorkerCheck";
import { navItem } from "@/components/navigation/types";
import { OpenProjects } from "@/components/projects/OpenProjects";
import { Button } from "@/components/ui/button";
import { requireMember } from "@/lib/auth/session";

const item = navItem(APP_NAV, "/dashboard");

export const metadata: Metadata = { title: item.label };

/**
 * The workspace home: open projects (T1.2) and team activity (T1.1.7).
 * Recent documents and the credit balance join with T1.9 and T1.10.5.
 */
export default async function DashboardPage() {
  const claims = await requireMember();
  return (
    <div className="space-y-8">
      <PageHeader
        title={item.label}
        description={item.description}
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <Plus aria-hidden />
              New project
            </Link>
          </Button>
        }
      />
      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        <SectionCard id="open-projects" title="Open projects">
          <OpenProjects orgId={claims.org_id} />
        </SectionCard>
        <SectionCard id="activity" title="Team activity">
          <ActivityFeed />
        </SectionCard>
      </div>
      <WorkerCheck />
    </div>
  );
}
