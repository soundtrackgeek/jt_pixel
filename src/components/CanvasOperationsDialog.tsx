import {
  AlertTriangle,
  Anchor,
  Expand,
  Link2,
  Link2Off,
  Maximize2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { composeFramePixels } from "../editor/export";
import {
  countDocumentClippedPixels,
  transformProjectDimensions,
  type CanvasAnchor,
  type CanvasOperation,
} from "../editor/importOperations";
import {
  MAX_CANVAS_DIMENSION,
  MIN_CANVAS_DIMENSION,
  isValidCanvasDimension,
  type ProjectDocument,
} from "../editor/project";

interface CanvasOperationsDialogProps {
  activeFrameId: string;
  backgroundColor: string;
  document: ProjectDocument;
  onApply: (document: ProjectDocument) => void;
  onClose: () => void;
}

const ANCHORS: CanvasAnchor[] = [
  "top-left", "top", "top-right",
  "left", "center", "right",
  "bottom-left", "bottom", "bottom-right",
];

function drawPreview(canvas: HTMLCanvasElement | null, width: number, height: number, pixels: Uint8ClampedArray) {
  if (!canvas) return;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return;
  const imageData = context.createImageData(width, height);
  imageData.data.set(pixels);
  context.putImageData(imageData, 0, 0);
}

export function CanvasOperationsDialog({
  activeFrameId,
  backgroundColor,
  document,
  onApply,
  onClose,
}: CanvasOperationsDialogProps) {
  const [operation, setOperation] = useState<CanvasOperation>("resize");
  const [width, setWidth] = useState(document.width);
  const [height, setHeight] = useState(document.height);
  const [anchor, setAnchor] = useState<CanvasAnchor>("center");
  const [fillMode, setFillMode] = useState<"transparent" | "background">("transparent");
  const [lockAspect, setLockAspect] = useState(true);
  const beforeRef = useRef<HTMLCanvasElement>(null);
  const afterRef = useRef<HTMLCanvasElement>(null);
  const dimensionsValid = isValidCanvasDimension(width) && isValidCanvasDimension(height);
  const nextDocument = useMemo(() => {
    if (!dimensionsValid) return null;
    return transformProjectDimensions(
      document,
      width,
      height,
      operation,
      anchor,
      operation === "resize" && fillMode === "background" ? backgroundColor : undefined,
    );
  }, [anchor, backgroundColor, dimensionsValid, document, fillMode, height, operation, width]);
  const clippedPixels = useMemo(() => (
    operation === "resize" && dimensionsValid
      ? countDocumentClippedPixels(document, width, height, anchor)
      : 0
  ), [anchor, dimensionsValid, document, height, operation, width]);
  const isUnchanged = width === document.width && height === document.height;

  useEffect(() => {
    drawPreview(
      beforeRef.current,
      document.width,
      document.height,
      composeFramePixels(document, activeFrameId, "transparent", "#000000"),
    );
    if (nextDocument) {
      drawPreview(
        afterRef.current,
        nextDocument.width,
        nextDocument.height,
        composeFramePixels(nextDocument, activeFrameId, "transparent", "#000000"),
      );
    }
  }, [activeFrameId, document, nextDocument]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  function updateWidth(value: number) {
    const next = Math.max(MIN_CANVAS_DIMENSION, Math.min(MAX_CANVAS_DIMENSION, value));
    setWidth(next);
    if (operation === "scale" && lockAspect) {
      setHeight(Math.max(1, Math.min(512, Math.round(next * document.height / document.width))));
    }
  }

  function updateHeight(value: number) {
    const next = Math.max(MIN_CANVAS_DIMENSION, Math.min(MAX_CANVAS_DIMENSION, value));
    setHeight(next);
    if (operation === "scale" && lockAspect) {
      setWidth(Math.max(1, Math.min(512, Math.round(next * document.width / document.height))));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (nextDocument && !isUnchanged) onApply(nextDocument);
  }

  return (
    <div className="recovery-backdrop canvas-ops-backdrop" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <section
        className="recovery-dialog canvas-ops-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="canvas-ops-title"
        aria-describedby="canvas-ops-description"
        data-testid="canvas-operations-dialog"
      >
        <div className="recovery-dialog__scanline" aria-hidden="true" />
        <form onSubmit={handleSubmit}>
          <header className="recovery-dialog__header canvas-ops__header">
            <span className="recovery-dialog__mark canvas-ops__mark"><Expand size={22} /></span>
            <span>
              <small>CANVAS / OPERATIONS</small>
              <h2 id="canvas-ops-title">Reframe the artwork.</h2>
            </span>
            <button type="button" className="dialog-close-button" aria-label="Close Canvas Operations" onClick={onClose}><X size={16} /></button>
          </header>
          <div className="canvas-ops__body">
            <p id="canvas-ops-description" className="canvas-ops__intro">
              Resize the canvas around existing pixels or scale every frame with crisp nearest-neighbor sampling.
            </p>
            <div className="canvas-ops__operation" role="group" aria-label="Canvas operation">
              <button type="button" className={operation === "resize" ? "is-active" : ""} onClick={() => setOperation("resize")}>
                <Maximize2 size={15} /> RESIZE CANVAS
              </button>
              <button type="button" className={operation === "scale" ? "is-active" : ""} onClick={() => setOperation("scale")}>
                <Expand size={15} /> SCALE ARTWORK
              </button>
            </div>

            <div className="canvas-ops__previews">
              <div className="canvas-ops__preview">
                <span>BEFORE · {document.width} × {document.height}</span>
                <div><canvas ref={beforeRef} aria-label="Current canvas preview" /></div>
              </div>
              <span className="canvas-ops__arrow">→</span>
              <div className="canvas-ops__preview is-after">
                <span>AFTER · {width} × {height}</span>
                <div><canvas ref={afterRef} aria-label="Transformed canvas preview" /></div>
              </div>
            </div>

            <div className="canvas-ops__controls">
              <fieldset className="canvas-ops__dimensions">
                <legend>DIMENSIONS</legend>
                <label><span>WIDTH</span><input type="number" min="1" max="512" value={width} onChange={(event) => updateWidth(Number(event.target.value))} /></label>
                <label><span>HEIGHT</span><input type="number" min="1" max="512" value={height} onChange={(event) => updateHeight(Number(event.target.value))} /></label>
                {operation === "scale" && (
                  <button type="button" className={lockAspect ? "is-active" : ""} onClick={() => setLockAspect((current) => !current)}>
                    {lockAspect ? <Link2 size={13} /> : <Link2Off size={13} />}
                    {lockAspect ? "ASPECT LOCKED" : "FREE ASPECT"}
                  </button>
                )}
              </fieldset>

              <fieldset className={`canvas-ops__anchors ${operation === "scale" ? "is-disabled" : ""}`}>
                <legend>ANCHOR</legend>
                <div>
                  {ANCHORS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      aria-label={`Anchor ${id}`}
                      aria-pressed={anchor === id}
                      className={anchor === id ? "is-active" : ""}
                      disabled={operation === "scale"}
                      onClick={() => setAnchor(id)}
                    ><span /></button>
                  ))}
                </div>
                <span><Anchor size={12} /> {anchor.replace("-", " ").toUpperCase()}</span>
              </fieldset>

              <fieldset className={`canvas-ops__fill ${operation === "scale" ? "is-disabled" : ""}`}>
                <legend>EXPANDED AREA</legend>
                <button type="button" className={fillMode === "transparent" ? "is-active" : ""} disabled={operation === "scale"} onClick={() => setFillMode("transparent")}>
                  <span className="canvas-ops__checker" /> TRANSPARENT
                </button>
                <button type="button" className={fillMode === "background" ? "is-active" : ""} disabled={operation === "scale"} onClick={() => setFillMode("background")}>
                  <span className="canvas-ops__color" style={{ background: backgroundColor }} /> BACKGROUND
                </button>
              </fieldset>

              <aside className={`canvas-ops__notice ${clippedPixels > 0 ? "is-warning" : ""}`}>
                {clippedPixels > 0 ? <AlertTriangle size={17} /> : <Maximize2 size={17} />}
                <span>
                  <strong>{clippedPixels > 0 ? `${clippedPixels} PIXELS WILL BE CLIPPED` : operation === "scale" ? "NEAREST NEIGHBOR" : "NON-DESTRUCTIVE EXPANSION"}</strong>
                  <small>{clippedPixels > 0
                    ? "Shrinking removes artwork beyond the new boundary. Undo restores it."
                    : operation === "scale"
                      ? "No blur or color interpolation is introduced."
                      : "Added space can stay transparent or use the background color."}</small>
                </span>
              </aside>
            </div>
          </div>
          <footer className="recovery-dialog__footer canvas-ops__footer">
            <span>Every frame and pixel layer is transformed in one Undo step</span>
            <div>
              <button type="button" className="recovery-discard-button" onClick={onClose}>CANCEL</button>
              <button type="submit" className="canvas-ops__apply" disabled={!dimensionsValid || isUnchanged}>
                {operation === "scale" ? "SCALE ARTWORK" : "APPLY RESIZE"}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
