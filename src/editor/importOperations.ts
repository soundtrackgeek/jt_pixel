import { normalizePaletteColors, pixelColorToOpaqueHex } from "./colorOperations";
import {
  MAX_CANVAS_DIMENSION,
  MIN_CANVAS_DIMENSION,
  celKey,
  createNewProjectDocument,
  createProjectId,
  isLayerPresent,
  normalizeNewProjectName,
  type PixelMap,
  type ProjectDocument,
  type ProjectFrame,
  type ProjectLayer,
} from "./project";

export const MAX_IMPORT_SOURCE_DIMENSION = 8_192;
export const MAX_IMPORT_SOURCE_PIXELS = 33_554_432;
export const MAX_IMPORT_FRAMES = 1_024;

export type ImportPaletteMode = "keep" | "merge" | "replace";
export type ImportFrameOrder = "rows" | "columns";
export type CanvasOperation = "resize" | "scale";
export type CanvasAnchor =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "center"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";

export interface DecodedImportImage {
  data: Uint8ClampedArray;
  height: number;
  name: string;
  width: number;
}

export interface SpriteSliceSettings {
  cellHeight: number;
  cellWidth: number;
  columns: number;
  marginX: number;
  marginY: number;
  order: ImportFrameOrder;
  rows: number;
  spacingX: number;
  spacingY: number;
}

export interface ImportedSlice {
  height: number;
  pixels: PixelMap;
  width: number;
}

export interface DocumentImportResult {
  activeFrameId: string;
  activeLayerId: string;
  document: ProjectDocument;
}

const ANCHOR_FACTORS: Record<CanvasAnchor, [number, number]> = {
  "top-left": [0, 0],
  top: [0.5, 0],
  "top-right": [1, 0],
  left: [0, 0.5],
  center: [0.5, 0.5],
  right: [1, 0.5],
  "bottom-left": [0, 1],
  bottom: [0.5, 1],
  "bottom-right": [1, 1],
};

function byteHex(value: number) {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
}

export function rgbaToPixelColor(red: number, green: number, blue: number, alpha: number) {
  if (alpha <= 0) return null;
  const opaque = `#${byteHex(red)}${byteHex(green)}${byteHex(blue)}`;
  return alpha >= 255 ? opaque : `${opaque}${byteHex(alpha)}`;
}

export function imageRegionToPixelMap(
  image: DecodedImportImage,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const pixels: PixelMap = {};
  for (let targetY = 0; targetY < height; targetY += 1) {
    for (let targetX = 0; targetX < width; targetX += 1) {
      const sourceX = x + targetX;
      const sourceY = y + targetY;
      if (
        sourceX < 0
        || sourceY < 0
        || sourceX >= image.width
        || sourceY >= image.height
      ) continue;
      const offset = (sourceY * image.width + sourceX) * 4;
      const color = rgbaToPixelColor(
        image.data[offset],
        image.data[offset + 1],
        image.data[offset + 2],
        image.data[offset + 3],
      );
      if (color) pixels[String(targetY * width + targetX)] = color;
    }
  }
  return pixels;
}

export function validateSpriteSliceSettings(
  image: Pick<DecodedImportImage, "height" | "width">,
  settings: SpriteSliceSettings,
) {
  const values = [
    settings.cellWidth,
    settings.cellHeight,
    settings.columns,
    settings.rows,
    settings.spacingX,
    settings.spacingY,
    settings.marginX,
    settings.marginY,
  ];
  if (!values.every(Number.isInteger)) return "Sprite sheet values must be whole numbers.";
  if (
    settings.cellWidth < MIN_CANVAS_DIMENSION
    || settings.cellWidth > MAX_CANVAS_DIMENSION
    || settings.cellHeight < MIN_CANVAS_DIMENSION
    || settings.cellHeight > MAX_CANVAS_DIMENSION
  ) return `Cell size must be between ${MIN_CANVAS_DIMENSION} and ${MAX_CANVAS_DIMENSION} pixels.`;
  if (settings.columns < 1 || settings.rows < 1) return "Use at least one row and one column.";
  if (settings.columns * settings.rows > MAX_IMPORT_FRAMES) {
    return `Import at most ${MAX_IMPORT_FRAMES} frames at once.`;
  }
  if (
    settings.spacingX < 0
    || settings.spacingY < 0
    || settings.marginX < 0
    || settings.marginY < 0
  ) return "Spacing and margins cannot be negative.";

  const requiredWidth = settings.marginX * 2
    + settings.columns * settings.cellWidth
    + Math.max(0, settings.columns - 1) * settings.spacingX;
  const requiredHeight = settings.marginY * 2
    + settings.rows * settings.cellHeight
    + Math.max(0, settings.rows - 1) * settings.spacingY;
  if (requiredWidth > image.width || requiredHeight > image.height) {
    return `The ${requiredWidth} × ${requiredHeight} slice grid exceeds the ${image.width} × ${image.height} image.`;
  }
  return null;
}

export function sliceImportedImage(
  image: DecodedImportImage,
  settings: SpriteSliceSettings,
) {
  const error = validateSpriteSliceSettings(image, settings);
  if (error) throw new RangeError(error);
  const coordinates: Array<[number, number]> = [];
  if (settings.order === "rows") {
    for (let row = 0; row < settings.rows; row += 1) {
      for (let column = 0; column < settings.columns; column += 1) {
        coordinates.push([column, row]);
      }
    }
  } else {
    for (let column = 0; column < settings.columns; column += 1) {
      for (let row = 0; row < settings.rows; row += 1) {
        coordinates.push([column, row]);
      }
    }
  }
  return coordinates.map(([column, row]): ImportedSlice => ({
    width: settings.cellWidth,
    height: settings.cellHeight,
    pixels: imageRegionToPixelMap(
      image,
      settings.marginX + column * (settings.cellWidth + settings.spacingX),
      settings.marginY + row * (settings.cellHeight + settings.spacingY),
      settings.cellWidth,
      settings.cellHeight,
    ),
  }));
}

export function singleImportedImage(image: DecodedImportImage): ImportedSlice {
  return {
    width: image.width,
    height: image.height,
    pixels: imageRegionToPixelMap(image, 0, 0, image.width, image.height),
  };
}

export function extractImportedPalette(slices: ImportedSlice[], maximum = 256) {
  const counts = new Map<string, number>();
  for (const slice of slices) {
    for (const pixel of Object.values(slice.pixels)) {
      const color = pixelColorToOpaqueHex(pixel);
      if (color) counts.set(color, (counts.get(color) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, maximum)
    .map(([color]) => color);
}

export function importedPalette(
  currentPalette: string[],
  slices: ImportedSlice[],
  mode: ImportPaletteMode,
) {
  if (mode === "keep") return [...currentPalette];
  const extracted = extractImportedPalette(slices);
  if (mode === "replace") return extracted.length > 0 ? extracted : [...currentPalette];
  return normalizePaletteColors([...currentPalette, ...extracted]);
}

function anchorOffset(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  anchor: CanvasAnchor,
) {
  const [horizontal, vertical] = ANCHOR_FACTORS[anchor];
  return {
    x: Math.round((targetWidth - sourceWidth) * horizontal),
    y: Math.round((targetHeight - sourceHeight) * vertical),
  };
}

export function resizePixelMap(
  pixels: PixelMap,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  anchor: CanvasAnchor,
) {
  const next: PixelMap = {};
  const offset = anchorOffset(sourceWidth, sourceHeight, targetWidth, targetHeight, anchor);
  for (const [indexText, color] of Object.entries(pixels)) {
    const index = Number(indexText);
    const sourceX = index % sourceWidth;
    const sourceY = Math.floor(index / sourceWidth);
    if (sourceY >= sourceHeight) continue;
    const targetX = sourceX + offset.x;
    const targetY = sourceY + offset.y;
    if (targetX < 0 || targetY < 0 || targetX >= targetWidth || targetY >= targetHeight) continue;
    next[String(targetY * targetWidth + targetX)] = color;
  }
  return next;
}

export function scalePixelMap(
  pixels: PixelMap,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
) {
  const next: PixelMap = {};
  for (let targetY = 0; targetY < targetHeight; targetY += 1) {
    const sourceY = Math.min(sourceHeight - 1, Math.floor(targetY * sourceHeight / targetHeight));
    for (let targetX = 0; targetX < targetWidth; targetX += 1) {
      const sourceX = Math.min(sourceWidth - 1, Math.floor(targetX * sourceWidth / targetWidth));
      const color = pixels[String(sourceY * sourceWidth + sourceX)];
      if (color) next[String(targetY * targetWidth + targetX)] = color;
    }
  }
  return next;
}

export function centerImportedPixels(
  slice: ImportedSlice,
  targetWidth: number,
  targetHeight: number,
) {
  return resizePixelMap(
    slice.pixels,
    slice.width,
    slice.height,
    targetWidth,
    targetHeight,
    "center",
  );
}

export function countClippedPixels(
  pixels: PixelMap,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  anchor: CanvasAnchor,
) {
  return Object.keys(pixels).length - Object.keys(
    resizePixelMap(pixels, sourceWidth, sourceHeight, targetWidth, targetHeight, anchor),
  ).length;
}

function fillExpandedArea(
  pixels: PixelMap,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  anchor: CanvasAnchor,
  fillColor: string,
) {
  const next = { ...pixels };
  const offset = anchorOffset(sourceWidth, sourceHeight, targetWidth, targetHeight, anchor);
  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = x - offset.x;
      const sourceY = y - offset.y;
      if (sourceX < 0 || sourceY < 0 || sourceX >= sourceWidth || sourceY >= sourceHeight) {
        next[String(y * targetWidth + x)] = fillColor;
      }
    }
  }
  return next;
}

export function transformProjectDimensions(
  document: ProjectDocument,
  targetWidth: number,
  targetHeight: number,
  operation: CanvasOperation,
  anchor: CanvasAnchor = "center",
  fillColor?: string,
) {
  if (
    !Number.isInteger(targetWidth)
    || !Number.isInteger(targetHeight)
    || targetWidth < MIN_CANVAS_DIMENSION
    || targetHeight < MIN_CANVAS_DIMENSION
    || targetWidth > MAX_CANVAS_DIMENSION
    || targetHeight > MAX_CANVAS_DIMENSION
  ) throw new RangeError(`Canvas dimensions must be between ${MIN_CANVAS_DIMENSION} and ${MAX_CANVAS_DIMENSION}.`);

  const cels = Object.fromEntries(Object.entries(document.cels).map(([key, cel]) => [
    key,
    {
      ...cel,
      pixels: operation === "scale"
        ? scalePixelMap(cel.pixels, document.width, document.height, targetWidth, targetHeight)
        : resizePixelMap(
            cel.pixels,
            document.width,
            document.height,
            targetWidth,
            targetHeight,
            anchor,
          ),
    },
  ]));

  if (
    operation === "resize"
    && fillColor
    && (targetWidth > document.width || targetHeight > document.height)
  ) {
    for (const frame of document.frames) {
      const bottomLayer = [...document.layers].reverse().find(
        (layer) => layer.kind === "pixel" && isLayerPresent(document, layer.id, frame.id),
      );
      if (!bottomLayer) continue;
      const key = celKey(bottomLayer.id, frame.id);
      cels[key] = {
        layerId: bottomLayer.id,
        frameId: frame.id,
        pixels: fillExpandedArea(
          cels[key]?.pixels ?? {},
          document.width,
          document.height,
          targetWidth,
          targetHeight,
          anchor,
          fillColor,
        ),
      };
    }
  }

  return {
    ...document,
    width: targetWidth,
    height: targetHeight,
    cels,
  };
}

export function countDocumentClippedPixels(
  document: ProjectDocument,
  targetWidth: number,
  targetHeight: number,
  anchor: CanvasAnchor,
) {
  return Object.values(document.cels).reduce((total, cel) => total + countClippedPixels(
    cel.pixels,
    document.width,
    document.height,
    targetWidth,
    targetHeight,
    anchor,
  ), 0);
}

function importedProjectName(sourceName: string) {
  const stem = sourceName.replace(/\.[^.]+$/i, "").replace(/[<>:\"/\\|?*\u0000-\u001f]/g, "-").trim();
  return normalizeNewProjectName(stem || "imported-artwork");
}

export function createProjectFromImportedSlices(
  sourceName: string,
  slices: ImportedSlice[],
  currentPalette: string[],
  paletteMode: ImportPaletteMode,
  now = new Date().toISOString(),
) {
  if (slices.length === 0) throw new RangeError("Import at least one frame.");
  const [{ width, height }] = slices;
  if (slices.some((slice) => slice.width !== width || slice.height !== height)) {
    throw new RangeError("Every imported frame must use the same dimensions.");
  }
  const document = createNewProjectDocument({
    template: "blank",
    name: importedProjectName(sourceName),
    width,
    height,
    now,
  });
  const layerId = document.layers[0].id;
  const frames: ProjectFrame[] = slices.map((_, index) => ({
    id: index === 0 ? document.frames[0].id : createProjectId("frame"),
    name: `Frame ${index + 1}`,
    referenceOffset: "50% 50%",
    hold: 1,
  }));
  const cels = Object.fromEntries(slices.flatMap((slice, index) => {
    if (Object.keys(slice.pixels).length === 0) return [];
    const frameId = frames[index].id;
    return [[celKey(layerId, frameId), { layerId, frameId, pixels: { ...slice.pixels } }]];
  }));
  return {
    ...document,
    palette: importedPalette(currentPalette, slices, paletteMode),
    frames,
    cels,
    workspace: { ...document.workspace, activeFrameId: frames[0].id },
  };
}

export function importSliceAsLayer(
  document: ProjectDocument,
  activeFrameId: string,
  sourceName: string,
  slice: ImportedSlice,
  paletteMode: ImportPaletteMode,
): DocumentImportResult {
  const layer: ProjectLayer = {
    id: createProjectId("layer"),
    name: sourceName.replace(/\.[^.]+$/i, "").slice(0, 255) || "Imported artwork",
    kind: "pixel",
    blendMode: "normal",
    opacity: 100,
    visible: true,
  };
  const frameLayerPresence = { ...document.frameLayerPresence };
  for (const frame of document.frames) {
    frameLayerPresence[celKey(layer.id, frame.id)] = frame.id === activeFrameId;
  }
  const pixels = centerImportedPixels(slice, document.width, document.height);
  return {
    activeFrameId,
    activeLayerId: layer.id,
    document: {
      ...document,
      palette: importedPalette(document.palette, [slice], paletteMode),
      layers: [layer, ...document.layers],
      frameLayerPresence,
      cels: Object.keys(pixels).length === 0 ? document.cels : {
        ...document.cels,
        [celKey(layer.id, activeFrameId)]: { layerId: layer.id, frameId: activeFrameId, pixels },
      },
    },
  };
}

export function importSliceIntoCel(
  document: ProjectDocument,
  activeFrameId: string,
  activeLayerId: string,
  slice: ImportedSlice,
  paletteMode: ImportPaletteMode,
): DocumentImportResult {
  const pixels = centerImportedPixels(slice, document.width, document.height);
  const key = celKey(activeLayerId, activeFrameId);
  const cels = { ...document.cels };
  if (Object.keys(pixels).length === 0) delete cels[key];
  else cels[key] = { layerId: activeLayerId, frameId: activeFrameId, pixels };
  return {
    activeFrameId,
    activeLayerId,
    document: {
      ...document,
      palette: importedPalette(document.palette, [slice], paletteMode),
      cels,
    },
  };
}

export function appendImportedFrames(
  document: ProjectDocument,
  activeFrameId: string,
  sourceName: string,
  slices: ImportedSlice[],
  paletteMode: ImportPaletteMode,
): DocumentImportResult {
  if (slices.length === 0) throw new RangeError("Import at least one frame.");
  if (slices.some((slice) => slice.width !== document.width || slice.height !== document.height)) {
    throw new RangeError(`Frame imports must be ${document.width} × ${document.height} pixels.`);
  }
  const layer: ProjectLayer = {
    id: createProjectId("layer"),
    name: sourceName.replace(/\.[^.]+$/i, "").slice(0, 255) || "Imported frames",
    kind: "pixel",
    blendMode: "normal",
    opacity: 100,
    visible: true,
  };
  const importedFrames = slices.map((_, index): ProjectFrame => ({
    id: createProjectId("frame"),
    name: `Imported ${index + 1}`,
    referenceOffset: "50% 50%",
    hold: 1,
  }));
  const frames = [...document.frames];
  const activeIndex = Math.max(0, frames.findIndex((frame) => frame.id === activeFrameId));
  frames.splice(activeIndex + 1, 0, ...importedFrames);
  const frameLayerPresence = { ...document.frameLayerPresence };
  for (const frame of document.frames) frameLayerPresence[celKey(layer.id, frame.id)] = false;
  for (const frame of importedFrames) {
    frameLayerPresence[celKey(layer.id, frame.id)] = true;
    for (const existingLayer of document.layers) {
      frameLayerPresence[celKey(existingLayer.id, frame.id)] = false;
    }
  }
  const cels = { ...document.cels };
  slices.forEach((slice, index) => {
    if (Object.keys(slice.pixels).length === 0) return;
    const frameId = importedFrames[index].id;
    cels[celKey(layer.id, frameId)] = { layerId: layer.id, frameId, pixels: { ...slice.pixels } };
  });
  return {
    activeFrameId: importedFrames[0].id,
    activeLayerId: layer.id,
    document: {
      ...document,
      palette: importedPalette(document.palette, slices, paletteMode),
      layers: [layer, ...document.layers],
      frames,
      cels,
      frameLayerPresence,
    },
  };
}
