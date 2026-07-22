import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Lock,
  MoreHorizontal,
  Plus,
  Trash2,
  Unlock,
} from "lucide-react";
import { memo, useEffect, useRef, useState, type DragEvent } from "react";
import courierScene from "../assets/courier-scene.png";
import { renderPixelMap } from "../editor/pixels";
import {
  getCelPixels,
  getLayersForFrame,
  isLayerLocked,
  isLayerVisible,
  type LayerBlendMode,
  type PixelMap,
  type ProjectDocument,
  type ProjectLayer,
} from "../editor/project";
import { PanelHeader } from "./PanelHeader";

const BLEND_MODES: Array<{ label: string; value: LayerBlendMode }> = [
  { label: "Normal", value: "normal" },
  { label: "Multiply", value: "multiply" },
  { label: "Screen", value: "screen" },
  { label: "Overlay", value: "overlay" },
  { label: "Add", value: "add" },
  { label: "Subtract", value: "subtract" },
];

interface LayerThumbnailProps {
  documentHeight: number;
  documentWidth: number;
  layer: ProjectLayer;
  pixels: PixelMap;
  visible: boolean;
}

const LayerThumbnail = memo(function LayerThumbnail({
  documentHeight,
  documentWidth,
  layer,
  pixels,
  visible,
}: LayerThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && layer.kind === "pixel") {
      renderPixelMap(canvasRef.current, pixels, documentWidth, documentHeight);
    }
  }, [documentHeight, documentWidth, layer.kind, pixels]);

  if (layer.kind === "reference") {
    return (
      <div
        className="layer-thumbnail layer-thumbnail--reference"
        style={{ backgroundImage: `url(${courierScene})`, opacity: visible ? 1 : 0.35 }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="layer-thumbnail"
      width={documentWidth}
      height={documentHeight}
      aria-hidden="true"
      style={{ opacity: visible ? 1 : 0.35 }}
    />
  );
});

interface LayersPanelProps {
  activeFrameId: string;
  activeLayerId: string;
  document: ProjectDocument;
  onAddLayer: () => void;
  onBeginOpacityChange: () => void;
  onDeleteLayer: (layerId: string) => void;
  onDuplicateLayer: (layerId: string) => void;
  onEndOpacityChange: () => void;
  onFlattenVisible: () => void;
  onLayerChange: (layerId: string) => void;
  onMergeDown: (layerId: string) => void;
  onRenameLayer: (layerId: string, name: string) => void;
  onReorderLayer: (layerId: string, targetIndex: number) => void;
  onSetBlendMode: (layerId: string, blendMode: LayerBlendMode) => void;
  onSetOpacity: (layerId: string, opacity: number) => void;
  onToggleLock: (layerId: string) => void;
  onToggleVisibility: (layerId: string) => void;
}

export function LayersPanel({
  activeFrameId,
  activeLayerId,
  document,
  onAddLayer,
  onBeginOpacityChange,
  onDeleteLayer,
  onDuplicateLayer,
  onEndOpacityChange,
  onFlattenVisible,
  onLayerChange,
  onMergeDown,
  onRenameLayer,
  onReorderLayer,
  onSetBlendMode,
  onSetOpacity,
  onToggleLock,
  onToggleVisibility,
}: LayersPanelProps) {
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const frameLayers = getLayersForFrame(document, activeFrameId);
  const activeLayer = frameLayers.find((layer) => layer.id === activeLayerId);
  const activeIndex = frameLayers.findIndex((layer) => layer.id === activeLayerId);
  const pixelLayers = frameLayers.filter((layer) => layer.kind === "pixel");
  const visiblePixelLayers = pixelLayers.filter((layer) => isLayerVisible(document, layer.id, activeFrameId));
  const activeLocked = activeLayer ? isLayerLocked(document, activeLayer.id, activeFrameId) : false;
  const mergeTarget = activeLayer?.kind === "pixel"
    ? frameLayers.slice(activeIndex + 1).find((layer) => layer.kind === "pixel")
    : undefined;
  const mergeDisabled = !activeLayer || activeLayer.kind !== "pixel" || !mergeTarget
    || activeLocked || isLayerLocked(document, mergeTarget.id, activeFrameId)
    || !isLayerVisible(document, activeLayer.id, activeFrameId)
    || !isLayerVisible(document, mergeTarget.id, activeFrameId);
  const flattenDisabled = visiblePixelLayers.length < 2
    || visiblePixelLayers.some((layer) => isLayerLocked(document, layer.id, activeFrameId));
  const deleteDisabled = !activeLayer || activeLayer.locked || activeLayer.kind !== "pixel" || pixelLayers.length <= 1;

  useEffect(() => {
    setMenuOpen(false);
    setRenaming(false);
  }, [activeFrameId, activeLayerId]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menuOpen]);

  useEffect(() => {
    if (renaming) renameRef.current?.select();
  }, [renaming]);

  function startRename() {
    if (!activeLayer) return;
    setRenameValue(activeLayer.name);
    setRenaming(true);
    setMenuOpen(false);
  }

  function finishRename() {
    if (activeLayer && renameValue.trim()) onRenameLayer(activeLayer.id, renameValue);
    setRenaming(false);
  }

  function handleDrop(event: DragEvent, targetIndex: number) {
    event.preventDefault();
    const layerId = event.dataTransfer.getData("application/x-jt-pixel-layer") || draggedLayerId;
    if (layerId) onReorderLayer(layerId, targetIndex);
    setDraggedLayerId(null);
  }

  return (
    <section className="inspector-section layers-panel">
      <PanelHeader title="LAYERS" tone="coral" action="add" actionLabel="Add layer" onAction={onAddLayer} />
      <div className="layer-list">
        {frameLayers.map((layer, index) => {
          const visible = isLayerVisible(document, layer.id, activeFrameId);
          const locked = isLayerLocked(document, layer.id, activeFrameId);
          const active = activeLayerId === layer.id;
          return (
            <div
              key={layer.id}
              className={`layer-item ${active ? "is-active" : ""} ${draggedLayerId === layer.id ? "is-dragging" : ""}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, index)}
            >
              <div
                className={`layer-row ${active ? "is-active" : ""} ${locked ? "is-locked" : ""}`}
                data-locked={locked}
                data-testid={`layer-${layer.id}`}
                draggable
                onDragStart={(event) => {
                  setDraggedLayerId(layer.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("application/x-jt-pixel-layer", layer.id);
                }}
                onDragEnd={() => setDraggedLayerId(null)}
              >
                <GripVertical className="layer-grip" size={13} aria-hidden="true" />
                <button
                  className="layer-visibility"
                  aria-label={`${visible ? "Hide" : "Show"} ${layer.name} on this frame`}
                  title="Visibility on this frame"
                  onClick={() => onToggleVisibility(layer.id)}
                >
                  {visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <div
                  className="layer-select"
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${layer.name}`}
                  aria-pressed={active}
                  onClick={() => onLayerChange(layer.id)}
                  onKeyDown={(event) => {
                    if (!renaming && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      onLayerChange(layer.id);
                    }
                  }}
                >
                  <LayerThumbnail
                    documentWidth={document.width}
                    documentHeight={document.height}
                    layer={layer}
                    pixels={getCelPixels(document, layer.id, activeFrameId)}
                    visible={visible}
                  />
                  <span className="layer-info">
                    {active && renaming ? (
                      <input
                        ref={renameRef}
                        className="layer-rename-input"
                        value={renameValue}
                        maxLength={80}
                        aria-label="Layer name"
                        onChange={(event) => setRenameValue(event.target.value)}
                        onBlur={finishRename}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          event.stopPropagation();
                          if (event.key === "Enter") finishRename();
                          if (event.key === "Escape") setRenaming(false);
                        }}
                      />
                    ) : <strong>{layer.name}</strong>}
                    <span>{layer.kind === "reference" ? "Reference" : BLEND_MODES.find((mode) => mode.value === layer.blendMode)?.label}</span>
                  </span>
                </div>
                <span className="layer-opacity">{layer.opacity}%</span>
                {layer.kind === "pixel" ? (
                  <button
                    className={`layer-lock ${locked ? "is-active" : ""}`}
                    aria-label={`${locked ? "Unlock" : "Lock"} ${layer.name} on this frame`}
                    aria-pressed={locked}
                    title={`${locked ? "Unlock" : "Lock"} on this frame`}
                    data-testid={`layer-lock-${layer.id}`}
                    onClick={() => onToggleLock(layer.id)}
                  >
                    {locked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                ) : (
                  <span className="layer-lock layer-lock--permanent is-active" aria-label={`${layer.name} is permanently locked`} role="img" title="Permanently locked reference">
                    <Lock size={14} />
                  </span>
                )}
              </div>

              {active && layer.kind === "pixel" && (
                <div className="layer-properties" data-testid="layer-properties">
                  <div className="layer-property-row">
                    <label htmlFor={`layer-opacity-${layer.id}`}>OPACITY</label>
                    <output>{layer.opacity}%</output>
                    <input
                      id={`layer-opacity-${layer.id}`}
                      type="range"
                      min="0"
                      max="100"
                      value={layer.opacity}
                      onPointerDown={onBeginOpacityChange}
                      onPointerUp={onEndOpacityChange}
                      onPointerCancel={onEndOpacityChange}
                      onBlur={onEndOpacityChange}
                      onChange={(event) => onSetOpacity(layer.id, Number(event.target.value))}
                    />
                  </div>
                  <div className="layer-property-actions">
                    <select
                      value={layer.blendMode}
                      aria-label="Layer blend mode"
                      onChange={(event) => onSetBlendMode(layer.id, event.target.value as LayerBlendMode)}
                    >
                      {BLEND_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                    </select>
                    <button title="Duplicate layer" aria-label="Duplicate layer" onClick={() => onDuplicateLayer(layer.id)}><Copy size={14} /></button>
                    <button title="Move layer up" aria-label="Move layer up" disabled={activeIndex <= 0} onClick={() => onReorderLayer(layer.id, activeIndex - 1)}><ArrowUp size={14} /></button>
                    <button title="Move layer down" aria-label="Move layer down" disabled={activeIndex >= frameLayers.length - 1} onClick={() => onReorderLayer(layer.id, activeIndex + 1)}><ArrowDown size={14} /></button>
                    <div className="layer-more" ref={menuRef}>
                      <button
                        title="More layer actions"
                        aria-label="More layer actions"
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen((open) => !open)}
                      ><MoreHorizontal size={15} /></button>
                      {menuOpen && (
                        <div className="layer-menu" role="menu">
                          <button role="menuitem" onClick={startRename}>Rename</button>
                          <button role="menuitem" onClick={() => { onDuplicateLayer(layer.id); setMenuOpen(false); }}>Duplicate</button>
                          <button role="menuitem" disabled={mergeDisabled} onClick={() => { onMergeDown(layer.id); setMenuOpen(false); }}>Merge down</button>
                          <button role="menuitem" disabled={flattenDisabled} onClick={() => { onFlattenVisible(); setMenuOpen(false); }}>Flatten visible</button>
                          <span className="layer-menu__divider" />
                          <button className="is-danger" role="menuitem" disabled={deleteDisabled} onClick={() => { onDeleteLayer(layer.id); setMenuOpen(false); }}>Delete layer</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="layer-frame-local">FRAME LOCAL</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="layer-actions">
        <button aria-label="Add layer" onClick={onAddLayer}><Plus size={16} /></button>
        <span />
        <button aria-label="Delete selected layer" disabled={deleteDisabled} onClick={() => activeLayer && onDeleteLayer(activeLayer.id)}>
          <Trash2 size={16} />
        </button>
      </div>
    </section>
  );
}
