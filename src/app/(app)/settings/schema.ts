import { z } from "zod";
import { organizationFormSchema } from "@/app/(auth)/onboarding/schema";
import { isNumberFormat } from "@/lib/numbering";

/** General: the organization's own details (O1, O5). */
export const organizationProfileSchema = organizationFormSchema.extend({
  address: z.string().trim().max(500, "Keep the address under 500 characters."),
  taxId: z.string().trim().max(50, "Keep the tax ID under 50 characters."),
});
export type OrganizationProfileValues = z.input<typeof organizationProfileSchema>;

const E164 = /^\+[1-9][0-9]{6,14}$/;
/** "+65 9123-4567" → "+6591234567", as the database stores it. */
export const normalizePhone = (value: string) => value.replace(/[\s()-]/g, "");

/** Public supplier profile (O2), shown to other organizations from P3. */
export const publicProfileSchema = z.object({
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.email().safeParse(value).success,
      "Enter a valid email address.",
    ),
  whatsapp: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || E164.test(normalizePhone(value)),
      "Enter the number with its country code, e.g. +65 9123 4567.",
    ),
  website: z
    .string()
    .trim()
    .max(200, "Keep the address under 200 characters.")
    .refine(
      (value) => value === "" || /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(value),
      "Enter the full address, starting with https://.",
    ),
  description: z.string().trim().max(1000, "Keep the description under 1,000 characters."),
  categories: z.array(z.string()).max(30, "Choose at most 30 categories."),
});
export type PublicProfileValues = z.input<typeof publicProfileSchema>;

/** A decimal typed into a text box: empty, or a number in range. */
const decimal = (min: number, max: number, message: string, maxExclusive = false) =>
  z
    .string()
    .trim()
    .refine((value) => {
      if (value === "") return true;
      if (!/^\d+(\.\d+)?$/.test(value)) return false;
      const number = Number(value);
      return number >= min && (maxExclusive ? number < max : number <= max);
    }, message);

const numberFormat = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || isNumberFormat(value),
    "Use letters, numbers, - _ . / and the codes {YYYY}, {YY}, {MM}; include a counter such as {NNNN}.",
  );

export const ROUNDING_MODES = ["none", "nearest", "up", "down"] as const;

/** Pricing & documents (O5). Text inputs; the action turns them into `settings`. */
export const organizationSettingsSchema = z
  .object({
    taxLabel: z.string().trim().max(20, "Keep the tax name to 20 characters."),
    taxRate: decimal(0, 100, "Enter a tax rate from 0 to 100."),
    defaultMarkupPct: decimal(0, 1000, "Enter a markup from 0 to 1000."),
    minimumMarginPct: decimal(0, 100, "Enter a margin from 0 to below 100.", true),
    quoteNumbering: numberFormat,
    rfqNumbering: numberFormat,
    roundingMode: z.enum(ROUNDING_MODES),
    roundingIncrement: decimal(0, 1_000_000, "Enter a rounding step above 0."),
    emailSignature: z.string().max(2000, "Keep the signature under 2,000 characters."),
  })
  .superRefine((values, context) => {
    if (values.roundingMode !== "none" && !(Number(values.roundingIncrement) > 0)) {
      context.addIssue({
        code: "custom",
        path: ["roundingIncrement"],
        message: "Enter a rounding step above 0.",
      });
    }
  });
export type OrganizationSettingsValues = z.input<typeof organizationSettingsSchema>;

type Settings = Record<string, unknown>;
const MANAGED_KEYS = [
  "tax_label",
  "tax_rate",
  "default_markup_pct",
  "minimum_margin_pct",
  "numbering",
  "rounding",
  "email_signature",
];

/**
 * The form's values as the `settings` jsonb, over the existing settings: the
 * keys this form manages are replaced (empty fields removed), any others are
 * kept.
 */
export function toSettings(values: OrganizationSettingsValues, existing: Settings): Settings {
  const settings: Settings = Object.fromEntries(
    Object.entries(existing).filter(([key]) => !MANAGED_KEYS.includes(key)),
  );
  const text = (value: string | undefined) => value?.trim() ?? "";
  if (text(values.taxLabel)) settings.tax_label = text(values.taxLabel);
  if (text(values.taxRate)) settings.tax_rate = Number(values.taxRate);
  if (text(values.defaultMarkupPct)) settings.default_markup_pct = Number(values.defaultMarkupPct);
  if (text(values.minimumMarginPct)) settings.minimum_margin_pct = Number(values.minimumMarginPct);

  const numbering: Settings = {};
  if (text(values.quoteNumbering)) numbering.sales_quote = text(values.quoteNumbering);
  if (text(values.rfqNumbering)) numbering.rfq = text(values.rfqNumbering);
  if (Object.keys(numbering).length > 0) settings.numbering = numbering;

  if (values.roundingMode !== "none") {
    settings.rounding = { mode: values.roundingMode, increment: Number(values.roundingIncrement) };
  }
  if (values.emailSignature?.trim()) settings.email_signature = values.emailSignature.trim();
  return settings;
}

/** The stored `settings` as form values (missing keys become empty fields). */
export function fromSettings(settings: Settings): OrganizationSettingsValues {
  const get = (key: string) => settings[key];
  const asText = (value: unknown) =>
    typeof value === "number" || typeof value === "string" ? String(value) : "";
  const numbering = (get("numbering") ?? {}) as Settings;
  const rounding = (get("rounding") ?? {}) as Settings;
  const mode = ROUNDING_MODES.find((option) => option === rounding.mode) ?? "none";
  return {
    taxLabel: asText(get("tax_label")),
    taxRate: asText(get("tax_rate")),
    defaultMarkupPct: asText(get("default_markup_pct")),
    minimumMarginPct: asText(get("minimum_margin_pct")),
    quoteNumbering: asText(numbering.sales_quote),
    rfqNumbering: asText(numbering.rfq),
    roundingMode: mode,
    roundingIncrement: mode === "none" ? "" : asText(rounding.increment),
    emailSignature: asText(get("email_signature")),
  };
}

/** Database field → settings form field, for `invalid_field` errors. */
export const SETTINGS_FIELDS: Record<string, string> = {
  "settings.tax_label": "taxLabel",
  "settings.tax_rate": "taxRate",
  "settings.default_markup_pct": "defaultMarkupPct",
  "settings.minimum_margin_pct": "minimumMarginPct",
  "settings.numbering.sales_quote": "quoteNumbering",
  "settings.numbering.rfq": "rfqNumbering",
  "settings.rounding": "roundingMode",
  "settings.rounding.increment": "roundingIncrement",
  "settings.email_signature": "emailSignature",
};

/** Invite form (O3). Owner is never invited: ownership is transferred. */
export const INVITE_ROLES = ["member", "admin"] as const;
export const inviteSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  role: z.enum(INVITE_ROLES),
});
export type InviteValues = z.input<typeof inviteSchema>;
