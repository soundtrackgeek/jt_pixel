import type {
  CursorPosition,
  PrecisionToolId,
  SelectionBounds,
  ShapeMode,
} from "../types";
import { forEachPrecisionShapePoint } from "./precisionShapes";
import { pixelIndex } from "./pixels";
import type { PixelMap } from "./project";

export type TileMode = "standard" | "seamless";
export type TileRepeatPreview = "off" | "3x3";
export type TileSymmetry = "off" | "horizontal" | "vertical" | "quad";

export interface TileWorkspaceSettings {
  mode: TileMode;
  repeatPreview: TileRepeatPreview;
  symmetry: TileSymmetry;
}

export const DEFAULT_TILE_WORKSPACE_SETTINGS: TileWorkspaceSettings = {
  mode: "standard",
  repeatPreview: "off",
  symmetry: "off",
};

function insideBounds(position: CursorPosition, bounds?: SelectionBounds) {
  return !bounds || (
    position.x >= bounds.x
    && position.x < bounds.x + bounds.width
    && position.y >= bounds.y
    && position.y < bounds.y + bounds.height
  );
}

export function wrapTileCoordinate(value: number, size: number) {
  return ((value % size) + size) % size;
}

export function tileSymmetryPositions(
  position: CursorPosition,
  width: number,
  height: number,
  symmetry: TileSymmetry,
) {
  const positions = [position];
  if (symmetry === "horizontal" || symmetry === "quad") {
    positions.push({ x: width - 1 - position.x, y: position.y });
  }
  if (symmetry === "vertical" || symmetry === "quad") {
    positions.push({ x: position.x, y: height - 1 - position.y });
  }
  if (symmetry === "quad") {
    positions.push({ x: width - 1 - position.x, y: height - 1 - position.y });
  }

  return Array.from(
    new Map(positions.map((candidate) => [
      `${candidate.x}:${candidate.y}`,
      candidate,
    ])).values(),
  );
}

function setPixel(
  pixels: PixelMap,
  position: CursorPosition,
  width: number,
  color: string | null,
) {
  const index = pixelIndex(position.x, position.y, width);
  if (color === null) {
    if (!(index in pixels)) return false;
    delete pixels[index];
    return true;
  }
  if (pixels[index] === color) return false;
  pixels[index] = color;
  return true;
}

export function applyTileBrush(
  pixels: PixelMap,
  position: CursorPosition,
  size: number,
  width: number,
  height: number,
  color: string | null,
  settings: TileWorkspaceSettings,
  bounds?: SelectionBounds,
) {
  let changed = false;
  const offset = Math.floor(size / 2);
  for (let rawY = position.y - offset; rawY < position.y - offset + size; rawY += 1) {
    for (let rawX = position.x - offset; rawX < position.x - offset + size; rawX += 1) {
      const canWrap = settings.mode === "seamless" && bounds === undefined;
      if (!canWrap && (rawX < 0 || rawY < 0 || rawX >= width || rawY >= height)) continue;
      const primary = {
        x: canWrap ? wrapTileCoordinate(rawX, width) : rawX,
        y: canWrap ? wrapTileCoordinate(rawY, height) : rawY,
      };
      for (const candidate of tileSymmetryPositions(
        primary,
        width,
        height,
        settings.symmetry,
      )) {
        if (!insideBounds(candidate, bounds)) continue;
        changed = setPixel(pixels, candidate, width, color) || changed;
      }
    }
  }
  return changed;
}

function fillTileRegion(
  pixels: PixelMap,
  start: CursorPosition,
  width: number,
  height: number,
  color: string,
  seamless: boolean,
  bounds?: SelectionBounds,
) {
  if (!insideBounds(start, bounds)) return false;
  const startIndex = pixelIndex(start.x, start.y, width);
  const targetColor = pixels[startIndex] ?? null;
  if (targetColor === color) return false;

  const pending = [start];
  const visited = new Set<string>();
  let changed = false;
  while (pending.length > 0) {
    const position = pending.pop();
    if (!position) break;
    const index = pixelIndex(position.x, position.y, width);
    if (visited.has(index)) continue;
    visited.add(index);
    if (!insideBounds(position, bounds) || (pixels[index] ?? null) !== targetColor) continue;
    pixels[index] = color;
    changed = true;

    for (const neighbor of [
      { x: position.x - 1, y: position.y },
      { x: position.x + 1, y: position.y },
      { x: position.x, y: position.y - 1 },
      { x: position.x, y: position.y + 1 },
    ]) {
      if (seamless && bounds === undefined) {
        pending.push({
          x: wrapTileCoordinate(neighbor.x, width),
          y: wrapTileCoordinate(neighbor.y, height),
        });
      } else if (
        neighbor.x >= 0
        && neighbor.x < width
        && neighbor.y >= 0
        && neighbor.y < height
      ) pending.push(neighbor);
    }
  }
  return changed;
}

export function floodFillTilePixelMap(
  pixels: PixelMap,
  start: CursorPosition,
  width: number,
  height: number,
  color: string,
  settings: TileWorkspaceSettings,
  bounds?: SelectionBounds,
) {
  let changed = false;
  for (const position of tileSymmetryPositions(
    start,
    width,
    height,
    settings.symmetry,
  )) {
    changed = fillTileRegion(
      pixels,
      position,
      width,
      height,
      color,
      settings.mode === "seamless",
      bounds,
    ) || changed;
  }
  return changed;
}

export function applyTilePrecisionShape(
  pixels: PixelMap,
  tool: PrecisionToolId,
  start: CursorPosition,
  end: CursorPosition,
  mode: ShapeMode,
  brushSize: number,
  width: number,
  height: number,
  color: string,
  settings: TileWorkspaceSettings,
  bounds?: SelectionBounds,
) {
  let changed = false;
  forEachPrecisionShapePoint(tool, start, end, mode, (position) => {
    changed = applyTileBrush(
      pixels,
      position,
      mode === "filled" && tool !== "line" ? 1 : brushSize,
      width,
      height,
      color,
      settings,
      bounds,
    ) || changed;
  });
  return changed;
}

export function offsetTilePixels(
  pixels: PixelMap,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number,
) {
  const shifted: PixelMap = {};
  for (const [rawIndex, color] of Object.entries(pixels)) {
    const index = Number(rawIndex);
    if (!Number.isInteger(index) || index < 0 || index >= width * height) continue;
    const x = wrapTileCoordinate((index % width) + offsetX, width);
    const y = wrapTileCoordinate(Math.floor(index / width) + offsetY, height);
    shifted[pixelIndex(x, y, width)] = color;
  }
  return shifted;
}
