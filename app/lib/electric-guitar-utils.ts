/**
 * Electric guitar utilities for 6-string electric guitar.
 * Standard tuning: E2 A2 D3 G3 B3 E4 (from lowest/thickest to highest/thinnest string).
 */

export interface GuitarString {
  stringNumber: number; // 1-6 (1 = lowest/E, 6 = highest/e)
  name: string; // "E", "A", "D", "G", "B", "e"
  openMidi: number; // MIDI note number for open string
  color: string; // Visual color for the string
}

export interface GuitarFretPosition {
  stringNumber: number;
  fret: number; // 0 = open, 1-24+ = fretted
  midiNote: number;
  noteName: string;
}

// Standard tuning MIDI notes (E2=40, A2=45, D3=50, G3=55, B3=59, E4=64)
export const STANDARD_TUNING: GuitarString[] = [
  { stringNumber: 1, name: "E", openMidi: 40, color: "#ef4444" }, // Red (low E)
  { stringNumber: 2, name: "A", openMidi: 45, color: "#f97316" }, // Orange
  { stringNumber: 3, name: "D", openMidi: 50, color: "#eab308" }, // Yellow
  { stringNumber: 4, name: "G", openMidi: 55, color: "#22c55e" }, // Green
  { stringNumber: 5, name: "B", openMidi: 59, color: "#3b82f6" }, // Blue
  { stringNumber: 6, name: "e", openMidi: 64, color: "#a855f7" }, // Purple (high e)
];

// Number of frets on a standard electric guitar
export const DEFAULT_FRET_COUNT = 22;

// Note names
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/**
 * Get the MIDI note number for a given string and fret.
 */
export function getMidiNoteForFret(stringNumber: number, fret: number): number {
  const stringDef = STANDARD_TUNING.find((s) => s.stringNumber === stringNumber);
  if (!stringDef) throw new Error(`Invalid string number: ${stringNumber}`);
  if (fret < 0) throw new Error(`Fret cannot be negative: ${fret}`);
  return stringDef.openMidi + fret;
}

/**
 * Get the note name for a MIDI note number.
 */
export function midiToNoteName(midi: number): string {
  const noteIndex = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * Find the best string/fret combination for a given MIDI note.
 * Returns all possible positions (same note can be played on different strings/frets).
 */
export function getPositionsForMidiNote(midiNote: number): GuitarFretPosition[] {
  const positions: GuitarFretPosition[] = [];
  const noteName = midiToNoteName(midiNote);

  for (const stringDef of STANDARD_TUNING) {
    const fret = midiNote - stringDef.openMidi;
    if (fret >= 0 && fret <= DEFAULT_FRET_COUNT) {
      positions.push({
        stringNumber: stringDef.stringNumber,
        fret,
        midiNote,
        noteName,
      });
    }
  }

  return positions;
}

/**
 * Find the most natural position for a MIDI note (prefer higher strings for lower frets).
 * Returns the position with the lowest fret number, or the first valid position.
 */
export function getBestPositionForMidiNote(midiNote: number): GuitarFretPosition | null {
  const positions = getPositionsForMidiNote(midiNote);
  if (positions.length === 0) return null;
  // Prefer positions with frets in the "comfortable" range (0-12)
  const comfortable = positions.filter((p) => p.fret <= 12);
  if (comfortable.length > 0) {
    return comfortable.reduce((best, current) => (current.fret < best.fret ? current : best));
  }
  // Otherwise, return the position with the lowest fret
  return positions.reduce((best, current) => (current.fret < best.fret ? current : best));
}

/**
 * Get string definition by string number.
 */
export function getStringDef(stringNumber: number): GuitarString | undefined {
  return STANDARD_TUNING.find((s) => s.stringNumber === stringNumber);
}

/**
 * Check if a MIDI note can be played on the guitar.
 */
export function isPlayableOnGuitar(midiNote: number): boolean {
  return getPositionsForMidiNote(midiNote).length > 0;
}

/**
 * Get the MIDI note range of the guitar.
 */
export function getGuitarRange(): { minMidi: number; maxMidi: number } {
  return {
    minMidi: STANDARD_TUNING[0].openMidi, // E2 = 40
    maxMidi: STANDARD_TUNING[STANDARD_TUNING.length - 1].openMidi + DEFAULT_FRET_COUNT, // e4 + 22 frets = 64 + 22 = 86
  };
}
