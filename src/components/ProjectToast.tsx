import { AlertTriangle, Check, HardDrive, LoaderCircle, X } from "lucide-react";
import type { ProjectToastModel } from "../hooks/useProjectPersistence";

interface ProjectToastProps {
  toast: ProjectToastModel | null;
  onDismiss: () => void;
}

function ToastIcon({ kind }: { kind: ProjectToastModel["kind"] }) {
  if (kind === "busy") return <LoaderCircle className="is-spinning" size={19} />;
  if (kind === "error") return <AlertTriangle size={19} />;
  if (kind === "desktop-only") return <HardDrive size={19} />;
  return <Check size={19} />;
}

export function ProjectToast({ toast, onDismiss }: ProjectToastProps) {
  if (!toast) return null;

  return (
    <aside
      className={`project-toast project-toast--${toast.kind}`}
      role={toast.kind === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <span className="project-toast__signal" aria-hidden="true" />
      <span className="project-toast__icon">
        <ToastIcon kind={toast.kind} />
      </span>
      <span className="project-toast__copy">
        <small>PROJECT / FILE</small>
        <strong>{toast.title}</strong>
        <span>{toast.detail}</span>
      </span>
      {toast.kind !== "busy" && (
        <button aria-label="Dismiss project message" onClick={onDismiss}>
          <X size={14} />
        </button>
      )}
    </aside>
  );
}
