import { describe, expect, it } from "vitest";
import {
  clampCanvasPan,
  fitCanvasZoom,
  steppedCanvasZoom,
  zoomAroundPoint,
} from "./canvasNavigation";

describe("canvas navigation", () => {
  it("fits common canvas sizes using crisp zoom steps", () => {
    expect(fitCanvasZoom(600, 600, 64, 64)).toBe(800);
    expect(fitCanvasZoom(600, 600, 512, 512)).toBe(100);
  });

  it("steps through useful pixel-art zoom levels", () => {
    expect(steppedCanvasZoom(100, 1)).toBe(200);
    expect(steppedCanvasZoom(800, -1)).toBe(400);
  });

  it("keeps the point beneath the cursor stable while zooming", () => {
    expect(zoomAroundPoint({
      currentZoom: 100,
      nextZoom: 200,
      pan: { x: 0, y: 0 },
      point: { x: 300, y: 200 },
      viewport: { width: 400, height: 300 },
    })).toEqual({ x: -100, y: -50 });
  });

  it("keeps at least part of the artboard reachable", () => {
    expect(clampCanvasPan({
      artboardHeight: 400,
      artboardWidth: 400,
      pan: { x: 999, y: -999 },
      viewportHeight: 300,
      viewportWidth: 300,
    })).toEqual({ x: 302, y: -302 });
  });
});
