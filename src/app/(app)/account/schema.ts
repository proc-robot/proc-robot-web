import { z } from "zod";
import { HOME_VIEWS } from "@/app/(auth)/onboarding/schema";
import { FORMAT_LOCALES, isTimeZone } from "@/lib/format";

/** The display-currency choice that means "my organization's currency". */
export const ORG_CURRENCY = "org";

/** The profile form (A4). Shared by the form and the action. */
export const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name.").max(120, "Keep it under 120 characters."),
  formatLocale: z.enum(FORMAT_LOCALES),
  timeZone: z.string().refine(isTimeZone, "Choose a time zone."),
  displayCurrency: z
    .string()
    .refine((value) => value === ORG_CURRENCY || /^[A-Z]{3}$/.test(value), "Choose a currency."),
  homeView: z.enum(HOME_VIEWS),
});
export type ProfileValues = z.input<typeof profileSchema>;

/** A path the user may set as their avatar: a file in their own folder. */
export const avatarPathSchema = (userId: string) =>
  z.string().regex(new RegExp(`^${userId}/[A-Za-z0-9._-]{1,80}$`), "That file can't be used.");
