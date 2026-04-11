"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Soundfont from "soundfont-player";

export interface ClarinetAudio {
  ready: boolean;
  playNote: (midi: number, duration: number) => void;
  stopAll: () => void;
}

export function useClarinetAudio(): ClarinetAudio {
  const [ready, setReady] = useState(false);
  const instrumentRef = useRef<Soundfont.Player | null>(null);
  const acRef = useRef<AudioContext | null>(null);
  const activeNotesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const ac = new AudioContext();
    acRef.current = ac;

    // MusyngKite has higher quality, more realistic samples than FluidR3_GM
    Soundfont.instrument(ac, "clarinet" as Soundfont.InstrumentName, {
      soundfont: "MusyngKite",
    }).then((player) => {
      instrumentRef.current = player;
      setReady(true);
    });

    return () => {
      ac.close();
    };
  }, []);

  const playNote = useCallback((midi: number, durationSec: number) => {
    const inst = instrumentRef.current;
    const ac = acRef.current;
    if (!inst || !ac) return;

    if (activeNotesRef.current.has(midi)) return;
    activeNotesRef.current.add(midi);

    // ADSR tuned for clarinet: soft attack, full sustain, gentle release
    inst.play(String(midi), ac.currentTime, {
      duration: durationSec,
      gain: 4,
      attack: 0.05,
      decay: 0.1,
      sustain: 0.9,
      release: 0.3,
    });

    setTimeout(() => {
      activeNotesRef.current.delete(midi);
    }, durationSec * 1000);
  }, []);

  const stopAll = useCallback(() => {
    instrumentRef.current?.stop();
    activeNotesRef.current.clear();
  }, []);

  return { ready, playNote, stopAll };
}
