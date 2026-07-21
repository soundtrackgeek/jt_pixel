import type {
  CursorPosition,
  SelectionBounds,
} from "../types";
import type { PixelMap } from "./project";
import { pixelIndex } from "./pixels";

export type SelectionFlipAxis = "horizontal" | "vertical";

export interface SelectionClipboard {
  height: number;
  pixels: PixelMap;
  sourceX: number;
  sourceY: number;
  width: number;
}

export interface SelectionTransformResult {
  bounds: SelectionBounds;
  pixels: PixelMap;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function normalizeSelectionBounds(
  start: CursorPosition,
  end: CursorPosition,
  canvasWidth: number,
  canvasHeight: number,
): SelectionBounds {
  const startX = clamp(Math.round(start.x), 0, canvasWidth - 1);
  const startY = clamp(Math.round(start.y), 0, canvasHeight - 1);
  const endX = clamp(Math.round(end.x), 0, canvasWidth - 1);
  const endY = clamp(Math.round(end.y), 0, canvasHeight - 1);
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  return {
    x,
    y,
    width: Math.abs(endX - startX) + 1,
    height: Math.abs(endY - startY) + 1,
  };
}

export function isPositionInSelection(
  position: CursorPosition,
  bounds: SelectionBounds,
) {
  return position.x >= bounds.x
    && position.x < bounds.x + bounds.width
    && position.y >= bounds.y
    && position.y < bounds.y + bounds.height;
}

export function clampSelectionDelta(
  bounds: SelectionBounds,
  deltaX: number,
  deltaY: number,
  canvasWidth: number,
  canvasHeight: number,
) {
  return {
    x: clamp(
      Math.round(deltaX),
      -bounds.x,
      canvasWidth - bounds.x - bounds.width,
    ),
    y: clamp(
      Math.round(deltaY),
      -bounds.y,
      canvasHeight - bounds.y - bounds.height,
    ),
  };
}

export function copySelectionPixels(
  pixels: PixelMap,
  bounds: SelectionBounds,
  canvasWidth: number,
): SelectionClipboard {
  const copied: PixelMap = {};
  for (const [rawIndex, color] of Object.entries(pixels)) {
    const index = Number(rawIndex);
    const x = index % canvasWidth;
    const y = Math.floor(index / canvasWidth);
    if (!isPositionInSelection({ x, y }, bounds)) continue;
    copied[pixelIndex(x - bounds.x, y - bounds.y, bounds.width)] = color;
  }
  return {
    width: bounds.width,
    height: bounds.height,
    pixels: copied,
    sourceX: bounds.x,
    sourceY: bounds.y,
  };
}

export function deleteSelectionPixels(
  pixels: PixelMap,
  bounds: SelectionBounds,
  canvasWidth: number,
) {
  const next = { ...pixels };
  for (const rawIndex of Object.keys(next)) {
    const index = Number(rawIndex);
    const position = {
      x: index % canvasWidth,
      y: Math.floor(index / canvasWidth),
    };
    if (isPositionInSelection(position, bounds)) delete next[rawIndex];
  }
  return next;
}

export function pasteSelectionPixels(
  pixels: PixelMap,
  clipboard: SelectionClipboard,
  targetX: number,
  targetY: number,
  canvasWidth: number,
  canvasHeight: number,
): SelectionTransformResult {
  const width = Math.min(clipboard.width, canvasWidth);
  const height = Math.min(clipboard.height, canvasHeight);
  const x = clamp(Math.round(targetX), 0, Math.max(0, canvasWidth - width));
  const y = clamp(Math.round(targetY), 0, Math.max(0, canvasHeight - height));
  const next = { ...pixels };

  for (const [rawIndex, color] of Object.entries(clipboard.pixels)) {
    const index = Number(rawIndex);
    const relativeX = index % clipboard.width;
    const relativeY = Math.floor(index / clipboard.width);
    if (relativeX >= width || relativeY >= height) continue;
    next[pixelIndex(x + relativeX, y + relativeY, canvasWidth)] = color;
  }

  return { pixels: next, bounds: { x, y, width, height } };
}

export function moveSelectionPixels(
  pixels: PixelMap,
  bounds: SelectionBounds,
  deltaX: number,
  deltaY: number,
  canvasWidth: number,
  canvasHeight: number,
): SelectionTransformResult {
  const delta = clampSelectionDelta(
    bounds,
    deltaX,
    deltaY,
    canvasWidth,
    canvasHeight,
  );
  const clipboard = copySelectionPixels(pixels, bounds, canvasWidth);
  const cleared = deleteSelectionPixels(pixels, bounds, canvasWidth);
  return pasteSelectionPixels(
    cleared,
    clipboard,
    bounds.x + delta.x,
    bounds.y + delta.y,
    canvasWidth,
    canvasHeight,
  );
}

export function flipSelectionPixels(
  pixels: PixelMap,
  bounds: SelectionBounds,
  axis: SelectionFlipAxis,
  canvasWidth: number,
  canvasHeight: number,
): PixelMap {
  const clipboard = copySelectionPixels(pixels, bounds, canvasWidth);
  const flipped: SelectionClipboard = {
    ...clipboard,
    pixels: {},
  };
  for (const [rawIndex, color] of Object.entries(clipboard.pixels)) {
    const index = Number(rawIndex);
    const x = index % clipboard.width;
    const y = Math.floor(index / clipboard.width);
    const nextX = axis === "horizontal" ? clipboard.width - x - 1 : x;
    const nextY = axis === "vertical" ? clipboard.height - y - 1 : y;
    flipped.pixels[pixelIndex(nextX, nextY, clipboard.width)] = color;
  }
  return pasteSelectionPixels(
    deleteSelectionPixels(pixels, bounds, canvasWidth),
    flipped,
    bounds.x,
    bounds.y,
    canvasWidth,
    canvasHeight,
  ).pixels;
}

export function rotateSelectionPixels(
  pixels: PixelMap,
  bounds: SelectionBounds,
  canvasWidth: number,
  canvasHeight: number,
): SelectionTransformResult {
  const clipboard = copySelectionPixels(pixels, bounds, canvasWidth);
  const rotated: SelectionClipboard = {
    width: clipboard.height,
    height: clipboard.width,
    pixels: {},
    sourceX: bounds.x,
    sourceY: bounds.y,
  };
  for (const [rawIndex, color] of Object.entries(clipboard.pixels)) {
    const index = Number(rawIndex);
    const x = index % clipboard.width;
    const y = Math.floor(index / clipboard.width);
    rotated.pixels[pixelIndex(clipboard.height - y - 1, x, rotated.width)] = color;
  }
  const targetX = bounds.x + Math.round((bounds.width - rotated.width) / 2);
  const targetY = bounds.y + Math.round((bounds.height - rotated.height) / 2);
  return pasteSelectionPixels(
    deleteSelectionPixels(pixels, bounds, canvasWidth),
    rotated,
    targetX,
    targetY,
    canvasWidth,
    canvasHeight,
  );
}

export function mergeSelectionChanges(
  basePixels: PixelMap,
  changedPixels: PixelMap,
  bounds: SelectionBounds,
  canvasWidth: number,
) {
  const next = deleteSelectionPixels(basePixels, bounds, canvasWidth);
  for (const [rawIndex, color] of Object.entries(changedPixels)) {
    const index = Number(rawIndex);
    const position = {
      x: index % canvasWidth,
      y: Math.floor(index / canvasWidth),
    };
    if (isPositionInSelection(position, bounds)) next[rawIndex] = color;
  }
  return next;
}

export function pixelMapsEqual(left: PixelMap, right: PixelMap) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => left[key] === right[key]);
}

export function countSelectedPixels(
  pixels: PixelMap,
  bounds: SelectionBounds,
  canvasWidth: number,
) {
  let count = 0;
  for (const rawIndex of Object.keys(pixels)) {
    const index = Number(rawIndex);
    if (isPositionInSelection({
      x: index % canvasWidth,
      y: Math.floor(index / canvasWidth),
    }, bounds)) count += 1;
  }
  return count;
}
