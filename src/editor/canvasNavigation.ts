import type { CursorPosition } from "../types";

export const MIN_CANVAS_ZOOM = 25;
export const MAX_CANVAS_ZOOM = 6400;
export const CANVAS_ZOOM_LEVELS = [25, 50, 75, 100, 200, 400, 800, 1600, 3200, 6400] as const;

export function clampCanvasZoom(zoom: number) {
  return Math.max(MIN_CANVAS_ZOOM, Math.min(MAX_CANVAS_ZOOM, Math.round(zoom)));
}

export function steppedCanvasZoom(zoom: number, direction: -1 | 1) {
  if (direction > 0) {
    return CANVAS_ZOOM_LEVELS.find((level) => level > zoom) ?? MAX_CANVAS_ZOOM;
  }
  return [...CANVAS_ZOOM_LEVELS].reverse().find((level) => level < zoom) ?? MIN_CANVAS_ZOOM;
}

export function fitCanvasZoom(
  viewportWidth: number,
  viewportHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  padding = 36,
) {
  const availableWidth = Math.max(1, viewportWidth - padding);
  const availableHeight = Math.max(1, viewportHeight - padding);
  const rawZoom = Math.min(
    availableWidth / Math.max(1, canvasWidth),
    availableHeight / Math.max(1, canvasHeight),
  ) * 100;
  const step = rawZoom >= 100 ? 100 : 25;
  return clampCanvasZoom(Math.max(step, Math.floor(rawZoom / step) * step));
}

interface ZoomAroundPointOptions {
  currentZoom: number;
  nextZoom: number;
  pan: CursorPosition;
  point: CursorPosition;
  viewport: { height: number; width: number };
}

export function zoomAroundPoint({
  currentZoom,
  nextZoom,
  pan,
  point,
  viewport,
}: ZoomAroundPointOptions): CursorPosition {
  const ratio = clampCanvasZoom(nextZoom) / Math.max(MIN_CANVAS_ZOOM, currentZoom);
  const offsetX = point.x - (viewport.width / 2) - pan.x;
  const offsetY = point.y - (viewport.height / 2) - pan.y;
  return {
    x: point.x - (viewport.width / 2) - (offsetX * ratio),
    y: point.y - (viewport.height / 2) - (offsetY * ratio),
  };
}

interface ClampCanvasPanOptions {
  artboardHeight: number;
  artboardWidth: number;
  minimumVisible?: number;
  pan: CursorPosition;
  viewportHeight: number;
  viewportWidth: number;
}

export function clampCanvasPan({
  artboardHeight,
  artboardWidth,
  minimumVisible = 48,
  pan,
  viewportHeight,
  viewportWidth,
}: ClampCanvasPanOptions): CursorPosition {
  const horizontalLimit = Math.max(0, (artboardWidth / 2) + (viewportWidth / 2) - minimumVisible);
  const verticalLimit = Math.max(0, (artboardHeight / 2) + (viewportHeight / 2) - minimumVisible);
  return {
    x: Math.max(-horizontalLimit, Math.min(horizontalLimit, pan.x)),
    y: Math.max(-verticalLimit, Math.min(verticalLimit, pan.y)),
  };
}
