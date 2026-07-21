import { describe, expect, it } from "vitest";
import { createProjectDocument } from "./project";
import {
  frameIdAfterDeletion,
  frameRangeIds,
  orderedFrameIds,
  playbackFrameRange,
} from "./timeline";

const frames = createProjectDocument("2026-07-21T12:00:00.000Z").frames;

describe("animation timeline helpers", () => {
  it("orders additive selections and builds inclusive shift ranges", () => {
    expect(orderedFrameIds(frames, ["frame-6", "frame-2", "frame-4"]))
      .toEqual(["frame-2", "frame-4", "frame-6"]);
    expect(frameRangeIds(frames, "frame-5", "frame-2"))
      .toEqual(["frame-2", "frame-3", "frame-4", "frame-5"]);
  });

  it("uses the selected bounds for range playback and all frames for one selection", () => {
    expect(playbackFrameRange(frames, ["frame-3", "frame-5"]))
      .toEqual({ firstIndex: 2, lastIndex: 4 });
    expect(playbackFrameRange(frames, ["frame-4"]))
      .toEqual({ firstIndex: 0, lastIndex: 7 });
  });

  it("chooses the closest retained frame after a batch deletion", () => {
    expect(frameIdAfterDeletion(
      frames,
      ["frame-3", "frame-4", "frame-5"],
      "frame-4",
    )).toBe("frame-6");
    expect(frameIdAfterDeletion(frames, ["frame-7", "frame-8"], "frame-8"))
      .toBe("frame-6");
  });
});
