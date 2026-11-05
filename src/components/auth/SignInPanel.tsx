"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { sendMagicLink, signInWithGoogle } from "@/lib/auth/actions";
import { magicLinkSchema, type MagicLinkInput } from "@/lib/auth/schemas";
import { applyActionErrors } from "@/lib/forms/apply-action-errors";
import { GoogleIcon } from "./GoogleIcon";

/**
 * Sign-in (A2 email link; A1 Google when `googleEnabled`). One screen for new
 * and returning users: the first sign-in creates the account, and onboarding
 * follows. Google stays hidden until Phase 4 (src/lib/auth/features.ts).
 */
export function SignInPanel({
  next,
  error,
  googleEnabled,
}: {
  next: string;
  error?: string;
  googleEnabled: boolean;
}) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isGooglePending, startGoogle] = useTransition();
  const form = useForm<MagicLinkInput>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: "" },
  });

  function continueWithGoogle() {
    startGoogle(async () => {
      // On success the action redirects to Google; it only returns on failure.
      const result = await signInWithGoogle(next);
      if (!result.ok) toast.error(result.error);
    });
  }

  async function onSubmit(values: MagicLinkInput) {
    const result = await sendMagicLink(values);
    if (!result.ok) return applyActionErrors(form, result);
    setSentTo(values.email.trim().toLowerCase());
  }

  if (sentTo) {
    return (
      <section className="w-full max-w-sm space-y-5 text-center" aria-live="polite">
        <MailCheck className="mx-auto size-10 text-pr-accent" aria-hidden />
        <h1 className="font-newsreader text-[32px] leading-tight font-normal">Check your email</h1>
        <p className="text-[15px] text-pr-text-secondary">
          We sent a sign-in link to <strong className="text-pr-ink">{sentTo}</strong>. It works once
          and expires in one hour.
        </p>
        <Button variant="link" onClick={() => setSentTo(null)}>
          Use a different email
        </Button>
      </section>
    );
  }

  return (
    <section className="w-full max-w-sm space-y-8">
      <div className="space-y-2">
        <h1 className="font-newsreader text-[32px] leading-tight font-normal">
          Sign in to Proc-Robot
        </h1>
        <p className="text-[15px] text-pr-text-secondary">
          New here? Signing in creates your account.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-[8px] bg-pr-destructive-tint px-3 py-2 text-sm text-pr-destructive"
        >
          {error}
        </p>
      )}

      {googleEnabled && (
        <>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full bg-white"
            onClick={continueWithGoogle}
            disabled={isGooglePending}
          >
            <GoogleIcon />
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 text-xs text-pr-text-tertiary" aria-hidden>
            <span className="h-px flex-1 bg-pr-border-card" />
            or
            <span className="h-px flex-1 bg-pr-border-card" />
          </div>
        </>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="sign-in-email">Work email</FieldLabel>
                <Input
                  {...field}
                  id="sign-in-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  aria-invalid={fieldState.invalid}
                  className="bg-white"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Sending…" : "Email me a sign-in link"}
          </Button>
        </FieldGroup>
      </form>
    </section>
  );
}
