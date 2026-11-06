import { CircleAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { describeSource, type SourceRef } from "@/lib/documents";
import { cn } from "@/lib/utils";

/** Below this, a value is highlighted for review (D4); the worker flags the same threshold. */
const CONFIDENCE_THRESHOLD = 0.8;

export type ItemRow = {
  id: string;
  position: number;
  name: string;
  description: string | null;
  specs: Record<string, string>;
  quantity: string | null;
  unit: string | null;
  unitCode: string | null;
  source: SourceRef;
  confidence: { overall?: number; fields?: Record<string, number> };
  flags: { code: string; message: string; field?: string }[];
};

export type ItemListSummary = {
  id: string;
  title: string;
  status: "needs_review" | "confirmed";
  documentName: string | null;
  issues: { message: string; source: SourceRef }[];
  items: ItemRow[];
};

const percent = (value: number | undefined) =>
  value === undefined ? "—" : `${Math.round(value * 100)}%`;

const uncertain = (item: ItemRow, field: string) =>
  (item.confidence.fields?.[field] ?? 1) < CONFIDENCE_THRESHOLD;

/**
 * One extracted item list, read-only (D2–D5): every item with its specs,
 * quantity and unit, how sure the reading is, the validation flags and where
 * it came from. Editing and confirming arrive with the review screen (T1.3.10).
 */
export function ItemListView({ list }: { list: ItemListSummary }) {
  const flagged = list.items.filter((item) => item.flags.length > 0).length;
  return (
    <section
      aria-labelledby={`list-${list.id}`}
      className="rounded-[14px] border border-pr-border-card bg-white"
    >
      <div className="flex flex-col gap-2 border-b border-pr-border-hairline px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 id={`list-${list.id}`} className="text-base font-semibold">
            {list.title}
          </h2>
          <p className="text-sm text-pr-text-secondary">
            {list.items.length} items
            {flagged > 0 && ` · ${flagged} to check`}
            {list.documentName && ` · from ${list.documentName}`}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "rounded-full border-pr-border-card font-medium",
            list.status === "confirmed"
              ? "bg-pr-success-tint text-pr-accent"
              : "bg-pr-warm-tint-strong text-pr-warm",
          )}
        >
          {list.status === "confirmed" ? "Confirmed" : "Needs review"}
        </Badge>
      </div>

      {list.issues.length > 0 && (
        <div className="border-b border-pr-border-hairline bg-pr-warm-tint px-6 py-3 text-sm">
          <p className="font-medium">Lines that couldn&apos;t be read</p>
          <ul className="mt-1 space-y-0.5 text-pr-text-secondary">
            {list.issues.map((issue, index) => (
              <li key={index}>
                {describeSource(issue.source)}: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="px-4 py-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Specifications</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Confidence</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.items.map((item) => (
              <TableRow
                key={item.id}
                className={cn("align-top", item.flags.length > 0 && "bg-pr-warm-tint/60")}
              >
                <TableCell className="text-pr-text-tertiary tabular-nums">
                  {item.position + 1}
                </TableCell>
                <TableCell className="max-w-[20rem] whitespace-normal">
                  <p className={cn("font-medium", uncertain(item, "name") && "text-pr-warm")}>
                    {item.name}
                  </p>
                  {item.description && item.description !== item.name && (
                    <p className="text-xs text-pr-text-tertiary">{item.description}</p>
                  )}
                  {item.flags.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {item.flags.map((flag, index) => (
                        <li key={index} className="flex items-start gap-1 text-xs text-pr-warm">
                          {flag.code === "low_confidence" ? (
                            <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
                          ) : (
                            <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
                          )}
                          {flag.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </TableCell>
                <TableCell
                  className={cn(
                    "max-w-[18rem] whitespace-normal",
                    uncertain(item, "specs") && "text-pr-warm",
                  )}
                >
                  {Object.keys(item.specs).length === 0 ? (
                    <span className="text-pr-text-tertiary">—</span>
                  ) : (
                    <dl className="grid grid-cols-[auto_1fr] gap-x-2 text-xs">
                      {Object.entries(item.specs).map(([key, value]) => (
                        <div key={key} className="contents">
                          <dt className="text-pr-text-tertiary">{key.replace(/_/g, " ")}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    uncertain(item, "quantity") && "font-medium text-pr-warm",
                  )}
                >
                  {item.quantity ?? <span className="text-pr-text-tertiary">—</span>}
                </TableCell>
                <TableCell className={cn(uncertain(item, "unit") && "text-pr-warm")}>
                  {item.unitCode ?? item.unit ?? <span className="text-pr-text-tertiary">—</span>}
                  {item.unit && item.unitCode && item.unit.toLowerCase() !== item.unitCode && (
                    <span className="block text-xs text-pr-text-tertiary">“{item.unit}”</span>
                  )}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    (item.confidence.overall ?? 1) < CONFIDENCE_THRESHOLD
                      ? "font-medium text-pr-warm"
                      : "text-pr-text-secondary",
                  )}
                >
                  {percent(item.confidence.overall)}
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap text-pr-text-secondary">
                  {describeSource(item.source)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
