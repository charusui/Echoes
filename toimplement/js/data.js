/* ==========================================================================
   HARMONYDEX - DATA DEFINITIONS & DATABASE
   ========================================================================== */

const TYPES = {
    STRING: 'string',
    PERCUSSION: 'percussion',
    BRASS: 'brass',
    SYNTH: 'synth',
    WOODWIND: 'woodwind'
};

// Rock-Paper-Scissors Weakness Matrix: attacker -> target -> multiplier
// String > Percussion > Brass > Synth > Woodwind > String
const TYPE_CHART = {
    [TYPES.STRING]: { [TYPES.PERCUSSION]: 2.0, [TYPES.WOODWIND]: 0.5 },
    [TYPES.PERCUSSION]: { [TYPES.BRASS]: 2.0, [TYPES.STRING]: 0.5 },
    [TYPES.BRASS]: { [TYPES.SYNTH]: 2.0, [TYPES.PERCUSSION]: 0.5 },
    [TYPES.SYNTH]: { [TYPES.WOODWIND]: 2.0, [TYPES.BRASS]: 0.5 },
    [TYPES.WOODWIND]: { [TYPES.STRING]: 2.0, [TYPES.SYNTH]: 0.5 }
};

/**
 * Get weakness multiplier between attacking type and defending type.
 */
function getTypeMultiplier(attackType, defendType) {
    if (TYPE_CHART[attackType] && TYPE_CHART[attackType][defendType]) {
        return TYPE_CHART[attackType][defendType];
    }
    return 1.0;
}

// INSTRUMENTS (THE HARMONYDEX)
const INSTRUMENTS = {
    solaris_strat: {
        id: 'solaris_strat',
        name: 'Solaris Stratocaster',
        type: TYPES.STRING,
        baseDmg: 40,
        icon: '🎸',
        desc: 'A fiery six-string electric guitar forged from solar crystals. Emits searing overdrive riffs.',
        captured: true,
        audioPreset: 'pluck-distortion',
        rhythmSpeed: 1.2,
        lore: 'Wielded by vanguard conductors. Its harmonic strings resonate at 432Hz, cutting through physical corruption.',
        skillName: 'Solar Shred',
        skillCost: 2,
        skillDesc: 'High-speed 6-note solo chart dealing heavy String damage.'
    },
    aegis_keytar: {
        id: 'aegis_keytar',
        name: 'Aegis Keytar',
        type: TYPES.SYNTH,
        baseDmg: 38,
        icon: '🎹',
        desc: 'A cybernetic dual-sawtooth synthesizer with a crystalline pitch ribbon.',
        captured: true,
        audioPreset: 'supersaw-pluck',
        rhythmSpeed: 1.1,
        lore: 'Ancient relic of the Synth Weavers. Projects harmonic frequency shields and restores Action Points.',
        skillName: 'Harmonic Shield',
        skillCost: 2,
        skillDesc: 'Grants +50 Shield to party and regenerates 2 AP.'
    },
    valkyrie_flute: {
        id: 'valkyrie_flute',
        name: 'Valkyrie Flute',
        type: TYPES.WOODWIND,
        baseDmg: 35,
        icon: '🪈',
        desc: 'A slender silver flute carved from sacred mountain birch. Breath notes carry restorative magic.',
        captured: true,
        audioPreset: 'sine-breath',
        rhythmSpeed: 1.0,
        lore: 'When played with pure breath control, its melody heals open wounds and soothes turbulent minds.',
        skillName: 'Melody of Renewal',
        skillCost: 2,
        skillDesc: 'Heals all party members by 120 HP and cleanses debuffs.'
    },
    titan_brass: {
        id: 'titan_brass',
        name: 'Titan Brass',
        type: TYPES.BRASS,
        baseDmg: 48,
        icon: '🎺',
        desc: 'A massive golden trumpet capable of shattering stone with its resonant blast.',
        captured: false,
        audioPreset: 'saw-horn',
        rhythmSpeed: 1.3,
        lore: 'Found deep within the Harmonic Shrine. Wild and untamed, it demands a master conductor to seal its power.',
        skillName: 'Resonant Blast',
        skillCost: 2,
        skillDesc: 'Deals massive Brass damage and fills enemy Stagger bar by 40%.'
    },
    thunder_808: {
        id: 'thunder_808',
        name: 'Thunder 808 Drum',
        type: TYPES.PERCUSSION,
        baseDmg: 45,
        icon: '🥁',
        desc: 'A sub-bass drum unit that shakes the very tectonic plates beneath the battlefield.',
        captured: false,
        audioPreset: 'sub-kick',
        rhythmSpeed: 1.25,
        lore: 'A pulsing drum anomaly roaming the wild woods. Its beats syncopate with lightning storms.',
        skillName: 'Sub-Bass Quake',
        skillCost: 2,
        skillDesc: 'AOE Percussion strike that lowers enemy defense.'
    },
    shadow_cello: {
        id: 'shadow_cello',
        name: 'Shadow Cello',
        type: TYPES.STRING,
        baseDmg: 46,
        icon: '🎻',
        desc: 'A deep acoustic cello coated in resonant umbra resin.',
        captured: false,
        audioPreset: 'deep-drone',
        rhythmSpeed: 1.15,
        lore: 'Its mournful low frequencies can paralyze corrupted creatures in their tracks.',
        skillName: 'Umbra Drone',
        skillCost: 2,
        skillDesc: 'Heavy String damage over time and reduces enemy speed.'
    },
    corrupted_violin: {
        id: 'corrupted_violin',
        name: 'Corrupted Violin',
        type: TYPES.STRING,
        baseDmg: 30,
        icon: '🎻',
        desc: 'An instrument warped by the Dissonance into a screeching, aggressive entity.',
        captured: false,
        audioPreset: 'pluck-distortion',
        rhythmSpeed: 1.1,
        lore: 'Once a peaceful village instrument until Lord Cacophony infected its soundboard.'
    },
    lord_cacophony: {
        id: 'lord_cacophony',
        name: 'Lord Cacophony Organ',
        type: TYPES.SYNTH,
        baseDmg: 60,
        icon: '🎛️',
        desc: 'The sovereign of Dissonance, wielding a towering cathedral pipe synth.',
        captured: false,
        audioPreset: 'supersaw-pluck',
        rhythmSpeed: 1.4,
        lore: 'The ultimate boss of the Silent Valley. Only a fully attuned party can withstand its multi-phase rhythm assault.'
    }
};

// HEROES PARTY
const HEROES = {
    gustave: {
        id: 'gustave',
        name: 'Gustave',
        role: 'Lead Vanguard',
        avatar: '🕺',
        hp: 380,
        maxHp: 380,
        ap: 4,
        maxAp: 6,
        equippedId: 'solaris_strat',
        desc: 'The reckless lead guitarist who thrives on high-tempo combo chains.'
    },
    maelle: {
        id: 'maelle',
        name: 'Maelle',
        role: 'Synth Weaver',
        avatar: '👩‍🎤',
        hp: 320,
        maxHp: 320,
        ap: 5,
        maxAp: 6,
        equippedId: 'aegis_keytar',
        desc: 'Tactical genius who manipulates frequency shields and elemental type matchups.'
    },
    lune: {
        id: 'lune',
        name: 'Lune',
        role: 'Harmonic Flautist',
        avatar: '🧚‍♀️',
        hp: 300,
        maxHp: 300,
        ap: 5,
        maxAp: 6,
        equippedId: 'valkyrie_flute',
        desc: 'Serene healer and parry specialist whose breath notes restore harmony.'
    }
};

// QUESTS DATABASE
const QUESTS = {
    q1: {
        id: 'q1',
        title: '1. The Silent Village',
        desc: 'Travel to the Town of Cadence, speak with Elder Cadence, and defeat the Corrupted Violin disturbing the woods.',
        status: 'active', // 'active', 'completed'
        targetNode: 'cadence_town',
        rewardText: '150 Harmonic XP & Unlock Whispering Woods'
    },
    q2: {
        id: 'q2',
        title: '2. The Harmonic Shrine',
        desc: 'Explore the Harmonic Shrine. Lower the wild Titan Brass below 35% HP and use ATTUNE to seal it into your Harmonydex!',
        status: 'locked',
        targetNode: 'harmonic_shrine',
        rewardText: 'Titan Brass Instrument & 250 XP'
    },
    q3: {
        id: 'q3',
        title: '3. The Dissonance Citadel',
        desc: 'Storm the Dissonance Citadel and defeat Lord Cacophony in an epic multi-phase rhythm showdown.',
        status: 'locked',
        targetNode: 'dissonance_citadel',
        rewardText: 'Master Conductor Title & Victory!'
    }
};

// OVERWORLD MAP NODES & DIALOGUES
const MAP_NODES = {
    cadence_town: {
        id: 'cadence_town',
        name: 'Town of Cadence',
        type: 'town',
        x: 180,
        y: 480,
        icon: '🏠',
        desc: 'A tranquil village where Elder Cadence guards the ancient traditions of musical attunement.',
        unlocked: true,
        dialogue: {
            speaker: 'Elder Cadence',
            avatar: '👴',
            text: 'Welcome, young conductors! The Dissonance has infected our peaceful instruments. Just outside town, a Corrupted Violin is screeching in dissonance. Will you cleanse it?',
            choices: [
                {
                    text: 'We will defeat the Corrupted Violin immediately!',
                    action: 'trigger_combat_violin'
                },
                {
                    text: 'Tell us more about Type Weaknesses first.',
                    action: 'explain_types'
                }
            ]
        }
    },
    whispering_woods: {
        id: 'whispering_woods',
        name: 'Whispering Woods',
        type: 'wild',
        x: 480,
        y: 330,
        icon: '🌲',
        desc: 'Dense acoustic forests where wild percussion and string instruments roam freely.',
        unlocked: true,
        dialogue: {
            speaker: 'Wandering Tuner',
            avatar: '🧝‍♂️',
            text: 'You enter the Whispering Woods. A wild Thunder 808 Drum is pulsing near the clearing! Remember: String beats Percussion!',
            choices: [
                {
                    text: 'Encounter Wild Thunder 808 (Percussion Type)',
                    action: 'trigger_combat_808'
                },
                {
                    text: 'Encounter Wild Shadow Cello (String Type)',
                    action: 'trigger_combat_cello'
                }
            ]
        }
    },
    harmonic_shrine: {
        id: 'harmonic_shrine',
        name: 'Harmonic Shrine',
        type: 'shrine',
        x: 800,
        y: 500,
        icon: '⛩️',
        desc: 'An ancient temple resonating with golden brass frequencies.',
        unlocked: false,
        dialogue: {
            speaker: 'Shrine Guardian',
            avatar: '🗿',
            text: 'Here rests the wild Titan Brass (Brass Type). To capture it, strike its weakness using Percussion or String, lower its HP below 35%, and choose the ATTUNE command!',
            choices: [
                {
                    text: 'Challenge & Attune Titan Brass!',
                    action: 'trigger_combat_titan'
                }
            ]
        }
    },
    dissonance_citadel: {
        id: 'dissonance_citadel',
        name: 'Dissonance Citadel',
        type: 'boss',
        x: 820,
        y: 180,
        icon: '🏰',
        desc: 'The looming fortress of Lord Cacophony where distorted synth organ frequencies warp reality.',
        unlocked: false,
        dialogue: {
            speaker: 'Lord Cacophony',
            avatar: '🎛️',
            text: 'FOOLS! Your meager pentatonic scales cannot withstand the full harmonic spectrum of my Dissonance! Prepare to face the ultimate FNF Note Highway!',
            choices: [
                {
                    text: 'Engage Lord Cacophony (Final Boss Showdown!)',
                    action: 'trigger_combat_boss'
                }
            ]
        }
    }
};
