import type { RenderedAnimationExport } from "./export";
import type { GifEncodingInput } from "./gifEncodingCore";

interface GifWorkerProgress {
  completedFrames: number;
  totalFrames: number;
}

function encodingInput(
  animation: RenderedAnimationExport,
  loop: boolean,
  transparent: boolean,
): GifEncodingInput {
  return {
    width: animation.width,
    height: animation.height,
    loop,
    transparent,
    frames: animation.frames.map((frame) => ({
      durationMs: frame.durationMs,
      pixels: frame.pixels,
    })),
  };
}

export async function encodeAnimatedGif(
  animation: RenderedAnimationExport,
  loop: boolean,
  transparent: boolean,
  onProgress?: (progress: GifWorkerProgress) => void,
) {
  const input = encodingInput(animation, loop, transparent);
  if (typeof Worker === "undefined") {
    const { encodeGifFrames } = await import("./gifEncodingCore");
    return encodeGifFrames(input, (completedFrames, totalFrames) => {
      onProgress?.({ completedFrames, totalFrames });
    });
  }

  return new Promise<Uint8Array>((resolve, reject) => {
    const worker = new Worker(new URL("./gifEncoder.worker.ts", import.meta.url), {
      type: "module",
    });
    const finish = () => worker.terminate();

    worker.onmessage = (event: MessageEvent<{
      bytes?: Uint8Array;
      completedFrames?: number;
      message?: string;
      totalFrames?: number;
      type: "complete" | "error" | "progress";
    }>) => {
      if (event.data.type === "progress") {
        onProgress?.({
          completedFrames: event.data.completedFrames ?? 0,
          totalFrames: event.data.totalFrames ?? input.frames.length,
        });
        return;
      }
      finish();
      if (event.data.type === "complete" && event.data.bytes) {
        resolve(new Uint8Array(event.data.bytes));
      } else {
        reject(new Error(event.data.message || "JT Pixel could not encode this GIF."));
      }
    };
    worker.onerror = (event) => {
      finish();
      reject(new Error(event.message || "The GIF encoder stopped unexpectedly."));
    };

    const transfers = input.frames.map((frame) => frame.pixels.buffer);
    worker.postMessage({ type: "encode", input }, transfers);
  });
}
