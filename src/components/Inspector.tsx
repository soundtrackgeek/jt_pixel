import type { ProjectDocument } from "../editor/project";
import { ColorPanel } from "./ColorPanel";
import { LayersPanel } from "./LayersPanel";

interface InspectorProps {
  activeColor: string;
  activeFrameId: string;
  activeLayerId: string;
  document: ProjectDocument;
  onAddLayer: () => void;
  onColorChange: (color: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onLayerChange: (layerId: string) => void;
  onToggleLayerVisibility: (layerId: string) => void;
}

export function Inspector({
  activeColor,
  activeFrameId,
  activeLayerId,
  document,
  onAddLayer,
  onColorChange,
  onDeleteLayer,
  onLayerChange,
  onToggleLayerVisibility,
}: InspectorProps) {
  return (
    <aside className="inspector panel-surface" aria-label="Editor inspector">
      <ColorPanel activeColor={activeColor} onColorChange={onColorChange} palette={document.palette} />
      <LayersPanel
        activeFrameId={activeFrameId}
        activeLayerId={activeLayerId}
        document={document}
        onAddLayer={onAddLayer}
        onDeleteLayer={onDeleteLayer}
        onLayerChange={onLayerChange}
        onToggleVisibility={onToggleLayerVisibility}
      />
    </aside>
  );
}
