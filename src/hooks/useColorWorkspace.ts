import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { normalizeHexColor } from "../editor/colorOperations";

interface ColorWorkspaceState {
  background: string;
  foreground: string;
  recent: string[];
}

function initialState(foreground: string, background: string): ColorWorkspaceState {
  return {
    foreground,
    background,
    recent: [foreground],
  };
}

export function useColorWorkspace(
  documentId: string,
  defaultForeground: string,
  defaultBackground: string,
) {
  const defaultsRef = useRef({ defaultBackground, defaultForeground });
  defaultsRef.current = { defaultBackground, defaultForeground };
  const [state, setState] = useState(() => initialState(defaultForeground, defaultBackground));

  useLayoutEffect(() => {
    const defaults = defaultsRef.current;
    setState(initialState(defaults.defaultForeground, defaults.defaultBackground));
  }, [documentId]);

  const previewForeground = useCallback((color: string) => {
    const normalized = normalizeHexColor(color);
    if (!normalized) return false;
    setState((current) => current.foreground === normalized
      ? current
      : { ...current, foreground: normalized });
    return true;
  }, []);

  const commitForeground = useCallback((color: string) => {
    const normalized = normalizeHexColor(color);
    if (!normalized) return false;
    setState((current) => ({
      ...current,
      foreground: normalized,
      recent: [
        normalized,
        ...current.recent.filter((candidate) => candidate !== normalized),
      ].slice(0, 8),
    }));
    return true;
  }, []);

  const setBackground = useCallback((color: string) => {
    const normalized = normalizeHexColor(color);
    if (!normalized) return false;
    setState((current) => current.background === normalized
      ? current
      : { ...current, background: normalized });
    return true;
  }, []);

  const swapColors = useCallback(() => {
    setState((current) => ({
      foreground: current.background,
      background: current.foreground,
      recent: [
        current.background,
        ...current.recent.filter((candidate) => candidate !== current.background),
      ].slice(0, 8),
    }));
  }, []);

  return {
    backgroundColor: state.background,
    activeColor: state.foreground,
    recentColors: state.recent,
    commitForeground,
    previewForeground,
    setBackground,
    swapColors,
  };
}
