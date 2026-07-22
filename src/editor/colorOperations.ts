import type { CursorPosition, SelectionBounds } from "../types";
import {
  getLayersForFrame,
  isLayerVisible,
  type PixelMap,
  type ProjectDocument,
} from "./project";
import { compositeRgba, parsePixelColor } from "./compositing";
import { isPositionInSelection } from "./selectionRegion";

export type EyedropperSource = "active-layer" | "visible-pixels";
export type ColorReplacementScope = "selection" | "cel" | "layer" | "project";

export interface ColorOperationContext {
  activeFrameId: string;
  activeLayerId: string;
  bounds?: SelectionBounds;
}

export interface ColorReplacementAnalysis {
  affectedCels: number;
  affectedPixels: number;
  lockedPixels: number;
}

export interface PixelLensCell {
  color: string | null;
  inBounds: boolean;
}

export interface PixelLensSample {
  cells: PixelLensCell[];
  center: CursorPosition;
  centerColor: string | null;
  size: number;
}

export interface RgbColor {
  blue: number;
  green: number;
  red: number;
}

export interface HsvColor {
  hue: number;
  saturation: number;
  value: number;
}

const OPAQUE_HEX_PATTERN = /^#[0-9a-f]{6}$/i;
const PIXEL_HEX_PATTERN = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i;

export function normalizeHexColor(value: string) {
  const trimmed = value.trim();
  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (/^#[0-9a-f]{3}$/i.test(prefixed)) {
    return `#${[...prefixed.slice(1)].map((digit) => `${digit}${digit}`).join("")}`.toLowerCase();
  }
  return OPAQUE_HEX_PATTERN.test(prefixed) ? prefixed.toLowerCase() : null;
}

export function hexToRgb(value: string): RgbColor {
  const color = normalizeHexColor(value) ?? "#000000";
  return {
    red: Number.parseInt(color.slice(1, 3), 16),
    green: Number.parseInt(color.slice(3, 5), 16),
    blue: Number.parseInt(color.slice(5, 7), 16),
  };
}

export function rgbToHex({ red, green, blue }: RgbColor) {
  const channel = (value: number) => Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0");
  return `#${channel(red)}${channel(green)}${channel(blue)}`;
}

export function hexToHsv(value: string): HsvColor {
  const { red, green, blue } = hexToRgb(value);
  const normalized = [red / 255, green / 255, blue / 255];
  const maximum = Math.max(...normalized);
  const minimum = Math.min(...normalized);
  const delta = maximum - minimum;
  let hue = 0;
  if (delta > 0) {
    if (maximum === normalized[0]) hue = 60 * (((normalized[1] - normalized[2]) / delta) % 6);
    else if (maximum === normalized[1]) hue = 60 * (((normalized[2] - normalized[0]) / delta) + 2);
    else hue = 60 * (((normalized[0] - normalized[1]) / delta) + 4);
  }
  if (hue < 0) hue += 360;
  return {
    hue: Math.round(hue),
    saturation: maximum === 0 ? 0 : Math.round((delta / maximum) * 100),
    value: Math.round(maximum * 100),
  };
}

export function hsvToHex({ hue, saturation, value }: HsvColor) {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const normalizedSaturation = Math.max(0, Math.min(100, saturation)) / 100;
  const normalizedValue = Math.max(0, Math.min(100, value)) / 100;
  const chroma = normalizedValue * normalizedSaturation;
  const segment = normalizedHue / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const offset = normalizedValue - chroma;
  const [red, green, blue] = segment < 1
    ? [chroma, secondary, 0]
    : segment < 2 ? [secondary, chroma, 0]
      : segment < 3 ? [0, chroma, secondary]
        : segment < 4 ? [0, secondary, chroma]
          : segment < 5 ? [secondary, 0, chroma]
            : [chroma, 0, secondary];
  return rgbToHex({
    red: (red + offset) * 255,
    green: (green + offset) * 255,
    blue: (blue + offset) * 255,
  });
}

export function pixelColorToOpaqueHex(value: string | undefined) {
  if (!value || !PIXEL_HEX_PATTERN.test(value)) return null;
  return value.slice(0, 7).toLowerCase();
}

export function normalizePaletteColors(colors: string[], maximum = 256) {
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const color of colors) {
    const next = normalizeHexColor(color);
    if (!next || seen.has(next)) continue;
    seen.add(next);
    normalized.push(next);
    if (normalized.length === maximum) break;
  }
  return normalized;
}

export function getProjectColorCounts(document: ProjectDocument) {
  const counts = new Map<string, number>();
  for (const cel of Object.values(document.cels)) {
    for (const color of Object.values(cel.pixels)) {
      const opaque = pixelColorToOpaqueHex(color);
      if (opaque) counts.set(opaque, (counts.get(opaque) ?? 0) + 1);
    }
  }
  return counts;
}

export function extractPaletteFromDocument(document: ProjectDocument, maximum = 256) {
  return [...getProjectColorCounts(document).entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, maximum)
    .map(([color]) => color);
}

function layerFrameKey(layerId: string, frameId: string) {
  return `${layerId}::${frameId}`;
}

function layerIsPresent(document: ProjectDocument, layerId: string, frameId: string) {
  return document.frameLayerPresence[layerFrameKey(layerId, frameId)] ?? true;
}

function layerIsVisible(document: ProjectDocument, layerId: string, frameId: string) {
  const layer = document.layers.find((candidate) => candidate.id === layerId);
  return document.frameLayerVisibility[layerFrameKey(layerId, frameId)] ?? layer?.visible ?? false;
}

function layerIsLocked(document: ProjectDocument, layerId: string, frameId: string) {
  const layer = document.layers.find((candidate) => candidate.id === layerId);
  return layer?.locked === true
    || (layer?.kind === "pixel"
      && (document.frameLayerLocks[layerFrameKey(layerId, frameId)] ?? false));
}

function replacementTargets(
  document: ProjectDocument,
  scope: ColorReplacementScope,
  context: ColorOperationContext,
) {
  if (scope === "selection" || scope === "cel") {
    return [{ layerId: context.activeLayerId, frameId: context.activeFrameId }];
  }
  if (scope === "layer") {
    return document.frames.map((frame) => ({
      layerId: context.activeLayerId,
      frameId: frame.id,
    }));
  }

  const targets: Array<{ layerId: string; frameId: string }> = [];
  for (const layer of document.layers) {
    if (layer.kind !== "pixel") continue;
    for (const frame of document.frames) {
      targets.push({ layerId: layer.id, frameId: frame.id });
    }
  }
  return targets;
}

function indexIsInBounds(
  rawIndex: string,
  width: number,
  bounds: SelectionBounds | undefined,
) {
  if (!bounds) return true;
  const index = Number(rawIndex);
  const x = index % width;
  const y = Math.floor(index / width);
  return isPositionInSelection({ x, y }, bounds);
}

function countMatchingPixels(
  pixels: PixelMap,
  sourceColor: string,
  width: number,
  bounds?: SelectionBounds,
) {
  let count = 0;
  for (const [index, color] of Object.entries(pixels)) {
    if (
      indexIsInBounds(index, width, bounds)
      && pixelColorToOpaqueHex(color) === sourceColor
    ) count += 1;
  }
  return count;
}

export function analyzeColorReplacement(
  document: ProjectDocument,
  source: string,
  scope: ColorReplacementScope,
  context: ColorOperationContext,
): ColorReplacementAnalysis {
  const sourceColor = normalizeHexColor(source);
  if (!sourceColor || (scope === "selection" && !context.bounds)) {
    return { affectedCels: 0, affectedPixels: 0, lockedPixels: 0 };
  }

  let affectedCels = 0;
  let affectedPixels = 0;
  let lockedPixels = 0;
  for (const target of replacementTargets(document, scope, context)) {
    const layer = document.layers.find((candidate) => candidate.id === target.layerId);
    if (
      layer?.kind !== "pixel"
      || !layerIsPresent(document, target.layerId, target.frameId)
    ) continue;
    const pixels = document.cels[layerFrameKey(target.layerId, target.frameId)]?.pixels;
    if (!pixels) continue;
    const bounds = scope === "selection" ? context.bounds : undefined;
    const count = countMatchingPixels(pixels, sourceColor, document.width, bounds);
    if (count === 0) continue;
    if (layerIsLocked(document, target.layerId, target.frameId)) {
      lockedPixels += count;
    } else {
      affectedPixels += count;
      affectedCels += 1;
    }
  }
  return { affectedCels, affectedPixels, lockedPixels };
}

export function replaceDocumentColor(
  document: ProjectDocument,
  source: string,
  target: string,
  scope: ColorReplacementScope,
  context: ColorOperationContext,
) {
  const sourceColor = normalizeHexColor(source);
  const targetColor = normalizeHexColor(target);
  if (
    !sourceColor
    || !targetColor
    || sourceColor === targetColor
    || (scope === "selection" && !context.bounds)
  ) return document;

  let cels = document.cels;
  for (const targetLocation of replacementTargets(document, scope, context)) {
    const layer = document.layers.find((candidate) => candidate.id === targetLocation.layerId);
    if (
      layer?.kind !== "pixel"
      || !layerIsPresent(document, targetLocation.layerId, targetLocation.frameId)
      || layerIsLocked(document, targetLocation.layerId, targetLocation.frameId)
    ) continue;
    const key = layerFrameKey(targetLocation.layerId, targetLocation.frameId);
    const cel = document.cels[key];
    if (!cel) continue;
    const bounds = scope === "selection" ? context.bounds : undefined;
    let pixels = cel.pixels;
    for (const [index, color] of Object.entries(cel.pixels)) {
      if (
        !indexIsInBounds(index, document.width, bounds)
        || pixelColorToOpaqueHex(color) !== sourceColor
      ) continue;
      if (pixels === cel.pixels) pixels = { ...cel.pixels };
      pixels[index] = `${targetColor}${color.slice(7)}`;
    }
    if (pixels === cel.pixels) continue;
    if (cels === document.cels) cels = { ...document.cels };
    cels[key] = { ...cel, pixels };
  }

  return cels === document.cels ? document : { ...document, cels };
}

function channelToHex(channel: number) {
  return Math.round(channel * 255).toString(16).padStart(2, "0");
}

export function sampleVisiblePixelColor(
  document: ProjectDocument,
  frameId: string,
  index: string,
) {
  let sample = { red: 0, green: 0, blue: 0, alpha: 0 };
  for (const layer of [...getLayersForFrame(document, frameId)].reverse()) {
    if (
      layer.kind !== "pixel"
      || !isLayerVisible(document, layer.id, frameId)
    ) continue;
    const color = document.cels[layerFrameKey(layer.id, frameId)]?.pixels[index];
    if (!color || !PIXEL_HEX_PATTERN.test(color)) continue;
    const source = parsePixelColor(color);
    if (source) sample = compositeRgba(sample, source, layer.opacity / 100, layer.blendMode);
  }
  if (sample.alpha <= 0) return null;
  return `#${channelToHex(sample.red)}${channelToHex(sample.green)}${channelToHex(sample.blue)}`;
}

export function sampleProjectPixelColor(
  document: ProjectDocument,
  frameId: string,
  layerId: string,
  source: EyedropperSource,
  index: string,
) {
  if (source === "visible-pixels") return sampleVisiblePixelColor(document, frameId, index);
  const layer = document.layers.find((candidate) => candidate.id === layerId);
  if (
    layer?.kind !== "pixel"
    || !layerIsPresent(document, layerId, frameId)
  ) return null;
  return pixelColorToOpaqueHex(document.cels[layerFrameKey(layerId, frameId)]?.pixels[index]);
}

export function samplePixelLens(
  document: ProjectDocument,
  frameId: string,
  layerId: string,
  source: EyedropperSource,
  center: CursorPosition,
  radius = 4,
): PixelLensSample {
  const normalizedRadius = Math.max(1, Math.min(8, Math.round(radius)));
  const size = (normalizedRadius * 2) + 1;
  const cells: PixelLensCell[] = [];
  for (let offsetY = -normalizedRadius; offsetY <= normalizedRadius; offsetY += 1) {
    for (let offsetX = -normalizedRadius; offsetX <= normalizedRadius; offsetX += 1) {
      const x = center.x + offsetX;
      const y = center.y + offsetY;
      const inBounds = x >= 0 && y >= 0 && x < document.width && y < document.height;
      cells.push({
        inBounds,
        color: inBounds
          ? sampleProjectPixelColor(
            document,
            frameId,
            layerId,
            source,
            String((y * document.width) + x),
          )
          : null,
      });
    }
  }
  return {
    cells,
    center: { ...center },
    centerColor: cells[(normalizedRadius * size) + normalizedRadius]?.color ?? null,
    size,
  };
}
