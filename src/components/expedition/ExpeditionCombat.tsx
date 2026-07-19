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
import { WingSlamCounterMinigame } from './WingSlamCounterMinigame';

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
  effectType?: 'slash' | 'magic' | 'block';
  offsetX: number;
  offsetY: number;
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
  const isBoss = baseEnemyInst.id === 'lord_cacophony' || baseEnemyInst.id === 'corrupted_violin';

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
  
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [isEndingBattle, setIsEndingBattle] = useState(false);

  // ─── UPGRADED: Health Bar Animation States ───
  const [ghostHp, setGhostHp] = useState(enemy.hp);
  const [hpShaking, setHpShaking] = useState(false);

  const [bossAttackVariation, setBossAttackVariation] = useState<'dual_slam' | 'right_sweep'>('dual_slam');
  const [bossAttackPhase, setBossAttackPhase] = useState<'idle' | 'rise' | 'down' | 'slam' | 'sweep_prep'>('idle');
  const [canCounterAttack, setCanCounterAttack] = useState(false);
  const [parryResolved, setParryResolved] = useState(false);

  // ─── UPGRADED: Combo Ghost Trail & Shake Logic ───
  useEffect(() => {
    if (enemy.hp < ghostHp) {
      // Trigger the shake animation immediately
      setHpShaking(true);
      const shakeTimer = setTimeout(() => setHpShaking(false), 400);
      
      // Delay the ghost trail drop. (If hit again, this timer clears and resets!)
      const ghostTimer = setTimeout(() => setGhostHp(enemy.hp), 800);
      
      return () => {
        clearTimeout(shakeTimer);
        clearTimeout(ghostTimer);
      };
    } else if (enemy.hp > ghostHp) {
      // If healed, instantly snap the ghost trail
      setGhostHp(enemy.hp);
    }
  }, [enemy.hp, ghostHp]);

  const partyList = useMemo(() => Object.values(party), [party]);
  const turnQueue: TurnUnit[] = useMemo(() => {
    const p0 = partyList[0]!;
    const p1 = partyList[1] || p0;
    const p2 = partyList[2] || p0;
    return [
      { isHero: true, unit: p0 },
      { isHero: false, unit: enemy },
      { isHero: true, unit: p1 },
      { isHero: false, unit: enemy },
      { isHero: true, unit: p2 },
      { isHero: false, unit: enemy },
    ];
  }, [partyList, enemy]);

  const currentTurnUnit = turnQueue[turnIndex % turnQueue.length] || turnQueue[0]!;
  const isHeroTurn = currentTurnUnit.isHero;
  const activeHero = useMemo(() => {
    if (isHeroTurn) {
      return currentTurnUnit.unit as HeroProfile;
    } else {
      // During enemy turn/slam, the target is the active hero whose turn just preceded this enemy attack
      const prevIdx = (turnIndex - 1 + turnQueue.length) % turnQueue.length;
      const prevUnit = turnQueue[prevIdx];
      if (prevUnit && prevUnit.isHero) {
        return prevUnit.unit as HeroProfile;
      }
      return partyList[0]!;
    }
  }, [isHeroTurn, currentTurnUnit, turnIndex, turnQueue, partyList]);

  const triggerDamagePopup = useCallback((text: string, isEnemy: boolean, color: string, effectType?: 'slash' | 'magic' | 'block') => {
    const id = Date.now() + Math.random();
    const offsetX = (Math.random() - 0.5) * 80; 
    const offsetY = (Math.random() - 0.5) * 60;
    
    setDamagePopups(prev => [...prev, { id, text, isEnemy, color, effectType, offsetX, offsetY }]);
    setTimeout(() => {
      setDamagePopups(prev => prev.filter(p => p.id !== id));
    }, 1200); 
  }, []);

  useEffect(() => {
    if (activeAction === 'parry' && !isEndingBattle) {
      const sequence = [0, 1, 2, 3, 4, 3, 2, 1, 0];
      let stepIdx = 0;
      setEnemyFrame(sequence[0]!);
      const timer = setInterval(() => {
        stepIdx = Math.min(sequence.length - 1, stepIdx + 1);
        setEnemyFrame(sequence[stepIdx]!);
      }, 130);
      return () => clearInterval(timer);
    } else if (!isEndingBattle) {
      setEnemyFrame(0);
    }
  }, [activeAction, isEndingBattle]);

  // Boss specific attack sequence: dual slam or alternating right sweep
  useEffect(() => {
    if (activeAction === 'parry' && isBoss) {
      setCanCounterAttack(false);
      setParryResolved(false);
      if (bossAttackVariation === 'dual_slam') {
        setBossAttackPhase('rise');
        const t1 = setTimeout(() => setBossAttackPhase('down'), 450);
        const t2 = setTimeout(() => setBossAttackPhase('slam'), 600);
        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
        };
      } else {
        setBossAttackPhase('sweep_prep');
        const t1 = setTimeout(() => setBossAttackPhase('slam'), 550);
        return () => clearTimeout(t1);
      }
    } else if (activeAction !== 'parry') {
      setBossAttackPhase('idle');
      setCanCounterAttack(false);
      setParryResolved(false);
    }
  }, [activeAction, isBoss, bossAttackVariation]);

  // Play looping battle background music during combat
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

      let explosions = 0;
      const boomInterval = setInterval(() => {
        audioEngine.playHitSFX('sick'); 
        triggerDamagePopup('', true, '#ffffff', 'magic'); 
        explosions++;
        if (explosions >= 5) clearInterval(boomInterval);
      }, 350);

      setTimeout(() => {
        onCombatResult({ victory: true, xpGained: isBoss ? 1000 : 150 });
      }, 2500); 
      return true;
    }

    const allHeroesDead = currentParty.every(h => h.hp <= 0);
    if (allHeroesDead) {
      setIsEndingBattle(true);
      audioEngine.playHitSFX('miss');
      setTimeout(() => {
        onCombatResult({ victory: false, xpGained: 20 });
      }, 2500);
      return true;
    }

    return false;
  }, [isBoss, onCombatResult, triggerDamagePopup]);

  const advanceTurn = useCallback(() => {
    if (finishedRef.current || isEndingBattle) return;
    setTurnIndex(prev => {
      const nextIdx = (prev + 1) % turnQueue.length;
      const nextUnit = turnQueue[nextIdx]!;
      if (!nextUnit.isHero) {
        setTimeout(() => {
          if (!finishedRef.current && !isEndingBattle) {
            if (isBoss) {
              setBossAttackVariation(v => v === 'dual_slam' ? 'right_sweep' : 'dual_slam');
            }
            setActiveAction('parry');
          }
        }, 800);
      }
      return nextIdx;
    });
  }, [turnQueue, isEndingBattle, isBoss]);

  // Command handlers
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

    triggerDamagePopup(`-${totalDmg}`, true, mult > 1 ? '#facc15' : '#ffffff', 'slash');

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
    const totalDmg = Math.round((heroInst.baseDmg * 1.2 + completedPoints * 3) * mult);

    triggerDamagePopup(`-${totalDmg}`, true, '#da2d46', 'magic');

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
    setParryResolved(true);
    if (isBoss) {
      setBossAttackPhase('slam');
      if (parried) {
        setCanCounterAttack(true);
      } else {
        setCanCounterAttack(false);
      }
    } else {
      setActiveAction('none');
    }
    const rawDmg = Math.round(enemy.baseDmg * (enemy.staggered ? 0.5 : 1.0));
    const dmg = parried || parryStanceActive ? Math.round(rawDmg * 0.25) : rawDmg;

    if (parried) {
      audioEngine.playHitSFX('sick');
      setEnemy(prev => ({ ...prev, stagger: Math.min(prev.maxStagger, prev.stagger + 25) }));
    } else {
      audioEngine.playHitSFX('miss');
    }

    triggerDamagePopup(`-${dmg}`, false, '#da2d46', 'block');

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
    if (isBoss && !parried) {
      // If player missed the parry against the boss, show slam impact briefly without counter minigame, then advance
      setTimeout(() => {
        setActiveAction('none');
        setBossAttackPhase('idle');
        setCanCounterAttack(false);
        setTimeout(() => {
          if (enemy.hp > 0 && !isEndingBattle) advanceTurn();
        }, 400);
      }, 1100);
    } else if (!isBoss) {
      setTimeout(() => {
        if (enemy.hp > 0 && !isEndingBattle) advanceTurn();
      }, 600);
    }
    // When isBoss && parried is true, canCounterAttack === true renders WingSlamCounterMinigame which triggers handleWingSlamCounterComplete
  }, [enemy, parryStanceActive, activeHero, onUpdateParty, partyList, checkPostTurnStates, advanceTurn, triggerDamagePopup, isEndingBattle, isBoss]);

  const finishedRef = useRef(false);
  const hpPct = Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100));
  
  // ─── UPGRADED: Calculate ghost percentage independently ───
  const ghostPct = Math.max(0, Math.min(100, (ghostHp / enemy.maxHp) * 100));
  const staggerPct = Math.max(0, Math.min(100, (enemy.stagger / enemy.maxStagger) * 100));

  // Complete Wing Slam Counter-Attack Minigame
  const handleWingSlamCounterComplete = useCallback((totalDmg: number, totalStag: number) => {
    let updatedEnemyHp = enemy.hp;
    setEnemy(prev => {
      updatedEnemyHp = Math.max(0, prev.hp - totalDmg);
      return {
        ...prev,
        hp: updatedEnemyHp,
        stagger: Math.min(prev.maxStagger, prev.stagger + totalStag),
        staggered: prev.stagger + totalStag >= prev.maxStagger ? true : prev.staggered,
      };
    });

    if (updatedEnemyHp <= 0) {
      checkPostTurnStates(0, partyList);
    }

    setActiveAction('none');
    setBossAttackPhase('idle');
    setCanCounterAttack(false);
    setTimeout(() => {
      if (!isEndingBattle) advanceTurn();
    }, 400);
  }, [enemy, checkPostTurnStates, partyList, advanceTurn, isEndingBattle]);

  const isRightSweepAttack = isBoss && bossAttackVariation === 'right_sweep' && (bossAttackPhase === 'sweep_prep' || bossAttackPhase === 'slam');

  return (
    <div 
      className="flex-1 flex flex-col justify-between p-2 sm:p-4 lg:p-6 relative overflow-hidden bg-[#151828] bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `linear-gradient(rgba(15, 12, 12, 0.35), rgba(15, 12, 12, 0.5)), url('/assets/expedition/battle_bg.png')` }}
    >
      {/* ─── UPGRADED VFX ANIMATIONS ─── */}
      <style>{`
        /* Bouncing damage numbers */
        @keyframes damageNumberBounce {
          0% { opacity: 0; transform: scale(0.5) translateY(0); }
          15% { opacity: 1; transform: scale(1.6) translateY(-40px); }
          35% { transform: scale(1) translateY(-10px); }
          55% { transform: scale(1) translateY(-25px); }
          75% { opacity: 1; transform: scale(1) translateY(-15px); }
          100% { opacity: 0; transform: scale(0.8) translateY(-20px); }
        }
        /* Slashing Sword Hit */
        @keyframes slashFx {
          0% { transform: scale(0) rotate(-45deg); opacity: 1; filter: brightness(2); }
          50% { transform: scale(2.5, 0.15) rotate(-45deg); opacity: 1; filter: brightness(1.5); }
          100% { transform: scale(3.5, 0) rotate(-45deg); opacity: 0; }
        }
        /* Expanding Magic Burst */
        @keyframes magicFx {
          0% { transform: scale(0.5) rotate(0deg); opacity: 1; filter: brightness(2); }
          50% { transform: scale(1.8) rotate(90deg); opacity: 1; }
          100% { transform: scale(2.5) rotate(180deg); opacity: 0; }
        }
        /* Shield/Impact Shockwave */
        @keyframes blockFx {
          0% { transform: scale(0.5); opacity: 1; border-width: 12px; }
          100% { transform: scale(2.5); opacity: 0; border-width: 0px; }
        }
        /* THE JRPG BOSS DEATH SEQUENCE */
        @keyframes bossDeath {
          0% { filter: brightness(1); transform: translateX(0); }
          10% { filter: brightness(2) sepia(1) hue-rotate(-50deg) saturate(5); transform: translateX(-15px); }
          20% { filter: brightness(2) sepia(1) hue-rotate(-50deg) saturate(5); transform: translateX(15px); }
          30% { filter: brightness(2) sepia(1) hue-rotate(-50deg) saturate(5); transform: translateX(-15px); }
          40% { filter: brightness(2) sepia(1) hue-rotate(-50deg) saturate(5); transform: translateX(15px); }
          50% { filter: brightness(2) sepia(1) hue-rotate(-50deg) saturate(5); transform: translateX(0); }
          60% { opacity: 1; transform: scale(1.2) translateY(-30px); filter: brightness(3); }
          100% { opacity: 0; transform: scale(0.1) translateY(100px); filter: grayscale(1) brightness(0); }
        }
        /* White Flash on Death */
        @keyframes flashWhite {
          0% { opacity: 0; }
          10% { opacity: 1; }
          100% { opacity: 0; }
        }
        /* Health Bar Impact Shake */
        @keyframes hpShake {
          0% { transform: translateX(0); filter: brightness(1); }
          20% { transform: translateX(-4px); filter: brightness(2); }
          40% { transform: translateX(4px); filter: brightness(2); }
          60% { transform: translateX(-4px); filter: brightness(1.5); }
          80% { transform: translateX(4px); filter: brightness(1.5); }
          100% { transform: translateX(0); filter: brightness(1); }
        }
      `}</style>

      {/* Screen Death Flash Overlay */}
      {enemy.hp <= 0 && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-[flashWhite_2s_ease-out_forwards]" />
      )}

      {/* ── ECHO VILLAGE & SUMMIT BOSS: 3rd Image (Boss Body) behind the floor (z-10) but on top of background (z-0) — SLOW BREATHING LOOP ── */}
      {isBoss && (
        <div className="absolute inset-0 z-[1] pointer-events-none flex items-center justify-center overflow-hidden">
          <div className="animate-boss-breathe w-full h-full flex items-center justify-center">
            <img
              src="/assets/expedition/echo_boss_body.png"
              alt="Echo Boss"
              className="w-auto h-[50%] sm:h-[55%] max-w-none object-contain -translate-y-14 sm:-translate-y-20"
            />
          </div>
        </div>
      )}

      {/* ── ECHO VILLAGE & SUMMIT BOSS: 1st & 2nd Images (Boss Wings) behind the floor (z-[2]) OR on top of floor behind bottom UI during slam (z-15) ── */}
      {/* ── ECHO VILLAGE & SUMMIT BOSS WINGS (BEHIND FLOOR: z-[2]) ── */}
      {isBoss && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-[2]">
          <div className="animate-boss-breathe w-full h-full flex items-center justify-center">
            {isRightSweepAttack ? (
              /* Left wing stays behind floor in base form next to boss body */
              <div className="flex items-center justify-center w-full h-full">
                <div className="w-1/2 flex justify-end items-center h-full">
                  <img
                    src="/assets/expedition/echo_boss_wings_strike_left.png"
                    alt="Left Wing Base Form"
                    className="w-auto h-[52%] sm:h-[57%] max-w-none object-contain -translate-y-4 sm:-translate-y-6"
                  />
                </div>
                <div className="w-1/2" />
              </div>
            ) : !(bossAttackPhase === 'slam' || (activeAction === 'parry' && enemyFrame >= 4 && !isBoss)) && (
              /* Left & Right Strike Wings side-by-side behind floor */
              <div
                className={`flex items-center justify-center transition-all ${
                  bossAttackPhase === 'rise'
                    ? 'duration-500 ease-out scale-120 -translate-y-36 sm:-translate-y-48 animate-pulse drop-shadow-[0_0_35px_rgba(250,204,21,0.9)]'
                    : bossAttackPhase === 'down'
                    ? 'duration-150 ease-in scale-95 translate-y-10 sm:translate-y-14'
                    : 'duration-300 scale-100 -translate-y-4 sm:-translate-y-6'
                }`}
              >
                <img
                  src="/assets/expedition/echo_boss_wings_strike_left.png"
                  alt="Left Wing Base Form / Strike Prep"
                  className="w-auto h-[52%] sm:h-[57%] max-w-none object-contain"
                />
                <img
                  src="/assets/expedition/echo_boss_wings_strike_right.png"
                  alt="Right Wing Base Form / Strike Prep"
                  className="w-auto h-[52%] sm:h-[57%] max-w-none object-contain"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ECHO VILLAGE & SUMMIT BOSS WINGS (ABOVE FLOOR: z-15) ── */}
      {isBoss && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-15">
          <div className="animate-boss-breathe w-full h-full flex items-center justify-center">
            {isRightSweepAttack ? (
              /* Right wing only turns into slam version and sweeps across top of floor */
              <div className="flex items-center justify-center w-full h-full">
                <div className="w-1/2" />
                <div className="w-1/2 flex justify-start items-center h-full overflow-visible">
                  <img
                    src="/assets/expedition/echo_boss_wings_slam_right.png"
                    alt="Right Wing Sweep Slam"
                    className={`w-auto h-[54%] sm:h-[59%] max-w-none object-contain transition-all ${
                      bossAttackPhase === 'sweep_prep'
                        ? 'duration-300 scale-130 translate-x-[160px] sm:translate-x-[360px] translate-y-20 sm:translate-y-28 drop-shadow-[0_0_30px_rgba(218,45,70,0.8)]'
                        : 'duration-450 ease-out scale-140 -translate-x-[320px] sm:-translate-x-[640px] translate-y-20 sm:translate-y-28 drop-shadow-[0_0_50px_rgba(218,45,70,1)]'
                    }`}
                  />
                </div>
              </div>
            ) : (bossAttackPhase === 'slam' || (activeAction === 'parry' && enemyFrame >= 4 && !isBoss)) && (
              /* Left & Right Slam Wings side-by-side above floor (Dual Slam) */
              <div className="flex items-center justify-center transition-all duration-200 scale-130 translate-y-20 sm:translate-y-28 drop-shadow-[0_0_40px_rgba(218,45,70,1)]">
                <img
                  src="/assets/expedition/echo_boss_wings_slam_left.png"
                  alt="Left Wing Slam on Floor"
                  className="w-auto h-[54%] sm:h-[59%] max-w-none object-contain"
                />
                <img
                  src="/assets/expedition/echo_boss_wings_slam_right.png"
                  alt="Right Wing Slam on Floor"
                  className="w-auto h-[54%] sm:h-[59%] max-w-none object-contain"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2D Flat Ground Floor stretching edge-to-edge from absolute left/right to absolute bottom (z-10) */}
      <div 
        className="absolute inset-x-0 bottom-0 top-[48%] sm:top-[54%] bg-repeat-x bg-bottom pointer-events-none z-10 opacity-95 drop-shadow-[0_-8px_16px_rgba(0,0,0,0.95)]"
        style={{
          backgroundImage: `url('/assets/expedition/battle_ground.png')`,
          backgroundSize: 'auto 100%',
        }}
      />

      {/* FLOATING VFX & DAMAGE RENDER NODE */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        {damagePopups.map(p => {
          const baseX = p.isEnemy ? '75%' : '25%';
          const baseY = p.isEnemy ? '50%' : '65%';

          return (
            <div 
              key={p.id}
              className="absolute flex items-center justify-center pointer-events-none"
              style={{ left: baseX, top: baseY, transform: `translate(calc(-50% + ${p.offsetX}px), calc(-50% + ${p.offsetY}px))` }}
            >
              
              {/* VFX Animation Layer */}
              <div className="absolute inset-0 flex items-center justify-center">
                {p.effectType === 'slash' && (
                  <div className="w-32 h-4 bg-white rounded-full shadow-[0_0_20px_#facc15,0_0_40px_#facc15]" style={{ animation: 'slashFx 0.4s ease-out forwards' }} />
                )}
                {p.effectType === 'magic' && (
                  <Sparkles className="w-32 h-32 text-[#facc15] fill-[#facc15] opacity-0" style={{ animation: 'magicFx 0.6s ease-out forwards' }} />
                )}
                {p.effectType === 'block' && (
                  <div className="w-20 h-20 border-[#38bdf8] rounded-full opacity-0 shadow-[0_0_15px_#38bdf8]" style={{ animation: 'blockFx 0.5s ease-out forwards' }} />
                )}
              </div>

              {/* Bouncing Damage Number Layer */}
              <div
                className="font-orbitron font-black tracking-widest text-4xl sm:text-6xl text-white relative z-10"
                style={{
                  color: p.color,
                  WebkitTextStroke: '3px #0f0c0c',
                  textShadow: '4px 4px 0 #0f0c0c, 0 0 25px currentColor',
                  animation: 'damageNumberBounce 1s cubic-bezier(0.36, 0, 0.66, -0.56) forwards',
                }}
              >
                {p.text}
              </div>

            </div>
          );
        })}
      </div>

      {/* Top Combat HUD */}
      <div className="relative w-full flex flex-col pt-2 sm:pt-2 z-30 pointer-events-none">
        
        {/* Boss HP container */}
        <div className="w-full max-w-xl mx-auto flex flex-col gap-1 px-2 sm:px-4 pointer-events-auto">
          <div className="flex flex-col sm:flex-row items-center sm:items-baseline justify-between font-orbitron tracking-wide px-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] gap-0.5 sm:gap-0">
            <span className="font-black text-sm sm:text-base text-white uppercase tracking-wider text-center sm:text-left leading-tight">
              {enemy.name}
            </span>
            <span className="text-[10px] sm:text-xs text-[#facc15] font-bold text-center sm:text-right">
              LV. {enemy.level} {enemy.isBoss && 'BOSS'} — {enemy.hp}/{enemy.maxHp} HP
            </span>
          </div>

          {/* ─── UPGRADED: Health Bar Container with Shake & Ghost Animation ─── */}
          <div 
            className="relative w-full h-3 sm:h-4 bg-[#0f0c0c]/90 border-[2px] border-slate-700 shadow-[0_4px_16px_rgba(0,0,0,0.9)] overflow-hidden"
            style={{ animation: hpShaking ? 'hpShake 0.4s ease-out both' : 'none' }}
          >
            {/* The Delayed JRPG Ghost Trail */}
            <div 
              className="absolute top-0 left-0 h-full bg-white transition-all duration-700 ease-out" 
              style={{ width: `${ghostPct}%` }} 
            />
            {/* Fast Main HP Fill */}
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#da2d46] to-[#ff4b68] transition-all duration-150 ease-out" 
              style={{ width: `${hpPct}%` }} 
            />
            {/* Health Bar Tick Marks (25%, 50%, 75%) */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 bottom-0 left-[25%] w-[1px] bg-[#0f0c0c]/60" />
              <div className="absolute top-0 bottom-0 left-[50%] w-[2px] bg-[#0f0c0c]/80" />
              <div className="absolute top-0 bottom-0 left-[75%] w-[1px] bg-[#0f0c0c]/60" />
            </div>
          </div>

          <div className="relative w-full h-1 sm:h-1.5 bg-[#0f0c0c]/80 border border-slate-800 overflow-hidden mt-0.5">
            <div className="absolute top-0 left-0 h-full bg-[#facc15] transition-all duration-300" style={{ width: `${staggerPct}%` }} />
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
                    isCurrent ? 'bg-[#facc15] text-[#0f0c0c] scale-105 shadow-[1px_1px_0px_0px_#0f0c0c]' : unit.isHero ? 'bg-[#2a2d43] text-white' : 'bg-[#da2d46] text-white'
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
        <div className={`absolute top-1/4 sm:top-1/3 left-0 z-40 flex items-center transition-transform duration-300 ease-in-out ${isPartyDrawerOpen ? 'translate-x-0' : '-translate-x-[calc(100%-2.5rem)]'}`}>
          <div className="flex flex-col gap-1.5 sm:gap-2 p-2 sm:p-3 bg-[#151828]/95 backdrop-blur-md border-y-[3px] border-r-[3px] border-[#0f0c0c] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.4)] w-[220px] sm:w-[260px] rounded-r-xl">
            {partyList.map((hero) => {
              const isTurn = isHeroTurn && activeHero.id === hero.id;
              const inst = dex[hero.equippedId] || dex['solaris_strat']!;
              return (
                <div key={hero.id} className={`flex items-center gap-2 p-1.5 sm:p-2 border-[2px] sm:border-[3px] border-[#0f0c0c] transition-all -skew-x-3 ${isTurn ? 'bg-[#facc15] text-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c]' : 'bg-[#1e2238]/90 text-white opacity-90'}`}>
                  <div className="text-lg sm:text-2xl bg-[#0f0c0c] p-1 sm:p-1.5 border-[2px] border-[#0f0c0c]">{hero.avatar}</div>
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
                        <div key={i} className={`w-1.5 h-1.5 sm:w-2 sm:h-2 border border-[#0f0c0c] ${i < hero.ap ? (isTurn ? 'bg-[#da2d46]' : 'bg-[#38bdf8]') : 'bg-slate-700'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setIsPartyDrawerOpen(!isPartyDrawerOpen)}
            className={`w-10 h-16 sm:h-20 flex flex-col items-center justify-center border-y-[3px] border-r-[3px] border-[#0f0c0c] rounded-r-lg shadow-[4px_4px_0px_0px_#0f0c0c] transition-all
              ${isPartyDrawerOpen ? 'bg-[#2a2d43] text-white hover:bg-[#383d5a]' : 'bg-[#facc15] text-[#0f0c0c] hover:bg-[#ffdf3d]'}
              ${!isPartyDrawerOpen && isHeroTurn ? 'animate-pulse' : ''}
            `}
          >
            {isPartyDrawerOpen ? <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 font-black" /> : <div className="flex flex-col items-center gap-1"><Users className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /><ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 font-black" /></div>}
          </button>
        </div>

        {/* Right (Center-Right on Mobile): Enemy Sprite Frame Planted on Ground (Only for regular non-boss monsters) */}
        {!isBoss ? (
          <div className="absolute bottom-[20%] sm:bottom-[15%] right-4 sm:right-[15%] flex flex-col items-center gap-1 sm:gap-3 z-0 pointer-events-none">
            <div 
              className={`relative origin-bottom flex items-center justify-center ${
                enemy.hp <= 0 ? 'animate-[bossDeath_2s_ease-in_forwards]' : enemy.staggered ? 'animate-bounce' : 'transition-all duration-300'
              }`}
            >
              <img src={`/assets/expedition/enemy_frame_${enemyFrame}.png`} alt={enemy.name} className="w-40 h-40 sm:w-72 sm:h-72 object-contain drop-shadow-[0px_8px_16px_rgba(0,0,0,0.8)] sm:drop-shadow-[0px_12px_24px_rgba(0,0,0,0.8)] scale-x-[-1]" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
              {enemy.hp <= 0 && <div className="absolute inset-0 bg-red-600/50 mix-blend-color-burn rounded-full animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_infinite]" />}
              {enemy.staggered && enemy.hp > 0 && <div className="absolute inset-0 bg-[#facc15]/30 rounded-full flex items-center justify-center font-orbitron font-black text-lg sm:text-2xl text-[#0f0c0c] drop-shadow-[2px_2px_0px_#ffffff]">⚡ STAGGERED!</div>}
            </div>
            <span className="font-orbitron font-black text-[10px] sm:text-sm uppercase tracking-wider text-[#da2d46] bg-[#0f0c0c] px-3 sm:px-4 py-0.5 sm:py-1 border-[2px] border-[#da2d46] shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[3px_3px_0px_0px_#0f0c0c] -skew-x-6 truncate max-w-[150px] sm:max-w-none text-center">
              {enemy.name}
            </span>
          </div>
        ) : (
          /* For Bosses, the giant central figure + wings IS the boss! Show staggered indicator over center arena */
          enemy.staggered ? (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
              <div className="bg-[#facc15]/95 border-[4px] border-[#0f0c0c] px-8 py-3 -skew-x-12 flex items-center justify-center font-orbitron font-black text-3xl sm:text-4xl text-[#0f0c0c] drop-shadow-[4px_4px_0px_#ffffff] animate-bounce">
                ⚡ BOSS STAGGERED!
              </div>
            </div>
          ) : null
        )}
      </div>

      {/* Bottom Combat HUD: Action Command Panel */}
      <div className="relative z-40 flex flex-col items-center justify-between gap-3 sm:gap-4 bg-[#1e2238] border-[3px] sm:border-[4px] border-[#0f0c0c] shadow-[0px_-4px_0px_0px_#0f0c0c] p-3 sm:p-4">
        {/* Active Hero Status Badge */}
        <div className="w-full sm:w-auto flex items-center justify-center gap-2 sm:gap-3 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#0f0c0c] text-[#facc15] border-[2px] sm:border-[3px] border-[#facc15] font-orbitron font-black text-[10px] sm:text-sm uppercase tracking-wider -skew-x-6">
          <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#da2d46] fill-current animate-pulse" />
          <span className="truncate">ACTIVE TURN: {isHeroTurn ? activeHero.name.toUpperCase() : "ENEMY ATTACK PHASE"}</span>
        </div>

        {/* Command Grid: 2x2 on Mobile, Flex on Desktop */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch gap-2 sm:gap-3 w-full sm:w-auto">
          <button onClick={handleCommandAttack} disabled={!isHeroTurn || activeHero.ap < 1 || activeAction !== 'none' || isEndingBattle} className="col-span-1 px-2 py-2 sm:px-4 sm:py-3 bg-[#da2d46] text-white border-[3px] sm:border-[4px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-[9px] sm:text-sm uppercase -skew-x-6 hover:bg-[#ff3b56] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-1 sm:gap-2 active:translate-y-0.5 active:shadow-none">
            <Sword className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current shrink-0 hidden xs:block" />
            <div className="flex flex-col text-left justify-center overflow-hidden">
              <span className="leading-tight truncate">RHYTHM ATTACK</span>
              <span className="text-[7px] sm:text-2xs font-bold opacity-80 leading-tight truncate">(1 AP) Note Highway</span>
            </div>
          </button>

          <button onClick={handleCommandSkill} disabled={!isHeroTurn || activeHero.ap < 2 || activeAction !== 'none' || isEndingBattle} className="col-span-1 px-2 py-2 sm:px-4 sm:py-3 bg-[#facc15] text-[#0f0c0c] border-[3px] sm:border-[4px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-[9px] sm:text-sm uppercase -skew-x-6 hover:bg-[#ffdf3d] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-1 sm:gap-2 active:translate-y-0.5 active:shadow-none">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current shrink-0 hidden xs:block" />
            <div className="flex flex-col text-left justify-center overflow-hidden">
              <span className="leading-tight truncate">OVERDRIVE</span>
              <span className="text-[7px] sm:text-2xs font-bold opacity-80 leading-tight truncate">(2 AP) Magic Circle</span>
            </div>
          </button>

          <button onClick={handleCommandAttune} disabled={!isHeroTurn || activeAction !== 'none' || isEndingBattle} className="col-span-1 px-2 py-2 sm:px-4 sm:py-3 bg-[#38bdf8] text-[#0f0c0c] border-[3px] sm:border-[4px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-[9px] sm:text-sm uppercase -skew-x-6 hover:bg-[#5cd0ff] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-1 sm:gap-2 active:translate-y-0.5 active:shadow-none">
            <Disc className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current shrink-0 hidden xs:block" />
            <div className="flex flex-col text-left justify-center overflow-hidden">
              <span className="leading-tight truncate">ATTUNE / CAPTURE</span>
              <span className="text-[7px] sm:text-2xs font-bold opacity-80 leading-tight truncate">(HP &lt; 35%) Seal Inst</span>
            </div>
          </button>

          <button onClick={handleCommandDefend} disabled={!isHeroTurn || activeAction !== 'none' || isEndingBattle} className="col-span-1 px-2 py-2 sm:px-4 sm:py-3 bg-[#4ade80] text-[#0f0c0c] border-[3px] sm:border-[4px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-[9px] sm:text-sm uppercase -skew-x-6 hover:bg-[#6bee9c] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-1 sm:gap-2 active:translate-y-0.5 active:shadow-none">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current shrink-0 hidden xs:block" />
            <div className="flex flex-col text-left justify-center overflow-hidden">
              <span className="leading-tight truncate">PARRY STANCE</span>
              <span className="text-[7px] sm:text-2xs font-bold opacity-80 leading-tight truncate">(+2 AP) Block</span>
            </div>
          </button>

          <button onClick={onFlee} disabled={isEndingBattle} className="col-span-2 sm:col-span-1 px-2 py-2 sm:px-4 sm:py-3 bg-[#2a2d43] text-white border-[3px] sm:border-[4px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-[9px] sm:text-sm uppercase -skew-x-6 hover:bg-[#383d5a] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center sm:justify-start gap-1 sm:gap-2 active:translate-y-0.5 active:shadow-none">
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <div className="flex flex-col text-left justify-center">
              <span className="leading-tight">RETREAT</span>
              <span className="text-[7px] sm:text-2xs font-bold opacity-80 leading-tight hidden sm:block">Flee Battle</span>
            </div>
          </button>
        </div>
      </div>

      {/* ── TOPMOST OVERLAYS CONTAINER (z-[60]): Minigames, QTEs, Spells always on top of floor, boss, and HUD ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[60]">
        <div className="pointer-events-auto w-full max-w-2xl flex items-center justify-center p-4">
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
          {activeAction === 'parry' && !parryResolved && !canCounterAttack && (
            <ParryQteOverlay 
              enemyName={enemy.name}
              onParry={handleParryResult}
            />
          )}
          {activeAction === 'parry' && isBoss && bossAttackPhase === 'slam' && canCounterAttack && (
            <WingSlamCounterMinigame 
              bossName={enemy.name}
              onComplete={handleWingSlamCounterComplete}
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
    </div>
  );
}