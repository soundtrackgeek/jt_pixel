import {
  createInitialEditorState,
  projectReducer,
  type EditorDocumentState,
  type ProjectAction,
} from "./project";

export const HISTORY_LIMIT = 100;

interface HistoryEntry {
  id: number;
  state: EditorDocumentState;
  // Navigation can change the live state without changing where this edit should restore.
  restoreState: EditorDocumentState;
}

export interface EditorHistoryState {
  past: HistoryEntry[];
  present: HistoryEntry;
  future: HistoryEntry[];
  nextEntryId: number;
  savedEntryId: number | null;
}

export type EditorHistoryAction =
  | { type: "history/apply"; action: ProjectAction }
  | { type: "history/undo" }
  | { type: "history/redo" };

const TRACKED_ACTIONS = new Set<ProjectAction["type"]>([
  "cel/commit",
  "cel/clear",
  "layer/toggle-visibility",
  "layer/add",
  "layer/delete",
  "frame/duplicate",
  "frame/delete",
  "animation/set-fps",
]);

export function createInitialHistoryState(): EditorHistoryState {
  const state = createInitialEditorState();
  return {
    past: [],
    present: { id: 0, state, restoreState: state },
    future: [],
    nextEntryId: 1,
    savedEntryId: 0,
  };
}

function activateEntry(
  entry: HistoryEntry,
  savedEntryId: number | null,
  revision: number,
  documentName: string,
): HistoryEntry {
  return {
    ...entry,
    state: {
      ...entry.restoreState,
      document: {
        ...entry.restoreState.document,
        // Saving As changes the displayed file name, not artwork history.
        name: documentName,
      },
      isDirty: entry.id !== savedEntryId,
      revision,
    },
  };
}

function applyProjectAction(
  history: EditorHistoryState,
  action: ProjectAction,
): EditorHistoryState {
  const nextState = projectReducer(history.present.state, action);
  if (nextState === history.present.state) return history;

  if (action.type === "document/replace") {
    const id = history.nextEntryId;
    const present = {
      id,
      state: nextState,
      restoreState: nextState,
    };
    return {
      past: [],
      present,
      future: [],
      nextEntryId: id + 1,
      savedEntryId: nextState.isDirty ? null : id,
    };
  }

  if (action.type === "document/mark-saved") {
    return {
      ...history,
      present: {
        ...history.present,
        state: nextState,
        restoreState: nextState,
      },
      savedEntryId: history.present.id,
    };
  }

  if (!TRACKED_ACTIONS.has(action.type)) {
    return {
      ...history,
      present: {
        ...history.present,
        state: {
          ...nextState,
          isDirty: history.present.id !== history.savedEntryId,
        },
      },
    };
  }

  const id = history.nextEntryId;
  return {
    past: [
      ...history.past,
      { ...history.present, restoreState: history.present.state },
    ].slice(-HISTORY_LIMIT),
    present: {
      id,
      state: {
        ...nextState,
        isDirty: id !== history.savedEntryId,
      },
      restoreState: {
        ...nextState,
        isDirty: id !== history.savedEntryId,
      },
    },
    future: [],
    nextEntryId: id + 1,
    savedEntryId: history.savedEntryId,
  };
}

export function editorHistoryReducer(
  history: EditorHistoryState,
  action: EditorHistoryAction,
): EditorHistoryState {
  switch (action.type) {
    case "history/apply":
      return applyProjectAction(history, action.action);

    case "history/undo": {
      const previous = history.past.at(-1);
      if (!previous) return history;
      return {
        ...history,
        past: history.past.slice(0, -1),
        present: activateEntry(
          previous,
          history.savedEntryId,
          history.present.state.revision + 1,
          history.present.state.document.name,
        ),
        future: [history.present, ...history.future].slice(0, HISTORY_LIMIT),
      };
    }

    case "history/redo": {
      const next = history.future[0];
      if (!next) return history;
      return {
        ...history,
        past: [...history.past, history.present].slice(-HISTORY_LIMIT),
        present: activateEntry(
          next,
          history.savedEntryId,
          history.present.state.revision + 1,
          history.present.state.document.name,
        ),
        future: history.future.slice(1),
      };
    }
  }
}
