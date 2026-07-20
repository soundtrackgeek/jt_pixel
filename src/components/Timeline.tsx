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
import courierScene from "../assets/courier-scene.png";
import { frameOffsets } from "../data/editor";

interface TimelineProps {
  activeFrame: number;
  fps: number;
  isPlaying: boolean;
  onionSkin: boolean;
  onFrameChange: (frame: number) => void;
  onFpsChange: (fps: number) => void;
  onOnionSkinChange: (enabled: boolean) => void;
  onTogglePlay: () => void;
}
export function Timeline({
  activeFrame,
  fps,
  isPlaying,
  onionSkin,
  onFrameChange,
  onFpsChange,
  onOnionSkinChange,
  onTogglePlay,
}: TimelineProps) {
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
          {frameOffsets.map((position, index) => (
            <button
              key={index}
              className={`frame-card ${activeFrame === index ? "is-active" : ""}`}
              onClick={() => onFrameChange(index)}
              aria-label={`Frame ${index + 1}`}
              aria-current={activeFrame === index ? "true" : undefined}
              data-testid={`frame-${index + 1}`}
            >
              <span className="frame-number">{index + 1}</span>
              <span
                className="frame-art"
                style={{ backgroundImage: `url(${courierScene})`, backgroundPosition: position }}
              />
              <span className="frame-key" />
            </button>
          ))}
        </div>

        <div className="playback-panel">
          <div className="transport-controls">
            <button aria-label="First frame" onClick={() => onFrameChange(0)}><SkipBack size={17} /></button>
            <button
              aria-label="Previous frame"
              onClick={() => onFrameChange((activeFrame - 1 + frameOffsets.length) % frameOffsets.length)}
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
              onClick={() => onFrameChange((activeFrame + 1) % frameOffsets.length)}
            >
              <StepForward size={17} />
            </button>
            <button aria-label="Last frame" onClick={() => onFrameChange(frameOffsets.length - 1)}><SkipForward size={17} /></button>
            <button aria-label="Loop animation"><Repeat2 size={17} /></button>
          </div>
          <div className="fps-control">
            <label htmlFor="fps-range">{fps} fps</label>
            <div className="fps-stepper">
              <button aria-label="Decrease frame rate" onClick={() => onFpsChange(Math.max(1, fps - 1))}>−</button>
              <button aria-label="Frame rate options"><ChevronDown size={14} /></button>
              <button aria-label="Increase frame rate" onClick={() => onFpsChange(Math.min(30, fps + 1))}>+</button>
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
            <button aria-label="Duplicate frame"><Copy size={15} /></button>
            <button aria-label="Delete frame"><Trash2 size={15} /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
