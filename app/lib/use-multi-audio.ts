"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Soundfont from "soundfont-player";
import { midiProgramToSoundfont, PERCUSSION_INSTRUMENT } from "./gm-instruments";

export interface TrackAudioState {
  muted: boolean;
  solo: boolean;
  volume: number; // 0-1
}

export interface MultiAudio {
  ready: boolean;
  loadingInstruments: number;
  totalInstruments: number;
  playNote: (trackIndex: number, midi: number, durationSec: number) => void;
  stopAll: () => void;
  trackStates: TrackAudioState[];
  setTrackMuted: (idx: number, muted: boolean) => void;
  setTrackSolo: (idx: number, solo: boolean) => void;
  setTrackVolume: (idx: number, volume: number) => void;
}

interface TrackInstrumentDef {
  instrumentStr: string | null; // e.g. "MIDI 25"
  isPercussion: boolean;
}

export function useMultiAudio(tracks: TrackInstrumentDef[]): MultiAudio {
  const [ready, setReady] = useState(false);
  const [loadingInstruments, setLoadingInstruments] = useState(0);
  const [totalInstruments, setTotalInstruments] = useState(0);
  const [trackStates, setTrackStates] = useState<TrackAudioState[]>([]);

  const acRef = useRef<AudioContext | null>(null);
  const playersRef = useRef<Map<string, Soundfont.Player>>(new Map());
  const trackInstrumentNames = useRef<string[]>([]);
  const activeNotesRef = useRef<Map<string, number>>(new Map());

  // Initialize track states when tracks change
  useEffect(() => {
    setTrackStates(tracks.map(() => ({ muted: false, solo: false, volume: 0.8 })));
  }, [tracks.length]);

  useEffect(() => {
    const ac = new AudioContext();
    acRef.current = ac;

    // Determine unique instruments needed
    const instrumentNames: string[] = tracks.map((t) => {
      if (t.isPercussion) return PERCUSSION_INSTRUMENT;
      const match = t.instrumentStr?.match(/MIDI (\d+)/);
      const program = match ? parseInt(match[1], 10) : 0;
      return midiProgramToSoundfont(program);
    });

    trackInstrumentNames.current = instrumentNames;
    const uniqueNames = [...new Set(instrumentNames)];

    // Always load clarinet for the main view
    if (!uniqueNames.includes("clarinet")) {
      uniqueNames.push("clarinet");
    }

    setTotalInstruments(uniqueNames.length);
    setLoadingInstruments(0);
    setReady(false);

    let loaded = 0;
    const newPlayers = new Map<string, Soundfont.Player>();

    Promise.all(
      uniqueNames.map((name) =>
        Soundfont.instrument(ac, name as Soundfont.InstrumentName, {
          soundfont: "MusyngKite",
        }).then((player) => {
          newPlayers.set(name, player);
          loaded++;
          setLoadingInstruments(loaded);
        })
      )
    ).then(() => {
      playersRef.current = newPlayers;
      setReady(true);
    }).catch((err) => {
      console.error("Error loading instruments:", err);
      // Try to be ready with whatever loaded
      playersRef.current = newPlayers;
      setReady(true);
    });

    return () => {
      ac.close();
      playersRef.current = new Map();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks.length]);

  const playNote = useCallback(
    (trackIndex: number, midi: number, durationSec: number) => {
      const ac = acRef.current;
      if (!ac) return;

      const instrumentName = trackInstrumentNames.current[trackIndex];
      const player = playersRef.current.get(instrumentName);
      if (!player) return;

      const key = `${trackIndex}-${midi}`;
      if (activeNotesRef.current.has(key)) return;
      activeNotesRef.current.set(key, Date.now());

      player.play(String(midi), ac.currentTime, {
        duration: durationSec,
        gain: 3,
        attack: 0.04,
        decay: 0.1,
        sustain: 0.85,
        release: 0.25,
      });

      setTimeout(() => {
        activeNotesRef.current.delete(key);
      }, durationSec * 1000);
    },
    []
  );

  const stopAll = useCallback(() => {
    for (const player of playersRef.current.values()) {
      player.stop();
    }
    activeNotesRef.current.clear();
  }, []);

  const setTrackMuted = useCallback((idx: number, muted: boolean) => {
    setTrackStates((prev) => prev.map((s, i) => (i === idx ? { ...s, muted } : s)));
  }, []);

  const setTrackSolo = useCallback((idx: number, solo: boolean) => {
    setTrackStates((prev) => prev.map((s, i) => (i === idx ? { ...s, solo } : s)));
  }, []);

  const setTrackVolume = useCallback((idx: number, volume: number) => {
    setTrackStates((prev) => prev.map((s, i) => (i === idx ? { ...s, volume } : s)));
  }, []);

  return {
    ready,
    loadingInstruments,
    totalInstruments,
    playNote,
    stopAll,
    trackStates,
    setTrackMuted,
    setTrackSolo,
    setTrackVolume,
  };
}
