/**
 * Projects (W1–W3): statuses, the project list's filters and deadlines. Pure,
 * so it is unit tested and shared by pages and Client Components.
 */

export const PROJECT_STATUSES = ["active", "submitted", "won", "lost", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const isProjectStatus = (value: unknown): value is ProjectStatus =>
  typeof value === "string" && (PROJECT_STATUSES as readonly string[]).includes(value);

/** Open projects count against the plan's `active_projects` limit. */
export const OPEN_STATUSES: readonly ProjectStatus[] = ["active", "submitted"];
export const isOpen = (status: ProjectStatus) => OPEN_STATUSES.includes(status);

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  submitted: "Submitted",
  won: "Won",
  lost: "Lost",
  archived: "Archived",
};

// ------------------------------------------------------------------- filters

export const STATUS_FILTERS = {
  open: "Open",
  active: "Active",
  submitted: "Submitted",
  won: "Won",
  lost: "Lost",
  archived: "Archived",
  all: "All but archived",
} as const;
export type StatusFilter = keyof typeof STATUS_FILTERS;

export const DUE_FILTERS = {
  any: "Any deadline",
  overdue: "Overdue",
  week: "Due in 7 days",
  month: "Due in 30 days",
  none: "No deadline",
} as const;
export type DueFilter = keyof typeof DUE_FILTERS;

export const SORTS = {
  updated: "Recently updated",
  deadline: "Deadline",
  name: "Name",
} as const;
export type Sort = keyof typeof SORTS;

export type ProjectFilters = {
  q: string;
  status: StatusFilter;
  customer: string | null;
  createdBy: string | null;
  due: DueFilter;
  sort: Sort;
  page: number;
};

export const DEFAULT_PROJECT_FILTERS: ProjectFilters = {
  q: "",
  status: "open",
  customer: null,
  createdBy: null,
  due: "any",
  sort: "updated",
  page: 1,
};

type SearchParams = Record<string, string | string[] | undefined>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID.test(value);

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const oneOf = <T extends string>(options: Record<T, string>, value: unknown, fallback: T): T =>
  typeof value === "string" && Object.hasOwn(options, value) ? (value as T) : fallback;

/** The list's URL (`?q=…&status=…&page=…`) as filters; anything unknown falls back to the default. */
export function parseProjectFilters(params: SearchParams): ProjectFilters {
  const page = Number.parseInt(first(params.page) ?? "", 10);
  const customer = first(params.customer);
  const createdBy = first(params.by);
  return {
    q: (first(params.q) ?? "").trim().slice(0, 100),
    status: oneOf(STATUS_FILTERS, first(params.status), DEFAULT_PROJECT_FILTERS.status),
    customer: isUuid(customer) ? customer : null,
    createdBy: isUuid(createdBy) ? createdBy : null,
    due: oneOf(DUE_FILTERS, first(params.due), DEFAULT_PROJECT_FILTERS.due),
    sort: oneOf(SORTS, first(params.sort), DEFAULT_PROJECT_FILTERS.sort),
    page: Number.isFinite(page) && page > 1 ? page : 1,
  };
}

/** Filters back to the list's query string ("?status=won&page=2"); defaults are left out. */
export function projectListSearch(filters: ProjectFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status !== DEFAULT_PROJECT_FILTERS.status) params.set("status", filters.status);
  if (filters.customer) params.set("customer", filters.customer);
  if (filters.createdBy) params.set("by", filters.createdBy);
  if (filters.due !== DEFAULT_PROJECT_FILTERS.due) params.set("due", filters.due);
  if (filters.sort !== DEFAULT_PROJECT_FILTERS.sort) params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Whether any filter (not the sort or page) differs from the default list. */
export function isFiltered(filters: ProjectFilters): boolean {
  return (
    filters.q !== "" ||
    filters.status !== DEFAULT_PROJECT_FILTERS.status ||
    filters.customer !== null ||
    filters.createdBy !== null ||
    filters.due !== DEFAULT_PROJECT_FILTERS.due
  );
}

/** The statuses a status filter shows. Archived projects only show when asked for. */
export function statusesFor(filter: StatusFilter): ProjectStatus[] {
  if (filter === "open") return [...OPEN_STATUSES];
  if (filter === "all") return PROJECT_STATUSES.filter((status) => status !== "archived");
  return [filter];
}

/** The deadline range a due filter shows, as `date` strings. */
export function deadlineRange(
  due: DueFilter,
  today: string,
): { before?: string; from?: string; to?: string; none?: true } | null {
  switch (due) {
    case "overdue":
      return { before: today };
    case "week":
      return { from: today, to: addDays(today, 7) };
    case "month":
      return { from: today, to: addDays(today, 30) };
    case "none":
      return { none: true };
    default:
      return null;
  }
}

/**
 * A search term as an `ilike` pattern that is also safe inside a PostgREST
 * `or=(…)` filter: the characters with a meaning there or in `ilike`
 * (`, ( ) " \ * : % _`) become `_`, which matches any one character, so
 * "Tower (A)" still finds "Tower (A)".
 */
export function searchPattern(q: string): string {
  return `%${q.trim().replace(/[,()"\\*:%_]/g, "_")}%`;
}

// ----------------------------------------------------------------- deadlines

/** Today's date ("2026-11-06") in a time zone, for comparing with `date` columns. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const DAY_MS = 86_400_000;
const utc = (date: string) => Date.parse(`${date}T00:00:00Z`);

export function addDays(date: string, days: number): string {
  return new Date(utc(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `today` to `date` (negative when past). */
export function daysUntil(date: string, today: string): number {
  return Math.round((utc(date) - utc(today)) / DAY_MS);
}

/** Deadlines further away than this get no "Due in …" note. */
export const DEADLINE_NOTE_DAYS = 30;

/**
 * How close an open project's deadline is: "Due today", "Due in 3 days",
 * "2 days overdue"; null when it is more than 30 days away. `urgent` is
 * overdue or due within 3 days.
 */
export function deadlineNote(
  deadline: string,
  today: string,
): { text: string; overdue: boolean; urgent: boolean } | null {
  const days = daysUntil(deadline, today);
  const plural = (n: number) => (n === 1 ? "1 day" : `${n} days`);
  if (days < 0) return { text: `${plural(-days)} overdue`, overdue: true, urgent: true };
  if (days === 0) return { text: "Due today", overdue: false, urgent: true };
  if (days === 1) return { text: "Due tomorrow", overdue: false, urgent: true };
  if (days > DEADLINE_NOTE_DAYS) return null;
  return { text: `Due in ${plural(days)}`, overdue: false, urgent: days <= 3 };
}
