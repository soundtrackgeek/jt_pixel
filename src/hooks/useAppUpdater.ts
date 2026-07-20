import { isTauri } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { useCallback, useEffect, useRef, useState } from "react";

const UPDATE_INTERVAL_STORAGE_KEY = "jt-pixel.update-interval-minutes";
const DEFAULT_UPDATE_INTERVAL_MINUTES = 5;

export const updateIntervalOptions = [
  { value: 0, label: "Manual only" },
  { value: 1, label: "Every minute" },
  { value: 5, label: "Every 5 minutes" },
  { value: 15, label: "Every 15 minutes" },
  { value: 30, label: "Every 30 minutes" },
  { value: 60, label: "Every hour" },
] as const;

export type UpdateToastModel =
  | { kind: "checking" }
  | { kind: "available"; version: string; notes?: string }
  | { kind: "downloading"; version: string; progress: number | null }
  | { kind: "installing"; version: string }
  | { kind: "current" }
  | { kind: "desktop-only" }
  | { kind: "error"; message: string };

function readSavedInterval() {
  const savedValue = Number.parseInt(
    window.localStorage.getItem(UPDATE_INTERVAL_STORAGE_KEY) ?? "",
    10,
  );
  const isSupportedValue = updateIntervalOptions.some(
    ({ value }) => value === savedValue,
  );

  return isSupportedValue ? savedValue : DEFAULT_UPDATE_INTERVAL_MINUTES;
}

function describeError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "The update service could not be reached.";
}

export function useAppUpdater() {
  const desktopAvailable = isTauri();
  const [intervalMinutes, setIntervalMinutes] = useState(readSavedInterval);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [toast, setToast] = useState<UpdateToastModel | null>(null);
  const updateRef = useRef<Update | null>(null);
  const checkInFlightRef = useRef(false);
  const dismissedVersionRef = useRef<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(
      UPDATE_INTERVAL_STORAGE_KEY,
      intervalMinutes.toString(),
    );
  }, [intervalMinutes]);

  const checkForUpdates = useCallback(
    async (manual = true) => {
      if (checkInFlightRef.current) return;

      if (!desktopAvailable) {
        if (manual) setToast({ kind: "desktop-only" });
        return;
      }

      if (updateRef.current) {
        if (manual) {
          setToast({
            kind: "available",
            version: updateRef.current.version,
            notes: updateRef.current.body,
          });
        }
        return;
      }

      checkInFlightRef.current = true;
      if (manual) setToast({ kind: "checking" });

      try {
        const update = await check({ timeout: 20_000 });
        setLastCheckedAt(new Date());

        if (!update) {
          if (manual) setToast({ kind: "current" });
          return;
        }

        if (dismissedVersionRef.current === update.version && !manual) {
          await update.close();
          return;
        }

        updateRef.current = update;
        setToast({
          kind: "available",
          version: update.version,
          notes: update.body,
        });
      } catch (error) {
        setLastCheckedAt(new Date());
        if (manual) {
          setToast({ kind: "error", message: describeError(error) });
        }
      } finally {
        checkInFlightRef.current = false;
      }
    },
    [desktopAvailable],
  );

  useEffect(() => {
    if (!desktopAvailable || intervalMinutes === 0) return;

    const initialCheck = window.setTimeout(
      () => void checkForUpdates(false),
      1_500,
    );
    const poller = window.setInterval(
      () => void checkForUpdates(false),
      intervalMinutes * 60_000,
    );

    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(poller);
    };
  }, [checkForUpdates, desktopAvailable, intervalMinutes]);

  useEffect(() => {
    if (toast?.kind !== "current" && toast?.kind !== "desktop-only") return;

    const dismissTimer = window.setTimeout(() => setToast(null), 4_500);
    return () => window.clearTimeout(dismissTimer);
  }, [toast]);

  useEffect(
    () => () => {
      if (updateRef.current) void updateRef.current.close();
    },
    [],
  );

  const installUpdate = useCallback(async () => {
    const update = updateRef.current;
    if (!update) {
      setToast({
        kind: "error",
        message: "The update is no longer available. Check again to retry.",
      });
      return;
    }

    let downloadedBytes = 0;
    let totalBytes: number | undefined;
    setToast({ kind: "downloading", version: update.version, progress: 0 });

    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          totalBytes = event.data.contentLength;
          setToast({
            kind: "downloading",
            version: update.version,
            progress: totalBytes ? 0 : null,
          });
          return;
        }

        if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          setToast({
            kind: "downloading",
            version: update.version,
            progress: totalBytes
              ? Math.min(99, Math.round((downloadedBytes / totalBytes) * 100))
              : null,
          });
          return;
        }

        setToast({ kind: "installing", version: update.version });
      });

      await relaunch();
    } catch (error) {
      updateRef.current = null;
      setToast({ kind: "error", message: describeError(error) });
      void update.close();
    }
  }, []);

  const dismissToast = useCallback(() => {
    if (toast?.kind === "downloading" || toast?.kind === "installing") return;

    if (toast?.kind === "available" && updateRef.current) {
      dismissedVersionRef.current = toast.version;
      void updateRef.current.close();
      updateRef.current = null;
    }

    setToast(null);
  }, [toast]);

  return {
    desktopAvailable,
    intervalMinutes,
    lastCheckedAt,
    toast,
    setIntervalMinutes,
    checkForUpdates,
    installUpdate,
    dismissToast,
  };
}
