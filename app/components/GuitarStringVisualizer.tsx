"use client";

import { useMemo } from "react";
import {
  STANDARD_TUNING,
  getPositionsForMidiNote,
  midiToNoteName,
  DEFAULT_FRET_COUNT,
} from "../lib/electric-guitar-utils";

interface GuitarStringVisualizerProps {
  midiNote: number | null;
  noteName?: string;
  activeStrings?: number[]; // String numbers that are currently active
  showFretboard?: boolean;
}

interface FretMarker {
  fret: number;
  isSingle: boolean;
  isDouble: boolean;
}

// Standard fret markers (dots at frets 3, 5, 7, 9, 12, 15, 17, 19, 21, 24)
const FRET_MARKERS: FretMarker[] = [];
for (let i = 1; i <= DEFAULT_FRET_COUNT; i++) {
  FRET_MARKERS.push({
    fret: i,
    isSingle: [3, 5, 7, 9, 15, 17, 19, 21].includes(i),
    isDouble: i === 12 || i === 24,
  });
}

export default function GuitarStringVisualizer({
  midiNote,
  noteName,
  activeStrings = [],
  showFretboard = true,
}: GuitarStringVisualizerProps) {
  // Calculate active positions for the current note
  const activePositions = useMemo(() => {
    if (midiNote === null) return [];
    return getPositionsForMidiNote(midiNote);
  }, [midiNote]);

  // String thickness (lower strings are thicker)
  const stringThickness = [4, 3.5, 3, 2.5, 2, 1.5];

  return (
    <div className="flex flex-col items-center w-full h-full p-2">
      {/* Guitar neck/fretboard */}
      {showFretboard && (
        <div className="w-full mb-2">
          {/* Fret numbers */}
          <div className="flex items-center mb-1 pl-8">
            {Array.from({ length: DEFAULT_FRET_COUNT }, (_, i) => i + 1).map((fret) => {
              const marker = FRET_MARKERS.find((m) => m.fret === fret);
              return (
                <div
                  key={fret}
                  className="flex-1 text-center text-[8px] text-zinc-600"
                  style={{ minWidth: "18px" }}
                >
                  {marker?.isDouble ? "••" : marker?.isSingle ? "•" : fret}
                </div>
              );
            })}
          </div>

          {/* Strings and frets */}
          <div className="flex flex-col gap-0">
            {STANDARD_TUNING.map((stringDef, idx) => {
              const isActive = activePositions.some((p) => p.stringNumber === stringDef.stringNumber);
              const activeFret = activePositions.find((p) => p.stringNumber === stringDef.stringNumber)?.fret ?? -1;

              return (
                <div key={stringDef.stringNumber} className="flex items-center relative">
                  {/* String label */}
                  <div
                    className="w-8 text-right pr-2 text-xs font-bold"
                    style={{ color: stringDef.color }}
                  >
                    {stringDef.name}
                  </div>

                  {/* Frets */}
                  <div className="flex-1 flex relative">
                    {/* String line */}
                    <div
                      className="absolute inset-0 flex items-center pointer-events-none"
                      style={{
                        height: `${stringThickness[idx]}px`,
                        background: `linear-gradient(to right, #78716c, #a8a29e)`,
                      }}
                    />

                    {/* Fret wires */}
                    {Array.from({ length: DEFAULT_FRET_COUNT }, (_, i) => i + 1).map((fret) => {
                      const isNoteHere = fret === activeFret;
                      return (
                        <div
                          key={fret}
                          className="flex-1 relative border-r border-zinc-600"
                          style={{ minWidth: "18px", height: "24px" }}
                        >
                          {/* Fret dot */}
                          {isNoteHere && (
                            <div
                              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full animate-pulse"
                              style={{
                                background: stringDef.color,
                                boxShadow: `0 0 8px ${stringDef.color}`,
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active note display */}
      <div className="mt-2 text-center">
        <div className="text-2xl font-bold text-amber-400 min-h-[36px]">
          {noteName || "-"}
        </div>
        {activePositions.length > 0 && (
          <div className="text-[10px] text-zinc-500 mt-1">
            {activePositions
              .map((p) => `Cuerda ${STANDARD_TUNING[p.stringNumber - 1].name} Traste ${p.fret}`)
              .join(" | ")}
          </div>
        )}
      </div>

      {/* Guitar body silhouette (decorative) */}
      <div className="mt-4 relative">
        <svg width="120" height="160" viewBox="0 0 120 160" className="opacity-30">
          {/* Guitar body */}
          <path
            d="M30 10 Q60 0 90 10 Q110 30 100 60 Q110 90 90 120 Q60 160 30 120 Q10 90 20 60 Q10 30 30 10Z"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
          />
          {/* Sound hole */}
          <circle cx="60" cy="70" r="15" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
          {/* Neck */}
          <rect x="50" y="0" width="20" height="30" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
          {/* Strings on body */}
          {STANDARD_TUNING.map((s, i) => (
            <line
              key={s.stringNumber}
              x1={52 + i * 3}
              y1="0"
              x2={52 + i * 3}
              y2="100"
              stroke={s.color}
              strokeWidth="0.5"
              opacity="0.6"
            />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-2 justify-center">
        {STANDARD_TUNING.map((s) => (
          <div key={s.stringNumber} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: s.color }}
            />
            <span className="text-[9px] text-zinc-500">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
