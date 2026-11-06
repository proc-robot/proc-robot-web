import { Lock } from "lucide-react";

/** Members see the organization's settings but cannot change them (CORE_FEATURES.md §17). */
export function ReadOnlyNotice() {
  return (
    <p className="flex items-center gap-2 rounded-[10px] bg-pr-neutral-chip px-3 py-2 text-sm text-pr-text-secondary">
      <Lock className="size-4 shrink-0" aria-hidden />
      Only the Owner and Admins can change these settings.
    </p>
  );
}
