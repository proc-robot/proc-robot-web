/**
 * Specification documents (D1, D3): the files the app accepts and how an
 * item's source is described. Pure, so it is unit tested and shared by the
 * pages and Client Components.
 */

export const DOCUMENT_TYPES = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  pdf: "application/pdf",
} as const;
export type DocumentType = keyof typeof DOCUMENT_TYPES;

/** The `spec-files` bucket's limit. */
export const MAX_DOCUMENT_BYTES = 30 * 1024 * 1024;

export const ACCEPT_DOCUMENTS = Object.keys(DOCUMENT_TYPES)
  .map((type) => `.${type}`)
  .join(",");

/** "BOQ Tower.XLSX" → "xlsx"; null for anything the app does not read. */
export function documentType(fileName: string): DocumentType | null {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return extension in DOCUMENT_TYPES && fileName.includes(".") ? (extension as DocumentType) : null;
}

/** Why a file can't be uploaded, or null when it can. */
export function uploadProblem(file: { name: string; size: number }): string | null {
  if (!documentType(file.name))
    return `${file.name}: upload an Excel (.xlsx, .xls), CSV or PDF file.`;
  if (file.size === 0) return `${file.name} is empty.`;
  if (file.size > MAX_DOCUMENT_BYTES) return `${file.name} is larger than 30 MB.`;
  return null;
}

/** "1.2 MB", "820 KB". */
export function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export type SourceRef = {
  file?: string;
  sheet?: string;
  row?: number;
  last_row?: number;
  cells?: string;
  page?: number;
};

/** Where an extracted item came from: "Sheet BOQ · row 12", "Rows 12–14", "Page 3" (D3). */
export function describeSource(ref: SourceRef): string {
  if (ref.page) return `Page ${ref.page}`;
  const rows = ref.row
    ? ref.last_row && ref.last_row > ref.row
      ? `rows ${ref.row}–${ref.last_row}`
      : `row ${ref.row}`
    : null;
  if (ref.sheet && rows) return `${ref.sheet} · ${rows}`;
  if (rows) return rows.charAt(0).toUpperCase() + rows.slice(1);
  return ref.sheet ?? "—";
}

export const DOCUMENT_STATUS_LABELS = {
  uploaded: "Counting pages",
  ready: "Ready to read",
  extracting: "Reading",
  extracted: "Read",
  failed: "Failed",
} as const;
export type DocumentStatus = keyof typeof DOCUMENT_STATUS_LABELS;
