import type { LayerBlendMode, PixelMap } from "./project";

export interface CompositingLayer {
  blendMode: LayerBlendMode;
  opacity: number;
  pixels: PixelMap;
}

export interface RgbaSample {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

const PIXEL_COLOR_PATTERN = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i;

export function parsePixelColor(color: string): RgbaSample | null {
  if (!PIXEL_COLOR_PATTERN.test(color)) return null;
  return {
    red: Number.parseInt(color.slice(1, 3), 16) / 255,
    green: Number.parseInt(color.slice(3, 5), 16) / 255,
    blue: Number.parseInt(color.slice(5, 7), 16) / 255,
    alpha: color.length >= 9 ? Number.parseInt(color.slice(7, 9), 16) / 255 : 1,
  };
}

function blendChannel(source: number, destination: number, mode: LayerBlendMode) {
  switch (mode) {
    case "multiply": return source * destination;
    case "screen": return 1 - ((1 - source) * (1 - destination));
    case "overlay": return destination <= 0.5
      ? 2 * source * destination
      : 1 - (2 * (1 - source) * (1 - destination));
    case "add": return Math.min(1, source + destination);
    case "subtract": return Math.max(0, destination - source);
    default: return source;
  }
}

export function compositeRgba(
  destination: RgbaSample,
  source: RgbaSample,
  opacity: number,
  blendMode: LayerBlendMode,
): RgbaSample {
  const sourceAlpha = source.alpha * Math.max(0, Math.min(1, opacity));
  const destinationAlpha = destination.alpha;
  const outputAlpha = sourceAlpha + (destinationAlpha * (1 - sourceAlpha));
  if (outputAlpha <= 0) return { red: 0, green: 0, blue: 0, alpha: 0 };

  const channel = (sourceChannel: number, destinationChannel: number) => {
    const blended = blendChannel(sourceChannel, destinationChannel, blendMode);
    const premultiplied =
      ((1 - sourceAlpha) * destinationAlpha * destinationChannel)
      + ((1 - destinationAlpha) * sourceAlpha * sourceChannel)
      + (sourceAlpha * destinationAlpha * blended);
    return Math.max(0, Math.min(1, premultiplied / outputAlpha));
  };

  return {
    red: channel(source.red, destination.red),
    green: channel(source.green, destination.green),
    blue: channel(source.blue, destination.blue),
    alpha: outputAlpha,
  };
}

function byteToHex(value: number) {
  return Math.max(0, Math.min(255, Math.round(value * 255))).toString(16).padStart(2, "0");
}

export function rgbaToPixelColor(sample: RgbaSample) {
  const alpha = byteToHex(sample.alpha);
  return `#${byteToHex(sample.red)}${byteToHex(sample.green)}${byteToHex(sample.blue)}${alpha}`;
}

export function compositePixelMaps(
  width: number,
  height: number,
  layers: CompositingLayer[],
  backgroundColor?: string,
) {
  const output = new Float32Array(width * height * 4);
  const background = backgroundColor ? parsePixelColor(backgroundColor) : null;
  if (background) {
    for (let offset = 0; offset < output.length; offset += 4) {
      output[offset] = background.red;
      output[offset + 1] = background.green;
      output[offset + 2] = background.blue;
      output[offset + 3] = background.alpha;
    }
  }
  for (const layer of layers) {
    const opacity = Math.max(0, Math.min(1, layer.opacity / 100));
    if (opacity <= 0) continue;
    for (const [rawIndex, color] of Object.entries(layer.pixels)) {
      const index = Number(rawIndex);
      const source = parsePixelColor(color);
      if (!source || !Number.isInteger(index) || index < 0 || index >= width * height) continue;
      const offset = index * 4;
      const result = compositeRgba({
        red: output[offset],
        green: output[offset + 1],
        blue: output[offset + 2],
        alpha: output[offset + 3],
      }, source, opacity, layer.blendMode);
      output[offset] = result.red;
      output[offset + 1] = result.green;
      output[offset + 2] = result.blue;
      output[offset + 3] = result.alpha;
    }
  }

  const pixels: PixelMap = {};
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    if (output[offset + 3] <= 0) continue;
    pixels[String(index)] = rgbaToPixelColor({
      red: output[offset],
      green: output[offset + 1],
      blue: output[offset + 2],
      alpha: output[offset + 3],
    });
  }
  return pixels;
}

export function pixelMapToImageData(width: number, height: number, pixels: PixelMap) {
  const output = new Uint8ClampedArray(width * height * 4);
  for (const [rawIndex, color] of Object.entries(pixels)) {
    const index = Number(rawIndex);
    const sample = parsePixelColor(color);
    if (!sample || !Number.isInteger(index) || index < 0 || index >= width * height) continue;
    const offset = index * 4;
    output[offset] = Math.round(sample.red * 255);
    output[offset + 1] = Math.round(sample.green * 255);
    output[offset + 2] = Math.round(sample.blue * 255);
    output[offset + 3] = Math.round(sample.alpha * 255);
  }
  return output;
}
