import type { ActiveInstrumentProfile } from '../types';

export const EXPEDITION_WEAPON_PROFILES: Record<string, ActiveInstrumentProfile> = {

  cebuano_gitara: {
    instrument: {
      name: 'Cebuano Gitara',
      localName: 'Cebuano Gitara',
      ethnoLinguisticGroup: 'Visayas',
      hornbostelSachs: '321.322 - Composite Chordophone',
      culturalPurpose: 'Traditional Performance',
      category: 'string',
      description: 'Highly crafted six-string acoustic guitar. Prized for its bright acoustic resonance.',
      region: 'Visayas',
    },
    acoustic: {
      fundamentalFreqMin: 110.0,
      fundamentalFreqMax: 880.0,
      timbre: 'bright, resonant, woody, acoustic',
      decayTime: 2.0,
      attackTime: 0.05,
      tuningSystem: 'Traditional',
      synthesisType: 'string',
      scaleNotes: [
        { note: 'N0', frequency: 110, lane: 0 }, { note: 'N1', frequency: 165, lane: 1 }, { note: 'N2', frequency: 220, lane: 2 }, { note: 'N3', frequency: 275, lane: 3 }, { note: 'N4', frequency: 330, lane: 4 }, { note: 'N5', frequency: 385, lane: 5 }
      ],
    },
    inputMapping: {
      laneCount: 6,
      orientation: 'vertical',
      lanes: [
        { id: 0, label: 'L0', frequency: 110, keyBinding: 'S' }, { id: 1, label: 'L1', frequency: 165, keyBinding: 'D' }, { id: 2, label: 'L2', frequency: 220, keyBinding: 'F' }, { id: 3, label: 'L3', frequency: 275, keyBinding: 'J' }, { id: 4, label: 'L4', frequency: 330, keyBinding: 'K' }, { id: 5, label: 'L5', frequency: 385, keyBinding: 'L' }
      ],
    },
    imageBase64: '',
    imageMimeType: 'image/png',
  },
  tulali: {
    instrument: {
      name: 'Tulali',
      localName: 'Tulali',
      ethnoLinguisticGroup: 'Visayas',
      hornbostelSachs: '421.111 - Open single end-blown flute',
      culturalPurpose: 'Traditional Performance',
      category: 'wind',
      description: 'End-blown bamboo flute for courtship and encoded messaging.',
      region: 'Visayas',
    },
    acoustic: {
      fundamentalFreqMin: 110.0,
      fundamentalFreqMax: 880.0,
      timbre: 'pure sine, breathy, ethereal, bamboo',
      decayTime: 2.0,
      attackTime: 0.05,
      tuningSystem: 'Traditional',
      synthesisType: 'flute',
      scaleNotes: [
        { note: 'N0', frequency: 110, lane: 0 }, { note: 'N1', frequency: 165, lane: 1 }, { note: 'N2', frequency: 220, lane: 2 }, { note: 'N3', frequency: 275, lane: 3 }, { note: 'N4', frequency: 330, lane: 4 }, { note: 'N5', frequency: 385, lane: 5 }
      ],
    },
    inputMapping: {
      laneCount: 6,
      orientation: 'vertical',
      lanes: [
        { id: 0, label: 'L0', frequency: 110, keyBinding: '1' }, { id: 1, label: 'L1', frequency: 165, keyBinding: '2' }, { id: 2, label: 'L2', frequency: 220, keyBinding: '3' }, { id: 3, label: 'L3', frequency: 275, keyBinding: '4' }, { id: 4, label: 'L4', frequency: 330, keyBinding: '5' }, { id: 5, label: 'L5', frequency: 385, keyBinding: '6' }
      ],
    },
    imageBase64: '',
    imageMimeType: 'image/png',
  },
  tultugan: {
    instrument: {
      name: 'Tultugan',
      localName: 'Tultugan',
      ethnoLinguisticGroup: 'Visayas',
      hornbostelSachs: '111.232 - Bamboo slit drum',
      culturalPurpose: 'Traditional Performance',
      category: 'percussion',
      description: 'Massive bamboo drums used for communication and rhythms.',
      region: 'Visayas',
    },
    acoustic: {
      fundamentalFreqMin: 110.0,
      fundamentalFreqMax: 880.0,
      timbre: 'hollow, resonant, deep, percussive',
      decayTime: 2.0,
      attackTime: 0.05,
      tuningSystem: 'Traditional',
      synthesisType: 'membrane-drum',
      scaleNotes: [
        { note: 'N0', frequency: 110, lane: 0 }, { note: 'N1', frequency: 165, lane: 1 }, { note: 'N2', frequency: 220, lane: 2 }, { note: 'N3', frequency: 275, lane: 3 }, { note: 'N4', frequency: 330, lane: 4 }, { note: 'N5', frequency: 385, lane: 5 }, { note: 'N6', frequency: 440, lane: 6 }, { note: 'N7', frequency: 495, lane: 7 }
      ],
    },
    inputMapping: {
      laneCount: 8,
      orientation: 'vertical',
      lanes: [
        { id: 0, label: 'L0', frequency: 110, keyBinding: 'A' }, { id: 1, label: 'L1', frequency: 165, keyBinding: 'S' }, { id: 2, label: 'L2', frequency: 220, keyBinding: 'D' }, { id: 3, label: 'L3', frequency: 275, keyBinding: 'F' }, { id: 4, label: 'L4', frequency: 330, keyBinding: 'J' }, { id: 5, label: 'L5', frequency: 385, keyBinding: 'K' }, { id: 6, label: 'L6', frequency: 440, keyBinding: 'L' }, { id: 7, label: 'L7', frequency: 495, keyBinding: ';' }
      ],
    },
    imageBase64: '',
    imageMimeType: 'image/png',
  },
  litgit: {
    instrument: {
      name: 'Litgit',
      localName: 'Litgit',
      ethnoLinguisticGroup: 'Visayas',
      hornbostelSachs: '321.321 - Bowed lute',
      culturalPurpose: 'Traditional Performance',
      category: 'string',
      description: 'Dual-purpose bamboo bowed fiddle and scraped idiophone.',
      region: 'Visayas',
    },
    acoustic: {
      fundamentalFreqMin: 110.0,
      fundamentalFreqMax: 880.0,
      timbre: 'scratchy, rustic, bowed, bamboo',
      decayTime: 2.0,
      attackTime: 0.05,
      tuningSystem: 'Traditional',
      synthesisType: 'string',
      scaleNotes: [
        { note: 'N0', frequency: 110, lane: 0 }, { note: 'N1', frequency: 165, lane: 1 }, { note: 'N2', frequency: 220, lane: 2 }, { note: 'N3', frequency: 275, lane: 3 }
      ],
    },
    inputMapping: {
      laneCount: 4,
      orientation: 'vertical',
      lanes: [
        { id: 0, label: 'L0', frequency: 110, keyBinding: 'D' }, { id: 1, label: 'L1', frequency: 165, keyBinding: 'F' }, { id: 2, label: 'L2', frequency: 220, keyBinding: 'J' }, { id: 3, label: 'L3', frequency: 275, keyBinding: 'K' }
      ],
    },
    imageBase64: '',
    imageMimeType: 'image/png',
  },
  bandurria: {
    instrument: {
      name: 'Bandurria',
      localName: 'Bandurria',
      ethnoLinguisticGroup: 'Visayas',
      hornbostelSachs: '321.322 - Plucked lute',
      culturalPurpose: 'Traditional Performance',
      category: 'string',
      description: '14-string, pear-shaped lead melodic instrument of the Rondalla.',
      region: 'Visayas',
    },
    acoustic: {
      fundamentalFreqMin: 110.0,
      fundamentalFreqMax: 880.0,
      timbre: 'bright, plucky, high-pitched, fast',
      decayTime: 2.0,
      attackTime: 0.05,
      tuningSystem: 'Traditional',
      synthesisType: 'string',
      scaleNotes: [
        { note: 'N0', frequency: 110, lane: 0 }, { note: 'N1', frequency: 165, lane: 1 }, { note: 'N2', frequency: 220, lane: 2 }, { note: 'N3', frequency: 275, lane: 3 }, { note: 'N4', frequency: 330, lane: 4 }, { note: 'N5', frequency: 385, lane: 5 }, { note: 'N6', frequency: 440, lane: 6 }, { note: 'N7', frequency: 495, lane: 7 }
      ],
    },
    inputMapping: {
      laneCount: 8,
      orientation: 'vertical',
      lanes: [
        { id: 0, label: 'L0', frequency: 110, keyBinding: 'A' }, { id: 1, label: 'L1', frequency: 165, keyBinding: 'S' }, { id: 2, label: 'L2', frequency: 220, keyBinding: 'D' }, { id: 3, label: 'L3', frequency: 275, keyBinding: 'F' }, { id: 4, label: 'L4', frequency: 330, keyBinding: 'J' }, { id: 5, label: 'L5', frequency: 385, keyBinding: 'K' }, { id: 6, label: 'L6', frequency: 440, keyBinding: 'L' }, { id: 7, label: 'L7', frequency: 495, keyBinding: ';' }
      ],
    },
    imageBase64: '',
    imageMimeType: 'image/png',
  },
  laud: {
    instrument: {
      name: 'Laud',
      localName: 'Laud',
      ethnoLinguisticGroup: 'Visayas',
      hornbostelSachs: '321.322 - Plucked lute',
      culturalPurpose: 'Traditional Performance',
      category: 'string',
      description: 'Teardrop chordophone with f-holes, tuned an octave lower than the bandurria.',
      region: 'Visayas',
    },
    acoustic: {
      fundamentalFreqMin: 110.0,
      fundamentalFreqMax: 880.0,
      timbre: 'warm, mellow, resonant, plucky',
      decayTime: 2.0,
      attackTime: 0.05,
      tuningSystem: 'Traditional',
      synthesisType: 'string',
      scaleNotes: [
        { note: 'N0', frequency: 110, lane: 0 }, { note: 'N1', frequency: 165, lane: 1 }, { note: 'N2', frequency: 220, lane: 2 }, { note: 'N3', frequency: 275, lane: 3 }, { note: 'N4', frequency: 330, lane: 4 }, { note: 'N5', frequency: 385, lane: 5 }
      ],
    },
    inputMapping: {
      laneCount: 6,
      orientation: 'vertical',
      lanes: [
        { id: 0, label: 'L0', frequency: 110, keyBinding: 'S' }, { id: 1, label: 'L1', frequency: 165, keyBinding: 'D' }, { id: 2, label: 'L2', frequency: 220, keyBinding: 'F' }, { id: 3, label: 'L3', frequency: 275, keyBinding: 'J' }, { id: 4, label: 'L4', frequency: 330, keyBinding: 'K' }, { id: 5, label: 'L5', frequency: 385, keyBinding: 'L' }
      ],
    },
    imageBase64: '',
    imageMimeType: 'image/png',
  },
  octavina: {
    instrument: {
      name: 'Octavina',
      localName: 'Octavina',
      ethnoLinguisticGroup: 'Visayas',
      hornbostelSachs: '321.322 - Plucked lute',
      culturalPurpose: 'Traditional Performance',
      category: 'string',
      description: 'Locally innovated, guitar-shaped chordophone serving a tenor role.',
      region: 'Visayas',
    },
    acoustic: {
      fundamentalFreqMin: 110.0,
      fundamentalFreqMax: 880.0,
      timbre: 'warm, punchy, tenor, plucky',
      decayTime: 2.0,
      attackTime: 0.05,
      tuningSystem: 'Traditional',
      synthesisType: 'string',
      scaleNotes: [
        { note: 'N0', frequency: 110, lane: 0 }, { note: 'N1', frequency: 165, lane: 1 }, { note: 'N2', frequency: 220, lane: 2 }, { note: 'N3', frequency: 275, lane: 3 }, { note: 'N4', frequency: 330, lane: 4 }, { note: 'N5', frequency: 385, lane: 5 }
      ],
    },
    inputMapping: {
      laneCount: 6,
      orientation: 'vertical',
      lanes: [
        { id: 0, label: 'L0', frequency: 110, keyBinding: 'S' }, { id: 1, label: 'L1', frequency: 165, keyBinding: 'D' }, { id: 2, label: 'L2', frequency: 220, keyBinding: 'F' }, { id: 3, label: 'L3', frequency: 275, keyBinding: 'J' }, { id: 4, label: 'L4', frequency: 330, keyBinding: 'K' }, { id: 5, label: 'L5', frequency: 385, keyBinding: 'L' }
      ],
    },
    imageBase64: '',
    imageMimeType: 'image/png',
  },
  bajo_de_unas: {
    instrument: {
      name: 'Bajo de Uñas',
      localName: 'Bajo de Uñas',
      ethnoLinguisticGroup: 'Visayas',
      hornbostelSachs: '321.322 - Plucked lute',
      culturalPurpose: 'Traditional Performance',
      category: 'string',
      description: 'Massive four-stringed acoustic bass plucked with a plectrum.',
      region: 'Visayas',
    },
    acoustic: {
      fundamentalFreqMin: 110.0,
      fundamentalFreqMax: 880.0,
      timbre: 'deep, thudding, bass, resonant',
      decayTime: 2.0,
      attackTime: 0.05,
      tuningSystem: 'Traditional',
      synthesisType: 'string',
      scaleNotes: [
        { note: 'N0', frequency: 110, lane: 0 }, { note: 'N1', frequency: 165, lane: 1 }, { note: 'N2', frequency: 220, lane: 2 }, { note: 'N3', frequency: 275, lane: 3 }
      ],
    },
    inputMapping: {
      laneCount: 4,
      orientation: 'vertical',
      lanes: [
        { id: 0, label: 'L0', frequency: 110, keyBinding: 'D' }, { id: 1, label: 'L1', frequency: 165, keyBinding: 'F' }, { id: 2, label: 'L2', frequency: 220, keyBinding: 'J' }, { id: 3, label: 'L3', frequency: 275, keyBinding: 'K' }
      ],
    },
    imageBase64: '',
    imageMimeType: 'image/png',
  },
  buktot: {
    instrument: {
      name: 'Buktot',
      localName: 'Buktot',
      ethnoLinguisticGroup: 'Visayas',
      hornbostelSachs: '321.321 - Plucked lute',
      culturalPurpose: 'Traditional Performance',
      category: 'string',
      description: 'A four-stringed native lute crafted from a dried coconut husk.',
      region: 'Visayas',
    },
    acoustic: {
      fundamentalFreqMin: 110.0,
      fundamentalFreqMax: 880.0,
      timbre: 'hollow, plucky, rustic, coconut',
      decayTime: 2.0,
      attackTime: 0.05,
      tuningSystem: 'Traditional',
      synthesisType: 'string',
      scaleNotes: [
        { note: 'N0', frequency: 110, lane: 0 }, { note: 'N1', frequency: 165, lane: 1 }, { note: 'N2', frequency: 220, lane: 2 }, { note: 'N3', frequency: 275, lane: 3 }
      ],
    },
    inputMapping: {
      laneCount: 4,
      orientation: 'vertical',
      lanes: [
        { id: 0, label: 'L0', frequency: 110, keyBinding: 'D' }, { id: 1, label: 'L1', frequency: 165, keyBinding: 'F' }, { id: 2, label: 'L2', frequency: 220, keyBinding: 'J' }, { id: 3, label: 'L3', frequency: 275, keyBinding: 'K' }
      ],
    },
    imageBase64: '',
    imageMimeType: 'image/png',
  },
  pasiyak: {
    instrument: {
      name: 'Pasiyak',
      localName: 'Pasiyak',
      ethnoLinguisticGroup: 'Visayas',
      hornbostelSachs: '421.111 - Water whistle',
      culturalPurpose: 'Traditional Performance',
      category: 'wind',
      description: 'A unique bamboo whistle requiring water inside to produce a bird-like chirp.',
      region: 'Visayas',
    },
    acoustic: {
      fundamentalFreqMin: 110.0,
      fundamentalFreqMax: 880.0,
      timbre: 'warbling, chirpy, bird-like, bright',
      decayTime: 2.0,
      attackTime: 0.05,
      tuningSystem: 'Traditional',
      synthesisType: 'flute',
      scaleNotes: [
        { note: 'N0', frequency: 110, lane: 0 }, { note: 'N1', frequency: 165, lane: 1 }, { note: 'N2', frequency: 220, lane: 2 }, { note: 'N3', frequency: 275, lane: 3 }
      ],
    },
    inputMapping: {
      laneCount: 4,
      orientation: 'vertical',
      lanes: [
        { id: 0, label: 'L0', frequency: 110, keyBinding: '1' }, { id: 1, label: 'L1', frequency: 165, keyBinding: '2' }, { id: 2, label: 'L2', frequency: 220, keyBinding: '3' }, { id: 3, label: 'L3', frequency: 275, keyBinding: '4' }
      ],
    },
    imageBase64: '',
    imageMimeType: 'image/png',
  },
  tugo: {
    instrument: {
      name: 'Tugo',
      localName: 'Tugo',
      ethnoLinguisticGroup: 'Visayas',
      hornbostelSachs: '211.2 - Struck drum',
      culturalPurpose: 'Traditional Performance',
      category: 'percussion',
      description: 'A guitar-shaped wooden drum played by hitting the base with the hands.',
      region: 'Visayas',
    },
    acoustic: {
      fundamentalFreqMin: 110.0,
      fundamentalFreqMax: 880.0,
      timbre: 'thumping, hollow, rhythmic, deep',
      decayTime: 2.0,
      attackTime: 0.05,
      tuningSystem: 'Traditional',
      synthesisType: 'membrane-drum',
      scaleNotes: [
        { note: 'N0', frequency: 110, lane: 0 }, { note: 'N1', frequency: 165, lane: 1 }, { note: 'N2', frequency: 220, lane: 2 }, { note: 'N3', frequency: 275, lane: 3 }
      ],
    },
    inputMapping: {
      laneCount: 4,
      orientation: 'vertical',
      lanes: [
        { id: 0, label: 'L0', frequency: 110, keyBinding: 'D' }, { id: 1, label: 'L1', frequency: 165, keyBinding: 'F' }, { id: 2, label: 'L2', frequency: 220, keyBinding: 'J' }, { id: 3, label: 'L3', frequency: 275, keyBinding: 'K' }
      ],
    },
    imageBase64: '',
    imageMimeType: 'image/png',
  },
  lantoy: {
    instrument: {
      name: 'Lantoy',
      localName: 'Lantoy',
      ethnoLinguisticGroup: 'Visayas',
      hornbostelSachs: '421.111 - Nose flute',
      culturalPurpose: 'Traditional Performance',
      category: 'wind',
      description: 'A slender bamboo flute that can be played using the mouth or the nose.',
      region: 'Visayas',
    },
    acoustic: {
      fundamentalFreqMin: 110.0,
      fundamentalFreqMax: 880.0,
      timbre: 'soft, ethereal, airy, delicate',
      decayTime: 2.0,
      attackTime: 0.05,
      tuningSystem: 'Traditional',
      synthesisType: 'flute',
      scaleNotes: [
        { note: 'N0', frequency: 110, lane: 0 }, { note: 'N1', frequency: 165, lane: 1 }, { note: 'N2', frequency: 220, lane: 2 }, { note: 'N3', frequency: 275, lane: 3 }
      ],
    },
    inputMapping: {
      laneCount: 4,
      orientation: 'vertical',
      lanes: [
        { id: 0, label: 'L0', frequency: 110, keyBinding: '1' }, { id: 1, label: 'L1', frequency: 165, keyBinding: '2' }, { id: 2, label: 'L2', frequency: 220, keyBinding: '3' }, { id: 3, label: 'L3', frequency: 275, keyBinding: '4' }
      ],
    },
    imageBase64: '',
    imageMimeType: 'image/png',
  },
  subing: {
    instrument: {
      name: 'Subing',
      localName: 'Subing',
      ethnoLinguisticGroup: 'Visayas',
      hornbostelSachs: '121.2 - Jaw harp',
      culturalPurpose: 'Traditional Performance',
      category: 'wind',
      description: 'A twangy, vibrating bamboo jaw harp.',
      region: 'Visayas',
    },
    acoustic: {
      fundamentalFreqMin: 110.0,
      fundamentalFreqMax: 880.0,
      timbre: 'twangy, vibrating, buzzy, rhythmic',
      decayTime: 2.0,
      attackTime: 0.05,
      tuningSystem: 'Traditional',
      synthesisType: 'flute',
      scaleNotes: [
        { note: 'N0', frequency: 110, lane: 0 }, { note: 'N1', frequency: 165, lane: 1 }, { note: 'N2', frequency: 220, lane: 2 }, { note: 'N3', frequency: 275, lane: 3 }
      ],
    },
    inputMapping: {
      laneCount: 4,
      orientation: 'vertical',
      lanes: [
        { id: 0, label: 'L0', frequency: 110, keyBinding: '1' }, { id: 1, label: 'L1', frequency: 165, keyBinding: '2' }, { id: 2, label: 'L2', frequency: 220, keyBinding: '3' }, { id: 3, label: 'L3', frequency: 275, keyBinding: '4' }
      ],
    },
    imageBase64: '',
    imageMimeType: 'image/png',
  },
  visayan_kulintang: {
    instrument: {
      name: 'Visayan Kulintang',
      localName: 'Visayan Kulintang',
      ethnoLinguisticGroup: 'Visayas',
      hornbostelSachs: '111.2 - Gong chime',
      culturalPurpose: 'Traditional Performance',
      category: 'percussion',
      description: 'A pristine golden gong chime set echoing ancient pre-colonial melodies.',
      region: 'Visayas',
    },
    acoustic: {
      fundamentalFreqMin: 110.0,
      fundamentalFreqMax: 880.0,
      timbre: 'metallic, resonant, bright, chiming',
      decayTime: 2.0,
      attackTime: 0.05,
      tuningSystem: 'Traditional',
      synthesisType: 'membrane-drum',
      scaleNotes: [
        { note: 'N0', frequency: 110, lane: 0 }, { note: 'N1', frequency: 165, lane: 1 }, { note: 'N2', frequency: 220, lane: 2 }, { note: 'N3', frequency: 275, lane: 3 }, { note: 'N4', frequency: 330, lane: 4 }, { note: 'N5', frequency: 385, lane: 5 }, { note: 'N6', frequency: 440, lane: 6 }, { note: 'N7', frequency: 495, lane: 7 }
      ],
    },
    inputMapping: {
      laneCount: 8,
      orientation: 'vertical',
      lanes: [
        { id: 0, label: 'L0', frequency: 110, keyBinding: 'A' }, { id: 1, label: 'L1', frequency: 165, keyBinding: 'S' }, { id: 2, label: 'L2', frequency: 220, keyBinding: 'D' }, { id: 3, label: 'L3', frequency: 275, keyBinding: 'F' }, { id: 4, label: 'L4', frequency: 330, keyBinding: 'J' }, { id: 5, label: 'L5', frequency: 385, keyBinding: 'K' }, { id: 6, label: 'L6', frequency: 440, keyBinding: 'L' }, { id: 7, label: 'L7', frequency: 495, keyBinding: ';' }
      ],
    },
    imageBase64: '',
    imageMimeType: 'image/png',
  },
  visayan_kudyapi: {
    instrument: {
      name: 'Visayan Kudyapi',
      localName: 'Visayan Kudyapi',
      ethnoLinguisticGroup: 'Visayas',
      hornbostelSachs: '312.22 - Two-string boat lute',
      culturalPurpose: 'Traditional Performance',
      category: 'string',
      description: 'A traditional two-stringed boat lute carved from jackfruit wood.',
      region: 'Visayas',
    },
    acoustic: {
      fundamentalFreqMin: 110.0,
      fundamentalFreqMax: 880.0,
      timbre: 'warm, woody, resonant drone',
      decayTime: 2.0,
      attackTime: 0.05,
      tuningSystem: 'Traditional',
      synthesisType: 'string',
      scaleNotes: [
        { note: 'N0', frequency: 110, lane: 0 }, { note: 'N1', frequency: 165, lane: 1 }
      ],
    },
    inputMapping: {
      laneCount: 2,
      orientation: 'vertical',
      lanes: [
        { id: 0, label: 'L0', frequency: 110, keyBinding: 'F' }, { id: 1, label: 'L1', frequency: 165, keyBinding: 'J' }
      ],
    },
    imageBase64: '',
    imageMimeType: 'image/png',
  },
};

export function getExpeditionProfile(instrumentId: string, fallbackType?: 'string' | 'percussion' | 'wind' | 'brass' | 'woodwind' | 'synth'): ActiveInstrumentProfile {
  if (EXPEDITION_WEAPON_PROFILES[instrumentId]) {
    return EXPEDITION_WEAPON_PROFILES[instrumentId];
  }
  
  // Create dynamic fallback based on requested type
  const isString = fallbackType === 'string' || fallbackType === 'synth';
  const isPercussion = fallbackType === 'percussion';
  
  const numLanes = isString ? 6 : isPercussion ? 8 : 4;
  const synthType = isString ? 'string' : isPercussion ? 'membrane-drum' : 'flute';
  const keys = numLanes === 6 ? ['S', 'D', 'F', 'J', 'K', 'L'] : numLanes === 8 ? ['A', 'S', 'D', 'F', 'J', 'K', 'L', ';'] : ['D', 'F', 'J', 'K'];
  
  let safeCategory: any = fallbackType || 'string';
  if (safeCategory === 'woodwind' || safeCategory === 'brass' || safeCategory === 'synth') {
    safeCategory = 'wind';
  }
  if (safeCategory !== 'string' && safeCategory !== 'percussion' && safeCategory !== 'wind') {
    safeCategory = 'string';
  }
  
  return {
    instrument: {
      name: 'Unknown ' + (fallbackType || 'Instrument'),
      localName: 'Unknown',
      ethnoLinguisticGroup: 'Unknown',
      hornbostelSachs: 'Unknown',
      culturalPurpose: 'Unknown',
      category: safeCategory,
      description: 'A dynamically generated fallback instrument profile.',
      region: 'Unknown',
    },
    acoustic: {
      fundamentalFreqMin: 110,
      fundamentalFreqMax: 440,
      timbre: 'basic',
      decayTime: 1.0,
      attackTime: 0.1,
      tuningSystem: 'Equal Temperament',
      synthesisType: synthType,
      scaleNotes: keys.map((_k, i) => ({ note: 'N'+i, frequency: 110 + (i*40), lane: i })),
    },
    inputMapping: {
      laneCount: numLanes,
      orientation: 'vertical',
      lanes: keys.map((k, i) => ({ id: i, label: 'L'+i, frequency: 110 + (i*40), keyBinding: k })),
    },
    imageBase64: '',
    imageMimeType: 'image/png'
  };
}
