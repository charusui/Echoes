export type ExpeditionType = 'string' | 'percussion' | 'brass' | 'synth' | 'woodwind';

export const EXPEDITION_TYPES: Record<string, ExpeditionType> = {
  STRING: 'string',
  PERCUSSION: 'percussion',
  BRASS: 'brass',
  SYNTH: 'synth',
  WOODWIND: 'woodwind',
};

// Rock-Paper-Scissors Weakness Matrix: attacker -> target -> multiplier
// String > Percussion > Brass > Synth > Woodwind > String
export const TYPE_CHART: Record<ExpeditionType, Partial<Record<ExpeditionType, number>>> = {
  string: { percussion: 2.0, woodwind: 0.5 },
  percussion: { brass: 2.0, string: 0.5 },
  brass: { synth: 2.0, percussion: 0.5 },
  synth: { woodwind: 2.0, brass: 0.5 },
  woodwind: { string: 2.0, synth: 0.5 },
};

export function getTypeMultiplier(attackType: ExpeditionType, defendType: ExpeditionType): number {
  const chart = TYPE_CHART[attackType];
  if (chart && chart[defendType]) {
    return chart[defendType]!;
  }
  return 1.0;
}

export interface HarmonydexEntry {
  id: string;
  name: string;
  type: ExpeditionType;
  baseDmg: number;
  icon: string;
  desc: string;
  captured: boolean;
  audioPreset: string;
  rhythmSpeed: number;
  lore: string;
  skillName: string;
  skillCost: number;
  skillDesc: string;
}

export interface HeroProfile {
  id: string;
  name: string;
  role: string;
  hp: number;
  maxHp: number;
  ap: number;
  maxAp: number;
  shield: number;
  equippedId: string;
  avatar: string;
  bio: string;
}

export interface EnemyProfile {
  id: string;
  name: string;
  type: ExpeditionType;
  level: number;
  hp: number;
  maxHp: number;
  stagger: number;
  maxStagger: number;
  staggered: boolean;
  baseDmg: number;
  captured: boolean;
  preset: string;
  isBoss?: boolean;
}

export type TurnUnit = 
  | { isHero: true; unit: HeroProfile }
  | { isHero: false; unit: EnemyProfile };

export interface MapNode {
  id: string;
  name: string;
  type: 'town' | 'battle' | 'boss' | 'shrine';
  icon: string;
  x: number;
  y: number;
  unlocked: boolean;
  completed?: boolean;
  desc: string;
  enemyId?: string;
  rewards: string;
}

export interface ExpeditionQuest {
  id: string;
  title: string;
  desc: string;
  status: 'active' | 'completed' | 'locked';
  target: string;
}

export const EXPEDITION_INSTRUMENTS: Record<string, HarmonydexEntry> = {
  solaris_strat: {
    id: 'solaris_strat',
    name: 'Solaris Stratocaster',
    type: 'string',
    baseDmg: 40,
    icon: '🎸',
    desc: 'A fiery six-string electric guitar forged from solar crystals. Emits searing overdrive riffs.',
    captured: true,
    audioPreset: 'pluck-distortion',
    rhythmSpeed: 1.2,
    lore: 'Wielded by vanguard conductors. Its harmonic strings resonate at 432Hz, cutting through physical corruption.',
    skillName: 'Solar Shred',
    skillCost: 2,
    skillDesc: 'High-speed 6-note solo chart dealing heavy String damage.',
  },
  aegis_keytar: {
    id: 'aegis_keytar',
    name: 'Aegis Keytar',
    type: 'synth',
    baseDmg: 38,
    icon: '🎹',
    desc: 'A cybernetic dual-sawtooth synthesizer with a crystalline pitch ribbon.',
    captured: true,
    audioPreset: 'supersaw-pluck',
    rhythmSpeed: 1.1,
    lore: 'Ancient relic of the Synth Weavers. Projects harmonic frequency shields and restores Action Points.',
    skillName: 'Harmonic Shield',
    skillCost: 2,
    skillDesc: 'Grants +50 Shield to party and regenerates 2 AP.',
  },
  valkyrie_flute: {
    id: 'valkyrie_flute',
    name: 'Valkyrie Flute',
    type: 'woodwind',
    baseDmg: 35,
    icon: '🪈',
    desc: 'A slender silver flute carved from sacred mountain birch. Breath notes carry restorative magic.',
    captured: true,
    audioPreset: 'sine-breath',
    rhythmSpeed: 1.0,
    lore: 'When played with pure breath control, its melody heals open wounds and soothes turbulent minds.',
    skillName: 'Melody of Renewal',
    skillCost: 2,
    skillDesc: 'Heals all party members by 120 HP and cleanses debuffs.',
  },
  titan_brass: {
    id: 'titan_brass',
    name: 'Titan Brass',
    type: 'brass',
    baseDmg: 48,
    icon: '🎺',
    desc: 'A massive golden trumpet capable of shattering stone with its resonant blast.',
    captured: false,
    audioPreset: 'saw-horn',
    rhythmSpeed: 1.3,
    lore: 'Found deep within the Harmonic Shrine. Wild and untamed, it demands a master conductor to seal its power.',
    skillName: 'Resonant Blast',
    skillCost: 2,
    skillDesc: 'Deals massive Brass damage and fills enemy Stagger bar by 40%.',
  },
  thunder_808: {
    id: 'thunder_808',
    name: 'Thunder 808 Drum',
    type: 'percussion',
    baseDmg: 45,
    icon: '🥁',
    desc: 'An ancient tribal drum fused with sub-bass harmonic circuits.',
    captured: false,
    audioPreset: 'sub-percussion',
    rhythmSpeed: 1.25,
    lore: 'Its heart-pounding sub-bass frequencies shake the very earth beneath the Silent Valley.',
    skillName: 'Seismic Slam',
    skillCost: 2,
    skillDesc: 'Deals heavy Percussion AoE damage and stuns the enemy for 1 turn.',
  },
  corrupted_violin: {
    id: 'corrupted_violin',
    name: 'Corrupted Violin',
    type: 'string',
    baseDmg: 35,
    icon: '🎻',
    desc: 'A warped classical violin oozing with purple Dissonance residue.',
    captured: false,
    audioPreset: 'saw-string',
    rhythmSpeed: 1.15,
    lore: 'Once a pristine solo instrument of the Royal Symphony, now twisted by dissonance into an aggressive anomaly.',
    skillName: 'Dissonant Screech',
    skillCost: 2,
    skillDesc: 'Piercing acoustic attack.',
  },
  lord_cacophony: {
    id: 'lord_cacophony',
    name: 'Lord of Cacophony (Amalgam)',
    type: 'synth',
    baseDmg: 55,
    icon: '🔮',
    desc: 'A terrifying fusion of shattered organs, drums, and distorted brass cables.',
    captured: false,
    audioPreset: 'supersaw-pluck',
    rhythmSpeed: 1.4,
    lore: 'The apex anomaly of The Wild Peak Summit. Feeds on uncalibrated musical frequencies to tear space-time.',
    skillName: 'Total Void Resonance',
    skillCost: 3,
    skillDesc: 'Cataclysmic sonic wave across all channels.',
  },
  visayan_kulintang: {
    id: 'visayan_kulintang',
    name: 'Sacred Visayan Kulintang',
    type: 'percussion',
    baseDmg: 50,
    icon: '🔔',
    desc: 'A pristine golden gong chime set echoing ancient pre-colonial melodies.',
    captured: true,
    audioPreset: 'sub-percussion',
    rhythmSpeed: 1.2,
    lore: 'Blessed by ancestral conductors. Each strike reverberates pure harmony that banishes Dissonance instantly.',
    skillName: 'Ancestral Chime',
    skillCost: 2,
    skillDesc: 'Massive Percussion damage and +30% accuracy bonus to the party.',
  },
};

export const DEFAULT_HEROES: Record<string, HeroProfile> = {
  gustave: {
    id: 'gustave',
    name: 'Gustave',
    role: 'Vanguard Conductor',
    hp: 350,
    maxHp: 350,
    ap: 4,
    maxAp: 6,
    shield: 0,
    equippedId: 'solaris_strat',
    avatar: '🧑‍🎤',
    bio: 'Lead guitarist and expedition commander. Specialist in String overdrive.',
  },
  maelle: {
    id: 'maelle',
    name: 'Maelle',
    role: 'Harmonic Weaver',
    hp: 280,
    maxHp: 280,
    ap: 5,
    maxAp: 6,
    shield: 0,
    equippedId: 'aegis_keytar',
    avatar: '👩‍🎤',
    bio: 'Synthesizer prodigy capable of manipulating sonic frequency shields.',
  },
  lune: {
    id: 'lune',
    name: 'Lune',
    role: 'Resonance Sage',
    hp: 260,
    maxHp: 260,
    ap: 4,
    maxAp: 6,
    shield: 0,
    equippedId: 'valkyrie_flute',
    avatar: '🧚',
    bio: 'Healer who channeled ancestral woodwind melodies into healing magic.',
  },
};

export const EXPEDITION_NODES: Record<string, MapNode> = {
  cadence_town: {
    id: 'cadence_town',
    name: 'Town of Cadence',
    type: 'town',
    icon: '🏡',
    x: 180,
    y: 480,
    unlocked: true,
    desc: 'A peaceful village where the elder guards the ancient traditions of musical attunement.',
    rewards: 'Heal Party & Quest Briefing',
  },
  echo_woods: {
    id: 'echo_woods',
    name: 'Echo Village',
    type: 'battle',
    icon: '🎻',
    x: 480,
    y: 330,
    unlocked: true,
    desc: 'A forest village vibrating with erratic string frequencies. A Corrupted Violin stalks this area.',
    enemyId: 'corrupted_violin',
    rewards: '150 XP & String Attunement Chance',
  },
  harmonic_shrine: {
    id: 'harmonic_shrine',
    name: 'Harmonic Shrine',
    type: 'shrine',
    icon: '🎺',
    x: 800,
    y: 500,
    unlocked: true,
    desc: 'An ancient temple where the Titan Brass rests, guarded by heavy percussion wards.',
    enemyId: 'titan_brass',
    rewards: '250 XP & Titan Brass Capture Opportunity',
  },
  silent_peak: {
    id: 'silent_peak',
    name: 'The Wild Peak Summit',
    type: 'boss',
    icon: '🌋',
    x: 820,
    y: 180,
    unlocked: true,
    desc: 'The epicenter of the Dissonance. The Lord of Cacophony awaits top-tier conductors.',
    enemyId: 'lord_cacophony',
    rewards: '1000 XP & Expedition 33 Mastery Badge',
  },
};

export const EXPEDITION_QUESTS: Record<string, ExpeditionQuest> = {
  q1: {
    id: 'q1',
    title: '1. The Silent Valley Survey',
    desc: 'Speak with Elder Cadence in the Town of Cadence to receive your attunement tuning fork.',
    status: 'completed',
    target: 'cadence_town',
  },
  q2: {
    id: 'q2',
    title: '2. Echoes of the Anomaly',
    desc: 'Travel to Echo Village and capture the Corrupted Violin using Harmonic Attunement when its HP is below 35%.',
    status: 'active',
    target: 'echo_woods',
  },
  q3: {
    id: 'q3',
    title: '3. The Brass Awakening',
    desc: 'Journey to the Harmonic Shrine and tame the wild Titan Brass to expand your Harmonydex.',
    status: 'locked',
    target: 'harmonic_shrine',
  },
  q4: {
    id: 'q4',
    title: '4. Siege of The Wild Peak Summit',
    desc: 'Ascend to The Wild Peak Summit and defeat the Lord of Cacophony to permanently restore harmony to the world.',
    status: 'locked',
    target: 'silent_peak',
  },
};
