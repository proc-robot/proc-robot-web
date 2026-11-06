/**
 * Countries and currencies for organization forms. Names come from Intl, in
 * English (the UI language). Build the option lists on the server and pass
 * them to Client Components: browsers ship different country names than
 * Node, which would make server and client HTML disagree.
 */

// ISO 3166-1 alpha-2.
export const COUNTRY_CODES = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR " +
  "BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ " +
  "EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW " +
  "GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY " +
  "KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV " +
  "MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY " +
  "QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG " +
  "TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" ");

const EURO = "AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK".split(" ");

/** The usual currency per country, as the default on the org form; USD otherwise. */
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  SG: "SGD",
  ID: "IDR",
  MY: "MYR",
  TH: "THB",
  PH: "PHP",
  VN: "VND",
  BN: "BND",
  KH: "KHR",
  MM: "MMK",
  LA: "LAK",
  US: "USD",
  GB: "GBP",
  AU: "AUD",
  NZ: "NZD",
  JP: "JPY",
  CN: "CNY",
  HK: "HKD",
  TW: "TWD",
  KR: "KRW",
  IN: "INR",
  PK: "PKR",
  BD: "BDT",
  LK: "LKR",
  AE: "AED",
  SA: "SAR",
  QA: "QAR",
  KW: "KWD",
  OM: "OMR",
  BH: "BHD",
  CA: "CAD",
  CH: "CHF",
  NO: "NOK",
  SE: "SEK",
  DK: "DKK",
  PL: "PLN",
  CZ: "CZK",
  HU: "HUF",
  TR: "TRY",
  ZA: "ZAR",
  BR: "BRL",
  MX: "MXN",
  ...Object.fromEntries(EURO.map((code) => [code, "EUR"])),
};

export const CURRENCY_CODES = [...new Set(["USD", ...Object.values(CURRENCY_BY_COUNTRY)])].sort();

export function defaultCurrency(country: string): string {
  return CURRENCY_BY_COUNTRY[country] ?? "USD";
}

export type Option = { value: string; label: string };

/** "ID" → "Indonesia" (English); the code itself if unknown. */
export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** "Jakarta, Indonesia"; just "Singapore" when the city is the country. */
export function placeName(city: string | null, countryCode: string): string {
  const country = countryName(countryCode);
  if (!city || city.trim().toLowerCase() === country.toLowerCase()) return country;
  return `${city}, ${country}`;
}

export function countryOptions(): Option[] {
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  return COUNTRY_CODES.map((code) => ({ value: code, label: names.of(code) ?? code })).sort(
    (a, b) => a.label.localeCompare(b.label, "en"),
  );
}

export function currencyOptions(): Option[] {
  const names = new Intl.DisplayNames(["en"], { type: "currency" });
  return CURRENCY_CODES.map((code) => ({
    value: code,
    label: `${code} — ${names.of(code) ?? code}`,
  }));
}
