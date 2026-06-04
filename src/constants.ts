import type { InstrumentCategory, ActiveInstrumentProfile } from './types';

// ─── Color Palette ────────────────────────────────────────────────────────────

export const COLORS = {
  obsidian: '#1E1614',    // Deep espresso/warm black
  charcoal: '#352520',    // Warm dark brown
  teal: '#D68910',        // Burnt orange / Amber (Secondary)
  cyan: '#FED56B',        // Golden yellow (Main Accent)
  silver: '#FDEBD0',      // Warm parchment/off-white
  danger: '#E74C3C',      // Warm red
  success: '#FED56B',     // Golden yellow
  purple: '#A569BD',      // Soft purple
  gold: '#FED56B',        // Same golden yellow
} as const;

// ─── Timing Windows (seconds) ─────────────────────────────────────────────────

export const HIT_WINDOWS = {
  perfect: 0.045, // ±45ms
  good: 0.090,    // ±90ms
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
