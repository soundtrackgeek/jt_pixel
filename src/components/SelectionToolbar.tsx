import {
  ClipboardCopy,
  ClipboardPaste,
  CopyPlus,
  FlipHorizontal2,
  FlipVertical2,
  RotateCw,
  Scissors,
  Trash2,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import type { SelectionClipboard } from "../editor/selection";
import type { PixelSelection } from "../types";

interface SelectionToolbarProps {
  canTransform: boolean;
  clipboard: SelectionClipboard | null;
  selection: PixelSelection | null;
  onCopy: () => void;
  onCut: () => void;
  onDelete: () => void;
  onDeselect: () => void;
  onDuplicate: () => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onPaste: () => void;
  onRotate: () => void;
}

interface ToolbarButtonProps {
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
  testId: string;
}

function ToolbarButton({
  children,
  disabled = false,
  label,
  onClick,
  testId,
}: ToolbarButtonProps) {
  return (
    <button
      aria-label={label}
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      title={label}
    >
      {children}
    </button>
  );
}

export function SelectionToolbar({
  canTransform,
  clipboard,
  selection,
  onCopy,
  onCut,
  onDelete,
  onDeselect,
  onDuplicate,
  onFlipHorizontal,
  onFlipVertical,
  onPaste,
  onRotate,
}: SelectionToolbarProps) {
  if (!selection && !clipboard) return null;
  const hasSelection = selection !== null;
  const width = selection?.width ?? clipboard?.width ?? 0;
  const height = selection?.height ?? clipboard?.height ?? 0;

  return (
    <div
      className="selection-toolbar"
      data-testid="selection-toolbar"
      role="toolbar"
      aria-label="Selection commands"
    >
      <div className="selection-toolbar__readout">
        <span>{hasSelection ? "SELECTION" : "CLIPBOARD"}</span>
        <output>{width} × {height}</output>
      </div>
      <span className="selection-toolbar__divider" />
      <ToolbarButton
        disabled={!hasSelection}
        label="Copy selection (Ctrl+C)"
        onClick={onCopy}
        testId="selection-copy"
      >
        <ClipboardCopy size={15} />
      </ToolbarButton>
      <ToolbarButton
        disabled={!hasSelection || !canTransform}
        label="Cut selection (Ctrl+X)"
        onClick={onCut}
        testId="selection-cut"
      >
        <Scissors size={15} />
      </ToolbarButton>
      <ToolbarButton
        disabled={!clipboard || !canTransform}
        label="Paste selection (Ctrl+V)"
        onClick={onPaste}
        testId="selection-paste"
      >
        <ClipboardPaste size={15} />
      </ToolbarButton>
      <ToolbarButton
        disabled={!hasSelection || !canTransform}
        label="Duplicate selection (Ctrl+D)"
        onClick={onDuplicate}
        testId="selection-duplicate"
      >
        <CopyPlus size={15} />
      </ToolbarButton>
      <span className="selection-toolbar__divider" />
      <ToolbarButton
        disabled={!hasSelection || !canTransform}
        label="Flip selection horizontally"
        onClick={onFlipHorizontal}
        testId="selection-flip-horizontal"
      >
        <FlipHorizontal2 size={15} />
      </ToolbarButton>
      <ToolbarButton
        disabled={!hasSelection || !canTransform}
        label="Flip selection vertically"
        onClick={onFlipVertical}
        testId="selection-flip-vertical"
      >
        <FlipVertical2 size={15} />
      </ToolbarButton>
      <ToolbarButton
        disabled={!hasSelection || !canTransform}
        label="Rotate selection 90 degrees clockwise"
        onClick={onRotate}
        testId="selection-rotate"
      >
        <RotateCw size={15} />
      </ToolbarButton>
      <ToolbarButton
        disabled={!hasSelection || !canTransform}
        label="Delete selected pixels"
        onClick={onDelete}
        testId="selection-delete"
      >
        <Trash2 size={15} />
      </ToolbarButton>
      <ToolbarButton
        disabled={!hasSelection}
        label="Deselect (Escape)"
        onClick={onDeselect}
        testId="selection-deselect"
      >
        <X size={15} />
      </ToolbarButton>
    </div>
  );
}
