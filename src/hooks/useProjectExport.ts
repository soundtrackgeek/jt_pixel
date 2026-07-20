import { useCallback, useEffect, useRef, useState } from "react";
import {
  exportPngFileName,
  renderProjectExport,
  serializeSpriteSheetMetadata,
  type ExportRequest,
} from "../editor/export";
import { encodeRenderedExport } from "../editor/exportCanvas";
import type { ProjectDocument } from "../editor/project";
import {
  nativeExportAvailable,
  revealSavedExport,
  saveExportArtifacts,
} from "../services/exportStorage";
import { describeProjectStorageError } from "../services/projectStorage";

export interface ExportToastModel {
  kind: "busy" | "success" | "error";
  title: string;
  detail: string;
  imagePath?: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UseProjectExportOptions {
  activeFrameId: string;
  document: ProjectDocument;
}

export function useProjectExport({
  activeFrameId,
  document,
}: UseProjectExportOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ExportToastModel | null>(null);
  const busyRef = useRef(false);
  const desktopAvailable = nativeExportAvailable();

  useEffect(() => {
    if (toast?.kind !== "success") return;
    const timer = window.setTimeout(() => setToast(null), 8_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const openStudio = useCallback(() => {
    if (busyRef.current) return;
    setError(null);
    setIsOpen(true);
  }, []);

  const closeStudio = useCallback(() => {
    if (!busyRef.current) setIsOpen(false);
  }, []);

  const exportArtwork = useCallback(async (request: ExportRequest) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setIsBusy(true);
    setError(null);
    setToast({
      kind: "busy",
      title: "Preparing clean pixels",
      detail: "Flattening visible artwork and encoding a lossless PNG…",
    });

    try {
      const rendered = renderProjectExport(document, request);
      const defaultName = exportPngFileName(document, request);
      const pngBytes = await encodeRenderedExport(rendered);
      const createMetadata = request.kind === "sprite-sheet" && request.includeMetadata
        ? (imageFileName: string) => serializeSpriteSheetMetadata(
            document,
            request,
            rendered,
            imageFileName,
          )
        : null;
      const saved = await saveExportArtifacts(defaultName, pngBytes, createMetadata);
      if (!saved) {
        setToast(null);
        return false;
      }

      const destination = desktopAvailable ? "saved" : "downloaded";
      setIsOpen(false);
      setToast({
        kind: "success",
        title: `Artwork ${destination}`,
        detail: `${saved.fileName} · ${rendered.width} × ${rendered.height} · ${formatBytes(pngBytes.byteLength)}${saved.metadataWritten ? " · JSON included" : ""}`,
        imagePath: saved.imagePath ?? undefined,
      });
      return true;
    } catch (caught) {
      const detail = describeProjectStorageError(caught);
      setError(detail);
      setToast({
        kind: "error",
        title: "Export couldn’t finish",
        detail,
      });
      return false;
    } finally {
      busyRef.current = false;
      setIsBusy(false);
    }
  }, [desktopAvailable, document]);

  const revealExport = useCallback(async () => {
    const imagePath = toast?.imagePath;
    if (!imagePath) return;
    try {
      await revealSavedExport(imagePath);
    } catch (caught) {
      setToast({
        kind: "error",
        title: "Folder couldn’t be opened",
        detail: describeProjectStorageError(caught),
      });
    }
  }, [toast?.imagePath]);

  const dismissToast = useCallback(() => {
    if (toast?.kind !== "busy") setToast(null);
  }, [toast?.kind]);

  return {
    activeFrameId,
    closeStudio,
    desktopAvailable,
    dismissToast,
    error,
    exportArtwork,
    isBusy,
    isOpen,
    openStudio,
    revealExport,
    toast,
  };
}
