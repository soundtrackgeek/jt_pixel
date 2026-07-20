import { Eye, EyeOff, GripVertical, Lock, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import courierScene from "../assets/courier-scene.png";
import { layers } from "../data/editor";
import { PanelHeader } from "./PanelHeader";

interface LayersPanelProps {
  activeLayer: number;
  onLayerChange: (layer: number) => void;
}
export function LayersPanel({ activeLayer, onLayerChange }: LayersPanelProps) {
  const [hiddenLayers, setHiddenLayers] = useState<Set<number>>(new Set());

  function toggleLayerVisibility(layerId: number) {
    setHiddenLayers((current) => {
      const next = new Set(current);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  }

  return (
    <section className="inspector-section layers-panel">
      <PanelHeader title="LAYERS" tone="coral" action="add" />
      <div className="layer-list">
        {layers.map((layer) => {
          const hidden = hiddenLayers.has(layer.id);
          return (
            <div
              key={layer.id}
              className={`layer-row ${activeLayer === layer.id ? "is-active" : ""}`}
              onClick={() => onLayerChange(layer.id)}
              data-testid={`layer-${layer.id}`}
            >
              <button
                className="layer-visibility"
                aria-label={`${hidden ? "Show" : "Hide"} ${layer.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleLayerVisibility(layer.id);
                }}
              >
                {hidden ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
              <div
                className="layer-thumbnail"
                style={{
                  backgroundImage: `url(${courierScene})`,
                  backgroundPosition: layer.thumbnailPosition,
                  opacity: hidden ? 0.35 : 1,
                }}
              />
              <div className="layer-info">
                <strong>{layer.name}</strong>
                <span>{layer.blendMode}</span>
              </div>
              <span className="layer-opacity">{layer.opacity}%</span>
              {layer.locked ? <Lock className="layer-lock" size={14} /> : <GripVertical size={15} />}
            </div>
          );
        })}
      </div>
      <div className="layer-actions">
        <button aria-label="Add layer"><Plus size={16} /></button>
        <span />
        <button aria-label="Delete selected layer"><Trash2 size={16} /></button>
      </div>
    </section>
  );
}
