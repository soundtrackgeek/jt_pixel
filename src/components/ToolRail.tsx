import {
  Box,
  Grid3X3,
  Home,
  Layers3,
  Palette,
  Settings,
  Shapes,
  Sparkles,
} from "lucide-react";

const railItems = [
  { label: "Canvas", icon: Grid3X3, section: "canvas" as const },
  { label: "Layers", icon: Layers3 },
  { label: "Colors", icon: Palette },
  { label: "Tiles", icon: Box, section: "tiles" as const },
  { label: "Home", icon: Home },
  { label: "Shapes", icon: Shapes },
  { label: "Effects", icon: Sparkles },
];

interface ToolRailProps {
  activeSection: "canvas" | "tiles";
  onOpenSettings: () => void;
  onSectionChange: (section: "canvas" | "tiles") => void;
}

export function ToolRail({ activeSection, onOpenSettings, onSectionChange }: ToolRailProps) {
  return (
    <nav className="tool-rail" aria-label="Workspace sections">
      <div className="tool-rail__items">
        {railItems.map(({ label, icon: Icon, section }) => (
          <button
            key={label}
            className={`rail-button ${section === activeSection ? "is-active" : ""}`}
            aria-label={label}
            aria-pressed={section ? section === activeSection : undefined}
            title={label}
            onClick={section ? () => onSectionChange(section) : undefined}
          >
            <Icon size={19} strokeWidth={2} />
          </button>
        ))}
      </div>
      <button
        className="rail-button"
        aria-label="Settings"
        title="Settings"
        onClick={onOpenSettings}
      >
        <Settings size={19} />
      </button>
    </nav>
  );
}
