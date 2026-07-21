import { describe, expect, it } from "vitest";
import {
  celKey,
  createEditorStateForDocument,
  createNewProjectDocument,
  createProjectDocument,
} from "./project";
import {
  ProjectFileError,
  createRecoverySnapshot,
  ensureProjectExtension,
  parseProjectDocument,
  parseRecoverySnapshot,
  prepareProjectDocumentForSave,
  projectFileName,
  serializeProjectDocument,
  serializeRecoverySnapshot,
} from "./projectFile";

function projectWithPixels() {
  const document = createProjectDocument("2026-07-20T10:00:00.000Z");
  document.cels[celKey("layer-details", "frame-3")] = {
    layerId: "layer-details",
    frameId: "frame-3",
    pixels: { "12": "#42c8e3", "13": "#42c8e380" },
  };
  document.frameLayerVisibility[celKey("layer-color", "frame-4")] = false;
  document.frameLayerLocks[celKey("layer-details", "frame-3")] = true;
  return document;
}

describe("project files", () => {
  it("round-trips a custom blank project", () => {
    const source = createNewProjectDocument({
      template: "blank",
      name: "portrait-study",
      width: 24,
      height: 40,
      now: "2026-07-20T09:00:00.000Z",
    });
    const parsed = parseProjectDocument(serializeProjectDocument(source));

    expect(parsed).toEqual(source);
    expect(parsed.layers).toHaveLength(1);
    expect(parsed.frames).toHaveLength(1);
    expect(parsed.width).toBe(24);
    expect(parsed.height).toBe(40);
  });

  it("round-trips a complete project document", () => {
    const source = projectWithPixels();
    const parsed = parseProjectDocument(serializeProjectDocument(source));

    expect(parsed).toEqual(source);
    expect(parsed).not.toBe(source);
    expect(parsed.workspace.activeFrameId).toBe("frame-3");
    expect(parsed.cels[celKey("layer-details", "frame-3")].pixels).toEqual({
      "12": "#42c8e3",
      "13": "#42c8e380",
    });
    expect(parsed.frameLayerLocks[celKey("layer-details", "frame-3")]).toBe(true);
  });

  it("rejects incompatible schemas and unsafe pixel references", () => {
    const incompatible = { ...projectWithPixels(), schemaVersion: 99 };
    expect(() => parseProjectDocument(JSON.stringify(incompatible))).toThrow(
      /supports schema 1/,
    );

    const invalidPixels = projectWithPixels();
    invalidPixels.cels[celKey("layer-details", "frame-3")].pixels["999999"] = "#ffffff";
    expect(() => parseProjectDocument(JSON.stringify(invalidPixels))).toThrow(
      /out-of-range pixel index/,
    );
  });

  it("reports malformed files with a project-specific error", () => {
    expect(() => parseProjectDocument("{ definitely not json")).toThrow(ProjectFileError);
    expect(() => parseProjectDocument("{ definitely not json")).toThrow(/not valid JSON/);
  });

  it("opens older files on frame 1 and rejects unknown saved frames", () => {
    const legacy = projectWithPixels() as Partial<ReturnType<typeof projectWithPixels>>;
    delete legacy.workspace;
    expect(parseProjectDocument(JSON.stringify(legacy)).workspace.activeFrameId).toBe(
      "frame-1",
    );

    const legacyTiles = projectWithPixels() as ReturnType<typeof projectWithPixels>;
    const legacyWorkspace = legacyTiles.workspace as Partial<typeof legacyTiles.workspace>;
    delete legacyWorkspace.tiles;
    expect(parseProjectDocument(JSON.stringify(legacyTiles)).workspace.tiles).toEqual({
      mode: "standard",
      repeatPreview: "off",
      symmetry: "off",
    });

    const legacyLocks = projectWithPixels() as Partial<ReturnType<typeof projectWithPixels>>;
    delete legacyLocks.frameLayerLocks;
    expect(parseProjectDocument(JSON.stringify(legacyLocks)).frameLayerLocks).toEqual({});

    const legacyHolds = structuredClone(projectWithPixels()) as unknown as {
      frames: Array<Record<string, unknown>>;
    };
    for (const frame of legacyHolds.frames) delete frame.hold;
    expect(parseProjectDocument(JSON.stringify(legacyHolds)).frames.every(
      (frame) => frame.hold === 1,
    )).toBe(true);

    const invalidWorkspace = {
      ...projectWithPixels(),
      workspace: { activeFrameId: "frame-missing" },
    };
    expect(() => parseProjectDocument(JSON.stringify(invalidWorkspace))).toThrow(
      /unknown frame/,
    );
  });

  it("rejects frame holds outside the supported range", () => {
    const invalid = projectWithPixels();
    invalid.frames[0].hold = 13;
    expect(() => parseProjectDocument(JSON.stringify(invalid))).toThrow(/hold must be between 1 and 12/);
  });

  it("round-trips tile settings and rejects unsupported workspace values", () => {
    const source = projectWithPixels();
    source.workspace.tiles = {
      mode: "seamless",
      repeatPreview: "3x3",
      symmetry: "quad",
    };
    expect(parseProjectDocument(serializeProjectDocument(source)).workspace.tiles)
      .toEqual(source.workspace.tiles);

    const invalid = structuredClone(source) as unknown as {
      workspace: { tiles: { mode: string } };
    };
    invalid.workspace.tiles.mode = "infinite";
    expect(() => parseProjectDocument(JSON.stringify(invalid))).toThrow(
      /workspace\.tiles\.mode is not supported/,
    );
  });

  it("round-trips a versioned recovery snapshot", () => {
    const snapshot = createRecoverySnapshot(
      projectWithPixels(),
      "2026-07-20T11:30:00.000Z",
    );
    const parsed = parseRecoverySnapshot(serializeRecoverySnapshot(snapshot));

    expect(parsed).toEqual(snapshot);
  });

  it("normalizes project file names and save metadata", () => {
    expect(ensureProjectExtension("C:\\Sprites\\courier")).toBe(
      "C:\\Sprites\\courier.jtp",
    );
    expect(ensureProjectExtension("courier.JTP")).toBe("courier.JTP");
    expect(projectFileName("C:\\Sprites\\courier.jtp")).toBe("courier.jtp");

    const saved = prepareProjectDocumentForSave(
      projectWithPixels(),
      "C:\\Sprites\\courier-final.jtp",
      {
        activeFrameId: "frame-4",
        savedAt: "2026-07-20T12:00:00.000Z",
      },
    );
    expect(saved.name).toBe("courier-final.jtp");
    expect(saved.updatedAt).toBe("2026-07-20T12:00:00.000Z");
    expect(saved.workspace.activeFrameId).toBe("frame-4");
    expect(saved.workspace.tiles).toEqual(projectWithPixels().workspace.tiles);

    const reopened = createEditorStateForDocument(
      parseProjectDocument(serializeProjectDocument(saved)),
    );
    expect(reopened.activeFrameId).toBe("frame-4");
  });
});
