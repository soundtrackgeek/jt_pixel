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
  | { type: "layer/toggle-visibility"; layerId: string }
  | { type: "layer/add"; layer: ProjectLayer }
  | { type: "layer/delete"; layerId: string }
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

export function projectReducer(
  state: EditorDocumentState,
  action: ProjectAction,
): EditorDocumentState {
  const document = state.document;

  switch (action.type) {
    case "cel/commit": {
      if (
        !isEditablePixelLayer(document, action.layerId) ||
        !document.frames.some((frame) => frame.id === action.frameId)
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
      if (!isEditablePixelLayer(document, action.layerId)) return state;
      const key = celKey(action.layerId, action.frameId);
      if (!document.cels[key]) return state;
      const cels = { ...document.cels };
      delete cels[key];
      return changed(state, { ...document, cels });
    }

    case "layer/select":
      return document.layers.some((layer) => layer.id === action.layerId)
        ? { ...state, activeLayerId: action.layerId }
        : state;

    case "layer/toggle-visibility": {
      if (!document.layers.some((layer) => layer.id === action.layerId)) return state;
      return changed(state, {
        ...document,
        layers: document.layers.map((layer) =>
          layer.id === action.layerId ? { ...layer, visible: !layer.visible } : layer,
        ),
      });
    }

    case "layer/add":
      return {
        ...changed(state, {
          ...document,
          layers: [action.layer, ...document.layers],
        }),
        activeLayerId: action.layer.id,
      };

    case "layer/delete": {
      const layer = document.layers.find((candidate) => candidate.id === action.layerId);
      const pixelLayers = document.layers.filter((candidate) => candidate.kind === "pixel");
      if (!layer || layer.locked || layer.kind !== "pixel" || pixelLayers.length <= 1) return state;

      const layers = document.layers.filter((candidate) => candidate.id !== action.layerId);
      const cels = Object.fromEntries(
        Object.entries(document.cels).filter(([, cel]) => cel.layerId !== action.layerId),
      );
      const next = changed(state, { ...document, layers, cels });
      return {
        ...next,
        activeLayerId:
          state.activeLayerId === action.layerId
            ? layers.find((candidate) => candidate.kind === "pixel")?.id ?? layers[0].id
            : state.activeLayerId,
      };
    }

    case "frame/select":
      return document.frames.some((frame) => frame.id === action.frameId)
        ? { ...state, activeFrameId: action.frameId }
        : state;

    case "frame/advance": {
      const index = document.frames.findIndex((frame) => frame.id === state.activeFrameId);
      const nextIndex = index < 0 ? 0 : (index + 1) % document.frames.length;
      return { ...state, activeFrameId: document.frames[nextIndex].id };
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
      for (const layer of document.layers) {
        const sourceCel = document.cels[celKey(layer.id, source.id)];
        if (sourceCel) {
          cels[celKey(layer.id, duplicate.id)] = {
            layerId: layer.id,
            frameId: duplicate.id,
            pixels: { ...sourceCel.pixels },
          };
        }
      }
      return {
        ...changed(state, { ...document, frames, cels }),
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
      const next = changed(state, { ...document, frames, cels });
      return {
        ...next,
        activeFrameId:
          state.activeFrameId === action.frameId
            ? frames[Math.min(index, frames.length - 1)].id
            : state.activeFrameId,
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
