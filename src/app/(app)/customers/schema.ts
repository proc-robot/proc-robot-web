import { z } from "zod";
import type { TablesInsert } from "@/lib/supabase/database.types";

/** "+65 6123-4567", "(021) 555 1234": the characters the database accepts, with at least 5 digits. */
export const isPhone = (value: string) =>
  /^[0-9+() ./-]{1,40}$/.test(value) && value.replace(/\D/g, "").length >= 5;

/** A customer (Q1). The database trims and re-checks every field. */
export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter the customer's name.")
    .max(200, "Keep the name under 200 characters."),
  contactName: z.string().trim().max(120, "Keep the contact's name under 120 characters."),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.email().safeParse(value).success,
      "Enter a valid email address.",
    ),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || isPhone(value),
      "Enter the number with digits, spaces and + ( ) - . / only.",
    ),
  address: z.string().trim().max(500, "Keep the address under 500 characters."),
  taxId: z.string().trim().max(50, "Keep the tax ID under 50 characters."),
  notes: z.string().trim().max(2000, "Keep the notes under 2,000 characters."),
});
export type CustomerValues = z.input<typeof customerSchema>;

export const EMPTY_CUSTOMER: CustomerValues = {
  name: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  taxId: "",
  notes: "",
};

export function toCustomerRow(values: z.output<typeof customerSchema>) {
  return {
    name: values.name,
    contact_name: values.contactName,
    email: values.email,
    phone: values.phone,
    address: values.address,
    tax_id: values.taxId,
    notes: values.notes,
  } satisfies TablesInsert<"customers">;
}

/** Database field → form field, for `invalid_field` errors. */
export const CUSTOMER_FIELDS: Record<string, string> = {
  name: "name",
  contact_name: "contactName",
  email: "email",
  phone: "phone",
  address: "address",
  tax_id: "taxId",
  notes: "notes",
};

export const DUPLICATE_CUSTOMER = "A customer with this name already exists.";
