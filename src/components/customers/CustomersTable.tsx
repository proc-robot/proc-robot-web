import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type CustomerRow = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  projects: number;
};

/** The customer directory (Q1). */
export function CustomersTable({ rows }: { rows: CustomerRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead className="text-right">Projects</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((customer) => (
          <TableRow key={customer.id} className="align-top">
            <TableCell className="max-w-[22rem] whitespace-normal">
              <Link
                href={`/customers/${customer.id}`}
                className="font-medium text-pr-ink hover:text-pr-accent hover:underline"
              >
                {customer.name}
              </Link>
              {customer.contactName && (
                <p className="text-xs text-pr-text-tertiary">{customer.contactName}</p>
              )}
            </TableCell>
            <TableCell className="text-sm whitespace-normal">
              <span className="grid">
                {customer.email && <span>{customer.email}</span>}
                {customer.phone && (
                  <span className="text-pr-text-secondary tabular-nums">{customer.phone}</span>
                )}
                {!customer.email && !customer.phone && (
                  <span className="text-pr-text-tertiary">—</span>
                )}
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">{customer.projects}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
