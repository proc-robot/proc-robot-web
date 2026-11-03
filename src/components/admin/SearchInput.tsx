"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

function SearchInputInner({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") ?? "";
  const [value, setValue] = useState(q);
  // Tracks the `q` this render's `value` was last synced against, so an
  // external URL change (back/forward nav, a link elsewhere clearing the
  // filter) can reset `value` by adjusting state during render instead of via
  // an effect — React's recommended alternative to a sync-on-prop-change
  // effect, and the only form of this reset that isn't flagged as a
  // synchronous setState-in-effect.
  const [syncedQ, setSyncedQ] = useState(q);
  if (q !== syncedQ) {
    setSyncedQ(q);
    setValue(q);
  }
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const v = value.trim();
    if (v.length >= 3) {
      timer.current = setTimeout(() => {
        router.push(`?q=${encodeURIComponent(v)}`);
      }, 300);
    } else if (v.length === 0) {
      timer.current = setTimeout(() => {
        router.push("?");
      }, 300);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, router]);

  function clear() {
    setValue("");
    router.push("?");
  }

  return (
    <div className="relative mb-6">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        minLength={3}
        className="bg-white pr-9 pl-9"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function SearchInput(props: { placeholder: string }) {
  return (
    <Suspense fallback={<div className="mb-6 h-9" />}>
      <SearchInputInner {...props} />
    </Suspense>
  );
}
