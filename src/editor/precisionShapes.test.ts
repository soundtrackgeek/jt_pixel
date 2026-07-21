import { describe, expect, it } from "vitest";
import { applyPrecisionShape, getPrecisionShapeEnd } from "./precisionShapes";
import { pixelIndex } from "./pixels";
import type { PixelMap } from "./project";

function draw(
  tool: "line" | "rectangle" | "ellipse",
  start: { x: number; y: number },
  end: { x: number; y: number },
  mode: "outline" | "filled" = "outline",
  brushSize = 1,
  width = 8,
  height = 8,
) {
  const pixels: PixelMap = {};
  applyPrecisionShape(pixels, tool, start, end, mode, brushSize, width, height, "#42c8e3");
  return pixels;
}

describe("precision shape constraints", () => {
  it("snaps lines to horizontal, vertical, and 45-degree paths", () => {
    expect(getPrecisionShapeEnd("line", { x: 2, y: 2 }, { x: 7, y: 3 }, true, 12, 12))
      .toEqual({ x: 7, y: 2 });
    expect(getPrecisionShapeEnd("line", { x: 2, y: 2 }, { x: 3, y: 8 }, true, 12, 12))
      .toEqual({ x: 2, y: 8 });
    const diagonal = getPrecisionShapeEnd("line", { x: 2, y: 2 }, { x: 7, y: 6 }, true, 12, 12);
    expect(diagonal.x - 2).toBe(diagonal.y - 2);
  });

  it("locks rectangles and ellipses to square bounds without leaving the canvas", () => {
    expect(getPrecisionShapeEnd("rectangle", { x: 2, y: 2 }, { x: 5, y: 3 }, true, 8, 8))
      .toEqual({ x: 5, y: 5 });
    expect(getPrecisionShapeEnd("ellipse", { x: 6, y: 6 }, { x: 2, y: 4 }, true, 8, 8))
      .toEqual({ x: 2, y: 2 });
  });
});

describe("precision shape rasterization", () => {
  it("draws deterministic Bresenham lines including both endpoints", () => {
    const pixels = draw("line", { x: 0, y: 0 }, { x: 4, y: 2 });

    expect(Object.keys(pixels)).toHaveLength(5);
    expect(pixels[pixelIndex(0, 0, 8)]).toBe("#42c8e3");
    expect(pixels[pixelIndex(4, 2, 8)]).toBe("#42c8e3");
  });

  it("supports outline and filled rectangles", () => {
    expect(Object.keys(draw("rectangle", { x: 1, y: 1 }, { x: 3, y: 3 })))
      .toHaveLength(8);
    expect(Object.keys(draw("rectangle", { x: 1, y: 1 }, { x: 3, y: 3 }, "filled")))
      .toHaveLength(9);
  });

  it("supports balanced outline and filled pixel ellipses", () => {
    expect(Object.keys(draw("ellipse", { x: 0, y: 0 }, { x: 4, y: 4 })))
      .toHaveLength(12);
    expect(Object.keys(draw("ellipse", { x: 0, y: 0 }, { x: 4, y: 4 }, "filled")))
      .toHaveLength(21);
  });

  it("applies brush thickness to outlines while clipping safely at canvas edges", () => {
    const pixels = draw("line", { x: 0, y: 0 }, { x: 0, y: 4 }, "outline", 3, 5, 5);

    expect(Object.keys(pixels)).toHaveLength(10);
    expect(Object.keys(pixels).every((index) => Number(index) >= 0 && Number(index) < 25)).toBe(true);
  });

  it("reports no edit when the shape already matches the target pixels", () => {
    const pixels = draw("rectangle", { x: 1, y: 1 }, { x: 3, y: 3 }, "filled");

    expect(applyPrecisionShape(
      pixels,
      "rectangle",
      { x: 1, y: 1 },
      { x: 3, y: 3 },
      "filled",
      1,
      8,
      8,
      "#42c8e3",
    )).toBe(false);
  });
});
