import type { RenderedExport } from "./export";

export function drawRenderedExport(
  canvas: HTMLCanvasElement,
  rendered: RenderedExport,
) {
  canvas.width = rendered.width;
  canvas.height = rendered.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The export preview canvas is unavailable.");
  context.imageSmoothingEnabled = false;
  context.putImageData(
    new ImageData(
      new Uint8ClampedArray(rendered.pixels),
      rendered.width,
      rendered.height,
    ),
    0,
    0,
  );
}

export function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("JT Pixel could not encode this PNG."));
    }, "image/png");
  });
}

export async function encodeRenderedExport(rendered: RenderedExport) {
  const canvas = document.createElement("canvas");
  drawRenderedExport(canvas, rendered);
  return new Uint8Array(await (await canvasToPngBlob(canvas)).arrayBuffer());
}
