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
export interface Layer {
  id: number;
  name: string;
  blendMode: "Normal" | "Add";
  opacity: number;
  visible: boolean;
  locked?: boolean;
  thumbnailPosition: string;
}

export interface CursorPosition {
  x: number;
  y: number;
}
