import { describe, expect, it } from "vitest";
import {
  DEFAULT_CANVAS_VIEW_PREFERENCES,
  parseCanvasViewPreferences,
  serializeCanvasViewPreferences,
} from "./canvasView";

describe("canvas view preferences", () => {
  it("defaults to a checkerboard with a clear pixel grid", () => {
    expect(parseCanvasViewPreferences(null)).toEqual({
      background: "checkerboard",
      gridStyle: "crisp",
    });
  });

  it("round-trips supported view-only preferences", () => {
    const preferences = {
      background: "neutral-mid",
      gridStyle: "contrast",
    } as const;

    expect(parseCanvasViewPreferences(
      serializeCanvasViewPreferences(preferences),
    )).toEqual(preferences);
  });

  it("ignores malformed and unsupported stored values", () => {
    expect(parseCanvasViewPreferences("not-json")).toBe(
      DEFAULT_CANVAS_VIEW_PREFERENCES,
    );
    expect(parseCanvasViewPreferences(JSON.stringify({
      background: "rainbow",
      gridStyle: "crisp",
    }))).toBe(DEFAULT_CANVAS_VIEW_PREFERENCES);
    expect(parseCanvasViewPreferences(JSON.stringify({
      background: "neutral-dark",
      gridStyle: "missing",
    }))).toBe(DEFAULT_CANVAS_VIEW_PREFERENCES);
  });
});
