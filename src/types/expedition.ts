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
  enemyIds?: string[];
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
  cebuano_gitara: {
    id: 'cebuano_gitara',
    name: 'Cebuano Gitara',
    type: 'string',
    baseDmg: 40,
    icon: '🎸',
    desc: 'Highly crafted six-string acoustic guitar. Prized for its bright acoustic resonance.',
    captured: true,
    audioPreset: 'pluck-distortion',
    rhythmSpeed: 1.2,
    lore: 'Renowned for its exceptional craftsmanship, produced in Mactan, Cebu.',
    skillName: 'Acoustic Shred',
    skillCost: 2,
    skillDesc: 'High-speed 6-note solo chart dealing heavy String damage.',
  },
  tulali: {
    id: 'tulali',
    name: 'Tulali',
    type: 'woodwind',
    baseDmg: 35,
    icon: '🪈',
    desc: 'End-blown bamboo flute for courtship and encoded messaging.',
    captured: true,
    audioPreset: 'sine-breath',
    rhythmSpeed: 1.0,
    lore: 'Produces a gentle, melancholic sound that carries emotional weight in Visayan culture.',
    skillName: 'Melody of Renewal',
    skillCost: 2,
    skillDesc: 'Heals all party members by 120 HP and cleanses debuffs.',
  },
  tultugan: {
    id: 'tultugan',
    name: 'Tultugan',
    type: 'percussion',
    baseDmg: 45,
    icon: '🥁',
    desc: 'Massive bamboo drums used for communication and rhythms.',
    captured: true,
    audioPreset: 'sub-percussion',
    rhythmSpeed: 1.25,
    lore: 'Historically used by natives for communication, signaling, and rhythmic accompaniment.',
    skillName: 'Seismic Slam',
    skillCost: 2,
    skillDesc: 'Deals heavy Percussion AoE damage and stuns the enemy for 1 turn.',
  },
  bandit: {
    id: 'bandit',
    name: 'Bandit',
    type: 'string',
    baseDmg: 20,
    icon: '👺',
    desc: 'A rogue musician that ambushes travelers.',
    captured: false,
    audioPreset: 'pluck-distortion',
    rhythmSpeed: 1.0,
    lore: 'These rogues travel the woods to steal instruments.',
    skillName: 'Cheap Shot',
    skillCost: 1,
    skillDesc: 'A weak attack that steals AP.',
  },
  litgit: {
    id: 'litgit',
    name: 'Litgit',
    type: 'string',
    baseDmg: 38,
    icon: '🎻',
    desc: 'Dual-purpose bamboo bowed fiddle and scraped idiophone.',
    captured: true,
    audioPreset: 'saw-string',
    rhythmSpeed: 1.15,
    lore: 'Its rustic, scratching tone is a staple of early Visayan folk music.',
    skillName: 'Friction Strike',
    skillCost: 2,
    skillDesc: 'Piercing acoustic attack that applies a defense debuff.',
  },
  bandurria: {
    id: 'bandurria',
    name: 'Bandurria',
    type: 'string',
    baseDmg: 42,
    icon: '🎸',
    desc: '14-string, pear-shaped lead melodic instrument of the Rondalla.',
    captured: true,
    audioPreset: 'pluck-distortion',
    rhythmSpeed: 1.3,
    lore: 'Typically plays the main melody and features a short neck, allowing for rapid, intricate picking.',
    skillName: 'Rapid Tremolo',
    skillCost: 2,
    skillDesc: 'Deals 3 quick bursts of String damage.',
  },
  laud: {
    id: 'laud',
    name: 'Laud',
    type: 'string',
    baseDmg: 40,
    icon: '🎸',
    desc: 'Teardrop chordophone with f-holes, tuned an octave lower than the bandurria.',
    captured: true,
    audioPreset: 'pluck-distortion',
    rhythmSpeed: 1.2,
    lore: 'Provides harmonic support and counter-melodies in the traditional Rondalla string band.',
    skillName: 'Harmonic Support',
    skillCost: 2,
    skillDesc: 'Grants damage mitigation and counter-attack buff.',
  },
  octavina: {
    id: 'octavina',
    name: 'Octavina',
    type: 'string',
    baseDmg: 40,
    icon: '🎸',
    desc: 'Locally innovated, guitar-shaped chordophone serving a tenor role.',
    captured: true,
    audioPreset: 'pluck-distortion',
    rhythmSpeed: 1.2,
    lore: 'Unique to the Philippines, bridging the gap between the high-pitched bandurria and the deep acoustic bass.',
    skillName: 'Tenor Cleave',
    skillCost: 2,
    skillDesc: 'A powerful mid-frequency attack.',
  },
  bajo_de_unas: {
    id: 'bajo_de_unas',
    name: 'Bajo de Uñas',
    type: 'string',
    baseDmg: 50,
    icon: '🎻',
    desc: 'Massive four-stringed acoustic bass plucked with a plectrum.',
    captured: true,
    audioPreset: 'sub-percussion',
    rhythmSpeed: 1.1,
    lore: 'The largest instrument in the Rondalla ensemble, providing rhythmic and harmonic foundation.',
    skillName: 'Resonant Bass',
    skillCost: 2,
    skillDesc: 'Heavy single-target damage.',
  },
  buktot: {
    id: 'buktot',
    name: 'Buktot',
    type: 'string',
    baseDmg: 35,
    icon: '🥥',
    desc: 'A four-stringed native lute crafted from a dried coconut husk.',
    captured: true,
    audioPreset: 'pluck-distortion',
    rhythmSpeed: 1.1,
    lore: 'The Buktot gives a distinct rounded back and a hollow, resonant sound.',
    skillName: 'Husk Resonance',
    skillCost: 1,
    skillDesc: 'Light damage with a chance to distract the enemy.',
  },
  pasiyak: {
    id: 'pasiyak',
    name: 'Pasiyak',
    type: 'woodwind',
    baseDmg: 30,
    icon: '🐦',
    desc: 'A unique bamboo whistle requiring water inside to produce a bird-like chirp.',
    captured: true,
    audioPreset: 'sine-breath',
    rhythmSpeed: 1.0,
    lore: 'Used traditionally to mimic bird calls and signal across wide fields.',
    skillName: 'Avian Call',
    skillCost: 1,
    skillDesc: 'A swift sonic strike that can confuse the enemy.',
  },
  wakwak: {
    id: 'wakwak',
    name: 'Wakwak',
    type: 'string',
    baseDmg: 50,
    icon: '🦇',
    desc: 'A terrifying avian anomaly with devastating wing slam attacks.',
    captured: false,
    audioPreset: 'saw-horn',
    rhythmSpeed: 1.3,
    lore: 'The Wakwak is known for its loud, echoing calls and devastating slam attacks.',
    skillName: 'Wing Slam',
    skillCost: 2,
    skillDesc: 'A devastating slam attack.',
  },
  tugo: {
    id: 'tugo',
    name: 'Tugo',
    type: 'percussion',
    baseDmg: 45,
    icon: '🥁',
    desc: 'A guitar-shaped wooden drum played by hitting the base with the hands.',
    captured: true,
    audioPreset: 'sub-percussion',
    rhythmSpeed: 1.1,
    lore: 'Performers strike its hollowed base with their hands to produce deep, rhythmic beats.',
    skillName: 'Wood Strike',
    skillCost: 2,
    skillDesc: 'High stagger damage.',
  },
  lantoy: {
    id: 'lantoy',
    name: 'Lantoy',
    type: 'woodwind',
    baseDmg: 32,
    icon: '🪈',
    desc: 'A slender bamboo flute that can be played using the mouth or the nose.',
    captured: true,
    audioPreset: 'sine-breath',
    rhythmSpeed: 1.2,
    lore: 'Produces a soft, ethereal tone to appease nature spirits.',
    skillName: 'Spirit Appeasement',
    skillCost: 2,
    skillDesc: 'Heals the party and applies a small shield.',
  },
  subing: {
    id: 'subing',
    name: 'Subing',
    type: 'woodwind',
    baseDmg: 34,
    icon: '🍃',
    desc: 'A twangy, vibrating bamboo jaw harp.',
    captured: true,
    audioPreset: 'saw-horn',
    rhythmSpeed: 1.3,
    lore: 'Played by plucking the vibrating tongue while using the mouth as a resonator.',
    skillName: 'Jaw Twang',
    skillCost: 1,
    skillDesc: 'A fast attack that ignores a portion of enemy defense.',
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
    equippedId: 'cebuano_gitara',
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
    equippedId: 'tulali',
    avatar: '👩‍🎤',
    bio: 'Wind prodigy capable of manipulating sonic frequency shields.',
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
    equippedId: 'tultugan',
    avatar: '🧚',
    bio: 'Healer who channeled ancestral rhythms into healing magic.',
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
    desc: 'A peaceful village home to Elder Cadence and Maria\'s Fine Goods—the premier shop for tonics, gear, and acoustic upgrades.',
    rewards: 'Heal Party, Shop Access & Quest Briefing',
  },
  echo_woods: {
    id: 'echo_woods',
    name: 'Echo Village',
    type: 'boss',
    icon: '👹',
    x: 480,
    y: 330,
    unlocked: true,
    desc: 'The sacred Echo Village, now vibrating with intense boss frequencies. The Wakwak Boss awaits!',
    enemyId: 'wakwak',
    rewards: '500 XP & String Attunement Chance',
  },
  harmonic_shrine: {
    id: 'harmonic_shrine',
    name: 'Harmonic Shrine',
    type: 'shrine',
    icon: '⛩️',
    x: 800,
    y: 500,
    unlocked: true,
    desc: 'An ancient temple where the Harmonic Bandit rests, guarding the sacred Titan Brass.',
    enemyId: 'pasiyak',
    rewards: '250 XP & Harmonic Bandit Capture Opportunity',
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
    enemyId: 'bajo_de_unas',
    rewards: '1000 XP & Expedition 33 Mastery Badge',
  },
  crossroads: {
    id: 'crossroads',
    name: 'Crossroads',
    type: 'battle',
    icon: '⚔️',
    x: 330,
    y: 405,
    unlocked: true,
    desc: 'Bandits block the path to Echo Village!',
    enemyIds: ['bandit', 'bandit', 'bandit'],
    rewards: '150 XP & Safe Passage',
  },
  whispering_path: {
    id: 'whispering_path',
    name: 'Whispering Path',
    type: 'town',
    icon: '🏕️',
    x: 640,
    y: 415,
    unlocked: true,
    desc: 'A small camp where travelers share rumors.',
    rewards: 'Heal Party & Rest',
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
    desc: 'Travel to Echo Village and defeat the Wakwak boss wreaking havoc.',
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
