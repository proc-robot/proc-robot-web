"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ToastData = { type: "success" | "error"; message: string } | null;

export function Toast({ toast, onDone }: { toast: ToastData; onDone: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) return;
    // Deferred a frame so the mount commits with `visible` still false first —
    // required for the CSS transition below to actually animate the entrance.
    const raf = requestAnimationFrame(() => setVisible(true));
    const hide = setTimeout(() => setVisible(false), 3000);
    const done = setTimeout(() => onDone(), 3300);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(hide);
      clearTimeout(done);
    };
  }, [toast, onDone]);

  if (!toast) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg px-5 py-3 text-sm font-medium shadow-lg transition-all duration-300",
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        toast.type === "success" && "bg-emerald-600 text-white",
        toast.type === "error" && "bg-red-600 text-white",
      )}
    >
      {toast.type === "success" ? (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {toast.message}
    </div>
  );
}
