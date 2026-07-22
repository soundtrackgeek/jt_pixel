import { describe, expect, it } from "vitest";
import {
  appendImportedFrames,
  countClippedPixels,
  createProjectFromImportedSlices,
  extractImportedPalette,
  fitImportedDimensions,
  imageRegionToPixelMap,
  importSliceAsLayer,
  importSliceIntoCel,
  resizePixelMap,
  scaledImportedImage,
  scalePixelMap,
  sliceImportedImage,
  transformProjectDimensions,
  validateSpriteSliceSettings,
  type DecodedImportImage,
  type ImportedSlice,
  type SpriteSliceSettings,
} from "./importOperations";
import {
  celKey,
  createNewProjectDocument,
  getCelPixels,
  isLayerPresent,
} from "./project";

function image(width: number, height: number, pixels: number[][]): DecodedImportImage {
  const data = new Uint8ClampedArray(width * height * 4);
  pixels.forEach(([x, y, red, green, blue, alpha = 255]) => {
    data.set([red, green, blue, alpha], (y * width + x) * 4);
  });
  return { name: "sheet.png", width, height, data };
}

const sheetSettings: SpriteSliceSettings = {
  cellWidth: 2,
  cellHeight: 2,
  columns: 2,
  rows: 1,
  spacingX: 1,
  spacingY: 0,
  marginX: 1,
  marginY: 1,
  order: "rows",
};

const redSlice: ImportedSlice = {
  width: 2,
  height: 2,
  pixels: { "0": "#ff0000", "3": "#ff000080" },
};

describe("image import operations", () => {
  it("decodes opaque, translucent, and transparent RGBA pixels", () => {
    const source = image(2, 2, [
      [0, 0, 255, 0, 0],
      [1, 0, 0, 255, 0, 128],
      [0, 1, 0, 0, 255, 0],
    ]);
    expect(imageRegionToPixelMap(source, 0, 0, 2, 2)).toEqual({
      "0": "#ff0000",
      "1": "#00ff0080",
    });
  });

  it("validates and slices sprite sheets in row and column order", () => {
    const source = image(7, 4, [
      [1, 1, 255, 0, 0],
      [4, 1, 0, 255, 0],
    ]);
    expect(validateSpriteSliceSettings(source, sheetSettings)).toBeNull();
    const slices = sliceImportedImage(source, sheetSettings);
    expect(slices).toHaveLength(2);
    expect(slices[0].pixels).toEqual({ "0": "#ff0000" });
    expect(slices[1].pixels).toEqual({ "0": "#00ff00" });
    expect(validateSpriteSliceSettings(source, {
      ...sheetSettings,
      columns: 3,
    })).toContain("exceeds");
  });

  it("extracts opaque palette colors by usage while preserving alpha in artwork", () => {
    expect(extractImportedPalette([
      redSlice,
      { width: 1, height: 1, pixels: { "0": "#00ff00" } },
    ])).toEqual(["#ff0000", "#00ff00"]);
  });

  it("resizes with nine-point anchor offsets and reports clipping", () => {
    const pixels = { "0": "#ff0000", "3": "#00ff00" };
    expect(resizePixelMap(pixels, 2, 2, 4, 4, "bottom-right")).toEqual({
      "10": "#ff0000",
      "15": "#00ff00",
    });
    expect(resizePixelMap(pixels, 2, 2, 1, 1, "top-left")).toEqual({
      "0": "#ff0000",
    });
    expect(countClippedPixels(pixels, 2, 2, 1, 1, "top-left")).toBe(1);
  });

  it("scales sparse pixels with nearest-neighbor sampling", () => {
    expect(scalePixelMap({ "0": "#ff0000" }, 2, 2, 4, 4)).toEqual({
      "0": "#ff0000",
      "1": "#ff0000",
      "4": "#ff0000",
      "5": "#ff0000",
    });
  });

  it("fits oversized sources inside supported dimensions without upscaling smaller images", () => {
    expect(fitImportedDimensions(1024, 1024)).toEqual({ width: 512, height: 512 });
    expect(fitImportedDimensions(1024, 512)).toEqual({ width: 512, height: 256 });
    expect(fitImportedDimensions(320, 180)).toEqual({ width: 320, height: 180 });
    expect(fitImportedDimensions(320, 180, 64, 64)).toEqual({ width: 64, height: 36 });
    expect(fitImportedDimensions(32, 16, 64, 64, true)).toEqual({ width: 64, height: 32 });
  });

  it("resamples decoded RGBA directly into a supported editable slice", () => {
    const source = image(2, 2, [
      [0, 0, 255, 0, 0],
      [1, 0, 0, 255, 0, 128],
      [0, 1, 0, 0, 255, 0],
    ]);
    expect(scaledImportedImage(source, 4, 4)).toEqual({
      width: 4,
      height: 4,
      pixels: {
        "0": "#ff0000",
        "1": "#ff0000",
        "2": "#00ff0080",
        "3": "#00ff0080",
        "4": "#ff0000",
        "5": "#ff0000",
        "6": "#00ff0080",
        "7": "#00ff0080",
      },
    });
  });

  it("creates a multi-frame project with imported palette and alpha", () => {
    const document = createProjectFromImportedSlices(
      "walk-cycle.png",
      [redSlice, { ...redSlice, pixels: { "1": "#00ff00" } }],
      ["#123456"],
      "replace",
      "2026-07-21T10:00:00.000Z",
    );
    expect(document.name).toBe("walk-cycle.jtp");
    expect(document.width).toBe(2);
    expect(document.frames).toHaveLength(2);
    expect(document.palette).toEqual(["#ff0000", "#00ff00"]);
    expect(getCelPixels(document, document.layers[0].id, document.frames[0].id)["3"])
      .toBe("#ff000080");
  });

  it("imports a centered frame-local layer without adding it to other frames", () => {
    const document = createNewProjectDocument({
      template: "courier",
      name: "test",
      now: "2026-07-21T10:00:00.000Z",
    });
    const result = importSliceAsLayer(document, document.frames[1].id, "ship.png", redSlice, "merge");
    expect(result.document.layers[0].name).toBe("ship");
    expect(isLayerPresent(result.document, result.activeLayerId, document.frames[1].id)).toBe(true);
    expect(isLayerPresent(result.document, result.activeLayerId, document.frames[0].id)).toBe(false);
    expect(Object.keys(getCelPixels(result.document, result.activeLayerId, document.frames[1].id)))
      .toHaveLength(2);
  });

  it("replaces the active cel as one imported result", () => {
    const document = createNewProjectDocument({
      template: "blank",
      name: "test",
      width: 2,
      height: 2,
      now: "2026-07-21T10:00:00.000Z",
    });
    const result = importSliceIntoCel(
      document,
      document.frames[0].id,
      document.layers[0].id,
      redSlice,
      "keep",
    );
    expect(getCelPixels(result.document, result.activeLayerId, result.activeFrameId))
      .toEqual(redSlice.pixels);
  });

  it("inserts imported sprite frames after the active frame with isolated layers", () => {
    const document = createNewProjectDocument({
      template: "blank",
      name: "test",
      width: 2,
      height: 2,
      now: "2026-07-21T10:00:00.000Z",
    });
    const result = appendImportedFrames(document, document.frames[0].id, "walk.png", [redSlice, redSlice], "merge");
    expect(result.document.frames).toHaveLength(3);
    expect(result.document.frames[1].id).toBe(result.activeFrameId);
    expect(isLayerPresent(result.document, result.activeLayerId, document.frames[0].id)).toBe(false);
    expect(isLayerPresent(result.document, document.layers[0].id, result.activeFrameId)).toBe(false);
    expect(result.document.cels[celKey(result.activeLayerId, result.activeFrameId)]).toBeDefined();
  });

  it("resizes every cel and fills expanded space only on the bottom pixel layer", () => {
    const document = createNewProjectDocument({
      template: "blank",
      name: "test",
      width: 2,
      height: 2,
      now: "2026-07-21T10:00:00.000Z",
    });
    const layerId = document.layers[0].id;
    const frameId = document.frames[0].id;
    document.cels[celKey(layerId, frameId)] = {
      layerId,
      frameId,
      pixels: { "0": "#ff0000" },
    };
    const resized = transformProjectDimensions(document, 3, 2, "resize", "left", "#123456");
    expect(resized.width).toBe(3);
    expect(getCelPixels(resized, layerId, frameId)).toEqual({
      "0": "#ff0000",
      "2": "#123456",
      "5": "#123456",
    });
  });
});
