import {
  BoxSelect,
  Circle,
  Eraser,
  FilePlus2,
  FolderOpen,
  PaintBucket,
  Pencil,
  Redo2,
  Save,
  Settings,
  Spline,
  Square,
  Undo2,
} from "lucide-react";
import type { ToolId } from "../types";
import { Brand } from "./Brand";

interface TopBarProps {
  activeTool: ToolId;
  canRedo: boolean;
  canUndo: boolean;
  fps: number;
  height: number;
  isFileBusy: boolean;
  onNewProject: () => void;
  onOpenProject: () => void;
  onRedo: () => void;
  onOpenSettings: () => void;
  onSaveProject: () => void;
  onToolChange: (tool: ToolId) => void;
  onUndo: () => void;
  width: number;
}

const commandTools: Array<{
  id: ToolId;
  label: string;
  icon: typeof Pencil;
}> = [
  { id: "pencil", label: "Pencil", icon: Pencil },
  { id: "eraser", label: "Eraser", icon: Eraser },
  { id: "line", label: "Line", icon: Spline },
  { id: "rectangle", label: "Rectangle", icon: Square },
  { id: "ellipse", label: "Ellipse", icon: Circle },
  { id: "bucket", label: "Fill", icon: PaintBucket },
  { id: "select", label: "Select", icon: BoxSelect },
];

export function TopBar({
  activeTool,
  canRedo,
  canUndo,
  fps,
  height,
  isFileBusy,
  onNewProject,
  onOpenProject,
  onRedo,
  onOpenSettings,
  onSaveProject,
  onToolChange,
  onUndo,
  width,
}: TopBarProps) {
  return (
    <header className="topbar">
      <Brand />

      <div className="command-deck" role="toolbar" aria-label="Drawing commands">
        <button
          className="mode-button"
          aria-label="Draw mode"
          data-testid="draw-mode"
        >
          <Pencil size={17} />
          <span>DRAW</span>
        </button>

        <div className="topbar-tools">
          {commandTools.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`icon-button ${activeTool === id ? "is-active" : ""}`}
              aria-label={label}
              title={label}
              onClick={() => onToolChange(id)}
            >
              <Icon size={18} strokeWidth={2.1} />
            </button>
          ))}
        </div>

        <div className="topbar-readout" aria-label="Canvas size">
          {width} × {height}
        </div>
        <div className="topbar-readout" aria-label="Animation speed">
          {fps} fps
        </div>

        <div className="topbar-actions">
          <button
            className="icon-button"
            aria-label="Undo"
            aria-keyshortcuts="Control+Z Meta+Z"
            title="Undo (Ctrl+Z)"
            disabled={!canUndo || isFileBusy}
            onClick={onUndo}
          >
            <Undo2 size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Redo"
            aria-keyshortcuts="Control+Y Meta+Y Control+Shift+Z Meta+Shift+Z"
            title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
            disabled={!canRedo || isFileBusy}
            onClick={onRedo}
          >
            <Redo2 size={18} />
          </button>
          <span className="command-divider" />
          <button
            className="icon-button"
            aria-label="New project"
            aria-keyshortcuts="Control+N Meta+N"
            title="New project (Ctrl+N)"
            disabled={isFileBusy}
            data-busy={isFileBusy}
            onClick={onNewProject}
          >
            <FilePlus2 size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Open project"
            title="Open project (Ctrl+O)"
            disabled={isFileBusy}
            data-busy={isFileBusy}
            onClick={onOpenProject}
          >
            <FolderOpen size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Save project"
            title="Save project (Ctrl+S)"
            disabled={isFileBusy}
            data-busy={isFileBusy}
            onClick={onSaveProject}
          >
            <Save size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Settings"
            title="Settings"
            onClick={onOpenSettings}
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
