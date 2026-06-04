import type { Note, InstrumentCategory } from '../types';
import { SONG_DURATION } from '../constants';

// ─── Procedural Track Generator ────────────────────────────────────────────────
// Generates a 60-second Note[] array matching traditional metric structures.

export function generateFallbackTrack(
  category: InstrumentCategory,
  laneCount: number,
  bpm = 90,
): Note[] {
  const secondsPerBeat = 60 / bpm;
  const beatsTotal = Math.floor(SONG_DURATION / secondsPerBeat);

  switch (category) {
    case 'percussion':
      return generateKulintangTrack(beatsTotal, secondsPerBeat);
    case 'string':
      return generateKudyapiTrack(beatsTotal, secondsPerBeat);
    case 'wind':
      return generateFluteTrack(beatsTotal, secondsPerBeat, laneCount);
    default:
      return generateKulintangTrack(beatsTotal, secondsPerBeat);
  }
}

// ── Kulintang / Percussion Track ───────────────────────────────────────────────
// Steady rhythmic backbone on Lane 0+4, syncopated off-beat accents across pads.
// Simulates Binalig rhythmic mode: | . . . | . . . | pattern

function generateKulintangTrack(beatsTotal: number, spb: number): Note[] {
  const notes: Note[] = [];
  let id = 0;

  // Binalig pattern: kick on beat 1, rest, accent on beat 2.5, rest
  // Using an 8-note pattern over 2 beats
  const pattern = [
    { beat: 0,    lane: 0 },  // Strong beat — low gong
    { beat: 0.5,  lane: 4 },  // Mid accent
    { beat: 1.0,  lane: 1 },  // Second beat
    { beat: 1.5,  lane: 6 },  // High syncopation
    { beat: 2.0,  lane: 0 },  // Repeat
    { beat: 2.5,  lane: 3 },  // Off-beat
    { beat: 3.0,  lane: 2 },  // Beat 3
    { beat: 3.5,  lane: 5 },  // Polyrhythmic accent
  ];

  const patternLength = 4; // beats per pattern cycle

  for (let beat = 0; beat < beatsTotal - patternLength; beat += patternLength) {
    for (const step of pattern) {
      const time = (beat + step.beat) * spb;
      if (time >= SONG_DURATION - 1) break;
      notes.push({
        id: `n-${id++}`,
        time,
        lane: step.lane,
        type: 'tap',
        hit: false,
        missed: false,
      });
    }

    // Occasional melodic fill on beats 7-8
    if (beat % 8 === 4) {
      const fillNotes = [
        { laneOffset: 7, beatOffset: 0.25 },
        { laneOffset: 6, beatOffset: 0.75 },
        { laneOffset: 5, beatOffset: 1.25 },
      ];
      for (const f of fillNotes) {
        const time = (beat + f.beatOffset) * spb;
        if (time < SONG_DURATION - 1) {
          notes.push({ id: `n-${id++}`, time, lane: f.laneOffset, type: 'tap', hit: false, missed: false });
        }
      }
    }
  }

  return notes.sort((a, b) => a.time - b.time);
}

// ── Kudyapi / String Track ─────────────────────────────────────────────────────
// Lane 0 = constant drone (hold notes), Lane 1 = pentatonic melody

function generateKudyapiTrack(beatsTotal: number, spb: number): Note[] {
  const notes: Note[] = [];
  let id = 0;

  // Drone on lane 0 every 2 beats as a hold note
  for (let beat = 0; beat < beatsTotal - 2; beat += 2) {
    const time = beat * spb;
    if (time >= SONG_DURATION - 1) break;
    notes.push({
      id: `n-${id++}`,
      time,
      lane: 0,
      type: 'hold',
      duration: spb * 1.8,
      hit: false,
      missed: false,
    });
  }

  // Melody on lane 1 — syncopated pentatonic sequence
  const melodyPattern = [0, 0.75, 1.5, 2.0, 2.5, 3.25];
  for (let beat = 0; beat < beatsTotal - 4; beat += 4) {
    for (const offset of melodyPattern) {
      const time = (beat + offset) * spb;
      if (time >= SONG_DURATION - 1) break;
      notes.push({
        id: `n-${id++}`,
        time,
        lane: 1,
        type: 'tap',
        hit: false,
        missed: false,
      });
    }
  }

  return notes.sort((a, b) => a.time - b.time);
}

// ── Flute / Wind Track ─────────────────────────────────────────────────────────
// Long hold notes (breath phrases) with gaps, rotating across lanes

function generateFluteTrack(beatsTotal: number, spb: number, laneCount: number): Note[] {
  const notes: Note[] = [];
  let id = 0;
  let beat = 0;
  let laneIndex = 0;

  // Phrase structure: 3-beat hold, 1-beat rest, repeat
  while (beat < beatsTotal - 4) {
    const time = beat * spb;
    if (time >= SONG_DURATION - 2) break;

    const holdBeats = [3, 2, 3, 2, 4, 2][id % 6]; // varied phrase lengths
    notes.push({
      id: `n-${id++}`,
      time,
      lane: laneIndex % laneCount,
      type: 'hold',
      duration: holdBeats * spb * 0.9, // slight gap at end of phrase
      hit: false,
      missed: false,
    });

    beat += holdBeats + 1; // +1 beat rest
    laneIndex++;
  }

  return notes;
}
