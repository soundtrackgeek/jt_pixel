import { Grid3X3, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  canvasBackgroundOptions,
  gridStyleOptions,
  type CanvasBackground,
  type CanvasViewPreferences,
  type GridStyle,
} from "../editor/canvasView";

interface CanvasViewMenuProps {
  preferences: CanvasViewPreferences;
  onBackgroundChange: (background: CanvasBackground) => void;
  onGridStyleChange: (gridStyle: GridStyle) => void;
  onReset: () => void;
}

export function CanvasViewMenu({
  preferences,
  onBackgroundChange,
  onGridStyleChange,
  onReset,
}: CanvasViewMenuProps) {
  const [open, setOpen] = useState(false);
  const controlRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: globalThis.PointerEvent) {
      if (
        event.target instanceof Node
        && !controlRef.current?.contains(event.target)
      ) setOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={controlRef} className="canvas-view-control">
      <button
        ref={triggerRef}
        className={`icon-button canvas-view-trigger ${open ? "is-active" : ""}`}
        aria-label="Canvas view settings"
        aria-expanded={open}
        aria-controls="canvas-view-menu"
        title="Canvas view settings"
        onClick={() => setOpen((current) => !current)}
      >
        <Grid3X3 size={15} />
        {preferences.gridStyle === "off" && (
          <span className="canvas-view-trigger__off" aria-hidden="true" />
        )}
      </button>

      {open && (
        <section
          id="canvas-view-menu"
          className="canvas-view-menu"
          role="dialog"
          aria-label="Canvas view settings"
          data-testid="canvas-view-menu"
        >
          <header className="canvas-view-menu__header">
            <span className="canvas-view-menu__mark">
              <SlidersHorizontal size={14} />
            </span>
            <span>
              <small>CANVAS / VIEW</small>
              <strong>Pixel clarity</strong>
            </span>
          </header>

          <fieldset className="canvas-view-menu__section">
            <legend>BACKGROUND</legend>
            <div className="canvas-background-options">
              {canvasBackgroundOptions.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={preferences.background === id ? "is-active" : ""}
                  aria-pressed={preferences.background === id}
                  onClick={() => onBackgroundChange(id)}
                >
                  <span
                    className={`canvas-background-swatch canvas-background-swatch--${id}`}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="canvas-view-menu__section">
            <legend>PIXEL GRID</legend>
            <div className="canvas-grid-options">
              {gridStyleOptions.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={preferences.gridStyle === id ? "is-active" : ""}
                  aria-pressed={preferences.gridStyle === id}
                  onClick={() => onGridStyleChange(id)}
                >
                  <span
                    className={`canvas-grid-preview canvas-grid-preview--${id}`}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <footer className="canvas-view-menu__footer">
            <span><kbd>G</kbd> TOGGLE GRID</span>
            <button type="button" onClick={onReset}>
              <RotateCcw size={12} />
              RESET
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}
