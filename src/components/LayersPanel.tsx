import { Eye, EyeOff, GripVertical, Lock, Plus, Trash2 } from "lucide-react";
import { memo, useEffect, useRef } from "react";
import courierScene from "../assets/courier-scene.png";
import { renderPixelMap } from "../editor/pixels";
import {
  getCelPixels,
  isLayerPresent,
  isLayerVisible,
  type PixelMap,
  type ProjectDocument,
  type ProjectLayer,
} from "../editor/project";
import { PanelHeader } from "./PanelHeader";

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
  onDeleteLayer: (layerId: string) => void;
  onLayerChange: (layerId: string) => void;
  onToggleVisibility: (layerId: string) => void;
}

export function LayersPanel({
  activeFrameId,
  activeLayerId,
  document,
  onAddLayer,
  onDeleteLayer,
  onLayerChange,
  onToggleVisibility,
}: LayersPanelProps) {
  const frameLayers = document.layers.filter(
    (layer) => isLayerPresent(document, layer.id, activeFrameId),
  );
  const activeLayer = frameLayers.find((layer) => layer.id === activeLayerId);
  const pixelLayerCount = frameLayers.filter((layer) => layer.kind === "pixel").length;
  const deleteDisabled = !activeLayer || activeLayer.locked || activeLayer.kind !== "pixel" || pixelLayerCount <= 1;

  return (
    <section className="inspector-section layers-panel">
      <PanelHeader title="LAYERS" tone="coral" action="add" actionLabel="Add layer" onAction={onAddLayer} />
      <div className="layer-list">
        {frameLayers.map((layer) => {
          const visible = isLayerVisible(document, layer.id, activeFrameId);
          return (
            <div
              key={layer.id}
              className={`layer-row ${activeLayerId === layer.id ? "is-active" : ""}`}
              data-testid={`layer-${layer.id}`}
            >
              <button
                className="layer-visibility"
                aria-label={`${visible ? "Hide" : "Show"} ${layer.name} on this frame`}
                title="Visibility on this frame"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleVisibility(layer.id);
                }}
              >
                {visible ? <Eye size={17} /> : <EyeOff size={17} />}
              </button>
              <button
                className="layer-select"
                aria-label={`Select ${layer.name}`}
                aria-pressed={activeLayerId === layer.id}
                onClick={() => onLayerChange(layer.id)}
              >
                <LayerThumbnail
                  documentWidth={document.width}
                  documentHeight={document.height}
                  layer={layer}
                  pixels={getCelPixels(document, layer.id, activeFrameId)}
                  visible={visible}
                />
                <span className="layer-info">
                  <strong>{layer.name}</strong>
                  <span>{layer.kind === "reference" ? "Reference" : layer.blendMode === "add" ? "Add" : "Normal"}</span>
                </span>
              </button>
              <span className="layer-opacity">{layer.opacity}%</span>
              {layer.locked ? <Lock className="layer-lock" size={14} /> : <GripVertical size={15} />}
            </div>
          );
        })}
      </div>
      <div className="layer-actions">
        <button aria-label="Add layer" onClick={onAddLayer}><Plus size={16} /></button>
        <span />
        <button
          aria-label="Delete selected layer"
          disabled={deleteDisabled}
          onClick={() => activeLayer && onDeleteLayer(activeLayer.id)}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </section>
  );
}
