// @ts-nocheck
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

export function useCombatEngine({
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

  return {
    enemies,
    setEnemies,
    targetEnemyIndex,
    setTargetEnemyIndex,
    turnIndex,
    setTurnIndex,
    activeAction,
    setActiveAction,
    parryStanceActive,
    setParryStanceActive,
    enemyFrame,
    setEnemyFrame,
    isPartyDrawerOpen,
    setIsPartyDrawerOpen,
    damagePopups,
    isEndingBattle,
    ghostHp,
    hpShaking,
    bossAttackVariation,
    bossAttackPhase,
    canCounterAttack,
    parryResolved,
    isBoss,
    isShrineBandit,
    enemy,
    baseEnemyInst,
    partyList,
    turnQueue,
    currentTurnUnit,
    isHeroTurn,
    activeHero,
    activeAttackingEnemy,
    setEnemy,
    triggerDamagePopup,
    checkPostTurnStates,
    handleCommandAttack,
    handleCommandSkill,
    handleCommandAttune,
    handleCommandDefend,
    handleRhythmComplete,
    handleSpellComplete,
    handleParryResult,
    handleWingSlamCounterComplete,
    handleAttuneComplete,
    isRightSweepAttack
  };
}
