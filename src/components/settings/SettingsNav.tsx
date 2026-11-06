import { SectionTabs } from "@/components/app/SectionTabs";

const SECTIONS = [
  { label: "General", href: "/settings" },
  { label: "Public profile", href: "/settings/public-profile" },
  { label: "Members", href: "/settings/members" },
  { label: "Pricing & documents", href: "/settings/defaults" },
];

/** The settings pages, as tabs under the page title. */
export function SettingsNav() {
  return <SectionTabs label="Settings sections" tabs={SECTIONS} />;
}
