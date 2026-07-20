import { useEffect, useMemo, useState } from "react";
import { CanvasStage } from "./components/CanvasStage";
import { Inspector } from "./components/Inspector";
import { StatusBar } from "./components/StatusBar";
import { Timeline } from "./components/Timeline";
import { ToolPanel } from "./components/ToolPanel";
import { ToolRail } from "./components/ToolRail";
import { TopBar } from "./components/TopBar";
import { UpdateSettings } from "./components/UpdateSettings";
import { UpdateToast } from "./components/UpdateToast";
import { tools } from "./data/editor";
import { useAppUpdater } from "./hooks/useAppUpdater";
import type { CursorPosition, ToolId } from "./types";

function App() {
  const [activeTool, setActiveTool] = useState<ToolId>("pencil");
  const [activeColor, setActiveColor] = useState("#42c8e3");
  const [activeLayer, setActiveLayer] = useState(1);
  const [activeFrame, setActiveFrame] = useState(2);
  const [brushSize, setBrushSize] = useState(1);
  const [opacity, setOpacity] = useState(100);
  const [fps, setFps] = useState(8);
  const [isPlaying, setIsPlaying] = useState(false);
  const [onionSkin, setOnionSkin] = useState(true);
  const [pixelPerfect, setPixelPerfect] = useState(true);
  const [cursor, setCursor] = useState<CursorPosition>({ x: 12, y: 28 });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const updater = useAppUpdater();

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

    const timer = window.setInterval(
      () => setActiveFrame((current) => (current + 1) % 8),
      1000 / fps,
    );
    return () => window.clearInterval(timer);
  }, [fps, isPlaying]);

  return (
    <div className="app-shell">
      <TopBar
        activeTool={activeTool}
        fps={fps}
        onOpenSettings={() => setSettingsOpen(true)}
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
          activeFrame={activeFrame}
          activeTool={activeTool}
          brushSize={brushSize}
          opacity={opacity}
          pixelPerfect={pixelPerfect}
          onCursorChange={setCursor}
        />
        <Inspector
          activeColor={activeColor}
          activeLayer={activeLayer}
          onColorChange={setActiveColor}
          onLayerChange={setActiveLayer}
        />
        <Timeline
          activeFrame={activeFrame}
          fps={fps}
          isPlaying={isPlaying}
          onionSkin={onionSkin}
          onFrameChange={setActiveFrame}
          onFpsChange={setFps}
          onOnionSkinChange={setOnionSkin}
          onTogglePlay={() => setIsPlaying((current) => !current)}
        />
      </div>

      <StatusBar
        activeColor={activeColor}
        activeFrame={activeFrame}
        activeTool={activeTool}
        cursor={cursor}
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
    </div>
  );
}

export default App;
