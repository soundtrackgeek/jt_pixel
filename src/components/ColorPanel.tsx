import { Copy, Pipette, RefreshCw } from "lucide-react";
import { palette } from "../data/editor";
import { PanelHeader } from "./PanelHeader";

interface ColorPanelProps {
  activeColor: string;
  onColorChange: (color: string) => void;
}
function hexToRgb(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function ColorPanel({ activeColor, onColorChange }: ColorPanelProps) {
  const { r, g, b } = hexToRgb(activeColor);

  return (
    <section className="inspector-section color-panel">
      <PanelHeader title="COLOR" tone="coral" />

      <div className="swatch-row" aria-label="Color palette">
        {palette.map((color) => (
          <button
            key={color}
            className={`color-swatch ${activeColor === color ? "is-active" : ""}`}
            style={{ backgroundColor: color }}
            aria-label={`Use color ${color}`}
            aria-pressed={activeColor === color}
            onClick={() => onColorChange(color)}
            data-testid={`swatch-${color.slice(1)}`}
          />
        ))}
      </div>

      <div className="color-editor">
        <div className="color-field" aria-label="Saturation and brightness">
          <span className="color-field__cursor" />
        </div>
        <div className="hue-strip" aria-label="Hue">
          <span className="hue-strip__cursor" />
        </div>

        <div className="color-values">
          <label>
            <span>H</span>
            <input readOnly value="186" aria-label="Hue" />
          </label>
          <label>
            <span>S</span>
            <input readOnly value="72" aria-label="Saturation" />
          </label>
          <label>
            <span>B</span>
            <input readOnly value="89" aria-label="Brightness" />
          </label>
          <label>
            <span>R</span>
            <input readOnly value={r} aria-label="Red" />
          </label>
          <label>
            <span>G</span>
            <input readOnly value={g} aria-label="Green" />
          </label>
          <label>
            <span>B</span>
            <input readOnly value={b} aria-label="Blue" />
          </label>
        </div>
      </div>

      <div className="color-footer">
        <div className="active-color-chip" style={{ backgroundColor: activeColor }} />
        <button className="icon-button" aria-label="Swap foreground and background colors">
          <RefreshCw size={14} />
        </button>
        <div className="hex-field">
          <span>#</span>
          <input readOnly value={activeColor.slice(1).toUpperCase()} aria-label="Hex color" />
          <button aria-label="Copy color value" onClick={() => navigator.clipboard?.writeText(activeColor)}>
            <Copy size={14} />
          </button>
        </div>
        <button className="icon-button" aria-label="Pick color from canvas">
          <Pipette size={15} />
        </button>
      </div>
    </section>
  );
}
