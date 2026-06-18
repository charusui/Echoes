import type { InstrumentCategory, ActiveInstrumentProfile } from './types';

// ─── Color Palette ────────────────────────────────────────────────────────────

export const COLORS = {
  obsidian: '#0f0c0c',    // Near Black
  'dark-slate': '#2a2d43',    // Dark Slate
  'pale-pink': '#f0dde0',        // Pale Dusty Pink
  crimson: '#da2d46',        // Crimson
  'light-gray': '#e0e5ed',      // Light Cool Gray
  'slate-gray': '#888ea1',      // Slate Gray
  danger: '#E74C3C',      // Warm red
  success: '#FED56B',     // Golden yellow
  purple: '#A569BD',      // Soft purple
  gold: '#FED56B',        // Same golden yellow
} as const;

// ─── Timing Windows (seconds) ─────────────────────────────────────────────────

export const HIT_WINDOWS = {
  perfect: 0.080, // ±80ms
  good: 0.200,    // ±200ms
} as const;

// ─── Scoring ──────────────────────────────────────────────────────────────────

export const SCORE_VALUES = {
  perfect: 100,
  good: 50,
  miss: 0,
} as const;

export const MULTIPLIER_THRESHOLDS = [
  { combo: 20, multiplier: 4 },
  { combo: 10, multiplier: 3 },
  { combo: 5,  multiplier: 2 },
  { combo: 0,  multiplier: 1 },
] as const;

// ─── Gameplay ─────────────────────────────────────────────────────────────────

export const SCROLL_SPEED = 300;        // pixels per second
export const SPAWN_AHEAD_TIME = 2.5;    // seconds ahead to spawn notes
export const HIT_ZONE_Y_RATIO = 0.85;  // hit zone is 85% down the canvas
export const NOTE_RADIUS = 24;          // pixels
export const SONG_DURATION = 60;        // seconds

// ─── Keyboard Bindings ────────────────────────────────────────────────────────

export const KEYBOARD_MAPS: Record<InstrumentCategory, string[]> = {
  string:     ['1', '2'],
  percussion: ['1', '2', '3', '4', '5', '6', '7', '8'],
  wind:       ['1', '2', '3', '4'],
};

// ─── Gemini Model ─────────────────────────────────────────────────────────────

export const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';

// ─── Master Instruments Collection ──────────────────────────────────────────────

export interface MasterInstrument {
  id: string;
  name: string;
  region: string;
  hint: string;
  extendedInfo?: string;
  history?: string;
}

export const IMAGE_BASE = '/instruments/';

export const MASTER_INSTRUMENTS: MasterInstrument[] = [
  // Western Visayas (2 Verified)
  { id: 'tultugan', name: 'Tultugan', region: 'Western Visayas', hint: 'Massive bamboo drums used for communication and rhythms. Found at the Tultugan Festival in Maasin, Iloilo.', extendedInfo: 'Originating from Panay Island, the Tultugan is a traditional percussion instrument made from bamboo. It was historically used by natives for communication, signaling, and rhythmic accompaniment during tribal gatherings and rituals.' },
  { id: 'tulali',   name: 'Tulali',   region: 'Western Visayas', hint: 'End-blown bamboo flute for courtship and encoded messaging. On display at UPV MACH, Iloilo City.', extendedInfo: 'The Tulali is an indigenous bamboo flute with six finger holes. It is traditionally played during courtship rituals and special occasions, producing a gentle, melancholic sound that carries emotional weight in Visayan culture.' },
  { id: 'litgit',   name: 'Litgit',   region: 'Western Visayas', hint: 'Dual-purpose bamboo bowed fiddle and scraped idiophone. On display at UPV MACH, Iloilo City.', extendedInfo: 'The Litgit is a traditional two-stringed bowed instrument crafted from bamboo. Often played alongside other indigenous instruments, its rustic, scratching tone (resembling its name, which mimics the sound of friction) is a staple of early Visayan folk music.' },

  // Central Visayas (5 Verified)
  { id: 'cebuano_gitara', name: 'Cebuano Gitara', region: 'Central Visayas', hint: 'Highly crafted six-string acoustic guitar. Found at Alegre Guitar Factory, Lapu-Lapu City and the National Museum of the Philippines – Cebu.', extendedInfo: 'The Cebuano guitar is renowned for its exceptional craftsmanship, primarily produced in Mactan, Cebu. Made from high-quality imported and local woods, these guitars are prized for their bright acoustic resonance and durable build.' },
  { id: 'bandurria',      name: 'Bandurria',      region: 'Central Visayas', hint: '14-string, pear-shaped lead melodic instrument of the Rondalla. Found at Alegre Guitar Factory Showroom, Lapu-Lapu City.', extendedInfo: 'A vital part of the Philippine Rondalla ensemble, the Bandurria is a pear-shaped plucked lute with 14 strings. It typically plays the main melody and features a short neck, allowing for rapid, intricate picking.' },
  { id: 'laud',           name: 'Laud',           region: 'Central Visayas', hint: 'Teardrop chordophone with f-holes, tuned an octave lower than the bandurria. Found at Ferangeli Guitar Handcrafter Showroom, Cebu.', extendedInfo: 'The Laud is a plectrum-plucked chordophone shaped like a teardrop with f-holes. Tuned an octave below the bandurria, it provides harmonic support and counter-melodies in the traditional Rondalla string band.' },
  { id: 'octavina',       name: 'Octavina',       region: 'Central Visayas', hint: 'Locally innovated, guitar-shaped chordophone serving a tenor role. Found at Ferangeli Guitar Handcrafter Showroom, Cebu.', extendedInfo: 'Unique to the Philippines, the Octavina resembles a small acoustic guitar but is tuned like a Laud. It serves an alto or tenor role in the Rondalla, bridging the gap between the high-pitched bandurria and the deep acoustic bass.' },
  { id: 'bajo_de_unas',   name: 'Bajo de Uñas',   region: 'Central Visayas', hint: 'Massive four-stringed acoustic bass plucked with a plectrum. Found at Alegre Guitar Factory Showroom, Lapu-Lapu City.', extendedInfo: 'The Bajo de Uñas is the largest instrument in the Rondalla ensemble. This massive four-stringed acoustic bass provides the rhythmic and harmonic foundation of the group, traditionally plucked using a heavy plectrum.' },
];

// ─── Field Mission Instruments (no verified location — community-unlockable) ───────────
// Visible in Collection as ghost cards. Players submit sightings via community review.

export interface FieldMissionInstrument extends MasterInstrument {
  crypticHint: string;
}

export const FIELD_MISSION_INSTRUMENTS: FieldMissionInstrument[] = [
  {
    id: 'buktot',
    name: 'Buktot',
    region: 'Western Visayas',
    hint: 'A four-stringed native lute crafted from a dried coconut husk.',
    crypticHint: 'Whispers of this coconut-bodied lute echo through the festivals of Panay. A barangay celebration may hold the answer...',
    extendedInfo: 'The Buktot, meaning "hunchback" in Visayan, is a native four-stringed lute. Its body is traditionally crafted from a dried coconut husk, which gives the instrument its distinct rounded back and a hollow, resonant sound.'
  },
  {
    id: 'pasiyak',
    name: 'Pasiyak',
    region: 'Western Visayas',
    hint: 'A unique bamboo whistle requiring water inside to produce a bird-like chirp.',
    crypticHint: 'They say children still craft these near the rice paddies of Iloilo. Look where birds and water meet...',
    extendedInfo: 'The Pasiyak is a unique indigenous whistle made from a cut piece of bamboo. When a small amount of water is poured inside, blowing into it produces a warbling, bird-like chirp used for signaling or entertainment.'
  },
  {
    id: 'tugo',
    name: 'Tugo',
    region: 'Western Visayas',
    hint: 'A guitar-shaped wooden drum played by hitting the base with the hands.',
    crypticHint: 'This drum’s voice is rare — perhaps a cultural center or local festival in Antique still keeps it alive...',
    extendedInfo: 'The Tugo is a traditional wooden percussion instrument, distinctively carved into a guitar-like shape but played as a drum. Performers strike its hollowed base with their hands to produce deep, rhythmic beats.'
  },
  {
    id: 'lantoy',
    name: 'Lantoy',
    region: 'Eastern Visayas',
    hint: 'A slender bamboo flute that can be played using the mouth or the nose.',
    crypticHint: 'The nose-flute tradition survives quietly. Seek out indigenous cultural communities in Samar or Leyte...',
    extendedInfo: 'The Lantoy is a tiny bamboo flute of the Visayan people, often played by blowing through the nose or mouth. It produces a soft, ethereal tone and was traditionally played to appease nature spirits or during quiet courtship.'
  },
  {
    id: 'subing',
    name: 'Subing',
    region: 'Eastern Visayas',
    hint: 'A twangy, vibrating bamboo jaw harp.',
    crypticHint: 'A jaw harp that hums with memory. Try the Leyte Cultural Center or ask elders in Basey, Samar...',
    extendedInfo: 'The Subing is a traditional Visayan jaw harp made from a single, carefully carved piece of bamboo. Played by plucking the vibrating tongue while using the mouth as a resonator, it was often used for intimate communication and poetry.'
  },
];

// ─── Korlong — Legendary GPS Hunt Instrument ────────────────────────────────────────
// Not scannable. Discovered only via GPS proximity hunt.

export const KORLONG_INSTRUMENT: MasterInstrument = {
  id: 'korlong',
  name: 'Korlong',
  region: 'Eastern Visayas',
  hint: 'Critically endangered two-stringed fiddle. Unverified in Visayas; likely restricted to climate-controlled national or private academic vaults due to rapid degradation.',
  extendedInfo: 'The Korlong is a critically endangered traditional fiddle of the Eastern Visayas. Crafted with two strings, it was historically used to accompany epic chanting and storytelling, though very few authentic pieces remain today.',
  history: 'Historical accounts—notably by historian William Henry Scott in "Barangay: 16th-Century Philippine Culture and Society"—describe the korlong as the female counterpart to the kudyapi. While men played the kudyapi (a wooden lute) to accompany their love songs, women played the korlong. It was traditionally a zither-like instrument crafted from a single node of bamboo with strings cut directly from the surface and raised by small bridges, played with both hands like a harp or lyre.'
};


// ─── Fallback Instrument Profiles ─────────────────────────────────────────────
// Used when the Gemini pipeline fails or image is unrecognizable

export const FALLBACK_PROFILES: Record<InstrumentCategory, ActiveInstrumentProfile> = {
  percussion: {
    instrument: {
      name: 'Kulintang',
      localName: 'Kulintang',
      ethnoLinguisticGroup: 'Maguindanao',
      hornbostelSachs: '111.241.2 - Idiophone / Percussion Gong',
      culturalPurpose: 'Ritual, courtship, and social ceremonies',
      category: 'percussion',
      description: 'A row of 8 small, horizontally-laid bronze bossed gongs central to Maguindanao music.',
      region: 'Mindanao',
    },
    acoustic: {
      fundamentalFreqMin: 150,
      fundamentalFreqMax: 800,
      timbre: 'metallic, resonant, bronze',
      decayTime: 2.5,
      attackTime: 0.001,
      tuningSystem: 'Pentatonic (Binalig mode)',
      synthesisType: 'fm-gong',
      scaleNotes: [
        { note: 'D4', frequency: 293.66, lane: 0 },
        { note: 'F4', frequency: 349.23, lane: 1 },
        { note: 'G4', frequency: 392.00, lane: 2 },
        { note: 'A4', frequency: 440.00, lane: 3 },
        { note: 'C5', frequency: 523.25, lane: 4 },
        { note: 'D5', frequency: 587.33, lane: 5 },
        { note: 'F5', frequency: 698.46, lane: 6 },
        { note: 'G5', frequency: 784.00, lane: 7 },
      ],
    },
    inputMapping: {
      laneCount: 8,
      orientation: 'horizontal',
      lanes: [
        { id: 0, label: 'Gong 1', frequency: 293.66, keyBinding: '1' },
        { id: 1, label: 'Gong 2', frequency: 349.23, keyBinding: '2' },
        { id: 2, label: 'Gong 3', frequency: 392.00, keyBinding: '3' },
        { id: 3, label: 'Gong 4', frequency: 440.00, keyBinding: '4' },
        { id: 4, label: 'Gong 5', frequency: 523.25, keyBinding: '5' },
        { id: 5, label: 'Gong 6', frequency: 587.33, keyBinding: '6' },
        { id: 6, label: 'Gong 7', frequency: 698.46, keyBinding: '7' },
        { id: 7, label: 'Gong 8', frequency: 784.00, keyBinding: '8' },
      ],
    },
    imageBase64: '',
    imageMimeType: 'image/jpeg',
  },

  string: {
    instrument: {
      name: 'Kudyapi',
      localName: 'Kudyapiq',
      ethnoLinguisticGroup: 'Maranao / Maguindanao',
      hornbostelSachs: '312.12 - Chordophone / Boat Lute',
      culturalPurpose: 'Courtship, storytelling, and meditation',
      category: 'string',
      description: 'A two-stringed boat lute with a drone string and a melody string, often carved from a single piece of wood.',
      region: 'Mindanao',
    },
    acoustic: {
      fundamentalFreqMin: 123,
      fundamentalFreqMax: 500,
      timbre: 'woody, bright, plucked',
      decayTime: 0.6,
      attackTime: 0.001,
      tuningSystem: 'Microtonal pentatonic',
      synthesisType: 'string',
      scaleNotes: [
        { note: 'B2 (drone)', frequency: 123.47, lane: 0 },
        { note: 'E3',  frequency: 164.81, lane: 1 },
        { note: 'F#3', frequency: 185.00, lane: 1 },
        { note: 'A3',  frequency: 220.00, lane: 1 },
        { note: 'B3',  frequency: 246.94, lane: 1 },
        { note: 'D4',  frequency: 293.66, lane: 1 },
      ],
    },
    inputMapping: {
      laneCount: 2,
      orientation: 'vertical',
      lanes: [
        { id: 0, label: 'Drone', frequency: 123.47, keyBinding: '1' },
        { id: 1, label: 'Melody', frequency: 164.81, keyBinding: '2' },
      ],
    },
    imageBase64: '',
    imageMimeType: 'image/jpeg',
  },

  wind: {
    instrument: {
      name: 'Tongali',
      localName: 'Tongali',
      ethnoLinguisticGroup: 'Kalinga',
      hornbostelSachs: '421.111.12 - Aerophone / Nose Flute',
      culturalPurpose: 'Courtship, healing ceremonies, and personal expression',
      category: 'wind',
      description: 'A four-holed nose flute of the Kalinga people made from bamboo, played by blowing through one nostril.',
      region: 'Cordillera Administrative Region',
    },
    acoustic: {
      fundamentalFreqMin: 300,
      fundamentalFreqMax: 1200,
      timbre: 'breathy, airy, bamboo',
      decayTime: 1.0,
      attackTime: 0.1,
      tuningSystem: 'Diatonic-influenced pentatonic',
      synthesisType: 'flute',
      scaleNotes: [
        { note: 'D5',  frequency: 587.33, lane: 0 },
        { note: 'E5',  frequency: 659.26, lane: 1 },
        { note: 'G5',  frequency: 784.00, lane: 2 },
        { note: 'A5',  frequency: 880.00, lane: 3 },
      ],
    },
    inputMapping: {
      laneCount: 4,
      orientation: 'vertical',
      lanes: [
        { id: 0, label: 'Hole 1', frequency: 587.33, keyBinding: '1' },
        { id: 1, label: 'Hole 2', frequency: 659.26, keyBinding: '2' },
        { id: 2, label: 'Hole 3', frequency: 784.00, keyBinding: '3' },
        { id: 3, label: 'Hole 4', frequency: 880.00, keyBinding: '4' },
      ],
    },
    imageBase64: '',
    imageMimeType: 'image/jpeg',
  },
};

// ─── Pipeline Phase Labels ────────────────────────────────────────────────────

export const PIPELINE_PHASES = [
  { phase: 'phase1-vision',    label: '[ SCANNING INSTRUMENT ]',     detail: 'Analyzing image via Gemini Vision...' },
  { phase: 'phase2-acoustic',  label: '[ EXTRACTING AUDIO TIMBRE ]', detail: 'Modeling acoustic properties...' },
  { phase: 'phase3-mapping',   label: '[ MAPPING CONTROLS ]',        detail: 'Designing lane control matrix...' },
  { phase: 'phase4-guardrail', label: '[ DEPLOYING GUARDRAILS ]',    detail: 'Verifying cultural integrity...' },
  { phase: 'phase5-fuse',      label: '[ SYNTHESIZING PROFILE ]',    detail: 'Fusing all data streams...' },
] as const;
