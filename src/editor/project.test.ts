import { describe, expect, it } from "vitest";
import {
  PROJECT_SCHEMA_VERSION,
  celKey,
  createInitialEditorState,
  createNewProjectDocument,
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
  it("creates a clean custom blank project with one editable frame", () => {
    const document = createNewProjectDocument({
      template: "blank",
      name: "tiny hero",
      width: 32,
      height: 48,
      now: "2026-07-20T12:00:00.000Z",
    });

    expect(document.name).toBe("tiny hero.jtp");
    expect(document.width).toBe(32);
    expect(document.height).toBe(48);
    expect(document.frames).toEqual([{
      id: "frame-1",
      name: "Frame 1",
      referenceOffset: "50% 50%",
    }]);
    expect(document.layers).toMatchObject([{
      id: "layer-1",
      name: "Layer 1",
      kind: "pixel",
      visible: true,
    }]);
    expect(document.layers.some((layer) => layer.kind === "reference")).toBe(false);
    expect(document.workspace.activeFrameId).toBe("frame-1");
    expect(document.createdAt).toBe("2026-07-20T12:00:00.000Z");

    const state = createInitialEditorState();
    const replaced = projectReducer(state, {
      type: "document/replace",
      document,
    });
    expect(replaced.activeFrameId).toBe("frame-1");
    expect(replaced.activeLayerId).toBe("layer-1");
    expect(replaced.isDirty).toBe(false);
  });

  it("creates a freshly identified Courier Practice project", () => {
    const document = createNewProjectDocument({
      template: "courier",
      name: "courier lesson.jtp",
      now: "2026-07-20T12:00:00.000Z",
    });

    expect(document.id).toMatch(/^project-/);
    expect(document.id).not.toBe("project-courier-bloom");
    expect(document.name).toBe("courier lesson.jtp");
    expect(document.width).toBe(64);
    expect(document.height).toBe(64);
    expect(document.frames).toHaveLength(8);
    expect(document.layers.find((layer) => layer.kind === "reference")?.locked).toBe(true);
    expect(document.workspace.activeFrameId).toBe("frame-3");
  });

  it("rejects unsafe project names and canvas dimensions", () => {
    expect(() => createNewProjectDocument({
      template: "blank",
      name: "bad/name",
      width: 32,
      height: 32,
    })).toThrow(/file-system symbols/);
    expect(() => createNewProjectDocument({
      template: "blank",
      name: "too-wide",
      width: 513,
      height: 32,
    })).toThrow(/between 1 and 512/);
    expect(() => createNewProjectDocument({
      template: "blank",
      name: "fractional",
      width: 31.5,
      height: 32,
    })).toThrow(/between 1 and 512/);
  });

  it("creates a versioned, editable seed document", () => {
    const state = createInitialEditorState();

    expect(state.document.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
    expect(state.document.frames).toHaveLength(8);
    expect(state.document.layers.filter((layer) => layer.kind === "pixel")).toHaveLength(3);
    expect(state.document.layers.find((layer) => layer.kind === "reference")?.locked).toBe(true);
    expect(state.document.workspace.activeFrameId).toBe("frame-3");
    expect(state.frameLayerSelection["frame-3"]).toBe("layer-details");
    expect(state.isDirty).toBe(false);
  });

  it("remembers the selected layer independently for every frame", () => {
    let state = projectReducer(createInitialEditorState(), {
      type: "layer/select",
      layerId: "layer-color",
    });
    state = projectReducer(state, { type: "frame/select", frameId: "frame-4" });

    expect(state.activeLayerId).toBe("layer-details");

    state = projectReducer(state, {
      type: "layer/select",
      layerId: "layer-highlights",
    });
    state = projectReducer(state, { type: "frame/select", frameId: "frame-3" });
    expect(state.activeLayerId).toBe("layer-color");

    state = projectReducer(state, { type: "frame/select", frameId: "frame-4" });
    expect(state.activeLayerId).toBe("layer-highlights");
    expect(state.frameLayerSelection).toMatchObject({
      "frame-3": "layer-color",
      "frame-4": "layer-highlights",
    });
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
    expect(deleted.frameLayerSelection["frame-3"]).toBe(deleted.activeLayerId);
    expect(deleted.frameLayerSelection["frame-4"]).toBe("layer-details");
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
    expect(added.frameLayerSelection["frame-3"]).toBe(layer.id);
    expect(duplicated.activeLayerId).toBe(layer.id);
    expect(duplicated.frameLayerSelection["frame-local-copy"]).toBe(layer.id);

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

  it("restores the saved active frame and marks saved metadata", () => {
    const initial = createInitialEditorState();
    const replacement = {
      ...initial.document,
      name: "opened-project.jtp",
      frames: initial.document.frames.slice(0, 2),
      workspace: { activeFrameId: "frame-2" },
    };
    const recovered = projectReducer(initial, {
      type: "document/replace",
      document: replacement,
      dirty: true,
    });

    expect(recovered.document).toBe(replacement);
    expect(recovered.activeFrameId).toBe("frame-2");
    expect(recovered.activeLayerId).toBe("layer-details");
    expect(recovered.isDirty).toBe(true);
    expect(recovered.revision).toBe(1);

    const savedDocument = { ...replacement, name: "saved-project.jtp" };
    const saved = projectReducer(recovered, {
      type: "document/mark-saved",
      document: savedDocument,
    });
    expect(saved.document).toBe(savedDocument);
    expect(saved.activeFrameId).toBe("frame-2");
    expect(saved.isDirty).toBe(false);
  });
});
