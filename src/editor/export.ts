import {
  getCelPixels,
  isLayerPresent,
  isLayerVisible,
  type ProjectDocument,
  type ProjectFrame,
} from "./project";

export const EXPORT_PREFERENCES_STORAGE_KEY = "jt-pixel.export-preferences:v1";
export const EXPORT_SCALE_PRESETS = [1, 2, 4, 8] as const;
export const MAX_EXPORT_SCALE = 32;
export const MAX_EXPORT_SPACING = 128;
export const MAX_EXPORT_DIMENSION = 16_384;
export const MAX_EXPORT_PIXELS = 16_777_216;
export const MAX_GIF_DIMENSION = 4_096;

export type ExportKind = "frame" | "sprite-sheet" | "animated-gif";
export type ExportBackgroundMode = "transparent" | "solid";
export type SpriteSheetLayout = "horizontal" | "vertical" | "grid";

export interface ExportPreferences {
  kind: ExportKind;
  scale: number;
  backgroundMode: ExportBackgroundMode;
  backgroundColor: string;
  layout: SpriteSheetLayout;
  columns: number;
  spacing: number;
  padding: number;
  includeMetadata: boolean;
}

export interface ExportRequest extends ExportPreferences {
  activeFrameId: string;
  firstFrameIndex: number;
  lastFrameIndex: number;
}

export interface ExportFramePlacement {
  frameId: string;
  name: string;
  sourceIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  durationMs: number;
}

export interface ExportLayout {
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  frames: ProjectFrame[];
  placements: ExportFramePlacement[];
}

export interface RenderedExport extends ExportLayout {
  pixels: Uint8ClampedArray;
}

export interface RenderedAnimationFrame {
  frameId: string;
  name: string;
  sourceIndex: number;
  durationMs: number;
  pixels: Uint8ClampedArray;
}

export interface RenderedAnimationExport {
  width: number;
  height: number;
  frames: RenderedAnimationFrame[];
}

export const DEFAULT_EXPORT_PREFERENCES: ExportPreferences = {
  kind: "frame",
  scale: 1,
  backgroundMode: "transparent",
  backgroundColor: "#152034",
  layout: "horizontal",
  columns: 4,
  spacing: 0,
  padding: 0,
  includeMetadata: false,
};

const exportKinds = new Set<ExportKind>(["frame", "sprite-sheet", "animated-gif"]);
const backgroundModes = new Set<ExportBackgroundMode>(["transparent", "solid"]);
const sheetLayouts = new Set<SpriteSheetLayout>(["horizontal", "vertical", "grid"]);
const hexColorPattern = /^#[0-9a-f]{6}$/i;

function isIntegerInRange(value: unknown, minimum: number, maximum: number) {
  return typeof value === "number"
    && Number.isInteger(value)
    && value >= minimum
    && value <= maximum;
}

export function parseExportPreferences(serialized: string | null): ExportPreferences {
  if (!serialized) return DEFAULT_EXPORT_PREFERENCES;

  try {
    const value = JSON.parse(serialized) as Partial<ExportPreferences>;
    if (
      !value
      || typeof value !== "object"
      || !exportKinds.has(value.kind as ExportKind)
      || !isIntegerInRange(value.scale, 1, MAX_EXPORT_SCALE)
      || !backgroundModes.has(value.backgroundMode as ExportBackgroundMode)
      || typeof value.backgroundColor !== "string"
      || !hexColorPattern.test(value.backgroundColor)
      || !sheetLayouts.has(value.layout as SpriteSheetLayout)
      || !isIntegerInRange(value.columns, 1, 512)
      || !isIntegerInRange(value.spacing, 0, MAX_EXPORT_SPACING)
      || !isIntegerInRange(value.padding, 0, MAX_EXPORT_SPACING)
      || typeof value.includeMetadata !== "boolean"
    ) return DEFAULT_EXPORT_PREFERENCES;

    return {
      kind: value.kind as ExportKind,
      scale: value.scale as number,
      backgroundMode: value.backgroundMode as ExportBackgroundMode,
      backgroundColor: value.backgroundColor,
      layout: value.layout as SpriteSheetLayout,
      columns: value.columns as number,
      spacing: value.spacing as number,
      padding: value.padding as number,
      includeMetadata: value.includeMetadata,
    };
  } catch {
    return DEFAULT_EXPORT_PREFERENCES;
  }
}

export function serializeExportPreferences(preferences: ExportPreferences) {
  return JSON.stringify({
    kind: preferences.kind,
    scale: preferences.scale,
    backgroundMode: preferences.backgroundMode,
    backgroundColor: preferences.backgroundColor,
    layout: preferences.layout,
    columns: preferences.columns,
    spacing: preferences.spacing,
    padding: preferences.padding,
    includeMetadata: preferences.includeMetadata,
  });
}

function selectedFrames(document: ProjectDocument, request: ExportRequest) {
  if (request.kind === "frame") {
    const active = document.frames.find((frame) => frame.id === request.activeFrameId);
    return [active ?? document.frames[0]];
  }

  const first = Math.max(0, Math.min(
    document.frames.length - 1,
    Math.min(request.firstFrameIndex, request.lastFrameIndex),
  ));
  const last = Math.max(first, Math.min(
    document.frames.length - 1,
    Math.max(request.firstFrameIndex, request.lastFrameIndex),
  ));
  return document.frames.slice(first, last + 1);
}

export function calculateExportLayout(
  document: ProjectDocument,
  request: ExportRequest,
): ExportLayout {
  const frames = selectedFrames(document, request);
  const frameWidth = document.width * request.scale;
  const frameHeight = document.height * request.scale;
  const padding = request.kind === "sprite-sheet" ? request.padding : 0;
  const spacing = request.kind === "sprite-sheet" ? request.spacing : 0;
  let columns = 1;
  let rows = 1;

  if (request.kind === "sprite-sheet") {
    if (request.layout === "horizontal") columns = frames.length;
    else if (request.layout === "vertical") rows = frames.length;
    else {
      columns = Math.max(1, Math.min(frames.length, request.columns));
      rows = Math.ceil(frames.length / columns);
    }
  }

  const width = (padding * 2) + (columns * frameWidth) + (Math.max(0, columns - 1) * spacing);
  const height = (padding * 2) + (rows * frameHeight) + (Math.max(0, rows - 1) * spacing);
  const placements = frames.map((frame, index) => {
    const column = request.kind === "animated-gif" ? 0 : index % columns;
    const row = request.kind === "animated-gif" ? 0 : Math.floor(index / columns);
    return {
      frameId: frame.id,
      name: frame.name,
      sourceIndex: document.frames.findIndex((candidate) => candidate.id === frame.id),
      x: padding + (column * (frameWidth + spacing)),
      y: padding + (row * (frameHeight + spacing)),
      width: frameWidth,
      height: frameHeight,
      durationMs: Math.round(1000 / document.animation.fps),
    };
  });

  return { width, height, frameWidth, frameHeight, frames, placements };
}

export function getExportValidationError(
  layout: ExportLayout,
  kind: ExportKind = "sprite-sheet",
) {
  if (
    kind === "animated-gif"
    && (layout.width > MAX_GIF_DIMENSION || layout.height > MAX_GIF_DIMENSION)
  ) {
    return `Keep animated GIF edges at or below ${MAX_GIF_DIMENSION.toLocaleString()} pixels.`;
  }
  if (layout.width > MAX_EXPORT_DIMENSION || layout.height > MAX_EXPORT_DIMENSION) {
    return `Keep each export edge at or below ${MAX_EXPORT_DIMENSION.toLocaleString()} pixels.`;
  }
  const totalPixels = layout.width * layout.height * (
    kind === "animated-gif" ? layout.frames.length : 1
  );
  if (totalPixels > MAX_EXPORT_PIXELS) {
    if (kind === "animated-gif") {
      return "This animation exceeds the 16 megapixel memory-safe frame budget. Reduce its range or scale.";
    }
    return "This export exceeds the 16 megapixel memory-safe limit. Reduce scale or use a tighter sheet layout.";
  }
  return null;
}

function parseHexColor(color: string) {
  const red = Number.parseInt(color.slice(1, 3), 16) / 255;
  const green = Number.parseInt(color.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(color.slice(5, 7), 16) / 255;
  const alpha = color.length >= 9
    ? Number.parseInt(color.slice(7, 9), 16) / 255
    : 1;
  return [red, green, blue, alpha] as const;
}

function compositePixel(
  destination: Float32Array,
  offset: number,
  color: string,
  layerOpacity: number,
  additive: boolean,
) {
  const [sourceRed, sourceGreen, sourceBlue, colorAlpha] = parseHexColor(color);
  const sourceAlpha = colorAlpha * layerOpacity;
  const destinationRed = destination[offset];
  const destinationGreen = destination[offset + 1];
  const destinationBlue = destination[offset + 2];
  const destinationAlpha = destination[offset + 3];

  if (additive) {
    const outputAlpha = Math.min(1, sourceAlpha + destinationAlpha);
    if (outputAlpha <= 0) return;
    destination[offset] = Math.min(
      1,
      ((sourceRed * sourceAlpha) + (destinationRed * destinationAlpha)) / outputAlpha,
    );
    destination[offset + 1] = Math.min(
      1,
      ((sourceGreen * sourceAlpha) + (destinationGreen * destinationAlpha)) / outputAlpha,
    );
    destination[offset + 2] = Math.min(
      1,
      ((sourceBlue * sourceAlpha) + (destinationBlue * destinationAlpha)) / outputAlpha,
    );
    destination[offset + 3] = outputAlpha;
    return;
  }

  const outputAlpha = sourceAlpha + (destinationAlpha * (1 - sourceAlpha));
  if (outputAlpha <= 0) return;
  destination[offset] = (
    (sourceRed * sourceAlpha)
    + (destinationRed * destinationAlpha * (1 - sourceAlpha))
  ) / outputAlpha;
  destination[offset + 1] = (
    (sourceGreen * sourceAlpha)
    + (destinationGreen * destinationAlpha * (1 - sourceAlpha))
  ) / outputAlpha;
  destination[offset + 2] = (
    (sourceBlue * sourceAlpha)
    + (destinationBlue * destinationAlpha * (1 - sourceAlpha))
  ) / outputAlpha;
  destination[offset + 3] = outputAlpha;
}

export function composeFramePixels(
  document: ProjectDocument,
  frameId: string,
  backgroundMode: ExportBackgroundMode,
  backgroundColor: string,
) {
  const pixels = new Float32Array(document.width * document.height * 4);
  if (backgroundMode === "solid") {
    const [red, green, blue] = parseHexColor(backgroundColor);
    for (let offset = 0; offset < pixels.length; offset += 4) {
      pixels[offset] = red;
      pixels[offset + 1] = green;
      pixels[offset + 2] = blue;
      pixels[offset + 3] = 1;
    }
  }

  const layers = [...document.layers].reverse();
  for (const layer of layers) {
    if (
      layer.kind !== "pixel"
      || !isLayerPresent(document, layer.id, frameId)
      || !isLayerVisible(document, layer.id, frameId)
    ) continue;

    const layerOpacity = Math.max(0, Math.min(1, layer.opacity / 100));
    const additive = layer.blendMode === "add";
    for (const [rawIndex, color] of Object.entries(
      getCelPixels(document, layer.id, frameId),
    )) {
      const index = Number(rawIndex);
      if (!Number.isInteger(index) || index < 0 || index >= document.width * document.height) {
        continue;
      }
      compositePixel(pixels, index * 4, color, layerOpacity, additive);
    }
  }

  const output = new Uint8ClampedArray(pixels.length);
  for (let index = 0; index < pixels.length; index += 1) {
    output[index] = Math.round(pixels[index] * 255);
  }
  return output;
}

function fillExportBackground(
  output: Uint8ClampedArray,
  backgroundMode: ExportBackgroundMode,
  backgroundColor: string,
) {
  if (backgroundMode !== "solid") return;
  const [red, green, blue] = parseHexColor(backgroundColor);
  for (let offset = 0; offset < output.length; offset += 4) {
    output[offset] = Math.round(red * 255);
    output[offset + 1] = Math.round(green * 255);
    output[offset + 2] = Math.round(blue * 255);
    output[offset + 3] = 255;
  }
}

export function renderProjectExport(
  document: ProjectDocument,
  request: ExportRequest,
): RenderedExport {
  const layout = calculateExportLayout(document, request);
  const validationError = getExportValidationError(layout, request.kind);
  if (validationError) throw new RangeError(validationError);

  const output = new Uint8ClampedArray(layout.width * layout.height * 4);
  fillExportBackground(output, request.backgroundMode, request.backgroundColor);

  for (const placement of layout.placements) {
    const source = composeFramePixels(
      document,
      placement.frameId,
      request.backgroundMode,
      request.backgroundColor,
    );
    for (let sourceY = 0; sourceY < document.height; sourceY += 1) {
      for (let sourceX = 0; sourceX < document.width; sourceX += 1) {
        const sourceOffset = ((sourceY * document.width) + sourceX) * 4;
        for (let scaleY = 0; scaleY < request.scale; scaleY += 1) {
          const outputY = placement.y + (sourceY * request.scale) + scaleY;
          for (let scaleX = 0; scaleX < request.scale; scaleX += 1) {
            const outputX = placement.x + (sourceX * request.scale) + scaleX;
            const outputOffset = ((outputY * layout.width) + outputX) * 4;
            output[outputOffset] = source[sourceOffset];
            output[outputOffset + 1] = source[sourceOffset + 1];
            output[outputOffset + 2] = source[sourceOffset + 2];
            output[outputOffset + 3] = source[sourceOffset + 3];
          }
        }
      }
    }
  }

  return { ...layout, pixels: output };
}

function scaleFramePixels(
  source: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  scale: number,
) {
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  const output = new Uint8ClampedArray(width * height * 4);

  for (let sourceY = 0; sourceY < sourceHeight; sourceY += 1) {
    for (let sourceX = 0; sourceX < sourceWidth; sourceX += 1) {
      const sourceOffset = ((sourceY * sourceWidth) + sourceX) * 4;
      for (let scaleY = 0; scaleY < scale; scaleY += 1) {
        const outputY = (sourceY * scale) + scaleY;
        for (let scaleX = 0; scaleX < scale; scaleX += 1) {
          const outputX = (sourceX * scale) + scaleX;
          const outputOffset = ((outputY * width) + outputX) * 4;
          output[outputOffset] = source[sourceOffset];
          output[outputOffset + 1] = source[sourceOffset + 1];
          output[outputOffset + 2] = source[sourceOffset + 2];
          output[outputOffset + 3] = source[sourceOffset + 3];
        }
      }
    }
  }

  return output;
}

export function gifFrameDelayMs(fps: number) {
  return Math.max(20, Math.round(100 / fps) * 10);
}

export function renderAnimationExport(
  document: ProjectDocument,
  request: ExportRequest,
): RenderedAnimationExport {
  const layout = calculateExportLayout(document, request);
  const validationError = getExportValidationError(layout, "animated-gif");
  if (validationError) throw new RangeError(validationError);

  const durationMs = gifFrameDelayMs(document.animation.fps);
  return {
    width: layout.frameWidth,
    height: layout.frameHeight,
    frames: layout.frames.map((frame) => ({
      frameId: frame.id,
      name: frame.name,
      sourceIndex: document.frames.findIndex((candidate) => candidate.id === frame.id),
      durationMs,
      pixels: scaleFramePixels(
        composeFramePixels(
          document,
          frame.id,
          request.backgroundMode,
          request.backgroundColor,
        ),
        document.width,
        document.height,
        request.scale,
      ),
    })),
  };
}

export function exportFileName(
  document: ProjectDocument,
  request: ExportRequest,
) {
  const projectName = document.name.replace(/\.jtp$/i, "") || "jt-pixel";
  if (request.kind === "animated-gif") return `${projectName}-animation.gif`;
  if (request.kind === "sprite-sheet") return `${projectName}-sheet.png`;
  const frameIndex = Math.max(
    0,
    document.frames.findIndex((frame) => frame.id === request.activeFrameId),
  );
  return `${projectName}-frame-${frameIndex + 1}.png`;
}

export function serializeSpriteSheetMetadata(
  document: ProjectDocument,
  request: ExportRequest,
  rendered: RenderedExport,
  imageFileName: string,
) {
  return JSON.stringify({
    schemaVersion: 1,
    generator: "JT Pixel",
    image: imageFileName,
    width: rendered.width,
    height: rendered.height,
    frameWidth: rendered.frameWidth,
    frameHeight: rendered.frameHeight,
    scale: request.scale,
    spacing: request.spacing,
    padding: request.padding,
    layout: request.layout,
    fps: document.animation.fps,
    loop: document.animation.loop,
    frames: rendered.placements.map((placement) => ({
      frame: placement.sourceIndex + 1,
      name: placement.name,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      durationMs: placement.durationMs,
    })),
  }, null, 2);
}
