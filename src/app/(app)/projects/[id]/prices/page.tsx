import type { Metadata } from "next";
import { ProjectStage } from "@/components/projects/ProjectStage";

export const metadata: Metadata = { title: "Prices" };

export default function PricesTab() {
  return (
    <ProjectStage
      title="Prices"
      description="Prices for each confirmed item from your suppliers, other organizations and online sellers in the delivery country, compared by spec match, freshness and price."
      tasks={["T1.5", "T1.6", "T1.7"]}
    />
  );
}
