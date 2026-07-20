import type { CursorPosition } from "../types";
import type { PixelMap } from "./project";

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
) {
  const offset = Math.floor(size / 2);
  for (let y = position.y - offset; y < position.y - offset + size; y += 1) {
    for (let x = position.x - offset; x < position.x - offset + size; x += 1) {
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const index = pixelIndex(x, y, width);
      if (color === null) delete pixels[index];
      else pixels[index] = color;
    }
  }
}

export function fillPixelMap(width: number, height: number, color: string): PixelMap {
  const pixels: PixelMap = {};
  for (let index = 0; index < width * height; index += 1) pixels[String(index)] = color;
  return pixels;
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
