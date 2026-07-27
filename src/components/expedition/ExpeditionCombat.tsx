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
import { UltimateSequenceOverlay } from './UltimateSequenceOverlay';
import { ParryQteOverlay } from './ParryQteOverlay';
import { AttuneCaptureOverlay } from './AttuneCaptureOverlay';
import { WingSlamCounterMinigame } from './WingSlamCounterMinigame';

export interface TurnUpdateInfo {
  queue: { isHero: boolean; avatar: string }[];
  index: number;
}

interface ExpeditionCombatProps {
  party: Record<string, HeroProfile>;
  enemyId: string;
  enemyGauntlet?: string[];
  customEnemies?: EnemyProfile[];
  dex: Record<string, HarmonydexEntry>;
  onCombatResult: (result: { victory: boolean; xpGained: number; capturedEntry?: HarmonydexEntry }) => void;
  onFlee: () => void;
  onUpdateParty: React.Dispatch<React.SetStateAction<Record<string, HeroProfile>>>;
  onTurnUpdate?: (info: TurnUpdateInfo | null) => void;
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
  enemyGauntlet,
  dex,
  onCombatResult,
  onFlee,
  onUpdateParty,
  onTurnUpdate,
  customEnemies,
}: ExpeditionCombatProps) {
  const [enemies, setEnemies] = useState<EnemyProfile[]>(() => {
    if (customEnemies) return customEnemies;
    const list = enemyGauntlet && enemyGauntlet.length > 0 ? enemyGauntlet : [enemyId];
    return list.map((id, index) => {
      const inst = EXPEDITION_INSTRUMENTS[id] || EXPEDITION_INSTRUMENTS['wakwak']!;
      const isB = inst.id === 'lord_cacophony' || inst.id === 'wakwak';
      return {
        id: `${inst.id}_${index}`,
        name: inst.name,
        type: inst.type,
        level: isB ? 10 : 3,
        hp: isB ? 1200 : 500,
        maxHp: isB ? 1200 : 500,
        stagger: 0,
        maxStagger: 100,
        staggered: false,
        baseDmg: isB ? 45 : 25, 
        captured: inst.captured,
        preset: inst.audioPreset,
        isBoss: isB,
      };
    });
  });

  const [targetEnemyIndex, setTargetEnemyIndex] = useState(0);

  useEffect(() => {
    if (enemies[targetEnemyIndex]?.hp <= 0) {
      const nextAlive = enemies.findIndex(e => e.hp > 0);
      if (nextAlive !== -1 && nextAlive !== targetEnemyIndex) {
        setTargetEnemyIndex(nextAlive);
      }
    }
  }, [enemies, targetEnemyIndex]);

  const isBoss = enemies[0]?.isBoss || false;
  const isShrineBandit = enemies[0]?.id.startsWith('bandit') || enemies[0]?.id.startsWith('titan_brass');
  const enemy = enemies[targetEnemyIndex] || enemies[0];
  const baseEnemyInst = EXPEDITION_INSTRUMENTS[enemy.id.replace(/_\d+$/, '')] || EXPEDITION_INSTRUMENTS['corrupted_violin']!;

  const setEnemy = useCallback((updater: EnemyProfile | ((prev: EnemyProfile) => EnemyProfile)) => {
    setEnemies(prev => {
      const newEnemies = [...prev];
      const idx = newEnemies[targetEnemyIndex] ? targetEnemyIndex : 0;
      if (newEnemies[idx]) {
        if (typeof updater === 'function') {
          newEnemies[idx] = updater(newEnemies[idx]);
        } else {
          newEnemies[idx] = updater;
        }
      }
      return newEnemies;
    });
  }, [targetEnemyIndex]);

  useEffect(() => {
    setGhostHp(enemy?.hp || 0);
  }, [targetEnemyIndex]);

  const [turnIndex, setTurnIndex] = useState(0);
  const [activeAction, setActiveAction] = useState<'none' | 'rhythm' | 'spell' | 'parry' | 'attune'>('none');
  const [parryStanceActive, setParryStanceActive] = useState(false);
  const [enemyFrame, setEnemyFrame] = useState(0);
  const [isPartyDrawerOpen, setIsPartyDrawerOpen] = useState(false);
  
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [isEndingBattle, setIsEndingBattle] = useState(false);

  const [ghostHp, setGhostHp] = useState(enemy.hp);
  const [hpShaking, setHpShaking] = useState(false);

  const [bossAttackVariation, setBossAttackVariation] = useState<'dual_slam' | 'right_sweep'>('dual_slam');
  const [bossAttackPhase, setBossAttackPhase] = useState<'idle' | 'rise' | 'down' | 'slam' | 'sweep_prep'>('idle');
  const [canCounterAttack, setCanCounterAttack] = useState(false);
  const [parryResolved, setParryResolved] = useState(false);

  const getHeroSprite = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('gustave')) return '/boy1_idle.gif';
    if (n.includes('maelle')) return '/girl_idle.gif';
    return '/boy2_idle.gif'; 
  };

  useEffect(() => {
    if (enemy.hp < ghostHp) {
      setHpShaking(true);
      const shakeTimer = setTimeout(() => setHpShaking(false), 400);
      const ghostTimer = setTimeout(() => setGhostHp(enemy.hp), 800);
      
      return () => {
        clearTimeout(shakeTimer);
        clearTimeout(ghostTimer);
      };
    } else if (enemy.hp > ghostHp) {
      setGhostHp(enemy.hp);
    }
  }, [enemy.hp, ghostHp]);

  const partyList = useMemo(() => Object.values(party), [party]);
  const turnQueue: TurnUnit[] = useMemo(() => {
    const queue: TurnUnit[] = [];
    const maxLen = Math.max(partyList.length, enemies.length);
    for (let i = 0; i < maxLen; i++) {
      if (partyList[i]) {
        queue.push({ isHero: true, unit: partyList[i]! });
      } else if (partyList.length > 0) {
        queue.push({ isHero: true, unit: partyList[i % partyList.length]! });
      }
      
      if (enemies[i]) {
        queue.push({ isHero: false, unit: enemies[i]! });
      } else if (enemies.length > 0) {
        queue.push({ isHero: false, unit: enemies[i % enemies.length]! });
      }
    }
    return queue;
  }, [partyList, enemies]);

  const currentTurnUnit = turnQueue[turnIndex % turnQueue.length] || turnQueue[0]!;
  const isHeroTurn = currentTurnUnit.isHero;
  const activeHero = useMemo(() => {
    if (isHeroTurn) {
      return currentTurnUnit.unit as HeroProfile;
    } else {
      const prevIdx = (turnIndex - 1 + turnQueue.length) % turnQueue.length;
      const prevUnit = turnQueue[prevIdx];
      if (prevUnit && prevUnit.isHero) {
        return prevUnit.unit as HeroProfile;
      }
      return partyList[0]!;
    }
  }, [isHeroTurn, currentTurnUnit, turnIndex, turnQueue, partyList]);

  const activeAttackingEnemy = !isHeroTurn ? (currentTurnUnit.unit as EnemyProfile) : enemy;

  useEffect(() => {
    if (onTurnUpdate) {
      onTurnUpdate({
        queue: turnQueue.map(u => ({
          isHero: u.isHero,
          avatar: u.isHero ? (u.unit as HeroProfile).avatar : '👹'
        })),
        index: turnIndex
      });
    }
  }, [onTurnUpdate, turnQueue, turnIndex]);

  useEffect(() => {
    return () => {
      onTurnUpdate?.(null);
    };
  }, [onTurnUpdate]);

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
        const t1 = setTimeout(() => setBossAttackPhase('slam'), 750);
        return () => clearTimeout(t1);
      }
    } else if (activeAction !== 'parry') {
      setBossAttackPhase('idle');
      setCanCounterAttack(false);
      setParryResolved(false);
    }
  }, [activeAction, isBoss, bossAttackVariation]);

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

  const checkPostTurnStates = useCallback((targetHp: number | null, currentParty: HeroProfile[]) => {
    const tempEnemies = [...enemies];
    if (targetHp !== null && tempEnemies[targetEnemyIndex]) {
      tempEnemies[targetEnemyIndex] = { ...tempEnemies[targetEnemyIndex], hp: targetHp };
    }
    const allEnemiesDead = tempEnemies.every(e => e.hp <= 0);
    
    if (allEnemiesDead) {
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
  }, [isBoss, onCombatResult, triggerDamagePopup, enemies, targetEnemyIndex]);

  const advanceTurn = useCallback((overrideIndex?: number) => {
    if (finishedRef.current || isEndingBattle) return;
    
    let nextIdx = overrideIndex !== undefined ? overrideIndex : (turnIndex + 1) % turnQueue.length;
    let nextUnit = turnQueue[nextIdx]!;
    
    let loopCount = 0;
    while ((nextUnit.unit.hp <= 0 || (nextUnit.isHero && partyList.every(h => h.hp <= 0))) && loopCount < turnQueue.length) {
      nextIdx = (nextIdx + 1) % turnQueue.length;
      nextUnit = turnQueue[nextIdx]!;
      loopCount++;
    }
    
    setTurnIndex(nextIdx);
    
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
  }, [turnIndex, turnQueue, isEndingBattle, isBoss, partyList]);

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
      setTimeout(() => checkPostTurnStates(null, updatedPartyList) || advanceTurn(), 100);
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

    const heroInst = dex[activeHero.equippedId] || dex['cebuano_gitara']!;
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
      setTimeout(() => checkPostTurnStates(null, updatedPartyList) || advanceTurn(), 100);
      return;
    }

    const heroInst = dex[activeHero.equippedId] || dex['cebuano_gitara']!;
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
    const rawDmg = Math.round(activeAttackingEnemy.baseDmg * (activeAttackingEnemy.staggered ? 0.5 : 1.0));
    const dmg = parried || parryStanceActive ? Math.round(rawDmg * 0.25) : rawDmg;

    if (parried) {
      audioEngine.playHitSFX('sick');
      setEnemies(prev => {
        const next = [...prev];
        const idx = next.findIndex(e => e.id === activeAttackingEnemy.id);
        if (idx !== -1) {
          next[idx] = { ...next[idx], stagger: Math.min(next[idx].maxStagger, next[idx].stagger + 25) };
        }
        return next;
      });
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
        checkPostTurnStates(null, Object.values(updatedPartyMap));
      }, 1000);

      return updatedPartyMap;
    });

    setParryStanceActive(false);
    if (isBoss && !parried) {
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
  }, [enemy, parryStanceActive, activeHero, onUpdateParty, partyList, checkPostTurnStates, advanceTurn, triggerDamagePopup, isEndingBattle, isBoss]);

  const finishedRef = useRef(false);
  const hpPct = Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100));
  
  const ghostPct = Math.max(0, Math.min(100, (ghostHp / enemy.maxHp) * 100));
  const staggerPct = Math.max(0, Math.min(100, (enemy.stagger / enemy.maxStagger) * 100));

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
      checkPostTurnStates(updatedEnemyHp, partyList);
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
      className="flex-1 flex flex-col justify-between p-2 sm:p-4 lg:p-6 relative overflow-hidden bg-[#151828] bg-cover bg-center bg-no-repeat select-none"
      style={{ backgroundImage: `linear-gradient(rgba(15, 12, 12, 0.35), rgba(15, 12, 12, 0.5)), url('/assets/expedition/battle_bg.png')` }}
    >
      <style>{`
        @keyframes damageNumberBounce {
          0% { opacity: 0; transform: scale(0.5) translateY(0); }
          15% { opacity: 1; transform: scale(1.6) translateY(-40px); }
          35% { transform: scale(1) translateY(-10px); }
          55% { transform: scale(1) translateY(-25px); }
          75% { opacity: 1; transform: scale(1) translateY(-15px); }
          100% { opacity: 0; transform: scale(0.8) translateY(-20px); }
        }
        @keyframes slashFx {
          0% { transform: scale(0) rotate(-45deg); opacity: 1; filter: brightness(2); }
          50% { transform: scale(2.5, 0.15) rotate(-45deg); opacity: 1; filter: brightness(1.5); }
          100% { transform: scale(3.5, 0) rotate(-45deg); opacity: 0; }
        }
        @keyframes magicFx {
          0% { transform: scale(0.5) rotate(0deg); opacity: 1; filter: brightness(2); }
          50% { transform: scale(1.8) rotate(90deg); opacity: 1; }
          100% { transform: scale(2.5) rotate(180deg); opacity: 0; }
        }
        @keyframes blockFx {
          0% { transform: scale(0.5); opacity: 1; border-width: 12px; }
          100% { transform: scale(2.5); opacity: 0; border-width: 0px; }
        }
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
        @keyframes flashWhite {
          0% { opacity: 0; }
          10% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes hpShake {
          0% { transform: translateX(0); filter: brightness(1); }
          20% { transform: translateX(-4px); filter: brightness(2); }
          40% { transform: translateX(4px); filter: brightness(2); }
          60% { transform: translateX(-4px); filter: brightness(1.5); }
          80% { transform: translateX(4px); filter: brightness(1.5); }
          100% { transform: translateX(0); filter: brightness(1); }
        }
      `}</style>

      {enemy.hp <= 0 && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-[flashWhite_2s_ease-out_forwards]" />
      )}

      {isBoss && (
        <div className="hidden lg:flex absolute inset-0 z-[1] pointer-events-none items-center justify-center overflow-visible">
          <div className="animate-boss-breathe w-full h-full flex flex-col items-center justify-center relative">
            {enemy.staggered && enemy.hp > 0 && (
              <div className="absolute -translate-y-40 sm:-translate-y-52 z-20 flex flex-col items-center justify-center pointer-events-none animate-fadeIn">
                <div className="relative w-48 h-16 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center justify-around animate-[spin_3s_linear_infinite] drop-shadow-[0_0_12px_#facc15]">
                    <span className="text-3xl animate-bounce">⭐</span>
                    <span className="text-xl text-[#facc15] animate-pulse">✨</span>
                    <span className="text-3xl animate-bounce" style={{ animationDelay: '200ms' }}>⭐</span>
                    <span className="text-xl text-[#facc15] animate-pulse" style={{ animationDelay: '400ms' }}>✨</span>
                    <span className="text-3xl animate-bounce" style={{ animationDelay: '600ms' }}>⭐</span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-around animate-[spin_2s_linear_infinite_reverse] drop-shadow-[0_0_8px_#ff8000] scale-75 opacity-90">
                    <span className="text-2xl">💫</span>
                    <span className="text-2xl">💫</span>
                    <span className="text-2xl">💫</span>
                  </div>
                </div>
              </div>
            )}
            <img
              src="/assets/expedition/echo_boss_body.png"
              alt="Echo Boss"
              className="w-auto h-[50%] sm:h-[55%] max-w-none object-contain -translate-y-14 sm:-translate-y-20"
            />
          </div>
        </div>
      )}

      {isBoss && (
        <div className="hidden lg:flex absolute inset-0 pointer-events-none items-center justify-center overflow-visible z-[2]">
          <div className="animate-boss-breathe w-full h-full flex items-center justify-center">
            {isRightSweepAttack ? (
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

      {isBoss && (
        <div className="hidden lg:flex absolute inset-0 pointer-events-none items-center justify-center overflow-visible z-15">
          <div className="animate-boss-breathe w-full h-full flex items-center justify-center">
            {isRightSweepAttack ? (
              <div className="flex items-center justify-center w-full h-full">
                <div className="w-1/2" />
                <div className="w-1/2 flex justify-start items-center h-full overflow-visible">
                  <img
                    src="/assets/expedition/echo_boss_wings_slam_right.png"
                    alt="Right Wing Sweep Slam"
                    className={`w-auto h-[54%] sm:h-[59%] max-w-none object-contain transition-all ${
                      bossAttackPhase === 'sweep_prep'
                        ? 'duration-300 scale-125 translate-x-[80px] sm:translate-x-[180px] translate-y-12 sm:translate-y-20 drop-shadow-[0_0_30px_rgba(218,45,70,0.8)]'
                        : 'duration-700 ease-out scale-135 -translate-x-[140px] sm:-translate-x-[300px] translate-y-12 sm:translate-y-20 drop-shadow-[0_0_50px_rgba(218,45,70,1)]'
                    }`}
                  />
                </div>
              </div>
            ) : (bossAttackPhase === 'slam' || (activeAction === 'parry' && enemyFrame >= 4 && !isBoss)) && (
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

      <div 
        className="hidden lg:block absolute inset-x-0 bottom-0 top-[48%] sm:top-[54%] bg-repeat-x bg-bottom pointer-events-none z-10 opacity-95 drop-shadow-[0_-8px_16px_rgba(0,0,0,0.95)]"
        style={{
          backgroundImage: `url('/assets/expedition/battle_ground.png')`,
          backgroundSize: 'auto 100%',
        }}
      />

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

      <div className="lg:hidden relative w-full flex flex-col items-center justify-center pt-2 z-20 gap-2">
        <div className="w-full max-w-xl mx-auto flex flex-col gap-1 px-2 sm:px-4 pointer-events-auto">
          <div className="flex flex-col sm:flex-row items-center sm:items-baseline justify-between font-orbitron tracking-wide px-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] gap-0.5 sm:gap-0">
            <span className="font-black text-sm sm:text-base text-white uppercase tracking-wider text-center sm:text-left leading-tight">
              {enemy.name}
            </span>
            <span className="text-[10px] sm:text-xs text-[#facc15] font-bold text-center sm:text-right">
              LV. {enemy.level} {enemy.isBoss && 'BOSS'} — {enemy.hp}/{enemy.maxHp} HP
            </span>
          </div>

          <div 
            className="relative w-full h-3 sm:h-4 bg-[#0f0c0c]/90 border-[2px] border-slate-700 shadow-[0_4px_16px_rgba(0,0,0,0.9)] overflow-hidden"
            style={{ animation: hpShaking ? 'hpShake 0.4s ease-out both' : 'none' }}
          >
            <div 
              className="absolute top-0 left-0 h-full bg-white transition-all duration-700 ease-out" 
              style={{ width: `${ghostPct}%` }} 
            />
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#da2d46] to-[#ff4b68] transition-all duration-150 ease-out" 
              style={{ width: `${hpPct}%` }} 
            />
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
      </div>

      <div className="hidden lg:flex relative w-full justify-center pt-2 z-20">
        <div className="w-full max-w-xl flex flex-col gap-1 px-4">
          <div className="flex items-baseline justify-between font-orbitron tracking-wide px-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            <span className="font-black text-base text-white uppercase tracking-wider">
              {enemy.name}
            </span>
            <span className="text-xs text-[#facc15] font-bold">
              LV. {enemy.level} {enemy.isBoss && 'BOSS'} — {enemy.hp}/{enemy.maxHp} HP
            </span>
          </div>

          <div 
            className="relative w-full h-4 bg-[#0f0c0c]/90 border-[2px] border-slate-700 shadow-[0_4px_16px_rgba(0,0,0,0.9)] overflow-hidden"
            style={{ animation: hpShaking ? 'hpShake 0.4s ease-out both' : 'none' }}
          >
            <div 
              className="absolute top-0 left-0 h-full bg-white transition-all duration-700 ease-out" 
              style={{ width: `${ghostPct}%` }} 
            />
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#da2d46] to-[#ff4b68] transition-all duration-300"
              style={{ width: `${hpPct}%` }} 
            />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 bottom-0 left-[25%] w-[1px] bg-[#0f0c0c]/60" />
              <div className="absolute top-0 bottom-0 left-[50%] w-[2px] bg-[#0f0c0c]/80" />
              <div className="absolute top-0 bottom-0 left-[75%] w-[1px] bg-[#0f0c0c]/60" />
            </div>
          </div>

          <div className="relative w-full h-1.5 bg-[#0f0c0c]/80 border border-slate-800 overflow-hidden mt-0.5">
            <div 
              className="absolute top-0 left-0 h-full bg-[#facc15] transition-all duration-300"
              style={{ width: `${staggerPct}%` }} 
            />
          </div>
        </div>

        <div className="absolute right-4 top-2 flex items-center gap-2 bg-[#1e2238]/90 border-[3px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] px-3 py-1.5 -skew-x-2 backdrop-blur-sm">
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
                  {unit.isHero ? (
                    <img src={(unit.unit as HeroProfile).avatar} alt="Hero" className="w-5 h-5 object-cover" />
                  ) : (
                    <span className="text-xs">👹</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="lg:hidden flex-1 w-full relative z-10 flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-x-0 bottom-0 h-24 sm:h-36 bg-repeat-x bg-bottom pointer-events-none z-10 opacity-95 drop-shadow-[0_-6px_12px_rgba(0,0,0,0.95)]"
          style={{
            backgroundImage: `url('/assets/expedition/battle_ground.png')`,
            backgroundSize: 'auto 100%',
          }}
        />

        {isBoss && (
          <div className="absolute inset-0 z-[1] pointer-events-none flex items-center justify-center overflow-visible">
            <div className="animate-boss-breathe w-full h-full flex flex-col items-center justify-center relative">
              {enemy.staggered && enemy.hp > 0 && (
                <div className="absolute -translate-y-28 sm:-translate-y-36 z-20 flex flex-col items-center justify-center pointer-events-none animate-fadeIn">
                  <div className="relative w-36 h-12 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center justify-around animate-[spin_3s_linear_infinite] drop-shadow-[0_0_10px_#facc15]">
                      <span className="text-2xl animate-bounce">⭐</span>
                      <span className="text-base text-[#facc15] animate-pulse">✨</span>
                      <span className="text-2xl animate-bounce" style={{ animationDelay: '200ms' }}>⭐</span>
                      <span className="text-base text-[#facc15] animate-pulse" style={{ animationDelay: '400ms' }}>✨</span>
                      <span className="text-2xl animate-bounce" style={{ animationDelay: '600ms' }}>⭐</span>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-around animate-[spin_2s_linear_infinite_reverse] drop-shadow-[0_0_6px_#ff8000] scale-75 opacity-90">
                      <span className="text-lg">💫</span>
                      <span className="text-lg">💫</span>
                      <span className="text-lg">💫</span>
                    </div>
                  </div>
                </div>
              )}
              <img
                src="/assets/expedition/echo_boss_body.png"
                alt="Echo Boss"
                className="w-auto h-[60%] sm:h-[70%] max-w-none object-contain -translate-y-6 sm:-translate-y-10"
              />
            </div>
          </div>
        )}

        {isBoss && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible z-[2]">
            <div className="animate-boss-breathe w-full h-full flex items-center justify-center">
              {isRightSweepAttack ? (
                <div className="flex items-center justify-center w-full h-full">
                  <div className="w-1/2 flex justify-end items-center h-full">
                    <img
                      src="/assets/expedition/echo_boss_wings_strike_left.png"
                      alt="Left Wing Base Form"
                      className="w-auto h-48 sm:h-60 max-w-none object-contain -translate-y-2 sm:-translate-y-4"
                    />
                  </div>
                  <div className="w-1/2" />
                </div>
              ) : !(bossAttackPhase === 'slam' || (activeAction === 'parry' && enemyFrame >= 4 && !isBoss)) && (
                <div
                  className={`w-full h-full flex items-center justify-center transition-all ${
                    bossAttackPhase === 'rise'
                      ? 'duration-500 ease-out scale-115 -translate-y-16 sm:-translate-y-24 animate-pulse drop-shadow-[0_0_25px_rgba(250,204,21,0.9)]'
                      : bossAttackPhase === 'down'
                      ? 'duration-150 ease-in scale-95 translate-y-10 sm:translate-y-14'
                      : 'duration-300 scale-100 -translate-y-2 sm:-translate-y-4'
                  }`}
                >
                  <img
                    src="/assets/expedition/echo_boss_wings_strike_left.png"
                    alt="Left Wing Base Form / Strike Prep"
                    className="w-auto h-48 sm:h-60 max-w-none object-contain"
                  />
                  <img
                    src="/assets/expedition/echo_boss_wings_strike_right.png"
                    alt="Right Wing Base Form / Strike Prep"
                    className="w-auto h-48 sm:h-60 max-w-none object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {isBoss && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible z-15">
            <div className="animate-boss-breathe w-full h-full flex items-center justify-center">
              {isRightSweepAttack ? (
                <div className="flex items-center justify-center w-full h-full">
                  <div className="w-1/2" />
                  <div className="w-1/2 flex justify-start items-center h-full overflow-visible">
                    <img
                      src="/assets/expedition/echo_boss_wings_slam_right.png"
                      alt="Right Wing Sweep Slam"
                      className={`w-auto h-52 sm:h-64 max-w-none object-contain transition-all ${
                        bossAttackPhase === 'sweep_prep'
                          ? 'duration-300 scale-115 translate-x-12 sm:translate-x-20 translate-y-14 sm:translate-y-20 drop-shadow-[0_0_20px_rgba(218,45,70,0.8)]'
                          : 'duration-700 ease-out scale-120 -translate-x-[110px] sm:-translate-x-[200px] translate-y-14 sm:translate-y-20 drop-shadow-[0_0_30px_rgba(218,45,70,1)]'
                      }`}
                    />
                  </div>
                </div>
              ) : (bossAttackPhase === 'slam' || (activeAction === 'parry' && enemyFrame >= 4 && !isBoss)) && (
                <div className="w-full h-full flex items-center justify-center -space-x-4 sm:-space-x-8 transition-all duration-200 scale-110 sm:scale-115 translate-y-14 sm:translate-y-20 drop-shadow-[0_0_25px_rgba(218,45,70,1)]">
                  <img
                    src="/assets/expedition/echo_boss_wings_slam_left.png"
                    alt="Left Wing Slam on Floor"
                    className="w-auto h-52 sm:h-64 max-w-none object-contain translate-x-2 sm:translate-x-3"
                  />
                  <img
                    src="/assets/expedition/echo_boss_wings_slam_right.png"
                    alt="Right Wing Slam on Floor"
                    className="w-auto h-52 sm:h-64 max-w-none object-contain -translate-x-2 sm:-translate-x-3"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <div className={`absolute top-1/4 left-0 z-40 flex items-center transition-transform duration-300 ease-in-out ${isPartyDrawerOpen ? 'translate-x-0' : '-translate-x-[calc(100%-2.5rem)]'}`}>
          <div className="flex flex-col gap-1.5 p-2 bg-[#151828]/95 backdrop-blur-md border-y-[3px] border-r-[3px] border-[#0f0c0c] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.4)] w-[220px] rounded-r-xl">
            {partyList.map((hero) => {
              const isTurn = isHeroTurn && activeHero.id === hero.id;
              const inst = dex[hero.equippedId] || dex['cebuano_gitara']!;
              return (
                <div 
                  key={hero.id}
                  onClick={() => {
                    if (isHeroTurn && activeAction === 'none' && !isEndingBattle && hero.hp > 0) {
                      const idx = turnQueue.findIndex(u => u.isHero && u.unit.id === hero.id);
                      if (idx !== -1) setTurnIndex(idx);
                    }
                  }}
                  className={`flex items-center gap-2 p-1.5 border-[2px] border-[#0f0c0c] transition-all -skew-x-3 cursor-pointer ${
                    isTurn ? 'bg-[#facc15] text-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c]' : 'bg-[#1e2238]/90 text-white opacity-90 hover:opacity-100 hover:shadow-[2px_2px_0px_0px_#0f0c0c]'
                  }`}
                >
                  <img src={hero.avatar} alt={hero.name} className="w-8 h-8 object-cover" />
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <div className="font-orbitron font-black text-[10px] flex items-center gap-1">
                      <span className="truncate">{hero.name}</span>
                      <span className="text-[8px] shrink-0 flex items-center justify-center bg-[#0f0c0c] p-0.5 border border-[#0f0c0c]">
                        <img src={`/assets/instruments/${inst.id}.png`} alt={inst.name} className="w-2.5 h-2.5 object-contain" />
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[8px] font-bold font-orbitron">
                      <span className="truncate">HP: {hero.hp}/{hero.maxHp}</span>
                      <span className="truncate">AP: {hero.ap}/{hero.maxAp}</span>
                    </div>
                    <div className="flex gap-0.5 mt-0.5">
                      {Array.from({ length: hero.maxAp }).map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 border border-[#0f0c0c] ${i < hero.ap ? (isTurn ? 'bg-[#da2d46]' : 'bg-[#38bdf8]') : 'bg-slate-700'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setIsPartyDrawerOpen(!isPartyDrawerOpen)}
            className={`w-10 h-16 flex flex-col items-center justify-center border-y-[3px] border-r-[3px] border-[#0f0c0c] rounded-r-lg shadow-[4px_4px_0px_0px_#0f0c0c] transition-all
              ${isPartyDrawerOpen ? 'bg-[#2a2d43] text-white hover:bg-[#383d5a]' : 'bg-[#facc15] text-[#0f0c0c] hover:bg-[#ffdf3d]'}
              ${!isPartyDrawerOpen && isHeroTurn ? 'animate-pulse' : ''}
            `}
          >
            {isPartyDrawerOpen ? <ChevronLeft className="w-5 h-5 font-black" /> : <div className="flex flex-col items-center gap-1"><Users className="w-4 h-4 fill-current" /><ChevronRight className="w-3 h-3 font-black" /></div>}
          </button>
        </div>

        {/* ── ACTIVE CHARACTER FOCUS (Mobile) ── */}
        {isShrineBandit && !isBoss ? (
          <div className="absolute bottom-[18%] left-8 sm:left-12 flex items-end justify-center z-20 pointer-events-none transition-all duration-300">
            <div key={activeHero.id} className="flex flex-col items-center gap-0 z-30 animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="relative origin-bottom flex items-center justify-center">
                <img src={getHeroSprite(activeHero.name)} alt={activeHero.name} className="w-64 h-64 sm:w-72 sm:h-72 object-contain drop-shadow-[0px_8px_16px_rgba(0,0,0,0.8)]" />
              </div>
              <span className="relative z-30 -mt-16 sm:-mt-20 font-orbitron font-black text-[9px] sm:text-[10px] uppercase tracking-wider text-[#facc15] bg-[#0f0c0c] px-3 py-0.5 border-[2px] border-[#facc15] shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6 truncate text-center">
                {activeHero.name}
              </span>
            </div>
          </div>
        ) : null}

        {!isBoss ? (
          <div className="absolute bottom-[18%] right-4 flex items-end gap-2 sm:gap-4 z-20">
            {enemies.length > 1 ? (
              enemies.map((e, idx) => {
                if (e.hp <= 0 && isEndingBattle) return null;
                const isCurrent = idx === targetEnemyIndex;
                const isAttacking = currentTurnUnit && !currentTurnUnit.isHero && currentTurnUnit.unit.id === e.id;
                
                const zIndex = idx % 3 === 0 ? 'z-30' : idx % 3 === 1 ? 'z-20' : 'z-10';
                
                return (
                  <div 
                    key={e.id} 
                    className={`flex flex-col items-center gap-0.5 cursor-pointer transition-all ${zIndex}`}
                    onClick={() => e.hp > 0 && setTargetEnemyIndex(idx)}
                  >
                    <div className="w-16 h-1.5 bg-[#0f0c0c]/80 border border-white/50 flex">
                      <div className="bg-[#da2d46] h-full transition-all" style={{ width: `${Math.max(0, (e.hp / e.maxHp) * 100)}%` }} />
                    </div>
                    <div className={`relative origin-bottom flex items-center justify-center ${e.hp <= 0 ? 'animate-[bossDeath_2s_ease-in_forwards]' : e.staggered ? 'animate-bounce' : isAttacking ? 'animate-pulse scale-110' : 'transition-all duration-300'}`}>
                      <img src={`/assets/expedition/enemy_frame_${isAttacking ? enemyFrame : 0}.png`} alt={e.name} className={`w-24 h-24 sm:w-28 sm:h-28 object-contain scale-x-[-1] transition-all duration-300 ${isCurrent ? 'drop-shadow-[0px_0px_8px_rgba(250,204,21,1)]' : 'drop-shadow-[0px_8px_16px_rgba(0,0,0,0.8)]'}`} onError={(ev) => { (ev.currentTarget as HTMLElement).style.display = 'none'; }} />
                      {e.hp <= 0 && <div className="absolute inset-0 bg-red-600/50 mix-blend-color-burn rounded-full animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_infinite]" />}
                      {e.staggered && e.hp > 0 && (
                        <div className="absolute inset-x-0 -top-6 z-20 flex items-center justify-center pointer-events-none">
                          <div className="relative w-16 h-6 flex items-center justify-around animate-[spin_3s_linear_infinite] drop-shadow-[0_0_8px_#facc15]">
                            <span className="text-sm animate-bounce">⭐</span>
                            <span className="text-xs text-[#facc15] animate-pulse">✨</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className={`font-orbitron font-black text-[8px] uppercase tracking-wider text-[#da2d46] bg-[#0f0c0c] px-2 py-0.5 border-[2px] border-[#da2d46] shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6 truncate max-w-[100px] text-center ${!isCurrent ? 'opacity-80' : ''}`}>
                      {e.name}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-20 h-1.5 bg-[#0f0c0c]/80 border border-white/50 flex shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6">
                  <div className="bg-[#da2d46] h-full transition-all" style={{ width: `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%` }} />
                </div>
                <div className={`relative origin-bottom flex items-center justify-center ${enemy.hp <= 0 ? 'animate-[bossDeath_2s_ease-in_forwards]' : enemy.staggered ? 'animate-bounce' : 'transition-all duration-300'}`}>
                  <img src={`/assets/expedition/enemy_frame_${enemyFrame}.png`} alt={enemy.name} className="w-36 h-36 sm:w-40 sm:h-40 object-contain drop-shadow-[0px_8px_16px_rgba(0,0,0,0.8)] scale-x-[-1]" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
                  {enemy.hp <= 0 && <div className="absolute inset-0 bg-red-600/50 mix-blend-color-burn rounded-full animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_infinite]" />}
                  {enemy.staggered && enemy.hp > 0 && (
                    <div className="absolute inset-x-0 -top-6 z-20 flex items-center justify-center pointer-events-none">
                      <div className="relative w-28 h-8 flex items-center justify-around animate-[spin_3s_linear_infinite] drop-shadow-[0_0_8px_#facc15]">
                        <span className="text-xl animate-bounce">⭐</span>
                        <span className="text-sm text-[#facc15] animate-pulse">✨</span>
                        <span className="text-xl animate-bounce" style={{ animationDelay: '300ms' }}>⭐</span>
                      </div>
                    </div>
                  )}
                </div>
                <span className="font-orbitron font-black text-[10px] uppercase tracking-wider text-[#da2d46] bg-[#0f0c0c] px-3 py-0.5 border-[2px] border-[#da2d46] shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6 truncate max-w-[150px] text-center">
                  {enemy.name}
                </span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-between px-12 py-8 relative z-20">
        <div className="flex flex-col gap-4 z-40">
          {partyList.map((hero) => {
            const isTurn = isHeroTurn && activeHero.id === hero.id;
            const inst = dex[hero.equippedId] || dex['cebuano_gitara']!;
            return (
              <div 
                key={hero.id}
                onClick={() => {
                  if (isHeroTurn && activeAction === 'none' && !isEndingBattle && hero.hp > 0) {
                    const idx = turnQueue.findIndex(u => u.isHero && u.unit.id === hero.id);
                    if (idx !== -1) setTurnIndex(idx);
                  }
                }}
                className={`flex items-center gap-3 p-3 border-[4px] border-[#0f0c0c] transition-all -skew-x-6 cursor-pointer hover:scale-[1.02] ${
                  isTurn ? 'bg-[#facc15] text-[#0f0c0c] scale-105 shadow-[6px_6px_0px_0px_#0f0c0c]' : 'bg-[#1e2238] text-white opacity-80 hover:opacity-100 hover:shadow-[4px_4px_0px_0px_#0f0c0c]'
                }`}
              >
                <img src={hero.avatar} alt={hero.name} className="w-14 h-14 object-cover" />
                <div className="flex flex-col">
                  <div className="font-orbitron font-black text-sm flex items-center gap-2">
                    <span>{hero.name}</span>
                    <span className="text-xs bg-white border border-[#0f0c0c] w-5 h-5 flex items-center justify-center overflow-hidden">
                      <img src={`/assets/instruments/${inst.id}.png`} alt={inst.name} className="w-full h-full object-contain scale-110 mix-blend-multiply" />
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-2xs font-bold font-orbitron">
                    <span>HP: {hero.hp}/{hero.maxHp}</span>
                    <span>AP: {hero.ap}/{hero.maxAp}</span>
                  </div>
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

        {/* ── ACTIVE CHARACTER FOCUS (Desktop) ── */}
        {isShrineBandit && !isBoss ? (
          <div className="flex items-end justify-center translate-x-16 lg:translate-x-24 -translate-y-4 lg:-translate-y-8 z-20 pointer-events-none">
            <div key={activeHero.id} className="flex flex-col items-center gap-0 z-30 animate-in fade-in slide-in-from-left-8 duration-300">
              <div className="relative origin-bottom transition-transform flex items-center justify-center">
                <img src={getHeroSprite(activeHero.name)} alt={activeHero.name} className="w-[470px] h-[470px] object-contain drop-shadow-[0px_12px_24px_rgba(0,0,0,0.8)]" />
              </div>
              <span className="relative z-30 -mt-36 font-orbitron font-black text-xs uppercase tracking-wider text-[#facc15] bg-[#0f0c0c] px-6 py-1 border-[2px] border-[#facc15] shadow-[4px_4px_0px_0px_#0f0c0c] -skew-x-6 text-center">
                {activeHero.name}
              </span>
            </div>
          </div>
        ) : null}

        {!isBoss ? (
          <div className="flex items-end justify-center gap-4 -translate-x-20 z-10">
            {enemies.length > 1 ? (
              enemies.map((e, idx) => {
                if (e.hp <= 0 && isEndingBattle) return null;
                const isCurrent = idx === targetEnemyIndex;
                const isAttacking = currentTurnUnit && !currentTurnUnit.isHero && currentTurnUnit.unit.id === e.id;
                
                const zIndex = idx % 3 === 0 ? 'z-30' : idx % 3 === 1 ? 'z-20' : 'z-10';
                
                return (
                  <div 
                    key={e.id} 
                    className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${zIndex}`}
                    onClick={() => e.hp > 0 && setTargetEnemyIndex(idx)}
                  >
                    <div className="w-24 h-2 bg-[#0f0c0c]/80 border-2 border-white/50 flex shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6">
                      <div className="bg-[#da2d46] h-full transition-all" style={{ width: `${Math.max(0, (e.hp / e.maxHp) * 100)}%` }} />
                    </div>
                    <div className={`relative transition-transform flex items-center justify-center ${e.staggered ? 'animate-bounce' : isAttacking ? 'animate-pulse scale-110' : ''}`}>
                      <img src={`/assets/expedition/enemy_frame_${isAttacking ? enemyFrame : 0}.png`} alt={e.name} className={`w-56 h-56 object-contain scale-x-[-1] transition-all duration-300 ${isCurrent ? 'drop-shadow-[0px_0px_12px_rgba(250,204,21,1)]' : 'drop-shadow-[0px_12px_24px_rgba(0,0,0,0.8)]'}`} onError={(ev) => { (ev.currentTarget as HTMLElement).style.display = 'none'; }} />
                      {e.hp <= 0 && <div className="absolute inset-0 bg-red-600/50 mix-blend-color-burn rounded-full animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_infinite]" />}
                      {e.staggered && e.hp > 0 && (
                        <div className="absolute inset-x-0 -top-8 z-20 flex items-center justify-center pointer-events-none">
                          <div className="relative w-36 h-10 flex items-center justify-around animate-[spin_3s_linear_infinite] drop-shadow-[0_0_10px_#facc15]">
                            <span className="text-2xl animate-bounce">⭐</span>
                            <span className="text-base text-[#facc15] animate-pulse">✨</span>
                            <span className="text-2xl animate-bounce" style={{ animationDelay: '300ms' }}>⭐</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className={`font-orbitron font-black text-sm uppercase tracking-wider text-[#da2d46] bg-[#0f0c0c] px-4 py-1 border-[2px] border-[#da2d46] shadow-[3px_3px_0px_0px_#0f0c0c] -skew-x-6 ${!isCurrent ? 'opacity-80' : ''}`}>
                      {e.name}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center gap-1 -translate-x-20 z-10">
                <div className="w-32 h-2 bg-[#0f0c0c]/80 border-2 border-white/50 flex shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6">
                  <div className="bg-[#da2d46] h-full transition-all" style={{ width: `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%` }} />
                </div>
                <div className={`relative transition-transform flex items-center justify-center ${enemy.staggered ? 'animate-bounce' : ''}`}>
                  <img src={`/assets/expedition/enemy_frame_${enemyFrame}.png`} alt={enemy.name} className="w-72 h-72 object-contain drop-shadow-[0px_12px_24px_rgba(0,0,0,0.8)] scale-x-[-1]" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
                  {enemy.hp <= 0 && <div className="absolute inset-0 bg-red-600/50 mix-blend-color-burn rounded-full animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_infinite]" />}
                  {enemy.staggered && enemy.hp > 0 && (
                    <div className="absolute inset-x-0 -top-8 z-20 flex items-center justify-center pointer-events-none">
                      <div className="relative w-36 h-10 flex items-center justify-around animate-[spin_3s_linear_infinite] drop-shadow-[0_0_10px_#facc15]">
                        <span className="text-2xl animate-bounce">⭐</span>
                        <span className="text-base text-[#facc15] animate-pulse">✨</span>
                        <span className="text-2xl animate-bounce" style={{ animationDelay: '300ms' }}>⭐</span>
                      </div>
                    </div>
                  )}
                </div>
                <span className="font-orbitron font-black text-sm uppercase tracking-wider text-[#da2d46] bg-[#0f0c0c] px-4 py-1 border-[2px] border-[#da2d46] shadow-[3px_3px_0px_0px_#0f0c0c] -skew-x-6">
                  {enemy.name}
                </span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="lg:hidden relative z-40 flex flex-col items-center justify-between gap-1.5 sm:gap-3 bg-[#1e2238] border-[2px] sm:border-[4px] border-[#0f0c0c] shadow-[0px_-3px_0px_0px_#0f0c0c] p-2 sm:p-3">
        <div className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-3 px-2 py-1 sm:px-4 sm:py-2 bg-[#0f0c0c] text-[#facc15] border-[2px] sm:border-[3px] border-[#facc15] font-orbitron font-black text-[9px] sm:text-sm uppercase tracking-wider -skew-x-6">
          <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-[#da2d46] fill-current animate-pulse" />
          <span className="truncate">ACTIVE TURN: {isHeroTurn ? activeHero.name.toUpperCase() : "ENEMY ATTACK PHASE"}</span>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch gap-1.5 sm:gap-3 w-full sm:w-auto">
          <button onClick={handleCommandAttack} disabled={!isHeroTurn || activeHero.ap < 1 || activeAction !== 'none' || isEndingBattle} className="col-span-1 px-1.5 py-1.5 sm:px-4 sm:py-3 bg-[#da2d46] text-white border-[2px] sm:border-[4px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-[8px] sm:text-sm uppercase -skew-x-6 hover:bg-[#ff3b56] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-1 sm:gap-2 active:translate-y-0.5 active:shadow-none">
            <Sword className="w-3 h-3 sm:w-4 sm:h-4 fill-current shrink-0 hidden xs:block" />
            <div className="flex flex-col text-left justify-center overflow-hidden">
              <span className="leading-tight truncate">RHYTHM ATTACK</span>
              <span className="text-[6px] sm:text-2xs font-bold opacity-80 leading-tight truncate">(1 AP) Note Highway</span>
            </div>
          </button>

          <button onClick={handleCommandSkill} disabled={!isHeroTurn || activeHero.ap < 2 || activeAction !== 'none' || isEndingBattle} className="col-span-1 px-1.5 py-1.5 sm:px-4 sm:py-3 bg-[#facc15] text-[#0f0c0c] border-[2px] sm:border-[4px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-[8px] sm:text-sm uppercase -skew-x-6 hover:bg-[#ffdf3d] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-1 sm:gap-2 active:translate-y-0.5 active:shadow-none">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 fill-current shrink-0 hidden xs:block" />
            <div className="flex flex-col text-left justify-center overflow-hidden">
              <span className="leading-tight truncate">OVERDRIVE</span>
              <span className="text-[6px] sm:text-2xs font-bold opacity-80 leading-tight truncate">(2 AP) Magic Circle</span>
            </div>
          </button>

          <button onClick={handleCommandAttune} disabled={!isHeroTurn || activeAction !== 'none' || isEndingBattle} className="col-span-1 px-1.5 py-1.5 sm:px-4 sm:py-3 bg-[#38bdf8] text-[#0f0c0c] border-[2px] sm:border-[4px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-[8px] sm:text-sm uppercase -skew-x-6 hover:bg-[#5cd0ff] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-1 sm:gap-2 active:translate-y-0.5 active:shadow-none">
            <Disc className="w-3 h-3 sm:w-4 sm:h-4 fill-current shrink-0 hidden xs:block" />
            <div className="flex flex-col text-left justify-center overflow-hidden">
              <span className="leading-tight truncate">ATTUNE / CAPTURE</span>
              <span className="text-[6px] sm:text-2xs font-bold opacity-80 leading-tight truncate">(HP &lt; 35%) Seal Inst</span>
            </div>
          </button>

          <button onClick={handleCommandDefend} disabled={!isHeroTurn || activeAction !== 'none' || isEndingBattle} className="col-span-1 px-1.5 py-1.5 sm:px-4 sm:py-3 bg-[#4ade80] text-[#0f0c0c] border-[2px] sm:border-[4px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-[8px] sm:text-sm uppercase -skew-x-6 hover:bg-[#6bee9c] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-1 sm:gap-2 active:translate-y-0.5 active:shadow-none">
            <Shield className="w-3 h-3 sm:w-4 sm:h-4 fill-current shrink-0 hidden xs:block" />
            <div className="flex flex-col text-left justify-center overflow-hidden">
              <span className="leading-tight truncate">PARRY STANCE</span>
              <span className="text-[6px] sm:text-2xs font-bold opacity-80 leading-tight truncate">(+2 AP) Block</span>
            </div>
          </button>

          <button onClick={onFlee} disabled={isEndingBattle} className="col-span-1 sm:col-span-1 px-1.5 py-1.5 sm:px-4 sm:py-3 bg-[#2a2d43] text-white border-[2px] sm:border-[4px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-[8px] sm:text-sm uppercase -skew-x-6 hover:bg-[#383d5a] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center sm:justify-start gap-1 sm:gap-2 active:translate-y-0.5 active:shadow-none">
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
            <div className="flex flex-col text-left justify-center">
              <span className="leading-tight">RETREAT</span>
              <span className="text-[6px] sm:text-2xs font-bold opacity-80 leading-tight hidden sm:block">Flee Battle</span>
            </div>
          </button>

          <button onClick={() => onCombatResult({ victory: true, xpGained: 150 * enemies.length })} disabled={isEndingBattle} className="col-span-1 sm:col-span-1 px-1.5 py-1.5 sm:px-4 sm:py-3 bg-[#eab308] text-[#0f0c0c] border-[2px] sm:border-[4px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-[8px] sm:text-sm uppercase -skew-x-6 hover:bg-[#facc15] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center sm:justify-start gap-1 sm:gap-2 active:translate-y-0.5 active:shadow-none">
            <div className="flex flex-col text-left justify-center">
              <span className="leading-tight">SKIP (TEST)</span>
              <span className="text-[6px] sm:text-2xs font-bold opacity-80 leading-tight hidden sm:block">Auto Win</span>
            </div>
          </button>
        </div>
      </div>

      <div className="hidden lg:flex relative z-40 items-center justify-between gap-4 bg-[#1e2238] border-[4px] border-[#0f0c0c] shadow-[0px_-4px_0px_0px_#0f0c0c] p-4">
        <div className="flex items-center gap-3 px-4 py-2 bg-[#0f0c0c] text-[#facc15] border-[3px] border-[#facc15] font-orbitron font-black text-sm uppercase tracking-wider -skew-x-6 shrink-0">
          <Zap className="w-4 h-4 text-[#da2d46] fill-current animate-pulse shrink-0" />
          <span>ACTIVE TURN: {isHeroTurn ? activeHero.name.toUpperCase() : "ENEMY ATTACK PHASE"}</span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            onClick={handleCommandAttack}
            disabled={!isHeroTurn || activeHero.ap < 1 || activeAction !== 'none' || isEndingBattle}
            className="px-4 py-3 bg-[#da2d46] text-white border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-[#ff3b56] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2 active:translate-y-0.5 active:shadow-none"
          >
            <Sword className="w-4 h-4 fill-current" />
            <div className="flex flex-col text-left">
              <span>RHYTHM ATTACK</span>
              <span className="text-2xs font-bold opacity-80">(1 AP) Note Highway</span>
            </div>
          </button>

          <button
            onClick={handleCommandSkill}
            disabled={!isHeroTurn || activeHero.ap < 2 || activeAction !== 'none' || isEndingBattle}
            className="px-4 py-3 bg-[#facc15] text-[#0f0c0c] border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-[#ffdf3d] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2 active:translate-y-0.5 active:shadow-none"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <div className="flex flex-col text-left">
              <span>OVERDRIVE ULTIMATE</span>
              <span className="text-2xs font-bold opacity-80">(2 AP) Magic Circle</span>
            </div>
          </button>

          <button
            onClick={handleCommandAttune}
            disabled={!isHeroTurn || activeAction !== 'none' || isEndingBattle}
            className="px-4 py-3 bg-[#38bdf8] text-[#0f0c0c] border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-[#5cd0ff] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2 active:translate-y-0.5 active:shadow-none"
          >
            <Disc className="w-4 h-4 fill-current" />
            <div className="flex flex-col text-left">
              <span>ATTUNE / CAPTURE</span>
              <span className="text-2xs font-bold opacity-80">(HP &lt; 35%) Seal Instrument</span>
            </div>
          </button>

          <button
            onClick={handleCommandDefend}
            disabled={!isHeroTurn || activeAction !== 'none' || isEndingBattle}
            className="px-4 py-3 bg-[#4ade80] text-[#0f0c0c] border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-[#6bee9c] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2 active:translate-y-0.5 active:shadow-none"
          >
            <Shield className="w-4 h-4 fill-current" />
            <div className="flex flex-col text-left">
              <span>PARRY STANCE</span>
              <span className="text-2xs font-bold opacity-80">(+2 AP) Block &amp; Counter</span>
            </div>
          </button>

          <button
            onClick={onFlee}
            disabled={isEndingBattle}
            className="px-4 py-3 bg-[#2a2d43] text-white border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-[#383d5a] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2 active:translate-y-0.5 active:shadow-none"
          >
            <ArrowLeft className="w-4 h-4" />
            <div className="flex flex-col text-left">
              <span>RETREAT</span>
              <span className="text-2xs font-bold opacity-80">Flee Battle</span>
            </div>
          </button>

          <button
            onClick={() => onCombatResult({ victory: true, xpGained: 150 * enemies.length })}
            disabled={isEndingBattle}
            className="px-4 py-3 bg-[#eab308] text-[#0f0c0c] border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-[#facc15] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2 active:translate-y-0.5 active:shadow-none"
          >
            <div className="flex flex-col text-left">
              <span>SKIP (TEST)</span>
              <span className="text-2xs font-bold opacity-80">Auto Win</span>
            </div>
          </button>
        </div>
      </div>

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
            <UltimateSequenceOverlay 
              hero={activeHero}
              instrument={dex[activeHero.equippedId] || dex['cebuano_gitara']!}
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