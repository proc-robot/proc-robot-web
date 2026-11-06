import type { Metadata } from "next";
import { ProjectStage } from "@/components/projects/ProjectStage";

export const metadata: Metadata = { title: "RFQs & Quotations" };

export default function QuotationsTab() {
  return (
    <ProjectStage
      title="RFQs & Quotations"
      description="RFQs to suppliers (never with prices) and the Sales Quotation to your customer, generated from your templates as PDF, DOCX or XLSX."
      tasks={["T1.9"]}
    />
  );
}
