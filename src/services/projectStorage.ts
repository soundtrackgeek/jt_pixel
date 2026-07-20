import { isTauri } from "@tauri-apps/api/core";
import { confirm, open, save } from "@tauri-apps/plugin-dialog";
import {
  BaseDirectory,
  exists,
  readTextFile,
  remove,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import {
  createRecoverySnapshot,
  ensureProjectExtension,
  parseProjectDocument,
  parseRecoverySnapshot,
  prepareProjectDocumentForSave,
  projectFileName,
  serializeProjectDocument,
  serializeRecoverySnapshot,
  type RecoverySnapshot,
} from "../editor/projectFile";
import type { ProjectDocument } from "../editor/project";

const RECOVERY_FILE_NAME = "project-recovery-v1.json";
const BROWSER_RECOVERY_STORAGE_KEY = "jt-pixel.project-recovery:v1";
const PROJECT_FILTER = [{ name: "JT Pixel project", extensions: ["jtp"] }];

export interface OpenedProject {
  document: ProjectDocument;
  path: string;
}

export interface SavedProject extends OpenedProject {}

export function desktopProjectFilesAvailable() {
  return isTauri();
}

export function describeProjectStorageError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "The project file could not be accessed.";
}

export async function confirmDiscardUnsavedChanges() {
  if (!isTauri()) {
    return window.confirm(
      "Open another project and discard the unsaved changes in this session?",
    );
  }

  return confirm(
    "Open another project and discard the unsaved changes in this session?",
    {
      title: "Unsaved JT Pixel project",
      kind: "warning",
      okLabel: "Open project",
      cancelLabel: "Keep editing",
    },
  );
}

export async function openProjectFromDialog(): Promise<OpenedProject | null> {
  const selected = await open({
    title: "Open JT Pixel project",
    filters: PROJECT_FILTER,
    multiple: false,
    directory: false,
  });
  if (!selected || Array.isArray(selected)) return null;

  const parsed = parseProjectDocument(await readTextFile(selected));
  return {
    path: selected,
    document: { ...parsed, name: projectFileName(selected) },
  };
}

export async function chooseProjectSavePath(defaultName: string) {
  const selected = await save({
    title: "Save JT Pixel project",
    defaultPath: ensureProjectExtension(defaultName),
    filters: PROJECT_FILTER,
  });
  return selected ? ensureProjectExtension(selected) : null;
}

export async function writeProjectToPath(
  document: ProjectDocument,
  path: string,
): Promise<SavedProject> {
  const normalizedPath = ensureProjectExtension(path);
  const savedDocument = prepareProjectDocumentForSave(document, normalizedPath);
  await writeTextFile(normalizedPath, serializeProjectDocument(savedDocument));
  return { document: savedDocument, path: normalizedPath };
}

export async function readRecoverySnapshot(): Promise<RecoverySnapshot | null> {
  try {
    if (isTauri()) {
      const recoveryExists = await exists(RECOVERY_FILE_NAME, {
        baseDir: BaseDirectory.AppData,
      });
      if (!recoveryExists) return null;
      return parseRecoverySnapshot(await readTextFile(RECOVERY_FILE_NAME, {
        baseDir: BaseDirectory.AppData,
      }));
    }

    const stored = window.localStorage.getItem(BROWSER_RECOVERY_STORAGE_KEY);
    return stored ? parseRecoverySnapshot(stored) : null;
  } catch {
    await clearRecoverySnapshot();
    return null;
  }
}

export async function writeRecoverySnapshot(document: ProjectDocument) {
  const serialized = serializeRecoverySnapshot(createRecoverySnapshot(document));
  if (isTauri()) {
    await writeTextFile(RECOVERY_FILE_NAME, serialized, {
      baseDir: BaseDirectory.AppData,
    });
    return;
  }

  try {
    window.localStorage.setItem(BROWSER_RECOVERY_STORAGE_KEY, serialized);
  } catch {
    throw new Error("Browser storage is full or unavailable.");
  }
}

export async function clearRecoverySnapshot() {
  if (isTauri()) {
    if (await exists(RECOVERY_FILE_NAME, { baseDir: BaseDirectory.AppData })) {
      await remove(RECOVERY_FILE_NAME, { baseDir: BaseDirectory.AppData });
    }
    return;
  }

  try {
    window.localStorage.removeItem(BROWSER_RECOVERY_STORAGE_KEY);
  } catch {
    // Recovery cleanup is best effort in restricted browser contexts.
  }
}
