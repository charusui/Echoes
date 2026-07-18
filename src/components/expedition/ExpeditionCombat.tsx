import { useState, useEffect, useCallback, useMemo } from 'react';
import { Sword, Sparkles, Shield, Disc, Zap, ArrowLeft } from 'lucide-react';
import { audioEngine } from '../../services/audioSynth';
import { 
  EXPEDITION_INSTRUMENTS, 
  getTypeMultiplier,
  type HeroProfile, 
  type EnemyProfile, 
  type HarmonydexEntry,
  type TurnUnit
} from '../../types/expedition';
import { RhythmHighwayOverlay } from './RhythmHighwayOverlay';
import { SpellCastingOverlay } from './SpellCastingOverlay';
import { ParryQteOverlay } from './ParryQteOverlay';
import { AttuneCaptureOverlay } from './AttuneCaptureOverlay';

interface ExpeditionCombatProps {
  party: Record<string, HeroProfile>;
  enemyId: string;
  dex: Record<string, HarmonydexEntry>;
  onCombatResult: (result: { victory: boolean; xpGained: number; capturedEntry?: HarmonydexEntry }) => void;
  onFlee: () => void;
  onUpdateParty: React.Dispatch<React.SetStateAction<Record<string, HeroProfile>>>;
}

export function ExpeditionCombat({
  party,
  enemyId,
  dex,
  onCombatResult,
  onFlee,
  onUpdateParty,
}: ExpeditionCombatProps) {
  // Initialize enemy state
  const baseEnemyInst = EXPEDITION_INSTRUMENTS[enemyId] || EXPEDITION_INSTRUMENTS['corrupted_violin']!;
  const isBoss = baseEnemyInst.id === 'lord_cacophony';

  const [enemy, setEnemy] = useState<EnemyProfile>(() => ({
    id: baseEnemyInst.id,
    name: baseEnemyInst.name,
    type: baseEnemyInst.type,
    level: isBoss ? 10 : 3,
    hp: isBoss ? 1200 : 500,
    maxHp: isBoss ? 1200 : 500,
    stagger: 0,
    maxStagger: 100,
    staggered: false,
    baseDmg: isBoss ? 55 : 35,
    captured: baseEnemyInst.captured,
    preset: baseEnemyInst.audioPreset,
    isBoss,
  }));

  const [turnIndex, setTurnIndex] = useState(0);
  const [activeAction, setActiveAction] = useState<'none' | 'rhythm' | 'spell' | 'parry' | 'attune'>('none');
  const [parryStanceActive, setParryStanceActive] = useState(false);
  const [enemyFrame, setEnemyFrame] = useState(0);

  // Turn Queue: Alternate heroes and enemy
  const partyList = useMemo(() => Object.values(party), [party]);
  const turnQueue: TurnUnit[] = useMemo(() => [
    { isHero: true, unit: partyList[0]! },
    { isHero: false, unit: enemy },
    { isHero: true, unit: partyList[1] || partyList[0]! },
    { isHero: true, unit: partyList[2] || partyList[0]! },
  ], [partyList, enemy]);

  const currentTurnUnit = turnQueue[turnIndex % turnQueue.length] || turnQueue[0]!;
  const isHeroTurn = currentTurnUnit.isHero;
  const activeHero = isHeroTurn ? currentTurnUnit.unit as HeroProfile : partyList[0]!;

  // Animate enemy frames only when attacking ('parry') using frames 0-4 and reverse
  useEffect(() => {
    if (activeAction === 'parry') {
      const sequence = [0, 1, 2, 3, 4, 3, 2, 1, 0];
      let stepIdx = 0;
      setEnemyFrame(sequence[0]!);
      const timer = setInterval(() => {
        stepIdx = Math.min(sequence.length - 1, stepIdx + 1);
        setEnemyFrame(sequence[stepIdx]!);
      }, 130);
      return () => clearInterval(timer);
    } else {
      setEnemyFrame(0);
    }
  }, [activeAction]);

  // Play looping battle background music during combat
  useEffect(() => {
    const bgm = new Audio('/assets/expedition/battle_bg_music.mp3');
    bgm.loop = true;
    bgm.volume = 0.45;
    bgm.play().catch(() => {
      // Handle browser autoplay policy gracefully
    });

    return () => {
      bgm.pause();
      bgm.currentTime = 0;
    };
  }, []);

  const checkVictoryOrDefeat = useCallback((updatedEnemy: EnemyProfile, updatedParty: HeroProfile[]) => {
    if (updatedEnemy.hp <= 0) {
      audioEngine.playHitSFX('sick');
      onCombatResult({
        victory: true,
        xpGained: isBoss ? 1000 : 150,
      });
      return true;
    }

    const allHeroesDead = updatedParty.every(h => h.hp <= 0);
    if (allHeroesDead) {
      audioEngine.playHitSFX('miss');
      onCombatResult({
        victory: false,
        xpGained: 20,
      });
      return true;
    }

    return false;
  }, [isBoss, onCombatResult]);

  const advanceTurn = useCallback(() => {
    setTurnIndex(prev => {
      const nextIdx = (prev + 1) % turnQueue.length;
      const nextUnit = turnQueue[nextIdx]!;
      
      // If next is enemy, trigger enemy attack phase
      if (!nextUnit.isHero) {
        setTimeout(() => {
          setActiveAction('parry');
        }, 800);
      }
      return nextIdx;
    });
  }, [turnQueue]);

  // Command handlers
  const handleCommandAttack = () => {
    if (!isHeroTurn || activeHero.ap < 1) return;
    setActiveAction('rhythm');
  };

  const handleCommandSkill = () => {
    if (!isHeroTurn || activeHero.ap < 2) return;
    setActiveAction('spell');
  };

  const handleCommandAttune = () => {
    if (!isHeroTurn) return;
    if (enemy.hp > enemy.maxHp * 0.35 && !enemy.staggered) {
      audioEngine.playHitSFX('miss');
      return;
    }
    // Launch precision attune timing bar
    setActiveAction('attune');
  };

  const handleCommandDefend = () => {
    if (!isHeroTurn) return;
    // Boost AP and enter parry stance
    onUpdateParty(prev => {
      const h = prev[activeHero.id]!;
      return {
        ...prev,
        [activeHero.id]: {
          ...h,
          ap: Math.min(h.maxAp, h.ap + 2),
          shield: h.shield + 40,
        }
      };
    });
    setParryStanceActive(true);
    audioEngine.playHitSFX('good');
    advanceTurn();
  };

  // Complete Attune / Capture Minigame
  const handleAttuneComplete = useCallback((success: boolean) => {
    setActiveAction('none');
    
    // Deduct 1 AP
    onUpdateParty(prev => {
      const h = prev[activeHero.id]!;
      return {
        ...prev,
        [activeHero.id]: {
          ...h,
          ap: Math.max(0, h.ap - 1),
        }
      };
    });

    if (success) {
      audioEngine.playHitSFX('sick');
      onCombatResult({
        victory: true,
        xpGained: isBoss ? 1000 : 250,
        capturedEntry: baseEnemyInst,
      });
    } else {
      audioEngine.playHitSFX('miss');
      advanceTurn();
    }
  }, [activeHero.id, onUpdateParty, isBoss, baseEnemyInst, onCombatResult, advanceTurn]);

  // Complete Rhythm Highway Attack
  const handleRhythmComplete = useCallback((stats: { combo: number; hits: Record<string, number>; captureProgress?: number }, isCaptureMode?: boolean) => {
    setActiveAction('none');
    
    // Deduct 1 AP
    onUpdateParty(prev => {
      const h = prev[activeHero.id]!;
      return {
        ...prev,
        [activeHero.id]: {
          ...h,
          ap: Math.max(0, h.ap - 1),
        }
      };
    });

    if (isCaptureMode && stats.captureProgress && stats.captureProgress >= 100) {
      audioEngine.playHitSFX('sick');
      onCombatResult({
        victory: true,
        xpGained: isBoss ? 1000 : 250,
        capturedEntry: baseEnemyInst,
      });
      return;
    }

    // Calculate Damage
    const heroInst = dex[activeHero.equippedId] || dex['solaris_strat']!;
    const mult = getTypeMultiplier(heroInst.type, enemy.type);
    const baseDmg = heroInst.baseDmg * (1 + stats.combo * 0.05);
    const totalDmg = Math.round(baseDmg * mult * (enemy.staggered ? 1.8 : 1.0));

    // Calculate Stagger gain
    const staggerGain = Math.round((stats.hits.sick * 5 + stats.hits.good * 2) * (mult > 1 ? 1.5 : 1));

    setEnemy(prev => {
      const newHp = Math.max(0, prev.hp - totalDmg);
      const newStagger = Math.min(prev.maxStagger, prev.stagger + staggerGain);
      const isStaggered = newStagger >= prev.maxStagger;
      const updated = {
        ...prev,
        hp: newHp,
        stagger: isStaggered ? 0 : newStagger,
        staggered: isStaggered || prev.staggered,
      };

      if (checkVictoryOrDefeat(updated, partyList)) return updated;
      return updated;
    });

    audioEngine.playHitSFX('sick');
    setTimeout(advanceTurn, 600);
  }, [activeHero, dex, enemy, baseEnemyInst, isBoss, onCombatResult, checkVictoryOrDefeat, partyList, advanceTurn, onUpdateParty]);

  // Complete Overdrive Ultimate (Spell Casting)
  const handleSpellComplete = useCallback((success: boolean, completedPoints: number) => {
    setActiveAction('none');

    // Deduct 2 AP
    onUpdateParty(prev => {
      const h = prev[activeHero.id]!;
      return {
        ...prev,
        [activeHero.id]: {
          ...h,
          ap: Math.max(0, h.ap - 2),
        }
      };
    });

    if (!success || completedPoints < 15) {
      audioEngine.playHitSFX('miss');
      advanceTurn();
      return;
    }

    const heroInst = dex[activeHero.equippedId] || dex['solaris_strat']!;
    const mult = getTypeMultiplier(heroInst.type, enemy.type);
    const totalDmg = Math.round((heroInst.baseDmg * 2.8 + completedPoints * 8) * mult);

    setEnemy(prev => {
      const newHp = Math.max(0, prev.hp - totalDmg);
      const updated = {
        ...prev,
        hp: newHp,
        stagger: prev.maxStagger,
        staggered: true,
      };
      if (checkVictoryOrDefeat(updated, partyList)) return updated;
      return updated;
    });

    audioEngine.playHitSFX('sick');
    setTimeout(advanceTurn, 800);
  }, [activeHero, dex, enemy, onUpdateParty, checkVictoryOrDefeat, partyList, advanceTurn]);

  // Complete Enemy Attack Phase & Parry QTE
  const handleParryResult = useCallback((parried: boolean) => {
    setActiveAction('none');

    const rawDmg = Math.round(enemy.baseDmg * (enemy.staggered ? 0.5 : 1.0));
    const dmg = parried || parryStanceActive ? Math.round(rawDmg * 0.25) : rawDmg;

    if (parried) {
      audioEngine.playHitSFX('sick');
      setEnemy(prev => ({ ...prev, stagger: Math.min(prev.maxStagger, prev.stagger + 25) }));
    } else {
      audioEngine.playHitSFX('miss');
    }

    // Apply damage to active hero
    onUpdateParty(prev => {
      const target = prev[activeHero.id] || partyList[0]!;
      const shieldLeft = Math.max(0, target.shield - dmg);
      const overflow = Math.max(0, dmg - target.shield);
      const newHp = Math.max(0, target.hp - overflow);

      const updatedPartyMap = {
        ...prev,
        [target.id]: {
          ...target,
          shield: shieldLeft,
          hp: newHp,
        }
      };

      checkVictoryOrDefeat(enemy, Object.values(updatedPartyMap));
      return updatedPartyMap;
    });

    setParryStanceActive(false);
    setTimeout(advanceTurn, 600);
  }, [enemy, parryStanceActive, activeHero, onUpdateParty, partyList, checkVictoryOrDefeat, advanceTurn]);

  return (
    <div 
      className="flex-1 flex flex-col justify-between p-4 lg:p-6 relative overflow-hidden bg-[#151828] bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(rgba(15, 12, 12, 0.35), rgba(15, 12, 12, 0.5)), url('/assets/expedition/battle_bg.png')`,
      }}
    >
      {/* 2D Flat Ground Floor stretching edge-to-edge from absolute left/right to absolute bottom */}
      <div 
        className="absolute inset-x-0 bottom-0 top-[48%] sm:top-[54%] bg-repeat-x bg-bottom pointer-events-none z-0 opacity-95 drop-shadow-[0_-8px_16px_rgba(0,0,0,0.95)]"
        style={{
          backgroundImage: `url('/assets/expedition/battle_ground.png')`,
          backgroundSize: 'auto 100%',
        }}
      />

      {/* Top Combat HUD: Elden Ring Style Boss Health Bar & Floating Turn Queue */}
      <div className="relative w-full flex justify-center pt-2 z-20">
        {/* Top Middle Boss Health Bar (No Card, Just Name & Bar) */}
        <div className="w-full max-w-xl flex flex-col gap-1 px-4">
          <div className="flex items-baseline justify-between font-orbitron tracking-wide px-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            <span className="font-black text-sm sm:text-base text-white uppercase tracking-wider">
              {enemy.name}
            </span>
            <span className="text-2xs sm:text-xs text-[#facc15] font-bold">
              LV. {enemy.level} {enemy.isBoss && 'BOSS'} — {enemy.hp}/{enemy.maxHp} HP
            </span>
          </div>

          {/* Main Elden Ring HP Bar */}
          <div className="w-full h-3.5 sm:h-4 bg-[#0f0c0c]/90 border-[2px] border-slate-700 shadow-[0_4px_16px_rgba(0,0,0,0.9)] overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#da2d46] to-[#ff4b68] transition-all duration-300"
              style={{ width: `${Math.round((enemy.hp / enemy.maxHp) * 100)}%` }}
            />
          </div>

          {/* Sub Stagger/Break Bar */}
          <div className="w-full h-1.5 bg-[#0f0c0c]/80 border border-slate-800 overflow-hidden mt-0.5">
            <div 
              className="h-full bg-[#facc15] transition-all duration-300"
              style={{ width: `${Math.round((enemy.stagger / enemy.maxStagger) * 100)}%` }}
            />
          </div>
        </div>

        {/* Turn Order Queue (Floating Top-Right) */}
        <div className="absolute right-4 top-2 hidden lg:flex items-center gap-2 bg-[#1e2238]/90 border-[3px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] px-3 py-1.5 -skew-x-2 backdrop-blur-sm">
          <span className="font-orbitron font-black text-2xs text-[#facc15] uppercase border-r border-slate-600 pr-2">
            TURN
          </span>
          <div className="flex items-center gap-1.5">
            {turnQueue.map((unit, idx) => {
              const isCurrent = idx === turnIndex % turnQueue.length;
              return (
                <div 
                  key={idx}
                  className={`px-2 py-0.5 border border-[#0f0c0c] font-orbitron font-bold text-2xs flex items-center gap-1 transition-all ${
                    isCurrent 
                      ? 'bg-[#facc15] text-[#0f0c0c] scale-105 shadow-[1px_1px_0px_0px_#0f0c0c]' 
                      : unit.isHero ? 'bg-[#2a2d43] text-white' : 'bg-[#da2d46] text-white'
                  }`}
                >
                  <span>{unit.isHero ? (unit.unit as HeroProfile).avatar : '👹'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Center Stage Arena: Hero Avatars & Enemy Sprite */}
      <div className="flex-1 flex items-center justify-between px-6 sm:px-12 py-8 relative z-0">
        {/* Left: Active Party Avatars */}
        <div className="flex flex-col gap-4">
          {partyList.map((hero) => {
            const isTurn = isHeroTurn && activeHero.id === hero.id;
            const inst = dex[hero.equippedId] || dex['solaris_strat']!;
            return (
              <div 
                key={hero.id}
                className={`flex items-center gap-3 p-3 border-[4px] border-[#0f0c0c] transition-all -skew-x-6 ${
                  isTurn ? 'bg-[#facc15] text-[#0f0c0c] scale-105 shadow-[6px_6px_0px_0px_#0f0c0c]' : 'bg-[#1e2238] text-white opacity-80'
                }`}
              >
                <div className="text-3xl bg-[#0f0c0c] p-2 border-[2px] border-[#0f0c0c]">
                  {hero.avatar}
                </div>
                <div className="flex flex-col">
                  <div className="font-orbitron font-black text-sm flex items-center gap-2">
                    <span>{hero.name}</span>
                    <span className="text-xs">{inst.icon}</span>
                  </div>
                  <div className="flex items-center gap-2 text-2xs font-bold font-orbitron">
                    <span>HP: {hero.hp}/{hero.maxHp}</span>
                    <span>AP: {hero.ap}/{hero.maxAp}</span>
                  </div>
                  {/* AP Dots */}
                  <div className="flex gap-1 mt-1">
                    {Array.from({ length: hero.maxAp }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-2.5 h-2.5 border border-[#0f0c0c] ${
                          i < hero.ap ? (isTurn ? 'bg-[#da2d46]' : 'bg-[#38bdf8]') : 'bg-slate-700'
                        }`} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center: Overlays (Rhythm Highway, Spell Casting, Parry QTE) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="pointer-events-auto w-full max-w-2xl">
            {activeAction === 'rhythm' && (
              <RhythmHighwayOverlay 
                mode="attack"
                preset={enemy.preset}
                isCapture={enemy.hp <= enemy.maxHp * 0.35 || enemy.staggered}
                onComplete={(stats) => handleRhythmComplete(stats, enemy.hp <= enemy.maxHp * 0.35 || enemy.staggered)}
              />
            )}
            {activeAction === 'spell' && (
              <SpellCastingOverlay 
                hero={activeHero}
                instrument={dex[activeHero.equippedId] || dex['solaris_strat']!}
                onComplete={handleSpellComplete}
              />
            )}
            {activeAction === 'parry' && (
              <ParryQteOverlay 
                enemyName={enemy.name}
                onParry={handleParryResult}
              />
            )}
            {activeAction === 'attune' && (
              <AttuneCaptureOverlay 
                enemy={enemy}
                onComplete={handleAttuneComplete}
              />
            )}
          </div>
        </div>

        {/* Right: Enemy Sprite Frame */}
        <div className="flex flex-col items-center gap-3 -translate-x-12 sm:-translate-x-20">
          <div className={`relative transition-transform flex items-center justify-center ${
            enemy.staggered ? 'animate-bounce' : ''
          }`}>
            <img 
              src={`/assets/expedition/enemy_frame_${enemyFrame}.png`}
              alt={enemy.name}
              className="w-56 sm:w-72 h-56 sm:h-72 object-contain drop-shadow-[0px_12px_24px_rgba(0,0,0,0.8)] scale-x-[-1]"
              onError={(e) => {
                // Fallback icon if frame fails to load
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            {enemy.staggered && (
              <div className="absolute inset-0 bg-[#facc15]/30 rounded-full flex items-center justify-center font-orbitron font-black text-2xl text-[#0f0c0c] drop-shadow-[2px_2px_0px_#ffffff]">
                ⚡ STAGGERED!
              </div>
            )}
          </div>
          <span className="font-orbitron font-black text-sm uppercase tracking-wider text-[#da2d46] bg-[#0f0c0c] px-4 py-1 border-[2px] border-[#da2d46] shadow-[3px_3px_0px_0px_#0f0c0c] -skew-x-6">
            {enemy.name}
          </span>
        </div>
      </div>

      {/* Bottom Combat HUD: Action Command Panel */}
      <div className="z-20 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#1e2238] border-[4px] border-[#0f0c0c] shadow-[0px_-4px_0px_0px_#0f0c0c] p-4">
        {/* Active Hero Status Badge */}
        <div className="flex items-center gap-3 px-4 py-2 bg-[#0f0c0c] text-[#facc15] border-[3px] border-[#facc15] font-orbitron font-black text-sm uppercase tracking-wider -skew-x-6">
          <Zap className="w-4 h-4 text-[#da2d46] fill-current animate-pulse" />
          <span>ACTIVE TURN: {isHeroTurn ? activeHero.name.toUpperCase() : "ENEMY ATTACK PHASE"}</span>
        </div>

        {/* Command Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={handleCommandAttack}
            disabled={!isHeroTurn || activeHero.ap < 1 || activeAction !== 'none'}
            className="flex-1 sm:flex-initial px-4 py-3 bg-[#da2d46] text-white border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-[#ff3b56] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2 active:translate-y-0.5 active:shadow-none"
          >
            <Sword className="w-4 h-4 fill-current" />
            <div className="flex flex-col text-left">
              <span>RHYTHM ATTACK</span>
              <span className="text-2xs font-bold opacity-80">(1 AP) Note Highway</span>
            </div>
          </button>

          <button
            onClick={handleCommandSkill}
            disabled={!isHeroTurn || activeHero.ap < 2 || activeAction !== 'none'}
            className="flex-1 sm:flex-initial px-4 py-3 bg-[#facc15] text-[#0f0c0c] border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-[#ffdf3d] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2 active:translate-y-0.5 active:shadow-none"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <div className="flex flex-col text-left">
              <span>OVERDRIVE ULTIMATE</span>
              <span className="text-2xs font-bold opacity-80">(2 AP) Magic Circle</span>
            </div>
          </button>

          <button
            onClick={handleCommandAttune}
            disabled={!isHeroTurn || activeAction !== 'none'}
            className="flex-1 sm:flex-initial px-4 py-3 bg-[#38bdf8] text-[#0f0c0c] border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-[#5cd0ff] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2 active:translate-y-0.5 active:shadow-none"
          >
            <Disc className="w-4 h-4 fill-current" />
            <div className="flex flex-col text-left">
              <span>ATTUNE / CAPTURE</span>
              <span className="text-2xs font-bold opacity-80">(HP &lt; 35%) Seal Instrument</span>
            </div>
          </button>

          <button
            onClick={handleCommandDefend}
            disabled={!isHeroTurn || activeAction !== 'none'}
            className="flex-1 sm:flex-initial px-4 py-3 bg-[#4ade80] text-[#0f0c0c] border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-[#6bee9c] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2 active:translate-y-0.5 active:shadow-none"
          >
            <Shield className="w-4 h-4 fill-current" />
            <div className="flex flex-col text-left">
              <span>PARRY STANCE</span>
              <span className="text-2xs font-bold opacity-80">(+2 AP) Block &amp; Counter</span>
            </div>
          </button>

          <button
            onClick={onFlee}
            className="flex-1 sm:flex-initial px-4 py-3 bg-[#2a2d43] text-white border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-[#383d5a] transition-all flex items-center gap-2 active:translate-y-0.5 active:shadow-none"
          >
            <ArrowLeft className="w-4 h-4" />
            <div className="flex flex-col text-left">
              <span>RETREAT</span>
              <span className="text-2xs font-bold opacity-80">Flee Battle</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
