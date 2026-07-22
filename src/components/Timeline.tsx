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
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import courierScene from "../assets/courier-scene.png";
import { composeFramePixels } from "../editor/export";
import {
  MAX_FRAME_HOLD,
  MIN_FRAME_HOLD,
  isLayerPresent,
  isLayerVisible,
  type ProjectDocument,
  type ProjectFrame,
} from "../editor/project";
import type { FrameRange } from "../editor/timeline";
import type { FrameSelectionModifiers } from "../hooks/useTimelineSelection";

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
    context.putImageData(
      new ImageData(
        composeFramePixels(document, frame.id, "transparent", "#000000"),
        document.width,
        document.height,
      ),
      0,
      0,
    );
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
  playbackRange: FrameRange;
  selectedFrameIds: string[];
  onDeleteFrames: (frameIds: string[]) => void;
  onDuplicateFrames: (frameIds: string[]) => void;
  onFpsChangeEnd: () => void;
  onFpsChangeStart: () => void;
  onFpsChange: (fps: number) => void;
  onFrameSelect: (frameId: string, modifiers: FrameSelectionModifiers) => void;
  onFrameChange: (frameId: string) => void;
  onOnionSkinChange: (enabled: boolean) => void;
  onReorderFrames: (frameIds: string[], targetIndex: number) => void;
  onSetFrameHold: (frameIds: string[], hold: number) => void;
  onToggleLoop: () => void;
  onTogglePlay: () => void;
}

interface DropTarget {
  frameIndex: number;
  position: "before" | "after";
  targetIndex: number;
}

interface FrameDragGesture {
  dragging: boolean;
  frameIds: string[];
  pointerId: number;
  selectOnDrag: boolean;
  sourceFrameId: string;
  startX: number;
  startY: number;
}

export function Timeline({
  activeFrameId,
  document,
  isPlaying,
  onionSkin,
  playbackRange,
  selectedFrameIds,
  onDeleteFrames,
  onDuplicateFrames,
  onFpsChangeEnd,
  onFpsChangeStart,
  onFpsChange,
  onFrameSelect,
  onFrameChange,
  onOnionSkinChange,
  onReorderFrames,
  onSetFrameHold,
  onToggleLoop,
  onTogglePlay,
}: TimelineProps) {
  const { frames } = document;
  const fps = document.animation.fps;
  const selectedIds = useMemo(() => new Set(selectedFrameIds), [selectedFrameIds]);
  const activeFrameIndex = Math.max(0, frames.findIndex((frame) => frame.id === activeFrameId));
  const selectedFrames = frames.filter((frame) => selectedIds.has(frame.id));
  const selectedHolds = new Set(selectedFrames.map((frame) => frame.hold));
  const selectedHold = selectedHolds.size === 1 ? selectedFrames[0]?.hold : null;
  const frameStripRef = useRef<HTMLDivElement>(null);
  const frameDragRef = useRef<FrameDragGesture | null>(null);
  const suppressFrameClick = useRef(false);
  const activeCardRef = useRef<HTMLButtonElement>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  useEffect(() => {
    activeCardRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeFrameId]);

  const firstPlaybackFrame = frames[playbackRange.firstIndex] ?? frames[0];
  const lastPlaybackFrame = frames[playbackRange.lastIndex] ?? frames.at(-1) ?? frames[0];
  const previousIndex = activeFrameIndex <= playbackRange.firstIndex
    ? playbackRange.lastIndex
    : activeFrameIndex - 1;
  const nextIndex = activeFrameIndex >= playbackRange.lastIndex
    ? playbackRange.firstIndex
    : activeFrameIndex + 1;

  function handleFrameClick(event: MouseEvent<HTMLButtonElement>, frameId: string) {
    if (suppressFrameClick.current) return;
    onFrameSelect(frameId, {
      additive: event.ctrlKey || event.metaKey,
      range: event.shiftKey,
    });
  }

  function dropTargetAtPoint(clientX: number, clientY: number) {
    const strip = frameStripRef.current;
    if (!strip) return null;
    const stripBounds = strip.getBoundingClientRect();
    if (clientY < stripBounds.top - 12 || clientY > stripBounds.bottom + 12) return null;
    const directTarget = globalThis.document.elementFromPoint(clientX, clientY)
      ?.closest<HTMLButtonElement>("[data-frame-index]");
    if (directTarget && strip.contains(directTarget)) {
      const frameIndex = Number(directTarget.dataset.frameIndex);
      const bounds = directTarget.getBoundingClientRect();
      const position = clientX < bounds.left + (bounds.width / 2) ? "before" : "after";
      return {
        frameIndex,
        position,
        targetIndex: position === "before" ? frameIndex : frameIndex + 1,
      } satisfies DropTarget;
    }

    let nearest: { distance: number; frameIndex: number; position: "before" | "after" } | null = null;
    for (const card of strip.querySelectorAll<HTMLButtonElement>("[data-frame-index]")) {
      const bounds = card.getBoundingClientRect();
      const midpoint = bounds.left + (bounds.width / 2);
      const distance = Math.abs(clientX - midpoint);
      if (nearest && distance >= nearest.distance) continue;
      nearest = {
        distance,
        frameIndex: Number(card.dataset.frameIndex),
        position: clientX < midpoint ? "before" : "after",
      };
    }
    return nearest ? {
      frameIndex: nearest.frameIndex,
      position: nearest.position,
      targetIndex: nearest.position === "before" ? nearest.frameIndex : nearest.frameIndex + 1,
    } satisfies DropTarget : null;
  }

  function beginFrameDrag(event: PointerEvent<HTMLButtonElement>, frameId: string) {
    if (event.button !== 0) return;
    const frameIds = selectedIds.has(frameId) ? selectedFrameIds : [frameId];
    frameDragRef.current = {
      dragging: false,
      frameIds,
      pointerId: event.pointerId,
      selectOnDrag: !selectedIds.has(frameId),
      sourceFrameId: frameId,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveFrameDrag(event: PointerEvent<HTMLButtonElement>) {
    const gesture = frameDragRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (
      !gesture.dragging
      && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) < 5
    ) return;
    gesture.dragging = true;
    if (gesture.selectOnDrag) {
      onFrameSelect(gesture.sourceFrameId, { additive: false, range: false });
    }
    const nextTarget = dropTargetAtPoint(event.clientX, event.clientY);
    setDropTarget(nextTarget);
    event.preventDefault();
  }

  function finishFrameDrag(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const gesture = frameDragRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const target = cancelled ? null : dropTargetAtPoint(event.clientX, event.clientY);
    frameDragRef.current = null;
    setDropTarget(null);
    if (!gesture.dragging) return;
    suppressFrameClick.current = true;
    window.setTimeout(() => {
      suppressFrameClick.current = false;
    }, 0);
    if (target) onReorderFrames(gesture.frameIds, target.targetIndex);
    event.preventDefault();
  }

  return (
    <section className="timeline panel-surface" aria-label="Animation timeline">
      <div className="timeline__header">
        <span>TIMELINE</span>
        <span className="timeline-selection-count">
          {selectedFrameIds.length} SELECTED
        </span>
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
        <div ref={frameStripRef} className="frame-strip" role="list" aria-label="Animation frames">
          {frames.map((frame, index) => {
            const isActive = activeFrameId === frame.id;
            const isSelected = selectedIds.has(frame.id);
            const isDragging = frameDragRef.current?.dragging === true
              && frameDragRef.current.frameIds.includes(frame.id);
            const isRangeStart = index === playbackRange.firstIndex && selectedFrameIds.length > 1;
            const isRangeEnd = index === playbackRange.lastIndex && selectedFrameIds.length > 1;
            const dropClass = dropTarget?.frameIndex === index
              ? `is-drop-${dropTarget.position}`
              : "";
            return (
              <button
                key={frame.id}
                ref={isActive ? activeCardRef : undefined}
                className={`frame-card ${isActive ? "is-active" : ""} ${isSelected ? "is-selected" : ""} ${isDragging ? "is-dragging" : ""} ${isRangeStart ? "is-range-start" : ""} ${isRangeEnd ? "is-range-end" : ""} ${dropClass}`}
                onClick={(event) => handleFrameClick(event, frame.id)}
                onLostPointerCapture={(event) => finishFrameDrag(event, true)}
                onPointerCancel={(event) => finishFrameDrag(event, true)}
                onPointerDown={(event) => beginFrameDrag(event, frame.id)}
                onPointerMove={moveFrameDrag}
                onPointerUp={finishFrameDrag}
                aria-label={`Frame ${index + 1}, hold ${frame.hold} times${isSelected ? ", selected" : ""}`}
                aria-current={isActive ? "true" : undefined}
                aria-pressed={isSelected}
                data-frame-id={frame.id}
                data-frame-index={index}
                data-testid={`frame-${index + 1}`}
              >
                <span className="frame-number">{index + 1}</span>
                <FramePreview document={document} frame={frame} />
                <span className="frame-hold">{frame.hold}×</span>
                <span className="frame-key" />
              </button>
            );
          })}
        </div>

        <div className="playback-panel">
          <div className="timeline-meta-row">
            <span className="range-readout">
              RANGE {playbackRange.firstIndex + 1}–{playbackRange.lastIndex + 1}
            </span>
            <label className="hold-control">
              <span>HOLD</span>
              <select
                value={selectedHold ?? ""}
                onChange={(event) => onSetFrameHold(
                  selectedFrameIds,
                  Number(event.target.value),
                )}
                aria-label="Selected frame hold duration"
              >
                {selectedHold === null && <option value="">MIX</option>}
                {Array.from(
                  { length: MAX_FRAME_HOLD - MIN_FRAME_HOLD + 1 },
                  (_, index) => index + MIN_FRAME_HOLD,
                ).map((hold) => <option key={hold} value={hold}>{hold}×</option>)}
              </select>
            </label>
          </div>
          <div className="transport-controls">
            <button aria-label="First frame in range" onClick={() => onFrameChange(firstPlaybackFrame.id)}><SkipBack size={16} /></button>
            <button aria-label="Previous frame in range" onClick={() => onFrameChange(frames[previousIndex].id)}><StepBack size={16} /></button>
            <button
              className="play-button"
              aria-label={isPlaying ? "Pause animation" : "Play animation"}
              onClick={onTogglePlay}
              data-testid="playback-toggle"
            >
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>
            <button aria-label="Next frame in range" onClick={() => onFrameChange(frames[nextIndex].id)}><StepForward size={16} /></button>
            <button aria-label="Last frame in range" onClick={() => onFrameChange(lastPlaybackFrame.id)}><SkipForward size={16} /></button>
            <button
              className={document.animation.loop ? "is-active" : ""}
              aria-label={document.animation.loop ? "Looping animation" : "Play animation once"}
              aria-pressed={document.animation.loop}
              onClick={onToggleLoop}
            >
              <Repeat2 size={16} />
            </button>
          </div>
          <div className="timeline-control-row">
            <div className="fps-control">
              <label htmlFor="fps-range">{fps} fps</label>
              <input
                id="fps-range"
                className="range-control"
                type="range"
                min="1"
                max="30"
                value={fps}
                onChange={(event) => onFpsChange(Number(event.target.value))}
                onPointerDown={onFpsChangeStart}
                onPointerUp={onFpsChangeEnd}
                onPointerCancel={onFpsChangeEnd}
                onBlur={onFpsChangeEnd}
              />
              <div className="fps-stepper">
                <button aria-label="Decrease frame rate" onClick={() => onFpsChange(fps - 1)}>−</button>
                <button aria-label="Frame rate options"><ChevronDown size={13} /></button>
                <button aria-label="Increase frame rate" onClick={() => onFpsChange(fps + 1)}>+</button>
              </div>
            </div>
            <div className="timeline-actions">
              <button
                aria-label={`Duplicate ${selectedFrameIds.length} selected frame${selectedFrameIds.length === 1 ? "" : "s"}`}
                onClick={() => onDuplicateFrames(selectedFrameIds)}
              >
                <Copy size={15} />
              </button>
              <button
                aria-label={`Delete ${selectedFrameIds.length} selected frame${selectedFrameIds.length === 1 ? "" : "s"}`}
                disabled={selectedFrameIds.length >= frames.length}
                onClick={() => onDeleteFrames(selectedFrameIds)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
