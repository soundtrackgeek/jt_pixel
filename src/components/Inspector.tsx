import type { LayerBlendMode, ProjectDocument } from "../editor/project";
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
  onBeginLayerOpacityChange: () => void;
  onColorChange: (color: string) => void;
  onColorCommit: (color: string) => void;
  onBackgroundColorChange: (color: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onDuplicateLayer: (layerId: string) => void;
  onEndLayerOpacityChange: () => void;
  onFlattenVisibleLayers: () => void;
  onLayerChange: (layerId: string) => void;
  onMergeLayerDown: (layerId: string) => void;
  onRenameLayer: (layerId: string, name: string) => void;
  onReorderLayer: (layerId: string, targetIndex: number) => void;
  onSetLayerBlendMode: (layerId: string, blendMode: LayerBlendMode) => void;
  onSetLayerOpacity: (layerId: string, opacity: number) => void;
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
  onBeginLayerOpacityChange,
  onColorChange,
  onColorCommit,
  onBackgroundColorChange,
  onDeleteLayer,
  onDuplicateLayer,
  onEndLayerOpacityChange,
  onFlattenVisibleLayers,
  onLayerChange,
  onMergeLayerDown,
  onRenameLayer,
  onReorderLayer,
  onSetLayerBlendMode,
  onSetLayerOpacity,
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
        onBeginOpacityChange={onBeginLayerOpacityChange}
        onDeleteLayer={onDeleteLayer}
        onDuplicateLayer={onDuplicateLayer}
        onEndOpacityChange={onEndLayerOpacityChange}
        onFlattenVisible={onFlattenVisibleLayers}
        onLayerChange={onLayerChange}
        onMergeDown={onMergeLayerDown}
        onRenameLayer={onRenameLayer}
        onReorderLayer={onReorderLayer}
        onSetBlendMode={onSetLayerBlendMode}
        onSetOpacity={onSetLayerOpacity}
        onToggleLock={onToggleLayerLock}
        onToggleVisibility={onToggleLayerVisibility}
      />
    </aside>
  );
}
