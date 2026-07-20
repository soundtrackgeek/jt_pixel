import { useCallback, useEffect, useRef, useState } from "react";
import {
  CANVAS_VIEW_STORAGE_KEY,
  DEFAULT_CANVAS_VIEW_PREFERENCES,
  parseCanvasViewPreferences,
  serializeCanvasViewPreferences,
  type CanvasBackground,
  type GridStyle,
} from "../editor/canvasView";

function readSavedPreferences() {
  try {
    return parseCanvasViewPreferences(
      window.localStorage.getItem(CANVAS_VIEW_STORAGE_KEY),
    );
  } catch {
    return DEFAULT_CANVAS_VIEW_PREFERENCES;
  }
}

export function useCanvasViewPreferences() {
  const [preferences, setPreferences] = useState(readSavedPreferences);
  const lastVisibleGridStyleRef = useRef<GridStyle>(
    preferences.gridStyle === "off" ? "crisp" : preferences.gridStyle,
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(
        CANVAS_VIEW_STORAGE_KEY,
        serializeCanvasViewPreferences(preferences),
      );
    } catch {
      // View preferences remain available for this session when storage is blocked.
    }
  }, [preferences]);

  const setBackground = useCallback((background: CanvasBackground) => {
    setPreferences((current) => ({ ...current, background }));
  }, []);

  const setGridStyle = useCallback((gridStyle: GridStyle) => {
    if (gridStyle !== "off") lastVisibleGridStyleRef.current = gridStyle;
    setPreferences((current) => ({ ...current, gridStyle }));
  }, []);

  const toggleGrid = useCallback(() => {
    setPreferences((current) => {
      if (current.gridStyle === "off") {
        return { ...current, gridStyle: lastVisibleGridStyleRef.current };
      }
      lastVisibleGridStyleRef.current = current.gridStyle;
      return { ...current, gridStyle: "off" };
    });
  }, []);

  const resetPreferences = useCallback(() => {
    lastVisibleGridStyleRef.current = DEFAULT_CANVAS_VIEW_PREFERENCES.gridStyle;
    setPreferences(DEFAULT_CANVAS_VIEW_PREFERENCES);
  }, []);

  return {
    preferences,
    resetPreferences,
    setBackground,
    setGridStyle,
    toggleGrid,
  };
}
