import { useEffect, useMemo, useState } from "react";
import { CanvasStage } from "./components/CanvasStage";
import { Inspector } from "./components/Inspector";
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
import { useAppUpdater } from "./hooks/useAppUpdater";
import { useProjectDocument } from "./hooks/useProjectDocument";
import { useProjectPersistence } from "./hooks/useProjectPersistence";
import type { CursorPosition, ToolId } from "./types";

function App() {
  const project = useProjectDocument();
  const persistence = useProjectPersistence({
    state: project.state,
    markSaved: project.markSaved,
    replaceDocument: project.replaceDocument,
  });
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
  const updater = useAppUpdater();
  const activeFrameIndex = Math.max(
    0,
    document.frames.findIndex((frame) => frame.id === project.state.activeFrameId),
  );

  const shortcutMap = useMemo(
    () => new Map(tools.map((tool) => [tool.shortcut.toLowerCase(), tool.id])),
    [],
  );

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) return;

      if (event.code === "Space") {
        event.preventDefault();
        setIsPlaying((current) => !current);
        return;
      }

      const tool = shortcutMap.get(event.key.toLowerCase());
      if (tool) setActiveTool(tool);
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [shortcutMap]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(project.advanceFrame, 1000 / document.animation.fps);
    return () => window.clearInterval(timer);
  }, [document.animation.fps, isPlaying, project.advanceFrame]);

  return (
    <div className="app-shell">
      <TopBar
        activeTool={activeTool}
        fps={document.animation.fps}
        width={document.width}
        height={document.height}
        isFileBusy={persistence.isBusy}
        onOpenProject={() => void persistence.openProject()}
        onOpenSettings={() => setSettingsOpen(true)}
        onSaveProject={() => void persistence.saveProject()}
        onToolChange={setActiveTool}
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
          document={document}
          isDirty={project.state.isDirty}
          opacity={opacity}
          pixelPerfect={pixelPerfect}
          zoom={zoom}
          onClearActiveCel={project.clearActiveCel}
          onCommitActiveCel={project.commitActiveCel}
          onCursorChange={setCursor}
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
      <ProjectRecoveryDialog
        recovery={persistence.recovery}
        onDiscard={() => void persistence.discardRecovery()}
        onRestore={persistence.restoreRecovery}
      />
    </div>
  );
}

export default App;
