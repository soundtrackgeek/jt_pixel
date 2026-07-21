import { useCallback, useEffect, useMemo, useState } from "react";
import { CanvasStage } from "./components/CanvasStage";
import { ColorReplaceDialog } from "./components/ColorReplaceDialog";
import { ExportStudioDialog } from "./components/ExportStudioDialog";
import { ExportToast } from "./components/ExportToast";
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
import {
  createNewProjectDocument,
  isLayerLocked,
  isLayerPresent,
  isLayerVisible,
  type NewProjectOptions,
} from "./editor/project";
import { useAppUpdater } from "./hooks/useAppUpdater";
import { useCanvasViewPreferences } from "./hooks/useCanvasViewPreferences";
import { useColorWorkspace } from "./hooks/useColorWorkspace";
import { useExportPreferences } from "./hooks/useExportPreferences";
import { useProjectExport } from "./hooks/useProjectExport";
import { useProjectDocument } from "./hooks/useProjectDocument";
import { useProjectPersistence } from "./hooks/useProjectPersistence";
import { usePixelSelection } from "./hooks/usePixelSelection";
import type { EyedropperSource } from "./editor/colorOperations";
import type { CursorPosition, ShapeMode, ToolId } from "./types";

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
  const exportPreferences = useExportPreferences();
  const projectExport = useProjectExport({
    activeFrameId: project.state.activeFrameId,
    document,
  });
  const [activeTool, setActiveTool] = useState<ToolId>("pencil");
  const colorWorkspace = useColorWorkspace(
    document.id,
    document.palette[3] ?? document.palette[0],
    document.palette[0],
  );
  const { activeColor } = colorWorkspace;
  const [eyedropperSource, setEyedropperSource] = useState<EyedropperSource>("visible-pixels");
  const [replaceColorSource, setReplaceColorSource] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState(1);
  const [opacity, setOpacity] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [onionSkin, setOnionSkin] = useState(true);
  const [pixelPerfect, setPixelPerfect] = useState(true);
  const [shapeMode, setShapeMode] = useState<ShapeMode>("outline");
  const [cursor, setCursor] = useState<CursorPosition>({ x: 12, y: 28 });
  const [zoom, setZoom] = useState(800);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const updater = useAppUpdater();
  const activeLayerCanSelect = project.activeLayer.kind === "pixel"
    && isLayerPresent(document, project.activeLayer.id, project.state.activeFrameId)
    && isLayerVisible(document, project.activeLayer.id, project.state.activeFrameId);
  const activeLayerCanEdit = activeLayerCanSelect
    && !isLayerLocked(document, project.activeLayer.id, project.state.activeFrameId);
  const {
    clipboard: selectionClipboard,
    selection,
    copy: copySelection,
    cut: cutSelection,
    deselect,
    duplicate: duplicateSelection,
    flip: flipSelection,
    move: moveSelection,
    paste: pasteSelection,
    remove: deleteSelection,
    rotate: rotateSelection,
    select: selectBounds,
    selectAll,
  } = usePixelSelection({
    activeFrameId: project.state.activeFrameId,
    activeLayerId: project.state.activeLayerId,
    activePixels: project.activePixels,
    canEdit: activeLayerCanEdit,
    documentId: document.id,
    height: document.height,
    historyEntryId: project.historyEntryId,
    onCommit: project.commitActiveCel,
    width: document.width,
  });
  const activeFrameIndex = Math.max(
    0,
    document.frames.findIndex((frame) => frame.id === project.state.activeFrameId),
  );
  const modalOpen = settingsOpen
    || newProjectOpen
    || replaceColorSource !== null
    || projectExport.isOpen
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
    setBrushSize(1);
    setOpacity(100);
    setIsPlaying(false);
    setZoom(800);
    deselect();
    return true;
  }, [deselect, persistence.startNewProject]);

  const applyColorReplacement = useCallback((options: Parameters<typeof project.replaceColor>[0]) => {
    project.replaceColor(options);
    colorWorkspace.commitForeground(options.targetColor);
    setReplaceColorSource(null);
  }, [colorWorkspace.commitForeground, project.replaceColor]);

  const undo = useCallback(() => {
    project.undo();
  }, [project.undo]);

  const redo = useCallback(() => {
    project.redo();
  }, [project.redo]);

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
        if (key === "e" && !event.shiftKey) {
          event.preventDefault();
          projectExport.openStudio();
          return;
        }
        if (isTextEditingTarget(target)) return;
        if (key === "a" && !event.shiftKey && activeLayerCanSelect) {
          event.preventDefault();
          selectAll();
        } else if (key === "c" && !event.shiftKey) {
          if (copySelection()) event.preventDefault();
        } else if (key === "x" && !event.shiftKey) {
          if (cutSelection()) event.preventDefault();
        } else if (key === "v" && !event.shiftKey) {
          if (pasteSelection()) event.preventDefault();
        } else if (key === "d" && !event.shiftKey) {
          if (duplicateSelection()) event.preventDefault();
        } else if (key === "z") {
          event.preventDefault();
          if (event.shiftKey) redo();
          else undo();
        } else if (key === "y" && !event.shiftKey) {
          event.preventDefault();
          redo();
        }
        return;
      }

      if (typingTarget) return;

      if (event.key === "Escape" && selection) {
        event.preventDefault();
        deselect();
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selection) {
        if (deleteSelection()) event.preventDefault();
        return;
      }

      if (selection && event.key.startsWith("Arrow")) {
        const distance = event.shiftKey ? 8 : 1;
        const deltaX = event.key === "ArrowLeft"
          ? -distance
          : event.key === "ArrowRight" ? distance : 0;
        const deltaY = event.key === "ArrowUp"
          ? -distance
          : event.key === "ArrowDown" ? distance : 0;
        if (moveSelection(deltaX, deltaY)) event.preventDefault();
        return;
      }

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
  }, [
    activeLayerCanSelect,
    canvasView.toggleGrid,
    copySelection,
    cutSelection,
    deleteSelection,
    deselect,
    duplicateSelection,
    modalOpen,
    moveSelection,
    openNewProject,
    pasteSelection,
    persistence.isBusy,
    projectExport.openStudio,
    redo,
    selectAll,
    selection,
    shortcutMap,
    undo,
  ]);

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
        onOpenExport={projectExport.openStudio}
        onRedo={redo}
        onOpenSettings={() => setSettingsOpen(true)}
        onSaveProject={() => void persistence.saveProject()}
        onToolChange={setActiveTool}
        onUndo={undo}
      />

      <div className="workspace">
        <ToolRail onOpenSettings={() => setSettingsOpen(true)} />
        <ToolPanel
          activeTool={activeTool}
          brushSize={brushSize}
          opacity={opacity}
          pixelPerfect={pixelPerfect}
          selection={selection}
          shapeMode={shapeMode}
          eyedropperSource={eyedropperSource}
          clipboardAvailable={selectionClipboard !== null}
          onToolChange={setActiveTool}
          onBrushSizeChange={setBrushSize}
          onOpacityChange={setOpacity}
          onPixelPerfectChange={setPixelPerfect}
          onShapeModeChange={setShapeMode}
          onEyedropperSourceChange={setEyedropperSource}
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
          clipboard={selectionClipboard}
          selection={selection}
          shapeMode={shapeMode}
          eyedropperSource={eyedropperSource}
          zoom={zoom}
          onClearActiveCel={project.clearActiveCel}
          onCanvasBackgroundChange={canvasView.setBackground}
          onCommitActiveCel={project.commitActiveCel}
          onBackgroundColorSample={colorWorkspace.setBackground}
          onCopySelection={copySelection}
          onCursorChange={setCursor}
          onCutSelection={cutSelection}
          onDeleteSelection={deleteSelection}
          onDeselect={deselect}
          onDuplicateSelection={duplicateSelection}
          onFlipSelection={flipSelection}
          onGridStyleChange={canvasView.setGridStyle}
          onColorSample={colorWorkspace.commitForeground}
          onMoveSelection={moveSelection}
          onPasteSelection={pasteSelection}
          onResetCanvasView={canvasView.resetPreferences}
          onRotateSelection={rotateSelection}
          onSelectionChange={selectBounds}
          onZoomChange={setZoom}
        />
        <Inspector
          activeColor={activeColor}
          backgroundColor={colorWorkspace.backgroundColor}
          activeFrameId={project.state.activeFrameId}
          activeLayerId={project.state.activeLayerId}
          document={document}
          recentColors={colorWorkspace.recentColors}
          onAddLayer={project.addLayer}
          onBackgroundColorChange={colorWorkspace.setBackground}
          onColorChange={colorWorkspace.previewForeground}
          onColorCommit={colorWorkspace.commitForeground}
          onDeleteLayer={project.deleteLayer}
          onLayerChange={project.selectLayer}
          onOpenColorReplace={setReplaceColorSource}
          onPaletteChange={project.setPalette}
          onPickColor={() => setActiveTool("eyedropper")}
          onSwapColors={colorWorkspace.swapColors}
          onToggleLayerLock={project.toggleLayerLock}
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
        selection={selection}
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
      <ExportToast
        toast={projectExport.toast}
        onDismiss={projectExport.dismissToast}
        onReveal={() => void projectExport.revealExport()}
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
      {projectExport.isOpen && (
        <ExportStudioDialog
          activeFrameId={project.state.activeFrameId}
          document={document}
          error={projectExport.error}
          isBusy={projectExport.isBusy}
          preferences={exportPreferences.preferences}
          onClose={projectExport.closeStudio}
          onExport={projectExport.exportArtwork}
          onPreferencesChange={exportPreferences.updatePreferences}
          onResetPreferences={exportPreferences.resetPreferences}
        />
      )}
      {replaceColorSource && (
        <ColorReplaceDialog
          activeFrameId={project.state.activeFrameId}
          activeLayerId={project.state.activeLayerId}
          document={document}
          initialTargetColor={colorWorkspace.backgroundColor}
          selection={selection}
          sourceColor={replaceColorSource}
          onClose={() => setReplaceColorSource(null)}
          onReplace={applyColorReplacement}
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
