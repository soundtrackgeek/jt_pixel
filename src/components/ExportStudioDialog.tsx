import {
  Braces,
  Columns3,
  Download,
  FileImage,
  Film,
  Grid2X2,
  Layers3,
  PackageCheck,
  Play,
  Repeat2,
  RotateCcw,
  Rows3,
  ShieldCheck,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  EXPORT_SCALE_PRESETS,
  MAX_EXPORT_SCALE,
  MAX_EXPORT_SPACING,
  calculateExportLayout,
  exportFileName,
  getExportValidationError,
  renderAnimationExport,
  renderProjectExport,
  type ExportPreferences,
  type ExportRequest,
  type SpriteSheetLayout,
} from "../editor/export";
import {
  canvasToPngBlob,
  drawPixelBuffer,
  drawRenderedExport,
} from "../editor/exportCanvas";
import type { ProjectDocument } from "../editor/project";

interface ExportStudioDialogProps {
  activeFrameId: string;
  document: ProjectDocument;
  error: string | null;
  isBusy: boolean;
  preferences: ExportPreferences;
  onClose: () => void;
  onExport: (request: ExportRequest) => Promise<boolean>;
  onPreferencesChange: (preferences: ExportPreferences) => void;
  onResetPreferences: () => void;
}

const layoutOptions: Array<{
  id: SpriteSheetLayout;
  label: string;
  icon: typeof Rows3;
}> = [
  { id: "horizontal", label: "Row", icon: Rows3 },
  { id: "vertical", label: "Column", icon: Columns3 },
  { id: "grid", label: "Grid", icon: Grid2X2 },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function boundedInteger(value: string, minimum: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return minimum;
  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
}

export function ExportStudioDialog({
  activeFrameId,
  document,
  error,
  isBusy,
  preferences,
  onClose,
  onExport,
  onPreferencesChange,
  onResetPreferences,
}: ExportStudioDialogProps) {
  const activeFrameIndex = Math.max(
    0,
    document.frames.findIndex((frame) => frame.id === activeFrameId),
  );
  const [firstFrameIndex, setFirstFrameIndex] = useState(0);
  const [lastFrameIndex, setLastFrameIndex] = useState(document.frames.length - 1);
  const [estimatedPngBytes, setEstimatedPngBytes] = useState<number | null>();
  const [previewFrameIndex, setPreviewFrameIndex] = useState(0);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const selectedFormatButtonRef = useRef<HTMLButtonElement>(null);

  const request = useMemo<ExportRequest>(() => ({
    ...preferences,
    activeFrameId,
    firstFrameIndex,
    lastFrameIndex,
  }), [activeFrameId, firstFrameIndex, lastFrameIndex, preferences]);
  const layout = useMemo(
    () => calculateExportLayout(document, request),
    [document, request],
  );
  const isAnimatedGif = preferences.kind === "animated-gif";
  const validationError = getExportValidationError(layout, preferences.kind);
  const rendered = useMemo(
    () => validationError || isAnimatedGif ? null : renderProjectExport(document, request),
    [document, isAnimatedGif, request, validationError],
  );
  const renderedAnimation = useMemo(
    () => validationError || !isAnimatedGif
      ? null
      : renderAnimationExport(document, request),
    [document, isAnimatedGif, request, validationError],
  );
  const fileName = exportFileName(document, request);
  const selectedFrameCount = layout.frames.length;
  const animationFrameCount = renderedAnimation?.frames.length ?? 0;
  const animationDelayMs = renderedAnimation?.frames[0]?.durationMs ?? 100;
  const previewAnimationFrame = renderedAnimation?.frames[
    animationFrameCount === 0 ? 0 : previewFrameIndex % animationFrameCount
  ];

  useEffect(() => {
    selectedFormatButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "e") {
        event.preventDefault();
        return;
      }
      if (event.key !== "Escape" || isBusy) return;
      event.preventDefault();
      onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBusy, onClose]);

  useEffect(() => {
    setPreviewFrameIndex(0);
  }, [firstFrameIndex, lastFrameIndex, preferences.gifPlayback, preferences.kind]);

  useEffect(() => {
    if (!isAnimatedGif || animationFrameCount <= 1) return;
    if (
      preferences.gifPlayback === "once"
      && previewFrameIndex >= animationFrameCount - 1
    ) return;
    const timer = window.setTimeout(() => {
      setPreviewFrameIndex((current) => preferences.gifPlayback === "loop"
        ? (current + 1) % animationFrameCount
        : Math.min(current + 1, animationFrameCount - 1));
    }, animationDelayMs);
    return () => window.clearTimeout(timer);
  }, [
    animationDelayMs,
    animationFrameCount,
    isAnimatedGif,
    preferences.gifPlayback,
    previewFrameIndex,
  ]);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    if (isAnimatedGif) {
      setEstimatedPngBytes(undefined);
      if (previewAnimationFrame && renderedAnimation) {
        drawPixelBuffer(
          canvas,
          renderedAnimation.width,
          renderedAnimation.height,
          previewAnimationFrame.pixels,
        );
      }
      return;
    }

    if (!rendered) {
      setEstimatedPngBytes(undefined);
      return;
    }

    drawRenderedExport(canvas, rendered);
    if (rendered.width * rendered.height > 4_194_304) {
      setEstimatedPngBytes(undefined);
      return;
    }

    let cancelled = false;
    setEstimatedPngBytes(null);
    const timer = window.setTimeout(() => {
      void canvasToPngBlob(canvas).then((blob) => {
        if (!cancelled) setEstimatedPngBytes(blob.size);
      }).catch(() => {
        if (!cancelled) setEstimatedPngBytes(undefined);
      });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isAnimatedGif, previewAnimationFrame, rendered, renderedAnimation]);

  function updatePreference<Key extends keyof ExportPreferences>(
    key: Key,
    value: ExportPreferences[Key],
  ) {
    onPreferencesChange({ ...preferences, [key]: value });
  }

  function selectFirstFrame(index: number) {
    setFirstFrameIndex(index);
    if (index > lastFrameIndex) setLastFrameIndex(index);
  }

  function selectLastFrame(index: number) {
    setLastFrameIndex(index);
    if (index < firstFrameIndex) setFirstFrameIndex(index);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (validationError || isBusy) return;
    void onExport(request);
  }

  const scaleIsPreset = EXPORT_SCALE_PRESETS.some((scale) => scale === preferences.scale);
  const pngEstimate = estimatedPngBytes === null
    ? "ESTIMATING…"
    : estimatedPngBytes === undefined
      ? "CALCULATED ON EXPORT"
      : formatBytes(estimatedPngBytes).toUpperCase();

  return (
    <div
      className="recovery-backdrop export-studio-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !isBusy) onClose();
      }}
    >
      <section
        className="recovery-dialog export-studio-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-studio-title"
        aria-describedby="export-studio-description"
        aria-busy={isBusy}
        data-testid="export-studio-dialog"
      >
        <div className="recovery-dialog__scanline" aria-hidden="true" />
        <form onSubmit={handleSubmit}>
          <header className="recovery-dialog__header export-studio__header">
            <span className="recovery-dialog__mark export-studio__mark">
              <PackageCheck size={22} />
            </span>
            <span>
              <small>EXPORT / STUDIO</small>
              <h2 id="export-studio-title">Ship clean pixels.</h2>
            </span>
            <button
              type="button"
              className="export-studio__reset"
              disabled={isBusy}
              onClick={onResetPreferences}
            >
              <RotateCcw size={12} />
              RESET
            </button>
          </header>

          <div className="export-studio__body">
            <p id="export-studio-description" className="export-studio__intro">
              Export lossless artwork from visible pixel layers. Workspace grids,
              onion skin, canvas backgrounds, and references stay in the studio.
            </p>

            <fieldset className="export-section export-format-options">
              <legend>OUTPUT</legend>
              <button
                ref={preferences.kind === "frame" ? selectedFormatButtonRef : undefined}
                data-testid="export-kind-frame"
                type="button"
                className={preferences.kind === "frame" ? "is-active" : ""}
                aria-pressed={preferences.kind === "frame"}
                onClick={() => updatePreference("kind", "frame")}
              >
                <FileImage size={17} />
                <span>
                  <strong>Current frame</strong>
                  <small>One clean PNG</small>
                </span>
              </button>
              <button
                ref={preferences.kind === "sprite-sheet" ? selectedFormatButtonRef : undefined}
                data-testid="export-kind-sprite-sheet"
                type="button"
                className={preferences.kind === "sprite-sheet" ? "is-active" : ""}
                aria-pressed={preferences.kind === "sprite-sheet"}
                onClick={() => updatePreference("kind", "sprite-sheet")}
              >
                <Grid2X2 size={17} />
                <span>
                  <strong>Sprite sheet</strong>
                  <small>Arrange an animation range</small>
                </span>
              </button>
              <button
                ref={isAnimatedGif ? selectedFormatButtonRef : undefined}
                data-testid="export-kind-animated-gif"
                type="button"
                className={isAnimatedGif ? "is-active" : ""}
                aria-pressed={isAnimatedGif}
                onClick={() => updatePreference("kind", "animated-gif")}
              >
                <Film size={17} />
                <span>
                  <strong>Animated GIF</strong>
                  <small>Playback-ready animation</small>
                </span>
              </button>
            </fieldset>

            <div className="export-studio__grid">
              <div className="export-studio__settings">
                {preferences.kind !== "frame" && (
                  <fieldset className="export-section">
                    <legend>FRAME RANGE</legend>
                    <div className="export-frame-range">
                      <label>
                        <span>FROM</span>
                        <select
                          value={firstFrameIndex}
                          onChange={(event) => selectFirstFrame(Number(event.target.value))}
                        >
                          {document.frames.map((frame, index) => (
                            <option key={frame.id} value={index}>{index + 1} · {frame.name}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>TO</span>
                        <select
                          value={lastFrameIndex}
                          onChange={(event) => selectLastFrame(Number(event.target.value))}
                        >
                          {document.frames.map((frame, index) => (
                            <option key={frame.id} value={index}>{index + 1} · {frame.name}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </fieldset>
                )}

                <fieldset className="export-section">
                  <legend>PIXEL SCALE</legend>
                  <div className="export-scale-options">
                    {EXPORT_SCALE_PRESETS.map((scale) => (
                      <button
                        key={scale}
                        type="button"
                        className={preferences.scale === scale ? "is-active" : ""}
                        aria-pressed={preferences.scale === scale}
                        onClick={() => updatePreference("scale", scale)}
                      >
                        {scale}×
                      </button>
                    ))}
                    <label className={!scaleIsPreset ? "is-active" : ""}>
                      <span>CUSTOM</span>
                      <input
                        type="number"
                        min="1"
                        max={MAX_EXPORT_SCALE}
                        value={preferences.scale}
                        aria-label="Custom export scale"
                        onChange={(event) => updatePreference(
                          "scale",
                          boundedInteger(event.target.value, 1, MAX_EXPORT_SCALE),
                        )}
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="export-section">
                  <legend>BACKGROUND</legend>
                  <div className="export-background-options">
                    <button
                      type="button"
                      className={preferences.backgroundMode === "transparent" ? "is-active" : ""}
                      aria-pressed={preferences.backgroundMode === "transparent"}
                      onClick={() => updatePreference("backgroundMode", "transparent")}
                    >
                      <span className="export-background-swatch export-background-swatch--transparent" />
                      TRANSPARENT
                    </button>
                    <button
                      type="button"
                      className={preferences.backgroundMode === "solid" ? "is-active" : ""}
                      aria-pressed={preferences.backgroundMode === "solid"}
                      onClick={() => updatePreference("backgroundMode", "solid")}
                    >
                      <span
                        className="export-background-swatch"
                        style={{ background: preferences.backgroundColor }}
                      />
                      SOLID
                    </button>
                    <label className="export-background-color">
                      <input
                        type="color"
                        value={preferences.backgroundColor}
                        aria-label="Solid export background color"
                        disabled={preferences.backgroundMode !== "solid"}
                        onChange={(event) => updatePreference("backgroundColor", event.target.value)}
                      />
                      <span>{preferences.backgroundColor.toUpperCase()}</span>
                    </label>
                  </div>
                </fieldset>

                {isAnimatedGif && (
                  <fieldset className="export-section">
                    <legend>PLAYBACK</legend>
                    <div className="export-playback-options">
                      <button
                        type="button"
                        data-testid="gif-playback-loop"
                        className={preferences.gifPlayback === "loop" ? "is-active" : ""}
                        aria-pressed={preferences.gifPlayback === "loop"}
                        onClick={() => updatePreference("gifPlayback", "loop")}
                      >
                        <Repeat2 size={15} />
                        <span>
                          <strong>Loop forever</strong>
                          <small>Repeat continuously</small>
                        </span>
                      </button>
                      <button
                        type="button"
                        data-testid="gif-playback-once"
                        className={preferences.gifPlayback === "once" ? "is-active" : ""}
                        aria-pressed={preferences.gifPlayback === "once"}
                        onClick={() => updatePreference("gifPlayback", "once")}
                      >
                        <Play size={15} />
                        <span>
                          <strong>Play once</strong>
                          <small>Stop on final frame</small>
                        </span>
                      </button>
                    </div>
                  </fieldset>
                )}

                {preferences.kind === "sprite-sheet" && (
                  <>
                    <fieldset className="export-section">
                      <legend>SHEET LAYOUT</legend>
                      <div className="export-layout-options">
                        {layoutOptions.map(({ id, label, icon: Icon }) => (
                          <button
                            key={id}
                            type="button"
                            className={preferences.layout === id ? "is-active" : ""}
                            aria-pressed={preferences.layout === id}
                            onClick={() => updatePreference("layout", id)}
                          >
                            <Icon size={15} />
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="export-sheet-metrics">
                        <label>
                          <span>COLUMNS</span>
                          <input
                            type="number"
                            min="1"
                            max={document.frames.length}
                            disabled={preferences.layout !== "grid"}
                            value={preferences.columns}
                            onChange={(event) => updatePreference(
                              "columns",
                              boundedInteger(event.target.value, 1, document.frames.length),
                            )}
                          />
                        </label>
                        <label>
                          <span>SPACING</span>
                          <input
                            type="number"
                            min="0"
                            max={MAX_EXPORT_SPACING}
                            value={preferences.spacing}
                            onChange={(event) => updatePreference(
                              "spacing",
                              boundedInteger(event.target.value, 0, MAX_EXPORT_SPACING),
                            )}
                          />
                        </label>
                        <label>
                          <span>PADDING</span>
                          <input
                            type="number"
                            min="0"
                            max={MAX_EXPORT_SPACING}
                            value={preferences.padding}
                            onChange={(event) => updatePreference(
                              "padding",
                              boundedInteger(event.target.value, 0, MAX_EXPORT_SPACING),
                            )}
                          />
                        </label>
                      </div>
                    </fieldset>

                    <label className="export-metadata-option">
                      <span className="export-metadata-option__icon"><Braces size={15} /></span>
                      <span>
                        <strong>JSON metadata</strong>
                        <small>Frame coordinates, size, timing, FPS, and loop state</small>
                      </span>
                      <input
                        type="checkbox"
                        checked={preferences.includeMetadata}
                        onChange={(event) => updatePreference(
                          "includeMetadata",
                          event.target.checked,
                        )}
                      />
                      <span className="switch" aria-hidden="true" />
                    </label>
                  </>
                )}
              </div>

              <aside className="export-preview" aria-label="Export preview">
                <div className="export-preview__header">
                  <span>OUTPUT PREVIEW</span>
                  <span>
                    {preferences.kind === "frame"
                      ? `FRAME ${activeFrameIndex + 1}`
                      : isAnimatedGif
                        ? `${preferences.gifPlayback === "loop" ? "LOOPING" : "PLAY ONCE"} · ${document.animation.fps} FPS`
                        : `${selectedFrameCount} FRAMES`}
                  </span>
                </div>
                <div
                  className={`export-preview__stage ${preferences.backgroundMode === "transparent" ? "is-transparent" : ""}`}
                >
                  {rendered || previewAnimationFrame ? (
                    <canvas
                      ref={previewCanvasRef}
                      aria-label={`${layout.width} by ${layout.height} pixel ${isAnimatedGif ? "animated GIF" : "export"} preview`}
                    />
                  ) : (
                    <span className="export-preview__invalid">PREVIEW PAUSED</span>
                  )}
                </div>
                <div className="export-preview__filename">
                  {isAnimatedGif ? <Film size={14} /> : <FileImage size={14} />}
                  <span>{fileName}</span>
                </div>
                <dl className="export-preview__stats">
                  <div><dt>SIZE</dt><dd>{layout.width} × {layout.height} PX</dd></div>
                  <div><dt>FRAMES</dt><dd>{selectedFrameCount}</dd></div>
                  <div>
                    <dt>{isAnimatedGif ? "GIF" : "PNG"}</dt>
                    <dd>{isAnimatedGif ? "CALCULATED ON EXPORT" : pngEstimate}</dd>
                  </div>
                  <div>
                    <dt>{isAnimatedGif ? "PLAYBACK" : "ALPHA"}</dt>
                    <dd>
                      {isAnimatedGif
                        ? preferences.gifPlayback === "loop" ? "FOREVER" : "PLAY ONCE"
                        : preferences.backgroundMode === "transparent" ? "PRESERVED" : "FLATTENED"}
                    </dd>
                  </div>
                </dl>
                <div className="export-preview__assurance">
                  <ShieldCheck size={14} />
                  <span>
                    {isAnimatedGif
                      ? "Project timing · 256-color palette · visible layers only"
                      : "Nearest-neighbor scale · exact palette · visible layers only"}
                  </span>
                </div>
                {(validationError || error) && (
                  <div className="export-preview__error" role="alert">
                    {validationError ?? error}
                  </div>
                )}
              </aside>
            </div>
          </div>

          <footer className="recovery-dialog__footer export-studio__footer">
            <span><Layers3 size={13} /> Reference layers are never exported</span>
            <div>
              <button
                type="button"
                className="recovery-discard-button export-studio__cancel"
                disabled={isBusy}
                onClick={onClose}
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="export-studio__export"
                disabled={isBusy || Boolean(validationError)}
                data-testid="export-artwork"
              >
                <Download size={15} />
                {isBusy ? "ENCODING…" : isAnimatedGif ? "EXPORT GIF" : "EXPORT PNG"}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
