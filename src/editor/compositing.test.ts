import { describe, expect, it } from "vitest";
import { compositeRgba } from "./compositing";
import type { LayerBlendMode } from "./project";

const destination = { red: 0.5, green: 0.5, blue: 0.5, alpha: 1 };
const source = { red: 0.25, green: 0.75, blue: 1, alpha: 1 };

describe("layer compositing", () => {
  it.each<[LayerBlendMode, number[]]>([
    ["normal", [0.25, 0.75, 1]],
    ["multiply", [0.125, 0.375, 0.5]],
    ["screen", [0.625, 0.875, 1]],
    ["overlay", [0.25, 0.75, 1]],
    ["add", [0.75, 1, 1]],
    ["subtract", [0.25, 0, 0]],
  ])("calculates %s consistently", (mode, expected) => {
    const result = compositeRgba(destination, source, 1, mode);
    expect([result.red, result.green, result.blue]).toEqual(expected);
    expect(result.alpha).toBe(1);
  });

  it("preserves source color over a transparent backdrop", () => {
    expect(compositeRgba(
      { red: 0, green: 0, blue: 0, alpha: 0 },
      source,
      0.5,
      "multiply",
    )).toEqual({ ...source, alpha: 0.5 });
  });
});
