import { describe, expect, it } from "vitest";
import { initials } from "./initials";

describe("initials", () => {
  it("takes the first letters of the first two words", () => {
    expect(initials("Ratna Sari")).toBe("RS");
    expect(initials("Kigen Pte. Ltd.")).toBe("KP");
  });

  it("ignores the domain of an email", () => {
    expect(initials("leo@kigen.test")).toBe("L");
    expect(initials("leo.tan@kigen.test")).toBe("LT");
  });

  it("never returns an empty string", () => {
    expect(initials("")).toBe("?");
  });
});
