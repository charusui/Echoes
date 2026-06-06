import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProgress } from '../types';

interface ProgressContextType {
  progress: UserProgress;
  addXP: (amount: number, source: string) => void;
  recordScan: (instrumentName: string) => boolean; // returns true if new discovery
  updateStreak: () => void;
  unlockRegion: (region: string) => void;
  awardBadge: (badge: string) => void;
  useStreakShield: () => boolean;
  getClassroomLeaderboard: () => { name: string; xp: number; isPlayer: boolean }[];
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
};

const ProgressContext = createContext<ProgressContextType | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem('filinstruments_progress');
    return saved ? JSON.parse(saved) : DEFAULT_PROGRESS;
  });

  useEffect(() => {
    localStorage.setItem('filinstruments_progress', JSON.stringify(progress));
  }, [progress]);

  const addXP = (amount: number, source: string) => {
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

  const getClassroomLeaderboard = () => {
    // Mocked leaderboard mixing static data with the real player's XP
    return [
      { name: 'Maria D.', xp: Math.max(progress.xp + 90, 480), isPlayer: false },
      { name: 'Juan S.', xp: Math.max(progress.xp + 20, 410), isPlayer: false },
      { name: 'You', xp: progress.xp, isPlayer: true },
      { name: 'Ana B.', xp: Math.max(progress.xp - 30, 200), isPlayer: false },
    ].sort((a, b) => b.xp - a.xp);
  };

  return (
    <ProgressContext.Provider value={{
      progress, addXP, recordScan, updateStreak, unlockRegion, awardBadge, useStreakShield, getClassroomLeaderboard
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
