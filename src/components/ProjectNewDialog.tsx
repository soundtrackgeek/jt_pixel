import {
  FilePlus2,
  Gamepad2,
  Grid2X2,
  Layers3,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CANVAS_PRESETS,
  MAX_CANVAS_DIMENSION,
  MIN_CANVAS_DIMENSION,
  getNewProjectNameError,
  isValidCanvasDimension,
  type NewProjectOptions,
} from "../editor/project";

interface ProjectNewDialogProps {
  hasUnsavedChanges: boolean;
  isBusy: boolean;
  projectName: string;
  onClose: () => void;
  onCreate: (options: NewProjectOptions) => Promise<boolean>;
}

type ProjectTemplate = NewProjectOptions["template"];

function parseDimension(value: string) {
  if (!/^\d+$/.test(value)) return Number.NaN;
  return Number(value);
}

function dimensionError(value: number) {
  return isValidCanvasDimension(value)
    ? null
    : `Use a whole number from ${MIN_CANVAS_DIMENSION} to ${MAX_CANVAS_DIMENSION}.`;
}

function previewSize(width: number, height: number) {
  if (!isValidCanvasDimension(width) || !isValidCanvasDimension(height)) {
    return { width: 72, height: 72 };
  }
  const scale = Math.min(104 / width, 104 / height);
  return {
    width: Math.max(8, Math.round(width * scale)),
    height: Math.max(8, Math.round(height * scale)),
  };
}

export function ProjectNewDialog({
  hasUnsavedChanges,
  isBusy,
  projectName,
  onClose,
  onCreate,
}: ProjectNewDialogProps) {
  const [template, setTemplate] = useState<ProjectTemplate>("blank");
  const [name, setName] = useState("untitled-sprite");
  const [width, setWidth] = useState("64");
  const [height, setHeight] = useState("64");
  const [confirmationRequested, setConfirmationRequested] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const keepEditingButtonRef = useRef<HTMLButtonElement>(null);

  const numericWidth = template === "courier" ? 64 : parseDimension(width);
  const numericHeight = template === "courier" ? 64 : parseDimension(height);
  const nameError = getNewProjectNameError(name);
  const widthError = dimensionError(numericWidth);
  const heightError = dimensionError(numericHeight);
  const formValid = !nameError && !widthError && !heightError;
  const busy = isBusy || submitting;
  const canvasPreviewSize = previewSize(numericWidth, numericHeight);

  useEffect(() => {
    nameInputRef.current?.select();
  }, []);

  useEffect(() => {
    if (confirmationRequested) keepEditingButtonRef.current?.focus();
    else nameInputRef.current?.focus();
  }, [confirmationRequested]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        return;
      }
      if (event.key !== "Escape" || busy) return;
      event.preventDefault();
      if (confirmationRequested) setConfirmationRequested(false);
      else onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, confirmationRequested, onClose]);

  function optionsFromForm(): NewProjectOptions {
    return template === "courier"
      ? { template, name }
      : {
          template,
          name,
          width: numericWidth,
          height: numericHeight,
        };
  }

  async function createProject() {
    if (!formValid || busy) {
      setShowValidation(true);
      return;
    }

    setSubmitting(true);
    try {
      await onCreate(optionsFromForm());
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowValidation(true);
    if (!formValid || busy) return;
    if (hasUnsavedChanges) {
      setConfirmationRequested(true);
      return;
    }
    void createProject();
  }

  function selectPreset(size: number) {
    setWidth(String(size));
    setHeight(String(size));
  }

  if (confirmationRequested) {
    return (
      <div className="recovery-backdrop">
        <section
          className="recovery-dialog project-open-dialog new-project-confirmation"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="new-project-confirmation-title"
          aria-describedby="new-project-confirmation-description"
          data-testid="new-project-confirmation"
        >
          <div className="recovery-dialog__scanline" aria-hidden="true" />
          <header className="recovery-dialog__header">
            <span className="recovery-dialog__mark project-open-dialog__mark">
              <ShieldAlert size={22} />
            </span>
            <span>
              <small>PROJECT / NEW</small>
              <h2 id="new-project-confirmation-title">Replace unsaved work?</h2>
            </span>
          </header>

          <div className="recovery-dialog__body">
            <p id="new-project-confirmation-description">
              Creating this project will replace the local changes in your
              current workspace.
            </p>
            <div className="project-open-dialog__project">
              <span className="project-open-dialog__project-icon">
                <ShieldAlert size={18} />
              </span>
              <span className="project-open-dialog__project-name">
                <strong>{projectName}</strong>
                <small>LOCAL CHANGES NOT SAVED</small>
              </span>
              <span className="project-open-dialog__badge">UNSAVED</span>
            </div>
            <div className="recovery-dialog__note project-open-dialog__note">
              Your saved file stays untouched. Only this unsaved editing session
              will be replaced.
            </div>
          </div>

          <footer className="recovery-dialog__footer">
            <button
              ref={keepEditingButtonRef}
              className="recovery-discard-button project-open-dialog__cancel"
              disabled={busy}
              onClick={() => setConfirmationRequested(false)}
            >
              KEEP EDITING
            </button>
            <button
              className="project-open-dialog__confirm"
              disabled={busy}
              data-testid="confirm-new-project"
              onClick={() => void createProject()}
            >
              <FilePlus2 size={15} />
              {busy ? "PREPARING…" : "CREATE PROJECT"}
            </button>
          </footer>
        </section>
      </div>
    );
  }

  const pixelLayerCount = template === "courier" ? 3 : 1;
  const frameCount = template === "courier" ? 8 : 1;
  const visibleDimensionError = showValidation ? widthError ?? heightError : null;

  return (
    <div
      className="recovery-backdrop new-project-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !busy) onClose();
      }}
    >
      <section
        className="recovery-dialog new-project-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
        aria-describedby="new-project-description"
        data-testid="new-project-dialog"
      >
        <div className="recovery-dialog__scanline" aria-hidden="true" />
        <form noValidate onSubmit={handleSubmit}>
          <header className="recovery-dialog__header new-project-dialog__header">
            <span className="recovery-dialog__mark new-project-dialog__mark">
              <Sparkles size={22} />
            </span>
            <span>
              <small>PROJECT / NEW</small>
              <h2 id="new-project-title">Start something small.</h2>
            </span>
          </header>

          <div className="new-project-dialog__body">
            <p id="new-project-description" className="new-project-dialog__intro">
              Choose a clean canvas or begin with the Courier Practice setup.
              You can add frames and layers whenever the idea starts moving.
            </p>

            <fieldset className="new-project-section new-project-templates">
              <legend>TEMPLATE</legend>
              <button
                type="button"
                className={`new-project-template ${template === "blank" ? "is-active" : ""}`}
                aria-pressed={template === "blank"}
                onClick={() => setTemplate("blank")}
              >
                <span className="new-project-template__icon"><Grid2X2 size={18} /></span>
                <span>
                  <strong>Blank canvas</strong>
                  <small>One frame · one editable layer</small>
                </span>
                <span className="new-project-template__tag">FLEXIBLE</span>
              </button>
              <button
                type="button"
                className={`new-project-template ${template === "courier" ? "is-active" : ""}`}
                aria-pressed={template === "courier"}
                onClick={() => setTemplate("courier")}
              >
                <span className="new-project-template__icon new-project-template__icon--courier"><Gamepad2 size={18} /></span>
                <span>
                  <strong>Courier Practice</strong>
                  <small>Eight frames · layered reference</small>
                </span>
                <span className="new-project-template__tag">64 × 64</span>
              </button>
            </fieldset>

            <div className="new-project-dialog__grid">
              <div className="new-project-dialog__settings">
                <fieldset className="new-project-section">
                  <legend>PROJECT NAME</legend>
                  <input
                    ref={nameInputRef}
                    id="new-project-name"
                    className={showValidation && nameError ? "is-invalid" : ""}
                    value={name}
                    maxLength={255}
                    autoComplete="off"
                    spellCheck={false}
                    aria-label="Project name"
                    aria-invalid={showValidation && nameError ? true : undefined}
                    aria-describedby="new-project-name-hint"
                    onChange={(event) => setName(event.target.value)}
                  />
                  <small id="new-project-name-hint" className="new-project-field-hint">
                    {showValidation && nameError ? nameError : ".jtp is added automatically"}
                  </small>
                </fieldset>

                <fieldset className="new-project-section">
                  <legend>CANVAS SIZE</legend>
                  <div className="new-project-dimensions">
                    <label>
                      <span>WIDTH</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={MIN_CANVAS_DIMENSION}
                        max={MAX_CANVAS_DIMENSION}
                        value={template === "courier" ? "64" : width}
                        disabled={template === "courier"}
                        aria-invalid={showValidation && widthError ? true : undefined}
                        onChange={(event) => setWidth(event.target.value)}
                      />
                    </label>
                    <span className="new-project-dimensions__cross">×</span>
                    <label>
                      <span>HEIGHT</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={MIN_CANVAS_DIMENSION}
                        max={MAX_CANVAS_DIMENSION}
                        value={template === "courier" ? "64" : height}
                        disabled={template === "courier"}
                        aria-invalid={showValidation && heightError ? true : undefined}
                        onChange={(event) => setHeight(event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="new-project-presets" aria-label="Canvas size presets">
                    {CANVAS_PRESETS.map((size) => (
                      <button
                        key={size}
                        type="button"
                        className={numericWidth === size && numericHeight === size ? "is-active" : ""}
                        disabled={template === "courier"}
                        onClick={() => selectPreset(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  <small className={`new-project-field-hint ${visibleDimensionError ? "is-error" : ""}`}>
                    {visibleDimensionError ?? (template === "courier"
                      ? "Courier Practice uses a fixed 64 × 64 stage."
                      : `Whole pixels up to ${MAX_CANVAS_DIMENSION} × ${MAX_CANVAS_DIMENSION}.`)}
                  </small>
                </fieldset>
              </div>

              <aside className="new-project-blueprint" aria-label="New project summary">
                <span className="new-project-blueprint__label">CANVAS BLUEPRINT</span>
                <div className="new-project-blueprint__preview">
                  <span
                    className="new-project-blueprint__canvas"
                    style={canvasPreviewSize}
                    aria-hidden="true"
                  />
                </div>
                <strong>{numericWidth || "—"} × {numericHeight || "—"} PX</strong>
                <div className="new-project-blueprint__stats">
                  <span><Layers3 size={13} /> {pixelLayerCount} {pixelLayerCount === 1 ? "LAYER" : "LAYERS"}</span>
                  <span><Grid2X2 size={13} /> {frameCount} {frameCount === 1 ? "FRAME" : "FRAMES"}</span>
                </div>
              </aside>
            </div>
          </div>

          <footer className="recovery-dialog__footer new-project-dialog__footer">
            <span>Transparent canvas · Arcade Bloom palette</span>
            <div>
              <button
                type="button"
                className="recovery-discard-button new-project-cancel"
                disabled={busy}
                onClick={onClose}
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="new-project-create"
                disabled={busy || (showValidation && !formValid)}
                data-testid="create-new-project"
              >
                <FilePlus2 size={15} />
                {busy ? "PREPARING…" : "CREATE PROJECT"}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
