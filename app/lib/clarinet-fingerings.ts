/**
 * Clarinet Bb fingering chart
 *
 * Keys/holes are identified by short IDs used throughout the SVG and player:
 *
 * Tone holes (left hand, top to bottom):
 *   LH_THUMB   – left thumb hole (also register key when half-holed)
 *   LH_1       – first finger, left hand
 *   LH_2       – second finger, left hand
 *   LH_3       – third finger, left hand
 *
 * Tone holes (right hand):
 *   RH_1       – first finger, right hand
 *   RH_2       – second finger, right hand
 *   RH_3       – third finger, right hand
 *
 * Side / trill keys (left hand):
 *   LH_REG     – register (octave) key
 *   LH_A       – A key (left pinky)
 *   LH_Ab      – Ab/G# key
 *   LH_Eb      – Eb key (side)
 *
 * Side / trill keys (right hand):
 *   RH_Eb      – Eb/D# key (right side)
 *   RH_B       – B/C trill key
 *   RH_F       – F/C key (right pinky)
 *   RH_Fsharp  – F# key (right pinky)
 *   RH_E       – E/B key (right pinky)
 */

export type KeyId =
  | "LH_THUMB"
  | "LH_REG"
  | "LH_1"
  | "LH_2"
  | "LH_3"
  | "LH_A"
  | "LH_Ab"
  | "LH_Eb"
  | "RH_1"
  | "RH_2"
  | "RH_3"
  | "RH_Eb"
  | "RH_B"
  | "RH_F"
  | "RH_Fsharp"
  | "RH_E";

export interface Fingering {
  keys: KeyId[];
}

/**
 * Map from note name + octave (concert pitch) to clarinet fingering.
 * The clarinet is a Bb transposing instrument: written C4 = concert Bb3.
 * Here we store by **written pitch** so we can map directly from tab note names.
 *
 * Range: written E3 (concert D3) to written C7 (concert Bb6).
 * Common student range covering ~3 octaves.
 */
export const FINGERINGS: Record<string, Fingering> = {
  // ---- Chalumeau register (low) ----
  E3:  { keys: ["LH_THUMB", "LH_1", "LH_2", "LH_3", "RH_1", "RH_2", "RH_3", "RH_E"] },
  F3:  { keys: ["LH_THUMB", "LH_1", "LH_2", "LH_3", "RH_1", "RH_2", "RH_3", "RH_F"] },
  "F#3": { keys: ["LH_THUMB", "LH_1", "LH_2", "LH_3", "RH_1", "RH_2", "RH_3", "RH_Fsharp"] },
  Gb3: { keys: ["LH_THUMB", "LH_1", "LH_2", "LH_3", "RH_1", "RH_2", "RH_3", "RH_Fsharp"] },
  G3:  { keys: ["LH_THUMB", "LH_1", "LH_2", "LH_3", "RH_1", "RH_2", "RH_3"] },
  "G#3": { keys: ["LH_THUMB", "LH_1", "LH_2", "LH_3", "RH_1", "RH_2", "RH_3", "LH_Ab"] },
  Ab3: { keys: ["LH_THUMB", "LH_1", "LH_2", "LH_3", "RH_1", "RH_2", "RH_3", "LH_Ab"] },
  A3:  { keys: ["LH_THUMB", "LH_1", "LH_2", "LH_3", "RH_1", "RH_2"] },
  "A#3": { keys: ["LH_THUMB", "LH_1", "LH_2", "LH_3", "RH_1"] },
  Bb3: { keys: ["LH_THUMB", "LH_1", "LH_2", "LH_3", "RH_1"] },
  B3:  { keys: ["LH_THUMB", "LH_1", "LH_2", "LH_3"] },
  C4:  { keys: ["LH_THUMB", "LH_1", "LH_2"] },
  "C#4": { keys: ["LH_THUMB", "LH_1"] },
  Db4: { keys: ["LH_THUMB", "LH_1"] },
  D4:  { keys: ["LH_THUMB"] },
  "D#4": { keys: ["LH_THUMB", "LH_Eb"] },
  Eb4: { keys: ["LH_THUMB", "LH_Eb"] },
  E4:  { keys: ["LH_THUMB", "LH_1", "LH_2", "LH_3", "RH_1", "RH_2", "RH_3", "RH_E", "LH_A"] },
  F4:  { keys: ["LH_THUMB", "LH_1", "LH_2", "LH_3", "RH_1", "RH_2", "RH_3", "RH_F", "LH_A"] },
  "F#4": { keys: ["LH_THUMB", "LH_1", "LH_2", "LH_3", "RH_1", "RH_2", "RH_3", "RH_Fsharp", "LH_A"] },
  Gb4: { keys: ["LH_THUMB", "LH_1", "LH_2", "LH_3", "RH_1", "RH_2", "RH_3", "RH_Fsharp", "LH_A"] },

  // ---- Clarion register (middle – register key open) ----
  G4:  { keys: ["LH_THUMB", "LH_REG", "LH_1", "LH_2", "LH_3", "RH_1", "RH_2", "RH_3"] },
  "G#4": { keys: ["LH_THUMB", "LH_REG", "LH_1", "LH_2", "LH_3", "RH_1", "RH_2", "RH_3", "LH_Ab"] },
  Ab4: { keys: ["LH_THUMB", "LH_REG", "LH_1", "LH_2", "LH_3", "RH_1", "RH_2", "RH_3", "LH_Ab"] },
  A4:  { keys: ["LH_THUMB", "LH_REG", "LH_1", "LH_2", "LH_3", "RH_1", "RH_2"] },
  "A#4": { keys: ["LH_THUMB", "LH_REG", "LH_1", "LH_2", "LH_3", "RH_1"] },
  Bb4: { keys: ["LH_THUMB", "LH_REG", "LH_1", "LH_2", "LH_3", "RH_1"] },
  B4:  { keys: ["LH_THUMB", "LH_REG", "LH_1", "LH_2", "LH_3"] },
  C5:  { keys: ["LH_THUMB", "LH_REG", "LH_1", "LH_2"] },
  "C#5": { keys: ["LH_THUMB", "LH_REG", "LH_1"] },
  Db5: { keys: ["LH_THUMB", "LH_REG", "LH_1"] },
  D5:  { keys: ["LH_THUMB", "LH_REG"] },
  "D#5": { keys: ["LH_THUMB", "LH_REG", "LH_Eb"] },
  Eb5: { keys: ["LH_THUMB", "LH_REG", "LH_Eb"] },
  E5:  { keys: ["LH_THUMB", "LH_REG", "LH_1", "LH_2", "LH_3", "RH_1", "RH_2", "RH_3", "RH_E", "LH_A"] },
  F5:  { keys: ["LH_THUMB", "LH_REG", "LH_1", "LH_2", "LH_3", "RH_1", "RH_2", "RH_3", "RH_F", "LH_A"] },
  "F#5": { keys: ["LH_THUMB", "LH_REG", "LH_1", "LH_2", "LH_3", "RH_1", "RH_2", "RH_3", "RH_Fsharp", "LH_A"] },
  Gb5: { keys: ["LH_THUMB", "LH_REG", "LH_1", "LH_2", "LH_3", "RH_1", "RH_2", "RH_3", "RH_Fsharp", "LH_A"] },

  // ---- Altissimo register (high) ----
  G5:  { keys: ["LH_THUMB", "LH_REG", "LH_2", "LH_3"] },
  "G#5": { keys: ["LH_THUMB", "LH_REG", "LH_2", "LH_3", "RH_1"] },
  Ab5: { keys: ["LH_THUMB", "LH_REG", "LH_2", "LH_3", "RH_1"] },
  A5:  { keys: ["LH_THUMB", "LH_REG", "LH_1", "LH_3"] },
  "A#5": { keys: ["LH_THUMB", "LH_REG", "LH_1", "LH_2"] },
  Bb5: { keys: ["LH_THUMB", "LH_REG", "LH_1", "LH_2"] },
  B5:  { keys: ["LH_THUMB", "LH_REG", "LH_1", "LH_2", "RH_2"] },
  C6:  { keys: ["LH_THUMB", "LH_REG", "LH_2"] },
};

/**
 * Convert a MIDI note number to a written note name for Bb clarinet.
 * Bb clarinet sounds a major 2nd lower than written, so we transpose UP by 2 semitones.
 */
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function midiToWrittenNote(midiNote: number): string {
  // Transpose up 2 semitones for Bb clarinet written pitch
  const transposed = midiNote + 2;
  const octave = Math.floor(transposed / 12) - 1;
  const noteIndex = transposed % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * Given a concert-pitch MIDI note (e.g. from a guitar tab), find the best
 * clarinet fingering by:
 * 1. Transposing to Bb written pitch (+2 semitones)
 * 2. Adjusting octave so the note falls within the clarinet's playable range (E3–C6 written)
 */
const CLARINET_MIN_MIDI_WRITTEN = 52; // E3
const CLARINET_MAX_MIDI_WRITTEN = 84; // C6

export function midiToClarinetWrittenNote(midiNote: number): string {
  // Transpose to Bb written pitch
  let written = midiNote + 2;

  // Shift octaves until within clarinet range
  while (written < CLARINET_MIN_MIDI_WRITTEN) written += 12;
  while (written > CLARINET_MAX_MIDI_WRITTEN) written -= 12;

  const octave = Math.floor(written / 12) - 1;
  const noteIndex = written % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

export function getFingeringForMidi(midiNote: number): Fingering | null {
  const written = midiToClarinetWrittenNote(midiNote);
  return FINGERINGS[written] ?? null;
}

/**
 * Get fingering from a note name (e.g. "E", "F#", "Bb") and a pitch class + approximate octave.
 * Used when we only have the note name from the parser.
 */
export function getFingeringForNoteName(noteName: string, pitchClass: number): Fingering | null {
  // Try common octaves for clarinet range
  for (const octave of [3, 4, 5, 6]) {
    const key = `${noteName}${octave}`;
    if (FINGERINGS[key]) return FINGERINGS[key];
  }
  return null;
}
