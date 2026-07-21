import { describe, expect, it } from "vitest";
import { parseScreenPickResult } from "./screenPicker";

describe("screen picker result validation", () => {
  it("normalizes a valid native result while preserving virtual coordinates", () => {
    expect(parseScreenPickResult({
      color: "#42C8E3",
      role: "foreground",
      x: -1280,
      y: 240,
    })).toEqual({
      color: "#42c8e3",
      role: "foreground",
      x: -1280,
      y: 240,
    });
  });

  it("preserves the background color role", () => {
    expect(parseScreenPickResult({
      color: "#120810",
      role: "background",
      x: 965,
      y: -380,
    })).toEqual({
      color: "#120810",
      role: "background",
      x: 965,
      y: -380,
    });
  });

  it("rejects malformed colors, roles, and coordinates", () => {
    expect(() => parseScreenPickResult({
      color: "transparent",
      role: "canvas",
      x: 2.5,
      y: 0,
    })).toThrow("invalid result");
  });
});
