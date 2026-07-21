import { AlertTriangle, MonitorX, Pipette, X } from "lucide-react";
import type { ScreenPickerToastModel } from "../hooks/useScreenPicker";

interface ScreenPickerToastProps {
  onDismiss: () => void;
  toast: ScreenPickerToastModel | null;
}

function ToastIcon({ kind }: { kind: ScreenPickerToastModel["kind"] }) {
  if (kind === "error") return <AlertTriangle size={19} />;
  if (kind === "desktop-only") return <MonitorX size={19} />;
  return <Pipette size={19} />;
}

export function ScreenPickerToast({ onDismiss, toast }: ScreenPickerToastProps) {
  if (!toast) return null;

  return (
    <aside
      className={`project-toast screen-picker-toast project-toast--${toast.kind}`}
      role={toast.kind === "error" ? "alert" : "status"}
      aria-live="polite"
      data-testid="screen-picker-toast"
    >
      <span className="project-toast__signal" aria-hidden="true" />
      <span className="project-toast__icon">
        <ToastIcon kind={toast.kind} />
      </span>
      <span className="project-toast__copy">
        <small>COLOR / SCREEN</small>
        <strong>{toast.title}</strong>
        <span>{toast.detail}</span>
      </span>
      {toast.color ? (
        <i
          className="screen-picker-toast__swatch"
          style={{ backgroundColor: toast.color }}
          aria-label={`Captured color ${toast.color}`}
        />
      ) : (
        <button aria-label="Dismiss screen picker message" onClick={onDismiss}>
          <X size={14} />
        </button>
      )}
    </aside>
  );
}
