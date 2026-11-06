import type { Metadata } from "next";
import { ProjectStage } from "@/components/projects/ProjectStage";

export const metadata: Metadata = { title: "Costing" };

export default function CostingTab() {
  return (
    <ProjectStage
      title="Costing"
      description="Cost prices, markup or margin per item, discounts, extra costs, tax and rounding, with live totals and a warning below your minimum margin."
      tasks={["T1.8"]}
    />
  );
}
