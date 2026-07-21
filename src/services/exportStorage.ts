import { invoke, isTauri } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

interface NativeExportPaths {
  imagePath: string;
  metadataPath: string | null;
}

export type ExportFileFormat = "gif" | "png";

export interface SavedExport {
  fileName: string;
  imagePath: string | null;
  metadataWritten: boolean;
}

const EXPORT_FORMATS: Record<ExportFileFormat, {
  filterName: string;
  mimeType: string;
}> = {
  gif: { filterName: "Animated GIF", mimeType: "image/gif" },
  png: { filterName: "PNG image", mimeType: "image/png" },
};

function fileNameFromPath(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}

function metadataFileName(imageFileName: string) {
  return imageFileName.replace(/\.[^./\\]+$/i, ".json");
}

function ensureExportExtension(path: string, format: ExportFileFormat) {
  const extensionPattern = new RegExp(`\\.${format}$`, "i");
  return extensionPattern.test(path) ? path : `${path}.${format}`;
}

function downloadBrowserFile(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function nativeExportAvailable() {
  return isTauri();
}

export async function saveExportArtifacts(
  defaultName: string,
  bytes: Uint8Array,
  format: ExportFileFormat,
  createMetadata: ((imageFileName: string) => string) | null,
): Promise<SavedExport | null> {
  const formatDetails = EXPORT_FORMATS[format];
  const normalizedDefaultName = ensureExportExtension(defaultName, format);
  if (!isTauri()) {
    const fileBuffer = new Uint8Array(bytes).buffer;
    downloadBrowserFile(
      normalizedDefaultName,
      new Blob([fileBuffer], { type: formatDetails.mimeType }),
    );
    const metadata = createMetadata?.(normalizedDefaultName) ?? null;
    if (metadata) {
      downloadBrowserFile(
        metadataFileName(normalizedDefaultName),
        new Blob([metadata], { type: "application/json" }),
      );
    }
    return {
      fileName: normalizedDefaultName,
      imagePath: null,
      metadataWritten: metadata !== null,
    };
  }

  const selected = await save({
    title: "Export JT Pixel artwork",
    defaultPath: normalizedDefaultName,
    filters: [{ name: formatDetails.filterName, extensions: [format] }],
  });
  if (!selected) return null;

  const paths = await invoke<NativeExportPaths>("prepare_export_paths", {
    format,
    imagePath: selected,
    includeMetadata: createMetadata !== null,
  });

  const imageFileName = fileNameFromPath(paths.imagePath);
  const metadata = createMetadata?.(imageFileName) ?? null;
  await writeFile(paths.imagePath, bytes);
  if (metadata && paths.metadataPath) {
    await writeTextFile(paths.metadataPath, metadata);
  }

  return {
    fileName: imageFileName,
    imagePath: paths.imagePath,
    metadataWritten: Boolean(metadata && paths.metadataPath),
  };
}

export async function revealSavedExport(imagePath: string) {
  await revealItemInDir(imagePath);
}
