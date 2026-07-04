import type { BadgeMetadata, LeaderboardEntry } from '../types';

export const BADGES_LIST: BadgeMetadata[] = [
  { id: 1, name: 'Visual Scout', title: 'Visionary Scanner', description: 'Scan your first indigenous instrument using AI camera recognition.', category: 'Exploration', xpReward: 50 },
  { id: 2, name: 'Whisper of Bamboo', title: 'Lantoy Apprentice', description: 'Complete a rhythm game melody on a bamboo flute instrument.', category: 'Rhythm', xpReward: 75 },
  { id: 3, name: 'Rhythm of Tultugan', title: 'Percussion Master', description: 'Achieve a Full Combo score on any percussion rhythm challenge.', category: 'Rhythm', xpReward: 100 },
  { id: 4, name: 'String Virtuoso', title: 'Pluck of Heritage', description: 'Master a traditional stringed instrument melody with 90%+ accuracy.', category: 'Rhythm', xpReward: 100 },
  { id: 5, name: 'Harmonic Duet', title: 'Twin Melodies', description: 'Play and record 5 different songs across multiple instrument engines.', category: 'Mastery', xpReward: 150 },
  { id: 6, name: 'Beat Keeper', title: 'Percussionist Pride', description: 'Hit 50 consecutive Perfect notes in any rhythmic weave challenge.', category: 'Rhythm', xpReward: 125 },
  { id: 7, name: 'Echoes of Bamboo', title: 'Subing Whisperer', description: 'Discover and inspect acoustic frequencies from Negros Island.', category: 'Exploration', xpReward: 80 },
  { id: 8, name: 'Island Protector', title: 'Visayan Guardian', description: 'Unlock 3 indigenous instruments in the regional cultural archive.', category: 'Exploration', xpReward: 110 },
  { id: 9, name: 'Lore Scholar', title: 'Ethnomusicologist', description: 'Read the complete historical archives and cultural stories for 5 instruments.', category: 'Lore', xpReward: 100 },
  { id: 10, name: 'Tempest Breath', title: "Amihan's Grace", description: 'Score over 100,000 total cumulative XP across all wind challenges.', category: 'Mastery', xpReward: 200 },
  { id: 11, name: 'Cultural Sovereign', title: 'Master of Visayas', description: 'Reach Level 5 in Expeditions and unlock all regional map territories.', category: 'Mastery', xpReward: 300 },
  { id: 12, name: 'Speed Weaver', title: 'Tnalak Swiftness', description: 'Complete a difficult rhythm track with 100% Weave synchronization.', category: 'Rhythm', xpReward: 150 },
  { id: 13, name: 'Ensemble Builder', title: 'Symphony of the Islands', description: 'Collect and unlock all instruments from Western Visayas.', category: 'Exploration', xpReward: 180 },
  { id: 14, name: 'National Treasure', title: 'Pride of the Philippines', description: 'Discover the legendary two-stringed Korlong in the archaeological hunt.', category: 'Lore', xpReward: 250 },
  { id: 15, name: 'Musikultura Champion', title: 'Virtuoso of Echoes', description: 'Earn 500+ XP and achieve true mastery of Philippine musical heritage.', category: 'Mastery', xpReward: 500 },
];

export const MOCK_FILIPINO_LEADERBOARD: (Omit<LeaderboardEntry, 'xp' | 'isPlayer'> & { baseXp: number })[] = [
  { id: 'usr_1', name: 'Lakandula "Lakan" Mendoza', title: 'Master Ethnomusicologist', streak: 14, badgeId: 15, region: 'Western Visayas', avatarBg: '#da2d46', baseXp: 2450 },
  { id: 'usr_2', name: 'Diwa "Bituin" Macaraeg', title: 'Tultugan Rhythm Prodigy', streak: 12, badgeId: 3, region: 'Central Visayas', avatarBg: '#2a2d43', baseXp: 2120 },
  { id: 'usr_3', name: 'Bayani "Ani" Reyes', title: 'Visayan String Master', streak: 9, badgeId: 14, region: 'Eastern Visayas', avatarBg: '#1e3a8a', baseXp: 1890 },
  { id: 'usr_4', name: 'Mayumi "Yumi" Santos', title: 'Flute & Lantoy Scholar', streak: 7, badgeId: 2, region: 'Negros Region', avatarBg: '#047857', baseXp: 1650 },
  { id: 'usr_5', name: 'Inigo "Iñigo" de Leon', title: 'Percussion Ensemble Leader', streak: 6, badgeId: 6, region: 'Western Visayas', avatarBg: '#b45309', baseXp: 1420 },
  { id: 'usr_6', name: 'Tala "Tal" Dimaculangan', title: 'Cultural Heritage Archivist', streak: 5, badgeId: 9, region: 'Central Visayas', avatarBg: '#6b21a8', baseXp: 1280 },
  { id: 'usr_8', name: 'Kidlat "Alat" Magbanua', title: 'Subing & Kubing Hunter', streak: 4, badgeId: 7, region: 'Negros Region', avatarBg: '#4338ca', baseXp: 950 },
  { id: 'usr_9', name: 'Hiraya "Raya" Pangilinan', title: 'Rhythm Weaver', streak: 4, badgeId: 12, region: 'Eastern Visayas', avatarBg: '#be123c', baseXp: 820 },
  { id: 'usr_10', name: 'Bagani "Gani" Catacutan', title: 'Lantoy Enthusiast', streak: 3, badgeId: 5, region: 'Western Visayas', avatarBg: '#15803d', baseXp: 640 },
  { id: 'usr_11', name: 'Liwayway "Liway" Bautista', title: 'Acoustic Explorer', streak: 3, badgeId: 10, region: 'Central Visayas', avatarBg: '#c2410c', baseXp: 510 },
  { id: 'usr_12', name: 'Makisig "Sig" Valderrama', title: 'Instrument Scout', streak: 2, badgeId: 1, region: 'Western Visayas', avatarBg: '#0369a1', baseXp: 380 },
  { id: 'usr_13', name: 'Dalisay "Isay" Cruz', title: 'Field Mission Cadet', streak: 1, badgeId: 8, region: 'Negros Region', avatarBg: '#a21caf', baseXp: 250 },
  { id: 'usr_14', name: 'Dakila "Daks" Aguilar', title: 'Student Researcher', streak: 1, badgeId: 13, region: 'Eastern Visayas', avatarBg: '#475569', baseXp: 120 },
];
