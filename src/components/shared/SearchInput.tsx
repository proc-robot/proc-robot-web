"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MIN_LENGTH = 2;

type Props = {
  placeholder: string;
  /** The accessible name, e.g. "Search projects". */
  label: string;
  className?: string;
};

/**
 * A list page's search box. It writes `?q=` as you type (debounced 300 ms,
 * from 2 characters), keeps the page's other filters and goes back to page 1.
 * The page reads `q` from `searchParams`.
 */
function SearchInputInner({ placeholder, label, className }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = searchParams.get("q") ?? "";
  const [value, setValue] = useState(q);
  // The `q` that `value` was last synced with, so an outside URL change
  // (back/forward, a "Clear filters" link) resets the box. Adjusting state
  // during render is React's alternative to a sync-on-prop-change effect.
  const [syncedQ, setSyncedQ] = useState(q);
  if (q !== syncedQ) {
    setSyncedQ(q);
    setValue(q);
  }
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const term = value.trim();
    if (term === q || (term.length > 0 && term.length < MIN_LENGTH)) return;
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (term) params.set("q", term);
      else params.delete("q");
      params.delete("page");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }, 300);
    return () => clearTimeout(timer.current);
  }, [value, q, searchParams, pathname, router]);

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="bg-white pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

export function SearchInput(props: Props) {
  return (
    <Suspense fallback={<div className={cn("h-9", props.className)} />}>
      <SearchInputInner {...props} />
    </Suspense>
  );
}
