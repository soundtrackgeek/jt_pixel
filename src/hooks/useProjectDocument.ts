import { useCallback, useMemo, useReducer } from "react";
import {
  createInitialHistoryState,
  editorHistoryReducer,
} from "../editor/history";
import {
  createProjectId,
  getCelPixels,
  getLayerForFrame,
  type LayerBlendMode,
  type PixelMap,
  type ProjectAction,
  type ProjectDocument,
  type ProjectLayer,
} from "../editor/project";
import type { ColorReplacementScope } from "../editor/colorOperations";
import type { SelectionBounds } from "../types";
import type { TileWorkspaceSettings } from "../editor/tiles";

export function useProjectDocument() {
  const [history, dispatch] = useReducer(
    editorHistoryReducer,
    undefined,
    createInitialHistoryState,
  );
  const state = history.present.state;

  const apply = useCallback(
    (action: ProjectAction) => dispatch({
      type: "history/apply",
      action,
    }),
    [],
  );

  const activeLayer = useMemo(
    () => getLayerForFrame(state.document, state.activeLayerId, state.activeFrameId) ?? state.document.layers[0],
    [state.activeFrameId, state.activeLayerId, state.document],
  );
  const activeFrame = useMemo(
    () => state.document.frames.find((frame) => frame.id === state.activeFrameId) ?? state.document.frames[0],
    [state.activeFrameId, state.document.frames],
  );
  const activePixels = useMemo(
    () => getCelPixels(state.document, activeLayer.id, activeFrame.id),
    [activeFrame.id, activeLayer.id, state.document],
  );

  const selectLayer = useCallback((layerId: string) => apply({ type: "layer/select", layerId }), [apply]);
  const toggleLayerVisibility = useCallback(
    (layerId: string) => apply({
      type: "layer/toggle-visibility",
      layerId,
      frameId: state.activeFrameId,
    }),
    [apply, state.activeFrameId],
  );
  const toggleLayerLock = useCallback(
    (layerId: string) => apply({
      type: "layer/toggle-lock",
      layerId,
      frameId: state.activeFrameId,
    }),
    [apply, state.activeFrameId],
  );
  const addLayer = useCallback(() => {
    const layer: ProjectLayer = {
      id: createProjectId("layer"),
      name: `Layer ${state.document.layers.filter((candidate) => candidate.kind === "pixel").length + 1}`,
      kind: "pixel",
      blendMode: "normal",
      opacity: 100,
      visible: true,
    };
    apply({ type: "layer/add", layer, frameId: state.activeFrameId });
  }, [apply, state.activeFrameId, state.document.layers]);
  const deleteLayer = useCallback(
    (layerId: string) => apply({
      type: "layer/delete",
      layerId,
      frameId: state.activeFrameId,
    }),
    [apply, state.activeFrameId],
  );
  const duplicateLayer = useCallback(
    (layerId: string) => apply({
      type: "layer/duplicate",
      layerId,
      frameId: state.activeFrameId,
      duplicateId: createProjectId("layer"),
    }),
    [apply, state.activeFrameId],
  );
  const renameLayer = useCallback(
    (layerId: string, name: string) => apply({
      type: "layer/rename",
      layerId,
      frameId: state.activeFrameId,
      name,
    }),
    [apply, state.activeFrameId],
  );
  const setLayerOpacity = useCallback(
    (layerId: string, opacity: number) => apply({
      type: "layer/set-opacity",
      layerId,
      frameId: state.activeFrameId,
      opacity,
    }),
    [apply, state.activeFrameId],
  );
  const setLayerBlendMode = useCallback(
    (layerId: string, blendMode: LayerBlendMode) => apply({
      type: "layer/set-blend-mode",
      layerId,
      frameId: state.activeFrameId,
      blendMode,
    }),
    [apply, state.activeFrameId],
  );
  const reorderLayer = useCallback(
    (layerId: string, targetIndex: number) => apply({
      type: "layer/reorder",
      layerId,
      frameId: state.activeFrameId,
      targetIndex,
    }),
    [apply, state.activeFrameId],
  );
  const mergeLayerDown = useCallback(
    (layerId: string) => apply({ type: "layer/merge-down", layerId, frameId: state.activeFrameId }),
    [apply, state.activeFrameId],
  );
  const flattenVisibleLayers = useCallback(
    () => apply({ type: "layer/flatten-visible", frameId: state.activeFrameId }),
    [apply, state.activeFrameId],
  );
  const selectFrame = useCallback((frameId: string) => apply({ type: "frame/select", frameId }), [apply]);
  const advanceFrame = useCallback(() => apply({ type: "frame/advance" }), [apply]);
  const duplicateFrame = useCallback(
    (frameId: string) => apply({ type: "frame/duplicate", frameId, duplicateId: createProjectId("frame") }),
    [apply],
  );
  const duplicateFrames = useCallback((frameIds: string[]) => {
    const requestedIds = new Set(frameIds);
    const orderedFrameIds = state.document.frames
      .filter((frame) => requestedIds.has(frame.id))
      .map((frame) => frame.id);
    if (orderedFrameIds.length === 0) return [];
    const duplicateIds = orderedFrameIds.map(() => createProjectId("frame"));
    apply({
      type: "frame/duplicate-many",
      frameIds: orderedFrameIds,
      duplicateIds,
    });
    return duplicateIds;
  }, [apply, state.document.frames]);
  const deleteFrame = useCallback((frameId: string) => apply({ type: "frame/delete", frameId }), [apply]);
  const deleteFrames = useCallback(
    (frameIds: string[]) => apply({ type: "frame/delete-many", frameIds }),
    [apply],
  );
  const reorderFrames = useCallback(
    (frameIds: string[], targetIndex: number) => apply({
      type: "frame/reorder",
      frameIds,
      targetIndex,
    }),
    [apply],
  );
  const setFrameHold = useCallback(
    (frameIds: string[], hold: number) => apply({ type: "frame/set-hold", frameIds, hold }),
    [apply],
  );
  const setFps = useCallback((fps: number) => apply({ type: "animation/set-fps", fps }), [apply]);
  const toggleLoop = useCallback(() => apply({ type: "animation/toggle-loop" }), [apply]);
  const setTileSettings = useCallback(
    (settings: Partial<TileWorkspaceSettings>) => apply({
      type: "tiles/set-settings",
      settings,
    }),
    [apply],
  );
  const setPalette = useCallback(
    (palette: string[]) => apply({ type: "palette/set", palette }),
    [apply],
  );
  const replaceColor = useCallback((options: {
    bounds?: SelectionBounds;
    scope: ColorReplacementScope;
    sourceColor: string;
    targetColor: string;
    updatePaletteIndex?: number;
  }) => apply({ type: "color/replace", ...options }), [apply]);
  const beginFpsChange = useCallback(
    () => dispatch({ type: "history/group-start", groupId: "animation-fps" }),
    [],
  );
  const endFpsChange = useCallback(
    () => dispatch({ type: "history/group-end", groupId: "animation-fps" }),
    [],
  );
  const beginLayerOpacityChange = useCallback(
    () => dispatch({ type: "history/group-start", groupId: "layer-opacity" }),
    [],
  );
  const endLayerOpacityChange = useCallback(
    () => dispatch({ type: "history/group-end", groupId: "layer-opacity" }),
    [],
  );
  const replaceDocument = useCallback(
    (document: ProjectDocument, dirty = false) => apply({
      type: "document/replace",
      document,
      dirty,
    }),
    [apply],
  );
  const commitDocument = useCallback((
    document: ProjectDocument,
    activeFrameId?: string,
    activeLayerId?: string,
  ) => apply({
    type: "document/commit",
    document,
    activeFrameId,
    activeLayerId,
  }), [apply]);
  const markSaved = useCallback(
    (document?: ProjectDocument) => apply({ type: "document/mark-saved", document }),
    [apply],
  );
  const commitActiveCel = useCallback(
    (pixels: PixelMap) => apply({
      type: "cel/commit",
      layerId: state.activeLayerId,
      frameId: state.activeFrameId,
      pixels,
    }),
    [apply, state.activeFrameId, state.activeLayerId],
  );
  const clearActiveCel = useCallback(
    () => apply({ type: "cel/clear", layerId: state.activeLayerId, frameId: state.activeFrameId }),
    [apply, state.activeFrameId, state.activeLayerId],
  );
  const undo = useCallback(() => dispatch({ type: "history/undo" }), []);
  const redo = useCallback(() => dispatch({ type: "history/redo" }), []);

  return {
    state,
    historyEntryId: history.present.id,
    activeLayer,
    activeFrame,
    activePixels,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    selectLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    addLayer,
    deleteLayer,
    duplicateLayer,
    renameLayer,
    setLayerOpacity,
    setLayerBlendMode,
    reorderLayer,
    mergeLayerDown,
    flattenVisibleLayers,
    selectFrame,
    advanceFrame,
    duplicateFrame,
    duplicateFrames,
    deleteFrame,
    deleteFrames,
    reorderFrames,
    setFrameHold,
    setFps,
    toggleLoop,
    setTileSettings,
    setPalette,
    replaceColor,
    beginFpsChange,
    endFpsChange,
    beginLayerOpacityChange,
    endLayerOpacityChange,
    replaceDocument,
    commitDocument,
    markSaved,
    commitActiveCel,
    clearActiveCel,
    undo,
    redo,
  };
}
