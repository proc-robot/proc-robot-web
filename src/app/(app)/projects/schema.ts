import { z } from "zod";
import { COUNTRY_CODES } from "@/lib/countries";
import { isUuid } from "@/lib/projects";

/** "2026-12-01", a real day between 2000 and 2100 (what the database accepts). */
export function isDeadline(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().startsWith(value) &&
    value >= "2000-01-01" &&
    value <= "2100-12-31"
  );
}

/** A project (W1). The database trims and re-checks every field. */
export const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter the project's name.")
    .max(200, "Keep the name under 200 characters."),
  customerId: z
    .string()
    .refine((value) => value === "" || isUuid(value), "Choose a customer from the list."),
  referenceNo: z.string().trim().max(100, "Keep the reference under 100 characters."),
  deadline: z
    .string()
    .trim()
    .refine((value) => value === "" || isDeadline(value), "Enter a valid date."),
  deliveryCountry: z
    .string()
    .refine((value) => COUNTRY_CODES.includes(value), "Choose the delivery country."),
  deliveryCity: z.string().trim().max(100, "Keep the city under 100 characters."),
  notes: z.string().trim().max(2000, "Keep the notes under 2,000 characters."),
});
export type ProjectValues = z.input<typeof projectSchema>;

export function toProjectRow(values: z.output<typeof projectSchema>) {
  return {
    name: values.name,
    customer_id: values.customerId || null,
    reference_no: values.referenceNo,
    deadline: values.deadline || null,
    delivery_country: values.deliveryCountry,
    delivery_city: values.deliveryCity,
    notes: values.notes,
  };
}

/** Database field → form field, for `invalid_field` errors. */
export const PROJECT_FIELDS: Record<string, string> = {
  name: "name",
  customer_id: "customerId",
  reference_no: "referenceNo",
  deadline: "deadline",
  delivery_country: "deliveryCountry",
  delivery_city: "deliveryCity",
  notes: "notes",
};
