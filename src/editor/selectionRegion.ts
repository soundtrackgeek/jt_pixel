import type { CursorPosition, SelectionBounds } from "../types";

export type SelectionCombineMode = "add" | "replace" | "subtract";

function insideBounds(position: CursorPosition, bounds: SelectionBounds) {
  return position.x >= bounds.x
    && position.x < bounds.x + bounds.width
    && position.y >= bounds.y
    && position.y < bounds.y + bounds.height;
}

function relativeIndex(position: CursorPosition, bounds: SelectionBounds) {
  return ((position.y - bounds.y) * bounds.width) + position.x - bounds.x;
}

export function isPositionInSelection(
  position: CursorPosition,
  bounds: SelectionBounds,
) {
  if (!insideBounds(position, bounds)) return false;
  return bounds.mask === undefined
    || bounds.mask[String(relativeIndex(position, bounds))] === true;
}

export function forEachSelectionPosition(
  bounds: SelectionBounds,
  visit: (position: CursorPosition) => void,
) {
  for (let y = bounds.y; y < bounds.y + bounds.height; y += 1) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x += 1) {
      const position = { x, y };
      if (isPositionInSelection(position, bounds)) visit(position);
    }
  }
}

export function countSelectionCells(bounds: SelectionBounds) {
  return bounds.mask
    ? Object.keys(bounds.mask).length
    : bounds.width * bounds.height;
}

export function selectionFromAbsoluteIndices(
  indices: Iterable<number>,
  canvasWidth: number,
  canvasHeight: number,
): SelectionBounds | null {
  const unique = new Set<number>();
  let minimumX = canvasWidth;
  let minimumY = canvasHeight;
  let maximumX = -1;
  let maximumY = -1;

  for (const index of indices) {
    if (!Number.isInteger(index) || index < 0 || index >= canvasWidth * canvasHeight) continue;
    if (unique.has(index)) continue;
    unique.add(index);
    const x = index % canvasWidth;
    const y = Math.floor(index / canvasWidth);
    minimumX = Math.min(minimumX, x);
    minimumY = Math.min(minimumY, y);
    maximumX = Math.max(maximumX, x);
    maximumY = Math.max(maximumY, y);
  }

  if (unique.size === 0) return null;
  const width = maximumX - minimumX + 1;
  const height = maximumY - minimumY + 1;
  if (unique.size === width * height) {
    return { x: minimumX, y: minimumY, width, height };
  }

  const mask: Record<string, true> = {};
  for (const index of unique) {
    const x = index % canvasWidth;
    const y = Math.floor(index / canvasWidth);
    mask[String(((y - minimumY) * width) + x - minimumX)] = true;
  }
  return { x: minimumX, y: minimumY, width, height, mask };
}

export function selectionAbsoluteIndices(
  bounds: SelectionBounds,
  canvasWidth: number,
) {
  const indices = new Set<number>();
  forEachSelectionPosition(bounds, ({ x, y }) => indices.add((y * canvasWidth) + x));
  return indices;
}

export function combineSelectionRegions(
  current: SelectionBounds | null,
  candidate: SelectionBounds | null,
  mode: SelectionCombineMode,
  canvasWidth: number,
  canvasHeight: number,
) {
  if (mode === "replace") return candidate;
  if (mode === "add" && !current) return candidate;
  if (!current) return null;
  if (!candidate) return current;

  const combined = selectionAbsoluteIndices(current, canvasWidth);
  for (const index of selectionAbsoluteIndices(candidate, canvasWidth)) {
    if (mode === "add") combined.add(index);
    else combined.delete(index);
  }
  return selectionFromAbsoluteIndices(combined, canvasWidth, canvasHeight);
}
