"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Combobox, type ComboboxOption } from "@/components/shared/Combobox";
import { SearchInput } from "@/components/shared/SearchInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DUE_FILTERS,
  isFiltered,
  projectListSearch,
  SORTS,
  STATUS_FILTERS,
  type ProjectFilters as Filters,
} from "@/lib/projects";

const ANY = "any";

/**
 * The project list's search, filters and sort (W3). They live in the URL, so
 * a filtered list can be shared or bookmarked; the page reads them back.
 */
export function ProjectFilters({
  filters,
  customers,
  members,
}: {
  filters: Filters;
  customers: ComboboxOption[];
  members: ComboboxOption[];
}) {
  const router = useRouter();

  function apply(patch: Partial<Filters>) {
    router.push(`/projects${projectListSearch({ ...filters, ...patch, page: 1 })}`);
  }

  return (
    <div className="space-y-3">
      <SearchInput label="Search projects" placeholder="Search by name, reference or customer…" />
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.status}
          onValueChange={(status) => apply({ status: status as Filters["status"] })}
        >
          <SelectTrigger aria-label="Status" className="w-40 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_FILTERS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Combobox
          options={[{ value: ANY, label: "All customers" }, ...customers]}
          value={filters.customer ?? ANY}
          onChange={(value) => apply({ customer: value === ANY ? null : value })}
          placeholder="All customers"
          searchPlaceholder="Search customers…"
          emptyText="No customer by that name."
          ariaLabel="Customer"
          className="w-52 bg-white"
        />

        <Select
          value={filters.createdBy ?? ANY}
          onValueChange={(value) => apply({ createdBy: value === ANY ? null : value })}
        >
          <SelectTrigger aria-label="Created by" className="w-44 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Created by anyone</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.value} value={member.value}>
                {member.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.due} onValueChange={(due) => apply({ due: due as Filters["due"] })}>
          <SelectTrigger aria-label="Deadline" className="w-40 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DUE_FILTERS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.sort}
          onValueChange={(sort) => apply({ sort: sort as Filters["sort"] })}
        >
          <SelectTrigger aria-label="Sort by" className="w-56 bg-white">
            <span className="text-pr-text-tertiary">Sort:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORTS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isFiltered(filters) && (
          <Link
            href={`/projects${projectListSearch({ ...filters, q: "", status: "open", customer: null, createdBy: null, due: "any", page: 1 })}`}
            className="px-2 text-sm font-medium text-pr-accent hover:underline"
          >
            Clear filters
          </Link>
        )}
      </div>
    </div>
  );
}
