import { Clock3, RefreshCw, ShieldCheck, Sparkles, X } from "lucide-react";
import { useEffect } from "react";
import { updateIntervalOptions } from "../hooks/useAppUpdater";

interface UpdateSettingsProps {
  desktopAvailable: boolean;
  intervalMinutes: number;
  isChecking: boolean;
  lastCheckedAt: Date | null;
  open: boolean;
  onCheckNow: () => void;
  onClose: () => void;
  onIntervalChange: (minutes: number) => void;
}

function formatLastChecked(lastCheckedAt: Date | null) {
  if (!lastCheckedAt) return "Not checked this session";

  return `Last checked at ${lastCheckedAt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function UpdateSettings({
  desktopAvailable,
  intervalMinutes,
  isChecking,
  lastCheckedAt,
  open,
  onCheckNow,
  onClose,
  onIntervalChange,
}: UpdateSettingsProps) {
  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="settings-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        className="update-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-settings-title"
      >
        <div className="update-settings__glow" aria-hidden="true" />
        <header className="update-settings__header">
          <div className="update-settings__mark">
            <Sparkles size={19} />
          </div>
          <div>
            <span className="update-settings__eyebrow">SYSTEM / UPDATES</span>
            <h2 id="update-settings-title">Keep JT Pixel fresh</h2>
          </div>
          <button
            className="icon-button update-settings__close"
            aria-label="Close settings"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="update-settings__body">
          <label className="update-setting-row" htmlFor="update-frequency">
            <span className="update-setting-row__icon">
              <Clock3 size={17} />
            </span>
            <span className="update-setting-row__copy">
              <strong>Automatic checks</strong>
              <small>Runs quietly while the desktop app is open.</small>
            </span>
            <select
              id="update-frequency"
              value={intervalMinutes}
              onChange={(event) => onIntervalChange(Number(event.target.value))}
            >
              {updateIntervalOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <div className="update-settings__security">
            <ShieldCheck size={17} />
            <p>
              <strong>Signed and verified</strong>
              <span>
                Every update is authenticated before JT Pixel installs it.
              </span>
            </p>
          </div>
        </div>

        <footer className="update-settings__footer">
          <div>
            <span
              className={`desktop-status ${desktopAvailable ? "is-online" : ""}`}
              aria-hidden="true"
            />
            {desktopAvailable
              ? formatLastChecked(lastCheckedAt)
              : "Available in the desktop app"}
          </div>
          <button
            className="update-check-button"
            disabled={isChecking}
            onClick={onCheckNow}
          >
            <RefreshCw className={isChecking ? "is-spinning" : ""} size={15} />
            {isChecking ? "CHECKING" : "CHECK NOW"}
          </button>
        </footer>
      </section>
    </div>
  );
}
