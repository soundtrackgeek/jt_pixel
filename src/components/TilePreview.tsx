import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { X } from "lucide-react";
import { composeFramePixels } from "../editor/export";
import { celKey, type PixelMap, type ProjectDocument } from "../editor/project";

export interface TilePreviewHandle {
  renderDraft: (pixels: PixelMap) => void;
}

interface TilePreviewProps {
  activeFrameId: string;
  activeLayerId: string;
  document: ProjectDocument;
  onClose: () => void;
}

export const TilePreview = forwardRef<TilePreviewHandle, TilePreviewProps>(
  function TilePreview({ activeFrameId, activeLayerId, document, onClose }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const pendingDraftRef = useRef<PixelMap | undefined>(undefined);
    const renderFrameRef = useRef<number | null>(null);

    const render = useCallback((draftPixels?: PixelMap) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const sourceDocument = draftPixels
        ? {
            ...document,
            cels: {
              ...document.cels,
              [celKey(activeLayerId, activeFrameId)]: {
                layerId: activeLayerId,
                frameId: activeFrameId,
                pixels: draftPixels,
              },
            },
          }
        : document;
      const source = composeFramePixels(
        sourceDocument,
        activeFrameId,
        "transparent",
        "#000000",
      );
      const tile = sourceCanvasRef.current
        ?? globalThis.document.createElement("canvas");
      sourceCanvasRef.current = tile;
      tile.width = document.width;
      tile.height = document.height;
      const tileContext = tile.getContext("2d");
      const context = canvas.getContext("2d");
      if (!tileContext || !context) return;
      tileContext.putImageData(
        new ImageData(new Uint8ClampedArray(source), document.width, document.height),
        0,
        0,
      );

      canvas.width = document.width * 3;
      canvas.height = document.height * 3;
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, canvas.width, canvas.height);
      for (let row = 0; row < 3; row += 1) {
        for (let column = 0; column < 3; column += 1) {
          context.drawImage(tile, column * document.width, row * document.height);
        }
      }
    }, [activeFrameId, activeLayerId, document]);

    useEffect(() => {
      render();
      return () => {
        if (renderFrameRef.current !== null) {
          window.cancelAnimationFrame(renderFrameRef.current);
          renderFrameRef.current = null;
        }
      };
    }, [render]);
    useImperativeHandle(ref, () => ({
      renderDraft: (pixels) => {
        pendingDraftRef.current = pixels;
        if (renderFrameRef.current !== null) return;
        renderFrameRef.current = window.requestAnimationFrame(() => {
          renderFrameRef.current = null;
          render(pendingDraftRef.current);
        });
      },
    }), [render]);

    return (
      <aside className="tile-preview" aria-label="3 by 3 tile repeat preview">
        <header>
          <span>TILE PREVIEW</span>
          <button aria-label="Close tile repeat preview" onClick={onClose}><X size={13} /></button>
        </header>
        <div className="tile-preview__stage">
          <canvas ref={canvasRef} aria-hidden="true" />
          <span className="tile-preview__axis tile-preview__axis--vertical" aria-hidden="true" />
          <span className="tile-preview__axis tile-preview__axis--horizontal" aria-hidden="true" />
        </div>
        <footer><span>3×3 LIVE</span><span>{document.width} × {document.height}</span></footer>
      </aside>
    );
  },
);
