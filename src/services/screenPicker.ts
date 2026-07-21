import { invoke, isTauri } from "@tauri-apps/api/core";

export type ScreenPickRole = "background" | "foreground";

export interface ScreenPickResult {
  color: string;
  role: ScreenPickRole;
  x: number;
  y: number;
}

const OPAQUE_HEX = /^#[0-9a-f]{6}$/i;

export function nativeScreenPickerAvailable() {
  return isTauri();
}

export function parseScreenPickResult(value: unknown): ScreenPickResult {
  if (!value || typeof value !== "object") {
    throw new Error("The native screen picker returned an invalid result.");
  }
  const candidate = value as Partial<ScreenPickResult>;
  if (
    typeof candidate.color !== "string"
    || !OPAQUE_HEX.test(candidate.color)
    || (candidate.role !== "foreground" && candidate.role !== "background")
    || !Number.isInteger(candidate.x)
    || !Number.isInteger(candidate.y)
  ) {
    throw new Error("The native screen picker returned an invalid result.");
  }
  return {
    color: candidate.color.toLowerCase(),
    role: candidate.role,
    x: candidate.x as number,
    y: candidate.y as number,
  };
}

export async function pickScreenColor(): Promise<ScreenPickResult | null> {
  if (!isTauri()) {
    throw new Error("System-wide color picking is available in the Windows desktop app.");
  }
  const result = await invoke<unknown>("start_screen_picker");
  return result === null ? null : parseScreenPickResult(result);
}
