import { describe, expect, it } from "vitest";
import {
  COUNTRY_CODES,
  CURRENCY_CODES,
  countryOptions,
  currencyOptions,
  defaultCurrency,
} from "./countries";

describe("countries", () => {
  it("lists every ISO 3166-1 alpha-2 code once", () => {
    expect(COUNTRY_CODES).toHaveLength(249);
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length);
    for (const code of COUNTRY_CODES) expect(code).toMatch(/^[A-Z]{2}$/);
  });

  it("has an English name for every code, sorted by name", () => {
    const options = countryOptions();
    expect(options.find((o) => o.value === "ID")?.label).toBe("Indonesia");
    expect(options.every((o) => o.label !== o.value)).toBe(true);
    const labels = options.map((o) => o.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, "en")));
  });

  it("defaults the currency from the country", () => {
    expect(defaultCurrency("SG")).toBe("SGD");
    expect(defaultCurrency("ID")).toBe("IDR");
    expect(defaultCurrency("DE")).toBe("EUR");
    expect(defaultCurrency("KE")).toBe("USD");
  });

  it("offers only real ISO 4217 currencies, each with a name", () => {
    const supported = new Set(Intl.supportedValuesOf("currency"));
    for (const code of CURRENCY_CODES) expect(supported.has(code), code).toBe(true);
    expect(currencyOptions().find((o) => o.value === "IDR")?.label).toBe("IDR — Indonesian Rupiah");
  });
});
