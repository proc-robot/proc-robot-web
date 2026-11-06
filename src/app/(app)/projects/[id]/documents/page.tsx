import type { Metadata } from "next";
import { ProjectStage } from "@/components/projects/ProjectStage";

export const metadata: Metadata = { title: "Documents" };

export default function DocumentsTab() {
  return (
    <ProjectStage
      title="Documents"
      description="Upload the customer's specification documents (Excel, CSV or PDF, several per project). The AI reads them into an item list, keeping each item's source row or page."
      tasks={["T1.3.2", "T1.3.3", "T1.3.4", "T1.3.5", "T1.3.13"]}
    />
  );
}
