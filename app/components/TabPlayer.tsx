"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ClarinetSVG from "./ClarinetSVG";
import PianoRoll, { RollNote } from "./PianoRoll";
import { KeyId, FINGERINGS, midiToClarinetWrittenNote } from "../lib/clarinet-fingerings";
import { useClarinetAudio } from "../lib/use-clarinet-audio";

interface TabPlayerProps {
  fileData: ArrayBuffer;
  fileName: string;
  onClose: () => void;
}

interface ParsedSong {
  title: string;
  artist: string;
  tempo: number;
  notes: RollNote[];
  totalDuration: number;
}

function parseSongFromBuffer(buffer: ArrayBuffer, fileName: string): Promise<ParsedSong> {
  return import("guitarpro-parser").then(({ parseTabFile, beatDurationMs }) => {
    const data = new Uint8Array(buffer);
    const song = parseTabFile(data, fileName);

    const notes: RollNote[] = [];
    let noteId = 0;

    const track = song.tracks[0];
    if (!track) throw new Error("No se encontraron pistas en el archivo");

    let timeMs = 0;

    for (const bar of track.bars) {
      for (const beat of bar.beats) {
        const durationMs = beatDurationMs(beat);

        if (!beat.isRest && beat.notes.length > 0) {
          for (const note of beat.notes) {
            const stringMidi = track.tuningMidi[note.string] ?? 0;
            const midiPitch = stringMidi + note.fret;

            notes.push({
              id: noteId++,
              noteName: note.noteName,
              midiPitch,
              startTime: timeMs,
              duration: durationMs,
              barIndex: bar.index,
            });
          }
        }

        timeMs += durationMs;
      }
    }

    return {
      title: song.title || fileName.replace(/\.\w+$/, ""),
      artist: song.artist || "Artista desconocido",
      tempo: song.tempo,
      notes,
      totalDuration: timeMs,
    };
  });
}

export default function TabPlayer({ fileData, fileName, onClose }: TabPlayerProps) {
  const [song, setSong] = useState<ParsedSong | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [tempo, setTempo] = useState(100);
  const [muted, setMuted] = useState(false);

  const animRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const currentTimeRef = useRef(0);
  // Track which note IDs have already been triggered so we don't replay them
  const triggeredNotesRef = useRef<Set<number>>(new Set());

  const audio = useClarinetAudio();

  useEffect(() => {
    setLoading(true);
    setError(null);
    parseSongFromBuffer(fileData, fileName)
      .then((parsed) => {
        setSong(parsed);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error parsing tab:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [fileData, fileName]);

  const tick = useCallback(
    (timestamp: number) => {
      if (!song) return;

      if (lastFrameRef.current === 0) {
        lastFrameRef.current = timestamp;
      }

      const delta = (timestamp - lastFrameRef.current) * (tempo / 100);
      lastFrameRef.current = timestamp;

      const next = currentTimeRef.current + delta;

      if (next >= song.totalDuration) {
        setIsPlaying(false);
        currentTimeRef.current = 0;
        setCurrentTime(0);
        lastFrameRef.current = 0;
        audio.stopAll();
        triggeredNotesRef.current.clear();
        return;
      }

      // Trigger audio for notes that just became active
      if (!muted && audio.ready) {
        for (const note of song.notes) {
          if (
            next >= note.startTime &&
            next < note.startTime + note.duration &&
            !triggeredNotesRef.current.has(note.id)
          ) {
            triggeredNotesRef.current.add(note.id);
            const durationSec = (note.duration / 1000) * (100 / tempo);
            audio.playNote(note.midiPitch, durationSec);
          }
        }
      }

      currentTimeRef.current = next;
      setCurrentTime(next);
      animRef.current = requestAnimationFrame(tick);
    },
    [song, tempo, audio, muted],
  );

  useEffect(() => {
    if (isPlaying) {
      lastFrameRef.current = 0;
      animRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(animRef.current);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, tick]);

  const activeNotes = song
    ? song.notes.filter(
        (n) => currentTime >= n.startTime && currentTime < n.startTime + n.duration,
      )
    : [];

  let activeKeys: KeyId[] = [];
  let displayNote = "";

  if (activeNotes.length > 0) {
    const note = activeNotes[0];
    const written = midiToClarinetWrittenNote(note.midiPitch);
    displayNote = written;
    const fingering = FINGERINGS[written];
    if (fingering) {
      activeKeys = fingering.keys;
    }
  }

  const handlePlayPause = () => {
    if (!song) return;
    setIsPlaying((p) => {
      if (p) {
        // Pausing — stop all sounds
        audio.stopAll();
      } else {
        // Resuming — clear triggered set so notes at current position can re-trigger
        triggeredNotesRef.current.clear();
      }
      return !p;
    });
  };

  const handleStop = () => {
    setIsPlaying(false);
    currentTimeRef.current = 0;
    setCurrentTime(0);
    lastFrameRef.current = 0;
    audio.stopAll();
    triggeredNotesRef.current.clear();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    currentTimeRef.current = val;
    setCurrentTime(val);
    audio.stopAll();
    triggeredNotesRef.current.clear();
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-zinc-400">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span>Cargando tablatura...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 text-red-400">
        <div className="flex flex-col items-center gap-4">
          <span className="text-xl">Error al leer el archivo</span>
          <span className="text-sm text-zinc-500">{error}</span>
          <button
            onClick={onClose}
            className="mt-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
          >
            Cargar otro archivo
          </button>
        </div>
      </div>
    );
  }

  if (!song) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar: Song info */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-900/80">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">{song.title}</h2>
          <p className="text-sm text-zinc-500">{song.artist}</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <span>BPM: {song.tempo}</span>
          <span>{song.notes.length} notas</span>
          {!audio.ready && (
            <span className="text-amber-500 text-xs animate-pulse">
              Cargando sonidos...
            </span>
          )}
          <button
            onClick={() => { handleStop(); onClose(); }}
            className="ml-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
          >
            Cambiar archivo
          </button>
        </div>
      </div>

      {/* Main area: Clarinet + Piano Roll */}
      <div className="flex flex-1 min-h-0">
        <div className="w-40 shrink-0 flex flex-col items-center py-4 border-r border-zinc-800 bg-zinc-950/60 overflow-y-auto">
          <ClarinetSVG activeKeys={activeKeys} noteName={displayNote} />
        </div>

        <div className="flex-1 overflow-hidden bg-zinc-950 flex flex-col">
          <div className="flex-1 overflow-hidden border-b border-zinc-800">
            <PianoRoll
              notes={song.notes}
              currentTime={currentTime}
              totalDuration={song.totalDuration}
              isPlaying={isPlaying}
            />
          </div>
        </div>
      </div>

      {/* Bottom: Transport controls */}
      <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/80 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayPause}
            className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center transition-colors"
            title={isPlaying ? "Pausar" : "Reproducir"}
          >
            {isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="2" width="4" height="12" rx="1" />
                <rect x="9" y="2" width="4" height="12" rx="1" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 2l10 6-10 6V2z" />
              </svg>
            )}
          </button>

          <button
            onClick={handleStop}
            className="w-8 h-8 rounded-full bg-zinc-700 hover:bg-zinc-600 text-zinc-300 flex items-center justify-center transition-colors"
            title="Detener"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <rect x="1" y="1" width="10" height="10" rx="1" />
            </svg>
          </button>

          {/* Mute toggle */}
          <button
            onClick={() => { setMuted((m) => !m); if (!muted) audio.stopAll(); }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              muted
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
            }`}
            title={muted ? "Activar sonido" : "Silenciar"}
          >
            {muted ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3 flex-1">
          <span className="text-xs text-zinc-400 w-12 text-right font-mono">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={song.totalDuration}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 accent-amber-400 cursor-pointer"
          />
          <span className="text-xs text-zinc-400 w-12 font-mono">
            {formatTime(song.totalDuration)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Tempo:</span>
          <input
            type="range"
            min={25}
            max={200}
            value={tempo}
            onChange={(e) => setTempo(Number(e.target.value))}
            className="w-24 h-1 accent-amber-400 cursor-pointer"
          />
          <span className="text-xs text-zinc-400 w-10 font-mono">{tempo}%</span>
        </div>
      </div>
    </div>
  );
}
