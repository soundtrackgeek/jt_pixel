import { Minus, Plus } from "lucide-react";
import { tools } from "../data/editor";
import type { ToolId } from "../types";
import { PanelHeader } from "./PanelHeader";

interface ToolPanelProps {
  activeTool: ToolId;
  brushSize: number;
  opacity: number;
  pixelPerfect: boolean;
  onToolChange: (tool: ToolId) => void;
  onBrushSizeChange: (size: number) => void;
  onOpacityChange: (opacity: number) => void;
  onPixelPerfectChange: (enabled: boolean) => void;
}

const brushPresets = [1, 2, 3, 4, 5, 7];

export function ToolPanel({
  activeTool,
  brushSize,
  opacity,
  pixelPerfect,
  onToolChange,
  onBrushSizeChange,
  onOpacityChange,
  onPixelPerfectChange,
}: ToolPanelProps) {
  return (
    <aside className="tool-panel panel-surface">
      <PanelHeader title="DRAW" />

      <div className="tool-grid" role="toolbar" aria-label="Drawing tools">
        {tools.map(({ id, label, shortcut, icon: Icon }) => (
          <button
            key={id}
            className={`tool-button ${activeTool === id ? "is-active" : ""}`}
            onClick={() => onToolChange(id)}
            aria-pressed={activeTool === id}
            title={`${label} (${shortcut})`}
            data-testid={`tool-${id}`}
          >
            <Icon size={24} strokeWidth={1.9} />
            <span>{label}</span>
            <kbd>{shortcut}</kbd>
          </button>
        ))}
      </div>

      <div className="control-section">
        <div className="control-label-row">
          <label htmlFor="brush-size">Size</label>
          <div className="stepper">
            <button
              aria-label="Decrease brush size"
              onClick={() => onBrushSizeChange(Math.max(1, brushSize - 1))}
            >
              <Minus size={13} />
            </button>
            <output id="brush-size">{brushSize} px</output>
            <button
              aria-label="Increase brush size"
              onClick={() => onBrushSizeChange(Math.min(8, brushSize + 1))}
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        <div className="brush-presets" aria-label="Brush size presets">
          {brushPresets.map((size) => (
            <button
              key={size}
              className={brushSize === size ? "is-active" : ""}
              onClick={() => onBrushSizeChange(size)}
              aria-label={`${size} pixel brush`}
            >
              <span style={{ width: size + 2, height: size + 2 }} />
            </button>
          ))}
        </div>

        <div className="control-label-row control-label-row--stacked">
          <div>
            <label htmlFor="opacity">Opacity</label>
            <output>{opacity}%</output>
          </div>
          <input
            id="opacity"
            className="range-control"
            type="range"
            min="1"
            max="100"
            value={opacity}
            onChange={(event) => onOpacityChange(Number(event.target.value))}
          />
        </div>

        <label className="switch-row">
          <span>Pixel Perfect</span>
          <input
            type="checkbox"
            checked={pixelPerfect}
            onChange={(event) => onPixelPerfectChange(event.target.checked)}
          />
          <span className="switch" aria-hidden="true" />
        </label>
      </div>

      <div className="preset-section">
        <div className="mini-heading">PRESETS</div>
        <div className="pattern-grid">
          {["solid", "scatter", "dither", "slashes", "noise"].map((pattern) => (
            <button
              key={pattern}
              className={`pattern-button pattern-button--${pattern} ${
                pattern === "solid" ? "is-active" : ""
              }`}
              aria-label={`${pattern} brush pattern`}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
