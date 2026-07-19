import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Sword, Sparkles, Shield, Disc, Zap, ArrowLeft, Users, ChevronLeft, ChevronRight } from 'lucide-react';
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

interface DamagePopup {
  id: number;
  text: string;
  isEnemy: boolean;
  color: string;
}

export function ExpeditionCombat({
  party,
  enemyId,
  dex,
  onCombatResult,
  onFlee,
  onUpdateParty,
}: ExpeditionCombatProps) {
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
    baseDmg: isBoss ? 45 : 25, 
    captured: baseEnemyInst.captured,
    preset: baseEnemyInst.audioPreset,
    isBoss,
  }));

  const [turnIndex, setTurnIndex] = useState(0);
  const [activeAction, setActiveAction] = useState<'none' | 'rhythm' | 'spell' | 'parry' | 'attune'>('none');
  const [parryStanceActive, setParryStanceActive] = useState(false);
  const [enemyFrame, setEnemyFrame] = useState(0);
  const [isPartyDrawerOpen, setIsPartyDrawerOpen] = useState(false);
  
  // Game Feel: State tracking for damage popups and ending delay
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [isEndingBattle, setIsEndingBattle] = useState(false);

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

  const triggerDamagePopup = useCallback((text: string, isEnemy: boolean, color: string) => {
    const id = Date.now() + Math.random();
    setDamagePopups(prev => [...prev, { id, text, isEnemy, color }]);
    setTimeout(() => {
      setDamagePopups(prev => prev.filter(p => p.id !== id));
    }, 1200);
  }, []);

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

  useEffect(() => {
    const bgm = new Audio('/assets/expedition/battle_bg_music.mp3');
    bgm.loop = true;
    bgm.volume = 0.45;
    bgm.play().catch(() => {});
    return () => {
      bgm.pause();
      bgm.currentTime = 0;
    };
  }, []);

  const checkPostTurnStates = useCallback((currentEnemyHp: number, currentParty: HeroProfile[]) => {
    if (currentEnemyHp <= 0) {
      setIsEndingBattle(true);
      audioEngine.playHitSFX('sick');
      setTimeout(() => {
        onCombatResult({ victory: true, xpGained: isBoss ? 1000 : 150 });
      }, 1500); 
      return true;
    }

    const allHeroesDead = currentParty.every(h => h.hp <= 0);
    if (allHeroesDead) {
      setIsEndingBattle(true);
      audioEngine.playHitSFX('miss');
      setTimeout(() => {
        onCombatResult({ victory: false, xpGained: 20 });
      }, 1500);
      return true;
    }

    return false;
  }, [isBoss, onCombatResult]);

  const advanceTurn = useCallback(() => {
    if (finishedRef.current || isEndingBattle) return;
    setTurnIndex(prev => {
      const nextIdx = (prev + 1) % turnQueue.length;
      const nextUnit = turnQueue[nextIdx]!;
      if (!nextUnit.isHero) {
        setTimeout(() => {
          if (!finishedRef.current && !isEndingBattle) setActiveAction('parry');
        }, 800);
      }
      return nextIdx;
    });
  }, [turnQueue, isEndingBattle]);

  const handleCommandAttack = () => { if (!isHeroTurn || activeHero.ap < 1 || isEndingBattle) return; setActiveAction('rhythm'); };
  const handleCommandSkill = () => { if (!isHeroTurn || activeHero.ap < 2 || isEndingBattle) return; setActiveAction('spell'); };
  
  const handleCommandAttune = () => {
    if (!isHeroTurn || isEndingBattle) return;
    if (enemy.hp > enemy.maxHp * 0.35 && !enemy.staggered) {
      audioEngine.playHitSFX('miss');
      return;
    }
    setActiveAction('attune');
  };

  const handleCommandDefend = () => {
    if (!isHeroTurn || isEndingBattle) return;
    onUpdateParty(prev => {
      const h = prev[activeHero.id]!;
      return {
        ...prev,
        [activeHero.id]: { ...h, ap: Math.min(h.maxAp, h.ap + 2), shield: h.shield + 40 }
      };
    });
    setParryStanceActive(true);
    audioEngine.playHitSFX('good');
    advanceTurn();
  };

  const handleAttuneComplete = useCallback((success: boolean) => {
    setActiveAction('none');
    let updatedPartyList: HeroProfile[] = [];

    onUpdateParty(prev => {
      const h = prev[activeHero.id]!;
      const nextParty = { ...prev, [activeHero.id]: { ...h, ap: Math.max(0, h.ap - 1) } };
      updatedPartyList = Object.values(nextParty);
      return nextParty;
    });

    if (success) {
      setIsEndingBattle(true);
      audioEngine.playHitSFX('sick');
      setTimeout(() => {
        onCombatResult({ victory: true, xpGained: isBoss ? 1000 : 250, capturedEntry: baseEnemyInst });
      }, 1500);
    } else {
      audioEngine.playHitSFX('miss');
      setTimeout(() => checkPostTurnStates(enemy.hp, updatedPartyList) || advanceTurn(), 100);
    }
  }, [activeHero.id, onUpdateParty, isBoss, baseEnemyInst, onCombatResult, advanceTurn, enemy.hp, checkPostTurnStates]);

  const handleRhythmComplete = useCallback((stats: { combo: number; hits: Record<string, number>; captureProgress?: number }, isCaptureMode?: boolean) => {
    setActiveAction('none');
    let updatedPartyList: HeroProfile[] = [];

    onUpdateParty(prev => {
      const h = prev[activeHero.id]!;
      const nextParty = { ...prev, [activeHero.id]: { ...h, ap: Math.max(0, h.ap - 1) } };
      updatedPartyList = Object.values(nextParty);
      return nextParty;
    });

    if (isCaptureMode && stats.captureProgress && stats.captureProgress >= 100) {
      setIsEndingBattle(true);
      audioEngine.playHitSFX('sick');
      setTimeout(() => {
        onCombatResult({ victory: true, xpGained: isBoss ? 1000 : 250, capturedEntry: baseEnemyInst });
      }, 1500);
      return;
    }

    const heroInst = dex[activeHero.equippedId] || dex['solaris_strat']!;
    const mult = getTypeMultiplier(heroInst.type, enemy.type);
    const baseDmg = heroInst.baseDmg * (1 + stats.combo * 0.05);
    const totalDmg = Math.round(baseDmg * mult * (enemy.staggered ? 1.8 : 1.0));
    const staggerGain = Math.round((stats.hits.sick * 5 + stats.hits.good * 2) * (mult > 1 ? 1.5 : 1));

    triggerDamagePopup(`-${totalDmg}`, true, mult > 1 ? '#facc15' : '#ffffff');

    let targetHp = 0;
    setEnemy(prev => {
      const nextHp = Math.max(0, prev.hp - totalDmg);
      targetHp = nextHp;
      const nextStagger = Math.min(prev.maxStagger, prev.stagger + staggerGain);
      const isStaggered = nextStagger >= prev.maxStagger;
      return { ...prev, hp: nextHp, stagger: isStaggered ? 0 : nextStagger, staggered: isStaggered || prev.staggered };
    });

    setTimeout(() => {
      if (!checkPostTurnStates(targetHp, updatedPartyList)) {
        advanceTurn();
      }
    }, 1000);
  }, [activeHero, dex, enemy, baseEnemyInst, isBoss, onCombatResult, checkPostTurnStates, advanceTurn, onUpdateParty, triggerDamagePopup]);

  const handleSpellComplete = useCallback((success: boolean, completedPoints: number) => {
    setActiveAction('none');
    let updatedPartyList: HeroProfile[] = [];

    onUpdateParty(prev => {
      const h = prev[activeHero.id]!;
      const nextParty = { ...prev, [activeHero.id]: { ...h, ap: Math.max(0, h.ap - 2) } };
      updatedPartyList = Object.values(nextParty);
      return nextParty;
    });

    if (!success || completedPoints < 10) {
      audioEngine.playHitSFX('miss');
      setTimeout(() => checkPostTurnStates(enemy.hp, updatedPartyList) || advanceTurn(), 100);
      return;
    }

    const heroInst = dex[activeHero.equippedId] || dex['solaris_strat']!;
    const mult = getTypeMultiplier(heroInst.type, enemy.type);
    
    // NERFED OVERDRIVE DAMAGE (Fixed the one-shot bug)
    const totalDmg = Math.round((heroInst.baseDmg * 1.2 + completedPoints * 3) * mult);

    triggerDamagePopup(`-${totalDmg}`, true, '#da2d46');

    let targetHp = 0;
    setEnemy(prev => {
      const nextHp = Math.max(0, prev.hp - totalDmg);
      targetHp = nextHp;
      return { ...prev, hp: nextHp, stagger: prev.maxStagger, staggered: true };
    });

    setTimeout(() => {
      if (!checkPostTurnStates(targetHp, updatedPartyList)) {
        advanceTurn();
      }
    }, 1000);
  }, [activeHero, dex, enemy, onUpdateParty, checkPostTurnStates, advanceTurn, triggerDamagePopup]);

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

    triggerDamagePopup(`-${dmg}`, false, '#da2d46');

    onUpdateParty(prev => {
      const target = prev[activeHero.id] || partyList[0]!;
      const shieldLeft = Math.max(0, target.shield - dmg);
      const overflow = Math.max(0, dmg - target.shield);
      const newHp = Math.max(0, target.hp - overflow);
      const updatedPartyMap = { ...prev, [target.id]: { ...target, shield: shieldLeft, hp: newHp } };

      setTimeout(() => {
        checkPostTurnStates(enemy.hp, Object.values(updatedPartyMap));
      }, 1000);

      return updatedPartyMap;
    });

    setParryStanceActive(false);
    setTimeout(() => {
      if (enemy.hp > 0 && !isEndingBattle) advanceTurn();
    }, 1200);
  }, [enemy, parryStanceActive, activeHero, onUpdateParty, partyList, checkPostTurnStates, advanceTurn, triggerDamagePopup, isEndingBattle]);

  const finishedRef = useRef(false);

  return (
    <div 
      className="flex-1 flex flex-col justify-between p-2 sm:p-4 lg:p-6 relative overflow-hidden bg-[#151828] bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(rgba(15, 12, 12, 0.35), rgba(15, 12, 12, 0.5)), url('/assets/expedition/battle_bg.png')`,
      }}
    >
      <style>{`
        @keyframes damagePopupFloat {
          0% { opacity: 0; transform: translate3d(-50%, 0, 0) scale(0.5); }
          15% { opacity: 1; transform: translate3d(-50%, -30px, 0) scale(1.3); }
          80% { opacity: 1; transform: translate3d(-50%, -50px, 0) scale(1); }
          100% { opacity: 0; transform: translate3d(-50%, -75px, 0) scale(0.8); }
        }
        .damage-popup-animate {
          animation: damagePopupFloat 1.1s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
        }
      `}</style>

      {/* 2D Flat Ground Floor */}
      <div 
        className="absolute inset-x-0 bottom-0 top-[48%] sm:top-[54%] bg-repeat-x bg-bottom pointer-events-none z-0 opacity-95 drop-shadow-[0_-8px_16px_rgba(0,0,0,0.95)]"
        style={{
          backgroundImage: `url('/assets/expedition/battle_ground.png')`,
          backgroundSize: 'auto 100%',
        }}
      />

      {/* Floating Damage Text Render Node */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        {damagePopups.map(p => (
          <div
            key={p.id}
            className="absolute font-orbitron font-black damage-popup-animate tracking-wider text-xl sm:text-3xl drop-shadow-[3px_3px_0px_#0f0c0c]"
            style={{
              left: p.isEnemy ? '75%' : '25%',
              top: p.isEnemy ? '50%' : '65%',
              color: p.color,
            }}
          >
            {p.text}
          </div>
        ))}
      </div>

      {/* Top Combat HUD: Boss Health Bar & Floating Turn Queue */}
      <div className="relative w-full flex flex-col pt-2 sm:pt-2 z-30 pointer-events-none">
        
        {/* Boss HP container placed natively in flow */}
        <div className="w-full max-w-xl mx-auto flex flex-col gap-1 px-2 sm:px-4 pointer-events-auto">
          <div className="flex flex-col sm:flex-row items-center sm:items-baseline justify-between font-orbitron tracking-wide px-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] gap-0.5 sm:gap-0">
            <span className="font-black text-sm sm:text-base text-white uppercase tracking-wider text-center sm:text-left leading-tight">
              {enemy.name}
            </span>
            <span className="text-[10px] sm:text-xs text-[#facc15] font-bold text-center sm:text-right">
              LV. {enemy.level} {enemy.isBoss && 'BOSS'} — {enemy.hp}/{enemy.maxHp} HP
            </span>
          </div>

          <div className="w-full h-3 sm:h-4 bg-[#0f0c0c]/90 border-[2px] border-slate-700 shadow-[0_4px_16px_rgba(0,0,0,0.9)] overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#da2d46] to-[#ff4b68] transition-all duration-300"
              style={{ width: `${Math.round((enemy.hp / enemy.maxHp) * 100)}%` }}
            />
          </div>

          <div className="w-full h-1 sm:h-1.5 bg-[#0f0c0c]/80 border border-slate-800 overflow-hidden mt-0.5">
            <div 
              className="h-full bg-[#facc15] transition-all duration-300"
              style={{ width: `${Math.round((enemy.stagger / enemy.maxStagger) * 100)}%` }}
            />
          </div>
        </div>

        {/* Turn Order Queue */}
        <div className="self-end mr-2 mt-1.5 sm:absolute sm:right-4 sm:top-2 sm:mt-0 sm:mr-0 pointer-events-auto flex items-center gap-1 sm:gap-2 bg-[#1e2238]/90 border-[2px] sm:border-[3px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] px-2 sm:px-3 py-1 sm:py-1.5 -skew-x-2 backdrop-blur-sm scale-[0.85] sm:scale-100 origin-top-right">
          <span className="font-orbitron font-black text-[9px] sm:text-2xs text-[#facc15] uppercase border-r border-slate-600 pr-1.5 sm:pr-2">
            TURN
          </span>
          <div className="flex items-center gap-1 sm:gap-1.5">
            {turnQueue.map((unit, idx) => {
              const isCurrent = idx === turnIndex % turnQueue.length;
              return (
                <div 
                  key={idx}
                  className={`px-1.5 sm:px-2 py-0.5 border border-[#0f0c0c] font-orbitron font-bold text-[10px] sm:text-2xs flex items-center gap-1 transition-all ${
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

      {/* Center Stage Arena: Absolute Positioned 2D World */}
      <div className="flex-1 w-full relative z-0">
        
        {/* LEFT SIDE: Party List Drawer */}
        <div 
          className={`absolute top-1/4 sm:top-1/3 left-0 z-40 flex items-center transition-transform duration-300 ease-in-out ${
            isPartyDrawerOpen ? 'translate-x-0' : '-translate-x-[calc(100%-2.5rem)]'
          }`}
        >
          {/* Drawer Content */}
          <div className="flex flex-col gap-1.5 sm:gap-2 p-2 sm:p-3 bg-[#151828]/95 backdrop-blur-md border-y-[3px] border-r-[3px] border-[#0f0c0c] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.4)] w-[220px] sm:w-[260px] rounded-r-xl">
            {partyList.map((hero) => {
              const isTurn = isHeroTurn && activeHero.id === hero.id;
              const inst = dex[hero.equippedId] || dex['solaris_strat']!;
              return (
                <div 
                  key={hero.id}
                  className={`flex items-center gap-2 p-1.5 sm:p-2 border-[2px] sm:border-[3px] border-[#0f0c0c] transition-all -skew-x-3 ${
                    isTurn ? 'bg-[#facc15] text-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c]' : 'bg-[#1e2238]/90 text-white opacity-90'
                  }`}
                >
                  <div className="text-lg sm:text-2xl bg-[#0f0c0c] p-1 sm:p-1.5 border-[2px] border-[#0f0c0c]">
                    {hero.avatar}
                  </div>
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <div className="font-orbitron font-black text-[10px] sm:text-xs flex items-center gap-1 sm:gap-2">
                      <span className="truncate">{hero.name}</span>
                      <span className="text-[8px] sm:text-[10px] shrink-0">{inst.icon}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[8px] sm:text-[9px] font-bold font-orbitron">
                      <span className="truncate">HP: {hero.hp}/{hero.maxHp}</span>
                      <span className="truncate">AP: {hero.ap}/{hero.maxAp}</span>
                    </div>
                    <div className="flex gap-0.5 mt-0.5">
                      {Array.from({ length: hero.maxAp }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-1.5 h-1.5 sm:w-2 sm:h-2 border border-[#0f0c0c] ${
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

          {/* Drawer Toggle Tab */}
          <button
            onClick={() => setIsPartyDrawerOpen(!isPartyDrawerOpen)}
            className={`w-10 h-16 sm:h-20 flex flex-col items-center justify-center border-y-[3px] border-r-[3px] border-[#0f0c0c] rounded-r-lg shadow-[4px_4px_0px_0px_#0f0c0c] transition-all
              ${isPartyDrawerOpen ? 'bg-[#2a2d43] text-white hover:bg-[#383d5a]' : 'bg-[#facc15] text-[#0f0c0c] hover:bg-[#ffdf3d]'}
              ${!isPartyDrawerOpen && isHeroTurn ? 'animate-pulse' : ''}
            `}
          >
            {isPartyDrawerOpen ? (
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 font-black" />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 font-black" />
              </div>
            )}
          </button>
        </div>

        {/* Center: Overlays (Mini-games) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
          <div className="pointer-events-auto w-full max-w-2xl px-2">
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

        {/* Right (Center-Right on Mobile): Enemy Sprite Frame Planted on Ground */}
        <div className="absolute bottom-[20%] sm:bottom-[15%] right-4 sm:right-[15%] flex flex-col items-center gap-1 sm:gap-3 z-0 pointer-events-none">
          <div className={`relative transition-all duration-300 origin-bottom flex items-center justify-center ${
            enemy.hp <= 0 ? 'opacity-30 scale-75 rotate-12 filter saturate-0 translate-y-4' : enemy.staggered ? 'animate-bounce' : ''
          }`}>
            <img 
              src={`/assets/expedition/enemy_frame_${enemyFrame}.png`}
              alt={enemy.name}
              className="w-40 h-40 sm:w-72 sm:h-72 object-contain drop-shadow-[0px_8px_16px_rgba(0,0,0,0.8)] sm:drop-shadow-[0px_12px_24px_rgba(0,0,0,0.8)] scale-x-[-1]"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            {enemy.hp <= 0 && <div className="absolute inset-0 bg-red-600/20 mix-blend-color-burn rounded-full animate-ping" />}
            {enemy.staggered && enemy.hp > 0 && (
              <div className="absolute inset-0 bg-[#facc15]/30 rounded-full flex items-center justify-center font-orbitron font-black text-lg sm:text-2xl text-[#0f0c0c] drop-shadow-[2px_2px_0px_#ffffff]">
                ⚡ STAGGERED!
              </div>
            )}
          </div>
          <span className="font-orbitron font-black text-[10px] sm:text-sm uppercase tracking-wider text-[#da2d46] bg-[#0f0c0c] px-3 sm:px-4 py-0.5 sm:py-1 border-[2px] border-[#da2d46] shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[3px_3px_0px_0px_#0f0c0c] -skew-x-6 truncate max-w-[150px] sm:max-w-none text-center">
            {enemy.name}
          </span>
        </div>
      </div>

      {/* Bottom Combat HUD: Responsive Action Command Grid */}
      <div className="z-30 flex flex-col items-center justify-between gap-3 sm:gap-4 bg-[#1e2238] border-[3px] sm:border-[4px] border-[#0f0c0c] shadow-[0px_-4px_0px_0px_#0f0c0c] p-3 sm:p-4">
        
        {/* Active Hero Status Badge */}
        <div className="w-full sm:w-auto flex items-center justify-center gap-2 sm:gap-3 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#0f0c0c] text-[#facc15] border-[2px] sm:border-[3px] border-[#facc15] font-orbitron font-black text-[10px] sm:text-sm uppercase tracking-wider -skew-x-6">
          <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#da2d46] fill-current animate-pulse" />
          <span className="truncate">ACTIVE TURN: {isHeroTurn ? activeHero.name.toUpperCase() : "ENEMY ATTACK PHASE"}</span>
        </div>

        {/* Command Grid: 2x2 on Mobile, Flex on Desktop */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={handleCommandAttack}
            disabled={!isHeroTurn || activeHero.ap < 1 || activeAction !== 'none' || isEndingBattle}
            className="col-span-1 px-2 py-2 sm:px-4 sm:py-3 bg-[#da2d46] text-white border-[3px] sm:border-[4px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-[9px] sm:text-sm uppercase -skew-x-6 hover:bg-[#ff3b56] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-1 sm:gap-2 active:translate-y-0.5 active:shadow-none"
          >
            <Sword className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current shrink-0 hidden xs:block" />
            <div className="flex flex-col text-left justify-center overflow-hidden">
              <span className="leading-tight truncate">RHYTHM ATTACK</span>
              <span className="text-[7px] sm:text-2xs font-bold opacity-80 leading-tight truncate">(1 AP) Note Highway</span>
            </div>
          </button>

          <button
            onClick={handleCommandSkill}
            disabled={!isHeroTurn || activeHero.ap < 2 || activeAction !== 'none' || isEndingBattle}
            className="col-span-1 px-2 py-2 sm:px-4 sm:py-3 bg-[#facc15] text-[#0f0c0c] border-[3px] sm:border-[4px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-[9px] sm:text-sm uppercase -skew-x-6 hover:bg-[#ffdf3d] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-1 sm:gap-2 active:translate-y-0.5 active:shadow-none"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current shrink-0 hidden xs:block" />
            <div className="flex flex-col text-left justify-center overflow-hidden">
              <span className="leading-tight truncate">OVERDRIVE</span>
              <span className="text-[7px] sm:text-2xs font-bold opacity-80 leading-tight truncate">(2 AP) Magic Circle</span>
            </div>
          </button>

          <button
            onClick={handleCommandAttune}
            disabled={!isHeroTurn || activeAction !== 'none' || isEndingBattle}
            className="col-span-1 px-2 py-2 sm:px-4 sm:py-3 bg-[#38bdf8] text-[#0f0c0c] border-[3px] sm:border-[4px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-[9px] sm:text-sm uppercase -skew-x-6 hover:bg-[#5cd0ff] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-1 sm:gap-2 active:translate-y-0.5 active:shadow-none"
          >
            <Disc className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current shrink-0 hidden xs:block" />
            <div className="flex flex-col text-left justify-center overflow-hidden">
              <span className="leading-tight truncate">ATTUNE / CAPTURE</span>
              <span className="text-[7px] sm:text-2xs font-bold opacity-80 leading-tight truncate">(HP &lt; 35%) Seal Inst</span>
            </div>
          </button>

          <button
            onClick={handleCommandDefend}
            disabled={!isHeroTurn || activeAction !== 'none' || isEndingBattle}
            className="col-span-1 px-2 py-2 sm:px-4 sm:py-3 bg-[#4ade80] text-[#0f0c0c] border-[3px] sm:border-[4px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-[9px] sm:text-sm uppercase -skew-x-6 hover:bg-[#6bee9c] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-1 sm:gap-2 active:translate-y-0.5 active:shadow-none"
          >
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current shrink-0 hidden xs:block" />
            <div className="flex flex-col text-left justify-center overflow-hidden">
              <span className="leading-tight truncate">PARRY STANCE</span>
              <span className="text-[7px] sm:text-2xs font-bold opacity-80 leading-tight truncate">(+2 AP) Block</span>
            </div>
          </button>

          <button
            onClick={onFlee}
            disabled={isEndingBattle}
            className="col-span-2 sm:col-span-1 px-2 py-2 sm:px-4 sm:py-3 bg-[#2a2d43] text-white border-[3px] sm:border-[4px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-[9px] sm:text-sm uppercase -skew-x-6 hover:bg-[#383d5a] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center sm:justify-start gap-1 sm:gap-2 active:translate-y-0.5 active:shadow-none"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <div className="flex flex-col text-left justify-center">
              <span className="leading-tight">RETREAT</span>
              <span className="text-[7px] sm:text-2xs font-bold opacity-80 leading-tight hidden sm:block">Flee Battle</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}