import {
  ChevronDown,
  Copy,
  Pause,
  Play,
  Repeat2,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
  Trash2,
} from "lucide-react";
import { memo, useEffect, useRef } from "react";
import courierScene from "../assets/courier-scene.png";
import { drawPixelMap } from "../editor/pixels";
import {
  getCelPixels,
  isLayerPresent,
  isLayerVisible,
  type ProjectDocument,
  type ProjectFrame,
} from "../editor/project";

interface FramePreviewProps {
  document: ProjectDocument;
  frame: ProjectFrame;
}

const FramePreview = memo(function FramePreview({ document, frame }: FramePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const referenceLayer = document.layers.find(
    (layer) => layer.kind === "reference" && isLayerPresent(document, layer.id, frame.id),
  );

  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, document.width, document.height);
    context.imageSmoothingEnabled = false;
    const pixelLayers = document.layers.filter(
      (layer) => layer.kind === "pixel" && isLayerPresent(document, layer.id, frame.id),
    ).reverse();
    for (const layer of pixelLayers) {
      if (!isLayerVisible(document, layer.id, frame.id)) continue;
      context.globalAlpha = layer.opacity / 100;
      context.globalCompositeOperation = layer.blendMode === "add" ? "lighter" : "source-over";
      drawPixelMap(context, getCelPixels(document, layer.id, frame.id), document.width);
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  }, [document, frame.id]);

  return (
    <span className="frame-art">
      {referenceLayer && isLayerVisible(document, referenceLayer.id, frame.id) && (
        <span
          className="frame-reference"
          style={{
            backgroundImage: `url(${courierScene})`,
            backgroundPosition: frame.referenceOffset,
            opacity: referenceLayer.opacity / 100,
          }}
        />
      )}
      <canvas ref={canvasRef} width={document.width} height={document.height} aria-hidden="true" />
    </span>
  );
});

interface TimelineProps {
  activeFrameId: string;
  document: ProjectDocument;
  isPlaying: boolean;
  onionSkin: boolean;
  onDeleteFrame: (frameId: string) => void;
  onDuplicateFrame: (frameId: string) => void;
  onFpsChange: (fps: number) => void;
  onFrameChange: (frameId: string) => void;
  onOnionSkinChange: (enabled: boolean) => void;
  onTogglePlay: () => void;
}

export function Timeline({
  activeFrameId,
  document,
  isPlaying,
  onionSkin,
  onDeleteFrame,
  onDuplicateFrame,
  onFpsChange,
  onFrameChange,
  onOnionSkinChange,
  onTogglePlay,
}: TimelineProps) {
  const { frames } = document;
  const fps = document.animation.fps;
  const activeFrameIndex = Math.max(0, frames.findIndex((frame) => frame.id === activeFrameId));

  return (
    <section className="timeline panel-surface" aria-label="Animation timeline">
      <div className="timeline__header">
        <span>TIMELINE</span>
        <label className="onion-control">
          <span className="onion-icon" />
          <span>Onion</span>
          <input
            type="checkbox"
            checked={onionSkin}
            onChange={(event) => onOnionSkinChange(event.target.checked)}
          />
          <span className="switch" aria-hidden="true" />
        </label>
      </div>

      <div className="timeline__body">
        <div className="frame-strip" role="list" aria-label="Animation frames">
          {frames.map((frame, index) => (
            <button
              key={frame.id}
              className={`frame-card ${activeFrameId === frame.id ? "is-active" : ""}`}
              onClick={() => onFrameChange(frame.id)}
              aria-label={`Frame ${index + 1}`}
              aria-current={activeFrameId === frame.id ? "true" : undefined}
              data-testid={`frame-${index + 1}`}
            >
              <span className="frame-number">{index + 1}</span>
              <FramePreview document={document} frame={frame} />
              <span className="frame-key" />
            </button>
          ))}
        </div>

        <div className="playback-panel">
          <div className="transport-controls">
            <button aria-label="First frame" onClick={() => onFrameChange(frames[0].id)}><SkipBack size={17} /></button>
            <button
              aria-label="Previous frame"
              onClick={() => onFrameChange(frames[(activeFrameIndex - 1 + frames.length) % frames.length].id)}
            >
              <StepBack size={17} />
            </button>
            <button
              className="play-button"
              aria-label={isPlaying ? "Pause animation" : "Play animation"}
              onClick={onTogglePlay}
              data-testid="playback-toggle"
            >
              {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
            </button>
            <button
              aria-label="Next frame"
              onClick={() => onFrameChange(frames[(activeFrameIndex + 1) % frames.length].id)}
            >
              <StepForward size={17} />
            </button>
            <button aria-label="Last frame" onClick={() => onFrameChange(frames[frames.length - 1].id)}><SkipForward size={17} /></button>
            <button aria-label="Loop animation" aria-pressed={document.animation.loop}><Repeat2 size={17} /></button>
          </div>
          <div className="fps-control">
            <label htmlFor="fps-range">{fps} fps</label>
            <div className="fps-stepper">
              <button aria-label="Decrease frame rate" onClick={() => onFpsChange(fps - 1)}>−</button>
              <button aria-label="Frame rate options"><ChevronDown size={14} /></button>
              <button aria-label="Increase frame rate" onClick={() => onFpsChange(fps + 1)}>+</button>
            </div>
            <input
              id="fps-range"
              className="range-control"
              type="range"
              min="1"
              max="30"
              value={fps}
              onChange={(event) => onFpsChange(Number(event.target.value))}
            />
          </div>
          <div className="timeline-actions">
            <button aria-label="Duplicate frame" onClick={() => onDuplicateFrame(activeFrameId)}><Copy size={15} /></button>
            <button
              aria-label="Delete frame"
              disabled={frames.length <= 1}
              onClick={() => onDeleteFrame(activeFrameId)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
