import { describe, expect, it } from "vitest";
import {
  HISTORY_LIMIT,
  createInitialHistoryState,
  editorHistoryReducer,
  type EditorHistoryAction,
  type EditorHistoryState,
} from "./history";
import { celKey, getCelPixels, isLayerLocked } from "./project";

function reduce(
  history: EditorHistoryState,
  action: EditorHistoryAction,
) {
  return editorHistoryReducer(history, action);
}

function paint(history: EditorHistoryState, index: number, color = "#42c8e3") {
  return reduce(history, {
    type: "history/apply",
    action: {
      type: "cel/commit",
      layerId: "layer-details",
      frameId: "frame-3",
      pixels: { [index]: color },
    },
  });
}

describe("editor history", () => {
  it("undoes and redoes palette edits and scoped color replacement", () => {
    const painted = paint(createInitialHistoryState(), 12);
    const paletteEdited = reduce(painted, {
      type: "history/apply",
      action: { type: "palette/set", palette: ["#42c8e3", "#ff615d"] },
    });
    const recolored = reduce(paletteEdited, {
      type: "history/apply",
      action: {
        type: "color/replace",
        sourceColor: "#42c8e3",
        targetColor: "#ff615d",
        scope: "cel",
        updatePaletteIndex: 0,
      },
    });
    const replacementUndone = reduce(recolored, { type: "history/undo" });
    const paletteUndone = reduce(replacementUndone, { type: "history/undo" });
    const paletteRedone = reduce(paletteUndone, { type: "history/redo" });
    const replacementRedone = reduce(paletteRedone, { type: "history/redo" });

    expect(getCelPixels(recolored.present.state.document, "layer-details", "frame-3"))
      .toEqual({ 12: "#ff615d" });
    expect(replacementUndone.present.state.document.palette)
      .toEqual(["#42c8e3", "#ff615d"]);
    expect(paletteUndone.present.state.document.palette)
      .toContain("#152034");
    expect(replacementRedone.present.state.document.palette)
      .toEqual(["#ff615d"]);
  });

  it("undoes and redoes frame-local layer locks", () => {
    const initial = createInitialHistoryState();
    const locked = reduce(initial, {
      type: "history/apply",
      action: {
        type: "layer/toggle-lock",
        layerId: "layer-details",
        frameId: "frame-3",
      },
    });
    const undone = reduce(locked, { type: "history/undo" });
    const redone = reduce(undone, { type: "history/redo" });

    expect(isLayerLocked(locked.present.state.document, "layer-details", "frame-3")).toBe(true);
    expect(isLayerLocked(locked.present.state.document, "layer-details", "frame-4")).toBe(false);
    expect(isLayerLocked(undone.present.state.document, "layer-details", "frame-3")).toBe(false);
    expect(isLayerLocked(redone.present.state.document, "layer-details", "frame-3")).toBe(true);
  });

  it("undoes and redoes one completed cel commit", () => {
    const initial = createInitialHistoryState();
    const painted = paint(initial, 12);
    const undone = reduce(painted, { type: "history/undo" });
    const redone = reduce(undone, { type: "history/redo" });

    expect(painted.past).toHaveLength(1);
    expect(getCelPixels(painted.present.state.document, "layer-details", "frame-3"))
      .toEqual({ 12: "#42c8e3" });
    expect(undone.present.state.isDirty).toBe(false);
    expect(getCelPixels(undone.present.state.document, "layer-details", "frame-3"))
      .toEqual({});
    expect(redone.present.state.isDirty).toBe(true);
    expect(getCelPixels(redone.present.state.document, "layer-details", "frame-3"))
      .toEqual({ 12: "#42c8e3" });
  });

  it("does not record frame or layer navigation", () => {
    const initial = createInitialHistoryState();
    const frameSelected = reduce(initial, {
      type: "history/apply",
      action: { type: "frame/select", frameId: "frame-4" },
    });
    const layerSelected = reduce(frameSelected, {
      type: "history/apply",
      action: { type: "layer/select", layerId: "layer-color" },
    });

    expect(layerSelected.past).toHaveLength(0);
    expect(layerSelected.present.id).toBe(initial.present.id);
    expect(layerSelected.present.state.activeFrameId).toBe("frame-4");
    expect(layerSelected.present.state.activeLayerId).toBe("layer-color");
    expect(layerSelected.present.state.isDirty).toBe(false);
  });

  it("restores structural edit context and clears redo after a branch", () => {
    const initial = createInitialHistoryState();
    const duplicated = reduce(initial, {
      type: "history/apply",
      action: {
        type: "frame/duplicate",
        frameId: "frame-3",
        duplicateId: "frame-copy",
      },
    });
    const navigated = reduce(duplicated, {
      type: "history/apply",
      action: { type: "frame/select", frameId: "frame-6" },
    });
    const undone = reduce(navigated, { type: "history/undo" });
    const redone = reduce(undone, { type: "history/redo" });
    const branched = paint(undone, 8, "#ff615d");

    expect(undone.present.state.document.frames.some((frame) => frame.id === "frame-copy"))
      .toBe(false);
    expect(undone.present.state.activeFrameId).toBe("frame-3");
    expect(redone.present.state.activeFrameId).toBe("frame-copy");
    expect(branched.future).toHaveLength(0);
    expect(reduce(branched, { type: "history/redo" })).toBe(branched);
  });

  it("tracks the saved checkpoint without discarding history", () => {
    const initial = createInitialHistoryState();
    const firstEdit = paint(initial, 1);
    const saved = reduce(firstEdit, {
      type: "history/apply",
      action: { type: "document/mark-saved" },
    });
    const secondEdit = paint(saved, 2, "#ff615d");
    const backToSaved = reduce(secondEdit, { type: "history/undo" });
    const beforeSaved = reduce(backToSaved, { type: "history/undo" });
    const savedAgain = reduce(beforeSaved, { type: "history/redo" });

    expect(saved.past).toHaveLength(1);
    expect(saved.present.state.isDirty).toBe(false);
    expect(backToSaved.present.state.isDirty).toBe(false);
    expect(beforeSaved.present.state.isDirty).toBe(true);
    expect(savedAgain.present.state.isDirty).toBe(false);
  });

  it("keeps a Save As name while moving through existing history", () => {
    const firstEdit = paint(createInitialHistoryState(), 1);
    const secondEdit = paint(firstEdit, 2, "#ff615d");
    const undone = reduce(secondEdit, { type: "history/undo" });
    const savedDocument = {
      ...undone.present.state.document,
      name: "courier-final.jtp",
    };
    const saved = reduce(undone, {
      type: "history/apply",
      action: { type: "document/mark-saved", document: savedDocument },
    });
    const redone = reduce(saved, { type: "history/redo" });

    expect(redone.present.state.document.name).toBe("courier-final.jtp");
    expect(redone.present.state.isDirty).toBe(true);
  });

  it("resets history when another document is opened", () => {
    const painted = paint(createInitialHistoryState(), 12);
    const replacement = {
      ...painted.present.state.document,
      id: "opened-project",
      name: "opened-project.jtp",
    };
    const opened = reduce(painted, {
      type: "history/apply",
      action: { type: "document/replace", document: replacement },
    });

    expect(opened.past).toHaveLength(0);
    expect(opened.future).toHaveLength(0);
    expect(opened.present.state.document).toBe(replacement);
    expect(opened.present.state.isDirty).toBe(false);
  });

  it("records layer, frame, clear-cel, and animation operations", () => {
    let history = paint(createInitialHistoryState(), 4);
    history = reduce(history, {
      type: "history/apply",
      action: {
        type: "cel/clear",
        layerId: "layer-details",
        frameId: "frame-3",
      },
    });
    history = reduce(history, {
      type: "history/apply",
      action: {
        type: "layer/toggle-visibility",
        layerId: "layer-color",
        frameId: "frame-3",
      },
    });
    history = reduce(history, {
      type: "history/apply",
      action: {
        type: "layer/add",
        frameId: "frame-3",
        layer: {
          id: "layer-test",
          name: "Test layer",
          kind: "pixel",
          blendMode: "normal",
          opacity: 100,
          visible: true,
        },
      },
    });
    history = reduce(history, {
      type: "history/apply",
      action: {
        type: "layer/delete",
        layerId: "layer-test",
        frameId: "frame-3",
      },
    });
    history = reduce(history, {
      type: "history/apply",
      action: {
        type: "frame/duplicate",
        frameId: "frame-3",
        duplicateId: "frame-test",
      },
    });
    history = reduce(history, {
      type: "history/apply",
      action: { type: "frame/delete", frameId: "frame-test" },
    });
    history = reduce(history, {
      type: "history/apply",
      action: { type: "animation/set-fps", fps: 12 },
    });

    expect(history.past).toHaveLength(8);
    expect(history.present.state.document.animation.fps).toBe(12);
    const undone = reduce(history, { type: "history/undo" });
    expect(undone.present.state.document.animation.fps).toBe(8);
  });

  it("groups a complete FPS slider gesture into one history step", () => {
    const painted = paint(createInitialHistoryState(), 4);
    let history = reduce(painted, {
      type: "history/group-start",
      groupId: "animation-fps",
    });
    for (const fps of [9, 12, 18]) {
      history = reduce(history, {
        type: "history/apply",
        action: { type: "animation/set-fps", fps },
      });
    }
    history = reduce(history, {
      type: "history/group-end",
      groupId: "animation-fps",
    });

    expect(history.past).toHaveLength(2);
    expect(history.present.state.document.animation.fps).toBe(18);

    const fpsUndone = reduce(history, { type: "history/undo" });
    expect(fpsUndone.present.state.document.animation.fps).toBe(8);
    expect(getCelPixels(fpsUndone.present.state.document, "layer-details", "frame-3"))
      .toEqual({ 4: "#42c8e3" });

    const paintUndone = reduce(fpsUndone, { type: "history/undo" });
    expect(getCelPixels(paintUndone.present.state.document, "layer-details", "frame-3"))
      .toEqual({});

    const paintRedone = reduce(paintUndone, { type: "history/redo" });
    const fpsRedone = reduce(paintRedone, { type: "history/redo" });
    expect(fpsRedone.present.state.document.animation.fps).toBe(18);
  });

  it("keeps separate FPS button changes as separate history steps", () => {
    let history = createInitialHistoryState();
    history = reduce(history, {
      type: "history/apply",
      action: { type: "animation/set-fps", fps: 9 },
    });
    history = reduce(history, {
      type: "history/apply",
      action: { type: "animation/set-fps", fps: 10 },
    });

    expect(history.past).toHaveLength(2);
    const onceUndone = reduce(history, { type: "history/undo" });
    const twiceUndone = reduce(onceUndone, { type: "history/undo" });
    expect(onceUndone.present.state.document.animation.fps).toBe(9);
    expect(twiceUndone.present.state.document.animation.fps).toBe(8);
  });

  it("ignores rejected edits and bounds retained history", () => {
    let history = createInitialHistoryState();
    const rejected = reduce(history, {
      type: "history/apply",
      action: {
        type: "cel/commit",
        layerId: "layer-reference",
        frameId: "frame-3",
        pixels: { 0: "#ffffff" },
      },
    });
    expect(rejected).toBe(history);

    for (let index = 0; index < HISTORY_LIMIT + 5; index += 1) {
      history = paint(history, index, index % 2 === 0 ? "#42c8e3" : "#ff615d");
    }

    expect(history.past).toHaveLength(HISTORY_LIMIT);
    expect(history.present.state.document.cels[celKey("layer-details", "frame-3")])
      .toBeDefined();
  });
});
