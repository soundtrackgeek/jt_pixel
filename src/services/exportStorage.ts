import { invoke, isTauri } from "@tauri-apps/api/core";
import { writeFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

interface NativeExportPaths {
  imagePath: string;
  metadataPath: string | null;
}

export interface SavedExport {
  fileName: string;
  imagePath: string | null;
  metadataWritten: boolean;
}

function fileNameFromPath(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}

function metadataFileName(imageFileName: string) {
  return imageFileName.replace(/\.png$/i, ".json");
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
  pngBytes: Uint8Array,
  createMetadata: ((imageFileName: string) => string) | null,
): Promise<SavedExport | null> {
  if (!isTauri()) {
    const pngBuffer = new Uint8Array(pngBytes).buffer;
    downloadBrowserFile(defaultName, new Blob([pngBuffer], { type: "image/png" }));
    const metadata = createMetadata?.(defaultName) ?? null;
    if (metadata) {
      downloadBrowserFile(
        metadataFileName(defaultName),
        new Blob([metadata], { type: "application/json" }),
      );
    }
    return {
      fileName: defaultName,
      imagePath: null,
      metadataWritten: metadata !== null,
    };
  }

  const paths = await invoke<NativeExportPaths | null>("choose_export_paths", {
    defaultName,
    includeMetadata: createMetadata !== null,
  });
  if (!paths) return null;

  const imageFileName = fileNameFromPath(paths.imagePath);
  const metadata = createMetadata?.(imageFileName) ?? null;
  await writeFile(paths.imagePath, pngBytes);
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
