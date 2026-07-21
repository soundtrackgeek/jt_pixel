/// <reference lib="webworker" />

import { encodeGifFrames, type GifEncodingInput } from "./gifEncodingCore";

interface EncodeGifMessage {
  input: GifEncodingInput;
  type: "encode";
}

self.onmessage = (event: MessageEvent<EncodeGifMessage>) => {
  try {
    const bytes = encodeGifFrames(event.data.input, (completedFrames, totalFrames) => {
      self.postMessage({ type: "progress", completedFrames, totalFrames });
    });
    self.postMessage({ type: "complete", bytes }, [bytes.buffer]);
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

export {};
