import type { CursorPosition, ToolId } from "../types";

interface StatusBarProps {
  activeColor: string;
  activeFrame: number;
  activeTool: ToolId;
  cursor: CursorPosition;
}

export function StatusBar({
  activeColor,
  activeFrame,
  activeTool,
  cursor,
}: StatusBarProps) {
  return (
    <footer className="statusbar">
      <div className="statusbar__group">
        <span>64 × 64</span>
        <span>Frame {activeFrame + 1} / 8</span>
        <span>Zoom 800%</span>
        <span>X: {cursor.x}, Y: {cursor.y}</span>
        <span className="statusbar__tool">{activeTool}</span>
      </div>
      <div className="statusbar__group statusbar__color">
        <span>RGB</span>
        <span>{activeColor.toUpperCase()}</span>
        <i style={{ backgroundColor: activeColor }} />
      </div>
    </footer>
  );
}
