import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { actionError, actionOk, invalidInput, zodFieldErrors } from "./action-result";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
const { toast } = await import("sonner");
const { applyActionErrors } = await import("./apply-action-errors");

const schema = z
  .object({
    name: z
      .string()
      .min(3, "Name is too short")
      .regex(/^[A-Z]/, "Start with a capital"),
    items: z.array(z.object({ quantity: z.number().positive("Must be more than 0") })),
    validFrom: z.string(),
    validUntil: z.string(),
  })
  .refine((value) => value.validUntil >= value.validFrom, "Validity ends before it starts");

describe("action results", () => {
  it("builds success and failure values", () => {
    expect(actionOk()).toEqual({ ok: true, data: undefined });
    expect(actionOk({ id: "p1" })).toEqual({ ok: true, data: { id: "p1" } });
    expect(actionError("Nope")).toEqual({ ok: false, error: "Nope" });
    expect(actionError("Nope", {})).toEqual({ ok: false, error: "Nope" });
  });

  it("maps Zod issues to dot paths, first message per field", () => {
    const result = schema.safeParse({
      name: "ab",
      items: [{ quantity: 1 }, { quantity: 0 }],
      validFrom: "2026-11-04",
      validUntil: "2026-12-01",
    });
    expect(result.success).toBe(false);
    expect(zodFieldErrors(result.error!)).toEqual({
      name: "Name is too short",
      "items.1.quantity": "Must be more than 0",
    });
  });

  it("uses an object-level issue as the message", () => {
    const result = schema.safeParse({
      name: "Abc",
      items: [],
      validFrom: "2026-12-01",
      validUntil: "2026-11-04",
    });
    expect(invalidInput(result.error!)).toEqual({
      ok: false,
      error: "Validity ends before it starts",
    });
  });

  it("falls back to the given message", () => {
    const result = schema.safeParse({ name: "", items: [], validFrom: "a", validUntil: "b" });
    const failure = invalidInput(result.error!, "Periksa kembali kolom yang ditandai.");
    expect(failure.error).toBe("Periksa kembali kolom yang ditandai.");
    expect(failure.fieldErrors).toHaveProperty("name");
  });
});

describe("applyActionErrors", () => {
  it("sets each field error, focuses the first, and always toasts", () => {
    const setError = vi.fn();
    applyActionErrors(
      { setError },
      {
        ok: false,
        error: "Check the fields",
        fieldErrors: { name: "Taken", "items.0.quantity": "Too many" },
      },
    );
    expect(setError).toHaveBeenNthCalledWith(
      1,
      "name",
      { type: "server", message: "Taken" },
      { shouldFocus: true },
    );
    expect(setError).toHaveBeenNthCalledWith(
      2,
      "items.0.quantity",
      { type: "server", message: "Too many" },
      { shouldFocus: false },
    );
    expect(toast.error).toHaveBeenCalledWith("Check the fields");
  });
});
