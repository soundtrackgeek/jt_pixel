import {
  BoxSelect,
  Circle,
  Eraser,
  Hand,
  Move,
  PaintBucket,
  Pencil,
  Pipette,
  RectangleHorizontal,
  Sparkles,
  Spline,
  Type,
} from "lucide-react";
import type { EditorTool } from "../types";

export const tools: EditorTool[] = [
  { id: "pencil", label: "Pencil", shortcut: "P", icon: Pencil },
  { id: "eraser", label: "Eraser", shortcut: "E", icon: Eraser },
  { id: "bucket", label: "Bucket", shortcut: "B", icon: PaintBucket },
  { id: "line", label: "Line", shortcut: "L", icon: Spline },
  { id: "rectangle", label: "Rect", shortcut: "R", icon: RectangleHorizontal },
  { id: "ellipse", label: "Ellipse", shortcut: "O", icon: Circle },
  { id: "select", label: "Select", shortcut: "S", icon: BoxSelect },
  { id: "move", label: "Move", shortcut: "M", icon: Move },
  { id: "magic", label: "Magic", shortcut: "W", icon: Sparkles },
  { id: "text", label: "Text", shortcut: "T", icon: Type },
  { id: "eyedropper", label: "Pick", shortcut: "I", icon: Pipette },
  { id: "hand", label: "Hand", shortcut: "H", icon: Hand },
];
