import { describe, expect, it } from "vitest";
import {
  PROJECT_SCHEMA_VERSION,
  celKey,
  createInitialEditorState,
  getCelPixels,
  isLayerPresent,
  isLayerVisible,
  projectReducer,
  type EditorDocumentState,
  type ProjectLayer,
} from "./project";

function paintedState(): EditorDocumentState {
  return projectReducer(createInitialEditorState(), {
    type: "cel/commit",
    layerId: "layer-details",
    frameId: "frame-3",
    pixels: { "12": "#42c8e3", "13": "#42c8e3" },
  });
}

describe("project document reducer", () => {
  it("creates a versioned, editable seed document", () => {
    const state = createInitialEditorState();

    expect(state.document.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
    expect(state.document.frames).toHaveLength(8);
    expect(state.document.layers.filter((layer) => layer.kind === "pixel")).toHaveLength(3);
    expect(state.document.layers.find((layer) => layer.kind === "reference")?.locked).toBe(true);
    expect(state.isDirty).toBe(false);
  });

  it("commits pixels to only the selected layer and frame", () => {
    const state = paintedState();

    expect(getCelPixels(state.document, "layer-details", "frame-3")).toEqual({
      "12": "#42c8e3",
      "13": "#42c8e3",
    });
    expect(getCelPixels(state.document, "layer-details", "frame-2")).toEqual({});
    expect(state.isDirty).toBe(true);
    expect(state.revision).toBe(1);
  });

  it("duplicates a frame and deep-copies its cels", () => {
    const source = projectReducer(paintedState(), {
      type: "layer/toggle-visibility",
      layerId: "layer-details",
      frameId: "frame-3",
    });
    const duplicated = projectReducer(source, {
      type: "frame/duplicate",
      frameId: "frame-3",
      duplicateId: "frame-copy",
    });

    expect(duplicated.document.frames).toHaveLength(9);
    expect(duplicated.activeFrameId).toBe("frame-copy");
    expect(getCelPixels(duplicated.document, "layer-details", "frame-copy")).toEqual(
      getCelPixels(source.document, "layer-details", "frame-3"),
    );
    expect(getCelPixels(duplicated.document, "layer-details", "frame-copy")).not.toBe(
      getCelPixels(source.document, "layer-details", "frame-3"),
    );
    expect(isLayerVisible(duplicated.document, "layer-details", "frame-copy")).toBe(false);
  });

  it("deletes a layer only from the requested frame and protects the reference", () => {
    const secondFramePainted = projectReducer(paintedState(), {
      type: "cel/commit",
      layerId: "layer-details",
      frameId: "frame-4",
      pixels: { "24": "#ff615d" },
    });
    const source = projectReducer(secondFramePainted, {
      type: "layer/toggle-visibility",
      layerId: "layer-details",
      frameId: "frame-3",
    });
    const protectedState = projectReducer(source, {
      type: "layer/delete",
      layerId: "layer-reference",
      frameId: "frame-3",
    });
    const deleted = projectReducer(source, {
      type: "layer/delete",
      layerId: "layer-details",
      frameId: "frame-3",
    });

    expect(protectedState).toBe(source);
    expect(deleted.document.layers.some((layer) => layer.id === "layer-details")).toBe(true);
    expect(isLayerPresent(deleted.document, "layer-details", "frame-3")).toBe(false);
    expect(isLayerPresent(deleted.document, "layer-details", "frame-4")).toBe(true);
    expect(deleted.document.cels[celKey("layer-details", "frame-3")]).toBeUndefined();
    expect(getCelPixels(deleted.document, "layer-details", "frame-4")).toEqual({
      "24": "#ff615d",
    });
    expect(deleted.document.frameLayerVisibility[celKey("layer-details", "frame-3")]).toBeUndefined();
    expect(deleted.activeLayerId).not.toBe("layer-details");
  });

  it("adds layers to only the active frame and copies membership when duplicating", () => {
    const layer: ProjectLayer = {
      id: "layer-local",
      name: "Local layer",
      kind: "pixel",
      blendMode: "normal",
      opacity: 100,
      visible: true,
    };
    const added = projectReducer(createInitialEditorState(), {
      type: "layer/add",
      layer,
      frameId: "frame-3",
    });
    const duplicated = projectReducer(added, {
      type: "frame/duplicate",
      frameId: "frame-3",
      duplicateId: "frame-local-copy",
    });

    expect(isLayerPresent(added.document, layer.id, "frame-3")).toBe(true);
    expect(isLayerPresent(added.document, layer.id, "frame-4")).toBe(false);
    expect(isLayerPresent(duplicated.document, layer.id, "frame-local-copy")).toBe(true);

    const invalidCommit = projectReducer(added, {
      type: "cel/commit",
      layerId: layer.id,
      frameId: "frame-4",
      pixels: { "1": "#42c8e3" },
    });
    expect(invalidCommit).toBe(added);
  });

  it("keeps at least one editable pixel layer on each frame", () => {
    const initial = createInitialEditorState();
    const withoutDetails = projectReducer(initial, {
      type: "layer/delete",
      layerId: "layer-details",
      frameId: "frame-3",
    });
    const withoutHighlights = projectReducer(withoutDetails, {
      type: "layer/delete",
      layerId: "layer-highlights",
      frameId: "frame-3",
    });
    const unchanged = projectReducer(withoutHighlights, {
      type: "layer/delete",
      layerId: "layer-color",
      frameId: "frame-3",
    });

    expect(unchanged).toBe(withoutHighlights);
    expect(isLayerPresent(unchanged.document, "layer-color", "frame-3")).toBe(true);
  });

  it("scopes layer visibility to one frame and clamps animation speed", () => {
    const initial = createInitialEditorState();
    const hidden = projectReducer(initial, {
      type: "layer/toggle-visibility",
      layerId: "layer-color",
      frameId: "frame-3",
    });
    const fast = projectReducer(hidden, { type: "animation/set-fps", fps: 99 });

    expect(isLayerVisible(hidden.document, "layer-color", "frame-3")).toBe(false);
    expect(isLayerVisible(hidden.document, "layer-color", "frame-4")).toBe(true);
    expect(fast.document.animation.fps).toBe(30);
    expect(fast.isDirty).toBe(true);
  });

  it("keeps at least one frame", () => {
    let state = createInitialEditorState();
    for (const frame of state.document.frames.slice(1)) {
      state = projectReducer(state, { type: "frame/delete", frameId: frame.id });
    }
    const lastFrameId = state.document.frames[0].id;
    const unchanged = projectReducer(state, { type: "frame/delete", frameId: lastFrameId });

    expect(state.document.frames).toHaveLength(1);
    expect(unchanged).toBe(state);
  });
});
