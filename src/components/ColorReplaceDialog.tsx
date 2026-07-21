import {
  ArrowRight,
  Layers3,
  PaintBucket,
  Replace,
  ShieldCheck,
  SwatchBook,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  analyzeColorReplacement,
  normalizeHexColor,
  type ColorReplacementScope,
} from "../editor/colorOperations";
import type { ProjectDocument } from "../editor/project";
import type { PixelSelection } from "../types";

interface ColorReplaceDialogProps {
  activeFrameId: string;
  activeLayerId: string;
  document: ProjectDocument;
  initialTargetColor: string;
  selection: PixelSelection | null;
  sourceColor: string;
  onClose: () => void;
  onReplace: (options: {
    bounds?: PixelSelection;
    scope: ColorReplacementScope;
    sourceColor: string;
    targetColor: string;
    updatePaletteIndex?: number;
  }) => void;
}

const SCOPE_OPTIONS: Array<{
  icon: typeof PaintBucket;
  label: string;
  scope: ColorReplacementScope;
  summary: string;
}> = [
  { scope: "selection", label: "Selection", summary: "Inside the active marquee", icon: SwatchBook },
  { scope: "cel", label: "Current cel", summary: "This layer and frame", icon: PaintBucket },
  { scope: "layer", label: "Layer across frames", summary: "Every editable cel on this layer", icon: Layers3 },
  { scope: "project", label: "Entire project", summary: "All editable pixel layers and frames", icon: Replace },
];

export function ColorReplaceDialog({
  activeFrameId,
  activeLayerId,
  document,
  initialTargetColor,
  selection,
  sourceColor,
  onClose,
  onReplace,
}: ColorReplaceDialogProps) {
  const normalizedSource = normalizeHexColor(sourceColor) ?? document.palette[0];
  const fallbackTarget = document.palette.find((color) => color !== normalizedSource)
    ?? (normalizedSource === "#ffffff" ? "#000000" : "#ffffff");
  const normalizedInitialTarget = normalizeHexColor(initialTargetColor);
  const [targetDraft, setTargetDraft] = useState(
    (normalizedInitialTarget && normalizedInitialTarget !== normalizedSource
      ? normalizedInitialTarget
      : fallbackTarget).slice(1).toUpperCase(),
  );
  const [scope, setScope] = useState<ColorReplacementScope>(selection ? "selection" : "cel");
  const paletteIndex = document.palette.findIndex((color) => color === normalizedSource);
  const [updatePalette, setUpdatePalette] = useState(paletteIndex >= 0);
  const targetInputRef = useRef<HTMLInputElement>(null);
  const targetColor = normalizeHexColor(targetDraft);
  const analysis = useMemo(() => analyzeColorReplacement(
    document,
    normalizedSource,
    scope,
    {
      activeFrameId,
      activeLayerId,
      bounds: selection ?? undefined,
    },
  ), [activeFrameId, activeLayerId, document, normalizedSource, scope, selection]);
  const paletteWillChange = updatePalette
    && paletteIndex >= 0
    && targetColor !== null
    && targetColor !== normalizedSource;
  const canApply = targetColor !== null
    && targetColor !== normalizedSource
    && (analysis.affectedPixels > 0 || paletteWillChange);

  useEffect(() => {
    targetInputRef.current?.select();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canApply || !targetColor) return;
    onReplace({
      sourceColor: normalizedSource,
      targetColor,
      scope,
      ...(scope === "selection" && selection ? { bounds: selection } : {}),
      ...(paletteWillChange ? { updatePaletteIndex: paletteIndex } : {}),
    });
  }

  return (
    <div className="recovery-backdrop color-replace-backdrop">
      <section
        className="recovery-dialog color-replace-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="color-replace-title"
        aria-describedby="color-replace-description"
      >
        <div className="recovery-dialog__scanline" aria-hidden="true" />
        <form onSubmit={submit}>
          <header className="recovery-dialog__header color-replace-dialog__header">
            <span className="recovery-dialog__mark color-replace-dialog__mark"><Replace size={22} /></span>
            <span>
              <small>PALETTE STUDIO / REPLACE</small>
              <h2 id="color-replace-title">Recolor with precision.</h2>
            </span>
          </header>

          <div className="color-replace-dialog__body">
            <p id="color-replace-description">
              Choose a target color and exactly how far the replacement should travel.
              Locked artwork is always protected.
            </p>

            <div className="color-replace-pair">
              <div>
                <span>SOURCE</span>
                <i style={{ backgroundColor: normalizedSource }} />
                <strong>{normalizedSource.toUpperCase()}</strong>
              </div>
              <ArrowRight size={18} />
              <label>
                <span>TARGET</span>
                <i style={{ backgroundColor: targetColor ?? "transparent" }} />
                <span className="color-replace-hex"><b>#</b><input ref={targetInputRef} value={targetDraft} maxLength={6} spellCheck={false} aria-label="Replacement target color" aria-invalid={targetColor === null} onChange={(event) => setTargetDraft(event.target.value.toUpperCase())} /></span>
              </label>
            </div>

            <div className="color-replace-palette" aria-label="Choose replacement color from palette">
              {document.palette.map((color, index) => (
                <button
                  key={`${color}-${index}`}
                  type="button"
                  className={targetColor === color ? "is-active" : ""}
                  style={{ backgroundColor: color }}
                  aria-label={`Replace with ${color}`}
                  aria-pressed={targetColor === color}
                  onClick={() => setTargetDraft(color.slice(1).toUpperCase())}
                />
              ))}
            </div>

            <fieldset className="color-replace-scopes">
              <legend>REPLACEMENT SCOPE</legend>
              {SCOPE_OPTIONS.map(({ icon: Icon, label, scope: option, summary }) => {
                const disabled = option === "selection" && !selection;
                return (
                  <label key={option} className={scope === option ? "is-active" : ""}>
                    <input type="radio" name="replace-scope" value={option} checked={scope === option} disabled={disabled} onChange={() => setScope(option)} />
                    <Icon size={15} />
                    <span><strong>{label}</strong><small>{disabled ? "Create a marquee first" : summary}</small></span>
                    <i aria-hidden="true" />
                  </label>
                );
              })}
            </fieldset>

            {paletteIndex >= 0 ? (
              <label className="color-replace-palette-option">
                <input type="checkbox" checked={updatePalette} onChange={(event) => setUpdatePalette(event.target.checked)} />
                <span className="switch" aria-hidden="true" />
                <span><strong>Update source swatch</strong><small>Keep the project palette aligned with the recolored pixels.</small></span>
              </label>
            ) : null}

            <div className="color-replace-impact" aria-live="polite">
              <span className="color-replace-impact__ready"><Replace size={14} /><strong>{analysis.affectedPixels.toLocaleString()}</strong> pixels ready across {analysis.affectedCels.toLocaleString()} {analysis.affectedCels === 1 ? "cel" : "cels"}</span>
              {analysis.lockedPixels > 0 ? <span><ShieldCheck size={14} /><strong>{analysis.lockedPixels.toLocaleString()}</strong> protected pixels skipped</span> : null}
            </div>
          </div>

          <footer className="recovery-dialog__footer color-replace-dialog__footer">
            <span>One replacement · one Undo step</span>
            <div>
              <button type="button" className="recovery-discard-button" onClick={onClose}>CANCEL</button>
              <button type="submit" className="color-replace-apply" disabled={!canApply}>
                <Replace size={14} /> REPLACE COLOR
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
