import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent,
  type WheelEvent as ReactWheelEvent,
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
  countSelectionCells,
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
  combineSelectionRegions,
  forEachSelectionPosition,
  isPositionInSelection as selectionContainsPosition,
} from "../editor/selectionRegion";
import {
  findMagicSelection,
  type MagicSelectionSettings,
} from "../editor/magicSelection";
import {
  clampCanvasPan,
  clampCanvasZoom,
  fitCanvasZoom,
  steppedCanvasZoom,
  zoomAroundPoint,
} from "../editor/canvasNavigation";
import {
  applyTileBrush,
  applyTilePrecisionShape,
  DEFAULT_TILE_WORKSPACE_SETTINGS,
  floodFillTilePixelMap,
  type TileWorkspaceSettings,
} from "../editor/tiles";
import {
  getCelPixels,
  getLayerForFrame,
  getLayersForFrame,
  isLayerLocked,
  isLayerPresent,
  isLayerVisible,
  type PixelMap,
  type ProjectDocument,
} from "../editor/project";
import { compositePixelMaps } from "../editor/compositing";
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
import { TilePreview, type TilePreviewHandle } from "./TilePreview";

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
  keyboardNavigationEnabled: boolean;
  magicSettings: MagicSelectionSettings;
  opacity: number;
  pixelPerfect: boolean;
  selection: PixelSelection | null;
  shapeMode: ShapeMode;
  tileSettings: TileWorkspaceSettings;
  tileWorkspaceActive: boolean;
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
  onTileSettingsChange: (settings: Partial<TileWorkspaceSettings>) => void;
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
  keyboardNavigationEnabled,
  magicSettings,
  opacity,
  pixelPerfect,
  selection,
  shapeMode,
  tileSettings,
  tileWorkspaceActive,
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
  onTileSettingsChange,
  onZoomChange,
}: CanvasStageProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasTransformRef = useRef<HTMLDivElement>(null);
  const interactionCanvasRef = useRef<HTMLCanvasElement>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement>(null);
  const pixelLensRef = useRef<PixelLensHandle>(null);
  const tilePreviewRef = useRef<TilePreviewHandle>(null);
  const selectionOverlayRef = useRef<HTMLDivElement>(null);
  const selectionMaskCanvasRef = useRef<HTMLCanvasElement>(null);
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
  const isPanningRef = useRef(false);
  const panRef = useRef<CursorPosition>({ x: 0, y: 0 });
  const panStartRef = useRef<{ clientX: number; clientY: number; origin: CursorPosition } | null>(null);
  const magicPreviewRef = useRef<SelectionBounds | null>(null);
  const magicPreviewKeyRef = useRef("");
  const magicCandidateCacheRef = useRef<{
    candidate: SelectionBounds | null;
    key: string;
    seedColor: string;
  } | null>(null);
  const fittedDocumentRef = useRef("");
  const autoFitRef = useRef(true);
  const spacePanActiveRef = useRef(false);
  const samplingRoleRef = useRef<"background" | "foreground">("foreground");
  const [isPanning, setIsPanning] = useState(false);
  const [spacePanActive, setSpacePanActive] = useState(false);
  const activeLayer = getLayerForFrame(document, activeLayerId, activeFrameId);
  const activeFrame = document.frames.find((frame) => frame.id === activeFrameId) ?? document.frames[0];
  const activeFrameIndex = document.frames.findIndex((frame) => frame.id === activeFrameId);
  const activeLayerLocked = activeLayer
    ? isLayerLocked(document, activeLayer.id, activeFrameId)
    : false;
  const referenceLayer = document.layers.find(
    (layer) => layer.kind === "reference" && isLayerPresent(document, layer.id, activeFrameId),
  );
  const pixelLayers = useMemo(
    () => getLayersForFrame(document, activeFrameId)
      .filter((layer) => layer.kind === "pixel")
      .reverse(),
    [activeFrameId, document],
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
    && activeTool !== "magic"
    && activeTool !== "hand"
    && activeTool !== "eyedropper";
  const selectedPixelCount = selection
    ? countSelectedPixels(activePixels, selection, document.width)
    : 0;
  const selectedCellCount = selection ? countSelectionCells(selection) : 0;
  const activeTileSettings = tileWorkspaceActive
    ? tileSettings
    : DEFAULT_TILE_WORKSPACE_SETTINGS;
  const magicSamplePixels = useMemo(() => {
    if (magicSettings.source === "active-layer") return activePixels;
    return compositePixelMaps(
      document.width,
      document.height,
      getLayersForFrame(document, activeFrameId)
        .filter((layer) => layer.kind === "pixel" && isLayerVisible(document, layer.id, activeFrameId))
        .reverse()
        .map((layer) => ({
          blendMode: layer.blendMode,
          opacity: layer.opacity,
          pixels: getCelPixels(document, layer.id, activeFrameId),
        })),
    );
  }, [activeFrameId, activePixels, document, magicSettings.source]);

  function artboardSize(targetZoom = zoom) {
    return {
      width: document.width * (targetZoom / 100),
      height: document.height * (targetZoom / 100),
    };
  }

  function panTransform(pan: CursorPosition) {
    return `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px)`;
  }

  function applyPan(nextPan: CursorPosition, targetZoom = zoom) {
    const viewport = viewportRef.current;
    const transform = canvasTransformRef.current;
    if (!viewport) return nextPan;
    const size = artboardSize(targetZoom);
    const next = clampCanvasPan({
      artboardHeight: size.height,
      artboardWidth: size.width,
      pan: nextPan,
      viewportHeight: viewport.clientHeight,
      viewportWidth: viewport.clientWidth,
    });
    panRef.current = next;
    if (transform) transform.style.transform = panTransform(next);
    return next;
  }

  function changeZoom(nextZoom: number, clientPoint?: CursorPosition) {
    const viewport = viewportRef.current;
    const next = clampCanvasZoom(nextZoom);
    if (!viewport || next === zoom) return;
    autoFitRef.current = false;
    const bounds = viewport.getBoundingClientRect();
    const point = clientPoint
      ? { x: clientPoint.x - bounds.left, y: clientPoint.y - bounds.top }
      : { x: bounds.width / 2, y: bounds.height / 2 };
    const nextPan = zoomAroundPoint({
      currentZoom: zoom,
      nextZoom: next,
      pan: panRef.current,
      point,
      viewport: { width: bounds.width, height: bounds.height },
    });
    applyPan(nextPan, next);
    onZoomChange(next);
  }

  function fitCanvas() {
    const viewport = viewportRef.current;
    if (!viewport) return;
    autoFitRef.current = true;
    const nextZoom = fitCanvasZoom(
      viewport.clientWidth,
      viewport.clientHeight,
      document.width,
      document.height,
    );
    applyPan({ x: 0, y: 0 }, nextZoom);
    onZoomChange(nextZoom);
  }

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const documentKey = `${document.id}:${document.width}x${document.height}`;
    if (fittedDocumentRef.current === documentKey) return;
    fittedDocumentRef.current = documentKey;
    autoFitRef.current = true;
    fitCanvas();
  }, [document.height, document.id, document.width]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const observer = new ResizeObserver(() => {
      if (autoFitRef.current) fitCanvas();
      else applyPan(panRef.current);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [document.height, document.width, zoom]);

  useEffect(() => {
    if (!keyboardNavigationEnabled) {
      spacePanActiveRef.current = false;
      setSpacePanActive(false);
      return undefined;
    }
    function typingTarget(target: EventTarget | null) {
      return target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || (target instanceof HTMLElement && target.isContentEditable);
    }
    function activateTemporaryHand(event: KeyboardEvent) {
      if (event.code !== "Space" || event.shiftKey || typingTarget(event.target)) return;
      event.preventDefault();
      spacePanActiveRef.current = true;
      setSpacePanActive(true);
    }
    function releaseTemporaryHand(event: KeyboardEvent) {
      if (event.code === "Space") {
        spacePanActiveRef.current = false;
        setSpacePanActive(false);
      }
    }
    function releaseOnBlur() {
      spacePanActiveRef.current = false;
      setSpacePanActive(false);
    }
    window.addEventListener("keydown", activateTemporaryHand);
    window.addEventListener("keyup", releaseTemporaryHand);
    window.addEventListener("blur", releaseOnBlur);
    return () => {
      window.removeEventListener("keydown", activateTemporaryHand);
      window.removeEventListener("keyup", releaseTemporaryHand);
      window.removeEventListener("blur", releaseOnBlur);
    };
  }, [keyboardNavigationEnabled]);

  const registerCanvas = useCallback((layerId: string, canvas: HTMLCanvasElement | null) => {
    if (canvas) layerCanvasesRef.current.set(layerId, canvas);
    else layerCanvasesRef.current.delete(layerId);
  }, []);

  const renderComposite = useCallback((activeDraft?: PixelMap) => {
    const canvas = compositeCanvasRef.current;
    if (!canvas) return;
    const layers = getLayersForFrame(document, activeFrameId)
      .filter((layer) => layer.kind === "pixel" && isLayerVisible(document, layer.id, activeFrameId))
      .reverse()
      .map((layer) => ({
        blendMode: layer.blendMode,
        opacity: layer.opacity,
        pixels: activeDraft && layer.id === activeLayerId
          ? activeDraft
          : getCelPixels(document, layer.id, activeFrameId),
      }));
    renderPixelMap(
      canvas,
      compositePixelMaps(document.width, document.height, layers),
      document.width,
      document.height,
    );
  }, [activeFrameId, activeLayerId, document]);

  useEffect(() => renderComposite(), [renderComposite]);

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

  function drawSelectionMask(bounds: SelectionBounds | null, preview = false) {
    const canvas = selectionMaskCanvasRef.current;
    if (!canvas) return;
    if (!bounds?.mask) {
      canvas.hidden = true;
      return;
    }
    const scale = Math.max(2, Math.min(8, Math.round(zoom / 100)));
    canvas.hidden = false;
    canvas.dataset.preview = String(preview);
    canvas.width = document.width * scale;
    canvas.height = document.height * scale;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = preview ? "rgb(66 217 227 / 18%)" : "rgb(173 98 255 / 13%)";
    forEachSelectionPosition(bounds, ({ x, y }) => {
      context.fillRect(x * scale, y * scale, scale, scale);
    });

    forEachSelectionPosition(bounds, ({ x, y }) => {
      const color = (x + y) % 2 === 0 ? "#f3fbfa" : "#42d9e3";
      context.fillStyle = color;
      const top = { x, y: y - 1 };
      const right = { x: x + 1, y };
      const bottom = { x, y: y + 1 };
      const left = { x: x - 1, y };
      if (!selectionContainsPosition(top, bounds)) context.fillRect(x * scale, y * scale, scale, 1);
      if (!selectionContainsPosition(right, bounds)) context.fillRect(((x + 1) * scale) - 1, y * scale, 1, scale);
      if (!selectionContainsPosition(bottom, bounds)) context.fillRect(x * scale, ((y + 1) * scale) - 1, scale, 1);
      if (!selectionContainsPosition(left, bounds)) context.fillRect(x * scale, y * scale, 1, scale);
    });
  }

  function displaySelection(bounds: SelectionBounds | null, preview = false) {
    const overlay = selectionOverlayRef.current;
    if (!overlay) return;
    if (!bounds) {
      overlay.hidden = true;
      drawSelectionMask(null);
      return;
    }
    if (bounds.mask) {
      overlay.hidden = true;
      drawSelectionMask(bounds, preview);
      return;
    }
    drawSelectionMask(null);
    overlay.hidden = false;
    overlay.dataset.preview = String(preview);
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
    selection?.mask,
    zoom,
  ]);

  function redrawDraft() {
    const canvas = layerCanvasesRef.current.get(activeLayerId);
    if (canvas) renderPixelMap(canvas, draftPixelsRef.current, document.width, document.height);
    renderComposite(draftPixelsRef.current);
    tilePreviewRef.current?.renderDraft(draftPixelsRef.current);
  }

  function paintPoint(position: CursorPosition) {
    if (selection && !isPositionInSelection(position, selection)) return;
    const color = drawingToolRef.current === "eraser" ? null : hexWithOpacity(activeColor, opacity);
    changedRef.current = (tileWorkspaceActive
      ? applyTileBrush(
          draftPixelsRef.current,
          position,
          brushSize,
          document.width,
          document.height,
          color,
          activeTileSettings,
          selection ?? undefined,
        )
      : applySquareBrush(
          draftPixelsRef.current,
          position,
          brushSize,
          document.width,
          document.height,
          color,
          selection ?? undefined,
        )) || changedRef.current;
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
    changedRef.current = tileWorkspaceActive
      ? applyTilePrecisionShape(
          draftPixelsRef.current,
          tool,
          start,
          end,
          shapeMode,
          brushSize,
          document.width,
          document.height,
          hexWithOpacity(activeColor, opacity),
          activeTileSettings,
          selection ?? undefined,
        )
      : applyPrecisionShape(
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
    if (selection && !tileWorkspaceActive) {
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

  function magicSelectionAt(position: CursorPosition) {
    const seedIndex = String((position.y * document.width) + position.x);
    const seedColor = magicSamplePixels[seedIndex] ?? "transparent";
    const cacheKey = `${magicSettings.match}:${magicSettings.source}:${magicSettings.tolerance}:${document.updatedAt}`;
    const cached = magicCandidateCacheRef.current;
    const candidate = cached
      && cached.key === cacheKey
      && cached.seedColor === seedColor
      && cached.candidate
      && selectionContainsPosition(position, cached.candidate)
      ? cached.candidate
      : findMagicSelection(
          magicSamplePixels,
          document.width,
          document.height,
          position,
          magicSettings.match,
          magicSettings.tolerance,
        );
    magicCandidateCacheRef.current = { candidate, key: cacheKey, seedColor };
    return combineSelectionRegions(
      selection,
      candidate,
      magicSettings.combineMode,
      document.width,
      document.height,
    );
  }

  function previewMagicSelection(position: CursorPosition) {
    const key = `${position.x}:${position.y}:${magicSettings.match}:${magicSettings.source}:${magicSettings.tolerance}:${magicSettings.combineMode}:${document.updatedAt}`;
    if (magicPreviewKeyRef.current === key) return;
    magicPreviewKeyRef.current = key;
    magicPreviewRef.current = magicSelectionAt(position);
    displaySelection(magicPreviewRef.current, true);
  }

  function clearMagicPreview() {
    magicPreviewKeyRef.current = "";
    magicPreviewRef.current = null;
    magicCandidateCacheRef.current = null;
    displaySelection(selection);
  }

  useEffect(() => {
    magicPreviewKeyRef.current = "";
    magicPreviewRef.current = null;
    displaySelection(selection);
  }, [
    activeFrameId,
    activeLayerId,
    activeTool,
    document.updatedAt,
    magicSettings.combineMode,
    magicSettings.match,
    magicSettings.source,
    magicSettings.tolerance,
  ]);

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

  function startPanning(event: PointerEvent<HTMLCanvasElement>) {
    autoFitRef.current = false;
    isPanningRef.current = true;
    setIsPanning(true);
    panStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      origin: { ...panRef.current },
    };
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updatePanning(event: PointerEvent<HTMLCanvasElement>) {
    const start = panStartRef.current;
    if (!isPanningRef.current || !start) return;
    applyPan({
      x: start.origin.x + event.clientX - start.clientX,
      y: start.origin.y + event.clientY - start.clientY,
    });
  }

  function finishPanning() {
    if (!isPanningRef.current) return;
    isPanningRef.current = false;
    panStartRef.current = null;
    setIsPanning(false);
  }

  function handleCanvasWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    changeZoom(
      steppedCanvasZoom(zoom, event.deltaY < 0 ? 1 : -1),
      { x: event.clientX, y: event.clientY },
    );
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const position = eventToPixel(event);
    onCursorChange(position);
    const wantsPan = event.button === 1
      || (event.button === 0 && (activeTool === "hand" || spacePanActiveRef.current));
    if (wantsPan) {
      hidePixelLens();
      clearMagicPreview();
      startPanning(event);
      return;
    }
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
    if (activeTool === "magic") {
      if (event.button !== 0 || activeLayer?.kind !== "pixel") return;
      const nextSelection = magicSelectionAt(position);
      if (nextSelection) {
        displaySelection(nextSelection);
        onSelectionChange(nextSelection);
      } else {
        onDeselect();
      }
      event.preventDefault();
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
      const didFill = tileWorkspaceActive
        ? floodFillTilePixelMap(
            draftPixelsRef.current,
            position,
            document.width,
            document.height,
            hexWithOpacity(activeColor, opacity),
            activeTileSettings,
            selection ?? undefined,
          )
        : floodFillPixelMap(
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
    if (isPanningRef.current) {
      updatePanning(event);
      return;
    }
    const position = eventToPixel(event);
    onCursorChange(position);
    displayPixelLens(event, position);
    if (isSamplingRef.current) {
      samplePixel(position);
      return;
    }
    if (activeTool === "magic") {
      previewMagicSelection(position);
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
    if (isPanningRef.current) {
      finishPanning();
      return;
    }
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
    if (isPanningRef.current) {
      finishPanning();
      return;
    }
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
    if (isPanningRef.current) {
      finishPanning();
      return;
    }
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
    if (activeTool === "magic" && !isPanningRef.current) clearMagicPreview();
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
              : tileWorkspaceActive
                ? `${tileSettings.mode === "seamless" ? "SEAMLESS" : "STANDARD"} · ${tileSettings.symmetry.toUpperCase()}`
              : selection
                ? selection.mask
                  ? `SELECT ${selectedCellCount.toLocaleString()} PX`
                  : `SELECT ${selection.width} × ${selection.height}`
                : pixelPerfect ? "PIXEL PERFECT" : "SMOOTH INPUT"}
          </span>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="canvas-viewport"
        data-pan-active={isPanning}
        onWheel={handleCanvasWheel}
      >
        <div className="transparency-field" aria-hidden="true" />
        <div
          ref={canvasTransformRef}
          className="canvas-transform"
          style={{
            width: `${artboardSize().width}px`,
            height: `${artboardSize().height}px`,
            transform: panTransform(panRef.current),
          } as CSSProperties}
        >
          <div
            className="artboard"
            data-canvas-background={canvasView.background}
            data-grid-style={canvasView.gridStyle}
            data-tile-mode={tileWorkspaceActive ? tileSettings.mode : "standard"}
            style={{
              "--frame-shift": `${(activeFrameIndex - 3) * 0.35}px`,
              "--grid-width": document.width,
              "--grid-height": document.height,
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
                visible={false}
              />
            ))}
            <canvas
              ref={compositeCanvasRef}
              className="pixel-layer-canvas pixel-layer-canvas--composite"
              width={document.width}
              height={document.height}
              aria-hidden="true"
            />
            <canvas
              ref={interactionCanvasRef}
              className={`paint-layer paint-layer--${activeTool} ${spacePanActive ? "paint-layer--temporary-hand" : ""} ${isPanning ? "is-panning" : ""} ${interactionLocked ? "paint-layer--locked" : ""}`}
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
                if (activeTool === "magic") previewMagicSelection(position);
              }}
              onPointerLeave={handlePointerLeave}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onLostPointerCapture={handleLostPointerCapture}
            />
            <div className="pixel-grid-overlay" aria-hidden="true" />
            {tileWorkspaceActive && tileSettings.symmetry !== "off" && (
              <div
                className={`tile-guides tile-guides--${tileSettings.symmetry}`}
                aria-hidden="true"
                data-testid="tile-symmetry-guides"
              >
                <span className="tile-guide tile-guide--vertical" />
                <span className="tile-guide tile-guide--horizontal" />
              </div>
            )}
            <canvas
              ref={selectionMaskCanvasRef}
              className="selection-mask-canvas"
              data-testid="selection-mask-canvas"
              hidden
              aria-hidden="true"
            />
            <div
              ref={selectionOverlayRef}
              className="selection-marquee"
              data-testid="selection-marquee"
              hidden
              aria-hidden="true"
            />
            <PixelLens ref={pixelLensRef} />
          </div>
        </div>
        {tileWorkspaceActive && tileSettings.repeatPreview === "3x3" && (
          <TilePreview
            ref={tilePreviewRef}
            activeFrameId={activeFrameId}
            activeLayerId={activeLayerId}
            document={document}
            onClose={() => onTileSettingsChange({ repeatPreview: "off" })}
          />
        )}
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
          <button aria-label="Zoom out" onClick={() => changeZoom(steppedCanvasZoom(zoom, -1))}>
            <Minus size={14} />
          </button>
          <button className="zoom-control__value" aria-label="Zoom to 100%" title="Actual pixels · 100%" onClick={() => changeZoom(100)}>{zoom}%</button>
          <button aria-label="Zoom in" onClick={() => changeZoom(steppedCanvasZoom(zoom, 1))}>
            <Plus size={14} />
          </button>
        </div>
        <button className="icon-button" aria-label="Fit canvas" title="Fit canvas" onClick={fitCanvas}>
          <Maximize2 size={15} />
        </button>
      </div>
    </main>
  );
}
