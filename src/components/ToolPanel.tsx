import { Layers3, Minus, Pipette, Plus } from "lucide-react";
import { tools } from "../data/editor";
import type { EyedropperSource } from "../editor/colorOperations";
import type { PixelSelection, ShapeMode, ToolId } from "../types";
import { PanelHeader } from "./PanelHeader";

interface ToolPanelProps {
  activeTool: ToolId;
  brushSize: number;
  clipboardAvailable: boolean;
  eyedropperSource: EyedropperSource;
  opacity: number;
  pixelPerfect: boolean;
  selection: PixelSelection | null;
  shapeMode: ShapeMode;
  onToolChange: (tool: ToolId) => void;
  onBrushSizeChange: (size: number) => void;
  onEyedropperSourceChange: (source: EyedropperSource) => void;
  onOpacityChange: (opacity: number) => void;
  onPixelPerfectChange: (enabled: boolean) => void;
  onShapeModeChange: (mode: ShapeMode) => void;
}

const brushPresets = [1, 2, 3, 4, 5, 7];

export function ToolPanel({
  activeTool,
  brushSize,
  clipboardAvailable,
  eyedropperSource,
  opacity,
  pixelPerfect,
  selection,
  shapeMode,
  onToolChange,
  onBrushSizeChange,
  onEyedropperSourceChange,
  onOpacityChange,
  onPixelPerfectChange,
  onShapeModeChange,
}: ToolPanelProps) {
  const precisionTool = ["line", "rectangle", "ellipse"].includes(activeTool);
  const closedShape = activeTool === "rectangle" || activeTool === "ellipse";
  const selectionTool = activeTool === "select" || activeTool === "move";
  const eyedropperTool = activeTool === "eyedropper";

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

      {selectionTool ? (
        <div className="selection-guide" data-testid="selection-guide">
          <div className="mini-heading">SELECTION</div>
          {selection ? (
            <div className="selection-guide__readout">
              <div>
                <span>SIZE</span>
                <strong>{selection.width} × {selection.height}</strong>
              </div>
              <div>
                <span>ORIGIN</span>
                <strong>{selection.x}, {selection.y}</strong>
              </div>
            </div>
          ) : (
            <div className="selection-guide__empty">
              {activeTool === "select"
                ? "Drag across the canvas to create a pixel-perfect marquee."
                : "Create a selection first, then drag inside it to move pixels."}
            </div>
          )}
          <div className="selection-guide__shortcuts">
            <span><kbd>ARROWS</kbd> Nudge 1 px</span>
            <span><kbd>SHIFT</kbd> Nudge 8 px</span>
            <span><kbd>ESC</kbd> Deselect</span>
          </div>
          <p>{clipboardAvailable ? "Clipboard ready for Paste." : "Copy and Paste stay inside JT Pixel."}</p>
        </div>
      ) : eyedropperTool ? (
        <div className="eyedropper-guide" data-testid="eyedropper-guide">
          <div className="mini-heading">SAMPLE SOURCE</div>
          <div className="eyedropper-source" role="group" aria-label="Eyedropper sample source">
            <button
              className={eyedropperSource === "active-layer" ? "is-active" : ""}
              aria-pressed={eyedropperSource === "active-layer"}
              onClick={() => onEyedropperSourceChange("active-layer")}
            >
              <Layers3 size={15} />
              <span><strong>Layer</strong><small>Current cel only</small></span>
            </button>
            <button
              className={eyedropperSource === "visible-pixels" ? "is-active" : ""}
              aria-pressed={eyedropperSource === "visible-pixels"}
              onClick={() => onEyedropperSourceChange("visible-pixels")}
            >
              <Pipette size={15} />
              <span><strong>Visible</strong><small>Composited paint</small></span>
            </button>
          </div>
          <div className="eyedropper-guide__tip">
            <kbd>ALT</kbd>
            <span>Hold while using any drawing tool for a temporary color sample.</span>
          </div>
          <p>Click or drag across painted pixels. Transparent cells leave the current color unchanged.</p>
        </div>
      ) : (
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
      )}

      {selectionTool || eyedropperTool ? null : precisionTool ? (
        <div className="precision-section" data-testid="precision-options">
          <div className="mini-heading">PRECISION</div>
          {closedShape ? (
            <div className="shape-mode" role="group" aria-label="Shape rendering mode">
              {(["outline", "filled"] as const).map((mode) => (
                <button
                  key={mode}
                  className={shapeMode === mode ? "is-active" : ""}
                  aria-pressed={shapeMode === mode}
                  onClick={() => onShapeModeChange(mode)}
                >
                  <span className={`shape-mode__sample shape-mode__sample--${mode}`} aria-hidden="true" />
                  {mode === "outline" ? "Outline" : "Filled"}
                </button>
              ))}
            </div>
          ) : null}
          <div className="precision-hint">
            <kbd>SHIFT</kbd>
            <span>
              {activeTool === "line"
                ? "Snap to 45° angles"
                : `Lock to a perfect ${activeTool === "ellipse" ? "circle" : "square"}`}
            </span>
          </div>
          <p>Click and drag for a live pixel preview. Release to place.</p>
        </div>
      ) : (
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
      )}
    </aside>
  );
}
