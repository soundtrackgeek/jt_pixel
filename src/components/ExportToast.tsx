import {
  AlertTriangle,
  Check,
  FolderOpen,
  LoaderCircle,
  X,
} from "lucide-react";
import type { ExportToastModel } from "../hooks/useProjectExport";

interface ExportToastProps {
  toast: ExportToastModel | null;
  onDismiss: () => void;
  onReveal: () => void;
}

function ExportToastIcon({ kind }: { kind: ExportToastModel["kind"] }) {
  if (kind === "busy") return <LoaderCircle className="is-spinning" size={19} />;
  if (kind === "error") return <AlertTriangle size={19} />;
  return <Check size={19} />;
}

export function ExportToast({ toast, onDismiss, onReveal }: ExportToastProps) {
  if (!toast) return null;

  return (
    <aside
      className={`project-toast export-toast project-toast--${toast.kind}`}
      role={toast.kind === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <span className="project-toast__signal" aria-hidden="true" />
      <span className="project-toast__icon">
        <ExportToastIcon kind={toast.kind} />
      </span>
      <span className="project-toast__copy">
        <small>EXPORT / OUTPUT</small>
        <strong>{toast.title}</strong>
        <span>{toast.detail}</span>
        {toast.imagePath && (
          <button className="export-toast__reveal" onClick={onReveal}>
            <FolderOpen size={12} />
            OPEN FOLDER
          </button>
        )}
      </span>
      {toast.kind !== "busy" && (
        <button aria-label="Dismiss export message" onClick={onDismiss}>
          <X size={14} />
        </button>
      )}
    </aside>
  );
}
