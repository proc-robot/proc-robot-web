import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import type { ActionFailure } from "./action-result";

/**
 * Shows a failed Server Action on a React Hook Form form: the message as a
 * toast, and each field error under its field (focusing the first one).
 *
 * The toast always fires, even with field errors. A field error can point at
 * a field the form doesn't render, and the user must still see that the save
 * failed.
 */
export function applyActionErrors<T extends FieldValues>(
  form: Pick<UseFormReturn<T>, "setError">,
  result: ActionFailure,
): void {
  Object.entries(result.fieldErrors ?? {}).forEach(([name, message], index) => {
    form.setError(name as Path<T>, { type: "server", message }, { shouldFocus: index === 0 });
  });
  toast.error(result.error);
}
