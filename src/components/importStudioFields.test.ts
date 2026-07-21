import { describe, expect, it } from "vitest";
import {
  normalizeWholeNumberDraft,
  parseWholeNumberDraft,
} from "./importStudioFields";

describe("Import Studio numeric fields", () => {
  it("keeps an empty draft available while the user replaces a value", () => {
    expect(parseWholeNumberDraft("", 1, 1024)).toBeNull();
    expect(normalizeWholeNumberDraft("", 4, 1, 1024)).toBe(4);
  });

  it("accepts a newly typed whole number without prefixing the previous value", () => {
    expect(parseWholeNumberDraft("4", 1, 1024)).toBe(4);
    expect(normalizeWholeNumberDraft("4", 1, 1, 1024)).toBe(4);
  });

  it("normalizes out-of-range and fractional values only when editing ends", () => {
    expect(parseWholeNumberDraft("2048", 1, 1024)).toBeNull();
    expect(normalizeWholeNumberDraft("2048", 4, 1, 1024)).toBe(1024);
    expect(normalizeWholeNumberDraft("3.6", 4, 1, 1024)).toBe(4);
  });
});
