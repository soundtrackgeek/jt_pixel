import type { LucideIcon } from "lucide-react";

export type ToolId =
  | "pencil"
  | "eraser"
  | "bucket"
  | "line"
  | "rectangle"
  | "ellipse"
  | "select"
  | "move"
  | "magic"
  | "text"
  | "eyedropper"
  | "hand";

export interface EditorTool {
  id: ToolId;
  label: string;
  shortcut: string;
  icon: LucideIcon;
}
export interface CursorPosition {
  x: number;
  y: number;
}
