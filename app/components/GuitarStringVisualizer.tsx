"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { STANDARD_TUNING } from "../lib/electric-guitar-utils";

interface TabNote {
  stringNumber: number;
  fret: number;
  time: number;
  duration: number;
  midiPitch: number;
}

interface TabBar {
  startTime: number;
  endTime: number;
  section?: string;
  timeSignature: { numerator: number; denominator: number };
}

interface GuitarTabVisualizerProps {
  notes: TabNote[];
  bars: TabBar[];
  currentTime: number;
  totalDuration: number;
  isPlaying?: boolean;
}

const TAB_STRINGS = [6, 5, 4, 3, 2, 1]; // e, B, G, D, A, E
const STRING_HEIGHT = 24; // px per string
const BAR_WIDTH = 200; // px per bar
const LEFT_MARGIN = 60;

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function GuitarTabVisualizer({
  notes,
  bars,
  currentTime,
  totalDuration,
  isPlaying = false,
}: GuitarTabVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('guitar-tab-dark-mode') === 'true';
    }
    return false;
  });

  // Persist darkMode preference
  useEffect(() => {
    localStorage.setItem('guitar-tab-dark-mode', String(darkMode));
  }, [darkMode]);

  // Total width of the tablature
  const totalWidth = bars.length * BAR_WIDTH + LEFT_MARGIN + 100;

  // Find current bar
  const currentBarIndex = useMemo(() => {
    return bars.findIndex((b) => currentTime >= b.startTime && currentTime < b.endTime);
  }, [bars, currentTime]);

  // Get notes for a specific bar
  const getNotesForBar = (bar: TabBar) => {
    return notes.filter((n) => n.time >= bar.startTime && n.time < bar.endTime);
  };

  // Auto-scroll to keep playhead visible
  useEffect(() => {
    if (isPlaying && containerRef.current) {
      const container = containerRef.current;
      const playheadX = currentBarIndex * BAR_WIDTH + LEFT_MARGIN;
      const containerRect = container.getBoundingClientRect();
      const targetScroll = playheadX - containerRect.width * 0.3;
      container.scrollLeft = Math.max(0, targetScroll);
    }
  }, [currentTime, isPlaying, currentBarIndex, containerWidth]);

  // Track container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  return (
    <div className={`flex flex-col w-full h-full rounded-lg overflow-hidden border ${darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-300'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-1.5 border-b ${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-100 border-zinc-300'}`}>
        <div className="flex items-center gap-3">
          {bars[currentBarIndex] && (
            <>
              {bars[currentBarIndex].section && (
                <span className={`text-[10px] font-bold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                  {bars[currentBarIndex].section}
                </span>
              )}
              <span className={`text-[10px] ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Compás {currentBarIndex + 1}
                {bars[currentBarIndex]?.timeSignature && (
                  <span className="ml-1">
                    {bars[currentBarIndex].timeSignature.numerator}/
                    {bars[currentBarIndex].timeSignature.denominator}
                  </span>
                )}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
            {formatTime(currentTime)}
          </span>
          {/* Theme toggle */}
          <button
            onClick={() => setDarkMode((d) => !d)}
            className={`w-6 h-6 rounded flex items-center justify-center text-xs transition-colors ${
              darkMode
                ? 'bg-zinc-700 text-yellow-400 hover:bg-zinc-600'
                : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
            }`}
            title={darkMode ? 'Cambiar a fondo blanco' : 'Cambiar a fondo negro'}
          >
            {darkMode ? '☀' : '☾'}
          </button>
        </div>
      </div>

      {/* Tablature scroll area */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-x-auto overflow-y-hidden relative ${darkMode ? 'bg-zinc-900' : 'bg-white'}`}
        style={{ scrollBehavior: isPlaying ? "auto" : "smooth" }}
      >
        <div
          className="relative"
          style={{ width: totalWidth, minWidth: "100%", height: "100%" }}
        >
          {/* TAB label */}
          <div
            className="absolute top-0 bottom-0 flex items-center justify-center"
            style={{ left: 8, width: 40 }}
          >
            <div className={`flex flex-col items-center text-[12px] font-bold tracking-widest ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              <span>T</span>
              <span>A</span>
              <span>B</span>
            </div>
          </div>

          {/* Bars and notes */}
          {bars.map((bar, barIdx) => {
            const barNotes = getNotesForBar(bar);
            const barX = LEFT_MARGIN + barIdx * BAR_WIDTH;
            const isCurrentBar = barIdx === currentBarIndex;
            const barDuration = bar.endTime - bar.startTime;

            return (
              <div
                key={bar.startTime}
                className="absolute top-0 bottom-0"
                style={{ left: barX, width: BAR_WIDTH }}
              >
                {/* Bar background */}
                <div
                  className={`absolute inset-0 ${isCurrentBar ? (darkMode ? 'bg-zinc-800' : 'bg-green-50') : ''}`}
                />

                {/* Bar lines */}
                <div className={`absolute top-0 bottom-0 left-0 w-0.5 ${darkMode ? 'bg-zinc-500' : 'bg-zinc-400'}`} />
                <div className={`absolute top-0 bottom-0 right-0 w-0.5 ${darkMode ? 'bg-zinc-500' : 'bg-zinc-400'}`} />

                {/* Section label */}
                {bar.section && (
                  <div className={`absolute -top-4 left-1 text-[9px] font-bold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                    {bar.section}
                  </div>
                )}

                {/* Time signature */}
                {barIdx === 0 && bar.timeSignature && (
                  <div className={`absolute -top-5 right-1 text-[9px] font-bold ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {bar.timeSignature.numerator}/{bar.timeSignature.denominator}
                  </div>
                )}

                {/* String lines */}
                <div
                  className="absolute inset-x-0"
                  style={{ top: "15%", height: "70%" }}
                >
                  {TAB_STRINGS.map((strNum, strIdx) => {
                    const strDef = STANDARD_TUNING.find(
                      (s) => s.stringNumber === strNum
                    );
                    const stringNotes = barNotes.filter(
                      (n) => n.stringNumber === strNum
                    );
                    const yPos = (strIdx / (TAB_STRINGS.length - 1)) * 100;

                    return (
                      <div
                        key={strNum}
                        className="absolute inset-x-0"
                        style={{ top: `${yPos}%`, height: STRING_HEIGHT }}
                      >
                        {/* String line */}
                        <div className={`absolute inset-x-0 top-1/2 h-px ${darkMode ? 'bg-zinc-400' : 'bg-black'}`} />

                        {/* String label */}
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold"
                          style={{
                            color: strDef?.color || (darkMode ? '#fff' : '#000'),
                            width: LEFT_MARGIN - 8,
                            textAlign: "right",
                            paddingRight: 8,
                          }}
                        >
                          {strDef?.name}
                        </div>

                        {/* Notes */}
                        {stringNotes.map((note, noteIdx) => {
                          const noteOffset = note.time - bar.startTime;
                          const relativePos =
                            barDuration > 0 ? noteOffset / barDuration : 0;
                          const noteX = relativePos * BAR_WIDTH;
                          const isActive =
                            note.time <= currentTime &&
                            note.time + note.duration > currentTime;
                          const isPast = note.time + note.duration <= currentTime;

                          return (
                            <div
                              key={`${note.midiPitch}-${noteIdx}`}
                              className="absolute top-1/2 -translate-y-1/2 z-10"
                              style={{ left: noteX }}
                            >
                              <div
                                className={`
                                  text-[11px] font-mono font-bold px-1.5 py-0.5 min-w-[16px] text-center
                                  transition-all duration-75
                                  ${
                                    isActive
                                      ? 'bg-amber-400 text-black scale-110 shadow-md rounded'
                                      : isPast
                                      ? (darkMode ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-500')
                                      : (darkMode ? 'bg-zinc-900 text-zinc-200' : 'bg-white text-zinc-800')
                                  }
                                `}
                              >
                                {note.fret}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Playhead */}
          <div
            ref={playheadRef}
            className="absolute top-0 bottom-0 w-0.5 bg-green-500 z-20 pointer-events-none"
            style={{
              left:
                LEFT_MARGIN +
                (currentBarIndex >= 0 && currentBarIndex < bars.length
                  ? currentBarIndex * BAR_WIDTH +
                    ((currentTime - bars[currentBarIndex].startTime) /
                      (bars[currentBarIndex].endTime -
                        bars[currentBarIndex].startTime)) *
                      BAR_WIDTH
                  : 0),
            }}
          >
            {/* Playhead arrow */}
            <div className="absolute -top-1 -translate-x-1/2">
              <div className="w-2.5 h-2.5 bg-green-500 rotate-45" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom info */}
      <div className={`flex items-center justify-between px-3 py-1 border-t ${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-100 border-zinc-300'}`}>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>EADGBe</span>
          <span className={`text-[9px] ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>•</span>
          <span className={`text-[9px] ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>22 trastes</span>
        </div>
        <div className="flex items-center gap-1">
          {STANDARD_TUNING.map((s) => (
            <div
              key={s.stringNumber}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: s.color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
