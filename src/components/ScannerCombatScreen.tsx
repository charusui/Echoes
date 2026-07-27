import React, { useMemo } from 'react';
import { ExpeditionCombat } from './expedition/ExpeditionCombat';
import { type ActiveInstrumentProfile } from '../types';
import { type HeroProfile, type HarmonydexEntry, type EnemyProfile } from '../types/expedition';

interface ScannerCombatScreenProps {
  profile: ActiveInstrumentProfile;
  party: Record<string, HeroProfile>;
  setParty: React.Dispatch<React.SetStateAction<Record<string, HeroProfile>>>;
  dex: Record<string, HarmonydexEntry>;
  onCombatResult: (result: { victory: boolean; xpGained: number }) => void;
  onFlee: () => void;
}

export function ScannerCombatScreen({ 
  profile, 
  party, 
  setParty, 
  dex, 
  onCombatResult, 
  onFlee 
}: ScannerCombatScreenProps) {

  // Dynamically generate the enemy based on the scanned instrument
  const customEnemies = useMemo<EnemyProfile[]>(() => {
    return [{
      id: `bandit_custom_${Date.now()}`,
      name: `${profile.instrument.name} Holder`,
      type: profile.instrument.category === 'string' ? 'string' : profile.instrument.category === 'percussion' ? 'percussion' : 'woodwind',
      level: 5,
      hp: 600,
      maxHp: 600,
      stagger: 0,
      maxStagger: 100,
      staggered: false,
      baseDmg: 30,
      captured: false,
      preset: 'synth-lead',
      isBoss: false,
    }];
  }, [profile]);

  return (
    <div className="absolute inset-0 z-[100] bg-black flex flex-col">
      <ExpeditionCombat
        party={party}
        enemyId={customEnemies[0].id} // not strictly used since customEnemies is provided, but required by props
        customEnemies={customEnemies}
        dex={dex}
        onCombatResult={onCombatResult}
        onFlee={onFlee}
        onUpdateParty={setParty}
      />
    </div>
  );
}
