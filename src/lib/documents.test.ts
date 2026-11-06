import { describe, expect, it } from "vitest";
import { describeSource, documentType, fileSize, uploadProblem } from "./documents";

describe("documents", () => {
  it("accepts Excel, CSV and PDF files by their extension", () => {
    expect(documentType("BOQ Tower.XLSX")).toBe("xlsx");
    expect(documentType("rab.xls")).toBe("xls");
    expect(documentType("items.csv")).toBe("csv");
    expect(documentType("specs.pdf")).toBe("pdf");
    expect(documentType("macro.xlsm")).toBeNull();
    expect(documentType("pdf")).toBeNull();
  });

  it("explains why a file can't be uploaded", () => {
    expect(uploadProblem({ name: "boq.xlsx", size: 2048 })).toBeNull();
    expect(uploadProblem({ name: "notes.docx", size: 2048 })).toMatch(/Excel/);
    expect(uploadProblem({ name: "boq.xlsx", size: 0 })).toBe("boq.xlsx is empty.");
    expect(uploadProblem({ name: "scan.pdf", size: 31 * 1024 * 1024 })).toBe(
      "scan.pdf is larger than 30 MB.",
    );
  });

  it("shows file sizes", () => {
    expect(fileSize(2048)).toBe("2 KB");
    expect(fileSize(100)).toBe("1 KB");
    expect(fileSize(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });

  it("describes where an item came from", () => {
    expect(describeSource({ file: "boq.xlsx", sheet: "BOQ", row: 12 })).toBe("BOQ · row 12");
    expect(describeSource({ sheet: "BOQ", row: 12, last_row: 14 })).toBe("BOQ · rows 12–14");
    expect(describeSource({ row: 7 })).toBe("Row 7");
    expect(describeSource({ file: "specs.pdf", page: 3 })).toBe("Page 3");
    expect(describeSource({})).toBe("—");
  });
});
