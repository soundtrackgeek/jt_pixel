import { GIFEncoder, applyPalette, quantize, type GifPalette } from "gifenc";

export interface GifFrameInput {
  durationMs: number;
  pixels: Uint8ClampedArray;
}

export interface GifEncodingInput {
  frames: GifFrameInput[];
  height: number;
  loop: boolean;
  transparent: boolean;
  width: number;
}

interface PalettizedFrame {
  indexedPixels: Uint8Array;
  palette: GifPalette;
  transparent: boolean;
  transparentIndex: number;
}

function normalizeGifPixels(pixels: Uint8ClampedArray, transparent: boolean) {
  const normalized = new Uint8ClampedArray(pixels);
  for (let offset = 0; offset < normalized.length; offset += 4) {
    if (transparent && normalized[offset + 3] <= 127) {
      normalized[offset] = 0;
      normalized[offset + 1] = 0;
      normalized[offset + 2] = 0;
      normalized[offset + 3] = 0;
    } else {
      normalized[offset + 3] = 255;
    }
  }
  return normalized;
}

function exactPalettize(
  pixels: Uint8ClampedArray,
  transparent: boolean,
): PalettizedFrame | null {
  const palette: GifPalette = [];
  const paletteIndexes = new Map<string, number>();
  const indexedPixels = new Uint8Array(pixels.length / 4);
  let transparentIndex = -1;

  for (let offset = 0, pixelIndex = 0; offset < pixels.length; offset += 4, pixelIndex += 1) {
    const alpha = pixels[offset + 3];
    const key = transparent && alpha === 0
      ? "transparent"
      : `${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]}`;
    let paletteIndex = paletteIndexes.get(key);
    if (paletteIndex === undefined) {
      if (palette.length === 256) return null;
      paletteIndex = palette.length;
      paletteIndexes.set(key, paletteIndex);
      palette.push(transparent && alpha === 0
        ? [0, 0, 0, 0]
        : [pixels[offset], pixels[offset + 1], pixels[offset + 2], 255]);
      if (transparent && alpha === 0) transparentIndex = paletteIndex;
    }
    indexedPixels[pixelIndex] = paletteIndex;
  }

  return {
    indexedPixels,
    palette,
    transparent: transparentIndex >= 0,
    transparentIndex: Math.max(0, transparentIndex),
  };
}

function quantizedPalettize(
  pixels: Uint8ClampedArray,
  transparent: boolean,
): PalettizedFrame {
  const format = transparent ? "rgba4444" : "rgb565";
  const palette = quantize(pixels, 256, transparent ? {
    format,
    oneBitAlpha: 127,
    clearAlpha: true,
    clearAlphaThreshold: 127,
    clearAlphaColor: 0,
  } : { format });
  const transparentIndex = transparent
    ? palette.findIndex((color) => color[3] === 0)
    : -1;

  return {
    indexedPixels: applyPalette(pixels, palette, format),
    palette,
    transparent: transparentIndex >= 0,
    transparentIndex: Math.max(0, transparentIndex),
  };
}

function palettizeFrame(pixels: Uint8ClampedArray, transparent: boolean) {
  const normalized = normalizeGifPixels(pixels, transparent);
  return exactPalettize(normalized, transparent)
    ?? quantizedPalettize(normalized, transparent);
}

export function encodeGifFrames(
  input: GifEncodingInput,
  onProgress?: (completedFrames: number, totalFrames: number) => void,
) {
  if (input.frames.length === 0) {
    throw new Error("Animated GIF export needs at least one frame.");
  }

  const gif = GIFEncoder();
  for (let index = 0; index < input.frames.length; index += 1) {
    const frame = input.frames[index];
    const palettized = palettizeFrame(frame.pixels, input.transparent);
    gif.writeFrame(palettized.indexedPixels, input.width, input.height, {
      palette: palettized.palette,
      delay: frame.durationMs,
      repeat: input.loop ? 0 : -1,
      transparent: palettized.transparent,
      transparentIndex: palettized.transparentIndex,
    });
    onProgress?.(index + 1, input.frames.length);
  }
  gif.finish();
  return new Uint8Array(gif.bytesView());
}
