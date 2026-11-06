import type { Metadata } from "next";
import { ProjectStage } from "@/components/projects/ProjectStage";

export const metadata: Metadata = { title: "Items" };

export default function ItemsTab() {
  return (
    <ProjectStage
      title="Items"
      description="The extracted items with their specs, quantities and units. Low-confidence fields are flagged; you fix and confirm the list before prices are searched."
      tasks={["T1.3.8", "T1.3.10", "T1.3.11", "T1.3.12"]}
    />
  );
}
