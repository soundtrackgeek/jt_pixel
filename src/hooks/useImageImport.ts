import { getCurrentWebview } from "@tauri-apps/api/webview";
import { isTauri } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState, type DragEvent } from "react";
import {
  chooseImportImage,
  describeImageImportError,
  importImageFromFile,
  importImageFromNativePath,
  type ImportImageAsset,
} from "../services/imageImport";

export interface ImageImportToast {
  detail: string;
  title: string;
}

export function useImageImport() {
  const [asset, setAsset] = useState<ImportImageAsset | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [toast, setToast] = useState<ImageImportToast | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const acceptAsset = useCallback((next: ImportImageAsset) => {
    setAsset(next);
    setDialogError(null);
    setToast(null);
    setIsDragActive(false);
  }, []);

  const reportError = useCallback((error: unknown, insideDialog = false) => {
    const detail = describeImageImportError(error);
    if (insideDialog) setDialogError(detail);
    else setToast({ title: "PNG couldn’t be imported", detail });
    setIsDragActive(false);
  }, []);

  const chooseImage = useCallback(async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const next = await chooseImportImage();
      if (next) acceptAsset(next);
    } catch (error) {
      reportError(error, asset !== null);
    } finally {
      setIsBusy(false);
    }
  }, [acceptAsset, asset, isBusy, reportError]);

  const closeStudio = useCallback(() => {
    if (isBusy) return;
    setAsset(null);
    setDialogError(null);
  }, [isBusy]);

  const runBusy = useCallback(async (task: () => Promise<boolean>) => {
    if (isBusy) return false;
    setIsBusy(true);
    setDialogError(null);
    try {
      return await task();
    } catch (error) {
      reportError(error, true);
      return false;
    } finally {
      setIsBusy(false);
    }
  }, [isBusy, reportError]);

  const handleDragEnter = useCallback((event: DragEvent<HTMLElement>) => {
    if (isTauri() || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    if (isTauri() || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    if (isTauri() || event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback((event: DragEvent<HTMLElement>) => {
    if (isTauri()) return;
    event.preventDefault();
    setIsDragActive(false);
    const file = [...event.dataTransfer.files].find(
      (candidate) => candidate.type === "image/png" || candidate.name.toLowerCase().endsWith(".png"),
    );
    if (!file) {
      reportError(new Error("Drop a PNG image to open Import Studio."));
      return;
    }
    setIsBusy(true);
    void importImageFromFile(file)
      .then(acceptAsset)
      .catch((error) => reportError(error))
      .finally(() => setIsBusy(false));
  }, [acceptAsset, reportError]);

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    void getCurrentWebview().onDragDropEvent((event) => {
      if (cancelled) return;
      if (event.payload.type === "enter" || event.payload.type === "over") {
        setIsDragActive(true);
        return;
      }
      if (event.payload.type === "leave") {
        setIsDragActive(false);
        return;
      }
      if (event.payload.type !== "drop") return;
      setIsDragActive(false);
      const path = event.payload.paths.find((candidate) => candidate.toLowerCase().endsWith(".png"));
      if (!path) {
        reportError(new Error("Drop a PNG image to open Import Studio."));
        return;
      }
      setIsBusy(true);
      void importImageFromNativePath(path)
        .then(acceptAsset)
        .catch((error) => reportError(error))
        .finally(() => setIsBusy(false));
    }).then((stop) => {
      if (cancelled) stop();
      else unlisten = stop;
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [acceptAsset, reportError]);

  return {
    asset,
    closeStudio,
    dialogError,
    dismissToast: () => setToast(null),
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    isBusy,
    isDragActive,
    openStudio: chooseImage,
    runBusy,
    toast,
  };
}
