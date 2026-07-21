import { describe, expect, it } from "vitest";
import { encodeGifFrames } from "./gifEncodingCore";

function ascii(bytes: Uint8Array) {
  return new TextDecoder("ascii").decode(bytes);
}

describe("animated GIF encoding", () => {
  it("encodes multiple frames with a looping animation extension", () => {
    const progress: number[] = [];
    const bytes = encodeGifFrames({
      width: 2,
      height: 1,
      loop: true,
      transparent: false,
      frames: [
        { durationMs: 130, pixels: new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 0, 255]) },
        { durationMs: 130, pixels: new Uint8ClampedArray([0, 0, 0, 255, 0, 255, 0, 255]) },
      ],
    }, (completed) => progress.push(completed));

    expect(ascii(bytes.slice(0, 6))).toBe("GIF89a");
    expect(ascii(bytes)).toContain("NETSCAPE2.0");
    expect(bytes.at(-1)).toBe(0x3b);
    expect(progress).toEqual([1, 2]);
  });

  it("marks transparent pixels in the graphic control extension", () => {
    const bytes = encodeGifFrames({
      width: 1,
      height: 1,
      loop: false,
      transparent: true,
      frames: [{
        durationMs: 100,
        pixels: new Uint8ClampedArray([66, 200, 227, 0]),
      }],
    });
    const controlExtension = bytes.findIndex((byte, index) => (
      byte === 0x21 && bytes[index + 1] === 0xf9 && bytes[index + 2] === 0x04
    ));

    expect(controlExtension).toBeGreaterThan(0);
    expect(bytes[controlExtension + 3] & 0x01).toBe(1);
  });
});
