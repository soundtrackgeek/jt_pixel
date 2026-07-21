import { Pipette } from "lucide-react";
import {
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { hexToRgb, type EyedropperSource, type PixelLensSample } from "../editor/colorOperations";

const CELL_SIZE = 12;
const LENS_GAP = 24;
const LENS_MARGIN = 8;

export interface PixelLensPlacement {
  anchorX: number;
  anchorY: number;
  containerHeight: number;
  containerWidth: number;
}

export interface PixelLensHandle {
  hide: () => void;
  show: (
    sample: PixelLensSample,
    placement: PixelLensPlacement,
    source: EyedropperSource,
  ) => void;
}

function drawTransparentCell(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
) {
  const half = CELL_SIZE / 2;
  context.fillStyle = "#0a1522";
  context.fillRect(x, y, CELL_SIZE, CELL_SIZE);
  context.fillStyle = "#14283a";
  context.fillRect(x, y, half, half);
  context.fillRect(x + half, y + half, half, half);
}

function drawOutsideCell(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
) {
  context.fillStyle = "#030811";
  context.fillRect(x, y, CELL_SIZE, CELL_SIZE);
  context.strokeStyle = "#102131";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(x, y + CELL_SIZE);
  context.lineTo(x + CELL_SIZE, y);
  context.stroke();
}

function drawSample(canvas: HTMLCanvasElement, sample: PixelLensSample) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const pixelSize = sample.size * CELL_SIZE;
  if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
    canvas.width = pixelSize;
    canvas.height = pixelSize;
  }
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, pixelSize, pixelSize);
  sample.cells.forEach((cell, index) => {
    const x = (index % sample.size) * CELL_SIZE;
    const y = Math.floor(index / sample.size) * CELL_SIZE;
    if (!cell.inBounds) drawOutsideCell(context, x, y);
    else if (!cell.color) drawTransparentCell(context, x, y);
    else {
      context.fillStyle = cell.color;
      context.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    }
    context.strokeStyle = "rgba(103, 151, 178, 0.3)";
    context.lineWidth = 1;
    context.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
  });

  const centerOffset = Math.floor(sample.size / 2) * CELL_SIZE;
  context.strokeStyle = "#050b13";
  context.lineWidth = 5;
  context.strokeRect(centerOffset + 0.5, centerOffset + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
  context.strokeStyle = "#f5efdf";
  context.lineWidth = 3;
  context.strokeRect(centerOffset + 0.5, centerOffset + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
  context.strokeStyle = "#42c8e3";
  context.lineWidth = 1;
  context.strokeRect(centerOffset + 1.5, centerOffset + 1.5, CELL_SIZE - 3, CELL_SIZE - 3);
}

export const PixelLens = forwardRef<PixelLensHandle>(function PixelLens(_, forwardedRef) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorRef = useRef<HTMLElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const sourceRef = useRef<HTMLElement>(null);
  const swatchRef = useRef<HTMLElement>(null);

  useImperativeHandle(forwardedRef, () => ({
    hide() {
      const root = rootRef.current;
      if (root) root.dataset.visible = "false";
    },
    show(sample, placement, source) {
      const root = rootRef.current;
      const canvas = canvasRef.current;
      if (!root || !canvas) return;
      drawSample(canvas, sample);

      const color = sample.centerColor;
      const sourceLabel = source === "visible-pixels" ? "VISIBLE" : "LAYER";
      if (colorRef.current) colorRef.current.textContent = color?.toUpperCase() ?? "TRANSPARENT";
      if (sourceRef.current) sourceRef.current.textContent = sourceLabel;
      if (detailRef.current) {
        const rgb = color ? hexToRgb(color) : null;
        detailRef.current.textContent = rgb
          ? `RGB ${rgb.red} ${rgb.green} ${rgb.blue} · X ${sample.center.x} Y ${sample.center.y}`
          : `NO COLOR · X ${sample.center.x} Y ${sample.center.y}`;
      }
      if (swatchRef.current) {
        swatchRef.current.style.backgroundColor = color ?? "";
        swatchRef.current.dataset.transparent = String(color === null);
      }

      root.dataset.color = color ?? "transparent";
      root.dataset.position = `${sample.center.x},${sample.center.y}`;
      root.dataset.source = source;
      root.dataset.visible = "true";

      const width = root.offsetWidth;
      const height = root.offsetHeight;
      const placeLeft = placement.anchorX + LENS_GAP + width + LENS_MARGIN > placement.containerWidth;
      const placeAbove = placement.anchorY + LENS_GAP + height + LENS_MARGIN > placement.containerHeight;
      const preferredLeft = placeLeft
        ? placement.anchorX - LENS_GAP - width
        : placement.anchorX + LENS_GAP;
      const preferredTop = placeAbove
        ? placement.anchorY - LENS_GAP - height
        : placement.anchorY + LENS_GAP;
      const maximumLeft = Math.max(LENS_MARGIN, placement.containerWidth - width - LENS_MARGIN);
      const maximumTop = Math.max(LENS_MARGIN, placement.containerHeight - height - LENS_MARGIN);
      const left = Math.max(LENS_MARGIN, Math.min(maximumLeft, preferredLeft));
      const top = Math.max(LENS_MARGIN, Math.min(maximumTop, preferredTop));
      root.dataset.horizontal = placeLeft ? "left" : "right";
      root.dataset.vertical = placeAbove ? "above" : "below";
      root.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    },
  }), []);

  return (
    <div
      ref={rootRef}
      className="pixel-lens"
      data-testid="pixel-lens"
      data-visible="false"
      data-color="transparent"
      aria-hidden="true"
    >
      <div className="pixel-lens__header">
        <span><Pipette size={12} strokeWidth={2.2} /> PIXEL LENS</span>
        <em ref={sourceRef}>VISIBLE</em>
      </div>
      <div className="pixel-lens__grid">
        <canvas ref={canvasRef} width={108} height={108} />
      </div>
      <div className="pixel-lens__readout">
        <i ref={swatchRef} data-transparent="true" />
        <span>
          <strong ref={colorRef}>TRANSPARENT</strong>
          <small ref={detailRef}>NO COLOR · X 0 Y 0</small>
        </span>
      </div>
    </div>
  );
});
