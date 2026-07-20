import {
  AlertTriangle,
  Check,
  Download,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import type { UpdateToastModel } from "../hooks/useAppUpdater";

interface UpdateToastProps {
  toast: UpdateToastModel | null;
  onCheckAgain: () => void;
  onDismiss: () => void;
  onInstall: () => void;
}

function ToastIcon({ toast }: { toast: UpdateToastModel }) {
  if (toast.kind === "available") return <Sparkles size={21} />;
  if (toast.kind === "downloading") return <Download size={21} />;
  if (toast.kind === "current") return <Check size={21} />;
  if (toast.kind === "error") return <AlertTriangle size={21} />;
  return <LoaderCircle className={toast.kind === "checking" ? "is-spinning" : ""} size={21} />;
}

function toastCopy(toast: UpdateToastModel) {
  switch (toast.kind) {
    case "checking":
      return {
        title: "Scanning for updates",
        detail: "Contacting the JT Pixel release channel…",
      };
    case "available":
      return {
        title: `JT Pixel ${toast.version} is ready`,
        detail: toast.notes || "A fresh build is available to install.",
      };
    case "downloading":
      return {
        title: `Downloading ${toast.version}`,
        detail:
          toast.progress === null
            ? "Receiving the signed update package…"
            : `${toast.progress}% complete`,
      };
    case "installing":
      return {
        title: "Installing update",
        detail: `JT Pixel ${toast.version} will relaunch when it is ready.`,
      };
    case "current":
      return {
        title: "You’re up to date",
        detail: "This is the newest version of JT Pixel.",
      };
    case "desktop-only":
      return {
        title: "Desktop feature",
        detail: "Update checks run inside the installed JT Pixel app.",
      };
    case "error":
      return { title: "Update check paused", detail: toast.message };
  }
}

export function UpdateToast({
  toast,
  onCheckAgain,
  onDismiss,
  onInstall,
}: UpdateToastProps) {
  if (!toast) return null;

  const copy = toastCopy(toast);
  const isBusy = toast.kind === "downloading" || toast.kind === "installing";

  return (
    <aside
      className={`update-toast update-toast--${toast.kind}`}
      role={toast.kind === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <div className="update-toast__accent" aria-hidden="true" />
      <div className="update-toast__icon">
        <ToastIcon toast={toast} />
      </div>
      <div className="update-toast__content">
        <span className="update-toast__eyebrow">JT PIXEL UPDATE</span>
        <strong>{copy.title}</strong>
        <p>{copy.detail}</p>

        {toast.kind === "downloading" && (
          <div
            className={`update-progress ${toast.progress === null ? "is-indeterminate" : ""}`}
            role="progressbar"
            aria-label="Update download progress"
            aria-valuenow={toast.progress ?? undefined}
          >
            <span style={{ width: `${toast.progress ?? 38}%` }} />
          </div>
        )}

        {toast.kind === "available" && (
          <div className="update-toast__actions">
            <button className="update-toast__primary" onClick={onInstall}>
              <Download size={14} />
              UPDATE NOW
            </button>
            <button className="update-toast__secondary" onClick={onDismiss}>
              LATER
            </button>
          </div>
        )}

        {toast.kind === "error" && (
          <div className="update-toast__actions">
            <button className="update-toast__primary" onClick={onCheckAgain}>
              <RefreshCw size={14} />
              TRY AGAIN
            </button>
            <button className="update-toast__secondary" onClick={onDismiss}>
              DISMISS
            </button>
          </div>
        )}
      </div>

      {!isBusy && toast.kind !== "available" && toast.kind !== "error" && (
        <button
          className="update-toast__close"
          aria-label="Dismiss update message"
          onClick={onDismiss}
        >
          <X size={15} />
        </button>
      )}
    </aside>
  );
}
