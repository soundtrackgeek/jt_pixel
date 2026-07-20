import { useCallback, useMemo, useReducer } from "react";
import {
  createInitialEditorState,
  createProjectId,
  getCelPixels,
  projectReducer,
  type PixelMap,
  type ProjectLayer,
} from "../editor/project";

export function useProjectDocument() {
  const [state, dispatch] = useReducer(projectReducer, undefined, createInitialEditorState);

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

  const selectLayer = useCallback((layerId: string) => dispatch({ type: "layer/select", layerId }), []);
  const toggleLayerVisibility = useCallback(
    (layerId: string) => dispatch({ type: "layer/toggle-visibility", layerId }),
    [],
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
    dispatch({ type: "layer/add", layer });
  }, [state.document.layers]);
  const deleteLayer = useCallback((layerId: string) => dispatch({ type: "layer/delete", layerId }), []);
  const selectFrame = useCallback((frameId: string) => dispatch({ type: "frame/select", frameId }), []);
  const advanceFrame = useCallback(() => dispatch({ type: "frame/advance" }), []);
  const duplicateFrame = useCallback(
    (frameId: string) => dispatch({ type: "frame/duplicate", frameId, duplicateId: createProjectId("frame") }),
    [],
  );
  const deleteFrame = useCallback((frameId: string) => dispatch({ type: "frame/delete", frameId }), []);
  const setFps = useCallback((fps: number) => dispatch({ type: "animation/set-fps", fps }), []);
  const commitActiveCel = useCallback(
    (pixels: PixelMap) => dispatch({
      type: "cel/commit",
      layerId: state.activeLayerId,
      frameId: state.activeFrameId,
      pixels,
    }),
    [state.activeFrameId, state.activeLayerId],
  );
  const clearActiveCel = useCallback(
    () => dispatch({ type: "cel/clear", layerId: state.activeLayerId, frameId: state.activeFrameId }),
    [state.activeFrameId, state.activeLayerId],
  );

  return {
    state,
    activeLayer,
    activeFrame,
    activePixels,
    selectLayer,
    toggleLayerVisibility,
    addLayer,
    deleteLayer,
    selectFrame,
    advanceFrame,
    duplicateFrame,
    deleteFrame,
    setFps,
    commitActiveCel,
    clearActiveCel,
  };
}
