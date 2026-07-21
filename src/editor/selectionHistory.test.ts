import { describe, expect, it } from "vitest";
import { SelectionHistoryTracker } from "./selectionHistory";
import type { PixelSelection } from "../types";

const original: PixelSelection = {
  documentId: "project-1",
  frameId: "frame-1",
  layerId: "layer-1",
  x: 2,
  y: 3,
  width: 4,
  height: 2,
};

const moved: PixelSelection = { ...original, x: 6, y: 5 };

describe("selection history", () => {
  it("restores transform bounds on undo and redo", () => {
    const tracker = new SelectionHistoryTracker();
    tracker.stageTransform("project-1:10", original, moved);

    expect(tracker.resolve({
      contextChanged: false,
      currentSelection: moved,
      nextHistoryKey: "project-1:11",
      previousHistoryKey: "project-1:10",
    })).toBe(moved);
    expect(tracker.resolve({
      contextChanged: false,
      currentSelection: moved,
      nextHistoryKey: "project-1:10",
      previousHistoryKey: "project-1:11",
    })).toBe(original);
    expect(tracker.resolve({
      contextChanged: false,
      currentSelection: original,
      nextHistoryKey: "project-1:11",
      previousHistoryKey: "project-1:10",
    })).toBe(moved);
  });

  it("keeps the current marquee across unrelated document history", () => {
    const tracker = new SelectionHistoryTracker();
    const manualSelection = { ...original, x: 9 };

    expect(tracker.resolve({
      contextChanged: false,
      currentSelection: manualSelection,
      nextHistoryKey: "project-1:9",
      previousHistoryKey: "project-1:10",
    })).toBe(manualSelection);
  });

  it("clears the marquee when the active frame, layer, or project changes", () => {
    const tracker = new SelectionHistoryTracker();
    tracker.stageTransform("project-1:10", original, moved);

    expect(tracker.resolve({
      contextChanged: true,
      currentSelection: moved,
      nextHistoryKey: "project-1:10",
      previousHistoryKey: "project-1:10",
    })).toBeNull();
  });
});
