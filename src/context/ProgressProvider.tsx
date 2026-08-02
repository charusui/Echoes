import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProgress, VerificationResult, LeaderboardEntry } from '../types';
import { MASTER_INSTRUMENTS, FIELD_MISSION_INSTRUMENTS, KORLONG_INSTRUMENT } from '../constants';
import { MOCK_FILIPINO_LEADERBOARD } from '../constants/badges';

interface ProgressContextType {
  progress: UserProgress;
  addXP: (amount: number, source: string) => void;
  recordScan: (instrumentName: string) => boolean; // returns true if new discovery
  updateStreak: () => void;
  unlockRegion: (region: string) => void;
  awardBadge: (badge: string) => void;
  useStreakShield: () => boolean;
  getClassroomLeaderboard: () => LeaderboardEntry[];
  saveCustomProfile: (profileId: string, profileData: any) => void;
  unlockAllInstruments: () => void;
  addPendingReview: (result: VerificationResult) => void;
  updateShards: (amount: number) => void;
  updateInventory: (itemId: string, amount: number) => void;
}

const DEFAULT_PROGRESS: UserProgress = {
  xp: 0,
  level: 1,
  currentStreak: 0,
  lastActiveDate: null,
  badges: [],
  unlockedInstruments: [],
  unlockedRegions: ['Western Visayas'],
  streakShields: 0,
  customProfiles: {},
  pendingReviews: [],
  masteryUnlocked: {},
  shards: 100, // Starting shards
  inventory: {},
};

const ProgressContext = createContext<ProgressContextType | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem('filinstruments_progress');
    const parsed = saved ? JSON.parse(saved) : null;
    return parsed ? { ...DEFAULT_PROGRESS, ...parsed, shards: parsed.shards ?? 100, inventory: parsed.inventory ?? {} } : DEFAULT_PROGRESS;
  });

  useEffect(() => {
    localStorage.setItem('filinstruments_progress', JSON.stringify(progress));
  }, [progress]);

  const addXP = (amount: number, _source: string) => {
    setProgress(prev => {
      const newXp = prev.xp + amount;
      let newLevel = prev.level;
      if (newXp >= 900) newLevel = 5;
      else if (newXp >= 500) newLevel = 4;
      else if (newXp >= 250) newLevel = 3;
      else if (newXp >= 100) newLevel = 2;

      return { ...prev, xp: newXp, level: newLevel };
    });
  };

  const recordScan = (instrumentName: string) => {
    let isNew = false;
    setProgress(prev => {
      if (!prev.unlockedInstruments.includes(instrumentName)) {
        isNew = true;
        return { ...prev, unlockedInstruments: [...prev.unlockedInstruments, instrumentName] };
      }
      return prev;
    });
    return isNew;
  };

  const saveCustomProfile = (profileId: string, profileData: any) => {
    setProgress(prev => ({
      ...prev,
      customProfiles: {
        ...prev.customProfiles,
        [profileId]: profileData
      }
    }));
  };

  const unlockAllInstruments = () => {
    const allNames = [
      ...MASTER_INSTRUMENTS.map(i => i.name),
      ...FIELD_MISSION_INSTRUMENTS.map(i => i.name),
      KORLONG_INSTRUMENT.name,
    ];
    setProgress(prev => ({
      ...prev,
      xp: Math.max(prev.xp, 999),
      level: 5,
      unlockedInstruments: allNames,
      unlockedRegions: ['Western Visayas', 'Central Visayas', 'Eastern Visayas'],
      badges: [...new Set([...prev.badges, 'trailblazer', 'collector', 'legend'])],
    }));
    window.dispatchEvent(new Event('dev:unlockAll'));
  };

  const addPendingReview = (result: VerificationResult) => {
    setProgress(prev => ({
      ...prev,
      pendingReviews: [...(prev.pendingReviews ?? []), result],
    }));
  };

  const updateStreak = () => {
    const today = new Date().toISOString().split('T')[0];
    setProgress(prev => {
      if (prev.lastActiveDate === today) return prev; // Already played today
      
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      let newStreak = prev.currentStreak;
      
      if (prev.lastActiveDate === yesterday) {
        newStreak += 1; // Kept streak alive
      } else if (prev.lastActiveDate && prev.streakShields > 0) {
        newStreak += 1; // Saved by shield
        return { ...prev, lastActiveDate: today, currentStreak: newStreak, streakShields: prev.streakShields - 1 };
      } else {
        newStreak = 1; // Streak broken
      }
      return { ...prev, lastActiveDate: today, currentStreak: newStreak };
    });
  };

  const unlockRegion = (region: string) => {
    setProgress(prev => prev.unlockedRegions.includes(region) ? prev : { ...prev, unlockedRegions: [...prev.unlockedRegions, region] });
  };

  const updateShards = (amount: number) => {
    setProgress(prev => ({ ...prev, shards: Math.max(0, (prev.shards || 0) + amount) }));
  };

  const updateInventory = (itemId: string, amount: number) => {
    setProgress(prev => {
      const current = prev.inventory?.[itemId] || 0;
      const newAmount = Math.max(0, current + amount);
      return {
        ...prev,
        inventory: {
          ...prev.inventory,
          [itemId]: newAmount
        }
      };
    });
  };

  const awardBadge = (badge: string) => {
    setProgress(prev => prev.badges.includes(badge) ? prev : { ...prev, badges: [...prev.badges, badge] });
  };

  const useStreakShield = () => {
    let used = false;
    setProgress(prev => {
      if (prev.streakShields > 0) {
        used = true;
        return { ...prev, streakShields: prev.streakShields - 1 };
      }
      return prev;
    });
    return used;
  };

  const getClassroomLeaderboard = (): LeaderboardEntry[] => {
    const mockEntries: LeaderboardEntry[] = MOCK_FILIPINO_LEADERBOARD.map(entry => ({
      ...entry,
      xp: entry.baseXp,
      isPlayer: false,
    }));

    const playerEntry: LeaderboardEntry = {
      id: 'player_you',
      name: 'You (Expeditionist)',
      xp: progress.xp,
      isPlayer: true,
      title: progress.level >= 5 ? 'Master of Visayas' : progress.level >= 3 ? 'Visayan Explorer' : 'Cultural Novice',
      streak: progress.currentStreak,
      badgeId: progress.badges.length > 0 ? 15 : 1,
      region: progress.unlockedRegions[progress.unlockedRegions.length - 1] || 'Western Visayas',
      avatarBg: '#da2d46',
    };

    return [...mockEntries, playerEntry].sort((a, b) => b.xp - a.xp);
  };

  return (
    <ProgressContext.Provider value={{
      progress, addXP, recordScan, updateStreak,
      unlockRegion, awardBadge, useStreakShield, getClassroomLeaderboard, saveCustomProfile,
      unlockAllInstruments, addPendingReview, updateShards, updateInventory
    }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) throw new Error('useProgress must be used within ProgressProvider');
  return context;
}
