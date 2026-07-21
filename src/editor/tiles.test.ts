import { describe, expect, it } from "vitest";
import {
  applyTileBrush,
  applyTilePrecisionShape,
  DEFAULT_TILE_WORKSPACE_SETTINGS,
  floodFillTilePixelMap,
  offsetTilePixels,
  tileSymmetryPositions,
  type TileWorkspaceSettings,
} from "./tiles";
import type { PixelMap } from "./project";

const seamless: TileWorkspaceSettings = {
  ...DEFAULT_TILE_WORKSPACE_SETTINGS,
  mode: "seamless",
};

describe("tile editing", () => {
  it("wraps a brush across every canvas edge and corner", () => {
    const pixels: PixelMap = {};
    expect(applyTileBrush(pixels, { x: 0, y: 0 }, 3, 4, 4, "#42d9e3", seamless))
      .toBe(true);

    expect(Object.keys(pixels).map(Number).sort((a, b) => a - b)).toEqual([
      0, 1, 3,
      4, 5, 7,
      12, 13, 15,
    ]);
  });

  it("keeps standard brushes clipped and selections from wrapping", () => {
    const standardPixels: PixelMap = {};
    applyTileBrush(
      standardPixels,
      { x: 0, y: 0 },
      3,
      4,
      4,
      "#ad62ff",
      DEFAULT_TILE_WORKSPACE_SETTINGS,
    );
    expect(Object.keys(standardPixels).map(Number).sort((a, b) => a - b))
      .toEqual([0, 1, 4, 5]);

    const selectedPixels: PixelMap = {};
    applyTileBrush(
      selectedPixels,
      { x: 0, y: 0 },
      3,
      4,
      4,
      "#ad62ff",
      seamless,
      { x: 0, y: 0, width: 2, height: 2 },
    );
    expect(selectedPixels).toEqual(standardPixels);
  });

  it("deduplicates horizontal, vertical, and quad symmetry on odd dimensions", () => {
    expect(tileSymmetryPositions({ x: 1, y: 1 }, 5, 5, "quad"))
      .toEqual([
        { x: 1, y: 1 },
        { x: 3, y: 1 },
        { x: 1, y: 3 },
        { x: 3, y: 3 },
      ]);
    expect(tileSymmetryPositions({ x: 2, y: 2 }, 5, 5, "quad"))
      .toEqual([{ x: 2, y: 2 }]);
  });

  it("connects flood-fill regions through opposite edges in seamless mode", () => {
    const standardPixels: PixelMap = {
      0: "#111111", 1: "#222222", 2: "#111111",
      3: "#222222", 4: "#222222", 5: "#222222",
      6: "#222222", 7: "#222222", 8: "#222222",
    };
    const seamlessPixels = { ...standardPixels };

    floodFillTilePixelMap(
      standardPixels,
      { x: 0, y: 0 },
      3,
      3,
      "#42d9e3",
      DEFAULT_TILE_WORKSPACE_SETTINGS,
    );
    floodFillTilePixelMap(
      seamlessPixels,
      { x: 0, y: 0 },
      3,
      3,
      "#42d9e3",
      seamless,
    );

    expect(standardPixels[0]).toBe("#42d9e3");
    expect(standardPixels[2]).toBe("#111111");
    expect(seamlessPixels[0]).toBe("#42d9e3");
    expect(seamlessPixels[2]).toBe("#42d9e3");
  });

  it("mirrors a precision shape and wraps its outline brush", () => {
    const pixels: PixelMap = {};
    applyTilePrecisionShape(
      pixels,
      "line",
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      "outline",
      3,
      4,
      4,
      "#cafd26",
      { ...seamless, symmetry: "horizontal" },
    );

    expect(pixels[0]).toBe("#cafd26");
    expect(pixels[3]).toBe("#cafd26");
    expect(pixels[12]).toBe("#cafd26");
    expect(pixels[15]).toBe("#cafd26");
  });

  it("offsets pixels toroidally and returns to the source after a full cycle", () => {
    const source = { 0: "#42d9e3", 7: "#ad62ff", 15: "#cafd26" };
    const shifted = offsetTilePixels(source, 4, 4, 2, 2);
    expect(shifted).toEqual({
      10: "#42d9e3",
      13: "#ad62ff",
      5: "#cafd26",
    });
    expect(offsetTilePixels(shifted, 4, 4, 2, 2)).toEqual(source);
  });
});
