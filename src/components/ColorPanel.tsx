import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Droplets,
  Minus,
  MonitorUp,
  Palette,
  Pipette,
  Plus,
  RefreshCw,
  Replace,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  MAX_PALETTE_COLORS,
  type ProjectDocument,
} from "../editor/project";
import {
  extractPaletteFromDocument,
  getProjectColorCounts,
  hexToHsv,
  hexToRgb,
  hsvToHex,
  normalizeHexColor,
  rgbToHex,
} from "../editor/colorOperations";
import { PanelHeader } from "./PanelHeader";

interface ColorPanelProps {
  activeColor: string;
  backgroundColor: string;
  document: ProjectDocument;
  recentColors: string[];
  onBackgroundChange: (color: string) => void;
  onColorChange: (color: string) => void;
  onColorCommit: (color: string) => void;
  onOpenReplace: (sourceColor: string) => void;
  onPaletteChange: (palette: string[]) => void;
  onPickColor: () => void;
  onPickScreenColor: () => void;
  screenPickerBusy: boolean;
  onSwapColors: () => void;
}

interface PaletteDragGesture {
  dragging: boolean;
  fromIndex: number;
  pointerId: number;
  startX: number;
  startY: number;
}

function clampChannel(value: number, maximum: number) {
  return Math.max(0, Math.min(maximum, Number.isFinite(value) ? value : 0));
}

export function ColorPanel({
  activeColor,
  backgroundColor,
  document,
  recentColors,
  onBackgroundChange,
  onColorChange,
  onColorCommit,
  onOpenReplace,
  onPaletteChange,
  onPickColor,
  onPickScreenColor,
  screenPickerBusy,
  onSwapColors,
}: ColorPanelProps) {
  const palette = document.palette;
  const initialIndex = Math.max(0, palette.findIndex((color) => color === activeColor));
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [studioOpen, setStudioOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState(activeColor.slice(1).toUpperCase());
  const [paletteDrag, setPaletteDrag] = useState<{ fromIndex: number; targetIndex: number } | null>(null);
  const paletteDragRef = useRef<PaletteDragGesture | null>(null);
  const suppressSwatchClickRef = useRef(false);
  const swatchRowRef = useRef<HTMLDivElement>(null);
  const saturationDraggingRef = useRef(false);
  const hueDraggingRef = useRef(false);
  const rgb = hexToRgb(activeColor);
  const hsv = hexToHsv(activeColor);
  const colorCounts = useMemo(() => getProjectColorCounts(document), [document]);
  const extractedPalette = useMemo(() => extractPaletteFromDocument(document), [document]);
  const selectedColor = palette[selectedIndex] ?? activeColor;
  const selectedUsage = colorCounts.get(selectedColor) ?? 0;
  const duplicateActiveIndex = palette.findIndex(
    (color, index) => color === activeColor && index !== selectedIndex,
  );
  const canUpdateSelected = palette[selectedIndex] !== undefined
    && selectedColor !== activeColor
    && duplicateActiveIndex < 0;

  useEffect(() => {
    setHexDraft(activeColor.slice(1).toUpperCase());
  }, [activeColor]);

  useEffect(() => {
    if (selectedIndex >= palette.length) setSelectedIndex(Math.max(0, palette.length - 1));
  }, [palette.length, selectedIndex]);

  function commitHexDraft() {
    const normalized = normalizeHexColor(hexDraft);
    if (normalized) onColorCommit(normalized);
    else setHexDraft(activeColor.slice(1).toUpperCase());
  }

  function updateSaturationValue(event: PointerEvent<HTMLButtonElement>, commit: boolean) {
    const rect = event.currentTarget.getBoundingClientRect();
    const saturation = clampChannel(((event.clientX - rect.left) / rect.width) * 100, 100);
    const value = clampChannel((1 - ((event.clientY - rect.top) / rect.height)) * 100, 100);
    const next = hsvToHex({ hue: hsv.hue, saturation, value });
    if (commit) onColorCommit(next);
    else onColorChange(next);
  }

  function updateHue(event: PointerEvent<HTMLButtonElement>, commit: boolean) {
    const rect = event.currentTarget.getBoundingClientRect();
    const hue = clampChannel(((event.clientY - rect.top) / rect.height) * 359, 359);
    const next = hsvToHex({ ...hsv, hue });
    if (commit) onColorCommit(next);
    else onColorChange(next);
  }

  function reorderPalette(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= palette.length || to >= palette.length) return;
    const next = [...palette];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onPaletteChange(next);
    setSelectedIndex(to);
  }

  function paletteIndexAtPoint(clientX: number, clientY: number) {
    const row = swatchRowRef.current;
    if (!row) return null;
    const directTarget = globalThis.document.elementFromPoint(clientX, clientY)
      ?.closest<HTMLButtonElement>("[data-palette-index]");
    if (directTarget && row.contains(directTarget)) {
      const index = Number(directTarget.dataset.paletteIndex);
      if (Number.isInteger(index)) return index;
    }

    const rowBounds = row.getBoundingClientRect();
    if (clientY < rowBounds.top - 12 || clientY > rowBounds.bottom + 12) return null;
    let nearestIndex: number | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const swatch of row.querySelectorAll<HTMLButtonElement>("[data-palette-index]")) {
      const bounds = swatch.getBoundingClientRect();
      const distance = Math.hypot(
        clientX - (bounds.left + (bounds.width / 2)),
        clientY - (bounds.top + (bounds.height / 2)),
      );
      if (distance >= nearestDistance) continue;
      nearestDistance = distance;
      nearestIndex = Number(swatch.dataset.paletteIndex);
    }
    return nearestIndex;
  }

  function beginPaletteDrag(event: PointerEvent<HTMLButtonElement>, fromIndex: number) {
    if (event.button !== 0) return;
    paletteDragRef.current = {
      dragging: false,
      fromIndex,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePaletteDrag(event: PointerEvent<HTMLButtonElement>) {
    const gesture = paletteDragRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (
      !gesture.dragging
      && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) < 5
    ) return;
    gesture.dragging = true;
    const targetIndex = paletteIndexAtPoint(event.clientX, event.clientY);
    if (targetIndex === null) return;
    setPaletteDrag((current) => (
      current?.fromIndex === gesture.fromIndex && current.targetIndex === targetIndex
        ? current
        : { fromIndex: gesture.fromIndex, targetIndex }
    ));
    event.preventDefault();
  }

  function finishPaletteDrag(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const gesture = paletteDragRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const targetIndex = cancelled ? null : paletteIndexAtPoint(event.clientX, event.clientY);
    paletteDragRef.current = null;
    setPaletteDrag(null);
    if (!gesture.dragging) return;

    suppressSwatchClickRef.current = true;
    window.setTimeout(() => {
      suppressSwatchClickRef.current = false;
    }, 0);
    if (targetIndex !== null) reorderPalette(gesture.fromIndex, targetIndex);
    event.preventDefault();
  }

  function selectSwatch(index: number) {
    setSelectedIndex(index);
    onColorCommit(palette[index]);
  }

  function addCurrentColor() {
    if (palette.includes(activeColor) || palette.length >= MAX_PALETTE_COLORS) return;
    onPaletteChange([...palette, activeColor]);
    setSelectedIndex(palette.length);
  }

  function updateSelectedColor() {
    if (!canUpdateSelected) return;
    onPaletteChange(palette.map((color, index) => index === selectedIndex ? activeColor : color));
  }

  function removeSelectedColor() {
    if (palette.length <= 1 || !palette[selectedIndex]) return;
    onPaletteChange(palette.filter((_, index) => index !== selectedIndex));
    setSelectedIndex(Math.min(selectedIndex, palette.length - 2));
  }

  function extractUsedColors() {
    if (extractedPalette.length === 0) return;
    onPaletteChange(extractedPalette);
    setSelectedIndex(0);
    onColorCommit(extractedPalette[0]);
  }

  return (
    <section className="inspector-section color-panel">
      <PanelHeader
        title="COLOR"
        tone="coral"
        action="menu"
        actionLabel={studioOpen ? "Close Palette Studio" : "Open Palette Studio"}
        onAction={() => setStudioOpen((current) => !current)}
      />

      <div ref={swatchRowRef} className="swatch-row" aria-label="Project color palette">
        {palette.map((color, index) => {
          const usage = colorCounts.get(color) ?? 0;
          return (
            <button
              key={`${color}-${index}`}
              className={`color-swatch ${activeColor === color ? "is-active" : ""} ${backgroundColor === color ? "is-background" : ""} ${selectedIndex === index ? "is-selected" : ""} ${paletteDrag?.fromIndex === index ? "is-dragging" : ""} ${paletteDrag?.targetIndex === index ? "is-drop-target" : ""}`}
              style={{ backgroundColor: color }}
              aria-label={`Use color ${color}; ${usage} project pixels; drag to reorder`}
              aria-pressed={activeColor === color}
              onClick={(event) => {
                if (suppressSwatchClickRef.current) {
                  event.preventDefault();
                  return;
                }
                selectSwatch(index);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                setSelectedIndex(index);
                onBackgroundChange(color);
              }}
              onPointerDown={(event) => beginPaletteDrag(event, index)}
              onPointerMove={movePaletteDrag}
              onPointerUp={finishPaletteDrag}
              onPointerCancel={(event) => finishPaletteDrag(event, true)}
              data-palette-index={index}
              data-testid={`swatch-${color.slice(1)}`}
            >
              {studioOpen && usage > 0 ? <span>{usage > 999 ? "999+" : usage}</span> : null}
            </button>
          );
        })}
      </div>

      {recentColors.length > 1 ? (
        <div className="recent-colors">
          <span>RECENT</span>
          <div aria-label="Recent colors">
            {recentColors.map((color) => (
              <button
                key={color}
                style={{ backgroundColor: color }}
                aria-label={`Use recent color ${color}`}
                onClick={() => onColorCommit(color)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {studioOpen ? (
        <div className="palette-studio" data-testid="palette-studio">
          <div className="palette-studio__heading">
            <span><Palette size={13} /> PALETTE STUDIO</span>
            <output>{palette.length}/{MAX_PALETTE_COLORS}</output>
          </div>
          <div className="palette-studio__selection">
            <i style={{ backgroundColor: selectedColor }} />
            <span>
              <strong>{selectedColor.toUpperCase()}</strong>
              <small>{selectedUsage.toLocaleString()} project {selectedUsage === 1 ? "pixel" : "pixels"}</small>
            </span>
            <button
              aria-label="Move selected swatch left"
              disabled={selectedIndex <= 0}
              onClick={() => reorderPalette(selectedIndex, selectedIndex - 1)}
            ><ArrowLeft size={13} /></button>
            <button
              aria-label="Move selected swatch right"
              disabled={selectedIndex >= palette.length - 1}
              onClick={() => reorderPalette(selectedIndex, selectedIndex + 1)}
            ><ArrowRight size={13} /></button>
          </div>
          <div className="palette-studio__actions">
            <button onClick={addCurrentColor} disabled={palette.includes(activeColor) || palette.length >= MAX_PALETTE_COLORS}>
              <Plus size={13} /> ADD
            </button>
            <button onClick={updateSelectedColor} disabled={!canUpdateSelected}>
              <Droplets size={13} /> UPDATE
            </button>
            <button onClick={removeSelectedColor} disabled={palette.length <= 1}>
              <Minus size={13} /> REMOVE
            </button>
          </div>
          <p>Swatch edits leave artwork untouched. Drag colors to reorder them.</p>
          <div className="palette-studio__commands">
            <button onClick={extractUsedColors} disabled={extractedPalette.length === 0}>
              <Palette size={13} /> EXTRACT USED
            </button>
            <button onClick={() => onOpenReplace(selectedColor)}>
              <Replace size={13} /> REPLACE PIXELS
            </button>
          </div>
        </div>
      ) : null}

      <div className="color-editor">
        <button
          className="color-field"
          aria-label="Saturation and brightness"
          style={{ backgroundColor: hsvToHex({ hue: hsv.hue, saturation: 100, value: 100 }) }}
          onPointerDown={(event) => {
            saturationDraggingRef.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            updateSaturationValue(event, false);
          }}
          onPointerMove={(event) => {
            if (saturationDraggingRef.current) updateSaturationValue(event, false);
          }}
          onPointerUp={(event) => {
            if (!saturationDraggingRef.current) return;
            saturationDraggingRef.current = false;
            updateSaturationValue(event, true);
          }}
        >
          <span
            className="color-field__cursor"
            style={{ left: `${hsv.saturation}%`, top: `${100 - hsv.value}%` }}
          />
        </button>
        <button
          className="hue-strip"
          aria-label="Hue strip"
          onPointerDown={(event) => {
            hueDraggingRef.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            updateHue(event, false);
          }}
          onPointerMove={(event) => {
            if (hueDraggingRef.current) updateHue(event, false);
          }}
          onPointerUp={(event) => {
            if (!hueDraggingRef.current) return;
            hueDraggingRef.current = false;
            updateHue(event, true);
          }}
        >
          <span className="hue-strip__cursor" style={{ top: `${(hsv.hue / 359) * 100}%` }} />
        </button>

        <div className="color-values">
          <label><span>H</span><input type="number" min="0" max="359" value={hsv.hue} aria-label="Hue" onChange={(event) => onColorCommit(hsvToHex({ ...hsv, hue: clampChannel(Number(event.target.value), 359) }))} /></label>
          <label><span>S</span><input type="number" min="0" max="100" value={hsv.saturation} aria-label="Saturation" onChange={(event) => onColorCommit(hsvToHex({ ...hsv, saturation: clampChannel(Number(event.target.value), 100) }))} /></label>
          <label><span>V</span><input type="number" min="0" max="100" value={hsv.value} aria-label="Value" onChange={(event) => onColorCommit(hsvToHex({ ...hsv, value: clampChannel(Number(event.target.value), 100) }))} /></label>
          <label><span>R</span><input type="number" min="0" max="255" value={rgb.red} aria-label="Red" onChange={(event) => onColorCommit(rgbToHex({ ...rgb, red: clampChannel(Number(event.target.value), 255) }))} /></label>
          <label><span>G</span><input type="number" min="0" max="255" value={rgb.green} aria-label="Green" onChange={(event) => onColorCommit(rgbToHex({ ...rgb, green: clampChannel(Number(event.target.value), 255) }))} /></label>
          <label><span>B</span><input type="number" min="0" max="255" value={rgb.blue} aria-label="Blue" onChange={(event) => onColorCommit(rgbToHex({ ...rgb, blue: clampChannel(Number(event.target.value), 255) }))} /></label>
        </div>
      </div>

      <div className="color-footer">
        <div className="color-pair" aria-label="Foreground and background colors">
          <label className="color-pair__background" style={{ backgroundColor }}>
            <span className="sr-only">Choose background color</span>
            <input type="color" value={backgroundColor} onChange={(event) => onBackgroundChange(event.target.value)} />
          </label>
          <label className="color-pair__foreground" style={{ backgroundColor: activeColor }}>
            <span className="sr-only">Choose foreground color</span>
            <input type="color" value={activeColor} onChange={(event) => onColorCommit(event.target.value)} />
          </label>
        </div>
        <button className="icon-button" aria-label="Swap foreground and background colors" onClick={onSwapColors}>
          <RefreshCw size={14} />
        </button>
        <div className="hex-field">
          <span>#</span>
          <input
            value={hexDraft}
            maxLength={6}
            aria-label="Hex color"
            spellCheck={false}
            onChange={(event) => {
              const value = event.target.value.toUpperCase();
              setHexDraft(value);
              const normalized = normalizeHexColor(value);
              if (normalized) onColorChange(normalized);
            }}
            onBlur={commitHexDraft}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitHexDraft();
                event.currentTarget.blur();
              }
            }}
          />
          <button aria-label="Copy color value" onClick={() => navigator.clipboard?.writeText(activeColor)}>
            <Copy size={14} />
          </button>
        </div>
        <button className="icon-button" aria-label="Pick color from canvas" onClick={onPickColor}>
          <Pipette size={15} />
        </button>
        <button
          className="icon-button screen-picker-icon"
          aria-label="Pick color from screen"
          aria-keyshortcuts="Shift+I"
          title="Pick color from screen (Shift+I)"
          disabled={screenPickerBusy}
          onClick={onPickScreenColor}
        >
          <MonitorUp size={15} />
        </button>
      </div>
    </section>
  );
}
