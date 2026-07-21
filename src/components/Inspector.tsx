import type { ProjectDocument } from "../editor/project";
import { ColorPanel } from "./ColorPanel";
import { LayersPanel } from "./LayersPanel";

interface InspectorProps {
  activeColor: string;
  backgroundColor: string;
  activeFrameId: string;
  activeLayerId: string;
  document: ProjectDocument;
  recentColors: string[];
  onAddLayer: () => void;
  onColorChange: (color: string) => void;
  onColorCommit: (color: string) => void;
  onBackgroundColorChange: (color: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onLayerChange: (layerId: string) => void;
  onOpenColorReplace: (sourceColor: string) => void;
  onPaletteChange: (palette: string[]) => void;
  onPickColor: () => void;
  onPickScreenColor: () => void;
  screenPickerBusy: boolean;
  onSwapColors: () => void;
  onToggleLayerLock: (layerId: string) => void;
  onToggleLayerVisibility: (layerId: string) => void;
}

export function Inspector({
  activeColor,
  backgroundColor,
  activeFrameId,
  activeLayerId,
  document,
  recentColors,
  onAddLayer,
  onColorChange,
  onColorCommit,
  onBackgroundColorChange,
  onDeleteLayer,
  onLayerChange,
  onOpenColorReplace,
  onPaletteChange,
  onPickColor,
  onPickScreenColor,
  screenPickerBusy,
  onSwapColors,
  onToggleLayerLock,
  onToggleLayerVisibility,
}: InspectorProps) {
  return (
    <aside className="inspector panel-surface" aria-label="Editor inspector">
      <ColorPanel
        key={document.id}
        activeColor={activeColor}
        backgroundColor={backgroundColor}
        document={document}
        recentColors={recentColors}
        onBackgroundChange={onBackgroundColorChange}
        onColorChange={onColorChange}
        onColorCommit={onColorCommit}
        onOpenReplace={onOpenColorReplace}
        onPaletteChange={onPaletteChange}
        onPickColor={onPickColor}
        onPickScreenColor={onPickScreenColor}
        screenPickerBusy={screenPickerBusy}
        onSwapColors={onSwapColors}
      />
      <LayersPanel
        activeFrameId={activeFrameId}
        activeLayerId={activeLayerId}
        document={document}
        onAddLayer={onAddLayer}
        onDeleteLayer={onDeleteLayer}
        onLayerChange={onLayerChange}
        onToggleLock={onToggleLayerLock}
        onToggleVisibility={onToggleLayerVisibility}
      />
    </aside>
  );
}
