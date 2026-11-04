import { z } from "zod";

/** Shared by the sign-in form (instant feedback) and sendMagicLink (the real check). */
export const magicLinkSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
});
export type MagicLinkInput = z.input<typeof magicLinkSchema>;
