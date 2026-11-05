import { z } from "zod";
import { COUNTRY_CODES } from "@/lib/countries";

/** "What do you mainly create?" (A3) → profiles.home_view. */
export const HOME_VIEWS = ["quotations", "rfqs", "both"] as const;
export type HomeView = (typeof HOME_VIEWS)[number];

export const organizationFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your organization's name.")
    .max(120, "Keep the name under 120 characters."),
  country: z.string().refine((value) => COUNTRY_CODES.includes(value), "Choose a country."),
  currency: z.string().regex(/^[A-Z]{3}$/, "Choose a currency."),
});
export type OrganizationFormValues = z.input<typeof organizationFormSchema>;

export const createOrganizationSchema = organizationFormSchema.extend({
  homeView: z.enum(HOME_VIEWS),
});

export const joinOrganizationSchema = z.object({
  inviteId: z.uuid(),
  homeView: z.enum(HOME_VIEWS),
});
