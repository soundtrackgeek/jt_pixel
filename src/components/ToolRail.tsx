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
  { label: "Canvas", icon: Grid3X3 },
  { label: "Layers", icon: Layers3 },
  { label: "Colors", icon: Palette, active: true },
  { label: "Tiles", icon: Box },
  { label: "Home", icon: Home },
  { label: "Shapes", icon: Shapes },
  { label: "Effects", icon: Sparkles },
];

export function ToolRail() {
  return (
    <nav className="tool-rail" aria-label="Workspace sections">
      <div className="tool-rail__items">
        {railItems.map(({ label, icon: Icon, active }) => (
          <button
            key={label}
            className={`rail-button ${active ? "is-active" : ""}`}
            aria-label={label}
            title={label}
          >
            <Icon size={19} strokeWidth={2} />
          </button>
        ))}
      </div>
      <button className="rail-button" aria-label="Settings" title="Settings">
        <Settings size={19} />
      </button>
    </nav>
  );
}
