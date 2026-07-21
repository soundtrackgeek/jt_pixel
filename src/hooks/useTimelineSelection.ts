import { useCallback, useMemo, useRef, useState } from "react";
import {
  frameRangeIds,
  orderedFrameIds,
  playbackFrameRange,
} from "../editor/timeline";
import type { ProjectFrame } from "../editor/project";

export interface FrameSelectionModifiers {
  additive: boolean;
  range: boolean;
}

export function useTimelineSelection(
  frames: ProjectFrame[],
  activeFrameId: string,
  onActiveFrameChange: (frameId: string) => void,
  scopeId: string,
) {
  const [storedSelection, setStoredSelection] = useState({
    frameIds: [activeFrameId],
    scopeId,
  });
  const anchorFrameId = useRef(activeFrameId);
  const selectedFrameIds = useMemo(() => {
    const validSelection = storedSelection.scopeId === scopeId
      ? orderedFrameIds(frames, storedSelection.frameIds)
      : [];
    return validSelection.length > 0 ? validSelection : [activeFrameId];
  }, [activeFrameId, frames, scopeId, storedSelection]);

  const replaceSelection = useCallback((frameIds: string[], nextActiveFrameId?: string) => {
    const requestedIds = [...new Set(frameIds)];
    const orderedIds = orderedFrameIds(frames, requestedIds);
    const fallbackFrameId = nextActiveFrameId ?? requestedIds[0] ?? activeFrameId;
    const nextIds = requestedIds.length === orderedIds.length
      ? orderedIds
      : requestedIds.length > 0 ? requestedIds : [fallbackFrameId];
    setStoredSelection({ frameIds: nextIds, scopeId });
    anchorFrameId.current = fallbackFrameId;
    if (fallbackFrameId && fallbackFrameId !== activeFrameId) {
      onActiveFrameChange(fallbackFrameId);
    }
  }, [activeFrameId, frames, onActiveFrameChange, scopeId]);

  const selectFrame = useCallback((
    frameId: string,
    modifiers: FrameSelectionModifiers,
  ) => {
    if (!frames.some((frame) => frame.id === frameId)) return;

    if (modifiers.range) {
      const rangeIds = frameRangeIds(
        frames,
        frames.some((frame) => frame.id === anchorFrameId.current)
          ? anchorFrameId.current
          : activeFrameId,
        frameId,
      );
      setStoredSelection({ frameIds: rangeIds, scopeId });
      onActiveFrameChange(frameId);
      return;
    }

    if (modifiers.additive) {
      const selectedIds = new Set(selectedFrameIds);
      if (selectedIds.has(frameId) && selectedIds.size > 1) {
        selectedIds.delete(frameId);
        const nextIds = orderedFrameIds(frames, selectedIds);
        setStoredSelection({ frameIds: nextIds, scopeId });
        if (frameId === activeFrameId) onActiveFrameChange(nextIds[0]);
        anchorFrameId.current = nextIds[0];
      } else {
        selectedIds.add(frameId);
        setStoredSelection({
          frameIds: orderedFrameIds(frames, selectedIds),
          scopeId,
        });
        anchorFrameId.current = frameId;
        onActiveFrameChange(frameId);
      }
      return;
    }

    setStoredSelection({ frameIds: [frameId], scopeId });
    anchorFrameId.current = frameId;
    onActiveFrameChange(frameId);
  }, [activeFrameId, frames, onActiveFrameChange, scopeId, selectedFrameIds]);

  const playbackRange = useMemo(
    () => playbackFrameRange(frames, selectedFrameIds),
    [frames, selectedFrameIds],
  );

  return {
    playbackRange,
    replaceSelection,
    selectFrame,
    selectedFrameIds,
  };
}
