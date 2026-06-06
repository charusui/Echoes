import type { Note, InputMapping } from '../types';
import { SONG_DURATION, SPAWN_AHEAD_TIME } from '../constants';

export function generateProceduralChart(mapping: InputMapping, totalLanesOverride?: number): Note[] {
  const notes: Note[] = [];
  const bps = 2; // 120 BPM -> 2 beats per second
  const totalBeats = Math.floor(SONG_DURATION * bps);
  let idCounter = 0;

  const totalLanes = totalLanesOverride ?? mapping.laneCount;

  // Start spawning after SPAWN_AHEAD_TIME so players have time to react
  const startBeat = Math.ceil(SPAWN_AHEAD_TIME * bps);

  // Weave a pattern
  for (let b = startBeat; b < totalBeats - 4; b++) {
    // 45% chance to spawn a note on this beat (reduced from 70% to make it easier)
    if (Math.random() < 0.45) {
      const time = b * (1 / bps);
      
      // Basic procedural pattern: sometimes double notes
      // Only 5% chance for a double note (reduced from 15%)
      const isDouble = Math.random() < 0.05;
      
      const lane1Idx = Math.floor(Math.random() * totalLanes);
      const lane1Id = mapping.lanes[lane1Idx]?.id ?? lane1Idx;
      
      notes.push({
        id: `n_${idCounter++}`,
        time,
        lane: lane1Id,
        type: 'tap',
        hit: false,
        missed: false,
      });

      if (isDouble && totalLanes > 1) {
        let lane2Idx = Math.floor(Math.random() * totalLanes);
        while (lane2Idx === lane1Idx) {
          lane2Idx = Math.floor(Math.random() * totalLanes);
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
