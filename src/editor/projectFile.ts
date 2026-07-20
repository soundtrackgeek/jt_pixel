import {
  MAX_CANVAS_DIMENSION,
  MIN_CANVAS_DIMENSION,
  PROJECT_SCHEMA_VERSION,
  celKey,
  isLayerPresent,
  type PixelCel,
  type PixelMap,
  type ProjectDocument,
  type ProjectFrame,
  type ProjectLayer,
} from "./project";

export const RECOVERY_SCHEMA_VERSION = 1 as const;

const MAX_PROJECT_FILE_CHARACTERS = 25_000_000;
const MAX_FRAMES = 1_024;
const MAX_LAYERS = 256;
const MAX_PALETTE_COLORS = 256;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i;
const PIXEL_INDEX_PATTERN = /^\d+$/;

type UnknownRecord = Record<string, unknown>;

export interface RecoverySnapshot {
  recoveryVersion: typeof RECOVERY_SCHEMA_VERSION;
  savedAt: string;
  document: ProjectDocument;
}

export class ProjectFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectFileError";
  }
}

function expectRecord(value: unknown, label: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProjectFileError(`${label} must be an object.`);
  }
  return value as UnknownRecord;
}

function expectString(value: unknown, label: string, maxLength = 255) {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maxLength) {
    throw new ProjectFileError(`${label} must be a non-empty string.`);
  }
  return value;
}

function expectBoolean(value: unknown, label: string) {
  if (typeof value !== "boolean") {
    throw new ProjectFileError(`${label} must be true or false.`);
  }
  return value;
}

function expectInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
) {
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new ProjectFileError(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return value as number;
}

function expectTimestamp(value: unknown, label: string) {
  const timestamp = expectString(value, label, 64);
  if (!Number.isFinite(Date.parse(timestamp))) {
    throw new ProjectFileError(`${label} must be a valid timestamp.`);
  }
  return timestamp;
}

function expectColor(value: unknown, label: string) {
  const color = expectString(value, label, 9);
  if (!HEX_COLOR_PATTERN.test(color)) {
    throw new ProjectFileError(`${label} must be a hexadecimal color.`);
  }
  return color;
}

function parseLayers(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_LAYERS) {
    throw new ProjectFileError(`layers must contain between 1 and ${MAX_LAYERS} entries.`);
  }

  const ids = new Set<string>();
  const layers: ProjectLayer[] = value.map((candidate, index) => {
    const layer = expectRecord(candidate, `layers[${index}]`);
    const id = expectString(layer.id, `layers[${index}].id`, 200);
    if (ids.has(id)) throw new ProjectFileError(`Layer id "${id}" is duplicated.`);
    ids.add(id);

    if (layer.kind !== "pixel" && layer.kind !== "reference") {
      throw new ProjectFileError(`layers[${index}].kind is not supported.`);
    }
    if (layer.blendMode !== "normal" && layer.blendMode !== "add") {
      throw new ProjectFileError(`layers[${index}].blendMode is not supported.`);
    }
    if (layer.locked !== undefined && typeof layer.locked !== "boolean") {
      throw new ProjectFileError(`layers[${index}].locked must be true or false.`);
    }

    return {
      id,
      name: expectString(layer.name, `layers[${index}].name`),
      kind: layer.kind,
      blendMode: layer.blendMode,
      opacity: expectInteger(layer.opacity, `layers[${index}].opacity`, 0, 100),
      visible: expectBoolean(layer.visible, `layers[${index}].visible`),
      ...(layer.locked === undefined ? {} : { locked: layer.locked }),
    };
  });

  if (!layers.some((layer) => layer.kind === "pixel")) {
    throw new ProjectFileError("The project must contain at least one pixel layer.");
  }

  return layers;
}

function parseFrames(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_FRAMES) {
    throw new ProjectFileError(`frames must contain between 1 and ${MAX_FRAMES} entries.`);
  }

  const ids = new Set<string>();
  return value.map((candidate, index): ProjectFrame => {
    const frame = expectRecord(candidate, `frames[${index}]`);
    const id = expectString(frame.id, `frames[${index}].id`, 200);
    if (ids.has(id)) throw new ProjectFileError(`Frame id "${id}" is duplicated.`);
    ids.add(id);
    return {
      id,
      name: expectString(frame.name, `frames[${index}].name`),
      referenceOffset: expectString(
        frame.referenceOffset,
        `frames[${index}].referenceOffset`,
        100,
      ),
    };
  });
}

function parseWorkspace(
  value: unknown,
  frameIds: Set<string>,
  fallbackFrameId: string,
) {
  if (value === undefined) return { activeFrameId: fallbackFrameId };

  const workspace = expectRecord(value, "workspace");
  const activeFrameId = expectString(
    workspace.activeFrameId,
    "workspace.activeFrameId",
    200,
  );
  if (!frameIds.has(activeFrameId)) {
    throw new ProjectFileError("workspace.activeFrameId references an unknown frame.");
  }
  return { activeFrameId };
}

function parsePixelMap(value: unknown, label: string, pixelCount: number): PixelMap {
  const source = expectRecord(value, label);
  const pixels: PixelMap = {};
  for (const [index, color] of Object.entries(source)) {
    if (!PIXEL_INDEX_PATTERN.test(index) || Number(index) >= pixelCount) {
      throw new ProjectFileError(`${label} contains an out-of-range pixel index.`);
    }
    pixels[index] = expectColor(color, `${label}.${index}`);
  }
  return pixels;
}

function parseBooleanRecord(
  value: unknown,
  label: string,
  layerIds: Set<string>,
  frameIds: Set<string>,
) {
  const source = expectRecord(value, label);
  const result: Record<string, boolean> = {};
  for (const [key, storedValue] of Object.entries(source)) {
    const separatorIndex = key.indexOf("::");
    const layerId = key.slice(0, separatorIndex);
    const frameId = key.slice(separatorIndex + 2);
    if (
      separatorIndex <= 0 ||
      !layerIds.has(layerId) ||
      !frameIds.has(frameId) ||
      key !== celKey(layerId, frameId)
    ) {
      throw new ProjectFileError(`${label} contains an unknown layer/frame key.`);
    }
    result[key] = expectBoolean(storedValue, `${label}.${key}`);
  }
  return result;
}

function parseCels(
  value: unknown,
  width: number,
  height: number,
  pixelLayerIds: Set<string>,
  frameIds: Set<string>,
  frameLayerPresence: Record<string, boolean>,
) {
  const source = expectRecord(value, "cels");
  const cels: Record<string, PixelCel> = {};
  for (const [key, candidate] of Object.entries(source)) {
    const cel = expectRecord(candidate, `cels.${key}`);
    const layerId = expectString(cel.layerId, `cels.${key}.layerId`, 200);
    const frameId = expectString(cel.frameId, `cels.${key}.frameId`, 200);
    if (
      !pixelLayerIds.has(layerId) ||
      !frameIds.has(frameId) ||
      key !== celKey(layerId, frameId) ||
      frameLayerPresence[key] === false
    ) {
      throw new ProjectFileError(`cels.${key} references an unknown layer or frame.`);
    }
    cels[key] = {
      layerId,
      frameId,
      pixels: parsePixelMap(cel.pixels, `cels.${key}.pixels`, width * height),
    };
  }
  return cels;
}

export function validateProjectDocument(value: unknown): ProjectDocument {
  const source = expectRecord(value, "project");
  if (source.schemaVersion !== PROJECT_SCHEMA_VERSION) {
    throw new ProjectFileError(
      `This file uses project schema ${String(source.schemaVersion)}; JT Pixel supports schema ${PROJECT_SCHEMA_VERSION}.`,
    );
  }

  const width = expectInteger(source.width, "width", MIN_CANVAS_DIMENSION, MAX_CANVAS_DIMENSION);
  const height = expectInteger(source.height, "height", MIN_CANVAS_DIMENSION, MAX_CANVAS_DIMENSION);
  const layers = parseLayers(source.layers);
  const frames = parseFrames(source.frames);
  const layerIds = new Set(layers.map((layer) => layer.id));
  const pixelLayerIds = new Set(
    layers.filter((layer) => layer.kind === "pixel").map((layer) => layer.id),
  );
  const frameIds = new Set(frames.map((frame) => frame.id));
  const frameLayerVisibility = parseBooleanRecord(
    source.frameLayerVisibility,
    "frameLayerVisibility",
    layerIds,
    frameIds,
  );
  const frameLayerPresence = parseBooleanRecord(
    source.frameLayerPresence,
    "frameLayerPresence",
    layerIds,
    frameIds,
  );

  const animation = expectRecord(source.animation, "animation");
  if (!Array.isArray(source.palette) || source.palette.length === 0 || source.palette.length > MAX_PALETTE_COLORS) {
    throw new ProjectFileError(
      `palette must contain between 1 and ${MAX_PALETTE_COLORS} colors.`,
    );
  }

  const document: ProjectDocument = {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: expectString(source.id, "id", 200),
    name: expectString(source.name, "name"),
    width,
    height,
    palette: source.palette.map((color, index) => expectColor(color, `palette[${index}]`)),
    layers,
    frames,
    cels: parseCels(
      source.cels,
      width,
      height,
      pixelLayerIds,
      frameIds,
      frameLayerPresence,
    ),
    frameLayerVisibility,
    frameLayerPresence,
    animation: {
      fps: expectInteger(animation.fps, "animation.fps", 1, 30),
      loop: expectBoolean(animation.loop, "animation.loop"),
    },
    workspace: parseWorkspace(source.workspace, frameIds, frames[0].id),
    createdAt: expectTimestamp(source.createdAt, "createdAt"),
    updatedAt: expectTimestamp(source.updatedAt, "updatedAt"),
  };

  for (const frame of frames) {
    if (!layers.some(
      (layer) => layer.kind === "pixel" && isLayerPresent(document, layer.id, frame.id),
    )) {
      throw new ProjectFileError(`${frame.name} does not contain an editable pixel layer.`);
    }
  }

  return document;
}

function parseJson(input: string, label: string) {
  if (input.length > MAX_PROJECT_FILE_CHARACTERS) {
    throw new ProjectFileError(`${label} is too large to open safely.`);
  }
  try {
    return JSON.parse(input) as unknown;
  } catch {
    throw new ProjectFileError(`${label} is not valid JSON.`);
  }
}

export function parseProjectDocument(input: string) {
  return validateProjectDocument(parseJson(input, "Project file"));
}

export function serializeProjectDocument(document: ProjectDocument) {
  return `${JSON.stringify(validateProjectDocument(document), null, 2)}\n`;
}

export function createRecoverySnapshot(
  document: ProjectDocument,
  savedAt = new Date().toISOString(),
  activeFrameId = document.workspace.activeFrameId,
): RecoverySnapshot {
  return {
    recoveryVersion: RECOVERY_SCHEMA_VERSION,
    savedAt: expectTimestamp(savedAt, "savedAt"),
    document: validateProjectDocument({
      ...document,
      workspace: { activeFrameId },
    }),
  };
}

export function parseRecoverySnapshot(input: string): RecoverySnapshot {
  const source = expectRecord(parseJson(input, "Recovery file"), "recovery");
  if (source.recoveryVersion !== RECOVERY_SCHEMA_VERSION) {
    throw new ProjectFileError("This recovery file is from an unsupported version.");
  }
  return {
    recoveryVersion: RECOVERY_SCHEMA_VERSION,
    savedAt: expectTimestamp(source.savedAt, "recovery.savedAt"),
    document: validateProjectDocument(source.document),
  };
}

export function serializeRecoverySnapshot(snapshot: RecoverySnapshot) {
  return `${JSON.stringify({
    recoveryVersion: RECOVERY_SCHEMA_VERSION,
    savedAt: expectTimestamp(snapshot.savedAt, "recovery.savedAt"),
    document: validateProjectDocument(snapshot.document),
  })}\n`;
}

export function ensureProjectExtension(path: string) {
  return path.toLowerCase().endsWith(".jtp") ? path : `${path}.jtp`;
}

export function projectFileName(path: string) {
  return path.split(/[\\/]/).at(-1) || "untitled.jtp";
}

export function prepareProjectDocumentForSave(
  document: ProjectDocument,
  path: string,
  options: {
    activeFrameId?: string;
    savedAt?: string;
  } = {},
) {
  return validateProjectDocument({
    ...document,
    name: projectFileName(path),
    workspace: {
      activeFrameId: options.activeFrameId ?? document.workspace.activeFrameId,
    },
    updatedAt: options.savedAt ?? new Date().toISOString(),
  });
}
