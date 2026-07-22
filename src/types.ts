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

export type PrecisionToolId = Extract<ToolId, "line" | "rectangle" | "ellipse">;
export type ShapeMode = "outline" | "filled";

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

export interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Relative cell indices for an irregular selection. Omitted for a full rectangle. */
  mask?: Record<string, true>;
}

export interface PixelSelection extends SelectionBounds {
  documentId: string;
  frameId: string;
  layerId: string;
}
