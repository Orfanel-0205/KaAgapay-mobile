/// <reference types="jest" />
// Jest globals for this file only: tsconfig limits ambient types to
// NativeWind, and app code should not see describe/expect.
// __tests__/philhealthMask.test.ts
//
// A PhilHealth number is shown masked wherever the app displays one after an
// ID upload. If the masking slips, the screen shows a government health
// identifier in full -- on a phone that may be shared, in a screenshot sent to
// a relative, in a photo of the screen taken at the RHU desk.
//
// Nothing else would catch that. The screen still renders, the number still
// looks like a number, and no test or type check knows it was meant to be
// hidden.

// The masker lives beside the upload call, which imports the API client. The
// client is not under test and needs a configured backend, so it is replaced.
jest.mock("../services/api/client", () => ({ __esModule: true, default: {} }));

import { maskPhilHealth } from "../services/api/ocr";

describe("maskPhilHealth", () => {
  it("shows only the last four digits of a full PhilHealth number", () => {
    expect(maskPhilHealth("12-345678901-2")).toBe("****-****-9012");
  });

  it("never reveals the leading digits, whatever the formatting", () => {
    for (const input of ["123456789012", "12 345678901 2", "12-3456-7890-12"]) {
      const masked = maskPhilHealth(input);

      expect(masked).not.toContain("1234");
      expect(masked).not.toContain("5678");
      expect(masked.startsWith("****-****-")).toBe(true);
    }
  });

  it("gives the same shape for a short number, so its length is not leaked", () => {
    // A masked short value must look like any other masked value; padding
    // with stars rather than shortening the output keeps the length private.
    expect(maskPhilHealth("12")).toBe("****-****-**12");
    expect(maskPhilHealth("12").length).toBe(maskPhilHealth("123456789012").length);
  });

  it("returns nothing for nothing, rather than a mask of an empty number", () => {
    expect(maskPhilHealth("")).toBe("");
    expect(maskPhilHealth(null)).toBe("");
    expect(maskPhilHealth(undefined)).toBe("");
    expect(maskPhilHealth("PHIC")).toBe("");
  });
});
