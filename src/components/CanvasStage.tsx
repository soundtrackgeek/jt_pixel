import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";
import courierScene from "../assets/courier-scene.png";
import type { CursorPosition, ToolId } from "../types";

interface CanvasStageProps {
  activeColor: string;
  activeFrame: number;
  activeTool: ToolId;
  brushSize: number;
  opacity: number;
  pixelPerfect: boolean;
  onCursorChange: (position: CursorPosition) => void;
}

const documentSize = 64;

export function CanvasStage({
  activeColor,
  activeFrame,
  activeTool,
  brushSize,
  opacity,
  pixelPerfect,
  onCursorChange,
}: CanvasStageProps) {
  const paintCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [zoom, setZoom] = useState(800);

  function eventToPixel(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(documentSize - 1, Math.floor(((event.clientX - rect.left) / rect.width) * documentSize)),
      ),
      y: Math.max(
        0,
        Math.min(documentSize - 1, Math.floor(((event.clientY - rect.top) / rect.height) * documentSize)),
      ),
    };
  }

  function paint(position: CursorPosition) {
    const canvas = paintCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context) return;

    context.imageSmoothingEnabled = false;
    const offset = Math.floor(brushSize / 2);

    if (activeTool === "eraser") {
      context.clearRect(position.x - offset, position.y - offset, brushSize, brushSize);
      return;
    }

    if (activeTool === "bucket") {
      context.globalAlpha = opacity / 100;
      context.fillStyle = activeColor;
      context.fillRect(0, 0, documentSize, documentSize);
      context.globalAlpha = 1;
      return;
    }

    if (activeTool !== "pencil") return;

    context.globalAlpha = opacity / 100;
    context.fillStyle = activeColor;
    context.fillRect(position.x - offset, position.y - offset, brushSize, brushSize);
    context.globalAlpha = 1;
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    isDrawingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const position = eventToPixel(event);
    onCursorChange(position);
    paint(position);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const position = eventToPixel(event);
    onCursorChange(position);
    if (isDrawingRef.current) paint(position);
  }

  function stopDrawing() {
    isDrawingRef.current = false;
  }

  function clearPaintLayer() {
    const canvas = paintCanvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, documentSize, documentSize);
  }

  return (
    <main className="canvas-stage" aria-label="Pixel canvas workspace">
      <div className="canvas-stage__header">
        <div>
          <span className="document-name">courier-bloom.jtp</span>
          <span className="unsaved-indicator" aria-label="Unsaved changes" />
        </div>
        <div className="canvas-stage__meta">
          <span>FRAME {activeFrame + 1}</span>
          <span>{pixelPerfect ? "PIXEL PERFECT" : "SMOOTH INPUT"}</span>
        </div>
      </div>

      <div className="canvas-viewport">
        <div className="transparency-field" aria-hidden="true" />
        <div
          className="artboard"
          style={{ "--frame-shift": `${(activeFrame - 3) * 0.35}px` } as React.CSSProperties}
        >
          <img src={courierScene} alt="Pixel art space courier and hovering robot" draggable={false} />
          <canvas
            ref={paintCanvasRef}
            className={`paint-layer paint-layer--${activeTool}`}
            width={documentSize}
            height={documentSize}
            aria-label="Interactive 64 by 64 paint layer"
            data-testid="paint-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            onPointerLeave={stopDrawing}
          />
          <div className="pixel-grid-overlay" aria-hidden="true" />
        </div>
      </div>

      <div className="canvas-controls">
        <button className="icon-button" aria-label="Reset painted layer" title="Reset painted layer" onClick={clearPaintLayer}>
          <RotateCcw size={15} />
        </button>
        <div className="zoom-control">
          <button
            aria-label="Zoom out"
            onClick={() => setZoom((current) => Math.max(100, current - 100))}
          >
            <Minus size={14} />
          </button>
          <output>{zoom}%</output>
          <button
            aria-label="Zoom in"
            onClick={() => setZoom((current) => Math.min(1600, current + 100))}
          >
            <Plus size={14} />
          </button>
        </div>
        <button className="icon-button" aria-label="Fit canvas" title="Fit canvas">
          <Maximize2 size={15} />
        </button>
      </div>
    </main>
  );
}
