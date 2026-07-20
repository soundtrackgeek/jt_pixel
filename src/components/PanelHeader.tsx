import { ChevronDown, MoreHorizontal, Plus } from "lucide-react";

interface PanelHeaderProps {
  actionLabel?: string;
  title: string;
  tone?: "violet" | "coral";
  action?: "collapse" | "add" | "menu";
  onAction?: () => void;
}
export function PanelHeader({
  actionLabel,
  title,
  tone = "violet",
  action = "collapse",
  onAction,
}: PanelHeaderProps) {
  const ActionIcon =
    action === "add" ? Plus : action === "menu" ? MoreHorizontal : ChevronDown;

  return (
    <div className={`panel-header panel-header--${tone}`}>
      <span>{title}</span>
      <button
        className="icon-button icon-button--compact"
        aria-label={actionLabel ?? `${title} options`}
        onClick={onAction}
      >
        <ActionIcon size={16} strokeWidth={2.2} />
      </button>
    </div>
  );
}
