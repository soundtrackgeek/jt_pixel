import { useCallback, useMemo, useReducer } from "react";
import {
  createInitialHistoryState,
  editorHistoryReducer,
} from "../editor/history";
import {
  createProjectId,
  getCelPixels,
  type PixelMap,
  type ProjectAction,
  type ProjectDocument,
  type ProjectLayer,
} from "../editor/project";

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
    () => state.document.layers.find((layer) => layer.id === state.activeLayerId) ?? state.document.layers[0],
    [state.activeLayerId, state.document.layers],
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
  const selectFrame = useCallback((frameId: string) => apply({ type: "frame/select", frameId }), [apply]);
  const advanceFrame = useCallback(() => apply({ type: "frame/advance" }), [apply]);
  const duplicateFrame = useCallback(
    (frameId: string) => apply({ type: "frame/duplicate", frameId, duplicateId: createProjectId("frame") }),
    [apply],
  );
  const deleteFrame = useCallback((frameId: string) => apply({ type: "frame/delete", frameId }), [apply]);
  const setFps = useCallback((fps: number) => apply({ type: "animation/set-fps", fps }), [apply]);
  const beginFpsChange = useCallback(
    () => dispatch({ type: "history/group-start", groupId: "animation-fps" }),
    [],
  );
  const endFpsChange = useCallback(
    () => dispatch({ type: "history/group-end", groupId: "animation-fps" }),
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
    selectFrame,
    advanceFrame,
    duplicateFrame,
    deleteFrame,
    setFps,
    beginFpsChange,
    endFpsChange,
    replaceDocument,
    markSaved,
    commitActiveCel,
    clearActiveCel,
    undo,
    redo,
  };
}
