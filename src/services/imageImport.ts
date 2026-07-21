import { invoke, isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import {
  MAX_IMPORT_SOURCE_DIMENSION,
  MAX_IMPORT_SOURCE_PIXELS,
  type DecodedImportImage,
} from "../editor/importOperations";

const PNG_FILTER = [{ name: "PNG image", extensions: ["png"] }];
const MAX_IMPORT_FILE_BYTES = 64 * 1024 * 1024;

export interface ImportImageAsset extends DecodedImportImage {
  sourcePath: string | null;
}

export function describeImageImportError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "The PNG image could not be opened.";
}

function browserImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,.png";
    input.style.display = "none";
    document.body.append(input);
    let settled = false;
    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(file);
    };
    input.addEventListener("change", () => finish(input.files?.[0] ?? null), { once: true });
    input.addEventListener("cancel", () => finish(null), { once: true });
    input.click();
  });
}

function fileNameFromPath(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}

export async function decodeImportBlob(
  blob: Blob,
  name: string,
  sourcePath: string | null = null,
): Promise<ImportImageAsset> {
  if (blob.size > MAX_IMPORT_FILE_BYTES) {
    throw new Error("Choose a PNG smaller than 64 MB.");
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    throw new Error("The selected file is not a readable PNG image.");
  }
  try {
    if (
      bitmap.width < 1
      || bitmap.height < 1
      || bitmap.width > MAX_IMPORT_SOURCE_DIMENSION
      || bitmap.height > MAX_IMPORT_SOURCE_DIMENSION
      || bitmap.width * bitmap.height > MAX_IMPORT_SOURCE_PIXELS
    ) {
      throw new Error(
        `PNG sources may be up to ${MAX_IMPORT_SOURCE_DIMENSION} pixels per side and ${MAX_IMPORT_SOURCE_PIXELS.toLocaleString()} pixels total.`,
      );
    }
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("JT Pixel could not prepare the image decoder.");
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, bitmap.width, bitmap.height);
    context.drawImage(bitmap, 0, 0);
    const imageData = context.getImageData(0, 0, bitmap.width, bitmap.height);
    return {
      data: imageData.data,
      height: bitmap.height,
      name,
      sourcePath,
      width: bitmap.width,
    };
  } finally {
    bitmap.close();
  }
}

export async function chooseImportImage() {
  if (!isTauri()) {
    const file = await browserImageFile();
    return file ? decodeImportBlob(file, file.name) : null;
  }
  const selected = await open({
    title: "Import PNG artwork",
    filters: PNG_FILTER,
    multiple: false,
    directory: false,
  });
  if (!selected || Array.isArray(selected)) return null;
  const allowedPath = await invoke<string>("allow_import_path", { path: selected });
  const bytes = await readFile(allowedPath);
  return decodeImportBlob(
    new Blob([new Uint8Array(bytes).buffer], { type: "image/png" }),
    fileNameFromPath(allowedPath),
    allowedPath,
  );
}

export async function importImageFromFile(file: File) {
  if (!file.name.toLowerCase().endsWith(".png") && file.type !== "image/png") {
    throw new Error("JT Pixel currently imports PNG images only.");
  }
  return decodeImportBlob(file, file.name);
}

export async function importImageFromNativePath(path: string) {
  const allowedPath = await invoke<string>("allow_import_path", { path });
  const bytes = await readFile(allowedPath);
  return decodeImportBlob(
    new Blob([new Uint8Array(bytes).buffer], { type: "image/png" }),
    fileNameFromPath(allowedPath),
    allowedPath,
  );
}
