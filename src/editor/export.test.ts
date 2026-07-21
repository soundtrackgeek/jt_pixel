import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXPORT_PREFERENCES,
  calculateExportLayout,
  composeFramePixels,
  exportFileName,
  gifFrameDelayMs,
  getExportValidationError,
  parseExportPreferences,
  renderAnimationExport,
  renderProjectExport,
  serializeExportPreferences,
  serializeSpriteSheetMetadata,
  type ExportRequest,
} from "./export";
import {
  celKey,
  createNewProjectDocument,
  type ProjectDocument,
} from "./project";

function exportDocument(): ProjectDocument {
  const document = createNewProjectDocument({
    template: "blank",
    name: "export-test",
    width: 2,
    height: 2,
    now: "2026-07-20T12:00:00.000Z",
  });
  document.id = "project-export-test";
  document.layers = [
    {
      id: "top",
      name: "Top",
      kind: "pixel",
      blendMode: "normal",
      opacity: 50,
      visible: true,
    },
    {
      id: "bottom",
      name: "Bottom",
      kind: "pixel",
      blendMode: "normal",
      opacity: 100,
      visible: true,
    },
    {
      id: "reference",
      name: "Reference",
      kind: "reference",
      blendMode: "normal",
      opacity: 100,
      visible: true,
      locked: true,
    },
  ];
  document.cels = {
    [celKey("bottom", "frame-1")]: {
      layerId: "bottom",
      frameId: "frame-1",
      pixels: { "0": "#ff0000", "3": "#00ff00" },
    },
    [celKey("top", "frame-1")]: {
      layerId: "top",
      frameId: "frame-1",
      pixels: { "0": "#0000ff", "1": "#ffffff80" },
    },
    [celKey("reference", "frame-1")]: {
      layerId: "reference",
      frameId: "frame-1",
      pixels: { "2": "#ff00ff" },
    },
  };
  document.frames.push({
    id: "frame-2",
    name: "Frame 2",
    referenceOffset: "50% 50%",
  });
  document.cels[celKey("bottom", "frame-2")] = {
    layerId: "bottom",
    frameId: "frame-2",
    pixels: { "1": "#ffff00" },
  };
  return document;
}

function request(overrides: Partial<ExportRequest> = {}): ExportRequest {
  return {
    ...DEFAULT_EXPORT_PREFERENCES,
    activeFrameId: "frame-1",
    firstFrameIndex: 0,
    lastFrameIndex: 1,
    ...overrides,
  };
}

describe("export preferences", () => {
  it("round-trips supported persisted settings", () => {
    const preferences = {
      ...DEFAULT_EXPORT_PREFERENCES,
      kind: "sprite-sheet" as const,
      scale: 4,
      layout: "grid" as const,
      columns: 3,
      spacing: 2,
      padding: 1,
      includeMetadata: true,
    };

    expect(parseExportPreferences(
      serializeExportPreferences(preferences),
    )).toEqual(preferences);
  });

  it("falls back safely when saved settings are malformed", () => {
    expect(parseExportPreferences("not-json")).toBe(DEFAULT_EXPORT_PREFERENCES);
    expect(parseExportPreferences(JSON.stringify({
      ...DEFAULT_EXPORT_PREFERENCES,
      scale: 100,
    }))).toBe(DEFAULT_EXPORT_PREFERENCES);
  });

  it("accepts animated GIF as a persisted output kind", () => {
    const preferences = {
      ...DEFAULT_EXPORT_PREFERENCES,
      kind: "animated-gif" as const,
      scale: 2,
      backgroundMode: "solid" as const,
    };

    expect(parseExportPreferences(
      serializeExportPreferences(preferences),
    )).toEqual(preferences);
  });
});

describe("frame composition", () => {
  it("flattens visible pixel layers in visual order and excludes references", () => {
    const pixels = composeFramePixels(
      exportDocument(),
      "frame-1",
      "transparent",
      "#000000",
    );

    expect([...pixels.slice(0, 4)]).toEqual([128, 0, 128, 255]);
    expect([...pixels.slice(4, 8)]).toEqual([255, 255, 255, 64]);
    expect([...pixels.slice(8, 12)]).toEqual([0, 0, 0, 0]);
    expect([...pixels.slice(12, 16)]).toEqual([0, 255, 0, 255]);
  });

  it("respects frame-local visibility and solid export backgrounds", () => {
    const document = exportDocument();
    document.frameLayerVisibility[celKey("top", "frame-1")] = false;
    const pixels = composeFramePixels(
      document,
      "frame-1",
      "solid",
      "#152034",
    );

    expect([...pixels.slice(0, 4)]).toEqual([255, 0, 0, 255]);
    expect([...pixels.slice(4, 8)]).toEqual([21, 32, 52, 255]);
  });

  it("preserves additive layer blending in the flattened result", () => {
    const document = exportDocument();
    document.layers[0].blendMode = "add";
    document.layers[0].opacity = 100;
    document.cels[celKey("top", "frame-1")].pixels = { "0": "#0000ff" };
    const pixels = composeFramePixels(
      document,
      "frame-1",
      "transparent",
      "#000000",
    );

    expect([...pixels.slice(0, 4)]).toEqual([255, 0, 255, 255]);
  });
});

describe("sprite-sheet rendering", () => {
  it("lays out a selected frame range with nearest-neighbor scaling", () => {
    const document = exportDocument();
    const rendered = renderProjectExport(document, request({
      kind: "sprite-sheet",
      scale: 2,
      layout: "horizontal",
      spacing: 1,
      padding: 1,
    }));

    expect(rendered.width).toBe(11);
    expect(rendered.height).toBe(6);
    expect(rendered.placements.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 1, y: 1 },
      { x: 6, y: 1 },
    ]);
    const firstPixel = ((1 * rendered.width) + 1) * 4;
    expect([...rendered.pixels.slice(firstPixel, firstPixel + 4)]).toEqual([
      128, 0, 128, 255,
    ]);
    const scaledNeighbor = ((2 * rendered.width) + 2) * 4;
    expect([...rendered.pixels.slice(scaledNeighbor, scaledNeighbor + 4)]).toEqual([
      128, 0, 128, 255,
    ]);
  });

  it("rejects layouts that exceed the memory-safe export budget", () => {
    const document = exportDocument();
    document.width = 512;
    document.height = 512;
    const layout = calculateExportLayout(document, request({ scale: 32 }));

    expect(getExportValidationError(layout)).toMatch(/16 megapixel/);
  });

  it("serializes engine-friendly frame coordinates and timing", () => {
    const document = exportDocument();
    const exportRequest = request({
      kind: "sprite-sheet",
      layout: "vertical",
      includeMetadata: true,
    });
    const rendered = renderProjectExport(document, exportRequest);
    const metadata = JSON.parse(serializeSpriteSheetMetadata(
      document,
      exportRequest,
      rendered,
      "export-test-sheet.png",
    ));

    expect(metadata.image).toBe("export-test-sheet.png");
    expect(metadata.frames).toHaveLength(2);
    expect(metadata.frames[1]).toMatchObject({ frame: 2, x: 0, y: 2 });
    expect(metadata.frames[0].durationMs).toBe(125);
  });
});

describe("animated GIF rendering", () => {
  it("renders the selected frame range as equally sized nearest-neighbor frames", () => {
    const document = exportDocument();
    const exportRequest = request({
      kind: "animated-gif",
      scale: 2,
      backgroundMode: "transparent",
    });
    const rendered = renderAnimationExport(document, exportRequest);

    expect(rendered.width).toBe(4);
    expect(rendered.height).toBe(4);
    expect(rendered.frames).toHaveLength(2);
    expect(rendered.frames.map((frame) => frame.sourceIndex)).toEqual([0, 1]);
    expect([...rendered.frames[0].pixels.slice(0, 4)]).toEqual([128, 0, 128, 255]);
    expect([...rendered.frames[0].pixels.slice(4, 8)]).toEqual([128, 0, 128, 255]);
    expect(rendered.frames[0].durationMs).toBe(130);
  });

  it("uses GIF-compatible centisecond timing with a safe high-FPS floor", () => {
    expect(gifFrameDelayMs(8)).toBe(130);
    expect(gifFrameDelayMs(24)).toBe(40);
    expect(gifFrameDelayMs(60)).toBe(20);
  });

  it("rejects animations whose combined frames exceed the memory budget", () => {
    const document = exportDocument();
    document.width = 512;
    document.height = 512;
    const exportRequest = request({ kind: "animated-gif", scale: 8 });
    const layout = calculateExportLayout(document, exportRequest);

    expect(getExportValidationError(layout, exportRequest.kind)).toMatch(/frame budget/);
  });

  it("uses an animation-specific GIF filename", () => {
    expect(exportFileName(
      exportDocument(),
      request({ kind: "animated-gif" }),
    )).toBe("export-test-animation.gif");
  });
});
