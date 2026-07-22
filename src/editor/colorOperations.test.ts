import { describe, expect, it } from "vitest";
import {
  analyzeColorReplacement,
  extractPaletteFromDocument,
  hexToHsv,
  hsvToHex,
  normalizeHexColor,
  replaceDocumentColor,
  samplePixelLens,
  sampleProjectPixelColor,
  sampleVisiblePixelColor,
} from "./colorOperations";
import {
  celKey,
  createProjectDocument,
  type ProjectDocument,
} from "./project";

function colorDocument(): ProjectDocument {
  const document = createProjectDocument("2026-07-21T12:00:00.000Z");
  return {
    ...document,
    cels: {
      [celKey("layer-details", "frame-3")]: {
        layerId: "layer-details",
        frameId: "frame-3",
        pixels: { 0: "#42c8e380", 1: "#42c8e3", 2: "#ff615d" },
      },
      [celKey("layer-details", "frame-4")]: {
        layerId: "layer-details",
        frameId: "frame-4",
        pixels: { 0: "#42c8e3" },
      },
      [celKey("layer-highlights", "frame-3")]: {
        layerId: "layer-highlights",
        frameId: "frame-3",
        pixels: { 0: "#ff615d" },
      },
    },
    frameLayerLocks: {
      [celKey("layer-details", "frame-4")]: true,
    },
  };
}

describe("color operations", () => {
  it("normalizes compact and full opaque colors", () => {
    expect(normalizeHexColor("42C8E3")).toBe("#42c8e3");
    expect(normalizeHexColor("#f65")).toBe("#ff6655");
    expect(normalizeHexColor("nope")).toBeNull();
  });

  it("round-trips editor colors through HSV", () => {
    expect(hexToHsv("#42c8e3")).toEqual({ hue: 190, saturation: 71, value: 89 });
    expect(hsvToHex(hexToHsv("#42c8e3"))).toBe("#42c8e3");
  });

  it("analyzes scope and reports protected pixels separately", () => {
    const analysis = analyzeColorReplacement(
      colorDocument(),
      "#42c8e3",
      "layer",
      { activeFrameId: "frame-3", activeLayerId: "layer-details" },
    );
    expect(analysis).toEqual({ affectedCels: 1, affectedPixels: 2, lockedPixels: 1 });
  });

  it("replaces matching RGB values while preserving pixel alpha", () => {
    const source = colorDocument();
    const replaced = replaceDocumentColor(
      source,
      "#42c8e3",
      "#c9f53d",
      "layer",
      { activeFrameId: "frame-3", activeLayerId: "layer-details" },
    );
    expect(replaced.cels[celKey("layer-details", "frame-3")].pixels)
      .toMatchObject({ 0: "#c9f53d80", 1: "#c9f53d", 2: "#ff615d" });
    expect(replaced.cels[celKey("layer-details", "frame-4")].pixels[0])
      .toBe("#42c8e3");
  });

  it("limits replacement to the selected rectangle", () => {
    const replaced = replaceDocumentColor(
      colorDocument(),
      "#42c8e3",
      "#c9f53d",
      "selection",
      {
        activeFrameId: "frame-3",
        activeLayerId: "layer-details",
        bounds: { x: 0, y: 0, width: 1, height: 1 },
      },
    );
    expect(replaced.cels[celKey("layer-details", "frame-3")].pixels[0]).toBe("#c9f53d80");
    expect(replaced.cels[celKey("layer-details", "frame-3")].pixels[1]).toBe("#42c8e3");
  });

  it("limits replacement to exact cells in an irregular selection", () => {
    const replaced = replaceDocumentColor(
      colorDocument(),
      "#42c8e3",
      "#c9f53d",
      "selection",
      {
        activeFrameId: "frame-3",
        activeLayerId: "layer-details",
        bounds: {
          x: 0,
          y: 0,
          width: 2,
          height: 1,
          mask: { 1: true },
        },
      },
    );
    expect(replaced.cels[celKey("layer-details", "frame-3")].pixels[0]).toBe("#42c8e380");
    expect(replaced.cels[celKey("layer-details", "frame-3")].pixels[1]).toBe("#c9f53d");
  });

  it("extracts project colors by usage frequency", () => {
    expect(extractPaletteFromDocument(colorDocument()).slice(0, 2))
      .toEqual(["#42c8e3", "#ff615d"]);
  });

  it("samples the visible painted-layer composite", () => {
    expect(sampleVisiblePixelColor(colorDocument(), "frame-3", "0")).toMatch(/^#[0-9a-f]{6}$/);
    expect(sampleVisiblePixelColor(colorDocument(), "frame-3", "99")).toBeNull();
  });

  it("samples active-layer and visible colors through one eyedropper path", () => {
    const document = colorDocument();
    expect(sampleProjectPixelColor(
      document,
      "frame-3",
      "layer-details",
      "active-layer",
      "0",
    )).toBe("#42c8e3");
    expect(sampleProjectPixelColor(
      document,
      "frame-3",
      "layer-details",
      "visible-pixels",
      "0",
    )).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("builds an edge-aware magnified neighborhood with a stable center sample", () => {
    const sample = samplePixelLens(
      colorDocument(),
      "frame-3",
      "layer-details",
      "active-layer",
      { x: 0, y: 0 },
      1,
    );
    expect(sample.size).toBe(3);
    expect(sample.cells).toHaveLength(9);
    expect(sample.cells.filter((cell) => !cell.inBounds)).toHaveLength(5);
    expect(sample.centerColor).toBe("#42c8e3");
    expect(sample.cells[8]).toMatchObject({ color: null, inBounds: true });
  });
});
