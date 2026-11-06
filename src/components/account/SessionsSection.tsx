"use client";

import { useTransition } from "react";
import { LogOut, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signOut, signOutEverywhere, signOutOtherDevices } from "@/lib/auth/actions";

/** Sessions (A5): sign out here, on every other device, or everywhere. */
export function SessionsSection() {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <p className="text-sm text-pr-text-secondary">
        Lost a laptop or used a shared computer? Sign out of your other devices. They are signed out
        within the hour, when their current session expires.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await signOutOtherDevices();
              if (result.ok) toast.success("Your other devices are being signed out.");
              else toast.error(result.error);
            })
          }
        >
          <MonitorSmartphone aria-hidden />
          Sign out of other devices
        </Button>
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => startTransition(() => signOutEverywhere())}
        >
          <LogOut aria-hidden />
          Sign out everywhere
        </Button>
        <Button
          variant="ghost"
          disabled={isPending}
          onClick={() => startTransition(() => signOut())}
        >
          Sign out of this device
        </Button>
      </div>
    </div>
  );
}
