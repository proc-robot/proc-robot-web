import { describe, expect, it } from "vitest";
import {
  addDays,
  daysUntil,
  deadlineNote,
  deadlineRange,
  DEFAULT_PROJECT_FILTERS,
  isFiltered,
  parseProjectFilters,
  projectListSearch,
  searchPattern,
  statusesFor,
  todayIn,
} from "./projects";

const CUSTOMER = "c0000000-0000-4000-8000-000000000001";

describe("parseProjectFilters", () => {
  it("defaults to open projects, recently updated first", () => {
    expect(parseProjectFilters({})).toEqual(DEFAULT_PROJECT_FILTERS);
  });

  it("reads every filter from the URL", () => {
    expect(
      parseProjectFilters({
        q: "  cctv ",
        status: "won",
        customer: CUSTOMER,
        by: CUSTOMER,
        due: "week",
        sort: "deadline",
        page: "3",
      }),
    ).toEqual({
      q: "cctv",
      status: "won",
      customer: CUSTOMER,
      createdBy: CUSTOMER,
      due: "week",
      sort: "deadline",
      page: 3,
    });
  });

  it("ignores values it does not know", () => {
    expect(
      parseProjectFilters({
        status: "deleted",
        customer: "1 or 1=1",
        due: "toString",
        sort: "constructor",
        page: "-2",
      }),
    ).toEqual(DEFAULT_PROJECT_FILTERS);
  });

  it("takes the first of repeated parameters", () => {
    expect(parseProjectFilters({ status: ["lost", "won"] }).status).toBe("lost");
  });
});

describe("projectListSearch", () => {
  it("leaves the defaults out", () => {
    expect(projectListSearch(DEFAULT_PROJECT_FILTERS)).toBe("");
  });

  it("round-trips through parseProjectFilters", () => {
    const filters = {
      q: "tower (a)",
      status: "archived",
      customer: CUSTOMER,
      createdBy: CUSTOMER,
      due: "none",
      sort: "name",
      page: 2,
    } as const;
    const search = projectListSearch(filters);
    expect(search).toBe(
      `?q=tower+%28a%29&status=archived&customer=${CUSTOMER}&by=${CUSTOMER}&due=none&sort=name&page=2`,
    );
    expect(parseProjectFilters(Object.fromEntries(new URLSearchParams(search)))).toEqual(filters);
  });
});

describe("isFiltered", () => {
  it("is false for the default list, whatever the sort or page", () => {
    expect(isFiltered({ ...DEFAULT_PROJECT_FILTERS, sort: "name", page: 4 })).toBe(false);
  });

  it("is true once a filter is set", () => {
    expect(isFiltered({ ...DEFAULT_PROJECT_FILTERS, due: "overdue" })).toBe(true);
  });
});

describe("statusesFor", () => {
  it("shows open projects as active and submitted", () => {
    expect(statusesFor("open")).toEqual(["active", "submitted"]);
  });

  it("hides archived projects unless they are asked for", () => {
    expect(statusesFor("all")).toEqual(["active", "submitted", "won", "lost"]);
    expect(statusesFor("archived")).toEqual(["archived"]);
  });
});

describe("deadlineRange", () => {
  it("turns the due filter into a date range", () => {
    expect(deadlineRange("overdue", "2026-11-06")).toEqual({ before: "2026-11-06" });
    expect(deadlineRange("week", "2026-11-06")).toEqual({ from: "2026-11-06", to: "2026-11-13" });
    expect(deadlineRange("month", "2026-12-15")).toEqual({ from: "2026-12-15", to: "2027-01-14" });
    expect(deadlineRange("none", "2026-11-06")).toEqual({ none: true });
    expect(deadlineRange("any", "2026-11-06")).toBeNull();
  });
});

describe("searchPattern", () => {
  it("wraps the term for a contains search", () => {
    expect(searchPattern(" CCTV ")).toBe("%CCTV%");
  });

  it("neutralizes characters with a meaning in ilike or a PostgREST filter", () => {
    expect(searchPattern('Tower (A), 50%_"x"\\*:')).toBe("%Tower _A__ 50___x____%");
  });
});

describe("dates", () => {
  it("gives today's date in the user's time zone", () => {
    const now = new Date("2026-11-06T20:00:00Z");
    expect(todayIn("UTC", now)).toBe("2026-11-06");
    expect(todayIn("Asia/Jakarta", now)).toBe("2026-11-07");
    expect(todayIn("America/New_York", now)).toBe("2026-11-06");
  });

  it("counts days across months", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(daysUntil("2027-01-02", "2026-12-30")).toBe(3);
    expect(daysUntil("2026-11-01", "2026-11-06")).toBe(-5);
  });

  it("describes how close a deadline is", () => {
    const today = "2026-11-06";
    expect(deadlineNote("2026-11-04", today)).toEqual({
      text: "2 days overdue",
      overdue: true,
      urgent: true,
    });
    expect(deadlineNote("2026-11-05", today)?.text).toBe("1 day overdue");
    expect(deadlineNote(today, today)?.text).toBe("Due today");
    expect(deadlineNote("2026-11-07", today)?.text).toBe("Due tomorrow");
    expect(deadlineNote("2026-11-09", today)).toEqual({
      text: "Due in 3 days",
      overdue: false,
      urgent: true,
    });
    expect(deadlineNote("2026-11-20", today)?.urgent).toBe(false);
    expect(deadlineNote("2026-12-06", today)?.text).toBe("Due in 30 days");
    expect(deadlineNote("2026-12-07", today)).toBeNull();
    expect(deadlineNote("2025-01-01", today)?.text).toBe("674 days overdue");
  });
});
