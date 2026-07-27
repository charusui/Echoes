// ─── Instrument Classification ───────────────────────────────────────────────

export type InstrumentCategory = 'string' | 'percussion' | 'wind';

export interface InstrumentProfile {
  name: string;
  localName: string;
  ethnoLinguisticGroup: string;
  hornbostelSachs: string;
  culturalPurpose: string;
  category: InstrumentCategory;
  description: string;
  history?: string;
  region: string;
}

// ─── Audio / Acoustic Profile ─────────────────────────────────────────────────

export interface ScaleNote {
  note: string;
  frequency: number;
  lane: number;
}

export interface AcousticProfile {
  fundamentalFreqMin: number;
  fundamentalFreqMax: number;
  timbre: string;
  decayTime: number;
  attackTime: number;
  tuningSystem: string;
  scaleNotes: ScaleNote[];
  synthesisType: 'string' | 'fm-gong' | 'flute' | 'membrane-drum' | 'brass' | 'synth-lead';
}

// ─── Input / Lane Mapping ─────────────────────────────────────────────────────

export interface Lane {
  id: number;
  label: string;
  frequency: number;
  keyBinding: string;
  touchZone?: { x: number; y: number; w: number; h: number };
}

export interface InputMapping {
  laneCount: number;
  orientation: 'vertical' | 'horizontal';
  lanes: Lane[];
}

// ─── Verification ────────────────────────────────────────────────────────────

export type VerificationMethod = 'gps' | 'webxr' | 'community' | 'upload';

export interface VerificationResult {
  method: VerificationMethod;
  venue?: string | null;
  ticketId?: string;
  timestamp: string;
}

// ─── Fused Active Instrument (Phase 5 output) ─────────────────────────────────

export interface ActiveInstrumentProfile {
  instrument: InstrumentProfile;
  acoustic: AcousticProfile;
  inputMapping: InputMapping;
  imageBase64: string;
  imageMimeType: string;
  isFallback?: boolean;
  fallbackReason?: 'not-instrument' | 'error' | 'map-selection';
  verificationResult?: VerificationResult;
}

// ─── Gameplay ─────────────────────────────────────────────────────────────────

export type Difficulty = 'apprentice' | 'musician' | 'virtuoso' | 'mastery';

export interface Note {
  id: string;
  time: number;       // scheduled time in seconds from song start
  lane: number;       // 0-indexed lane
  type: 'tap' | 'hold';
  duration?: number;  // for hold notes, in seconds
  isHolding?: boolean; // true while the key is pressed
  stopSound?: () => void;
  hit: boolean;
  missed: boolean;
}

export type HitJudgement = 'perfect' | 'good' | 'miss';

export interface HitResult {
  judgement: HitJudgement;
  noteId: string;
  delta: number; // ms early (negative) or late (positive)
}

export interface GameplayState {
  score: number;
  combo: number;
  multiplier: number;
  weaveProgress: number; // 0–100
  currentStreak: number;
  totalNotes: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
  isPlaying: boolean;
  isPaused: boolean;
  isFinished: boolean;
  isFreePlay: boolean;
  songTimeSeconds: number;
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export type PipelinePhase =
  | 'idle'
  | 'phase1-vision'
  | 'phase2-acoustic'
  | 'phase3-mapping'
  | 'phase4-guardrail'
  | 'phase5-fuse'
  | 'complete'
  | 'error';

export interface PipelineStatus {
  phase: PipelinePhase;
  label: string;
  detail: string;
  progress: number; // 0–100
  error?: string;
}

// ─── App Views ────────────────────────────────────────────────────────────────

export type AppView = 'title' | 'intro' | 'onboarding' | 'map' | 'locationServices' | 'setup' | 'pipeline' | 'discoveryCard' | 'gameplay' | 'quiz' | 'story' | 'results' | 'teachMode' | 'collection' | 'scanner' | 'scanVerification' | 'korlongHunt' | 'teachableStudent' | 'badges' | 'ranks' | 'expedition' | 'scannerCombat' | 'freestyle';

// ─── User Progress & Persistence ──────────────────────────────────────────────

export type ScanMode = 'camera' | 'upload';

export interface UserProgress {
  xp: number;
  level: number;
  currentStreak: number;
  lastActiveDate: string | null;
  badges: string[];
  unlockedInstruments: string[];
  unlockedRegions: string[];
  streakShields: number;
  customProfiles: Record<string, any>; // Stores Omit<ActiveInstrumentProfile, 'imageBase64'>
  pendingReviews: VerificationResult[];
  masteryUnlocked: Record<string, boolean>;
}

// ─── Quizzes & Story ──────────────────────────────────────────────────────────

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface StoryScenario {
  id: string;
  context: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

// ─── Badges & Leaderboard Ranks ──────────────────────────────────────────────

export interface BadgeMetadata {
  id: number;
  name: string;
  title: string;
  description: string;
  category: 'Exploration' | 'Rhythm' | 'Lore' | 'Mastery';
  xpReward: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  xp: number;
  isPlayer: boolean;
  title: string;
  streak: number;
  badgeId: number;
  region: string;
  avatarBg: string;
}

// ─── Master & Field Instruments ──────────────────────────────────────────────

export interface MasterInstrument {
  id: string;
  name: string;
  region: string;
  hint: string;
  extendedInfo?: string;
  history?: string;
}

export interface FieldMissionInstrument extends MasterInstrument {
  crypticHint: string;
}

// ─── Student & Chat System ───────────────────────────────────────────────────

export interface StudentProfile {
  id: string;
  name: string;
  avatar: string;
  trait: string;
  focusCategory: 'percussion' | 'string' | 'wind';
  favoriteInstrument: string;
  openingLine: (unlockedInstruments: string[]) => string;
  personalityPrompt: string;
}

export interface ChatMessage {
  role: 'player' | 'student';
  content: string;
}

// ─── Verification & Korlong Hunt ─────────────────────────────────────────────

export interface GpsVerificationResult {
  passed: boolean;
  venue: string | null;
  distanceMeters: number;
}

export interface KorlongSite {
  name: string;
  significance: string;
  lat: number;
  lng: number;
  spawnRadiusMeters: number;
  loreFragment: string;
}

export interface KorlongSpawn {
  lat: number;
  lng: number;
  nearSite: KorlongSite | null;
  expiresAt: number;
}

export interface CommunityReviewPayload {
  instrumentHint?: string;
  imageBase64Thumb?: string;
  playerNote?: string;
  timestamp: string;
}
