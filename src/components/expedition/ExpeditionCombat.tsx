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

export type Projectile = {
  id: number;
  type: 'blue' | 'gold';
  x: number;
  y: number;
  speed: number;
  chargeElapsed: number; // ms elapsed since spawn (charge-up phase)
};

const CHARGE_DURATION = 900; // ms orb charges at mouth before shooting


interface ExpeditionCombatProps {
  party: Record<string, HeroProfile>;
  enemyId: string;
  enemyGauntlet?: string[];
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
  customX?: string;
  customY?: string;
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
}: ExpeditionCombatProps) {
  const [enemies, setEnemies] = useState<EnemyProfile[]>(() => {
    const list = enemyGauntlet && enemyGauntlet.length > 0 ? enemyGauntlet : [enemyId];
    return list.map((id, index) => {
      const inst = EXPEDITION_INSTRUMENTS[id] || EXPEDITION_INSTRUMENTS['wakwak']!;
      const isB = inst.id === 'lord_cacophony' || inst.id === 'wakwak' || inst.id === 'bakunawa';
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
  const isShrineBandit = enemies[0]?.id.startsWith('bandit') || enemies[0]?.id.startsWith('titan_brass') || enemies[0]?.id.startsWith('bakunawa');
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

  const partyList = useMemo(() => Object.values(party), [party]);
  const turnQueue: TurnUnit[] = useMemo(() => {
    const queue: TurnUnit[] = [];
    const maxLen = Math.max(partyList.length, enemies.length);
    for (let i = 0; i < maxLen; i++) {
      // Hero turns
      if (partyList[i]) {
        queue.push({ isHero: true, unit: partyList[i]! });
      } else if (partyList.length > 0) {
        queue.push({ isHero: true, unit: partyList[i % partyList.length]! });
      }
      
      // Enemy turns
      if (enemies[i]) {
        queue.push({ isHero: false, unit: enemies[i]! });
      } else if (enemies.length > 0) {
        queue.push({ isHero: false, unit: enemies[i % enemies.length]! });
      }
    }
    return queue;
  }, [partyList, enemies]);

  const [turnIndex, setTurnIndex] = useState(enemy.id.startsWith('bakunawa') ? 1 : 0);
  const [activeAction, setActiveAction] = useState<'none' | 'rhythm' | 'spell' | 'parry' | 'attune'>('none');
  const [parryStanceActive, setParryStanceActive] = useState(false);
  const [enemyFrame, setEnemyFrame] = useState(0);
  const [isPartyDrawerOpen, setIsPartyDrawerOpen] = useState(false);

  // ─── Bakunawa Intro Sequence State ───
  const [introStep, setIntroStep] = useState<'dialogue' | 'transition' | 'combat'>(
    enemy.id.startsWith('bakunawa') ? 'dialogue' : 'combat'
  );
  
  const [showParryHint, setShowParryHint] = useState(true);
  useEffect(() => {
    if (introStep === 'combat' && enemy.id.startsWith('bakunawa')) {
      setShowParryHint(true);
      const timer = setTimeout(() => setShowParryHint(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [introStep, enemy.id]);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const introDialogue = useMemo(() => [
    { name: "Maelle", avatar: party['maelle']?.avatar || "👩🏽", text: "Is that the Bakunawa?! Wow, it's absolutely massive! This is going to be so epic, let's go!" },
    { name: "Lune", avatar: party['lune']?.avatar || "👶🏽", text: "We have to protect the shrine and everyone in it! Let's work together and stay safe, okay?" },
    { name: "Gustave", avatar: party['gustave']?.avatar || "🧑🏽", text: "Stay sharp, both of you. One wrong move and we're fish food. Wait for the perfect moment to parry." }
  ], [party]);

  // ─── UPGRADED: Shrine Board Joystick State ───
  const [boardY, setBoardY] = useState(0);
  const boardYRef = useRef(0); // always-current boardY for use inside rAF loop
  const [isMovingUp, setIsMovingUp] = useState(false);
  const previousBoardY = useRef(0);
  const keys = useRef({ w: false, s: false });
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const [bakunawaY, setBakunawaY] = useState(0);
  const previousBakunawaY = useRef(0);
  // Refs to measure actual mouth position from the DOM
  const bakunawaDesktopImgRef = useRef<HTMLImageElement>(null);
  const bakunawaMobileImgRef = useRef<HTMLImageElement>(null);
  const bakunawaMouthBottomPxRef = useRef(300); // px from COMBAT CONTAINER bottom
  const bakunawaMouthXPercentRef = useRef(85);  // % from combat left
  const combatContainerRef = useRef<HTMLDivElement>(null); // to convert viewport-relative rects
  const partyBoardImgRef = useRef<HTMLImageElement>(null); // to read actual board DOM rect
  // Tracks board's actual rect relative to combat container (updated every rAF frame)
  const partyBoardRectRef = useRef({ left: 0, bottom: 0, width: 0, height: 0, leftPct: 0, rightPct: 0 });

  const triggerDamagePopup = useCallback((text: string, isEnemy: boolean, color: string, effectType?: 'slash' | 'magic' | 'block', customX?: string, customY?: string) => {
    const id = Date.now() + Math.random();
    const offsetX = (Math.random() - 0.5) * 80; 
    const offsetY = (Math.random() - 0.5) * 60;
    
    setDamagePopups(prev => [...prev, { id, text, isEnemy, color, effectType, offsetX, offsetY, customX, customY }]);
    setTimeout(() => {
      setDamagePopups(prev => prev.filter(p => p.id !== id));
    }, 1200); 
  }, []);

  const handleProjectileHit = useCallback((dmg: number) => {
    audioEngine.playHitSFX('miss');
    const br = partyBoardRectRef.current;
    const combatW = combatContainerRef.current?.clientWidth || 1000;
    const combatH = combatContainerRef.current?.clientHeight || 600;
    const hitX = `${br.leftPct + (br.width / combatW * 100) * 0.5}%`;
    const hitTop = `${((combatH - br.bottom - br.height * 0.5) / combatH) * 100}%`;
    triggerDamagePopup(`-${dmg}`, false, '#da2d46', 'magic', hitX, hitTop);
    onUpdateParty(prev => {
      const active = Object.values(prev).find(h => h.hp > 0) || Object.values(prev)[0]!;
      const shieldLeft = Math.max(0, active.shield - dmg);
      const overflow = Math.max(0, dmg - active.shield);
      const newHp = Math.max(0, active.hp - overflow);
      return { ...prev, [active.id]: { ...active, shield: shieldLeft, hp: newHp } };
    });
  }, [onUpdateParty, triggerDamagePopup]);

  const handleProjectileHitRef = useRef(handleProjectileHit);
  useEffect(() => { handleProjectileHitRef.current = handleProjectileHit; }, [handleProjectileHit]);

  const tryParry = useCallback(() => {
    // Use the actual measured board rect — parry window extends 0.5x the board width to the right
    const br = partyBoardRectRef.current;
    const boardBottom = br.bottom;
    const boardTop = br.bottom + br.height;
    const parryRightPct = br.rightPct + (br.width / (combatContainerRef.current?.clientWidth ?? window.innerWidth) * 100) * 0.5;
    
    const goldOrbIdx = projectilesRef.current.findIndex(p => 
      p.type === 'gold' && 
      p.x < parryRightPct && p.x > br.leftPct && 
      p.y > boardBottom - 10 && p.y < boardTop + 20
    );
    if (goldOrbIdx !== -1) {
      if (enemy.id.startsWith('bakunawa')) {
        audioEngine.playHitSFX('sick');
        triggerDamagePopup('PARRIED!', true, '#4ade80');
        setEnemy(prev => ({ ...prev, stagger: prev.maxStagger, staggered: true }));
        projectilesRef.current = [];
        setProjectiles([]);
        setTimeout(() => {
          setTurnIndex(prev => (prev + 1) % turnQueue.length);
        }, 1200);
      } else {
        projectilesRef.current.splice(goldOrbIdx, 1);
        setProjectiles([...projectilesRef.current]);
        audioEngine.playHitSFX('good');
        setActiveAction('parry');
      }
    }
  }, [enemy.id, turnQueue.length, triggerDamagePopup, setEnemy]);

  const tryParryRef = useRef(tryParry);
  useEffect(() => { tryParryRef.current = tryParry; }, [tryParry]);

  
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

  useEffect(() => {
    if (!isShrineBandit) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W') { keys.current.w = true; setIsMovingUp(true); }
      if (e.key === 's' || e.key === 'S') { keys.current.s = true; setIsMovingUp(false); }
      if (e.key === ' ' && !isHeroTurn && enemy.id.startsWith('bakunawa') && activeAction === 'none') {
        e.preventDefault();
        tryParryRef.current();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W') { keys.current.w = false; if (!keys.current.s) setIsMovingUp(false); }
      if (e.key === 's' || e.key === 'S') { keys.current.s = false; }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    let frameId: number;
    let lastTime = performance.now();
    let lastSpawnTime = performance.now();
    
    const loop = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;
      
      if ((keys.current.w || keys.current.s) && introStep === 'combat' && !isHeroTurn && !enemy.staggered) {
        const speed = 0.15;
        if (keys.current.w) boardYRef.current = Math.min(100, boardYRef.current + dt * speed);
        else if (keys.current.s) boardYRef.current = Math.max(0, boardYRef.current - dt * speed);
        setBoardY(boardYRef.current);
      }
      
      // Bakunawa lazily follows boardY with a slight delay
      let currentBakunawaY = previousBakunawaY.current;
      if (enemy.id.startsWith('bakunawa')) {
        currentBakunawaY += (boardYRef.current - currentBakunawaY) * 0.04;
      }
      if (Math.abs(previousBakunawaY.current - currentBakunawaY) > 0.05) {
        previousBakunawaY.current = currentBakunawaY;
        setBakunawaY(currentBakunawaY);
      }

      // Measure Bakunawa mouth actual pixel position — relative to the COMBAT CONTAINER
      const combatEl = combatContainerRef.current;
      const imgEl = bakunawaDesktopImgRef.current?.offsetWidth
        ? bakunawaDesktopImgRef.current
        : bakunawaMobileImgRef.current;
      if (combatEl && imgEl && imgEl.offsetWidth > 0) {
        const combatRect = combatEl.getBoundingClientRect();
        const imgRect = imgEl.getBoundingClientRect();
        const combatH = combatEl.clientHeight;
        const combatW = combatEl.clientWidth;
        // Y: Bakunawa head faces left — mouth at ~65% from image top
        const mouthFromCombatTop = (imgRect.top - combatRect.top) + imgRect.height * 0.65;
        bakunawaMouthBottomPxRef.current = combatH - mouthFromCombatTop;
        // X: mouth is at the LEFT edge of the sprite (head faces left), ~5% inward
        const mouthFromCombatLeft = (imgRect.left - combatRect.left) + imgRect.width * 0.05;
        bakunawaMouthXPercentRef.current = Math.min(98, Math.max(50, (mouthFromCombatLeft / combatW) * 100));
      }

      // Measure party board's actual pixel position — relative to the COMBAT CONTAINER
      if (combatContainerRef.current && partyBoardImgRef.current && partyBoardImgRef.current.offsetWidth > 0) {
        const combatRect = combatContainerRef.current.getBoundingClientRect();
        const combatH = combatContainerRef.current.clientHeight;
        const combatW = combatContainerRef.current.clientWidth;
        const bRect = partyBoardImgRef.current.getBoundingClientRect();
        partyBoardRectRef.current = {
          left: bRect.left - combatRect.left,
          bottom: combatH - (bRect.bottom - combatRect.top),
          width: bRect.width,
          height: bRect.height,
          leftPct: ((bRect.left - combatRect.left) / combatW) * 100,
          rightPct: ((bRect.right - combatRect.left) / combatW) * 100,
        };
      }

      if (!isHeroTurn && enemy.id.startsWith('bakunawa') && activeAction === 'none' && introStep === 'combat') {
        let hitAny = false;
        
        // Move orbs that have finished charging; charge the rest in place
        projectilesRef.current = projectilesRef.current.map(p => {
          if (p.chargeElapsed < CHARGE_DURATION) {
            return { ...p, chargeElapsed: p.chargeElapsed + dt };
          }
          return { ...p, x: p.x - dt * p.speed };
        });
        
        // Use the actual measured board rect for collision
        const br = partyBoardRectRef.current;
        const boardBottom = br.bottom;
        const boardTop = br.bottom + br.height;
        
        projectilesRef.current = projectilesRef.current.filter(p => {
          if (p.x < -10) return false;
          // Collision: orb is horizontally at the board (left edge), vertically overlapping the board sprite
          if (p.x < br.rightPct && p.x > br.leftPct && p.y > boardBottom - 10 && p.y < boardTop + 20) {
            hitAny = true;
            return false;
          }
          return true;
        });

        if (hitAny) {
          handleProjectileHitRef.current(20);
        }

        if (time - lastSpawnTime > 1800) {
          lastSpawnTime = time;
          const type = Math.random() > 0.75 ? 'gold' : 'blue';
          projectilesRef.current.push({
            id: time,
            type,
            x: bakunawaMouthXPercentRef.current,
            y: bakunawaMouthBottomPxRef.current,
            speed: 0.02 + Math.random() * 0.01,
            chargeElapsed: 0, // start charging
          });
        }
        
        setProjectiles([...projectilesRef.current]);
      } else if (projectilesRef.current.length > 0) {
         // Clear projectiles when turn ends or action starts
         projectilesRef.current = [];
         setProjectiles([]);
      }

      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(frameId);
    };
  }, [isShrineBandit, isHeroTurn, enemy.id, activeAction, introStep]);

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
        const t1 = setTimeout(() => setBossAttackPhase('slam'), 750);
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
    
    // Skip dead units
    let loopCount = 0;
    while ((nextUnit.unit.hp <= 0 || (nextUnit.isHero && partyList.every(h => h.hp <= 0))) && loopCount < turnQueue.length) {
      nextIdx = (nextIdx + 1) % turnQueue.length;
      nextUnit = turnQueue[nextIdx]!;
      loopCount++;
    }
    
    setTurnIndex(nextIdx);
    
    if (!nextUnit.isHero) {
      if (enemies[0]?.id.startsWith('bakunawa')) {
        // Bullet hell phase starts, do not automatically set parry action
      } else {
        setTimeout(() => {
          if (!finishedRef.current && !isEndingBattle) {
            if (isBoss) {
              setBossAttackVariation(v => v === 'dual_slam' ? 'right_sweep' : 'dual_slam');
            }
            setActiveAction('parry');
          }
        }, 800);
      }
    }
  }, [turnIndex, turnQueue, isEndingBattle, isBoss, partyList]);

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
    setEnemy(prev => ({ ...prev, staggered: false }));
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
      setEnemy(prev => ({ ...prev, staggered: false }));
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
      return { ...prev, hp: nextHp, stagger: isStaggered ? 0 : nextStagger, staggered: isStaggered };
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
      return { ...prev, hp: nextHp, stagger: 0, staggered: false };
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
    if (isBoss) {
      if (enemy.id.startsWith('bakunawa')) {
        if (parried) {
          setEnemy(prev => ({ ...prev, stagger: prev.maxStagger, staggered: true }));
        }
        setTimeout(() => {
          setActiveAction('none');
          if (enemy.hp > 0 && !isEndingBattle) advanceTurn();
        }, 800);
      } else if (!parried) {
        setTimeout(() => {
          setActiveAction('none');
          setBossAttackPhase('idle');
          setCanCounterAttack(false);
          setTimeout(() => {
            if (enemy.hp > 0 && !isEndingBattle) advanceTurn();
          }, 400);
        }, 1100);
      }
    } else {
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
      ref={combatContainerRef}
      className="flex-1 flex flex-col justify-between p-2 sm:p-4 lg:p-6 relative overflow-hidden bg-[#151828] bg-cover bg-center bg-no-repeat select-none"
      style={{ backgroundImage: `linear-gradient(rgba(15, 12, 12, 0.35), rgba(15, 12, 12, 0.5)), url('${isShrineBandit ? '/assets/expedition/shrine_bg.png' : '/assets/expedition/battle_bg.png'}')` }}
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
      {/* ── ECHO VILLAGE & SUMMIT BOSS: Desktop PC Background Layers (Boss Body) (z-[1]) ── */}
      {isBoss && (
        <div className="hidden lg:flex absolute inset-0 z-[1] pointer-events-none items-center justify-center overflow-visible">
          <div className={`animate-boss-breathe w-full h-full flex flex-col items-center justify-center relative ${enemy.id.startsWith('bakunawa') ? 'translate-x-[40%]' : ''}`}>
            <div 
              className={`w-full h-full flex flex-col items-center transition-transform duration-75 ${enemy.id.startsWith('bakunawa') ? 'justify-end pb-16' : 'justify-center'}`}
              style={enemy.id.startsWith('bakunawa') ? { transform: `translateY(-${bakunawaY * 4}px)` } : {}}
            >
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
                ref={bakunawaDesktopImgRef}
                src={enemy.id.startsWith('bakunawa') ? (bossAttackPhase !== 'idle' ? "/assets/expedition/bakunawa_mouth_open_transparent.png" : "/assets/expedition/bakunawa_normal_transparent.png") : "/assets/expedition/echo_boss_body.png"}
                alt={enemy.name}
                className={`w-auto ${enemy.id.startsWith('bakunawa') ? 'h-[75%] sm:h-[85%]' : 'h-[50%] sm:h-[55%]'} max-w-none object-contain transition-transform ${introStep === 'dialogue' ? '-translate-y-12 sm:-translate-y-16 duration-[1500ms] ease-in-out' : 'translate-y-[150px] sm:translate-y-[170px] duration-300'} ${bossAttackPhase !== 'idle' ? 'scale-110 drop-shadow-[0_0_20px_rgba(218,45,70,0.8)]' : 'scale-100'}`}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── ECHO VILLAGE & SUMMIT BOSS WINGS: Desktop PC (BEHIND FLOOR: z-[2]) ── */}
      {isBoss && !enemy.id.startsWith('bakunawa') && (
        <div className="hidden lg:flex absolute inset-0 pointer-events-none items-center justify-center overflow-visible z-[2]">
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

      {/* ── ECHO VILLAGE & SUMMIT BOSS WINGS: Desktop PC (ABOVE FLOOR: z-15) ── */}
      {isBoss && !enemy.id.startsWith('bakunawa') && (
        <div className="hidden lg:flex absolute inset-0 pointer-events-none items-center justify-center overflow-visible z-15">
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
                        ? 'duration-300 scale-125 translate-x-[80px] sm:translate-x-[180px] translate-y-12 sm:translate-y-20 drop-shadow-[0_0_30px_rgba(218,45,70,0.8)]'
                        : 'duration-700 ease-out scale-135 -translate-x-[140px] sm:-translate-x-[300px] translate-y-12 sm:translate-y-20 drop-shadow-[0_0_50px_rgba(218,45,70,1)]'
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

      {/* 2D Flat Ground Floor stretching edge-to-edge from absolute left/right to absolute bottom for Desktop PC (z-10) */}
      <div 
        className={`hidden lg:block absolute inset-x-0 bottom-0 top-[48%] sm:top-[54%] bg-repeat-x bg-bottom pointer-events-none z-10 opacity-95 drop-shadow-[0_-8px_16px_rgba(0,0,0,0.95)] transition-transform duration-[1500ms] ease-in-out ${introStep === 'dialogue' ? 'translate-y-0' : 'translate-y-[200%]'}`}
        style={{
          backgroundImage: `url('${isShrineBandit ? '/assets/expedition/shrine_ground.png' : '/assets/expedition/battle_ground.png'}')`,
          backgroundSize: 'auto 100%',
        }}
      />

      {/* FLOATING VFX & DAMAGE RENDER NODE */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        {damagePopups.map(p => {
          const baseX = p.customX || (p.isEnemy ? '75%' : '30%');
          const baseY = p.customY || (p.isEnemy ? '50%' : '45%');

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

      {/* ── Top Combat HUD: Mobile / Tablet Only (New UI) ── */}
      <div className="lg:hidden relative w-full flex flex-col items-center justify-center pt-2 z-20 gap-2">
        <div className={`w-full max-w-xl mx-auto flex flex-col gap-1 px-2 sm:px-4 pointer-events-auto transition-opacity duration-1000 ${introStep === 'dialogue' ? 'opacity-0' : 'opacity-100'}`}>
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

      {/* ── Top Combat HUD: Desktop PC Only (Exact 89df9fb UI) ── */}
      <div className="hidden lg:flex relative w-full justify-center pt-2 z-20">
        <div className={`w-full max-w-xl flex flex-col gap-1 px-4 transition-opacity duration-1000 ${introStep === 'dialogue' ? 'opacity-0' : 'opacity-100'}`}>
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

        {/* Turn Order Queue (Floating Top-Right exact 89df9fb style) */}
        {!isShrineBandit && (
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
                    <span>{unit.isHero ? (unit.unit as HeroProfile).avatar : '👹'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Center Stage Arena: Mobile / Tablet Only (New UI with Ground & Boss rendered above bottom buttons) ── */}
      <div className="lg:hidden flex-1 w-full relative z-10 flex items-center justify-center overflow-hidden">
        {/* Mobile Battle Ground Floor sitting cleanly at the bottom of the Center Stage Arena right above Bottom Combat HUD */}
        <div 
          className={`absolute inset-x-0 bottom-0 h-24 sm:h-36 bg-repeat-x bg-bottom pointer-events-none z-10 opacity-95 drop-shadow-[0_-6px_12px_rgba(0,0,0,0.95)] transition-transform duration-[1500ms] ease-in-out ${introStep === 'dialogue' ? 'translate-y-0' : 'translate-y-[200%]'}`}
          style={{
            backgroundImage: `url('${isShrineBandit ? '/assets/expedition/shrine_ground.png' : '/assets/expedition/battle_ground.png'}')`,
            backgroundSize: 'auto 100%',
          }}
        />

        {/* Mobile Boss Body (z-[1]) */}
        {isBoss && (
          <div className="absolute inset-0 z-[1] pointer-events-none flex items-center justify-center overflow-visible">
            <div className={`animate-boss-breathe w-full h-full flex flex-col items-center justify-center relative ${enemy.id.startsWith('bakunawa') ? 'translate-x-[35%]' : ''}`}>
              <div 
                className={`w-full h-full flex flex-col items-center transition-transform duration-75 ${enemy.id.startsWith('bakunawa') ? 'justify-end pb-[20%]' : 'justify-center'}`}
                style={enemy.id.startsWith('bakunawa') ? { transform: `translateY(-${bakunawaY * 2}px)` } : {}}
              >
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
                  ref={bakunawaMobileImgRef}
                  src={enemy.id.startsWith('bakunawa') ? (bossAttackPhase !== 'idle' ? "/assets/expedition/bakunawa_mouth_open_transparent.png" : "/assets/expedition/bakunawa_normal_transparent.png") : "/assets/expedition/echo_boss_body.png"}
                  alt={enemy.name}
                  className={`w-auto ${enemy.id.startsWith('bakunawa') ? 'h-[80%] sm:h-[90%]' : 'h-[60%] sm:h-[70%]'} max-w-none object-contain transition-transform ${introStep === 'dialogue' ? '-translate-y-12 sm:-translate-y-16 duration-[1500ms] ease-in-out' : 'translate-y-[70px] sm:translate-y-[90px] duration-300'} ${bossAttackPhase !== 'idle' ? 'scale-110 drop-shadow-[0_0_20px_rgba(218,45,70,0.8)]' : 'scale-100'}`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Mobile Boss Wings Behind Floor (z-[2]) */}
        {isBoss && !enemy.id.startsWith('bakunawa') && (
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

        {/* Mobile Boss Wings Above Floor (z-15) */}
        {isBoss && !enemy.id.startsWith('bakunawa') && (
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

        {/* LEFT SIDE: Party List Drawer */}
        <div className={`absolute top-1/4 left-0 z-40 flex items-center transition-all duration-300 ease-in-out ${introStep === 'dialogue' ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${isPartyDrawerOpen ? 'translate-x-0' : '-translate-x-[calc(100%-2.5rem)]'}`}>
          <div className="flex flex-col gap-1.5 p-2 bg-[#151828]/95 backdrop-blur-md border-y-[3px] border-r-[3px] border-[#0f0c0c] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.4)] w-[220px] rounded-r-xl">
            {partyList.map((hero) => {
              const isTurn = isHeroTurn && activeHero.id === hero.id;
              const inst = dex[hero.equippedId] || dex['cebuano_gitara']!;
              return (
                <div key={hero.id} className={`flex items-center gap-2 p-1.5 border-[2px] border-[#0f0c0c] transition-all -skew-x-3 ${isTurn ? 'bg-[#facc15] text-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c]' : 'bg-[#1e2238]/90 text-white opacity-90'}`}>
                  <div className="text-2xl bg-[#0f0c0c] p-1.5 border-[2px] border-[#0f0c0c] w-10 h-10 flex items-center justify-center overflow-hidden">
                    {hero.avatar.includes('.png') || hero.avatar.startsWith('/') ? <img src={hero.avatar} alt="Avatar" className="w-full h-full object-cover" /> : hero.avatar}
                  </div>
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

        {/* Left (Center-Left on Mobile): Shrine Board Joystick & Hero Squad */}
        {isShrineBandit ? (
          <>
            {introStep === 'combat' && (
              <div className="absolute left-2 sm:left-4 top-[40%] bottom-[30%] w-12 z-50 flex flex-col items-center pointer-events-auto">
                <div className="text-white font-orbitron font-bold text-[8px] mb-2 drop-shadow-md">UP</div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={boardY}
                  disabled={isHeroTurn || enemy.staggered}
                  onChange={(e) => {
                    if (isHeroTurn || enemy.staggered) return;
                    const val = Number(e.target.value);
                    setIsMovingUp(val > boardYRef.current);
                    boardYRef.current = val;
                    previousBoardY.current = val;
                    setBoardY(val);
                  }}
                  onPointerUp={() => setIsMovingUp(false)}
                  onTouchEnd={() => setIsMovingUp(false)}
                  className="flex-1 appearance-none bg-black/50 border-2 border-[#facc15] rounded-full w-4"
                  style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                />
                <div className="text-white font-orbitron font-bold text-[8px] mt-2 drop-shadow-md">DOWN</div>
              </div>
            )}

            <div 
              className="absolute bottom-[15%] left-24 sm:left-32 flex items-end justify-start z-20 pointer-events-none transition-all duration-75"
              style={{ transform: `translateY(-${boardY * 2}px)` }}
            >
              {introStep === 'dialogue' ? (
                <div className="flex items-end justify-center gap-1 mb-6 translate-x-8">
                  <img src="/assets/expedition/boy1_idle.gif" alt="Hero 1" className="w-24 h-24 object-contain" />
                  <img src="/assets/expedition/girl_idle.gif" alt="Hero 2" className="w-24 h-24 object-contain" />
                  <img src="/assets/expedition/boy2_idle.gif" alt="Hero 3" className="w-24 h-24 object-contain" />
                </div>
              ) : (
                <img 
                  src={isMovingUp ? "/assets/expedition/party_board_normal.png" : "/assets/expedition/party_board_falling.png"} 
                  alt="Party Board" 
                  className="w-[140px] sm:w-[180px] object-contain drop-shadow-2xl relative z-10"
                />
              )}
            </div>
          </>
        ) : null}

        {/* Right (Center-Right on Mobile): Enemy Sprite Frame Planted on Ground */}
        {!isBoss ? (
          <div className="absolute bottom-[18%] right-4 flex items-end gap-2 sm:gap-4 z-20">
            {enemies.length > 1 ? (
              enemies.map((e, idx) => {
                if (e.hp <= 0 && isEndingBattle) return null;
                const isCurrent = idx === targetEnemyIndex;
                const isAttacking = currentTurnUnit && !currentTurnUnit.isHero && currentTurnUnit.unit.id === e.id;
                
                return (
                  <div 
                    key={e.id} 
                    className="flex flex-col items-center gap-1 cursor-pointer transition-all"
                    onClick={() => e.hp > 0 && setTargetEnemyIndex(idx)}
                  >
                    <div className="w-16 h-1.5 bg-[#0f0c0c]/80 border border-white/50 flex mb-1">
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
              <div className="flex flex-col items-center gap-1">
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

      {/* ── Center Stage Arena: Desktop PC Only (Exact 89df9fb UI) ── */}
      <div className="hidden lg:flex flex-1 items-center justify-between px-12 py-8 relative z-20">
        {/* Left: Active Party Avatars */}
        <div className={`flex flex-col gap-4 z-30 transition-opacity duration-1000 ${introStep === 'dialogue' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          {partyList.map((hero) => {
            const isTurn = isHeroTurn && activeHero.id === hero.id;
            const inst = dex[hero.equippedId] || dex['cebuano_gitara']!;
            return (
              <div 
                key={hero.id}
                className={`flex items-center gap-3 p-3 border-[4px] border-[#0f0c0c] transition-all -skew-x-6 ${
                  isTurn ? 'bg-[#facc15] text-[#0f0c0c] scale-105 shadow-[6px_6px_0px_0px_#0f0c0c]' : 'bg-[#1e2238] text-white opacity-80'
                }`}
              >
                <div className="text-3xl bg-[#0f0c0c] p-1 border-[2px] border-[#0f0c0c] w-12 h-12 flex items-center justify-center overflow-hidden">
                  {hero.avatar.includes('.png') ? <img src={hero.avatar} alt="Avatar" className="w-full h-full object-cover" /> : hero.avatar}
                </div>
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

        {/* Left-Center: Shrine Board Joystick & Hero Squad on Desktop */}
        {isShrineBandit ? (
          <>
            {introStep === 'combat' && (
              <div className="hidden absolute left-8 xl:left-12 top-[30%] bottom-[30%] w-16 z-50 flex flex-col items-center pointer-events-auto">
                <div className="text-white font-orbitron font-bold text-sm mb-2 drop-shadow-[0px_2px_4px_rgba(0,0,0,0.8)]">UP</div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={boardY}
                  disabled={isHeroTurn || enemy.staggered}
                  onChange={(e) => {
                    if (isHeroTurn || enemy.staggered) return;
                    const val = Number(e.target.value);
                    setIsMovingUp(val > boardYRef.current);
                    boardYRef.current = val;
                    previousBoardY.current = val;
                    setBoardY(val);
                  }}
                  onPointerUp={() => setIsMovingUp(false)}
                  onMouseLeave={() => setIsMovingUp(false)}
                  className="flex-1 appearance-none bg-[#0f0c0c]/80 border-4 border-[#facc15] rounded-full w-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
                  style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                />
                <div className="text-white font-orbitron font-bold text-sm mt-2 drop-shadow-[0px_2px_4px_rgba(0,0,0,0.8)]">DOWN</div>
              </div>
            )}
            
            <div 
              className="absolute left-[400px] xl:left-[460px] bottom-[50px] xl:bottom-[60px] flex items-end justify-start z-20 pointer-events-none transition-all duration-75"
              style={{ transform: `translateY(-${boardY * 4}px)` }}
            >
              {introStep === 'dialogue' ? (
                <div className="flex items-end justify-center gap-4 mb-4 translate-x-12">
                  <img src="/assets/expedition/boy1_idle.gif" alt="Hero 1" className="w-40 h-40 object-contain" />
                  <img src="/assets/expedition/girl_idle.gif" alt="Hero 2" className="w-40 h-40 object-contain" />
                  <img src="/assets/expedition/boy2_idle.gif" alt="Hero 3" className="w-40 h-40 object-contain" />
                </div>
              ) : (
                <img 
                  ref={partyBoardImgRef}
                  src={isMovingUp ? "/assets/expedition/party_board_normal.png" : "/assets/expedition/party_board_falling.png"} 
                  alt="Party Board" 
                  className="w-[200px] lg:w-[250px] object-contain drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)] relative z-10" 
                />
              )}
            </div>
          </>
        ) : null}

        {/* Right: Enemy Sprite Frame (Exact 89df9fb style) */}
        {!isBoss ? (
          <div className="flex items-end justify-center gap-4 -translate-x-10 z-10 pb-[100px] lg:pb-[120px]">
            {enemies.length > 1 ? (
              enemies.map((e, idx) => {
                if (e.hp <= 0 && isEndingBattle) return null;
                const isCurrent = idx === targetEnemyIndex;
                const isAttacking = currentTurnUnit && !currentTurnUnit.isHero && currentTurnUnit.unit.id === e.id;
                
                return (
                  <div 
                    key={e.id} 
                    className="flex flex-col items-center gap-3 cursor-pointer transition-all"
                    onClick={() => e.hp > 0 && setTargetEnemyIndex(idx)}
                  >
                    <div className="w-24 h-2 bg-[#0f0c0c]/80 border-2 border-white/50 flex mb-2 shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6">
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
              <div className="flex flex-col items-center gap-3 -translate-x-20 z-10 pb-[100px] lg:pb-[120px]">
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

      {/* ── Bakunawa Intro Dialogue Overlay ── */}
      {introStep === 'dialogue' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none pb-[20%]">
          <div 
            className="pointer-events-auto flex items-center gap-3 sm:gap-6 bg-[#0f0c0c]/90 border-[4px] border-[#facc15] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] p-4 sm:p-6 max-w-2xl w-[90%] -skew-x-3 cursor-pointer hover:bg-[#1a1515] transition-colors"
            onClick={() => {
              if (dialogueIndex < introDialogue.length - 1) {
                setDialogueIndex(i => i + 1);
              } else {
                setIntroStep('combat');
              }
            }}
          >
            <div className="text-4xl sm:text-5xl bg-black border-2 border-slate-700 p-1 shrink-0 flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 overflow-hidden">
              {introDialogue[dialogueIndex].avatar.includes('.png') ? <img src={introDialogue[dialogueIndex].avatar} className="w-full h-full object-cover" /> : introDialogue[dialogueIndex].avatar}
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-orbitron font-black text-[#facc15] text-lg sm:text-xl uppercase tracking-widest mb-1">{introDialogue[dialogueIndex].name}</span>
              <span className="text-white font-medium text-sm sm:text-lg leading-snug font-sans">{introDialogue[dialogueIndex].text}</span>
              <span className="text-slate-400 text-[10px] sm:text-xs font-bold mt-2 sm:mt-3 animate-pulse uppercase tracking-wider">Click anywhere to continue...</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Sliding Bottom Combat HUD Wrapper ── */}
      <div 
        className={`absolute bottom-0 left-0 w-full z-40 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isHeroTurn && introStep !== 'dialogue' ? 'translate-y-0' : 'translate-y-[110%]'}`}
      >
        {/* Bottom Combat HUD: Action Command Panel (Mobile / Tablet - Compact & Clean Layout) */}
        <div className="lg:hidden flex flex-col items-center justify-between gap-1.5 sm:gap-3 bg-[#1e2238] border-t-[2px] sm:border-t-[4px] border-[#0f0c0c] shadow-[0px_-3px_0px_0px_#0f0c0c] p-2 sm:p-3 pb-safe">
        {/* Active Hero Status Badge */}
        <div className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-3 px-2 py-1 sm:px-4 sm:py-2 bg-[#0f0c0c] text-[#facc15] border-[2px] sm:border-[3px] border-[#facc15] font-orbitron font-black text-[9px] sm:text-sm uppercase tracking-wider -skew-x-6">
          <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-[#da2d46] fill-current animate-pulse" />
          <span className="truncate">ACTIVE TURN: {isHeroTurn ? activeHero.name.toUpperCase() : "ENEMY ATTACK PHASE"}</span>
        </div>

        {/* Command Grid: 2x2 on Mobile */}
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

          <button onClick={onFlee} disabled={isEndingBattle} className="col-span-2 sm:col-span-1 px-1.5 py-1.5 sm:px-4 sm:py-3 bg-[#2a2d43] text-white border-[2px] sm:border-[4px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-[8px] sm:text-sm uppercase -skew-x-6 hover:bg-[#383d5a] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center sm:justify-start gap-1 sm:gap-2 active:translate-y-0.5 active:shadow-none">
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
            <div className="flex flex-col text-left justify-center">
              <span className="leading-tight">RETREAT</span>
              <span className="text-[6px] sm:text-2xs font-bold opacity-80 leading-tight hidden sm:block">Flee Battle</span>
            </div>
          </button>
        </div>
      </div>

        {/* ── Bottom Combat HUD: Desktop PC (89df9fb UI) ── */}
        <div className="hidden lg:flex items-center justify-between gap-4 bg-[#1e2238] border-t-[4px] border-[#0f0c0c] shadow-[0px_-4px_0px_0px_#0f0c0c] p-4">
        {/* Active Hero Status Badge (Far Left) */}
        <div className="flex items-center gap-3 px-4 py-2 bg-[#0f0c0c] text-[#facc15] border-[3px] border-[#facc15] font-orbitron font-black text-sm uppercase tracking-wider -skew-x-6 shrink-0">
          <Zap className="w-4 h-4 text-[#da2d46] fill-current animate-pulse shrink-0" />
          <span>ACTIVE TURN: {isHeroTurn ? activeHero.name.toUpperCase() : "ENEMY ATTACK PHASE"}</span>
        </div>

        {/* Command Buttons (Right Aligned, Full Two-Line Text from 89df9fb) */}
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
            className="px-4 py-3 bg-[#eab308] text-[#0f0c0c] border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-[#facc15] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2 active:translate-y-0.5 active:shadow-none"
          >
            <div className="flex flex-col text-left">
              <span>SKIP (TEST)</span>
              <span className="text-2xs font-bold opacity-80">Auto Win</span>
            </div>
          </button>
        </div>
      </div>
      </div>

      {/* ── PROJECTILES & PARRY BUTTON OVERLAY ── */}
      {isShrineBandit && (
        <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
          
          {/* VISUAL HITBOX DEBUGGING HIDDEN */}

          {projectiles.map(p => {
            const charging = p.chargeElapsed < CHARGE_DURATION;
            const chargeProgress = Math.min(1, p.chargeElapsed / CHARGE_DURATION);
            // Base size 64px. Grow from ~25px → 128px during charge, lock at 128px when fired.
            const BASE = 64;
            const FULL = BASE * 2; // 128px = final big size
            const sizePx = charging ? BASE * (0.4 + chargeProgress * 1.6) : FULL;
            const glowColor = p.type === 'blue' ? 'rgba(0,100,255,0.9)' : 'rgba(255,180,0,0.9)';
            const glowSize = charging ? Math.round(chargeProgress * 30) : 30;
            return (
              <img 
                key={p.id}
                src={p.type === 'blue' ? "/assets/expedition/blue_orb.png" : "/assets/expedition/gold_orb.png"}
                alt="Orb"
                className="absolute object-contain animate-[spin_3s_linear_infinite]"
                style={{ 
                  width: `${sizePx}px`,
                  height: `${sizePx}px`,
                  left: `${p.x}%`,
                  bottom: `${p.y}px`,
                  transform: 'translateX(-50%)',
                  filter: `drop-shadow(0 0 ${glowSize}px ${glowColor})`,
                }}
              />
            );
          })}
          
          {showParryHint && !isHeroTurn && enemy.id.startsWith('bakunawa') && activeAction === 'none' && introStep === 'combat' && (
            <div className="absolute top-4 left-4 sm:left-12 z-[70] pointer-events-none animate-pulse">
              <div className="px-6 py-3 bg-[#0f0c0c]/80 border-[3px] border-[#4ade80] text-[#4ade80] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] font-orbitron font-bold text-sm sm:text-base uppercase -skew-x-6">
                Hint: Press SPACE to Parry
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TOPMOST OVERLAYS CONTAINER (z-[60]): Minigames, QTEs, Spells always on top of floor, boss, and HUD ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[60]">
        <div className="pointer-events-auto w-full max-w-2xl flex items-center justify-center p-4">
          {activeAction === 'rhythm' && (
            <RhythmHighwayOverlay 
              mode="attack"
              preset={enemy.preset}
              isCapture={false}
              onComplete={(stats) => handleRhythmComplete(stats, false)}
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