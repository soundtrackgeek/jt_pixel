import { useCallback, useEffect, useRef, useState } from "react";
import type { EditorDocumentState, ProjectDocument } from "../editor/project";
import type { RecoverySnapshot } from "../editor/projectFile";
import {
  chooseProjectSavePath,
  clearRecoverySnapshot,
  describeProjectStorageError,
  desktopProjectFilesAvailable,
  openProjectFromDialog,
  readRecoverySnapshot,
  writeProjectToPath,
  writeRecoverySnapshot,
} from "../services/projectStorage";

const RECOVERY_DEBOUNCE_MS = 750;

export type ProjectToastModel = {
  kind: "busy" | "success" | "error" | "desktop-only";
  title: string;
  detail: string;
};

type RecoveryStatus = "idle" | "pending" | "saving" | "saved" | "error";

interface UseProjectPersistenceOptions {
  state: EditorDocumentState;
  markSaved: (document?: ProjectDocument) => void;
  replaceDocument: (document: ProjectDocument, dirty?: boolean) => void;
}

export function useProjectPersistence({
  state,
  markSaved,
  replaceDocument,
}: UseProjectPersistenceOptions) {
  const desktopAvailable = desktopProjectFilesAvailable();
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [openConfirmationRequested, setOpenConfirmationRequested] = useState(false);
  const [toast, setToast] = useState<ProjectToastModel | null>(null);
  const [recovery, setRecovery] = useState<RecoverySnapshot | null>(null);
  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus>("idle");
  const [lastRecoveryAt, setLastRecoveryAt] = useState<Date | null>(null);
  const busyRef = useRef(false);
  const recoveryWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const latestRecoveryRevisionRef = useRef(state.revision);
  const wasDirtyRef = useRef(state.isDirty);

  const clearQueuedRecovery = useCallback(async () => {
    latestRecoveryRevisionRef.current += 1;
    await recoveryWriteQueueRef.current.catch(() => undefined);
    await clearRecoverySnapshot();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void readRecoverySnapshot().then((snapshot) => {
      if (!cancelled && snapshot) setRecovery(snapshot);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!state.isDirty) {
      setRecoveryStatus("idle");
      return;
    }

    latestRecoveryRevisionRef.current = state.revision;
    setRecoveryStatus("pending");
    const revision = state.revision;
    const document = state.document;
    const activeFrameId = state.activeFrameId;
    const timer = window.setTimeout(() => {
      if (revision !== latestRecoveryRevisionRef.current) return;
      setRecoveryStatus("saving");
      const write = recoveryWriteQueueRef.current
        .catch(() => undefined)
        .then(() => writeRecoverySnapshot(document, activeFrameId));
      recoveryWriteQueueRef.current = write;
      void write.then(() => {
        if (revision !== latestRecoveryRevisionRef.current) return;
        setRecoveryStatus("saved");
        setLastRecoveryAt(new Date());
      }).catch((error) => {
        if (revision !== latestRecoveryRevisionRef.current) return;
        setRecoveryStatus("error");
        setToast({
          kind: "error",
          title: "Recovery paused",
          detail: describeProjectStorageError(error),
        });
      });
    }, RECOVERY_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [state.activeFrameId, state.document, state.isDirty, state.revision]);

  useEffect(() => {
    const wasDirty = wasDirtyRef.current;
    wasDirtyRef.current = state.isDirty;
    if (!wasDirty || state.isDirty || busyRef.current) return;
    void clearQueuedRecovery().catch(() => undefined);
  }, [clearQueuedRecovery, state.isDirty]);

  useEffect(() => {
    if (toast?.kind !== "success" && toast?.kind !== "desktop-only") return;
    const timer = window.setTimeout(() => setToast(null), 4_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!state.isDirty) return;
    const warnBeforeClose = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeClose);
    return () => window.removeEventListener("beforeunload", warnBeforeClose);
  }, [state.isDirty]);

  const saveProject = useCallback(async (saveAs = false) => {
    if (!desktopAvailable) {
      setToast({
        kind: "desktop-only",
        title: "Desktop file access",
        detail: "Open and Save use native dialogs inside the installed JT Pixel app.",
      });
      return;
    }
    if (busyRef.current) return;

    busyRef.current = true;
    setIsBusy(true);
    setToast({
      kind: "busy",
      title: saveAs || !currentPath ? "Choose a project file" : "Saving project",
      detail: saveAs || !currentPath
        ? "Waiting for a location for your .jtp file…"
        : `Writing ${state.document.name}…`,
    });

    try {
      const targetPath = saveAs || !currentPath
        ? await chooseProjectSavePath(state.document.name)
        : currentPath;
      if (!targetPath) {
        setToast(null);
        return;
      }

      const saved = await writeProjectToPath(
        state.document,
        targetPath,
        state.activeFrameId,
      );
      markSaved(saved.document);
      setCurrentPath(saved.path);
      setRecovery(null);
      setRecoveryStatus("idle");
      setLastRecoveryAt(null);
      await clearQueuedRecovery().catch(() => undefined);
      setToast({
        kind: "success",
        title: "Project saved",
        detail: `${saved.document.name} is safely on disk.`,
      });
    } catch (error) {
      setToast({
        kind: "error",
        title: "Project wasn’t saved",
        detail: describeProjectStorageError(error),
      });
    } finally {
      busyRef.current = false;
      setIsBusy(false);
    }
  }, [
    clearQueuedRecovery,
    currentPath,
    desktopAvailable,
    markSaved,
    state.activeFrameId,
    state.document,
  ]);

  const openSelectedProject = useCallback(async () => {
    if (!desktopAvailable) {
      setToast({
        kind: "desktop-only",
        title: "Desktop file access",
        detail: "Open and Save use native dialogs inside the installed JT Pixel app.",
      });
      return;
    }
    if (busyRef.current) return;

    busyRef.current = true;
    setIsBusy(true);
    setToast({
      kind: "busy",
      title: "Open a project",
      detail: "Choose a validated JT Pixel .jtp file…",
    });

    try {
      const opened = await openProjectFromDialog();
      if (!opened) {
        setToast(null);
        return;
      }

      replaceDocument(opened.document);
      setCurrentPath(opened.path);
      setRecovery(null);
      setRecoveryStatus("idle");
      setLastRecoveryAt(null);
      await clearQueuedRecovery().catch(() => undefined);
      setToast({
        kind: "success",
        title: "Project opened",
        detail: `${opened.document.name} is ready to edit.`,
      });
    } catch (error) {
      setToast({
        kind: "error",
        title: "Project couldn’t be opened",
        detail: describeProjectStorageError(error),
      });
    } finally {
      busyRef.current = false;
      setIsBusy(false);
    }
  }, [clearQueuedRecovery, desktopAvailable, replaceDocument]);

  const openProject = useCallback(async () => {
    if (busyRef.current) return;
    if (state.isDirty) {
      setOpenConfirmationRequested(true);
      return;
    }
    await openSelectedProject();
  }, [openSelectedProject, state.isDirty]);

  const cancelOpenProject = useCallback(() => {
    setOpenConfirmationRequested(false);
  }, []);

  const confirmOpenProject = useCallback(async () => {
    setOpenConfirmationRequested(false);
    await openSelectedProject();
  }, [openSelectedProject]);

  const restoreRecovery = useCallback(() => {
    if (!recovery) return;
    replaceDocument(recovery.document, true);
    setCurrentPath(null);
    setRecovery(null);
    setRecoveryStatus("pending");
    setToast({
      kind: "success",
      title: "Work restored",
      detail: "The recovered project is open as an unsaved copy.",
    });
  }, [recovery, replaceDocument]);

  const discardRecovery = useCallback(async () => {
    try {
      await clearQueuedRecovery();
      setRecovery(null);
      setToast({
        kind: "success",
        title: "Recovery discarded",
        detail: "JT Pixel kept the clean starter project open.",
      });
    } catch (error) {
      setToast({
        kind: "error",
        title: "Recovery couldn’t be discarded",
        detail: describeProjectStorageError(error),
      });
    }
  }, [clearQueuedRecovery]);

  useEffect(() => {
    const handleFileShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (openConfirmationRequested && (key === "s" || key === "o")) {
        event.preventDefault();
        return;
      }
      if (key === "s") {
        event.preventDefault();
        void saveProject(event.shiftKey);
      } else if (key === "o") {
        event.preventDefault();
        void openProject();
      }
    };

    window.addEventListener("keydown", handleFileShortcut);
    return () => window.removeEventListener("keydown", handleFileShortcut);
  }, [openConfirmationRequested, openProject, saveProject]);

  const documentStatus = isBusy
    ? "FILE BUSY"
    : !state.isDirty
      ? currentPath ? "SAVED" : "READY"
      : recoveryStatus === "saved"
        ? "RECOVERY READY"
        : recoveryStatus === "saving"
          ? "SECURING…"
          : recoveryStatus === "error"
            ? "RECOVERY ERROR"
            : "UNSAVED";

  const dismissToast = useCallback(() => {
    if (toast?.kind !== "busy") setToast(null);
  }, [toast?.kind]);

  return {
    currentPath,
    cancelOpenProject,
    confirmOpenProject,
    desktopAvailable,
    discardRecovery,
    dismissToast,
    documentStatus,
    isBusy,
    lastRecoveryAt,
    openConfirmationRequested,
    openProject,
    recovery,
    restoreRecovery,
    saveProject,
    toast,
  };
}
