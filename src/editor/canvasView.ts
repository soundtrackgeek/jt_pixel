export const CANVAS_VIEW_STORAGE_KEY = "jt-pixel.canvas-view:v1";

export const canvasBackgroundOptions = [
  { id: "checkerboard", label: "Checker" },
  { id: "neutral-dark", label: "Dark" },
  { id: "neutral-mid", label: "Mid" },
  { id: "neutral-light", label: "Light" },
] as const;

export const gridStyleOptions = [
  { id: "off", label: "Off" },
  { id: "subtle", label: "Subtle" },
  { id: "crisp", label: "Crisp" },
  { id: "contrast", label: "Contrast" },
] as const;

export type CanvasBackground = typeof canvasBackgroundOptions[number]["id"];
export type GridStyle = typeof gridStyleOptions[number]["id"];

export interface CanvasViewPreferences {
  background: CanvasBackground;
  gridStyle: GridStyle;
}

export const DEFAULT_CANVAS_VIEW_PREFERENCES: CanvasViewPreferences = {
  background: "checkerboard",
  gridStyle: "crisp",
};

const canvasBackgroundIds = new Set<CanvasBackground>(
  canvasBackgroundOptions.map(({ id }) => id),
);
const gridStyleIds = new Set<GridStyle>(gridStyleOptions.map(({ id }) => id));

export function parseCanvasViewPreferences(serialized: string | null) {
  if (!serialized) return DEFAULT_CANVAS_VIEW_PREFERENCES;

  try {
    const value = JSON.parse(serialized) as Partial<CanvasViewPreferences>;
    if (
      !value
      || typeof value !== "object"
      || !canvasBackgroundIds.has(value.background as CanvasBackground)
      || !gridStyleIds.has(value.gridStyle as GridStyle)
    ) {
      return DEFAULT_CANVAS_VIEW_PREFERENCES;
    }

    return {
      background: value.background as CanvasBackground,
      gridStyle: value.gridStyle as GridStyle,
    };
  } catch {
    return DEFAULT_CANVAS_VIEW_PREFERENCES;
  }
}

export function serializeCanvasViewPreferences(preferences: CanvasViewPreferences) {
  return JSON.stringify({
    background: preferences.background,
    gridStyle: preferences.gridStyle,
  });
}
