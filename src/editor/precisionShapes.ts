import type { CursorPosition, PrecisionToolId, ShapeMode } from "../types";
import type { PixelMap } from "./project";
import { applySquareBrush, forEachLinePoint, pixelIndex } from "./pixels";

interface ShapeBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function boundsBetween(start: CursorPosition, end: CursorPosition): ShapeBounds {
  return {
    left: Math.min(start.x, end.x),
    right: Math.max(start.x, end.x),
    top: Math.min(start.y, end.y),
    bottom: Math.max(start.y, end.y),
  };
}

function availableSteps(origin: number, direction: number, limit: number) {
  if (direction > 0) return limit - 1 - origin;
  if (direction < 0) return origin;
  return Number.POSITIVE_INFINITY;
}

function constrainLineEnd(
  start: CursorPosition,
  end: CursorPosition,
  width: number,
  height: number,
): CursorPosition {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  if (deltaX === 0 && deltaY === 0) return end;

  const snappedAngle = Math.round(Math.atan2(deltaY, deltaX) / (Math.PI / 4)) * (Math.PI / 4);
  const directionX = Math.round(Math.cos(snappedAngle));
  const directionY = Math.round(Math.sin(snappedAngle));
  const distance = Math.hypot(deltaX, deltaY);
  const requestedSteps = Math.round(
    distance / (directionX !== 0 && directionY !== 0 ? Math.SQRT2 : 1),
  );
  const steps = Math.max(0, Math.min(
    requestedSteps,
    availableSteps(start.x, directionX, width),
    availableSteps(start.y, directionY, height),
  ));

  return {
    x: start.x + directionX * steps,
    y: start.y + directionY * steps,
  };
}

function constrainSquareEnd(
  start: CursorPosition,
  end: CursorPosition,
  width: number,
  height: number,
): CursorPosition {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const requestedSteps = Math.max(Math.abs(deltaX), Math.abs(deltaY));
  if (requestedSteps === 0) return end;

  const directionX = deltaX === 0
    ? (start.x + requestedSteps < width ? 1 : -1)
    : Math.sign(deltaX);
  const directionY = deltaY === 0
    ? (start.y + requestedSteps < height ? 1 : -1)
    : Math.sign(deltaY);
  const steps = Math.max(0, Math.min(
    requestedSteps,
    availableSteps(start.x, directionX, width),
    availableSteps(start.y, directionY, height),
  ));

  return {
    x: start.x + directionX * steps,
    y: start.y + directionY * steps,
  };
}

export function getPrecisionShapeEnd(
  tool: PrecisionToolId,
  start: CursorPosition,
  end: CursorPosition,
  constrained: boolean,
  width: number,
  height: number,
) {
  const clampedEnd = {
    x: clamp(end.x, 0, width - 1),
    y: clamp(end.y, 0, height - 1),
  };
  if (!constrained) return clampedEnd;
  return tool === "line"
    ? constrainLineEnd(start, clampedEnd, width, height)
    : constrainSquareEnd(start, clampedEnd, width, height);
}

function ellipseContains(bounds: ShapeBounds, x: number, y: number) {
  const radiusX = (bounds.right - bounds.left + 1) / 2;
  const radiusY = (bounds.bottom - bounds.top + 1) / 2;
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  const normalizedX = (x - centerX) / radiusX;
  const normalizedY = (y - centerY) / radiusY;
  return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
}

function forEachRectanglePoint(
  bounds: ShapeBounds,
  mode: ShapeMode,
  visit: (position: CursorPosition) => void,
) {
  for (let y = bounds.top; y <= bounds.bottom; y += 1) {
    for (let x = bounds.left; x <= bounds.right; x += 1) {
      const onEdge = x === bounds.left
        || x === bounds.right
        || y === bounds.top
        || y === bounds.bottom;
      if (mode === "filled" || onEdge) visit({ x, y });
    }
  }
}

function forEachEllipsePoint(
  bounds: ShapeBounds,
  mode: ShapeMode,
  visit: (position: CursorPosition) => void,
) {
  for (let y = bounds.top; y <= bounds.bottom; y += 1) {
    for (let x = bounds.left; x <= bounds.right; x += 1) {
      if (!ellipseContains(bounds, x, y)) continue;
      const onEdge = !ellipseContains(bounds, x - 1, y)
        || !ellipseContains(bounds, x + 1, y)
        || !ellipseContains(bounds, x, y - 1)
        || !ellipseContains(bounds, x, y + 1);
      if (mode === "filled" || onEdge) visit({ x, y });
    }
  }
}

export function forEachPrecisionShapePoint(
  tool: PrecisionToolId,
  start: CursorPosition,
  end: CursorPosition,
  mode: ShapeMode,
  visit: (position: CursorPosition) => void,
) {
  if (tool === "line") {
    forEachLinePoint(start, end, visit);
    return;
  }

  const bounds = boundsBetween(start, end);
  if (tool === "rectangle") forEachRectanglePoint(bounds, mode, visit);
  else forEachEllipsePoint(bounds, mode, visit);
}

export function applyPrecisionShape(
  pixels: PixelMap,
  tool: PrecisionToolId,
  start: CursorPosition,
  end: CursorPosition,
  mode: ShapeMode,
  brushSize: number,
  width: number,
  height: number,
  color: string,
) {
  let changed = false;
  const paintOutlinePoint = (position: CursorPosition) => {
    changed = applySquareBrush(
      pixels,
      position,
      brushSize,
      width,
      height,
      color,
    ) || changed;
  };
  const paintFilledPoint = (position: CursorPosition) => {
    const index = pixelIndex(position.x, position.y, width);
    if (pixels[index] === color) return;
    pixels[index] = color;
    changed = true;
  };

  const visit = mode === "filled" ? paintFilledPoint : paintOutlinePoint;
  forEachPrecisionShapePoint(tool, start, end, mode, visit);
  return changed;
}
