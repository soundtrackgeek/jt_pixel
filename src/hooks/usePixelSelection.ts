import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { SelectionHistoryTracker } from "../editor/selectionHistory";
import type { PixelSelection, SelectionBounds } from "../types";

interface UsePixelSelectionOptions {
  activeFrameId: string;
  activeLayerId: string;
  activePixels: PixelMap;
  canEdit: boolean;
  documentId: string;
  height: number;
  historyEntryId: number;
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
  historyEntryId,
  onCommit,
  width,
}: UsePixelSelectionOptions) {
  const [storedSelection, setStoredSelection] = useState<PixelSelection | null>(null);
  const [clipboard, setClipboard] = useState<SelectionClipboard | null>(null);
  const storedSelectionRef = useRef<PixelSelection | null>(null);
  const selectionHistoryRef = useRef(new SelectionHistoryTracker());
  const historyKey = `${documentId}:${historyEntryId}`;
  const contextKey = `${documentId}:${activeFrameId}:${activeLayerId}`;
  const previousHistoryKeyRef = useRef(historyKey);
  const previousContextKeyRef = useRef(contextKey);
  const selection = useMemo(
    () => storedSelection?.documentId === documentId
      && storedSelection.frameId === activeFrameId
      && storedSelection.layerId === activeLayerId
      ? storedSelection
      : null,
    [activeFrameId, activeLayerId, documentId, storedSelection],
  );

  const updateSelection = useCallback((nextSelection: PixelSelection | null) => {
    storedSelectionRef.current = nextSelection;
    setStoredSelection(nextSelection);
  }, []);

  useLayoutEffect(() => {
    const previousHistoryKey = previousHistoryKeyRef.current;
    const contextChanged = previousContextKeyRef.current !== contextKey;
    previousHistoryKeyRef.current = historyKey;
    previousContextKeyRef.current = contextKey;

    const nextSelection = selectionHistoryRef.current.resolve({
      contextChanged,
      currentSelection: storedSelectionRef.current,
      nextHistoryKey: historyKey,
      previousHistoryKey,
    });
    if (nextSelection !== storedSelectionRef.current) updateSelection(nextSelection);
  }, [contextKey, historyKey, updateSelection]);

  const select = useCallback((bounds: SelectionBounds) => {
    updateSelection({
      ...bounds,
      documentId,
      frameId: activeFrameId,
      layerId: activeLayerId,
    });
  }, [activeFrameId, activeLayerId, documentId, updateSelection]);

  const deselect = useCallback(() => updateSelection(null), [updateSelection]);

  const selectAll = useCallback(() => {
    select({ x: 0, y: 0, width, height });
  }, [height, select, width]);

  const commitTransform = useCallback((
    pixels: PixelMap,
    nextSelection: PixelSelection | null,
  ) => {
    updateSelection(nextSelection);
    if (pixelMapsEqual(activePixels, pixels)) return;

    selectionHistoryRef.current.stageTransform(historyKey, selection, nextSelection);
    onCommit(pixels);
  }, [activePixels, historyKey, onCommit, selection, updateSelection]);

  const copy = useCallback(() => {
    if (!selection) return false;
    setClipboard(copySelectionPixels(activePixels, selection, width));
    return true;
  }, [activePixels, selection, width]);

  const cut = useCallback(() => {
    if (!selection || !canEdit) return false;
    setClipboard(copySelectionPixels(activePixels, selection, width));
    commitTransform(deleteSelectionPixels(activePixels, selection, width), selection);
    return true;
  }, [activePixels, canEdit, commitTransform, selection, width]);

  const remove = useCallback(() => {
    if (!selection || !canEdit) return false;
    commitTransform(deleteSelectionPixels(activePixels, selection, width), selection);
    return true;
  }, [activePixels, canEdit, commitTransform, selection, width]);

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
    commitTransform(result.pixels, {
      ...result.bounds,
      documentId,
      frameId: activeFrameId,
      layerId: activeLayerId,
    });
    return true;
  }, [activeFrameId, activeLayerId, activePixels, canEdit, clipboard, commitTransform, documentId, height, selection, width]);

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
    commitTransform(result.pixels, { ...selection, ...result.bounds });
    return true;
  }, [activePixels, canEdit, commitTransform, height, selection, width]);

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
    commitTransform(result.pixels, { ...selection, ...result.bounds });
    return true;
  }, [activePixels, canEdit, commitTransform, height, selection, width]);

  const flip = useCallback((axis: SelectionFlipAxis) => {
    if (!selection || !canEdit) return false;
    commitTransform(
      flipSelectionPixels(activePixels, selection, axis, width, height),
      selection,
    );
    return true;
  }, [activePixels, canEdit, commitTransform, height, selection, width]);

  const rotate = useCallback(() => {
    if (!selection || !canEdit) return false;
    const result = rotateSelectionPixels(activePixels, selection, width, height);
    commitTransform(result.pixels, { ...selection, ...result.bounds });
    return true;
  }, [activePixels, canEdit, commitTransform, height, selection, width]);

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
