import { PageHeader } from "@/components/app/PageHeader";
import { SettingsNav } from "@/components/settings/SettingsNav";

/** Organization settings (T1.1): one title, a tab per page. */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Settings"
        description="Your organization's details, public profile, members and pricing defaults."
      />
      <SettingsNav />
      <div className="space-y-8">{children}</div>
    </div>
  );
}
