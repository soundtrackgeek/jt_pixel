import { useCallback, useEffect, useMemo, useState } from "react";
import {
  copySelectionPixels,
  deleteSelectionPixels,
  flipSelectionPixels,
  moveSelectionPixels,
  pasteSelectionPixels,
  pixelMapsEqual,
  rotateSelectionPixels,
  type SelectionClipboard,
  type SelectionFlipAxis,
} from "../editor/selection";
import type { PixelMap } from "../editor/project";
import type { PixelSelection, SelectionBounds } from "../types";

interface UsePixelSelectionOptions {
  activeFrameId: string;
  activeLayerId: string;
  activePixels: PixelMap;
  canEdit: boolean;
  documentId: string;
  height: number;
  onCommit: (pixels: PixelMap) => void;
  width: number;
}

export function usePixelSelection({
  activeFrameId,
  activeLayerId,
  activePixels,
  canEdit,
  documentId,
  height,
  onCommit,
  width,
}: UsePixelSelectionOptions) {
  const [storedSelection, setStoredSelection] = useState<PixelSelection | null>(null);
  const [clipboard, setClipboard] = useState<SelectionClipboard | null>(null);
  const selection = useMemo(
    () => storedSelection?.documentId === documentId
      && storedSelection.frameId === activeFrameId
      && storedSelection.layerId === activeLayerId
      ? storedSelection
      : null,
    [activeFrameId, activeLayerId, documentId, storedSelection],
  );

  useEffect(() => {
    setStoredSelection((current) => current?.documentId === documentId
      && current.frameId === activeFrameId
      && current.layerId === activeLayerId
      ? current
      : null);
  }, [activeFrameId, activeLayerId, documentId]);

  const select = useCallback((bounds: SelectionBounds) => {
    setStoredSelection({
      ...bounds,
      documentId,
      frameId: activeFrameId,
      layerId: activeLayerId,
    });
  }, [activeFrameId, activeLayerId, documentId]);

  const deselect = useCallback(() => setStoredSelection(null), []);

  const selectAll = useCallback(() => {
    select({ x: 0, y: 0, width, height });
  }, [height, select, width]);

  const commitIfChanged = useCallback((pixels: PixelMap) => {
    if (!pixelMapsEqual(activePixels, pixels)) onCommit(pixels);
  }, [activePixels, onCommit]);

  const copy = useCallback(() => {
    if (!selection) return false;
    setClipboard(copySelectionPixels(activePixels, selection, width));
    return true;
  }, [activePixels, selection, width]);

  const cut = useCallback(() => {
    if (!selection || !canEdit) return false;
    setClipboard(copySelectionPixels(activePixels, selection, width));
    commitIfChanged(deleteSelectionPixels(activePixels, selection, width));
    return true;
  }, [activePixels, canEdit, commitIfChanged, selection, width]);

  const remove = useCallback(() => {
    if (!selection || !canEdit) return false;
    commitIfChanged(deleteSelectionPixels(activePixels, selection, width));
    return true;
  }, [activePixels, canEdit, commitIfChanged, selection, width]);

  const paste = useCallback(() => {
    if (!clipboard || !canEdit) return false;
    const preferredX = selection ? selection.x + 1 : clipboard.sourceX;
    const preferredY = selection ? selection.y + 1 : clipboard.sourceY;
    const result = pasteSelectionPixels(
      activePixels,
      clipboard,
      preferredX,
      preferredY,
      width,
      height,
    );
    commitIfChanged(result.pixels);
    select(result.bounds);
    return true;
  }, [activePixels, canEdit, clipboard, commitIfChanged, height, select, selection, width]);

  const duplicate = useCallback(() => {
    if (!selection || !canEdit) return false;
    const copied = copySelectionPixels(activePixels, selection, width);
    setClipboard(copied);
    const result = pasteSelectionPixels(
      activePixels,
      copied,
      selection.x + 1,
      selection.y + 1,
      width,
      height,
    );
    commitIfChanged(result.pixels);
    select(result.bounds);
    return true;
  }, [activePixels, canEdit, commitIfChanged, height, select, selection, width]);

  const move = useCallback((deltaX: number, deltaY: number) => {
    if (!selection || !canEdit) return false;
    const result = moveSelectionPixels(
      activePixels,
      selection,
      deltaX,
      deltaY,
      width,
      height,
    );
    commitIfChanged(result.pixels);
    select(result.bounds);
    return true;
  }, [activePixels, canEdit, commitIfChanged, height, select, selection, width]);

  const flip = useCallback((axis: SelectionFlipAxis) => {
    if (!selection || !canEdit) return false;
    commitIfChanged(flipSelectionPixels(activePixels, selection, axis, width, height));
    return true;
  }, [activePixels, canEdit, commitIfChanged, height, selection, width]);

  const rotate = useCallback(() => {
    if (!selection || !canEdit) return false;
    const result = rotateSelectionPixels(activePixels, selection, width, height);
    commitIfChanged(result.pixels);
    select(result.bounds);
    return true;
  }, [activePixels, canEdit, commitIfChanged, height, select, selection, width]);

  return {
    clipboard,
    selection,
    copy,
    cut,
    deselect,
    duplicate,
    flip,
    move,
    paste,
    remove,
    rotate,
    select,
    selectAll,
  };
}
