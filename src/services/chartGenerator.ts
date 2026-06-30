import type { Note, InputMapping, Difficulty } from '../types';
import { SPAWN_AHEAD_TIME } from '../constants';

// Seeded PRNG Implementation
function xmur3(str: string) {
    for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = h << 13 | h >>> 19;
    }
    return function() {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return (h ^= h >>> 16) >>> 0;
    }
}

function sfc32(a: number, b: number, c: number, d: number) {
    return function() {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
      var t = (a + b) | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      d = d + 1 | 0;
      t = t + d | 0;
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    }
}

function getPRNG(seed: string) {
    const seedGen = xmur3(seed);
    return sfc32(seedGen(), seedGen(), seedGen(), seedGen());
}

export function generateFixedChart(mapping: InputMapping, difficulty: Difficulty, duration: number, version: 'v1' | 'v2', totalLanesOverride?: number): Note[] {
  const notes: Note[] = [];
  let bps = 1; // Default
  if (difficulty === 'apprentice') bps = 1; // 1 note per sec
  else if (difficulty === 'musician') bps = 1.66; // 100 BPM
  else if (difficulty === 'virtuoso') bps = 2.5; // 150 BPM
  
  const totalBeats = Math.floor(duration * bps);
  let idCounter = 0;

  const totalLanes = totalLanesOverride ?? mapping.laneCount;
  const startBeat = Math.ceil(SPAWN_AHEAD_TIME * bps);
  
  const prng = getPRNG(`fixed-${difficulty}-${version}-${totalLanes}`);

  for (let b = startBeat; b < totalBeats - 2; b++) {
    const time = b * (1 / bps);
    
    // Pattern logic - use PRNG instead of basic sequential stepping!
    // This creates a complex, varied pattern that is 100% identical every time you play this exact level.
    let lane1Idx = Math.floor(prng() * totalLanes);
    
    const lane1Id = mapping.lanes[lane1Idx]?.id ?? lane1Idx;
    
    notes.push({
      id: `fixed_${idCounter++}`,
      time,
      lane: lane1Id,
      type: 'tap',
      hit: false,
      missed: false,
    });
    
    // Virtuoso occasionally has double notes
    if (difficulty === 'virtuoso' && prng() < 0.25 && totalLanes > 1) {
      let lane2Idx = Math.floor(prng() * totalLanes);
      while(lane2Idx === lane1Idx) {
          lane2Idx = Math.floor(prng() * totalLanes);
      }
      const lane2Id = mapping.lanes[lane2Idx]?.id ?? lane2Idx;
      notes.push({
        id: `fixed_${idCounter++}`,
        time,
        lane: lane2Id,
        type: 'tap',
        hit: false,
        missed: false,
      });
    }
  }
  
  notes.sort((a, b) => a.time - b.time);
  return notes;
}

export function generateProceduralChart(mapping: InputMapping, duration: number, version: 'v1' | 'v2', totalLanesOverride?: number): Note[] {
  const notes: Note[] = [];
  const bps = 2.5; // 150 BPM for Mastery
  const totalBeats = Math.floor(duration * bps);
  let idCounter = 0;

  const totalLanes = totalLanesOverride ?? mapping.laneCount;
  const startBeat = Math.ceil(SPAWN_AHEAD_TIME * bps);
  
  // Use a PRNG so even Mastery mode is learnable and identically reproducible for each version!
  const prng = getPRNG(`mastery-${version}-${totalLanes}`);

  for (let b = startBeat; b < totalBeats - 4; b++) {
    if (prng() < 0.6) {
      const time = b * (1 / bps);
      const isDouble = prng() < 0.1;
      const lane1Idx = Math.floor(prng() * totalLanes);
      const lane1Id = mapping.lanes[lane1Idx]?.id ?? lane1Idx;
      
      notes.push({
        id: `proc_${idCounter++}`,
        time,
        lane: lane1Id,
        type: 'tap',
        hit: false,
        missed: false,
      });

      if (isDouble && totalLanes > 1) {
        let lane2Idx = Math.floor(prng() * totalLanes);
        while (lane2Idx === lane1Idx) {
          lane2Idx = Math.floor(prng() * totalLanes);
        }
        const lane2Id = mapping.lanes[lane2Idx]?.id ?? lane2Idx;
        notes.push({
          id: `proc_${idCounter++}`,
          time,
          lane: lane2Id,
          type: 'tap',
          hit: false,
          missed: false,
        });
      }
    }
  }

  notes.sort((a, b) => a.time - b.time);
  return notes;
}

