import { describe, expect, it } from "vitest";
import { googleSignInEnabled } from "./features";

describe("googleSignInEnabled", () => {
  it("is off by default", () => {
    expect(googleSignInEnabled({} as NodeJS.ProcessEnv)).toBe(false);
  });

  it('is on only for exactly "true"', () => {
    const env = (value: string) => ({ GOOGLE_SIGN_IN: value }) as unknown as NodeJS.ProcessEnv;
    expect(googleSignInEnabled(env("true"))).toBe(true);
    for (const value of ["", "false", "1", "TRUE", "yes", " true"]) {
      expect(googleSignInEnabled(env(value)), JSON.stringify(value)).toBe(false);
    }
  });
});
