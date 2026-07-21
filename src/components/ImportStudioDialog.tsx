import {
  ChevronDown,
  ChevronUp,
  FileImage,
  FolderOpen,
  Grid2X2,
  Layers3,
  PlusSquare,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  countClippedPixels,
  extractImportedPalette,
  singleImportedImage,
  sliceImportedImage,
  validateSpriteSliceSettings,
  type ImportPaletteMode,
  type ImportedSlice,
  type SpriteSliceSettings,
} from "../editor/importOperations";
import type { ProjectDocument } from "../editor/project";
import type { ImportImageAsset } from "../services/imageImport";
import {
  normalizeWholeNumberDraft,
  parseWholeNumberDraft,
} from "./importStudioFields";

export type ImportSourceMode = "single" | "sheet";
export type ImportDestination = "new-project" | "new-layer" | "current-cel" | "frames";

export interface ImportStudioRequest {
  destination: ImportDestination;
  paletteMode: ImportPaletteMode;
  slices: ImportedSlice[];
}

interface ImportStudioDialogProps {
  activeLayerLocked: boolean;
  asset: ImportImageAsset;
  document: ProjectDocument;
  error: string | null;
  hasUnsavedChanges: boolean;
  isBusy: boolean;
  onChooseAnother: () => void;
  onClose: () => void;
  onImport: (request: ImportStudioRequest) => Promise<boolean>;
}

type NumericSettingKey = Exclude<keyof SpriteSliceSettings, "order">;
type NumericSettingDrafts = Record<NumericSettingKey, string>;

function numericSettingDrafts(settings: SpriteSliceSettings): NumericSettingDrafts {
  return {
    cellWidth: String(settings.cellWidth),
    cellHeight: String(settings.cellHeight),
    columns: String(settings.columns),
    rows: String(settings.rows),
    spacingX: String(settings.spacingX),
    spacingY: String(settings.spacingY),
    marginX: String(settings.marginX),
    marginY: String(settings.marginY),
  };
}

function defaultSliceSettings(asset: ImportImageAsset, document: ProjectDocument): SpriteSliceSettings {
  const cellWidth = asset.width >= document.width && asset.width % document.width === 0
    ? document.width
    : Math.min(asset.width, document.width);
  const cellHeight = asset.height >= document.height && asset.height % document.height === 0
    ? document.height
    : Math.min(asset.height, document.height);
  return {
    cellWidth,
    cellHeight,
    columns: Math.max(1, Math.min(32, Math.floor(asset.width / cellWidth))),
    rows: Math.max(1, Math.min(32, Math.floor(asset.height / cellHeight))),
    spacingX: 0,
    spacingY: 0,
    marginX: 0,
    marginY: 0,
    order: "rows",
  };
}

function imageHasAlpha(asset: ImportImageAsset) {
  for (let offset = 3; offset < asset.data.length; offset += 4) {
    if (asset.data[offset] < 255) return true;
  }
  return false;
}

export function ImportStudioDialog({
  activeLayerLocked,
  asset,
  document,
  error,
  hasUnsavedChanges,
  isBusy,
  onChooseAnother,
  onClose,
  onImport,
}: ImportStudioDialogProps) {
  const [sourceMode, setSourceMode] = useState<ImportSourceMode>("single");
  const [destination, setDestination] = useState<ImportDestination>("new-project");
  const [paletteMode, setPaletteMode] = useState<ImportPaletteMode>("merge");
  const [settings, setSettings] = useState(() => defaultSliceSettings(asset, document));
  const [settingDrafts, setSettingDrafts] = useState(() => numericSettingDrafts(
    defaultSliceSettings(asset, document),
  ));
  const [confirmationRequested, setConfirmationRequested] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const numericFields = [
    ["CELL W", "cellWidth", 1, 512],
    ["CELL H", "cellHeight", 1, 512],
    ["COLUMNS", "columns", 1, 1024],
    ["ROWS", "rows", 1, 1024],
    ["SPACING X", "spacingX", 0, asset.width],
    ["SPACING Y", "spacingY", 0, asset.height],
    ["MARGIN X", "marginX", 0, asset.width],
    ["MARGIN Y", "marginY", 0, asset.height],
  ] as const satisfies ReadonlyArray<readonly [string, NumericSettingKey, number, number]>;

  const invalidNumericField = sourceMode === "sheet"
    ? numericFields.find(([, key, minimum, maximum]) => (
        parseWholeNumberDraft(settingDrafts[key], minimum, maximum) === null
      ))
    : undefined;
  const numericDraftError = invalidNumericField
    ? `${invalidNumericField[0]} must be a whole number from ${invalidNumericField[2]} to ${invalidNumericField[3]}.`
    : null;

  const sheetError = sourceMode === "sheet"
    ? validateSpriteSliceSettings(asset, settings)
    : null;
  const slices = useMemo(() => {
    if (sourceMode === "single") return [singleImportedImage(asset)];
    if (sheetError) return [];
    return sliceImportedImage(asset, settings);
  }, [asset, settings, sheetError, sourceMode]);
  const importedColors = useMemo(() => extractImportedPalette(slices), [slices]);
  const alpha = useMemo(() => imageHasAlpha(asset), [asset]);
  const clippedPixels = useMemo(() => {
    if (slices.length === 0 || (destination !== "new-layer" && destination !== "current-cel")) return 0;
    const slice = slices[0];
    return countClippedPixels(
      slice.pixels,
      slice.width,
      slice.height,
      document.width,
      document.height,
      "center",
    );
  }, [destination, document.height, document.width, slices]);
  const frameDimensionsMatch = slices.every(
    (slice) => slice.width === document.width && slice.height === document.height,
  );
  const newProjectDimensionsValid = slices.length > 0
    && slices[0].width <= 512
    && slices[0].height <= 512;
  const validationError = numericDraftError
    ?? sheetError
    ?? (!newProjectDimensionsValid && destination === "new-project"
      ? "New projects support imported cells up to 512 × 512 pixels."
      : destination === "frames" && !frameDimensionsMatch
        ? `Frame imports must match the current ${document.width} × ${document.height} canvas.`
        : destination === "current-cel" && activeLayerLocked
          ? "Select a visible, unlocked pixel layer before replacing its cel."
          : null);

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    canvas.width = asset.width;
    canvas.height = asset.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    const imageData = context.createImageData(asset.width, asset.height);
    imageData.data.set(asset.data);
    context.putImageData(imageData, 0, 0);
    if (sourceMode !== "sheet" || sheetError) return;
    context.save();
    const lineWidth = Math.max(1, Math.ceil(Math.max(asset.width, asset.height) / 900));
    context.lineWidth = lineWidth;
    context.strokeStyle = "#42d9e3";
    context.globalAlpha = 0.9;
    for (let row = 0; row < settings.rows; row += 1) {
      for (let column = 0; column < settings.columns; column += 1) {
        const x = settings.marginX + column * (settings.cellWidth + settings.spacingX);
        const y = settings.marginY + row * (settings.cellHeight + settings.spacingY);
        context.strokeRect(
          x + lineWidth / 2,
          y + lineWidth / 2,
          settings.cellWidth - lineWidth,
          settings.cellHeight - lineWidth,
        );
      }
    }
    context.restore();
  }, [asset, settings, sheetError, sourceMode]);

  useEffect(() => {
    const nextSettings = defaultSliceSettings(asset, document);
    setSettings(nextSettings);
    setSettingDrafts(numericSettingDrafts(nextSettings));
  }, [asset.height, asset.name, asset.width, document.height, document.width]);

  useEffect(() => {
    if (sourceMode === "single" && destination === "frames") setDestination("new-project");
    if (sourceMode === "sheet" && (destination === "new-layer" || destination === "current-cel")) {
      setDestination("new-project");
    }
    setConfirmationRequested(false);
  }, [destination, sourceMode]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || isBusy) return;
      event.preventDefault();
      if (confirmationRequested) setConfirmationRequested(false);
      else onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [confirmationRequested, isBusy, onClose]);

  function updateSetting<Key extends keyof SpriteSliceSettings>(
    key: Key,
    value: SpriteSliceSettings[Key],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateNumericDraft(
    key: NumericSettingKey,
    value: string,
    minimum: number,
    maximum: number,
  ) {
    setSettingDrafts((current) => ({ ...current, [key]: value }));
    const parsed = parseWholeNumberDraft(value, minimum, maximum);
    if (parsed !== null) updateSetting(key, parsed);
  }

  function finishNumericEdit(
    key: NumericSettingKey,
    minimum: number,
    maximum: number,
  ) {
    const normalized = normalizeWholeNumberDraft(
      settingDrafts[key],
      settings[key],
      minimum,
      maximum,
    );
    updateSetting(key, normalized);
    setSettingDrafts((current) => ({ ...current, [key]: String(normalized) }));
  }

  function stepNumericSetting(
    key: NumericSettingKey,
    delta: number,
    minimum: number,
    maximum: number,
  ) {
    const draftValue = parseWholeNumberDraft(settingDrafts[key], minimum, maximum);
    const nextValue = Math.max(minimum, Math.min(maximum, (draftValue ?? settings[key]) + delta));
    updateSetting(key, nextValue);
    setSettingDrafts((current) => ({ ...current, [key]: String(nextValue) }));
  }

  function requestImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (validationError || isBusy || slices.length === 0) return;
    if (destination === "new-project" && hasUnsavedChanges && !confirmationRequested) {
      setConfirmationRequested(true);
      return;
    }
    void onImport({ destination, paletteMode, slices });
  }

  const destinationOptions: Array<{
    id: ImportDestination;
    icon: typeof FileImage;
    label: string;
    detail: string;
  }> = sourceMode === "single"
    ? [
        { id: "new-project", icon: FileImage, label: "New project", detail: "Use PNG dimensions" },
        { id: "new-layer", icon: Layers3, label: "New layer", detail: "Center on this frame" },
        { id: "current-cel", icon: PlusSquare, label: "Current cel", detail: "Replace active artwork" },
      ]
    : [
        { id: "new-project", icon: FileImage, label: "New project", detail: "One frame per cell" },
        { id: "frames", icon: Grid2X2, label: "Add frames", detail: "Insert after active" },
      ];

  return (
    <div
      className="recovery-backdrop import-studio-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !isBusy) onClose();
      }}
    >
      <section
        className="recovery-dialog import-studio-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-studio-title"
        aria-describedby="import-studio-description"
        aria-busy={isBusy}
        data-testid="import-studio-dialog"
      >
        <div className="recovery-dialog__scanline" aria-hidden="true" />
        <form onSubmit={requestImport}>
          <header className="recovery-dialog__header import-studio__header">
            <span className="recovery-dialog__mark import-studio__mark"><FolderOpen size={22} /></span>
            <span>
              <small>IMPORT / STUDIO</small>
              <h2 id="import-studio-title">Bring pixels aboard.</h2>
            </span>
            <button
              type="button"
              className="dialog-close-button"
              aria-label="Close Import Studio"
              disabled={isBusy}
              onClick={onClose}
            ><X size={16} /></button>
          </header>

          <div className="import-studio__body">
            <p id="import-studio-description" className="import-studio__intro">
              Import a transparent PNG as artwork or slice a sprite sheet into editable animation frames.
            </p>

            <div className="import-studio__grid">
              <aside className="import-studio__source">
                <span className="import-studio__label">SOURCE</span>
                <button
                  type="button"
                  className={sourceMode === "single" ? "is-active" : ""}
                  aria-pressed={sourceMode === "single"}
                  onClick={() => setSourceMode("single")}
                ><FileImage size={18} /><strong>Single PNG</strong><small>One image</small></button>
                <button
                  type="button"
                  className={sourceMode === "sheet" ? "is-active" : ""}
                  aria-pressed={sourceMode === "sheet"}
                  onClick={() => setSourceMode("sheet")}
                ><Grid2X2 size={18} /><strong>Sprite sheet</strong><small>Slice frames</small></button>
                <button type="button" className="import-studio__another" onClick={onChooseAnother}>
                  <FolderOpen size={13} /> CHOOSE ANOTHER
                </button>
              </aside>

              <div className="import-studio__preview">
                <div className="import-studio__preview-header">
                  <span>PREVIEW</span><span>{asset.width} × {asset.height}</span>
                </div>
                <div className="import-studio__preview-stage">
                  <canvas ref={previewRef} aria-label={`${asset.name} import preview`} />
                </div>
                <div className="import-studio__asset-name"><FileImage size={13} />{asset.name}</div>
                <div className="import-studio__summary">
                  <span>{slices.length || "—"} {slices.length === 1 ? "FRAME" : "FRAMES"}</span>
                  <span>{slices[0] ? `${slices[0].width} × ${slices[0].height}` : "INVALID GRID"}</span>
                  <span>{alpha ? "ALPHA" : "OPAQUE"}</span>
                </div>
              </div>

              <aside className={`import-studio__options ${sourceMode === "single" ? "is-single" : ""}`}>
                <span className="import-studio__label">{sourceMode === "sheet" ? "SLICE GRID" : "IMAGE"}</span>
                {sourceMode === "sheet" ? (
                  <>
                    <div className="import-studio__metrics">
                      {numericFields.map(([label, key, minimum, maximum]) => (
                        <div className="import-studio__metric" key={key}>
                          <label htmlFor={`import-setting-${key}`}>{label}</label>
                          <div className="import-studio__number-field">
                          <input
                            id={`import-setting-${key}`}
                            type="number"
                            inputMode="numeric"
                            step={1}
                            min={minimum}
                            max={maximum}
                            value={settingDrafts[key]}
                            aria-invalid={parseWholeNumberDraft(
                              settingDrafts[key],
                              minimum,
                              maximum,
                            ) === null}
                            onFocus={(event) => event.currentTarget.select()}
                            onClick={(event) => event.currentTarget.select()}
                            onChange={(event) => updateNumericDraft(
                              key,
                              event.target.value,
                              minimum,
                              maximum,
                            )}
                            onBlur={() => finishNumericEdit(key, minimum, maximum)}
                          />
                            <span className="import-studio__steppers">
                              <button
                                type="button"
                                aria-label={`Increase ${label}`}
                                onClick={() => stepNumericSetting(key, 1, minimum, maximum)}
                              ><ChevronUp size={14} /></button>
                              <button
                                type="button"
                                aria-label={`Decrease ${label}`}
                                onClick={() => stepNumericSetting(key, -1, minimum, maximum)}
                              ><ChevronDown size={14} /></button>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <span className="import-studio__label import-studio__order-label">FRAME ORDER</span>
                    <div className="import-studio__segmented">
                      <button
                        type="button"
                        className={settings.order === "rows" ? "is-active" : ""}
                        onClick={() => updateSetting("order", "rows")}
                      >ROWS</button>
                      <button
                        type="button"
                        className={settings.order === "columns" ? "is-active" : ""}
                        onClick={() => updateSetting("order", "columns")}
                      >COLUMNS</button>
                    </div>
                  </>
                ) : (
                  <div className="import-studio__single-note">
                    <Sparkles size={18} />
                    <strong>Exact pixels</strong>
                    <span>Transparency and RGBA values stay intact. Larger images are centered when placed on the current canvas.</span>
                  </div>
                )}
              </aside>
            </div>

            <div className="import-studio__lower">
              <fieldset className="import-studio__choice-group">
                <legend>DESTINATION</legend>
                <div className="import-studio__destination-options">
                  {destinationOptions.map(({ id, icon: Icon, label, detail }) => (
                    <button
                      key={id}
                      type="button"
                      className={destination === id ? "is-active" : ""}
                      aria-pressed={destination === id}
                      disabled={id === "current-cel" && activeLayerLocked}
                      onClick={() => setDestination(id)}
                    ><Icon size={16} /><span><strong>{label}</strong><small>{detail}</small></span></button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="import-studio__choice-group">
                <legend>PALETTE</legend>
                <div className="import-studio__palette-options">
                  {([
                    ["keep", "Keep current"],
                    ["merge", "Merge colors"],
                    ["replace", "Replace"],
                  ] as const).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={paletteMode === id ? "is-active" : ""}
                      aria-pressed={paletteMode === id}
                      onClick={() => setPaletteMode(id)}
                    ><span className="import-studio__palette-icon" />{label}<small>{id === "keep" ? document.palette.length : importedColors.length} COLORS</small></button>
                  ))}
                </div>
              </fieldset>
            </div>

            {(validationError || error || clippedPixels > 0) && (
              <div className="import-studio__alert" role={validationError || error ? "alert" : "status"}>
                <ShieldAlert size={14} />
                <span>{validationError ?? error ?? `${clippedPixels} pixels outside the current canvas will be clipped.`}</span>
              </div>
            )}
            {confirmationRequested && (
              <div className="import-studio__confirmation" role="alert">
                <ShieldAlert size={15} />
                <span><strong>Replace unsaved project?</strong> Importing as a new project discards the current unsaved session.</span>
                <button type="button" onClick={() => setConfirmationRequested(false)}>KEEP EDITING</button>
              </div>
            )}
          </div>

          <footer className="recovery-dialog__footer import-studio__footer">
            <span>{sourceMode === "sheet" ? "Slice grid lines are preview-only" : "PNG alpha is preserved"}</span>
            <div>
              <button type="button" className="recovery-discard-button" disabled={isBusy} onClick={onClose}>CANCEL</button>
              <button
                type="submit"
                className="import-studio__import"
                disabled={isBusy || Boolean(validationError) || slices.length === 0}
                data-testid="import-artwork"
              >
                {isBusy ? "IMPORTING…" : confirmationRequested ? "REPLACE & IMPORT" : `IMPORT ${slices.length > 1 ? `${slices.length} FRAMES` : "PNG"}`}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
