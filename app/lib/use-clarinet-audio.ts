"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Soundfont from "soundfont-player";

export interface ClarinetAudio {
  /** True once the soundfont is loaded and ready to play */
  ready: boolean;
  /** Play a MIDI note for a given duration (seconds) */
  playNote: (midi: number, duration: number) => void;
  /** Stop all currently playing notes */
  stopAll: () => void;
}

export function useClarinetAudio(): ClarinetAudio {
  const [ready, setReady] = useState(false);
  const instrumentRef = useRef<Soundfont.Player | null>(null);
  const acRef = useRef<AudioContext | null>(null);
  // Track which MIDI notes are currently sounding so we don't re-trigger
  const activeNotesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const ac = new AudioContext();
    acRef.current = ac;

    Soundfont.instrument(ac, "clarinet" as Soundfont.InstrumentName, {
      soundfont: "FluidR3_GM",
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

    // Don't re-trigger if this note is already sounding
    if (activeNotesRef.current.has(midi)) return;
    activeNotesRef.current.add(midi);

    inst.play(String(midi), ac.currentTime, {
      duration: durationSec,
      gain: 3,
    });

    // Remove from active set after duration
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
