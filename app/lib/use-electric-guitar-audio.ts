"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Soundfont from "soundfont-player";

export type GuitarTone = "clean" | "overdrive" | "distortion";

export interface ElectricGuitarAudio {
  ready: boolean;
  loading: boolean;
  playNote: (midi: number, durationSec: number, tone?: GuitarTone) => void;
  stopAll: () => void;
  tone: GuitarTone;
  setTone: (tone: GuitarTone) => void;
  volume: number;
  setVolume: (vol: number) => void;
}

// Map guitar tones to soundfont instruments
const TONE_INSTRUMENT_MAP: Record<GuitarTone, Soundfont.InstrumentName> = {
  clean: "electric_guitar_clean",
  overdrive: "overdriven_guitar",
  distortion: "distortion_guitar",
};

// ADSR envelopes for different tones
const TONE_ENVELOPES: Record<GuitarTone, { attack: number; decay: number; sustain: number; release: number }> = {
  clean: {
    attack: 0.02,
    decay: 0.1,
    sustain: 0.7,
    release: 0.3,
  },
  overdrive: {
    attack: 0.03,
    decay: 0.15,
    sustain: 0.75,
    release: 0.35,
  },
  distortion: {
    attack: 0.01,
    decay: 0.08,
    sustain: 0.8,
    release: 0.25,
  },
};

export function useElectricGuitarAudio(initialTone: GuitarTone = "clean"): ElectricGuitarAudio {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tone, setToneState] = useState<GuitarTone>(initialTone);
  const [volume, setVolumeState] = useState(0.8);

  const acRef = useRef<AudioContext | null>(null);
  const playersRef = useRef<Map<GuitarTone, Soundfont.Player>>(new Map());
  const activeNotesRef = useRef<Map<string, number>>(new Map());

  // Load all three guitar tones
  useEffect(() => {
    const ac = new AudioContext();
    acRef.current = ac;
    setLoading(true);

    const tones: GuitarTone[] = ["clean", "overdrive", "distortion"];
    const newPlayers = new Map<GuitarTone, Soundfont.Player>();
    let loaded = 0;

    Promise.all(
      tones.map((t) =>
        Soundfont.instrument(ac, TONE_INSTRUMENT_MAP[t], {
          soundfont: "MusyngKite",
        }).then((player) => {
          newPlayers.set(t, player);
          loaded++;
          if (loaded === tones.length) {
            playersRef.current = newPlayers;
            setReady(true);
            setLoading(false);
          }
        })
      )
    ).catch((err) => {
      console.error("Error loading electric guitar tones:", err);
      playersRef.current = newPlayers;
      setReady(true);
      setLoading(false);
    });

    return () => {
      ac.close();
      playersRef.current = new Map();
    };
  }, []);

  const playNote = useCallback(
    (midi: number, durationSec: number, tone?: GuitarTone) => {
      const ac = acRef.current;
      if (!ac) return;

      const activeTone = tone ?? tone;
      const player = playersRef.current.get(activeTone);
      if (!player) return;

      const key = `eg-${midi}`;
      if (activeNotesRef.current.has(key)) return;
      activeNotesRef.current.set(key, Date.now());

      const envelope = TONE_ENVELOPES[activeTone];

      player.play(String(midi), ac.currentTime, {
        duration: durationSec,
        gain: volume * 1.5, // Guitar needs a bit more gain
        attack: envelope.attack,
        decay: envelope.decay,
        sustain: envelope.sustain,
        release: envelope.release,
      });

      setTimeout(() => {
        activeNotesRef.current.delete(key);
      }, durationSec * 1000);
    },
    [tone, volume]
  );

  const stopAll = useCallback(() => {
    for (const player of playersRef.current.values()) {
      player.stop();
    }
    activeNotesRef.current.clear();
  }, []);

  const setTone = useCallback((newTone: GuitarTone) => {
    setToneState(newTone);
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(Math.max(0, Math.min(1, vol)));
  }, []);

  return {
    ready,
    loading,
    playNote,
    stopAll,
    tone,
    setTone,
    volume,
    setVolume,
  };
}
