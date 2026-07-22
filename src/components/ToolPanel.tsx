import { Hand, Layers3, Minus, MonitorUp, MousePointer2, Pipette, Plus, ScanSearch } from "lucide-react";
import { useEffect, useRef } from "react";
import { tools } from "../data/editor";
import type { EyedropperSource } from "../editor/colorOperations";
import type { MagicSelectionSettings } from "../editor/magicSelection";
import { countSelectionCells } from "../editor/selectionRegion";
import type { PixelSelection, ShapeMode, ToolId } from "../types";
import { PanelHeader } from "./PanelHeader";

interface ToolPanelProps {
  activeTool: ToolId;
  brushSize: number;
  clipboardAvailable: boolean;
  eyedropperSource: EyedropperSource;
  magicSettings: MagicSelectionSettings;
  opacity: number;
  pixelPerfect: boolean;
  screenPickerAvailable: boolean;
  screenPickerBusy: boolean;
  selection: PixelSelection | null;
  shapeMode: ShapeMode;
  onToolChange: (tool: ToolId) => void;
  onBrushSizeChange: (size: number) => void;
  onEyedropperSourceChange: (source: EyedropperSource) => void;
  onMagicSettingsChange: (settings: Partial<MagicSelectionSettings>) => void;
  onOpacityChange: (opacity: number) => void;
  onPixelPerfectChange: (enabled: boolean) => void;
  onPickScreenColor: () => void;
  onShapeModeChange: (mode: ShapeMode) => void;
}

const brushPresets = [1, 2, 3, 4, 5, 7];

export function ToolPanel({
  activeTool,
  brushSize,
  clipboardAvailable,
  eyedropperSource,
  magicSettings,
  opacity,
  pixelPerfect,
  screenPickerAvailable,
  screenPickerBusy,
  selection,
  shapeMode,
  onToolChange,
  onBrushSizeChange,
  onEyedropperSourceChange,
  onMagicSettingsChange,
  onOpacityChange,
  onPixelPerfectChange,
  onPickScreenColor,
  onShapeModeChange,
}: ToolPanelProps) {
  const precisionTool = ["line", "rectangle", "ellipse"].includes(activeTool);
  const closedShape = activeTool === "rectangle" || activeTool === "ellipse";
  const selectionTool = activeTool === "select" || activeTool === "move";
  const eyedropperTool = activeTool === "eyedropper";
  const magicTool = activeTool === "magic";
  const handTool = activeTool === "hand";
  const guidedTool = selectionTool || eyedropperTool || magicTool || handTool;
  const activeGuideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (magicTool || handTool) activeGuideRef.current?.scrollIntoView({ block: "nearest" });
  }, [handTool, magicTool]);

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
      ) : magicTool ? (
        <div ref={activeGuideRef} className="magic-selection-guide" data-testid="magic-selection-guide">
          <div className="mini-heading">MAGIC SELECT</div>
          <div className="magic-selection-summary">
            <span className="magic-selection-summary__icon"><ScanSearch size={16} /></span>
            <span>
              <strong>{selection ? `${countSelectionCells(selection).toLocaleString()} PIXELS` : "HOVER TO PREVIEW"}</strong>
              <small>{selection ? `${selection.width} × ${selection.height} bounds` : "Click a color region to select it"}</small>
            </span>
          </div>

          <div className="magic-setting">
            <span className="magic-setting__label">SAMPLE</span>
            <div className="magic-segment" role="group" aria-label="Magic selection sample source">
              <button className={magicSettings.source === "active-layer" ? "is-active" : ""} aria-pressed={magicSettings.source === "active-layer"} onClick={() => onMagicSettingsChange({ source: "active-layer" })}><Layers3 size={13} /> LAYER</button>
              <button className={magicSettings.source === "visible-pixels" ? "is-active" : ""} aria-pressed={magicSettings.source === "visible-pixels"} onClick={() => onMagicSettingsChange({ source: "visible-pixels" })}><Pipette size={13} /> VISIBLE</button>
            </div>
          </div>

          <div className="magic-setting">
            <span className="magic-setting__label">MATCH</span>
            <div className="magic-segment" role="group" aria-label="Magic selection match mode">
              <button className={magicSettings.match === "contiguous" ? "is-active" : ""} aria-pressed={magicSettings.match === "contiguous"} onClick={() => onMagicSettingsChange({ match: "contiguous" })}>ISLAND</button>
              <button className={magicSettings.match === "global" ? "is-active" : ""} aria-pressed={magicSettings.match === "global"} onClick={() => onMagicSettingsChange({ match: "global" })}>ALL MATCHES</button>
            </div>
          </div>

          <div className="magic-setting">
            <span className="magic-setting__label">COMBINE</span>
            <div className="magic-combine" role="group" aria-label="Magic selection combine mode">
              {(["replace", "add", "subtract"] as const).map((mode) => (
                <button
                  key={mode}
                  className={magicSettings.combineMode === mode ? "is-active" : ""}
                  aria-pressed={magicSettings.combineMode === mode}
                  onClick={() => onMagicSettingsChange({ combineMode: mode })}
                >
                  {mode === "replace" ? "NEW" : mode === "add" ? "+ ADD" : "− CUT"}
                </button>
              ))}
            </div>
          </div>

          <div className="magic-tolerance">
            <div><label htmlFor="magic-tolerance">TOLERANCE</label><output>{magicSettings.tolerance}</output></div>
            <input id="magic-tolerance" className="range-control" type="range" min="0" max="255" value={magicSettings.tolerance} onInput={(event) => onMagicSettingsChange({ tolerance: Number(event.currentTarget.value) })} />
          </div>
          <p>Transparent pixels can be selected. Locked artwork stays protected.</p>
        </div>
      ) : handTool ? (
        <div ref={activeGuideRef} className="hand-guide" data-testid="hand-guide">
          <div className="mini-heading">NAVIGATE</div>
          <div className="hand-guide__hero">
            <span><Hand size={21} /></span>
            <div><strong>MOVE THE VIEW</strong><small>Artwork stays pixel-perfect</small></div>
          </div>
          <div className="hand-guide__shortcuts">
            <span><kbd>DRAG</kbd><small>Pan with the Hand tool</small></span>
            <span><kbd>SPACE</kbd><small>Temporary Hand from any tool</small></span>
            <span><MousePointer2 size={14} /><small>Middle-drag to pan</small></span>
            <span><kbd>WHEEL</kbd><small>Zoom toward the pointer</small></span>
          </div>
          <p>Viewport position is temporary and never changes the project.</p>
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
          <button
            className="screen-picker-launch"
            data-testid="screen-picker-launch"
            data-desktop-available={screenPickerAvailable}
            disabled={screenPickerBusy}
            aria-keyshortcuts="Shift+I"
            onClick={onPickScreenColor}
          >
            <MonitorUp size={16} />
            <span>
              <strong>PICK FROM SCREEN</strong>
              <small>{screenPickerAvailable ? "Full desktop and every monitor" : "Windows desktop app"}</small>
            </span>
            <kbd>⇧I</kbd>
          </button>
          <div className="eyedropper-guide__tip">
            <kbd>ALT</kbd>
            <span>Hold while using any drawing tool for a temporary color sample.</span>
          </div>
          <p>Left click sets foreground · Right click sets background. Transparent cells leave colors unchanged.</p>
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

      {guidedTool ? null : precisionTool ? (
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
