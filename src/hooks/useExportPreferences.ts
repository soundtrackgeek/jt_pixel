import { useEffect, useState } from "react";
import {
  DEFAULT_EXPORT_PREFERENCES,
  EXPORT_PREFERENCES_STORAGE_KEY,
  parseExportPreferences,
  serializeExportPreferences,
  type ExportPreferences,
} from "../editor/export";

function readSavedPreferences() {
  try {
    return parseExportPreferences(
      window.localStorage.getItem(EXPORT_PREFERENCES_STORAGE_KEY),
    );
  } catch {
    return DEFAULT_EXPORT_PREFERENCES;
  }
}

export function useExportPreferences() {
  const [preferences, setPreferences] = useState(readSavedPreferences);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        EXPORT_PREFERENCES_STORAGE_KEY,
        serializeExportPreferences(preferences),
      );
    } catch {
      // Export preferences remain available for this session when storage is blocked.
    }
  }, [preferences]);

  function updatePreferences(next: ExportPreferences) {
    setPreferences(next);
  }

  function resetPreferences() {
    setPreferences(DEFAULT_EXPORT_PREFERENCES);
  }

  return { preferences, resetPreferences, updatePreferences };
}
