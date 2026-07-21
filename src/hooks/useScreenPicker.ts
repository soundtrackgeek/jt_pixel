import { useCallback, useEffect, useRef, useState } from "react";
import {
  nativeScreenPickerAvailable,
  pickScreenColor,
  type ScreenPickRole,
} from "../services/screenPicker";

export interface ScreenPickerToastModel {
  color?: string;
  detail: string;
  kind: "desktop-only" | "error" | "success";
  title: string;
}

interface UseScreenPickerOptions {
  onBackgroundColor: (color: string) => void;
  onForegroundColor: (color: string) => void;
}

function roleLabel(role: ScreenPickRole) {
  return role === "background" ? "background" : "foreground";
}

export function useScreenPicker({
  onBackgroundColor,
  onForegroundColor,
}: UseScreenPickerOptions) {
  const [isPicking, setIsPicking] = useState(false);
  const [toast, setToast] = useState<ScreenPickerToastModel | null>(null);
  const busyRef = useRef(false);
  const desktopAvailable = nativeScreenPickerAvailable();

  useEffect(() => {
    if (toast?.kind === "error" || !toast) return;
    const timer = window.setTimeout(() => setToast(null), 5_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const pick = useCallback(async () => {
    if (busyRef.current) return null;
    if (!desktopAvailable) {
      setToast({
        kind: "desktop-only",
        title: "Desktop picker required",
        detail: "Install or run the Windows app to sample colors outside JT Pixel.",
      });
      return null;
    }

    busyRef.current = true;
    setIsPicking(true);
    setToast(null);
    try {
      const result = await pickScreenColor();
      if (!result) return null;
      if (result.role === "background") onBackgroundColor(result.color);
      else onForegroundColor(result.color);
      setToast({
        color: result.color,
        kind: "success",
        title: `${result.color.toUpperCase()} captured`,
        detail: `${roleLabel(result.role)} color · screen X ${result.x}, Y ${result.y}`,
      });
      return result;
    } catch (caught) {
      setToast({
        kind: "error",
        title: "Screen color couldn’t be picked",
        detail: caught instanceof Error ? caught.message : String(caught),
      });
      return null;
    } finally {
      busyRef.current = false;
      setIsPicking(false);
    }
  }, [desktopAvailable, onBackgroundColor, onForegroundColor]);

  const dismissToast = useCallback(() => setToast(null), []);

  return {
    desktopAvailable,
    dismissToast,
    isPicking,
    pick,
    toast,
  };
}
