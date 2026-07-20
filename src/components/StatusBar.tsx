import type { CursorPosition, ToolId } from "../types";

interface StatusBarProps {
  activeColor: string;
  activeFrameIndex: number;
  activeTool: ToolId;
  cursor: CursorPosition;
  documentStatus: string;
  frameCount: number;
  height: number;
  width: number;
  zoom: number;
}

export function StatusBar({
  activeColor,
  activeFrameIndex,
  activeTool,
  cursor,
  documentStatus,
  frameCount,
  height,
  width,
  zoom,
}: StatusBarProps) {
  return (
    <footer className="statusbar">
      <div className="statusbar__group">
        <span>{width} × {height}</span>
        <span>Frame {activeFrameIndex + 1} / {frameCount}</span>
        <span>Zoom {zoom}%</span>
        <span>X: {cursor.x}, Y: {cursor.y}</span>
        <span className="statusbar__tool">{activeTool}</span>
        <span className="statusbar__document-state">{documentStatus}</span>
      </div>
      <div className="statusbar__group statusbar__color">
        <span>RGB</span>
        <span>{activeColor.toUpperCase()}</span>
        <i style={{ backgroundColor: activeColor }} />
      </div>
    </footer>
  );
}
