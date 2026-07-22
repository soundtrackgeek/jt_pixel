import { describe, expect, it } from "vitest";
import { applySquareBrush, floodFillPixelMap, pixelIndex } from "./pixels";
import type { PixelMap } from "./project";

function closedBox(): PixelMap {
  const pixels: PixelMap = {};
  for (let coordinate = 1; coordinate <= 3; coordinate += 1) {
    pixels[pixelIndex(coordinate, 1, 5)] = "#152034";
    pixels[pixelIndex(coordinate, 3, 5)] = "#152034";
    pixels[pixelIndex(1, coordinate, 5)] = "#152034";
    pixels[pixelIndex(3, coordinate, 5)] = "#152034";
  }
  return pixels;
}

describe("floodFillPixelMap", () => {
  it("fills only the transparent region inside a closed outline", () => {
    const pixels = closedBox();

    expect(floodFillPixelMap(pixels, { x: 2, y: 2 }, 5, 5, "#42c8e3")).toBe(true);
    expect(pixels[pixelIndex(2, 2, 5)]).toBe("#42c8e3");
    expect(pixels[pixelIndex(0, 0, 5)]).toBeUndefined();
    expect(pixels[pixelIndex(2, 1, 5)]).toBe("#152034");
    expect(Object.values(pixels).filter((color) => color === "#42c8e3")).toHaveLength(1);
  });

  it("fills the connected outside region without crossing the outline", () => {
    const pixels = closedBox();

    floodFillPixelMap(pixels, { x: 0, y: 0 }, 5, 5, "#ff615d");

    expect(Object.values(pixels).filter((color) => color === "#ff615d")).toHaveLength(16);
    expect(pixels[pixelIndex(2, 2, 5)]).toBeUndefined();
    expect(pixels[pixelIndex(1, 2, 5)]).toBe("#152034");
  });

  it("does nothing when the connected region already has the selected color", () => {
    const pixels: PixelMap = { [pixelIndex(2, 2, 5)]: "#c9f53d" };

    expect(floodFillPixelMap(pixels, { x: 2, y: 2 }, 5, 5, "#c9f53d")).toBe(false);
    expect(pixels).toEqual({ [pixelIndex(2, 2, 5)]: "#c9f53d" });
  });

  it("constrains a fill to the active selection bounds", () => {
    const pixels: PixelMap = {};

    expect(floodFillPixelMap(
      pixels,
      { x: 1, y: 1 },
      4,
      4,
      "#42c8e3",
      { x: 1, y: 1, width: 2, height: 2 },
    )).toBe(true);
    expect(Object.keys(pixels)).toHaveLength(4);
    expect(pixels[pixelIndex(2, 2, 4)]).toBe("#42c8e3");
    expect(pixels[pixelIndex(0, 0, 4)]).toBeUndefined();
  });

  it("constrains fill and large brushes to an irregular selection mask", () => {
    const selection = {
      x: 0,
      y: 0,
      width: 3,
      height: 3,
      mask: { 0: true, 4: true, 8: true } as Record<string, true>,
    };
    const fillPixels: PixelMap = {};
    floodFillPixelMap(fillPixels, { x: 0, y: 0 }, 3, 3, "#42c8e3", selection);
    expect(fillPixels).toEqual({ 0: "#42c8e3" });

    const brushPixels: PixelMap = {};
    applySquareBrush(brushPixels, { x: 1, y: 1 }, 3, 3, 3, "#ad62ff", selection);
    expect(brushPixels).toEqual({ 0: "#ad62ff", 4: "#ad62ff", 8: "#ad62ff" });
  });
});

describe("applySquareBrush", () => {
  it("reports only real pixel changes", () => {
    const index = pixelIndex(2, 2, 5);
    const pixels: PixelMap = { [index]: "#42c8e3" };

    expect(applySquareBrush(pixels, { x: 2, y: 2 }, 1, 5, 5, "#42c8e3"))
      .toBe(false);
    expect(applySquareBrush(pixels, { x: 0, y: 0 }, 1, 5, 5, null))
      .toBe(false);
    expect(applySquareBrush(pixels, { x: 2, y: 2 }, 1, 5, 5, null))
      .toBe(true);
    expect(pixels[index]).toBeUndefined();
  });
});
