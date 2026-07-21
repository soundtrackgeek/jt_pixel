import type { ProjectFrame } from "./project";

export interface FrameRange {
  firstIndex: number;
  lastIndex: number;
}

export function orderedFrameIds(frames: ProjectFrame[], frameIds: Iterable<string>) {
  const requestedIds = new Set(frameIds);
  return frames.filter((frame) => requestedIds.has(frame.id)).map((frame) => frame.id);
}

export function frameRangeIds(
  frames: ProjectFrame[],
  anchorFrameId: string,
  targetFrameId: string,
) {
  const anchorIndex = frames.findIndex((frame) => frame.id === anchorFrameId);
  const targetIndex = frames.findIndex((frame) => frame.id === targetFrameId);
  if (targetIndex < 0) return [];
  if (anchorIndex < 0) return [targetFrameId];
  const firstIndex = Math.min(anchorIndex, targetIndex);
  const lastIndex = Math.max(anchorIndex, targetIndex);
  return frames.slice(firstIndex, lastIndex + 1).map((frame) => frame.id);
}

export function playbackFrameRange(
  frames: ProjectFrame[],
  selectedFrameIds: Iterable<string>,
): FrameRange {
  if (frames.length === 0) return { firstIndex: 0, lastIndex: 0 };
  const selectedIndices = orderedFrameIds(frames, selectedFrameIds)
    .map((frameId) => frames.findIndex((frame) => frame.id === frameId));
  if (selectedIndices.length <= 1) {
    return { firstIndex: 0, lastIndex: frames.length - 1 };
  }
  return {
    firstIndex: selectedIndices[0],
    lastIndex: selectedIndices[selectedIndices.length - 1],
  };
}

export function frameIdAfterDeletion(
  frames: ProjectFrame[],
  deletedFrameIds: Iterable<string>,
  activeFrameId: string,
) {
  const deletedIds = new Set(deletedFrameIds);
  if (!deletedIds.has(activeFrameId)) return activeFrameId;
  const firstDeletedIndex = frames.findIndex((frame) => deletedIds.has(frame.id));
  const remainingFrames = frames.filter((frame) => !deletedIds.has(frame.id));
  return remainingFrames[Math.min(firstDeletedIndex, remainingFrames.length - 1)]?.id
    ?? frames[0]?.id
    ?? "";
}
