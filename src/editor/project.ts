import {
  normalizeHexColor,
  normalizePaletteColors,
  replaceDocumentColor,
  type ColorReplacementScope,
} from "./colorOperations";
import type { SelectionBounds } from "../types";
import {
  DEFAULT_TILE_WORKSPACE_SETTINGS,
  type TileWorkspaceSettings,
} from "./tiles";

export const PROJECT_SCHEMA_VERSION = 1 as const;
export const MIN_CANVAS_DIMENSION = 1;
export const MAX_CANVAS_DIMENSION = 512;
export const MAX_PALETTE_COLORS = 256;
export const MIN_FRAME_HOLD = 1;
export const MAX_FRAME_HOLD = 12;
export const CANVAS_PRESETS = [16, 32, 64, 128] as const;

export type PixelMap = Record<string, string>;
const EMPTY_PIXEL_MAP: PixelMap = Object.freeze({});

export interface ProjectLayer {
  id: string;
  name: string;
  kind: "pixel" | "reference";
  blendMode: "normal" | "add";
  opacity: number;
  visible: boolean;
  locked?: boolean;
}

export interface ProjectFrame {
  id: string;
  name: string;
  referenceOffset: string;
  hold: number;
}

export interface PixelCel {
  layerId: string;
  frameId: string;
  pixels: PixelMap;
}

export interface ProjectDocument {
  schemaVersion: typeof PROJECT_SCHEMA_VERSION;
  id: string;
  name: string;
  width: number;
  height: number;
  palette: string[];
  layers: ProjectLayer[];
  frames: ProjectFrame[];
  cels: Record<string, PixelCel>;
  frameLayerVisibility: Record<string, boolean>;
  frameLayerPresence: Record<string, boolean>;
  frameLayerLocks: Record<string, boolean>;
  animation: {
    fps: number;
    loop: boolean;
  };
  workspace: {
    activeFrameId: string;
    tiles: TileWorkspaceSettings;
  };
  createdAt: string;
  updatedAt: string;
}

export type NewProjectOptions =
  | {
      template: "blank";
      name: string;
      width: number;
      height: number;
      now?: string;
    }
  | {
      template: "courier";
      name: string;
      now?: string;
    };

export interface EditorDocumentState {
  document: ProjectDocument;
  activeLayerId: string;
  activeFrameId: string;
  frameLayerSelection: Record<string, string>;
  isDirty: boolean;
  revision: number;
}

export type ProjectAction =
  | { type: "cel/commit"; layerId: string; frameId: string; pixels: PixelMap }
  | { type: "cel/clear"; layerId: string; frameId: string }
  | { type: "layer/select"; layerId: string }
  | { type: "layer/toggle-visibility"; layerId: string; frameId: string }
  | { type: "layer/toggle-lock"; layerId: string; frameId: string }
  | { type: "layer/add"; layer: ProjectLayer; frameId: string }
  | { type: "layer/delete"; layerId: string; frameId: string }
  | { type: "frame/select"; frameId: string }
  | { type: "frame/advance" }
  | { type: "frame/duplicate"; frameId: string; duplicateId: string }
  | { type: "frame/duplicate-many"; frameIds: string[]; duplicateIds: string[] }
  | { type: "frame/delete"; frameId: string }
  | { type: "frame/delete-many"; frameIds: string[] }
  | { type: "frame/reorder"; frameIds: string[]; targetIndex: number }
  | { type: "frame/set-hold"; frameIds: string[]; hold: number }
  | { type: "animation/set-fps"; fps: number }
  | { type: "animation/toggle-loop" }
  | { type: "tiles/set-settings"; settings: Partial<TileWorkspaceSettings> }
  | { type: "palette/set"; palette: string[] }
  | {
      type: "color/replace";
      sourceColor: string;
      targetColor: string;
      scope: ColorReplacementScope;
      bounds?: SelectionBounds;
      updatePaletteIndex?: number;
    }
  | { type: "document/replace"; document: ProjectDocument; dirty?: boolean }
  | { type: "document/mark-saved"; document?: ProjectDocument };

export const DEFAULT_PALETTE = [
  "#152034",
  "#382965",
  "#465cc8",
  "#42c8e3",
  "#c9f53d",
  "#99d34d",
  "#f4c85f",
  "#ff8a52",
  "#ff615d",
  "#cc3d65",
  "#ec63c8",
  "#ffe9c8",
  "#f2f8f6",
];

const REFERENCE_OFFSETS = [
  "46% 50%",
  "48% 50%",
  "50% 50%",
  "52% 50%",
  "54% 50%",
  "52% 50%",
  "49% 50%",
  "47% 50%",
];

export function createProjectId(prefix: string) {
  const suffix = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${suffix}`;
}

export function getNewProjectNameError(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "Give the project a name.";
  if (/[<>:\"/\\|?*\u0000-\u001f]/.test(trimmed)) {
    return "Use a name without file-system symbols.";
  }
  if (/[. ]$/.test(trimmed)) return "The name cannot end with a dot or space.";
  const fileName = trimmed.toLowerCase().endsWith(".jtp")
    ? trimmed
    : `${trimmed}.jtp`;
  return fileName.length > 255 ? "Keep the project name under 252 characters." : null;
}

export function normalizeNewProjectName(name: string) {
  const error = getNewProjectNameError(name);
  if (error) throw new Error(error);
  const trimmed = name.trim();
  return trimmed.toLowerCase().endsWith(".jtp") ? trimmed : `${trimmed}.jtp`;
}

export function isValidCanvasDimension(value: number) {
  return Number.isInteger(value)
    && value >= MIN_CANVAS_DIMENSION
    && value <= MAX_CANVAS_DIMENSION;
}

export function celKey(layerId: string, frameId: string) {
  return `${layerId}::${frameId}`;
}

export function isLayerVisible(
  document: ProjectDocument,
  layerId: string,
  frameId: string,
) {
  const layer = document.layers.find((candidate) => candidate.id === layerId);
  return document.frameLayerVisibility[celKey(layerId, frameId)] ?? layer?.visible ?? false;
}

export function isLayerPresent(
  document: ProjectDocument,
  layerId: string,
  frameId: string,
) {
  return document.frameLayerPresence[celKey(layerId, frameId)] ?? true;
}

export function isLayerLocked(
  document: ProjectDocument,
  layerId: string,
  frameId: string,
) {
  const layer = document.layers.find((candidate) => candidate.id === layerId);
  return layer?.locked === true
    || (layer?.kind === "pixel" && (document.frameLayerLocks[celKey(layerId, frameId)] ?? false));
}

export function getCelPixels(
  document: ProjectDocument,
  layerId: string,
  frameId: string,
): PixelMap {
  return document.cels[celKey(layerId, frameId)]?.pixels ?? EMPTY_PIXEL_MAP;
}

export function createProjectDocument(now = new Date().toISOString()): ProjectDocument {
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: "project-courier-bloom",
    name: "courier-bloom.jtp",
    width: 64,
    height: 64,
    palette: [...DEFAULT_PALETTE],
    layers: [
      { id: "layer-highlights", name: "Highlights", kind: "pixel", blendMode: "add", opacity: 84, visible: true },
      { id: "layer-details", name: "Details", kind: "pixel", blendMode: "normal", opacity: 100, visible: true },
      { id: "layer-color", name: "Color", kind: "pixel", blendMode: "normal", opacity: 100, visible: true },
      { id: "layer-reference", name: "Courier reference", kind: "reference", blendMode: "normal", opacity: 100, visible: true, locked: true },
    ],
    frames: REFERENCE_OFFSETS.map((referenceOffset, index) => ({
      id: `frame-${index + 1}`,
      name: `Frame ${index + 1}`,
      referenceOffset,
      hold: 1,
    })),
    cels: {},
    frameLayerVisibility: {},
    frameLayerPresence: {},
    frameLayerLocks: {},
    animation: { fps: 8, loop: true },
    workspace: {
      activeFrameId: "frame-3",
      tiles: { ...DEFAULT_TILE_WORKSPACE_SETTINGS },
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function createNewProjectDocument(options: NewProjectOptions): ProjectDocument {
  const now = options.now ?? new Date().toISOString();
  const name = normalizeNewProjectName(options.name);

  if (options.template === "courier") {
    return {
      ...createProjectDocument(now),
      id: createProjectId("project"),
      name,
    };
  }

  if (!isValidCanvasDimension(options.width) || !isValidCanvasDimension(options.height)) {
    throw new RangeError(
      `Canvas dimensions must be whole numbers between ${MIN_CANVAS_DIMENSION} and ${MAX_CANVAS_DIMENSION}.`,
    );
  }

  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: createProjectId("project"),
    name,
    width: options.width,
    height: options.height,
    palette: [...DEFAULT_PALETTE],
    layers: [
      {
        id: "layer-1",
        name: "Layer 1",
        kind: "pixel",
        blendMode: "normal",
        opacity: 100,
        visible: true,
      },
    ],
    frames: [
      {
        id: "frame-1",
        name: "Frame 1",
        referenceOffset: "50% 50%",
        hold: 1,
      },
    ],
    cels: {},
    frameLayerVisibility: {},
    frameLayerPresence: {},
    frameLayerLocks: {},
    animation: { fps: 8, loop: true },
    workspace: {
      activeFrameId: "frame-1",
      tiles: { ...DEFAULT_TILE_WORKSPACE_SETTINGS },
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function createInitialEditorState(): EditorDocumentState {
  const document = createProjectDocument();
  return createEditorStateForDocument(document);
}

export function createEditorStateForDocument(
  document: ProjectDocument,
  isDirty = false,
  revision = 0,
  preferredFrameId?: string,
): EditorDocumentState {
  const requestedFrameId = preferredFrameId ?? document.workspace.activeFrameId;
  const activeFrameId = document.frames.find(
    (frame) => frame.id === requestedFrameId,
  )?.id ?? document.frames[0].id;
  const frameLayerSelection = Object.fromEntries(
    document.frames.map((frame) => [
      frame.id,
      layerForFrame(document, frame.id, "layer-details"),
    ]),
  );
  return {
    document,
    activeLayerId: frameLayerSelection[activeFrameId],
    activeFrameId,
    frameLayerSelection,
    isDirty,
    revision,
  };
}

function changed(state: EditorDocumentState, document: ProjectDocument): EditorDocumentState {
  return {
    ...state,
    document: { ...document, updatedAt: new Date().toISOString() },
    isDirty: true,
    revision: state.revision + 1,
  };
}

function isEditablePixelLayer(
  document: ProjectDocument,
  layerId: string,
  frameId: string,
) {
  const layer = document.layers.find((candidate) => candidate.id === layerId);
  return layer?.kind === "pixel" && !isLayerLocked(document, layerId, frameId);
}

function layerForFrame(
  document: ProjectDocument,
  frameId: string,
  preferredLayerId: string,
) {
  const preferred = document.layers.find(
    (layer) => layer.id === preferredLayerId && isLayerPresent(document, layer.id, frameId),
  );
  return preferred?.id ?? document.layers.find(
    (layer) => layer.kind === "pixel" && isLayerPresent(document, layer.id, frameId),
  )?.id ?? document.layers.find(
    (layer) => isLayerPresent(document, layer.id, frameId),
  )?.id ?? document.layers[0].id;
}

export function projectReducer(
  state: EditorDocumentState,
  action: ProjectAction,
): EditorDocumentState {
  const document = state.document;

  switch (action.type) {
    case "cel/commit": {
      if (
        !isEditablePixelLayer(document, action.layerId, action.frameId) ||
        !document.frames.some((frame) => frame.id === action.frameId) ||
        !isLayerPresent(document, action.layerId, action.frameId)
      ) return state;

      const key = celKey(action.layerId, action.frameId);
      return changed(state, {
        ...document,
        cels: {
          ...document.cels,
          [key]: {
            layerId: action.layerId,
            frameId: action.frameId,
            pixels: { ...action.pixels },
          },
        },
      });
    }

    case "cel/clear": {
      if (
        !isEditablePixelLayer(document, action.layerId, action.frameId) ||
        !isLayerPresent(document, action.layerId, action.frameId)
      ) return state;
      const key = celKey(action.layerId, action.frameId);
      if (!document.cels[key]) return state;
      const cels = { ...document.cels };
      delete cels[key];
      return changed(state, { ...document, cels });
    }

    case "layer/select":
      return document.layers.some(
        (layer) => layer.id === action.layerId && isLayerPresent(document, layer.id, state.activeFrameId),
      )
        ? {
            ...state,
            activeLayerId: action.layerId,
            frameLayerSelection: {
              ...state.frameLayerSelection,
              [state.activeFrameId]: action.layerId,
            },
          }
        : state;

    case "layer/toggle-visibility": {
      if (
        !document.layers.some((layer) => layer.id === action.layerId) ||
        !document.frames.some((frame) => frame.id === action.frameId) ||
        !isLayerPresent(document, action.layerId, action.frameId)
      ) return state;
      const key = celKey(action.layerId, action.frameId);
      return changed(state, {
        ...document,
        frameLayerVisibility: {
          ...document.frameLayerVisibility,
          [key]: !isLayerVisible(document, action.layerId, action.frameId),
        },
      });
    }

    case "layer/toggle-lock": {
      const layer = document.layers.find((candidate) => candidate.id === action.layerId);
      if (
        !layer
        || layer.kind !== "pixel"
        || layer.locked
        || !document.frames.some((frame) => frame.id === action.frameId)
        || !isLayerPresent(document, action.layerId, action.frameId)
      ) return state;
      const key = celKey(action.layerId, action.frameId);
      return changed(state, {
        ...document,
        frameLayerLocks: {
          ...document.frameLayerLocks,
          [key]: !isLayerLocked(document, action.layerId, action.frameId),
        },
      });
    }

    case "layer/add": {
      if (!document.frames.some((frame) => frame.id === action.frameId)) return state;
      const frameLayerPresence = { ...document.frameLayerPresence };
      for (const frame of document.frames) {
        frameLayerPresence[celKey(action.layer.id, frame.id)] = frame.id === action.frameId;
      }
      return {
        ...changed(state, {
          ...document,
          layers: [action.layer, ...document.layers],
          frameLayerPresence,
        }),
        activeLayerId:
          state.activeFrameId === action.frameId ? action.layer.id : state.activeLayerId,
        frameLayerSelection: {
          ...state.frameLayerSelection,
          [action.frameId]: action.layer.id,
        },
      };
    }

    case "layer/delete": {
      const layer = document.layers.find((candidate) => candidate.id === action.layerId);
      const pixelLayers = document.layers.filter(
        (candidate) =>
          candidate.kind === "pixel" && isLayerPresent(document, candidate.id, action.frameId),
      );
      if (
        !layer ||
        layer.locked ||
        layer.kind !== "pixel" ||
        !document.frames.some((frame) => frame.id === action.frameId) ||
        !isLayerPresent(document, action.layerId, action.frameId) ||
        pixelLayers.length <= 1
      ) return state;

      const key = celKey(action.layerId, action.frameId);
      const cels = { ...document.cels };
      const frameLayerVisibility = { ...document.frameLayerVisibility };
      const frameLayerPresence = { ...document.frameLayerPresence, [key]: false };
      const frameLayerLocks = { ...document.frameLayerLocks };
      delete cels[key];
      delete frameLayerVisibility[key];
      delete frameLayerLocks[key];

      const presentOnAnotherFrame = document.frames.some(
        (frame) =>
          frame.id !== action.frameId && isLayerPresent(document, action.layerId, frame.id),
      );
      const layers = presentOnAnotherFrame
        ? document.layers
        : document.layers.filter((candidate) => candidate.id !== action.layerId);
      if (!presentOnAnotherFrame) {
        for (const storedKey of Object.keys(cels)) {
          if (storedKey.startsWith(`${action.layerId}::`)) delete cels[storedKey];
        }
        for (const storedKey of Object.keys(frameLayerVisibility)) {
          if (storedKey.startsWith(`${action.layerId}::`)) delete frameLayerVisibility[storedKey];
        }
        for (const storedKey of Object.keys(frameLayerPresence)) {
          if (storedKey.startsWith(`${action.layerId}::`)) delete frameLayerPresence[storedKey];
        }
        for (const storedKey of Object.keys(frameLayerLocks)) {
          if (storedKey.startsWith(`${action.layerId}::`)) delete frameLayerLocks[storedKey];
        }
      }

      const nextDocument = {
        ...document,
        layers,
        cels,
        frameLayerVisibility,
        frameLayerPresence,
        frameLayerLocks,
      };
      const next = changed(state, nextDocument);
      const rememberedLayerId = state.frameLayerSelection[action.frameId]
        ?? (state.activeFrameId === action.frameId ? state.activeLayerId : "");
      const selectedLayerId = rememberedLayerId === action.layerId
        ? layerForFrame(nextDocument, action.frameId, "")
        : layerForFrame(nextDocument, action.frameId, rememberedLayerId);
      return {
        ...next,
        activeLayerId: state.activeFrameId === action.frameId
          ? selectedLayerId
          : state.activeLayerId,
        frameLayerSelection: {
          ...state.frameLayerSelection,
          [action.frameId]: selectedLayerId,
        },
      };
    }

    case "frame/select": {
      if (!document.frames.some((frame) => frame.id === action.frameId)) return state;
      const activeLayerId = layerForFrame(
        document,
        action.frameId,
        state.frameLayerSelection[action.frameId] ?? "layer-details",
      );
      return {
        ...state,
        activeFrameId: action.frameId,
        activeLayerId,
        frameLayerSelection: {
          ...state.frameLayerSelection,
          [action.frameId]: activeLayerId,
        },
      };
    }

    case "frame/advance": {
      const index = document.frames.findIndex((frame) => frame.id === state.activeFrameId);
      const nextIndex = index < 0 ? 0 : (index + 1) % document.frames.length;
      const activeFrameId = document.frames[nextIndex].id;
      const activeLayerId = layerForFrame(
        document,
        activeFrameId,
        state.frameLayerSelection[activeFrameId] ?? "layer-details",
      );
      return {
        ...state,
        activeFrameId,
        activeLayerId,
        frameLayerSelection: {
          ...state.frameLayerSelection,
          [activeFrameId]: activeLayerId,
        },
      };
    }

    case "frame/duplicate": {
      return projectReducer(state, {
        type: "frame/duplicate-many",
        frameIds: [action.frameId],
        duplicateIds: [action.duplicateId],
      });
    }

    case "frame/duplicate-many": {
      if (
        action.frameIds.length === 0
        || action.frameIds.length !== action.duplicateIds.length
        || new Set(action.frameIds).size !== action.frameIds.length
        || new Set(action.duplicateIds).size !== action.duplicateIds.length
        || action.duplicateIds.some((id) => document.frames.some((frame) => frame.id === id))
      ) return state;

      const duplicateIdBySource = new Map(
        action.frameIds.map((frameId, index) => [frameId, action.duplicateIds[index]]),
      );
      const sources = document.frames.filter((frame) => duplicateIdBySource.has(frame.id));
      if (sources.length !== action.frameIds.length) return state;

      const duplicates = sources.map((source): ProjectFrame => ({
        ...source,
        id: duplicateIdBySource.get(source.id) as string,
        name: `${source.name} copy`,
      }));
      const frames = [...document.frames];
      const insertionIndex = Math.max(
        ...sources.map((source) => document.frames.findIndex((frame) => frame.id === source.id)),
      ) + 1;
      frames.splice(insertionIndex, 0, ...duplicates);
      const cels = { ...document.cels };
      const frameLayerVisibility = { ...document.frameLayerVisibility };
      const frameLayerPresence = { ...document.frameLayerPresence };
      const frameLayerLocks = { ...document.frameLayerLocks };
      const frameLayerSelection = { ...state.frameLayerSelection };
      for (const [sourceIndex, source] of sources.entries()) {
        const duplicate = duplicates[sourceIndex];
        for (const layer of document.layers) {
          frameLayerPresence[celKey(layer.id, duplicate.id)] =
            isLayerPresent(document, layer.id, source.id);
          const sourceCel = document.cels[celKey(layer.id, source.id)];
          if (sourceCel) {
            cels[celKey(layer.id, duplicate.id)] = {
              layerId: layer.id,
              frameId: duplicate.id,
              pixels: { ...sourceCel.pixels },
            };
          }
          const sourceKey = celKey(layer.id, source.id);
          if (Object.hasOwn(document.frameLayerVisibility, sourceKey)) {
            frameLayerVisibility[celKey(layer.id, duplicate.id)] =
              document.frameLayerVisibility[sourceKey];
          }
          if (Object.hasOwn(document.frameLayerLocks, sourceKey)) {
            frameLayerLocks[celKey(layer.id, duplicate.id)] =
              document.frameLayerLocks[sourceKey];
          }
        }
        frameLayerSelection[duplicate.id] = layerForFrame(
          { ...document, frames, frameLayerPresence },
          duplicate.id,
          source.id === state.activeFrameId
            ? state.activeLayerId
            : state.frameLayerSelection[source.id] ?? "layer-details",
        );
      }
      const nextDocument = {
        ...document,
        frames,
        cels,
        frameLayerVisibility,
        frameLayerPresence,
        frameLayerLocks,
      };
      const activeFrameId = duplicates[0].id;
      const activeLayerId = frameLayerSelection[activeFrameId];
      return {
        ...changed(state, nextDocument),
        activeFrameId,
        activeLayerId,
        frameLayerSelection,
      };
    }

    case "frame/delete": {
      return projectReducer(state, {
        type: "frame/delete-many",
        frameIds: [action.frameId],
      });
    }

    case "frame/delete-many": {
      const deletedFrameIds = new Set(
        action.frameIds.filter((frameId) =>
          document.frames.some((frame) => frame.id === frameId),
        ),
      );
      if (deletedFrameIds.size === 0 || deletedFrameIds.size >= document.frames.length) {
        return state;
      }
      const firstDeletedIndex = document.frames.findIndex((frame) => deletedFrameIds.has(frame.id));
      const frames = document.frames.filter((frame) => !deletedFrameIds.has(frame.id));
      const belongsToRetainedFrame = (key: string) => {
        const separatorIndex = key.indexOf("::");
        return !deletedFrameIds.has(key.slice(separatorIndex + 2));
      };
      const cels = Object.fromEntries(
        Object.entries(document.cels).filter(([, cel]) => !deletedFrameIds.has(cel.frameId)),
      );
      const frameLayerVisibility = Object.fromEntries(
        Object.entries(document.frameLayerVisibility).filter(([key]) => belongsToRetainedFrame(key)),
      );
      const frameLayerPresence = Object.fromEntries(
        Object.entries(document.frameLayerPresence).filter(([key]) => belongsToRetainedFrame(key)),
      );
      const frameLayerLocks = Object.fromEntries(
        Object.entries(document.frameLayerLocks).filter(([key]) => belongsToRetainedFrame(key)),
      );
      const layers = document.layers.filter(
        (layer) =>
          layer.locked ||
          frames.some(
            (frame) => frameLayerPresence[celKey(layer.id, frame.id)] ?? true,
          ),
      );
      const retainedLayerIds = new Set(layers.map((layer) => layer.id));
      const retainedCels = Object.fromEntries(
        Object.entries(cels).filter(([, cel]) => retainedLayerIds.has(cel.layerId)),
      );
      const retainedVisibility = Object.fromEntries(
        Object.entries(frameLayerVisibility).filter(([key]) =>
          retainedLayerIds.has(key.slice(0, key.indexOf("::"))),
        ),
      );
      const retainedPresence = Object.fromEntries(
        Object.entries(frameLayerPresence).filter(([key]) =>
          retainedLayerIds.has(key.slice(0, key.indexOf("::"))),
        ),
      );
      const retainedLocks = Object.fromEntries(
        Object.entries(frameLayerLocks).filter(([key]) =>
          retainedLayerIds.has(key.slice(0, key.indexOf("::"))),
        ),
      );
      const nextDocument = {
        ...document,
        layers,
        frames,
        cels: retainedCels,
        frameLayerVisibility: retainedVisibility,
        frameLayerPresence: retainedPresence,
        frameLayerLocks: retainedLocks,
      };
      const next = changed(state, nextDocument);
      const activeFrameId = deletedFrameIds.has(state.activeFrameId)
        ? frames[Math.min(firstDeletedIndex, frames.length - 1)].id
        : state.activeFrameId;
      const frameLayerSelection = Object.fromEntries(
        frames.map((frame) => [
          frame.id,
          layerForFrame(
            nextDocument,
            frame.id,
            state.frameLayerSelection[frame.id]
              ?? (frame.id === state.activeFrameId ? state.activeLayerId : "layer-details"),
          ),
        ]),
      );
      return {
        ...next,
        activeFrameId,
        activeLayerId: frameLayerSelection[activeFrameId],
        frameLayerSelection,
      };
    }

    case "frame/reorder": {
      if (!Number.isFinite(action.targetIndex)) return state;
      const movedFrameIds = new Set(
        action.frameIds.filter((frameId) =>
          document.frames.some((frame) => frame.id === frameId),
        ),
      );
      if (movedFrameIds.size === 0) return state;

      const movedFrames = document.frames.filter((frame) => movedFrameIds.has(frame.id));
      const remainingFrames = document.frames.filter((frame) => !movedFrameIds.has(frame.id));
      const rawTargetIndex = Math.max(
        0,
        Math.min(document.frames.length, Math.round(action.targetIndex)),
      );
      const removedBeforeTarget = document.frames
        .slice(0, rawTargetIndex)
        .filter((frame) => movedFrameIds.has(frame.id))
        .length;
      const targetIndex = Math.max(
        0,
        Math.min(remainingFrames.length, rawTargetIndex - removedBeforeTarget),
      );
      const frames = [...remainingFrames];
      frames.splice(targetIndex, 0, ...movedFrames);
      if (frames.every((frame, index) => frame.id === document.frames[index].id)) return state;
      return changed(state, { ...document, frames });
    }

    case "frame/set-hold": {
      if (!Number.isFinite(action.hold)) return state;
      const frameIds = new Set(action.frameIds);
      const hold = Math.max(
        MIN_FRAME_HOLD,
        Math.min(MAX_FRAME_HOLD, Math.round(action.hold)),
      );
      if (
        frameIds.size === 0
        || !document.frames.some((frame) => frameIds.has(frame.id) && frame.hold !== hold)
      ) return state;
      return changed(state, {
        ...document,
        frames: document.frames.map((frame) =>
          frameIds.has(frame.id) ? { ...frame, hold } : frame,
        ),
      });
    }

    case "animation/set-fps": {
      const fps = Math.max(1, Math.min(30, Math.round(action.fps)));
      if (fps === document.animation.fps) return state;
      return changed(state, {
        ...document,
        animation: { ...document.animation, fps },
      });
    }

    case "animation/toggle-loop":
      return changed(state, {
        ...document,
        animation: { ...document.animation, loop: !document.animation.loop },
      });

    case "tiles/set-settings": {
      const tiles = {
        ...document.workspace.tiles,
        ...action.settings,
      };
      if (
        tiles.mode === document.workspace.tiles.mode
        && tiles.repeatPreview === document.workspace.tiles.repeatPreview
        && tiles.symmetry === document.workspace.tiles.symmetry
      ) return state;
      return changed(state, {
        ...document,
        workspace: { ...document.workspace, tiles },
      });
    }

    case "palette/set": {
      const palette = normalizePaletteColors(action.palette, MAX_PALETTE_COLORS);
      if (
        palette.length === 0
        || (palette.length === document.palette.length
          && palette.every((color, index) => color === document.palette[index]))
      ) return state;
      return changed(state, { ...document, palette });
    }

    case "color/replace": {
      const targetColor = normalizeHexColor(action.targetColor);
      if (!targetColor) return state;
      let nextDocument = replaceDocumentColor(
        document,
        action.sourceColor,
        targetColor,
        action.scope,
        {
          activeFrameId: state.activeFrameId,
          activeLayerId: state.activeLayerId,
          bounds: action.bounds,
        },
      );
      if (
        action.updatePaletteIndex !== undefined
        && action.updatePaletteIndex >= 0
        && action.updatePaletteIndex < document.palette.length
      ) {
        const palette = [...document.palette];
        palette[action.updatePaletteIndex] = targetColor;
        const normalized = normalizePaletteColors(palette, MAX_PALETTE_COLORS);
        if (
          normalized.length !== document.palette.length
          || normalized.some((color, index) => color !== document.palette[index])
        ) nextDocument = { ...nextDocument, palette: normalized };
      }
      return nextDocument === document ? state : changed(state, nextDocument);
    }

    case "document/replace":
      return createEditorStateForDocument(
        action.document,
        action.dirty ?? false,
        state.revision + 1,
      );

    case "document/mark-saved":
      return {
        ...state,
        document: action.document ?? document,
        isDirty: false,
      };
  }
}
