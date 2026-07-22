import type { CursorPosition, SelectionBounds } from "../types";
import type { PixelMap } from "./project";
import { isPositionInSelection } from "./selectionRegion";

export function pixelIndex(x: number, y: number, width: number) {
  return String(y * width + x);
}

export function hexWithOpacity(hex: string, opacity: number) {
  if (opacity >= 100) return hex;
  const alpha = Math.round((Math.max(0, opacity) / 100) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${alpha}`;
}

export function forEachLinePoint(
  start: CursorPosition,
  end: CursorPosition,
  visit: (position: CursorPosition) => void,
) {
  let x = start.x;
  let y = start.y;
  const dx = Math.abs(end.x - start.x);
  const sx = start.x < end.x ? 1 : -1;
  const dy = -Math.abs(end.y - start.y);
  const sy = start.y < end.y ? 1 : -1;
  let error = dx + dy;

  while (true) {
    visit({ x, y });
    if (x === end.x && y === end.y) break;
    const twiceError = 2 * error;
    if (twiceError >= dy) {
      error += dy;
      x += sx;
    }
    if (twiceError <= dx) {
      error += dx;
      y += sy;
    }
  }
}

export function applySquareBrush(
  pixels: PixelMap,
  position: CursorPosition,
  size: number,
  width: number,
  height: number,
  color: string | null,
  bounds?: SelectionBounds,
) {
  let changed = false;
  const offset = Math.floor(size / 2);
  for (let y = position.y - offset; y < position.y - offset + size; y += 1) {
    for (let x = position.x - offset; x < position.x - offset + size; x += 1) {
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      if (bounds && !isPositionInSelection({ x, y }, bounds)) continue;
      const index = pixelIndex(x, y, width);
      if (color === null) {
        if (!(index in pixels)) continue;
        delete pixels[index];
      } else {
        if (pixels[index] === color) continue;
        pixels[index] = color;
      }
      changed = true;
    }
  }
  return changed;
}

export function floodFillPixelMap(
  pixels: PixelMap,
  start: CursorPosition,
  width: number,
  height: number,
  color: string,
  bounds?: SelectionBounds,
) {
  if (bounds && !isPositionInSelection(start, bounds)) return false;
  const startIndex = pixelIndex(start.x, start.y, width);
  const targetColor = pixels[startIndex] ?? null;
  if (targetColor === color) return false;

  const pending: CursorPosition[] = [start];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const position = pending.pop();
    if (!position) break;

    const index = pixelIndex(position.x, position.y, width);
    if (visited.has(index)) continue;
    visited.add(index);
    if (bounds && !isPositionInSelection(position, bounds)) continue;
    if ((pixels[index] ?? null) !== targetColor) continue;
    pixels[index] = color;

    const minimumX = bounds?.x ?? 0;
    const maximumX = bounds ? bounds.x + bounds.width - 1 : width - 1;
    const minimumY = bounds?.y ?? 0;
    const maximumY = bounds ? bounds.y + bounds.height - 1 : height - 1;
    if (position.x > minimumX) pending.push({ x: position.x - 1, y: position.y });
    if (position.x < maximumX) pending.push({ x: position.x + 1, y: position.y });
    if (position.y > minimumY) pending.push({ x: position.x, y: position.y - 1 });
    if (position.y < maximumY) pending.push({ x: position.x, y: position.y + 1 });
  }

  return true;
}

export function drawPixelMap(
  context: CanvasRenderingContext2D,
  pixels: PixelMap,
  width: number,
) {
  for (const [rawIndex, color] of Object.entries(pixels)) {
    const index = Number(rawIndex);
    context.fillStyle = color;
    context.fillRect(index % width, Math.floor(index / width), 1, 1);
  }
}

export function renderPixelMap(
  canvas: HTMLCanvasElement,
  pixels: PixelMap,
  width: number,
  height: number,
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, width, height);
  drawPixelMap(context, pixels, width);
}
