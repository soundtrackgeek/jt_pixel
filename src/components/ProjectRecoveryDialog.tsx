import { Film, History, Layers3, ShieldCheck } from "lucide-react";
import { useEffect, useRef } from "react";
import type { RecoverySnapshot } from "../editor/projectFile";

interface ProjectRecoveryDialogProps {
  recovery: RecoverySnapshot | null;
  onDiscard: () => void;
  onRestore: () => void;
}

function formatRecoveryTime(timestamp: string) {
  return new Date(timestamp).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ProjectRecoveryDialog({
  recovery,
  onDiscard,
  onRestore,
}: ProjectRecoveryDialogProps) {
  const restoreButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (recovery) restoreButtonRef.current?.focus();
  }, [recovery]);

  if (!recovery) return null;

  const pixelLayerCount = recovery.document.layers.filter(
    (layer) => layer.kind === "pixel",
  ).length;

  return (
    <div className="recovery-backdrop">
      <section
        className="recovery-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="recovery-title"
        aria-describedby="recovery-description"
      >
        <div className="recovery-dialog__scanline" aria-hidden="true" />
        <header className="recovery-dialog__header">
          <span className="recovery-dialog__mark">
            <ShieldCheck size={22} />
          </span>
          <span>
            <small>RECOVERY / AUTOSAVE</small>
            <h2 id="recovery-title">Your pixels are safe.</h2>
          </span>
        </header>

        <div className="recovery-dialog__body">
          <p id="recovery-description">
            JT Pixel found unsaved work from the previous session. Restore it as
            an unsaved project, or discard it and continue with a clean canvas.
          </p>

          <div className="recovery-project-card">
            <span className="recovery-project-card__pulse" aria-hidden="true" />
            <span className="recovery-project-card__name">
              <History size={16} />
              <span>
                <strong>{recovery.document.name}</strong>
                <small>Captured {formatRecoveryTime(recovery.savedAt)}</small>
              </span>
            </span>
            <span className="recovery-project-card__stats">
              <span className="recovery-project-card__stat">
                <Film size={14} />
                {recovery.document.frames.length} frames
              </span>
              <span className="recovery-project-card__stat">
                <Layers3 size={14} />
                {pixelLayerCount} pixel layers
              </span>
            </span>
          </div>

          <div className="recovery-dialog__note">
            Restored work opens without its previous file path, so your next save
            creates a fresh, deliberate copy.
          </div>
        </div>

        <footer className="recovery-dialog__footer">
          <button className="recovery-discard-button" onClick={onDiscard}>
            DISCARD RECOVERY
          </button>
          <button
            ref={restoreButtonRef}
            className="recovery-restore-button"
            onClick={onRestore}
          >
            <History size={15} />
            RESTORE WORK
          </button>
        </footer>
      </section>
    </div>
  );
}
