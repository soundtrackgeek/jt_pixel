import { FilePenLine, FolderOpen, ShieldAlert } from "lucide-react";
import { useEffect, useRef } from "react";

interface ProjectOpenDialogProps {
  open: boolean;
  projectName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ProjectOpenDialog({
  open,
  projectName,
  onCancel,
  onConfirm,
}: ProjectOpenDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    cancelButtonRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCancel();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onCancel, open]);

  if (!open) return null;

  return (
    <div className="recovery-backdrop">
      <section
        className="recovery-dialog project-open-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="project-open-title"
        aria-describedby="project-open-description"
        data-testid="open-project-confirmation"
      >
        <div className="recovery-dialog__scanline" aria-hidden="true" />
        <header className="recovery-dialog__header">
          <span className="recovery-dialog__mark project-open-dialog__mark">
            <ShieldAlert size={22} />
          </span>
          <span>
            <small>PROJECT / OPEN</small>
            <h2 id="project-open-title">Leave unsaved pixels behind?</h2>
          </span>
        </header>

        <div className="recovery-dialog__body">
          <p id="project-open-description">
            Opening another project will replace the unsaved changes in your
            current workspace.
          </p>

          <div className="project-open-dialog__project">
            <span className="project-open-dialog__project-icon">
              <FilePenLine size={18} />
            </span>
            <span className="project-open-dialog__project-name">
              <strong>{projectName}</strong>
              <small>LOCAL CHANGES NOT SAVED</small>
            </span>
            <span className="project-open-dialog__badge">UNSAVED</span>
          </div>

          <div className="recovery-dialog__note project-open-dialog__note">
            Nothing changes until you choose a valid JT Pixel project and it
            finishes loading.
          </div>
        </div>

        <footer className="recovery-dialog__footer">
          <button
            ref={cancelButtonRef}
            className="recovery-discard-button project-open-dialog__cancel"
            data-testid="cancel-open-project"
            onClick={onCancel}
          >
            KEEP EDITING
          </button>
          <button
            className="project-open-dialog__confirm"
            data-testid="confirm-open-project"
            onClick={onConfirm}
          >
            <FolderOpen size={15} />
            OPEN ANOTHER
          </button>
        </footer>
      </section>
    </div>
  );
}
