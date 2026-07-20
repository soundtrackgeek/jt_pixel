import { useCallback, useEffect, useMemo, useState } from "react";
import { CanvasStage } from "./components/CanvasStage";
import { Inspector } from "./components/Inspector";
import { ProjectOpenDialog } from "./components/ProjectOpenDialog";
import { ProjectNewDialog } from "./components/ProjectNewDialog";
import { ProjectRecoveryDialog } from "./components/ProjectRecoveryDialog";
import { ProjectToast } from "./components/ProjectToast";
import { StatusBar } from "./components/StatusBar";
import { Timeline } from "./components/Timeline";
import { ToolPanel } from "./components/ToolPanel";
import { ToolRail } from "./components/ToolRail";
import { TopBar } from "./components/TopBar";
import { UpdateSettings } from "./components/UpdateSettings";
import { UpdateToast } from "./components/UpdateToast";
import { tools } from "./data/editor";
import { createNewProjectDocument, type NewProjectOptions } from "./editor/project";
import { useAppUpdater } from "./hooks/useAppUpdater";
import { useCanvasViewPreferences } from "./hooks/useCanvasViewPreferences";
import { useProjectDocument } from "./hooks/useProjectDocument";
import { useProjectPersistence } from "./hooks/useProjectPersistence";
import type { CursorPosition, ToolId } from "./types";

const TEXT_EDITING_INPUT_TYPES = new Set([
  "email",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "url",
]);

function isTextEditingTarget(target: EventTarget | null) {
  if (target instanceof HTMLTextAreaElement) return !target.readOnly;
  if (target instanceof HTMLInputElement) {
    return !target.readOnly && TEXT_EDITING_INPUT_TYPES.has(target.type);
  }
  return target instanceof HTMLElement && target.isContentEditable;
}

function App() {
  const project = useProjectDocument();
  const persistence = useProjectPersistence({
    state: project.state,
    markSaved: project.markSaved,
    replaceDocument: project.replaceDocument,
  });
  const canvasView = useCanvasViewPreferences();
  const { document } = project.state;
  const [activeTool, setActiveTool] = useState<ToolId>("pencil");
  const [activeColor, setActiveColor] = useState(document.palette[3]);
  const [brushSize, setBrushSize] = useState(1);
  const [opacity, setOpacity] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [onionSkin, setOnionSkin] = useState(true);
  const [pixelPerfect, setPixelPerfect] = useState(true);
  const [cursor, setCursor] = useState<CursorPosition>({ x: 12, y: 28 });
  const [zoom, setZoom] = useState(800);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const updater = useAppUpdater();
  const activeFrameIndex = Math.max(
    0,
    document.frames.findIndex((frame) => frame.id === project.state.activeFrameId),
  );
  const modalOpen = settingsOpen
    || newProjectOpen
    || persistence.openConfirmationRequested
    || persistence.recovery !== null;

  const openNewProject = useCallback(() => {
    if (!persistence.isBusy) setNewProjectOpen(true);
  }, [persistence.isBusy]);

  const createNewProject = useCallback(async (options: NewProjectOptions) => {
    const nextDocument = createNewProjectDocument(options);
    const created = await persistence.startNewProject(nextDocument);
    if (!created) return false;

    setNewProjectOpen(false);
    setActiveTool("pencil");
    setActiveColor(nextDocument.palette[3]);
    setBrushSize(1);
    setOpacity(100);
    setIsPlaying(false);
    setZoom(800);
    return true;
  }, [persistence.startNewProject]);

  const shortcutMap = useMemo(
    () => new Map(tools.map((tool) => [tool.shortcut.toLowerCase(), tool.id])),
    [],
  );

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target;
      const typingTarget = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || (target instanceof HTMLElement && target.isContentEditable);
      if (
        event.defaultPrevented
        || event.altKey
        || modalOpen
        || persistence.isBusy
      ) return;

      if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase();
        if (key === "n" && !event.shiftKey) {
          event.preventDefault();
          openNewProject();
          return;
        }
        if (isTextEditingTarget(target)) return;
        if (key === "z") {
          event.preventDefault();
          if (event.shiftKey) project.redo();
          else project.undo();
        } else if (key === "y" && !event.shiftKey) {
          event.preventDefault();
          project.redo();
        }
        return;
      }

      if (typingTarget) return;

      if (event.code === "Space") {
        event.preventDefault();
        setIsPlaying((current) => !current);
        return;
      }

      if (event.key.toLowerCase() === "g") {
        event.preventDefault();
        canvasView.toggleGrid();
        return;
      }

      const tool = shortcutMap.get(event.key.toLowerCase());
      if (tool) setActiveTool(tool);
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [canvasView.toggleGrid, modalOpen, openNewProject, persistence.isBusy, project.redo, project.undo, shortcutMap]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(project.advanceFrame, 1000 / document.animation.fps);
    return () => window.clearInterval(timer);
  }, [document.animation.fps, isPlaying, project.advanceFrame]);

  return (
    <div className="app-shell">
      <TopBar
        activeTool={activeTool}
        canRedo={project.canRedo}
        canUndo={project.canUndo}
        fps={document.animation.fps}
        width={document.width}
        height={document.height}
        isFileBusy={persistence.isBusy}
        onNewProject={openNewProject}
        onOpenProject={() => void persistence.openProject()}
        onRedo={project.redo}
        onOpenSettings={() => setSettingsOpen(true)}
        onSaveProject={() => void persistence.saveProject()}
        onToolChange={setActiveTool}
        onUndo={project.undo}
      />

      <div className="workspace">
        <ToolRail onOpenSettings={() => setSettingsOpen(true)} />
        <ToolPanel
          activeTool={activeTool}
          brushSize={brushSize}
          opacity={opacity}
          pixelPerfect={pixelPerfect}
          onToolChange={setActiveTool}
          onBrushSizeChange={setBrushSize}
          onOpacityChange={setOpacity}
          onPixelPerfectChange={setPixelPerfect}
        />
        <CanvasStage
          activeColor={activeColor}
          activeFrameId={project.state.activeFrameId}
          activeLayerId={project.state.activeLayerId}
          activePixels={project.activePixels}
          activeTool={activeTool}
          brushSize={brushSize}
          canvasView={canvasView.preferences}
          document={document}
          isDirty={project.state.isDirty}
          opacity={opacity}
          pixelPerfect={pixelPerfect}
          zoom={zoom}
          onClearActiveCel={project.clearActiveCel}
          onCanvasBackgroundChange={canvasView.setBackground}
          onCommitActiveCel={project.commitActiveCel}
          onCursorChange={setCursor}
          onGridStyleChange={canvasView.setGridStyle}
          onResetCanvasView={canvasView.resetPreferences}
          onZoomChange={setZoom}
        />
        <Inspector
          activeColor={activeColor}
          activeFrameId={project.state.activeFrameId}
          activeLayerId={project.state.activeLayerId}
          document={document}
          onAddLayer={project.addLayer}
          onColorChange={setActiveColor}
          onDeleteLayer={project.deleteLayer}
          onLayerChange={project.selectLayer}
          onToggleLayerVisibility={project.toggleLayerVisibility}
        />
        <Timeline
          activeFrameId={project.state.activeFrameId}
          document={document}
          isPlaying={isPlaying}
          onionSkin={onionSkin}
          onDeleteFrame={project.deleteFrame}
          onDuplicateFrame={project.duplicateFrame}
          onFpsChangeEnd={project.endFpsChange}
          onFpsChangeStart={project.beginFpsChange}
          onFpsChange={project.setFps}
          onFrameChange={project.selectFrame}
          onOnionSkinChange={setOnionSkin}
          onTogglePlay={() => setIsPlaying((current) => !current)}
        />
      </div>

      <StatusBar
        activeColor={activeColor}
        activeFrameIndex={activeFrameIndex}
        activeTool={activeTool}
        cursor={cursor}
        documentStatus={persistence.documentStatus}
        frameCount={document.frames.length}
        height={document.height}
        width={document.width}
        zoom={zoom}
      />

      <UpdateSettings
        desktopAvailable={updater.desktopAvailable}
        intervalMinutes={updater.intervalMinutes}
        isChecking={updater.toast?.kind === "checking"}
        lastCheckedAt={updater.lastCheckedAt}
        open={settingsOpen}
        onCheckNow={() => void updater.checkForUpdates()}
        onClose={() => setSettingsOpen(false)}
        onIntervalChange={updater.setIntervalMinutes}
      />
      <UpdateToast
        toast={updater.toast}
        onCheckAgain={() => void updater.checkForUpdates()}
        onDismiss={updater.dismissToast}
        onInstall={() => void updater.installUpdate()}
      />
      <ProjectToast
        toast={persistence.toast}
        onDismiss={persistence.dismissToast}
      />
      <ProjectOpenDialog
        open={persistence.openConfirmationRequested}
        projectName={document.name}
        onCancel={persistence.cancelOpenProject}
        onConfirm={() => void persistence.confirmOpenProject()}
      />
      {newProjectOpen && (
        <ProjectNewDialog
          hasUnsavedChanges={project.state.isDirty}
          isBusy={persistence.isBusy}
          projectName={document.name}
          onClose={() => setNewProjectOpen(false)}
          onCreate={createNewProject}
        />
      )}
      <ProjectRecoveryDialog
        recovery={persistence.recovery}
        onDiscard={() => void persistence.discardRecovery()}
        onRestore={persistence.restoreRecovery}
      />
    </div>
  );
}

export default App;
