import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useMemo, useRef, type CSSProperties, type PointerEvent } from "react";
import courierScene from "../assets/courier-scene.png";
import {
  applySquareBrush,
  floodFillPixelMap,
  forEachLinePoint,
  hexWithOpacity,
  renderPixelMap,
} from "../editor/pixels";
import {
  getCelPixels,
  isLayerPresent,
  isLayerVisible,
  type PixelMap,
  type ProjectDocument,
} from "../editor/project";
import type { CursorPosition, ToolId } from "../types";
import { PixelLayerCanvas } from "./PixelLayerCanvas";

interface CanvasStageProps {
  activeColor: string;
  activeFrameId: string;
  activeLayerId: string;
  activePixels: PixelMap;
  activeTool: ToolId;
  brushSize: number;
  document: ProjectDocument;
  isDirty: boolean;
  opacity: number;
  pixelPerfect: boolean;
  zoom: number;
  onClearActiveCel: () => void;
  onCommitActiveCel: (pixels: PixelMap) => void;
  onCursorChange: (position: CursorPosition) => void;
  onZoomChange: (zoom: number) => void;
}

export function CanvasStage({
  activeColor,
  activeFrameId,
  activeLayerId,
  activePixels,
  activeTool,
  brushSize,
  document,
  isDirty,
  opacity,
  pixelPerfect,
  zoom,
  onClearActiveCel,
  onCommitActiveCel,
  onCursorChange,
  onZoomChange,
}: CanvasStageProps) {
  const interactionCanvasRef = useRef<HTMLCanvasElement>(null);
  const layerCanvasesRef = useRef(new Map<string, HTMLCanvasElement>());
  const draftPixelsRef = useRef<PixelMap>({});
  const isDrawingRef = useRef(false);
  const changedRef = useRef(false);
  const lastPixelRef = useRef<CursorPosition | null>(null);
  const activeLayer = document.layers.find((layer) => layer.id === activeLayerId);
  const activeFrame = document.frames.find((frame) => frame.id === activeFrameId) ?? document.frames[0];
  const activeFrameIndex = document.frames.findIndex((frame) => frame.id === activeFrameId);
  const referenceLayer = document.layers.find(
    (layer) => layer.kind === "reference" && isLayerPresent(document, layer.id, activeFrameId),
  );
  const pixelLayers = useMemo(
    () => [...document.layers].reverse().filter(
      (layer) => layer.kind === "pixel" && isLayerPresent(document, layer.id, activeFrameId),
    ),
    [activeFrameId, document.frameLayerPresence, document.layers],
  );
  const canPaint =
    activeLayer?.kind === "pixel" &&
    !activeLayer.locked &&
    isLayerPresent(document, activeLayer.id, activeFrameId) &&
    isLayerVisible(document, activeLayer.id, activeFrameId);

  const registerCanvas = useCallback((layerId: string, canvas: HTMLCanvasElement | null) => {
    if (canvas) layerCanvasesRef.current.set(layerId, canvas);
    else layerCanvasesRef.current.delete(layerId);
  }, []);

  function eventToPixel(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(document.width - 1, Math.floor(((event.clientX - rect.left) / rect.width) * document.width))),
      y: Math.max(0, Math.min(document.height - 1, Math.floor(((event.clientY - rect.top) / rect.height) * document.height))),
    };
  }

  function redrawDraft() {
    const canvas = layerCanvasesRef.current.get(activeLayerId);
    if (canvas) renderPixelMap(canvas, draftPixelsRef.current, document.width, document.height);
  }

  function paintPoint(position: CursorPosition) {
    const color = activeTool === "eraser" ? null : hexWithOpacity(activeColor, opacity);
    applySquareBrush(
      draftPixelsRef.current,
      position,
      brushSize,
      document.width,
      document.height,
      color,
    );
    changedRef.current = true;
  }

  function paintTo(position: CursorPosition) {
    const previous = lastPixelRef.current ?? position;
    forEachLinePoint(previous, position, paintPoint);
    lastPixelRef.current = position;
    redrawDraft();
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const position = eventToPixel(event);
    onCursorChange(position);
    if (!canPaint || !["pencil", "eraser", "bucket"].includes(activeTool)) return;

    draftPixelsRef.current = { ...activePixels };
    changedRef.current = false;
    lastPixelRef.current = position;

    if (activeTool === "bucket") {
      const didFill = floodFillPixelMap(
        draftPixelsRef.current,
        position,
        document.width,
        document.height,
        hexWithOpacity(activeColor, opacity),
      );
      if (!didFill) return;
      redrawDraft();
      onCommitActiveCel(draftPixelsRef.current);
      return;
    }

    isDrawingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    paintTo(position);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const position = eventToPixel(event);
    onCursorChange(position);
    if (isDrawingRef.current) paintTo(position);
  }

  function stopDrawing() {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPixelRef.current = null;
    if (changedRef.current) onCommitActiveCel(draftPixelsRef.current);
  }

  function clearPaintLayer() {
    if (!canPaint) return;
    const canvas = layerCanvasesRef.current.get(activeLayerId);
    if (canvas) renderPixelMap(canvas, {}, document.width, document.height);
    onClearActiveCel();
  }

  return (
    <main className="canvas-stage" aria-label="Pixel canvas workspace">
      <div className="canvas-stage__header">
        <div>
          <span className="document-name">{document.name}</span>
          {isDirty && <span className="unsaved-indicator" aria-label="Unsaved changes" />}
        </div>
        <div className="canvas-stage__meta">
          <span>FRAME {Math.max(0, activeFrameIndex) + 1}</span>
          <span>{pixelPerfect ? "PIXEL PERFECT" : "SMOOTH INPUT"}</span>
        </div>
      </div>

      <div className="canvas-viewport">
        <div className="transparency-field" aria-hidden="true" />
        <div
          className="artboard"
          style={{
            "--frame-shift": `${(activeFrameIndex - 3) * 0.35}px`,
            "--grid-width": document.width,
            "--grid-height": document.height,
          } as CSSProperties}
        >
          {referenceLayer && isLayerVisible(document, referenceLayer.id, activeFrameId) && (
            <img
              src={courierScene}
              alt="Pixel art space courier and hovering robot"
              draggable={false}
              style={{
                objectPosition: activeFrame.referenceOffset,
                opacity: referenceLayer.opacity / 100,
              }}
            />
          )}
          {pixelLayers.map((layer) => (
            <PixelLayerCanvas
              key={layer.id}
              width={document.width}
              height={document.height}
              layer={layer}
              pixels={getCelPixels(document, layer.id, activeFrameId)}
              registerCanvas={registerCanvas}
              visible={isLayerVisible(document, layer.id, activeFrameId)}
            />
          ))}
          <canvas
            ref={interactionCanvasRef}
            className={`paint-layer paint-layer--${activeTool}`}
            width={document.width}
            height={document.height}
            aria-label={`Interactive ${document.width} by ${document.height} pixel canvas`}
            data-testid="paint-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            onLostPointerCapture={stopDrawing}
          />
          <div className="pixel-grid-overlay" aria-hidden="true" />
        </div>
      </div>

      <div className="canvas-controls">
        <button
          className="icon-button"
          aria-label="Clear active cel"
          title="Clear active cel"
          disabled={!canPaint || Object.keys(activePixels).length === 0}
          onClick={clearPaintLayer}
        >
          <RotateCcw size={15} />
        </button>
        <div className="zoom-control">
          <button aria-label="Zoom out" onClick={() => onZoomChange(Math.max(100, zoom - 100))}>
            <Minus size={14} />
          </button>
          <output>{zoom}%</output>
          <button aria-label="Zoom in" onClick={() => onZoomChange(Math.min(1600, zoom + 100))}>
            <Plus size={14} />
          </button>
        </div>
        <button className="icon-button" aria-label="Fit canvas" title="Fit canvas" onClick={() => onZoomChange(800)}>
          <Maximize2 size={15} />
        </button>
      </div>
    </main>
  );
}
