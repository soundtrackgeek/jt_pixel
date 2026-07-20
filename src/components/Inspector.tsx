import { ColorPanel } from "./ColorPanel";
import { LayersPanel } from "./LayersPanel";

interface InspectorProps {
  activeColor: string;
  activeLayer: number;
  onColorChange: (color: string) => void;
  onLayerChange: (layer: number) => void;
}

export function Inspector({
  activeColor,
  activeLayer,
  onColorChange,
  onLayerChange,
}: InspectorProps) {
  return (
    <aside className="inspector panel-surface" aria-label="Editor inspector">
      <ColorPanel activeColor={activeColor} onColorChange={onColorChange} />
      <LayersPanel activeLayer={activeLayer} onLayerChange={onLayerChange} />
    </aside>
  );
}
