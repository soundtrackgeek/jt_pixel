import { describe, expect, it } from "vitest";
import {
  PROJECT_SCHEMA_VERSION,
  celKey,
  createInitialEditorState,
  getCelPixels,
  isLayerVisible,
  projectReducer,
  type EditorDocumentState,
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

  it("deletes editable layers and their cels but protects the reference", () => {
    const source = projectReducer(paintedState(), {
      type: "layer/toggle-visibility",
      layerId: "layer-details",
      frameId: "frame-3",
    });
    const protectedState = projectReducer(source, { type: "layer/delete", layerId: "layer-reference" });
    const deleted = projectReducer(source, { type: "layer/delete", layerId: "layer-details" });

    expect(protectedState).toBe(source);
    expect(deleted.document.layers.some((layer) => layer.id === "layer-details")).toBe(false);
    expect(deleted.document.cels[celKey("layer-details", "frame-3")]).toBeUndefined();
    expect(deleted.document.frameLayerVisibility[celKey("layer-details", "frame-3")]).toBeUndefined();
    expect(deleted.activeLayerId).not.toBe("layer-details");
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
