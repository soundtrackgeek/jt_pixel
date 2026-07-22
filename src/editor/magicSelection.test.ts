import { describe, expect, it } from "vitest";
import { findMagicSelection } from "./magicSelection";

describe("magic selection", () => {
  it("selects only the contiguous color island", () => {
    const pixels = {
      0: "#42c8e3",
      1: "#42c8e3",
      3: "#ff615d",
      4: "#42c8e3",
      8: "#42c8e3",
    };
    expect(findMagicSelection(pixels, 3, 3, { x: 0, y: 0 }, "contiguous", 0))
      .toEqual({ x: 0, y: 0, width: 2, height: 2, mask: { 0: true, 1: true, 3: true } });
  });

  it("selects every matching color and respects tolerance", () => {
    const pixels = { 0: "#101010", 2: "#141414", 3: "#303030" };
    expect(findMagicSelection(pixels, 4, 1, { x: 0, y: 0 }, "global", 5))
      .toEqual({ x: 0, y: 0, width: 3, height: 1, mask: { 0: true, 2: true } });
  });

  it("can select connected transparent cells", () => {
    const pixels = { 4: "#ffffff" };
    const selection = findMagicSelection(pixels, 3, 3, { x: 0, y: 0 }, "contiguous", 0);
    expect(selection).toEqual({
      x: 0,
      y: 0,
      width: 3,
      height: 3,
      mask: { 0: true, 1: true, 2: true, 3: true, 5: true, 6: true, 7: true, 8: true },
    });
  });
});
