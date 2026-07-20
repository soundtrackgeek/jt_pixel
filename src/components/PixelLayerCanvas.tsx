import { memo, useEffect, useRef } from "react";
import { renderPixelMap } from "../editor/pixels";
import type { PixelMap, ProjectLayer } from "../editor/project";

interface PixelLayerCanvasProps {
  height: number;
  layer: ProjectLayer;
  pixels: PixelMap;
  registerCanvas?: (layerId: string, canvas: HTMLCanvasElement | null) => void;
  visible: boolean;
  width: number;
}

export const PixelLayerCanvas = memo(function PixelLayerCanvas({
  height,
  layer,
  pixels,
  registerCanvas,
  visible,
  width,
}: PixelLayerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) renderPixelMap(canvasRef.current, pixels, width, height);
  }, [height, pixels, width]);

  useEffect(() => {
    registerCanvas?.(layer.id, canvasRef.current);
    return () => registerCanvas?.(layer.id, null);
  }, [layer.id, registerCanvas]);

  return (
    <canvas
      ref={canvasRef}
      className="pixel-layer-canvas"
      width={width}
      height={height}
      aria-hidden="true"
      data-layer-id={layer.id}
      data-pixel-count={Object.keys(pixels).length}
      style={{
        display: visible ? "block" : "none",
        mixBlendMode: layer.blendMode === "add" ? "screen" : "normal",
        opacity: layer.opacity / 100,
      }}
    />
  );
});
