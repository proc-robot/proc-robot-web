"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteMember } from "@/app/(app)/settings/actions";
import { inviteSchema, type InviteValues } from "@/app/(app)/settings/schema";
import { applyActionErrors } from "@/lib/forms/apply-action-errors";

/**
 * Invite by email with a role (O3). No email is sent yet (that is T1.11.2):
 * the person signs in with this address and finds the invite waiting.
 */
export function InviteForm({ disabled }: { disabled: boolean }) {
  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "member" },
  });

  async function onSubmit(values: InviteValues) {
    const result = await inviteMember(values);
    if (!result.ok) return applyActionErrors(form, result);
    toast.success(`Invite added for ${values.email.trim().toLowerCase()}.`, {
      description: "Ask them to sign in with that email address; the invite is waiting there.",
    });
    form.reset({ email: "", role: values.role });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <fieldset disabled={disabled} className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="flex-1">
              <FieldLabel htmlFor="invite-email">Email address</FieldLabel>
              <Input
                {...field}
                id="invite-email"
                type="email"
                autoComplete="off"
                placeholder="colleague@example.com"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="role"
          control={form.control}
          render={({ field }) => (
            <Field className="sm:w-40">
              <FieldLabel htmlFor="invite-role">Role</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        />
        <Button type="submit" className="sm:mt-[22px]" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Inviting…" : "Invite"}
        </Button>
      </fieldset>
    </form>
  );
}
