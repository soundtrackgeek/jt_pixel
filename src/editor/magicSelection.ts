import type { CursorPosition, SelectionBounds } from "../types";
import type { EyedropperSource } from "./colorOperations";
import type { PixelMap } from "./project";
import { selectionFromAbsoluteIndices, type SelectionCombineMode } from "./selectionRegion";

export type MagicSelectionMatch = "contiguous" | "global";

export interface MagicSelectionSettings {
  combineMode: SelectionCombineMode;
  match: MagicSelectionMatch;
  source: EyedropperSource;
  tolerance: number;
}

export const DEFAULT_MAGIC_SELECTION_SETTINGS: MagicSelectionSettings = {
  combineMode: "replace",
  match: "contiguous",
  source: "visible-pixels",
  tolerance: 0,
};

interface RgbaColor {
  alpha: number;
  blue: number;
  green: number;
  red: number;
}

function parsePixelColor(color: string | undefined): RgbaColor {
  if (!color) return { red: 0, green: 0, blue: 0, alpha: 0 };
  const value = color.startsWith("#") ? color.slice(1) : color;
  if (value.length !== 6 && value.length !== 8) {
    return { red: 0, green: 0, blue: 0, alpha: 0 };
  }
  return {
    red: Number.parseInt(value.slice(0, 2), 16),
    green: Number.parseInt(value.slice(2, 4), 16),
    blue: Number.parseInt(value.slice(4, 6), 16),
    alpha: value.length === 8 ? Number.parseInt(value.slice(6, 8), 16) : 255,
  };
}

function colorDistance(left: RgbaColor, right: RgbaColor) {
  const leftAlpha = left.alpha / 255;
  const rightAlpha = right.alpha / 255;
  return Math.max(
    Math.abs(left.alpha - right.alpha),
    Math.abs((left.red * leftAlpha) - (right.red * rightAlpha)),
    Math.abs((left.green * leftAlpha) - (right.green * rightAlpha)),
    Math.abs((left.blue * leftAlpha) - (right.blue * rightAlpha)),
  );
}

function pixelMatches(
  pixels: PixelMap,
  index: number,
  target: RgbaColor,
  tolerance: number,
) {
  return colorDistance(parsePixelColor(pixels[String(index)]), target) <= tolerance;
}

export function findMagicSelection(
  pixels: PixelMap,
  width: number,
  height: number,
  seed: CursorPosition,
  match: MagicSelectionMatch,
  tolerance: number,
): SelectionBounds | null {
  if (seed.x < 0 || seed.x >= width || seed.y < 0 || seed.y >= height) return null;
  const threshold = Math.max(0, Math.min(255, Math.round(tolerance)));
  const seedIndex = (seed.y * width) + seed.x;
  const target = parsePixelColor(pixels[String(seedIndex)]);

  if (match === "global") {
    const matching: number[] = [];
    for (let index = 0; index < width * height; index += 1) {
      if (pixelMatches(pixels, index, target, threshold)) matching.push(index);
    }
    return selectionFromAbsoluteIndices(matching, width, height);
  }

  const matching: number[] = [];
  const pending = [seedIndex];
  const visited = new Uint8Array(width * height);
  while (pending.length > 0) {
    const index = pending.pop();
    if (index === undefined || visited[index]) continue;
    visited[index] = 1;
    if (!pixelMatches(pixels, index, target, threshold)) continue;
    matching.push(index);
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) pending.push(index - 1);
    if (x + 1 < width) pending.push(index + 1);
    if (y > 0) pending.push(index - width);
    if (y + 1 < height) pending.push(index + width);
  }
  return selectionFromAbsoluteIndices(matching, width, height);
}
