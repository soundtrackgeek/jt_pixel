export const PROJECT_SCHEMA_VERSION = 1 as const;

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
  animation: {
    fps: number;
    loop: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EditorDocumentState {
  document: ProjectDocument;
  activeLayerId: string;
  activeFrameId: string;
  isDirty: boolean;
  revision: number;
}

export type ProjectAction =
  | { type: "cel/commit"; layerId: string; frameId: string; pixels: PixelMap }
  | { type: "cel/clear"; layerId: string; frameId: string }
  | { type: "layer/select"; layerId: string }
  | { type: "layer/toggle-visibility"; layerId: string; frameId: string }
  | { type: "layer/add"; layer: ProjectLayer; frameId: string }
  | { type: "layer/delete"; layerId: string; frameId: string }
  | { type: "frame/select"; frameId: string }
  | { type: "frame/advance" }
  | { type: "frame/duplicate"; frameId: string; duplicateId: string }
  | { type: "frame/delete"; frameId: string }
  | { type: "animation/set-fps"; fps: number }
  | { type: "document/mark-saved" };

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
    })),
    cels: {},
    frameLayerVisibility: {},
    frameLayerPresence: {},
    animation: { fps: 8, loop: true },
    createdAt: now,
    updatedAt: now,
  };
}

export function createInitialEditorState(): EditorDocumentState {
  return {
    document: createProjectDocument(),
    activeLayerId: "layer-details",
    activeFrameId: "frame-3",
    isDirty: false,
    revision: 0,
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

function isEditablePixelLayer(document: ProjectDocument, layerId: string) {
  const layer = document.layers.find((candidate) => candidate.id === layerId);
  return layer?.kind === "pixel" && !layer.locked;
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
        !isEditablePixelLayer(document, action.layerId) ||
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
        !isEditablePixelLayer(document, action.layerId) ||
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
        ? { ...state, activeLayerId: action.layerId }
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
        activeLayerId: action.layer.id,
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
      delete cels[key];
      delete frameLayerVisibility[key];

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
      }

      const nextDocument = { ...document, layers, cels, frameLayerVisibility, frameLayerPresence };
      const next = changed(state, nextDocument);
      return {
        ...next,
        activeLayerId:
          state.activeFrameId === action.frameId && state.activeLayerId === action.layerId
            ? layerForFrame(nextDocument, action.frameId, "")
            : state.activeLayerId,
      };
    }

    case "frame/select":
      return document.frames.some((frame) => frame.id === action.frameId)
        ? {
            ...state,
            activeFrameId: action.frameId,
            activeLayerId: layerForFrame(document, action.frameId, state.activeLayerId),
          }
        : state;

    case "frame/advance": {
      const index = document.frames.findIndex((frame) => frame.id === state.activeFrameId);
      const nextIndex = index < 0 ? 0 : (index + 1) % document.frames.length;
      const activeFrameId = document.frames[nextIndex].id;
      return {
        ...state,
        activeFrameId,
        activeLayerId: layerForFrame(document, activeFrameId, state.activeLayerId),
      };
    }

    case "frame/duplicate": {
      const index = document.frames.findIndex((frame) => frame.id === action.frameId);
      if (index < 0) return state;
      const source = document.frames[index];
      const duplicate: ProjectFrame = {
        ...source,
        id: action.duplicateId,
        name: `${source.name} copy`,
      };
      const frames = [...document.frames];
      frames.splice(index + 1, 0, duplicate);
      const cels = { ...document.cels };
      const frameLayerVisibility = { ...document.frameLayerVisibility };
      const frameLayerPresence = { ...document.frameLayerPresence };
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
        const visibilityKey = celKey(layer.id, source.id);
        if (Object.hasOwn(document.frameLayerVisibility, visibilityKey)) {
          frameLayerVisibility[celKey(layer.id, duplicate.id)] =
            document.frameLayerVisibility[visibilityKey];
        }
      }
      return {
        ...changed(state, {
          ...document,
          frames,
          cels,
          frameLayerVisibility,
          frameLayerPresence,
        }),
        activeFrameId: duplicate.id,
      };
    }

    case "frame/delete": {
      if (document.frames.length <= 1) return state;
      const index = document.frames.findIndex((frame) => frame.id === action.frameId);
      if (index < 0) return state;
      const frames = document.frames.filter((frame) => frame.id !== action.frameId);
      const cels = Object.fromEntries(
        Object.entries(document.cels).filter(([, cel]) => cel.frameId !== action.frameId),
      );
      const frameLayerVisibility = Object.fromEntries(
        Object.entries(document.frameLayerVisibility).filter(
          ([key]) => !key.endsWith(`::${action.frameId}`),
        ),
      );
      const frameLayerPresence = Object.fromEntries(
        Object.entries(document.frameLayerPresence).filter(
          ([key]) => !key.endsWith(`::${action.frameId}`),
        ),
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
      const nextDocument = {
        ...document,
        layers,
        frames,
        cels: retainedCels,
        frameLayerVisibility: retainedVisibility,
        frameLayerPresence: retainedPresence,
      };
      const next = changed(state, nextDocument);
      const activeFrameId = state.activeFrameId === action.frameId
        ? frames[Math.min(index, frames.length - 1)].id
        : state.activeFrameId;
      return {
        ...next,
        activeFrameId,
        activeLayerId: layerForFrame(nextDocument, activeFrameId, state.activeLayerId),
      };
    }

    case "animation/set-fps": {
      const fps = Math.max(1, Math.min(30, Math.round(action.fps)));
      if (fps === document.animation.fps) return state;
      return changed(state, {
        ...document,
        animation: { ...document.animation, fps },
      });
    }

    case "document/mark-saved":
      return { ...state, isDirty: false };
  }
}
