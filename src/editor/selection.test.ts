import { describe, expect, it } from "vitest";
import { pixelIndex } from "./pixels";
import {
  clampSelectionDelta,
  copySelectionPixels,
  deleteSelectionPixels,
  flipSelectionPixels,
  mergeSelectionChanges,
  moveSelectionPixels,
  normalizeSelectionBounds,
  pasteSelectionPixels,
  pixelMapsEqual,
  rotateSelectionPixels,
} from "./selection";
import type { PixelMap } from "./project";

describe("selection bounds", () => {
  it("normalizes reverse drags into inclusive canvas bounds", () => {
    expect(normalizeSelectionBounds({ x: 6, y: 5 }, { x: 2, y: 3 }, 8, 8))
      .toEqual({ x: 2, y: 3, width: 5, height: 3 });
    expect(normalizeSelectionBounds({ x: -4, y: 12 }, { x: 2, y: 2 }, 8, 8))
      .toEqual({ x: 0, y: 2, width: 3, height: 6 });
  });

  it("clamps movement so the full marquee stays on canvas", () => {
    const bounds = { x: 1, y: 2, width: 3, height: 2 };
    expect(clampSelectionDelta(bounds, -20, 20, 6, 6)).toEqual({ x: -1, y: 2 });
  });
});

describe("selection clipboard", () => {
  it("copies selected pixels into relative clipboard coordinates", () => {
    const pixels: PixelMap = {
      [pixelIndex(1, 1, 4)]: "#a",
      [pixelIndex(2, 2, 4)]: "#b",
      [pixelIndex(0, 0, 4)]: "#outside",
    };
    expect(copySelectionPixels(pixels, { x: 1, y: 1, width: 2, height: 2 }, 4))
      .toEqual({
        width: 2,
        height: 2,
        pixels: { 0: "#a", 3: "#b" },
        sourceX: 1,
        sourceY: 1,
      });
  });

  it("pastes within the canvas and preserves transparency", () => {
    const result = pasteSelectionPixels(
      { [pixelIndex(2, 2, 4)]: "#under" },
      { width: 2, height: 2, pixels: { 0: "#copy" }, sourceX: 0, sourceY: 0 },
      9,
      9,
      4,
      4,
    );
    expect(result.bounds).toEqual({ x: 2, y: 2, width: 2, height: 2 });
    expect(result.pixels[pixelIndex(2, 2, 4)]).toBe("#copy");
  });
});

describe("selection transforms", () => {
  it("deletes only pixels inside the selection", () => {
    const pixels = {
      [pixelIndex(1, 1, 5)]: "#inside",
      [pixelIndex(4, 4, 5)]: "#outside",
    };
    expect(deleteSelectionPixels(pixels, { x: 0, y: 0, width: 3, height: 3 }, 5))
      .toEqual({ [pixelIndex(4, 4, 5)]: "#outside" });
  });

  it("moves pixels as one clipped transform and clears the source", () => {
    const pixels = {
      [pixelIndex(1, 1, 5)]: "#a",
      [pixelIndex(2, 1, 5)]: "#b",
      [pixelIndex(3, 1, 5)]: "#under",
    };
    const result = moveSelectionPixels(
      pixels,
      { x: 1, y: 1, width: 2, height: 1 },
      1,
      0,
      5,
      5,
    );
    expect(result.bounds).toEqual({ x: 2, y: 1, width: 2, height: 1 });
    expect(result.pixels[pixelIndex(1, 1, 5)]).toBeUndefined();
    expect(result.pixels[pixelIndex(2, 1, 5)]).toBe("#a");
    expect(result.pixels[pixelIndex(3, 1, 5)]).toBe("#b");
  });

  it("flips selected pixels horizontally and vertically", () => {
    const horizontal = flipSelectionPixels(
      { [pixelIndex(1, 1, 5)]: "#left", [pixelIndex(3, 1, 5)]: "#right" },
      { x: 1, y: 1, width: 3, height: 1 },
      "horizontal",
      5,
      5,
    );
    expect(horizontal[pixelIndex(1, 1, 5)]).toBe("#right");
    expect(horizontal[pixelIndex(3, 1, 5)]).toBe("#left");

    const vertical = flipSelectionPixels(
      { [pixelIndex(2, 0, 5)]: "#top", [pixelIndex(2, 2, 5)]: "#bottom" },
      { x: 2, y: 0, width: 1, height: 3 },
      "vertical",
      5,
      5,
    );
    expect(vertical[pixelIndex(2, 0, 5)]).toBe("#bottom");
    expect(vertical[pixelIndex(2, 2, 5)]).toBe("#top");
  });

  it("rotates clockwise and swaps non-square selection dimensions", () => {
    const result = rotateSelectionPixels(
      {
        [pixelIndex(1, 1, 6)]: "#a",
        [pixelIndex(1, 3, 6)]: "#b",
      },
      { x: 1, y: 1, width: 2, height: 3 },
      6,
      6,
    );
    expect(result.bounds).toEqual({ x: 1, y: 2, width: 3, height: 2 });
    expect(result.pixels[pixelIndex(3, 2, 6)]).toBe("#a");
    expect(result.pixels[pixelIndex(1, 2, 6)]).toBe("#b");
  });

  it("merges drawing changes only inside the active selection", () => {
    const base = {
      [pixelIndex(0, 0, 4)]: "#outside",
      [pixelIndex(1, 1, 4)]: "#old",
    };
    const changed = {
      [pixelIndex(0, 0, 4)]: "#changed-outside",
      [pixelIndex(2, 2, 4)]: "#inside",
    };
    expect(mergeSelectionChanges(base, changed, { x: 1, y: 1, width: 2, height: 2 }, 4))
      .toEqual({
        [pixelIndex(0, 0, 4)]: "#outside",
        [pixelIndex(2, 2, 4)]: "#inside",
      });
  });

  it("detects no-op pixel maps regardless of object identity", () => {
    expect(pixelMapsEqual({ 1: "#a" }, { 1: "#a" })).toBe(true);
    expect(pixelMapsEqual({ 1: "#a" }, { 1: "#b" })).toBe(false);
  });
});
