import type { Note, InputMapping } from '../types';
import { SONG_DURATION, SPAWN_AHEAD_TIME } from '../constants';

export function generateProceduralChart(mapping: InputMapping): Note[] {
  const notes: Note[] = [];
  const bps = 2; // 120 BPM -> 2 beats per second
  const totalBeats = Math.floor(SONG_DURATION * bps);
  let idCounter = 0;

  // Start spawning after SPAWN_AHEAD_TIME so players have time to react
  const startBeat = Math.ceil(SPAWN_AHEAD_TIME * bps);

  // Weave a pattern
  for (let b = startBeat; b < totalBeats - 4; b++) {
    // 70% chance to spawn a note
    if (Math.random() < 0.7) {
      const time = b * (1 / bps);
      
      // Basic procedural pattern: sometimes double notes
      const isDouble = Math.random() < 0.15;
      
      const lane1Idx = Math.floor(Math.random() * mapping.laneCount);
      const lane1Id = mapping.lanes[lane1Idx]?.id ?? lane1Idx;
      
      notes.push({
        id: `n_${idCounter++}`,
        time,
        lane: lane1Id,
        type: 'tap',
        hit: false,
        missed: false,
      });

      if (isDouble && mapping.laneCount > 1) {
        let lane2Idx = Math.floor(Math.random() * mapping.laneCount);
        while (lane2Idx === lane1Idx) {
          lane2Idx = Math.floor(Math.random() * mapping.laneCount);
        }
        const lane2Id = mapping.lanes[lane2Idx]?.id ?? lane2Idx;
        notes.push({
          id: `n_${idCounter++}`,
          time,
          lane: lane2Id,
          type: 'tap',
          hit: false,
          missed: false,
        });
      }
    }
  }

  // Sort by time
  notes.sort((a, b) => a.time - b.time);
  return notes;
}
