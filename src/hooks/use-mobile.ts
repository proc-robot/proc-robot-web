import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * Whether the viewport is below the `md` breakpoint.
 *
 * Reads the media query through `useSyncExternalStore` rather than the
 * generated shadcn version's `setState` inside an effect, which the React
 * Compiler lint rejects. The server snapshot is `false` (desktop first), same
 * as the original's initial render.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
