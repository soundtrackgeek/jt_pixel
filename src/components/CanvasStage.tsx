import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent,
} from "react";
import courierScene from "../assets/courier-scene.png";
import {
  applySquareBrush,
  floodFillPixelMap,
  forEachLinePoint,
  hexWithOpacity,
  renderPixelMap,
} from "../editor/pixels";
import {
  samplePixelLens,
  sampleProjectPixelColor,
  type EyedropperSource,
} from "../editor/colorOperations";
import { applyPrecisionShape, getPrecisionShapeEnd } from "../editor/precisionShapes";
import {
  clampSelectionDelta,
  countSelectedPixels,
  isPositionInSelection,
  mergeSelectionChanges,
  moveSelectionPixels,
  normalizeSelectionBounds,
  pixelMapsEqual,
  type SelectionClipboard,
  type SelectionFlipAxis,
} from "../editor/selection";
import {
  getCelPixels,
  isLayerLocked,
  isLayerPresent,
  isLayerVisible,
  type PixelMap,
  type ProjectDocument,
} from "../editor/project";
import type {
  CursorPosition,
  PixelSelection,
  PrecisionToolId,
  SelectionBounds,
  ShapeMode,
  ToolId,
} from "../types";
import type {
  CanvasBackground,
  CanvasViewPreferences,
  GridStyle,
} from "../editor/canvasView";
import { CanvasViewMenu } from "./CanvasViewMenu";
import { PixelLayerCanvas } from "./PixelLayerCanvas";
import { PixelLens, type PixelLensHandle } from "./PixelLens";
import { SelectionToolbar } from "./SelectionToolbar";

const PAINT_TOOLS: ToolId[] = ["pencil", "eraser", "bucket", "line", "rectangle", "ellipse"];

function isPrecisionTool(tool: ToolId | null): tool is PrecisionToolId {
  return tool === "line" || tool === "rectangle" || tool === "ellipse";
}

interface CanvasStageProps {
  activeColor: string;
  activeFrameId: string;
  activeLayerId: string;
  activePixels: PixelMap;
  activeTool: ToolId;
  brushSize: number;
  canvasView: CanvasViewPreferences;
  clipboard: SelectionClipboard | null;
  document: ProjectDocument;
  eyedropperSource: EyedropperSource;
  isDirty: boolean;
  opacity: number;
  pixelPerfect: boolean;
  selection: PixelSelection | null;
  shapeMode: ShapeMode;
  zoom: number;
  onClearActiveCel: () => void;
  onCanvasBackgroundChange: (background: CanvasBackground) => void;
  onCommitActiveCel: (pixels: PixelMap) => void;
  onBackgroundColorSample: (color: string) => void;
  onColorSample: (color: string) => void;
  onCopySelection: () => void;
  onCursorChange: (position: CursorPosition) => void;
  onCutSelection: () => void;
  onDeleteSelection: () => void;
  onDeselect: () => void;
  onDuplicateSelection: () => void;
  onFlipSelection: (axis: SelectionFlipAxis) => void;
  onGridStyleChange: (gridStyle: GridStyle) => void;
  onMoveSelection: (deltaX: number, deltaY: number) => void;
  onPasteSelection: () => void;
  onResetCanvasView: () => void;
  onRotateSelection: () => void;
  onSelectionChange: (bounds: SelectionBounds) => void;
  onZoomChange: (zoom: number) => void;
}

export function CanvasStage({
  activeColor,
  activeFrameId,
  activeLayerId,
  activePixels,
  activeTool,
  brushSize,
  canvasView,
  clipboard,
  document,
  eyedropperSource,
  isDirty,
  opacity,
  pixelPerfect,
  selection,
  shapeMode,
  zoom,
  onClearActiveCel,
  onCanvasBackgroundChange,
  onCommitActiveCel,
  onBackgroundColorSample,
  onColorSample,
  onCopySelection,
  onCursorChange,
  onCutSelection,
  onDeleteSelection,
  onDeselect,
  onDuplicateSelection,
  onFlipSelection,
  onGridStyleChange,
  onMoveSelection,
  onPasteSelection,
  onResetCanvasView,
  onRotateSelection,
  onSelectionChange,
  onZoomChange,
}: CanvasStageProps) {
  const interactionCanvasRef = useRef<HTMLCanvasElement>(null);
  const pixelLensRef = useRef<PixelLensHandle>(null);
  const selectionOverlayRef = useRef<HTMLDivElement>(null);
  const layerCanvasesRef = useRef(new Map<string, HTMLCanvasElement>());
  const basePixelsRef = useRef<PixelMap>({});
  const draftPixelsRef = useRef<PixelMap>({});
  const isDrawingRef = useRef(false);
  const changedRef = useRef(false);
  const drawingToolRef = useRef<ToolId | null>(null);
  const lastPixelRef = useRef<CursorPosition | null>(null);
  const shapeStartRef = useRef<CursorPosition | null>(null);
  const selectionStartRef = useRef<CursorPosition | null>(null);
  const selectionDraftRef = useRef<SelectionBounds | null>(null);
  const moveStartRef = useRef<CursorPosition | null>(null);
  const moveDeltaRef = useRef({ x: 0, y: 0 });
  const isSelectingRef = useRef(false);
  const isMovingSelectionRef = useRef(false);
  const isSamplingRef = useRef(false);
  const samplingRoleRef = useRef<"background" | "foreground">("foreground");
  const activeLayer = document.layers.find((layer) => layer.id === activeLayerId);
  const activeFrame = document.frames.find((frame) => frame.id === activeFrameId) ?? document.frames[0];
  const activeFrameIndex = document.frames.findIndex((frame) => frame.id === activeFrameId);
  const activeLayerLocked = activeLayer
    ? isLayerLocked(document, activeLayer.id, activeFrameId)
    : false;
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
    !activeLayerLocked &&
    isLayerPresent(document, activeLayer.id, activeFrameId) &&
    isLayerVisible(document, activeLayer.id, activeFrameId);
  const canSelect = activeLayer?.kind === "pixel"
    && isLayerPresent(document, activeLayer.id, activeFrameId)
    && isLayerVisible(document, activeLayer.id, activeFrameId);
  const interactionLocked = activeLayerLocked
    && activeTool !== "select"
    && activeTool !== "eyedropper";
  const selectedPixelCount = selection
    ? countSelectedPixels(activePixels, selection, document.width)
    : 0;

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

  function eventIsInsideCanvas(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientX >= rect.left
      && event.clientX <= rect.right
      && event.clientY >= rect.top
      && event.clientY <= rect.bottom;
  }

  function displayPixelLens(
    event: PointerEvent<HTMLCanvasElement>,
    position: CursorPosition,
  ) {
    const temporarySampling = activeTool !== "eyedropper" && event.altKey;
    event.currentTarget.dataset.altSampling = String(temporarySampling);
    if (
      (activeTool !== "eyedropper" && !event.altKey && !isSamplingRef.current)
      || !eventIsInsideCanvas(event)
    ) {
      pixelLensRef.current?.hide();
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    pixelLensRef.current?.show(
      samplePixelLens(
        document,
        activeFrameId,
        activeLayerId,
        eyedropperSource,
        position,
      ),
      {
        anchorX: event.clientX - rect.left,
        anchorY: event.clientY - rect.top,
        containerHeight: rect.height,
        containerWidth: rect.width,
      },
      eyedropperSource,
    );
  }

  function hidePixelLens() {
    const canvas = interactionCanvasRef.current;
    if (canvas) canvas.dataset.altSampling = "false";
    pixelLensRef.current?.hide();
  }

  useEffect(() => {
    hidePixelLens();
  }, [activeFrameId, activeLayerId, activeTool, document.updatedAt, eyedropperSource]);

  useEffect(() => {
    function stopTemporarySampling(event: KeyboardEvent) {
      if (event.key !== "Alt") return;
      const canvas = interactionCanvasRef.current;
      if (canvas) canvas.dataset.altSampling = "false";
      if (activeTool !== "eyedropper") pixelLensRef.current?.hide();
    }
    function handleWindowBlur() {
      const canvas = interactionCanvasRef.current;
      if (canvas) canvas.dataset.altSampling = "false";
      pixelLensRef.current?.hide();
    }
    window.addEventListener("keyup", stopTemporarySampling);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("keyup", stopTemporarySampling);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [activeTool]);

  function displaySelection(bounds: SelectionBounds | null) {
    const overlay = selectionOverlayRef.current;
    if (!overlay) return;
    if (!bounds) {
      overlay.hidden = true;
      return;
    }
    overlay.hidden = false;
    overlay.style.left = `${(bounds.x / document.width) * 100}%`;
    overlay.style.top = `${(bounds.y / document.height) * 100}%`;
    overlay.style.width = `${(bounds.width / document.width) * 100}%`;
    overlay.style.height = `${(bounds.height / document.height) * 100}%`;
  }

  useEffect(() => {
    displaySelection(selection);
  }, [
    document.height,
    document.width,
    selection?.height,
    selection?.width,
    selection?.x,
    selection?.y,
  ]);

  function redrawDraft() {
    const canvas = layerCanvasesRef.current.get(activeLayerId);
    if (canvas) renderPixelMap(canvas, draftPixelsRef.current, document.width, document.height);
  }

  function paintPoint(position: CursorPosition) {
    if (selection && !isPositionInSelection(position, selection)) return;
    const color = drawingToolRef.current === "eraser" ? null : hexWithOpacity(activeColor, opacity);
    changedRef.current = applySquareBrush(
      draftPixelsRef.current,
      position,
      brushSize,
      document.width,
      document.height,
      color,
    ) || changedRef.current;
  }

  function paintTo(position: CursorPosition) {
    const previous = lastPixelRef.current ?? position;
    forEachLinePoint(previous, position, paintPoint);
    lastPixelRef.current = position;
    redrawDraft();
  }

  function previewPrecisionShape(
    tool: PrecisionToolId,
    position: CursorPosition,
    constrained: boolean,
  ) {
    const start = shapeStartRef.current;
    if (!start) return position;
    const end = getPrecisionShapeEnd(
      tool,
      start,
      position,
      constrained,
      document.width,
      document.height,
    );
    draftPixelsRef.current = { ...basePixelsRef.current };
    changedRef.current = applyPrecisionShape(
      draftPixelsRef.current,
      tool,
      start,
      end,
      shapeMode,
      brushSize,
      document.width,
      document.height,
      hexWithOpacity(activeColor, opacity),
    );
    if (selection) {
      draftPixelsRef.current = mergeSelectionChanges(
        basePixelsRef.current,
        draftPixelsRef.current,
        selection,
        document.width,
      );
      changedRef.current = !pixelMapsEqual(basePixelsRef.current, draftPixelsRef.current);
    }
    redrawDraft();
    return end;
  }

  function previewSelectionMove(position: CursorPosition) {
    const start = moveStartRef.current;
    if (!start || !selection) return;
    const delta = clampSelectionDelta(
      selection,
      position.x - start.x,
      position.y - start.y,
      document.width,
      document.height,
    );
    moveDeltaRef.current = delta;
    const result = moveSelectionPixels(
      basePixelsRef.current,
      selection,
      delta.x,
      delta.y,
      document.width,
      document.height,
    );
    draftPixelsRef.current = result.pixels;
    displaySelection(result.bounds);
    redrawDraft();
  }

  function samplePixel(
    position: CursorPosition,
    role = samplingRoleRef.current,
  ) {
    const color = sampleProjectPixelColor(
      document,
      activeFrameId,
      activeLayerId,
      eyedropperSource,
      String((position.y * document.width) + position.x),
    );
    if (!color) return;
    if (role === "background") onBackgroundColorSample(color);
    else onColorSample(color);
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const position = eventToPixel(event);
    onCursorChange(position);
    displayPixelLens(event, position);
    if (activeTool === "eyedropper" || event.altKey) {
      if (event.button !== 0 && event.button !== 2) return;
      isSamplingRef.current = true;
      samplingRoleRef.current = event.button === 2 ? "background" : "foreground";
      samplePixel(position, samplingRoleRef.current);
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (activeTool === "select") {
      if (!canSelect) return;
      selectionStartRef.current = position;
      selectionDraftRef.current = normalizeSelectionBounds(
        position,
        position,
        document.width,
        document.height,
      );
      isSelectingRef.current = true;
      displaySelection(selectionDraftRef.current);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (activeTool === "move") {
      if (!canPaint || !selection || !isPositionInSelection(position, selection)) return;
      basePixelsRef.current = { ...activePixels };
      draftPixelsRef.current = { ...activePixels };
      moveStartRef.current = position;
      moveDeltaRef.current = { x: 0, y: 0 };
      isMovingSelectionRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (
      !canPaint
      || !PAINT_TOOLS.includes(activeTool)
    ) return;

    basePixelsRef.current = { ...activePixels };
    draftPixelsRef.current = { ...basePixelsRef.current };
    changedRef.current = false;
    drawingToolRef.current = activeTool;
    lastPixelRef.current = position;

    if (activeTool === "bucket") {
      const didFill = floodFillPixelMap(
        draftPixelsRef.current,
        position,
        document.width,
        document.height,
        hexWithOpacity(activeColor, opacity),
        selection ?? undefined,
      );
      drawingToolRef.current = null;
      if (!didFill) return;
      redrawDraft();
      onCommitActiveCel(draftPixelsRef.current);
      return;
    }

    isDrawingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (isPrecisionTool(activeTool)) {
      shapeStartRef.current = position;
      previewPrecisionShape(activeTool, position, event.shiftKey);
      return;
    }
    paintTo(position);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const position = eventToPixel(event);
    onCursorChange(position);
    displayPixelLens(event, position);
    if (isSamplingRef.current) {
      samplePixel(position);
      return;
    }
    if (isSelectingRef.current) {
      const start = selectionStartRef.current;
      if (!start) return;
      selectionDraftRef.current = normalizeSelectionBounds(
        start,
        position,
        document.width,
        document.height,
      );
      displaySelection(selectionDraftRef.current);
      return;
    }
    if (isMovingSelectionRef.current) {
      previewSelectionMove(position);
      return;
    }
    if (!isDrawingRef.current) return;
    const drawingTool = drawingToolRef.current;
    if (isPrecisionTool(drawingTool)) {
      onCursorChange(previewPrecisionShape(
        drawingTool,
        position,
        event.shiftKey,
      ));
      return;
    }
    paintTo(position);
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    const position = eventToPixel(event);
    displayPixelLens(event, position);
    if (isSamplingRef.current) {
      samplePixel(position);
      isSamplingRef.current = false;
      samplingRoleRef.current = "foreground";
      if (activeTool !== "eyedropper" && !event.altKey) hidePixelLens();
      return;
    }
    if (isSelectingRef.current) {
      const start = selectionStartRef.current;
      if (start) {
        const bounds = normalizeSelectionBounds(
          start,
          position,
          document.width,
          document.height,
        );
        displaySelection(bounds);
        onSelectionChange(bounds);
      }
      isSelectingRef.current = false;
      selectionStartRef.current = null;
      selectionDraftRef.current = null;
      return;
    }
    if (isMovingSelectionRef.current) {
      previewSelectionMove(position);
      const delta = moveDeltaRef.current;
      isMovingSelectionRef.current = false;
      moveStartRef.current = null;
      moveDeltaRef.current = { x: 0, y: 0 };
      if (delta.x !== 0 || delta.y !== 0) onMoveSelection(delta.x, delta.y);
      return;
    }
    if (!isDrawingRef.current) return;
    const drawingTool = drawingToolRef.current;
    if (isPrecisionTool(drawingTool)) {
      onCursorChange(previewPrecisionShape(drawingTool, position, event.shiftKey));
    } else {
      onCursorChange(position);
      paintTo(position);
    }
    stopDrawing();
  }

  function stopDrawing() {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    drawingToolRef.current = null;
    lastPixelRef.current = null;
    shapeStartRef.current = null;
    if (changedRef.current) onCommitActiveCel(draftPixelsRef.current);
  }

  function cancelDrawing() {
    if (!isDrawingRef.current) return;
    if (!shapeStartRef.current) {
      stopDrawing();
      return;
    }
    isDrawingRef.current = false;
    drawingToolRef.current = null;
    lastPixelRef.current = null;
    shapeStartRef.current = null;
    draftPixelsRef.current = { ...basePixelsRef.current };
    redrawDraft();
  }

  function cancelPointerInteraction() {
    if (isSamplingRef.current) {
      isSamplingRef.current = false;
      samplingRoleRef.current = "foreground";
      return;
    }
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      selectionStartRef.current = null;
      selectionDraftRef.current = null;
      displaySelection(selection);
      return;
    }
    if (isMovingSelectionRef.current) {
      isMovingSelectionRef.current = false;
      moveStartRef.current = null;
      moveDeltaRef.current = { x: 0, y: 0 };
      draftPixelsRef.current = { ...basePixelsRef.current };
      redrawDraft();
      displaySelection(selection);
      return;
    }
    cancelDrawing();
  }

  function handleLostPointerCapture() {
    if (isSamplingRef.current) {
      isSamplingRef.current = false;
      return;
    }
    if (isSelectingRef.current || isMovingSelectionRef.current) {
      cancelPointerInteraction();
      return;
    }
    stopDrawing();
  }

  function handleContextMenu(event: ReactMouseEvent<HTMLCanvasElement>) {
    if (activeTool === "eyedropper" || event.altKey) event.preventDefault();
  }

  function handlePointerLeave() {
    hidePixelLens();
  }

  function handlePointerCancel() {
    hidePixelLens();
    cancelPointerInteraction();
  }

  function clearPaintLayer() {
    if (!canPaint) return;
    if (selection) {
      onDeleteSelection();
      return;
    }
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
          <span className={activeLayerLocked ? "canvas-stage__locked" : undefined}>
            {activeLayerLocked
              ? "LAYER LOCKED"
              : selection
                ? `SELECT ${selection.width} × ${selection.height}`
                : pixelPerfect ? "PIXEL PERFECT" : "SMOOTH INPUT"}
          </span>
        </div>
      </div>

      <div className="canvas-viewport">
        <div className="transparency-field" aria-hidden="true" />
        <div
          className="artboard"
          data-canvas-background={canvasView.background}
          data-grid-style={canvasView.gridStyle}
          style={{
            "--frame-shift": `${(activeFrameIndex - 3) * 0.35}px`,
            "--grid-width": document.width,
            "--grid-height": document.height,
            "--canvas-fit-width": `${(document.width / document.height) * 100}cqh`,
            aspectRatio: `${document.width} / ${document.height}`,
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
            className={`paint-layer paint-layer--${activeTool} ${interactionLocked ? "paint-layer--locked" : ""}`}
            width={document.width}
            height={document.height}
            aria-label={interactionLocked
              ? `${activeLayer?.name ?? "Active layer"} is locked on this frame`
              : `Interactive ${document.width} by ${document.height} pixel canvas`}
            data-layer-locked={activeLayerLocked}
            data-selection-active={selection !== null}
            data-alt-sampling="false"
            data-testid="paint-canvas"
            onContextMenu={handleContextMenu}
            onPointerDown={handlePointerDown}
            onPointerEnter={(event) => {
              const position = eventToPixel(event);
              onCursorChange(position);
              displayPixelLens(event, position);
            }}
            onPointerLeave={handlePointerLeave}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onLostPointerCapture={handleLostPointerCapture}
          />
          <div className="pixel-grid-overlay" aria-hidden="true" />
          <div
            ref={selectionOverlayRef}
            className="selection-marquee"
            data-testid="selection-marquee"
            hidden
            aria-hidden="true"
          />
          <PixelLens ref={pixelLensRef} />
        </div>
        <SelectionToolbar
          canTransform={canPaint}
          clipboard={selection || activeTool === "select" || activeTool === "move" ? clipboard : null}
          selection={selection}
          onCopy={onCopySelection}
          onCut={onCutSelection}
          onDelete={onDeleteSelection}
          onDeselect={onDeselect}
          onDuplicate={onDuplicateSelection}
          onFlipHorizontal={() => onFlipSelection("horizontal")}
          onFlipVertical={() => onFlipSelection("vertical")}
          onPaste={onPasteSelection}
          onRotate={onRotateSelection}
        />
      </div>

      <div className="canvas-controls">
        <CanvasViewMenu
          preferences={canvasView}
          onBackgroundChange={onCanvasBackgroundChange}
          onGridStyleChange={onGridStyleChange}
          onReset={onResetCanvasView}
        />
        <button
          className="icon-button"
          aria-label={selection ? "Clear selected pixels" : "Clear active cel"}
          title={selection ? "Clear selected pixels" : "Clear active cel"}
          disabled={!canPaint || (selection ? selectedPixelCount === 0 : Object.keys(activePixels).length === 0)}
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
