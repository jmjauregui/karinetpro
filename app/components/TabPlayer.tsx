"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ClarinetSVG from "./ClarinetSVG";
import GuitarStringVisualizer from "./GuitarStringVisualizer";
import PianoRoll, { RollNote } from "./PianoRoll";
import { KeyId, FINGERINGS, midiToClarinetWrittenNote } from "../lib/clarinet-fingerings";
import { useMultiAudio, type TrackAudioState } from "../lib/use-multi-audio";
import { useElectricGuitarAudio, type GuitarTone } from "../lib/use-electric-guitar-audio";
import {
  getBestPositionForMidiNote,
  getPositionsForMidiNote,
  midiToNoteName,
  isPlayableOnGuitar,
  STANDARD_TUNING,
} from "../lib/electric-guitar-utils";
import { addRecentFile } from "../lib/recent-files";
import {
  isTabFavorite,
  toggleFavoriteTab,
  type FavoriteTab,
} from "../lib/favorites";

export interface TabSourceInfo {
  artistSlug: string;
  artistName: string;
  songSlug: string;
  songName: string;
}

interface TabPlayerProps {
  fileData: ArrayBuffer;
  fileName: string;
  sourceInfo?: TabSourceInfo;
  onClose: () => void;
  onFavoritesChanged?: () => void;
}

interface BarInfo {
  index: number;
  startTime: number;
  endTime: number;
  timeSignature: { numerator: number; denominator: number };
  section?: string;
}

interface TrackInfo {
  index: number;
  name: string;
  instrument: string | null;
  noteCount: number;
  notes: RollNote[];
  totalDuration: number;
  bars: BarInfo[];
  isPercussion: boolean;
}

interface ParsedSong {
  title: string;
  artist: string;
  tempo: number;
  tracks: TrackInfo[];
}

function parseSongFromBuffer(buffer: ArrayBuffer, fileName: string): Promise<ParsedSong> {
  return import("guitarpro-parser").then(({ parseTabFile, parseGp3File, beatDurationMs }) => {
    const data = new Uint8Array(buffer);

    let song;
    const headerLen = data[0];
    if (headerLen > 10 && headerLen < 50 && data.byteLength > headerLen + 1) {
      const versionStr = String.fromCharCode(...Array.from(data.subarray(1, 1 + Math.min(headerLen, 40))));
      if (versionStr.includes("GUITAR PRO") && versionStr.includes("v4")) {
        const patched = new Uint8Array(data);
        for (let i = 1; i < 1 + headerLen - 1; i++) {
          if (patched[i] === 0x76 && patched[i + 1] === 0x34) {
            patched[i + 1] = 0x33;
            break;
          }
        }
        song = parseGp3File(patched);
      }
    }
    if (!song) {
      song = parseTabFile(data, fileName);
    }

    if (song.tracks.length === 0) throw new Error("No se encontraron pistas en el archivo");

    let globalNoteId = 0;

    const tracks: TrackInfo[] = song.tracks.map((track, trackIdx) => {
      const notes: RollNote[] = [];
      const bars: BarInfo[] = [];
      let timeMs = 0;

      for (const bar of track.bars) {
        const barStart = timeMs;

        for (const beat of bar.beats) {
          const durationMs = beatDurationMs(beat);

          if (!beat.isRest && beat.notes.length > 0) {
            for (const note of beat.notes) {
              const stringMidi = track.tuningMidi[note.string] ?? 0;
              const midiPitch = stringMidi + note.fret;

              notes.push({
                id: globalNoteId++,
                noteName: note.noteName,
                midiPitch,
                startTime: timeMs,
                duration: durationMs,
                barIndex: bar.index,
                guitarString: note.string + 1, // GP uses 0-5, convert to 1-6
                guitarFret: note.fret,
              });
            }
          }

          timeMs += durationMs;
        }

        bars.push({
          index: bar.index,
          startTime: barStart,
          endTime: timeMs,
          timeSignature: bar.timeSignature,
          section: bar.section?.text,
        });
      }

      // Detect percussion: channel 10 is percussion in GM, or name hints
      const isPercussion =
        track.instrument?.includes("MIDI 0") === false &&
        (track.name.toLowerCase().includes("drum") ||
          track.name.toLowerCase().includes("perc") ||
          track.name.toLowerCase().includes("batería") ||
          track.name.toLowerCase().includes("bater"));

      return {
        index: trackIdx,
        name: track.name || `Pista ${trackIdx + 1}`,
        instrument: track.instrument,
        noteCount: notes.length,
        notes,
        totalDuration: timeMs,
        bars,
        isPercussion,
      };
    });

    return {
      title: song.title || fileName.replace(/\.\w+$/, ""),
      artist: song.artist || "Artista desconocido",
      tempo: song.tempo,
      tracks,
    };
  });
}

export type InstrumentType = "clarinet" | "electric-guitar";

export default function TabPlayer({ fileData, fileName, sourceInfo, onClose, onFavoritesChanged }: TabPlayerProps) {
  const [song, setSong] = useState<ParsedSong | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [tempo, setTempo] = useState(100);
  const [instrument, setInstrument] = useState<InstrumentType>("clarinet");
  const [isFav, setIsFav] = useState(
    sourceInfo ? isTabFavorite(sourceInfo.artistSlug, sourceInfo.songSlug) : false,
  );

  // Transposition in semitones
  const [transpose, setTranspose] = useState(0);

  // Loop A-B
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);

  // Metronome
  const [metronomeOn, setMetronomeOn] = useState(false);

  // Mixer panel visibility
  const [showMixer, setShowMixer] = useState(false);

  const animRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const currentTimeRef = useRef(0);
  const triggeredNotesRef = useRef<Set<string>>(new Set());
  const metronomeBarRef = useRef(-1);
  const metronomeBeatRef = useRef(-1);
  const metronomeAcRef = useRef<AudioContext | null>(null);

  const trackDefs = useMemo(
    () =>
      song?.tracks.map((t) => ({
        instrumentStr: t.instrument,
        isPercussion: t.isPercussion,
      })) ?? [],
    [song],
  );

  const audio = useMultiAudio(trackDefs);

  // Electric guitar audio (only used when instrument is "electric-guitar")
  const guitarAudio = useElectricGuitarAudio("clean");

  const track = useMemo(() => song?.tracks[selectedTrack] ?? null, [song, selectedTrack]);

  // Max duration across all tracks
  const maxDuration = useMemo(() => {
    if (!song) return 0;
    return Math.max(...song.tracks.map((t) => t.totalDuration));
  }, [song]);

  // Sections from current track for navigation
  const sections = useMemo(() => {
    if (!track) return [];
    return track.bars.filter((b) => b.section).map((b) => ({ label: b.section!, time: b.startTime, bar: b.index }));
  }, [track]);

  // Current bar info
  const currentBar = useMemo(() => {
    if (!track) return null;
    return track.bars.find((b) => currentTime >= b.startTime && currentTime < b.endTime) ?? track.bars[0] ?? null;
  }, [track, currentTime]);

  // Save to recent files on load
  useEffect(() => {
    setLoading(true);
    setError(null);
    parseSongFromBuffer(fileData, fileName)
      .then((parsed) => {
        setSong(parsed);
        setSelectedTrack(0);
        setLoading(false);
        addRecentFile({
          fileName,
          artistSlug: sourceInfo?.artistSlug,
          artistName: sourceInfo?.artistName,
          songSlug: sourceInfo?.songSlug,
          songName: sourceInfo?.songName,
        });
      })
      .catch((err) => {
        console.error("Error parsing tab:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [fileData, fileName, sourceInfo]);

  // Reset playback when switching tracks
  const handleTrackChange = useCallback((idx: number) => {
    setIsPlaying(false);
    currentTimeRef.current = 0;
    setCurrentTime(0);
    lastFrameRef.current = 0;
    audio.stopAll();
    guitarAudio.stopAll();
    triggeredNotesRef.current.clear();
    setSelectedTrack(idx);
  }, [audio, guitarAudio]);

  // Determine which tracks should actually play sound
  const shouldTrackPlay = useCallback(
    (trackIdx: number): boolean => {
      const states = audio.trackStates;
      if (!states[trackIdx]) return false;
      if (states[trackIdx].muted) return false;
      const anySolo = states.some((s) => s.solo);
      if (anySolo && !states[trackIdx].solo) return false;
      return true;
    },
    [audio.trackStates],
  );

  // Metronome click
  const playMetronomeClick = useCallback((isDownbeat: boolean) => {
    if (!metronomeAcRef.current) {
      metronomeAcRef.current = new AudioContext();
    }
    const ac = metronomeAcRef.current;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.frequency.value = isDownbeat ? 1000 : 800;
    gain.gain.value = isDownbeat ? 0.3 : 0.15;
    osc.start(ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);
    osc.stop(ac.currentTime + 0.08);
  }, []);

  const tick = useCallback(
    (timestamp: number) => {
      if (!song) return;

      if (lastFrameRef.current === 0) {
        lastFrameRef.current = timestamp;
      }

      const delta = (timestamp - lastFrameRef.current) * (tempo / 100);
      lastFrameRef.current = timestamp;

      let next = currentTimeRef.current + delta;

      // Loop A-B
      if (loopA !== null && loopB !== null && next >= loopB) {
        next = loopA;
        triggeredNotesRef.current.clear();
        audio.stopAll();
        metronomeBarRef.current = -1;
        metronomeBeatRef.current = -1;
      }

      if (next >= maxDuration) {
        setIsPlaying(false);
        currentTimeRef.current = 0;
        setCurrentTime(0);
        lastFrameRef.current = 0;
        audio.stopAll();
        triggeredNotesRef.current.clear();
        return;
      }

      // Play notes from ALL active tracks
      if (audio.ready) {
        for (let ti = 0; ti < song.tracks.length; ti++) {
          if (!shouldTrackPlay(ti)) continue;
          const vol = audio.trackStates[ti]?.volume ?? 0.8;
          for (const note of song.tracks[ti].notes) {
            if (
              next >= note.startTime &&
              next < note.startTime + note.duration
            ) {
              const key = `${ti}-${note.id}`;
              if (!triggeredNotesRef.current.has(key)) {
                triggeredNotesRef.current.add(key);
                const durationSec = (note.duration / 1000) * (100 / tempo);
                const pitch = note.midiPitch + (ti === selectedTrack ? transpose : 0);

                if (instrument === "electric-guitar") {
                  // Use electric guitar audio
                  if (guitarAudio.ready && isPlayableOnGuitar(pitch)) {
                    guitarAudio.playNote(pitch, durationSec * vol, guitarAudio.tone);
                  }
                } else {
                  // Use multi-track audio (clarinet, etc.)
                  audio.playNote(ti, pitch, durationSec * vol);
                }
              }
            }
          }
        }
      }

      // Metronome
      if (metronomeOn && track) {
        const bar = track.bars.find((b) => next >= b.startTime && next < b.endTime);
        if (bar) {
          const barDuration = bar.endTime - bar.startTime;
          const beatDuration = barDuration / bar.timeSignature.numerator;
          const beatInBar = Math.floor((next - bar.startTime) / beatDuration);
          if (bar.index !== metronomeBarRef.current || beatInBar !== metronomeBeatRef.current) {
            metronomeBarRef.current = bar.index;
            metronomeBeatRef.current = beatInBar;
            playMetronomeClick(beatInBar === 0);
          }
        }
      }

      currentTimeRef.current = next;
      setCurrentTime(next);
      animRef.current = requestAnimationFrame(tick);
    },
    [song, track, tempo, audio, guitarAudio, shouldTrackPlay, selectedTrack, transpose, loopA, loopB, maxDuration, metronomeOn, playMetronomeClick, instrument],
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

  // Transposed notes for display
  const displayNotes = useMemo(() => {
    if (!track || transpose === 0) return track?.notes ?? [];
    return track.notes.map((n) => ({ ...n, midiPitch: n.midiPitch + transpose }));
  }, [track, transpose]);

  const activeNotes = track
    ? displayNotes.filter(
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

  const handlePlayPause = useCallback(() => {
    if (!song) return;
    setIsPlaying((p) => {
      if (p) {
        audio.stopAll();
        guitarAudio.stopAll();
      } else {
        triggeredNotesRef.current.clear();
        metronomeBarRef.current = -1;
        metronomeBeatRef.current = -1;
      }
      return !p;
    });
  }, [song, audio, guitarAudio]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    currentTimeRef.current = 0;
    setCurrentTime(0);
    lastFrameRef.current = 0;
    audio.stopAll();
    guitarAudio.stopAll();
    triggeredNotesRef.current.clear();
    metronomeBarRef.current = -1;
    metronomeBeatRef.current = -1;
  }, [audio, guitarAudio]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    currentTimeRef.current = val;
    setCurrentTime(val);
    audio.stopAll();
    triggeredNotesRef.current.clear();
  };

  const seekTo = useCallback((timeMs: number) => {
    const clamped = Math.max(0, Math.min(maxDuration, timeMs));
    currentTimeRef.current = clamped;
    setCurrentTime(clamped);
    audio.stopAll();
    guitarAudio.stopAll();
    triggeredNotesRef.current.clear();
  }, [maxDuration, audio, guitarAudio]);

  const seekBy = useCallback((deltaMs: number) => {
    seekTo(currentTimeRef.current + deltaMs);
  }, [seekTo]);

  // Loop A-B toggle
  const handleLoopToggle = useCallback(() => {
    if (loopA === null) {
      setLoopA(currentTimeRef.current);
    } else if (loopB === null) {
      const b = currentTimeRef.current;
      if (b > loopA) {
        setLoopB(b);
      } else {
        // B before A: swap
        setLoopB(loopA);
        setLoopA(b);
      }
    } else {
      // Clear loop
      setLoopA(null);
      setLoopB(null);
    }
    // Reset metronome and stop audio on loop change
    metronomeBarRef.current = -1;
    metronomeBeatRef.current = -1;
  }, [loopA, loopB]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        seekBy(-2000);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        seekBy(2000);
      } else if (e.code === "KeyL") {
        e.preventDefault();
        handleLoopToggle();
      } else if (e.code === "KeyM") {
        e.preventDefault();
        setMetronomeOn((m) => !m);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePlayPause, seekBy, handleLoopToggle]);

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

  if (!song || !track) return null;

  const loopActive = loopA !== null && loopB !== null;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/80">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-zinc-100 truncate">{song.title}</h2>
          <p className="text-sm text-zinc-500 truncate">{song.artist}</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-400 shrink-0">
          {/* Track selector (main view track) */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="track-select" className="text-xs text-zinc-500">Vista:</label>
            <select
              id="track-select"
              value={selectedTrack}
              onChange={(e) => handleTrackChange(Number(e.target.value))}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer max-w-[180px]"
            >
              {song.tracks.map((t) => (
                <option key={t.index} value={t.index}>
                  {t.name} ({t.noteCount})
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs">BPM: {song.tempo}</span>

          {/* Bar / section indicator */}
          {currentBar && (
            <span className="text-xs text-zinc-500">
              C.{currentBar.index + 1}
              {currentBar.section && <span className="text-amber-400 ml-1">{currentBar.section}</span>}
              <span className="ml-1 text-zinc-600">{currentBar.timeSignature.numerator}/{currentBar.timeSignature.denominator}</span>
            </span>
          )}

          {/* Mixer toggle */}
          <button
            onClick={() => setShowMixer((s) => !s)}
            className={`px-2 py-1 rounded text-xs transition-colors ${showMixer ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
            title="Mezclador de pistas"
          >
            Mixer
          </button>

          {/* Favorite */}
          {sourceInfo && (
            <button
              onClick={() => {
                const added = toggleFavoriteTab({
                  artistSlug: sourceInfo.artistSlug,
                  artistName: sourceInfo.artistName,
                  songSlug: sourceInfo.songSlug,
                  songName: sourceInfo.songName,
                });
                setIsFav(added);
                onFavoritesChanged?.();
              }}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                isFav ? "bg-pink-500/20 text-pink-400" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
              title={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
            >
              {isFav ? "Fav" : "+Fav"}
            </button>
          )}

          {!audio.ready && instrument === "clarinet" && (
            <span className="text-amber-500 text-xs animate-pulse">
              Cargando ({audio.loadingInstruments}/{audio.totalInstruments})...
            </span>
          )}

          {!guitarAudio.ready && instrument === "electric-guitar" && (
            <span className="text-amber-500 text-xs animate-pulse">
              Cargando guitarra...
            </span>
          )}

          <button
            onClick={() => { handleStop(); onClose(); }}
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Section navigation bar */}
      {sections.length > 0 && (
        <div className="flex items-center gap-1 px-4 py-1.5 border-b border-zinc-800 bg-zinc-900/50 overflow-x-auto">
          <span className="text-[10px] text-zinc-600 mr-1">Secciones:</span>
          {sections.map((s, i) => (
            <button
              key={i}
              onClick={() => seekTo(s.time)}
              className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                currentBar && currentBar.section === s.label
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar: instrument selector + note display */}
        <div className="w-48 shrink-0 flex flex-col items-center py-4 border-r border-zinc-800 bg-zinc-950/60 overflow-y-auto">
          {/* Instrument selector */}
          <div className="mb-3 flex flex-col items-center gap-2">
            <select
              value={instrument}
              onChange={(e) => setInstrument(e.target.value as InstrumentType)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="clarinet">Clarinete</option>
              <option value="electric-guitar">Guitarra Eléctrica</option>
            </select>
          </div>

          {/* Large note name */}
          <div className="mb-2 text-center">
            <div className="text-3xl font-bold text-amber-400 min-h-[40px]">
              {displayNote || "-"}
            </div>
            {transpose !== 0 && (
              <div className="text-[10px] text-zinc-500">
                Transp: {transpose > 0 ? "+" : ""}{transpose}
              </div>
            )}
          </div>

          {/* Clarinet SVG (only when clarinet is selected) */}
          {instrument === "clarinet" && (
            <ClarinetSVG activeKeys={activeKeys} noteName={displayNote} />
          )}
        </div>

        {/* Right area: Guitar Tab or Piano Roll */}
        <div className="flex-1 overflow-hidden bg-zinc-950 flex flex-col">
          {instrument === "electric-guitar" ? (
            /* Guitar Tablature - full width */
            <div className="flex-1 p-2">
              <GuitarStringVisualizer
                notes={displayNotes.map((n) => ({
                  stringNumber: n.guitarString ?? 1,
                  fret: n.guitarFret ?? 0,
                  time: n.startTime,
                  duration: n.duration,
                  midiPitch: n.midiPitch,
                }))}
                bars={track.bars}
                currentTime={currentTime}
                totalDuration={track.totalDuration}
                isPlaying={isPlaying}
              />
            </div>
          ) : (
            /* Piano Roll (clarinet mode) */
            <div className="flex-1 overflow-hidden border-b border-zinc-800">
              <PianoRoll
                notes={displayNotes}
                currentTime={currentTime}
                totalDuration={track.totalDuration}
                isPlaying={isPlaying}
                loopA={loopA}
                loopB={loopB}
                bars={track.bars}
                onSeek={seekTo}
              />
            </div>
          )}

          {/* Mixer panel */}
          {showMixer && (
            <div className="w-56 shrink-0 border-l border-zinc-800 bg-zinc-900/80 overflow-y-auto self-end">
            <div className="px-3 py-2 border-b border-zinc-800">
              <span className="text-xs font-semibold text-zinc-300">Mezclador</span>
            </div>
            {song.tracks.map((t, i) => {
              const st = audio.trackStates[i];
              if (!st) return null;
              return (
                <div
                  key={i}
                  className={`px-3 py-2 border-b border-zinc-800/50 ${i === selectedTrack ? "bg-amber-500/5" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-zinc-300 truncate max-w-[100px]" title={t.name}>
                      {t.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => audio.setTrackMuted(i, !st.muted)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          st.muted ? "bg-red-500/30 text-red-400" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        M
                      </button>
                      <button
                        onClick={() => audio.setTrackSolo(i, !st.solo)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          st.solo ? "bg-amber-500/30 text-amber-400" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        S
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(st.volume * 100)}
                    onChange={(e) => audio.setTrackVolume(i, Number(e.target.value) / 100)}
                    className="w-full h-1 accent-amber-400 cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {/* Bottom: Transport controls */}
      <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/80 flex items-center gap-3">
        {/* Transport buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePlayPause}
            className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center transition-colors"
            title={isPlaying ? "Pausar (Espacio)" : "Reproducir (Espacio)"}
          >
            {isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="2" width="4" height="12" rx="1" />
                <rect x="9" y="2" width="4" height="12" rx="1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 2l10 6-10 6V2z" />
              </svg>
            )}
          </button>

          <button
            onClick={handleStop}
            className="w-7 h-7 rounded-full bg-zinc-700 hover:bg-zinc-600 text-zinc-300 flex items-center justify-center transition-colors"
            title="Detener"
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
              <rect x="1" y="1" width="10" height="10" rx="1" />
            </svg>
          </button>

          {/* Metronome */}
          <button
            onClick={() => setMetronomeOn((m) => !m)}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors text-[10px] font-bold ${
              metronomeOn ? "bg-green-500/20 text-green-400" : "bg-zinc-700 text-zinc-500 hover:text-zinc-300"
            }`}
            title={`Metrónomo (M) ${metronomeOn ? "ON" : "OFF"}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L8 22h8L12 2z" />
              <path d="M12 8l4-3" />
            </svg>
          </button>

          {/* Loop A-B */}
          <button
            onClick={handleLoopToggle}
            className={`px-2 h-7 rounded-full flex items-center justify-center transition-colors text-[10px] font-bold ${
              loopActive
                ? "bg-purple-500/20 text-purple-400"
                : loopA !== null
                ? "bg-purple-500/10 text-purple-300 animate-pulse"
                : "bg-zinc-700 text-zinc-500 hover:text-zinc-300"
            }`}
            title={
              loopA === null
                ? "Marcar punto A (L)"
                : loopB === null
                ? "Marcar punto B (L)"
                : "Quitar loop (L)"
            }
          >
            {loopA === null ? "A-B" : loopB === null ? "B?" : "A-B"}
          </button>
        </div>

        {/* Timeline */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs text-zinc-400 w-10 text-right font-mono">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 relative">
            <input
              type="range"
              min={0}
              max={maxDuration}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 accent-amber-400 cursor-pointer"
            />
            {/* Loop markers on timeline */}
            {loopA !== null && (
              <div
                className="absolute top-0 h-full w-0.5 bg-purple-400 pointer-events-none"
                style={{ left: `${(loopA / maxDuration) * 100}%` }}
              />
            )}
            {loopB !== null && (
              <div
                className="absolute top-0 h-full w-0.5 bg-purple-400 pointer-events-none"
                style={{ left: `${(loopB / maxDuration) * 100}%` }}
              />
            )}
          </div>
          <span className="text-xs text-zinc-400 w-10 font-mono">
            {formatTime(maxDuration)}
          </span>
        </div>

        {/* Tempo */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-500">Tempo:</span>
          <input
            type="range"
            min={10}
            max={1000}
            step={5}
            value={tempo}
            onChange={(e) => setTempo(Number(e.target.value))}
            className="w-28 h-1 accent-amber-400 cursor-pointer"
          />
          <span className="text-[10px] text-zinc-400 w-10 font-mono">{tempo}%</span>
        </div>

        {/* Transposition */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-zinc-500">Transp:</span>
          <button
            onClick={() => setTranspose((t) => t - 1)}
            className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 flex items-center justify-center text-xs"
          >
            -
          </button>
          <span className="text-[10px] text-zinc-300 w-6 text-center font-mono">
            {transpose > 0 ? "+" : ""}{transpose}
          </span>
          <button
            onClick={() => setTranspose((t) => t + 1)}
            className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 flex items-center justify-center text-xs"
          >
            +
          </button>
        </div>

        {/* Guitar tone selector (only for electric guitar) */}
        {instrument === "electric-guitar" && (
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-zinc-700">
            <span className="text-[10px] text-zinc-500">Tono:</span>
            <button
              onClick={() => guitarAudio.setTone("clean")}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                guitarAudio.tone === "clean"
                  ? "bg-green-500/30 text-green-400"
                  : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Clean
            </button>
            <button
              onClick={() => guitarAudio.setTone("overdrive")}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                guitarAudio.tone === "overdrive"
                  ? "bg-amber-500/30 text-amber-400"
                  : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              OD
            </button>
            <button
              onClick={() => guitarAudio.setTone("distortion")}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                guitarAudio.tone === "distortion"
                  ? "bg-red-500/30 text-red-400"
                  : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Dist
            </button>
          </div>
        )}
      </div>

      {/* Keyboard shortcuts help */}
      <div className="px-4 py-1 border-t border-zinc-800/50 bg-zinc-950/80 flex items-center gap-4 text-[9px] text-zinc-600">
        <span>Espacio: Play/Pausa</span>
        <span>Flechas: -/+2s</span>
        <span>L: Loop A-B</span>
        <span>M: Metrónomo</span>
      </div>
    </div>
  );
}
