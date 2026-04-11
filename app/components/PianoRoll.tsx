"use client";

import { useRef, useEffect, useMemo } from "react";

export interface RollNote {
  id: number;
  noteName: string;
  midiPitch: number;
  startTime: number; // ms from beginning
  duration: number;  // ms
  barIndex: number;
}

interface PianoRollProps {
  notes: RollNote[];
  currentTime: number; // ms
  totalDuration: number;
  isPlaying: boolean;
}

const NOTE_NAMES_SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function midiToLabel(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const note = NOTE_NAMES_SHARPS[midi % 12];
  return `${note}${octave}`;
}

// Color palette for note bars (inspired by the image)
const NOTE_COLORS: Record<string, string> = {
  C: "#f472b6",  // pink
  "C#": "#f472b6",
  D: "#facc15",  // yellow
  "D#": "#facc15",
  E: "#facc15",
  F: "#4ade80",  // green
  "F#": "#4ade80",
  G: "#60a5fa",  // blue
  "G#": "#60a5fa",
  A: "#f472b6",
  "A#": "#f472b6",
  B: "#c084fc",  // purple
};

function getNoteColor(noteName: string): string {
  // Strip octave
  const base = noteName.replace(/\d+/g, "");
  return NOTE_COLORS[base] ?? "#facc15";
}

export default function PianoRoll({ notes, currentTime, totalDuration, isPlaying }: PianoRollProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute pitch range
  const { minPitch, maxPitch } = useMemo(() => {
    if (notes.length === 0) return { minPitch: 48, maxPitch: 84 };
    let min = Infinity;
    let max = -Infinity;
    for (const n of notes) {
      if (n.midiPitch < min) min = n.midiPitch;
      if (n.midiPitch > max) max = n.midiPitch;
    }
    return { minPitch: min - 2, maxPitch: max + 2 };
  }, [notes]);

  const pitchRange = maxPitch - minPitch + 1;
  const ROW_HEIGHT = 20;
  const MS_PER_PX = 8; // how many ms per pixel horizontally
  const VISIBLE_WIDTH_PX = 900;
  const VISIBLE_MS = VISIBLE_WIDTH_PX * MS_PER_PX;

  // Auto-scroll to keep current time centered
  useEffect(() => {
    if (containerRef.current) {
      const scrollX = (currentTime / MS_PER_PX) - VISIBLE_WIDTH_PX / 3;
      containerRef.current.scrollLeft = Math.max(0, scrollX);
    }
  }, [currentTime]);

  const totalWidthPx = Math.max(VISIBLE_WIDTH_PX, totalDuration / MS_PER_PX + 200);
  const playheadX = currentTime / MS_PER_PX;

  return (
    <div className="flex flex-col w-full">
      {/* Header bar labels */}
      <div className="flex">
        {/* Pitch labels column */}
        <div className="w-14 shrink-0" />
        {/* Scrollable header - no content needed */}
        <div className="flex-1" />
      </div>

      <div className="flex">
        {/* Pitch labels */}
        <div
          className="w-14 shrink-0 flex flex-col-reverse border-r border-zinc-700"
          style={{ height: pitchRange * ROW_HEIGHT }}
        >
          {Array.from({ length: pitchRange }, (_, i) => {
            const midi = minPitch + i;
            const label = midiToLabel(midi);
            const isBlackKey = label.includes("#");
            return (
              <div
                key={midi}
                className={`flex items-center justify-end pr-1 text-[10px] font-mono border-b border-zinc-800 ${
                  isBlackKey ? "bg-zinc-900 text-zinc-500" : "text-zinc-400"
                }`}
                style={{ height: ROW_HEIGHT }}
              >
                {label}
              </div>
            );
          })}
        </div>

        {/* Scrollable roll area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden relative"
          style={{ height: pitchRange * ROW_HEIGHT }}
        >
          <div
            className="relative"
            style={{ width: totalWidthPx, height: pitchRange * ROW_HEIGHT }}
          >
            {/* Grid rows */}
            {Array.from({ length: pitchRange }, (_, i) => {
              const midi = minPitch + i;
              const label = midiToLabel(midi);
              const isBlackKey = label.includes("#");
              const y = (maxPitch - midi) * ROW_HEIGHT;
              return (
                <div
                  key={`row-${midi}`}
                  className={`absolute left-0 border-b border-zinc-800/50 ${
                    isBlackKey ? "bg-zinc-900/40" : "bg-zinc-950/60"
                  }`}
                  style={{ top: y, width: "100%", height: ROW_HEIGHT }}
                />
              );
            })}

            {/* Note bars */}
            {notes.map((note) => {
              const x = note.startTime / MS_PER_PX;
              const w = Math.max(4, note.duration / MS_PER_PX);
              const y = (maxPitch - note.midiPitch) * ROW_HEIGHT + 2;
              const h = ROW_HEIGHT - 4;
              const isActive =
                currentTime >= note.startTime &&
                currentTime < note.startTime + note.duration;
              const color = getNoteColor(note.noteName);

              return (
                <div
                  key={note.id}
                  className="absolute rounded-sm transition-opacity duration-100"
                  style={{
                    left: x,
                    top: y,
                    width: w,
                    height: h,
                    backgroundColor: color,
                    opacity: isActive ? 1 : 0.6,
                    boxShadow: isActive
                      ? `0 0 12px ${color}, 0 0 4px ${color}`
                      : "none",
                    border: isActive ? "1px solid #fff" : "none",
                  }}
                >
                  <span className="text-[9px] text-black font-bold pl-1 leading-none truncate block mt-[2px]">
                    {note.noteName}
                  </span>
                </div>
              );
            })}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-amber-400 z-10 pointer-events-none"
              style={{ left: playheadX }}
            >
              <div className="absolute -top-1 -left-[5px] w-3 h-3 bg-amber-400 rotate-45" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
