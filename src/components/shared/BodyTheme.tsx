"use client";

import { useEffect } from "react";

/**
 * Mirrors a section's theme scope onto `<body data-theme>` while the section
 * is mounted.
 *
 * Radix portals (dialogs, dropdowns, popovers, the mobile sidebar sheet)
 * render directly under `<body>`, outside the layout's `.theme-brand` wrapper,
 * so without this they would fall back to the zinc admin tokens. See the
 * `.theme-brand, body[data-theme="brand"]` block in globals.css.
 */
export function BodyTheme({ theme }: { theme: "brand" }) {
  useEffect(() => {
    document.body.dataset.theme = theme;
    return () => {
      delete document.body.dataset.theme;
    };
  }, [theme]);

  return null;
}
