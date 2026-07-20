import { ChevronDown, MoreHorizontal, Plus } from "lucide-react";

interface PanelHeaderProps {
  title: string;
  tone?: "violet" | "coral";
  action?: "collapse" | "add" | "menu";
}
export function PanelHeader({
  title,
  tone = "violet",
  action = "collapse",
}: PanelHeaderProps) {
  const ActionIcon =
    action === "add" ? Plus : action === "menu" ? MoreHorizontal : ChevronDown;

  return (
    <div className={`panel-header panel-header--${tone}`}>
      <span>{title}</span>
      <button className="icon-button icon-button--compact" aria-label={`${title} options`}>
        <ActionIcon size={16} strokeWidth={2.2} />
      </button>
    </div>
  );
}
