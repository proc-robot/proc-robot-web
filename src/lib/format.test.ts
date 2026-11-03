import { describe, expect, it } from "vitest";
import { createFormatter, isFormatLocale } from "./format";

const us = createFormatter();
const id = createFormatter({ locale: "en-ID", timeZone: "UTC" });

// Intl puts a no-break space between the currency code and the amount.
const plain = (text: string) => text.replace(/[  ]/g, " ");

describe("money", () => {
  it("shows the ISO code, with the separators of the chosen format", () => {
    expect(plain(us.money(1234.5, "USD"))).toBe("USD 1,234.50");
    expect(plain(id.money(1234.5, "USD"))).toBe("USD 1.234,50");
    expect(plain(us.money(99, "sgd"))).toBe("SGD 99.00");
    expect(plain(us.money(-12.345, "USD"))).toBe("-USD 12.35");
  });

  it("shows rupiah without decimals", () => {
    expect(plain(us.money(1500000.4, "IDR"))).toBe("IDR 1,500,000");
    expect(plain(id.money(1500000, "IDR"))).toBe("IDR 1.500.000");
  });
});

describe("dates", () => {
  const instant = "2026-11-04T23:30:00Z";

  it("writes the month as an English word in both formats", () => {
    expect(us.date(instant)).toBe("Nov 4, 2026");
    expect(id.date(new Date(instant))).toBe("4 Nov 2026");
    expect(id.date("2026-08-17T00:00:00Z")).toBe("17 Aug 2026");
  });

  it("uses the user's time zone, not the machine's", () => {
    // 23:30 UTC is already 5 Nov in Jakarta.
    const jakarta = createFormatter({ locale: "en-ID", timeZone: "Asia/Jakarta" });
    expect(jakarta.date(instant)).toBe("5 Nov 2026");
    expect(plain(jakarta.dateTime(instant))).toBe("5 Nov 2026, 06.30 WIB");
    expect(plain(us.dateTime(instant))).toBe("Nov 4, 2026, 23:30 UTC");
  });

  it("never shifts a date column", () => {
    const losAngeles = createFormatter({ locale: "en-US", timeZone: "America/Los_Angeles" });
    expect(losAngeles.calendarDate("2026-11-04")).toBe("Nov 4, 2026");
    expect(losAngeles.date("2026-11-04")).toBe("Nov 3, 2026"); // why calendarDate exists
  });
});

describe("isFormatLocale", () => {
  it("accepts only the offered formats", () => {
    expect(isFormatLocale("en-ID")).toBe(true);
    expect(isFormatLocale("id-ID")).toBe(false);
    expect(isFormatLocale(undefined)).toBe(false);
  });
});
