import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Grid3X3,
  Move,
  Repeat2,
} from "lucide-react";
import type {
  TileSymmetry,
  TileWorkspaceSettings,
} from "../editor/tiles";
import { PanelHeader } from "./PanelHeader";

interface TilePanelProps {
  canOffset: boolean;
  height: number;
  pixelCount: number;
  settings: TileWorkspaceSettings;
  width: number;
  onOffset: (offsetX: number, offsetY: number) => void;
  onSettingsChange: (settings: Partial<TileWorkspaceSettings>) => void;
}

const symmetryOptions: Array<{
  label: string;
  value: TileSymmetry;
}> = [
  { label: "Off", value: "off" },
  { label: "Horizontal", value: "horizontal" },
  { label: "Vertical", value: "vertical" },
  { label: "Quad", value: "quad" },
];

export function TilePanel({
  canOffset,
  height,
  pixelCount,
  settings,
  width,
  onOffset,
  onSettingsChange,
}: TilePanelProps) {
  return (
    <aside className="tool-panel tile-panel panel-surface">
      <PanelHeader title="TILES" />

      <div className="tile-panel__intro">
        <span className="tile-panel__mark"><Grid3X3 size={17} /></span>
        <span>
          <strong>{width} × {height} TILE</strong>
          <small>{pixelCount.toLocaleString()} painted pixels</small>
        </span>
      </div>

      <section className="tile-control-section">
        <div className="mini-heading">MODE</div>
        <div className="tile-segmented" role="group" aria-label="Tile drawing mode">
          {(["standard", "seamless"] as const).map((mode) => (
            <button
              key={mode}
              className={settings.mode === mode ? "is-active" : ""}
              aria-pressed={settings.mode === mode}
              onClick={() => onSettingsChange({ mode })}
            >
              {mode === "standard" ? "Standard" : "Seamless"}
            </button>
          ))}
        </div>
        <p>
          {settings.mode === "seamless"
            ? "Brushes and fills wrap cleanly across opposite canvas edges."
            : "Drawing stops at the tile boundary."}
        </p>
      </section>

      <section className="tile-control-section">
        <div className="mini-heading">REPEAT PREVIEW</div>
        <div className="tile-segmented" role="group" aria-label="Tile repeat preview">
          <button
            className={settings.repeatPreview === "off" ? "is-active" : ""}
            aria-pressed={settings.repeatPreview === "off"}
            onClick={() => onSettingsChange({ repeatPreview: "off" })}
          >
            Off
          </button>
          <button
            className={settings.repeatPreview === "3x3" ? "is-active" : ""}
            aria-pressed={settings.repeatPreview === "3x3"}
            onClick={() => onSettingsChange({ repeatPreview: "3x3" })}
          >
            <Repeat2 size={13} /> 3×3
          </button>
        </div>
      </section>

      <section className="tile-control-section">
        <div className="mini-heading">SYMMETRY</div>
        <div className="tile-symmetry-grid" role="group" aria-label="Tile symmetry mode">
          {symmetryOptions.map((option) => (
            <button
              key={option.value}
              className={settings.symmetry === option.value ? "is-active" : ""}
              aria-pressed={settings.symmetry === option.value}
              onClick={() => onSettingsChange({ symmetry: option.value })}
            >
              <span className={`tile-symmetry-icon tile-symmetry-icon--${option.value}`} aria-hidden="true" />
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="tile-control-section tile-offset-section">
        <div className="mini-heading">OFFSET SEAM</div>
        <div className="tile-offset-pad" role="group" aria-label="Offset active tile layer">
          <button disabled={!canOffset} aria-label="Offset tile up one pixel" onClick={() => onOffset(0, -1)}><ArrowUp size={15} /></button>
          <button disabled={!canOffset} aria-label="Offset tile left one pixel" onClick={() => onOffset(-1, 0)}><ArrowLeft size={15} /></button>
          <button
            className="tile-offset-pad__center"
            disabled={!canOffset}
            aria-label="Center tile seams"
            title="Move both seams to the center"
            onClick={() => onOffset(Math.floor(width / 2), Math.floor(height / 2))}
          >
            <Move size={15} />
          </button>
          <button disabled={!canOffset} aria-label="Offset tile right one pixel" onClick={() => onOffset(1, 0)}><ArrowRight size={15} /></button>
          <button disabled={!canOffset} aria-label="Offset tile down one pixel" onClick={() => onOffset(0, 1)}><ArrowDown size={15} /></button>
        </div>
        <p>Use the center control to bring both outer seams into view. Every offset is one Undo step.</p>
      </section>

      <div className="tile-panel__status" data-mode={settings.mode}>
        <span aria-hidden="true" />
        {settings.mode === "seamless" ? "EDGE WRAP ARMED" : "STANDARD BOUNDS"}
      </div>
    </aside>
  );
}
