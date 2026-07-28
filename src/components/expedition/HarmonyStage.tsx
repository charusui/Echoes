import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Sword, Sparkles, Shield, Disc, Zap, ArrowLeft, Users, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
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
  baseY: number;
  vy: number;
  amplitude: number;
  frequency: number;
  speed: number;
  chargeElapsed: number;
  spawnTime: number;
};

export type Beam = {
  id: number;
  yPercent: number;
  heightPercent: number;
  state: 'warning' | 'firing' | 'done';
  elapsed: number;
};

const CHARGE_DURATION = 900;

interface HarmonyStageProps {
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

export function HarmonyStage({
  party,
  enemyId,
  enemyGauntlet,
  dex,
  onCombatResult,
  onFlee,
  onUpdateParty,
  onTurnUpdate,
}: HarmonyStageProps) {
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

  const partyList = useMemo(() => Object.values(party), [party]);
  const turnQueue: TurnUnit[] = useMemo(() => {
    const queue: TurnUnit[] = [];
    const maxLen = Math.max(partyList.length, enemies.length);
    for (let i = 0; i < maxLen; i++) {
      if (partyList[i]) queue.push({ isHero: true, unit: partyList[i]! });
      else if (partyList.length > 0) queue.push({ isHero: true, unit: partyList[i % partyList.length]! });

      if (enemies[i]) queue.push({ isHero: false, unit: enemies[i]! });
      else if (enemies.length > 0) queue.push({ isHero: false, unit: enemies[i % enemies.length]! });
    }
    return queue;
  }, [partyList, enemies]);

  const [turnIndex, setTurnIndex] = useState(enemy.id.startsWith('bakunawa') ? 1 : 0);

  const currentTurnUnit = turnQueue[turnIndex % turnQueue.length] || turnQueue[0]!;
  const isHeroTurn = currentTurnUnit.isHero;
  const activeHero = useMemo(() => {
    if (isHeroTurn) return currentTurnUnit.unit as HeroProfile;
    const prevIdx = (turnIndex - 1 + turnQueue.length) % turnQueue.length;
    const prevUnit = turnQueue[prevIdx];
    return (prevUnit && prevUnit.isHero) ? prevUnit.unit as HeroProfile : partyList[0]!;
  }, [isHeroTurn, currentTurnUnit, turnIndex, turnQueue, partyList]);

  const [activeAction, setActiveAction] = useState<'none' | 'rhythm' | 'spell' | 'parry' | 'attune'>('none');
  const [parryStanceActive, setParryStanceActive] = useState(false);
  const [enemyFrame, setEnemyFrame] = useState(0);
  const [isPartyDrawerOpen, setIsPartyDrawerOpen] = useState(false);
  const [introStep, setIntroStep] = useState<'dialogue' | 'transition' | 'hint' | 'combat'>(
    enemy.id.startsWith('bakunawa') ? 'dialogue' : 'combat'
  );

  const [isShooting, setIsShooting] = useState(false);
  const isShootingRef = useRef(false);

  const [dialogueIndex, setDialogueIndex] = useState(0);
  const introDialogue = useMemo(() => [
    { name: "Maelle", avatar: party['maelle']?.avatar || "👩🏽", text: "Is that the Bakunawa?! Wow, it's absolutely massive! This is going to be so epic, let's go!" },
    { name: "Lune", avatar: party['lune']?.avatar || "👶🏽", text: "We have to protect the shrine and everyone in it! Let's work together and stay safe, okay?" },
    { name: "Gustave", avatar: party['gustave']?.avatar || "🧑🏽", text: "Stay sharp, both of you. One wrong move and we're fish food. Wait for the perfect moment to parry." }
  ], [party]);

  const [boardY, setBoardY] = useState(20);
  const boardYRef = useRef(20);
  const [isMovingUp, setIsMovingUp] = useState(false);
  const [isDashing, setIsDashing] = useState(false);
  const keys = useRef({ w: false, s: false, shift: false });
  const previousBakunawaY = useRef(0);
  const [bakunawaY, setBakunawaY] = useState(0);

  const [parryFlashes, setParryFlashes] = useState<{ id: number }[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const [beams, setBeams] = useState<Beam[]>([]);
  const beamsRef = useRef<Beam[]>([]);

  const dashStateRef = useRef({ lastDash: 0, isDashing: false, dashTimer: 0 });
  const attackManagerRef = useRef({ currentPattern: 0, state: 'waiting', timer: performance.now(), shotsFired: 0 });
  const lastDamageTimeRef = useRef(0);

  const bakunawaDesktopImgRef = useRef<HTMLImageElement>(null);
  const bakunawaMobileImgRef = useRef<HTMLImageElement>(null);
  const bakunawaMouthBottomPxRef = useRef(300);
  const bakunawaMouthXPercentRef = useRef(85);
  const combatContainerRef = useRef<HTMLDivElement>(null);
  const partyBoardImgRef = useRef<HTMLImageElement>(null);
  const partyGroupRef = useRef<HTMLDivElement>(null);
  const partyBoardRectRef = useRef({ left: 0, bottom: 0, width: 0, height: 0, leftPct: 0, rightPct: 0 });

  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isHeroTurn || enemy.staggered) return;
    if (e.pointerType === 'mouse' && e.buttons === 0) return;

    const container = combatContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const yPct = 100 - ((e.clientY - rect.top) / rect.height) * 100;
    const clamped = Math.max(0, Math.min(100, yPct));

    setIsMovingUp(clamped > boardYRef.current);
    boardYRef.current = clamped;
    setBoardY(clamped);
  }, [isHeroTurn, enemy.staggered]);

  const handleLeftPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    touchStartY.current = e.clientY;
    touchStartTime.current = performance.now();
    handlePointerMove(e);
  }, [handlePointerMove]);

  const handleLeftPointerUp = useCallback((e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsMovingUp(false);

    const timeElapsed = performance.now() - touchStartTime.current;
    const distance = Math.abs(e.clientY - touchStartY.current);

    if (distance > 40 && timeElapsed < 250 && performance.now() - dashStateRef.current.lastDash > 1500) {
      dashStateRef.current.isDashing = true;
      dashStateRef.current.dashTimer = performance.now();
      dashStateRef.current.lastDash = performance.now();
      setIsDashing(true);
    }
  }, []);

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

  const advanceTurnRef = useRef<((overrideIndex?: number) => void) | null>(null);

  const tryParry = useCallback(() => {
    const flashId = Date.now();
    setParryFlashes(prev => [...prev, { id: flashId }]);
    setTimeout(() => {
      setParryFlashes(prev => prev.filter(f => f.id !== flashId));
    }, 250);

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
        beamsRef.current = [];
        setBeams([]);
        setTimeout(() => {
          advanceTurnRef.current?.();
        }, 1200);
      } else {
        projectilesRef.current.splice(goldOrbIdx, 1);
        setProjectiles([...projectilesRef.current]);
        audioEngine.playHitSFX('good');
        setActiveAction('parry');
      }
    }
  }, [enemy.id, triggerDamagePopup, setEnemy]);

  const tryParryRef = useRef(tryParry);
  useEffect(() => { tryParryRef.current = tryParry; }, [tryParry]);

  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [isEndingBattle, setIsEndingBattle] = useState(false);
  const [ghostHp, setGhostHp] = useState(enemy.hp);
  const [hpShaking, setHpShaking] = useState(false);
  const [bossAttackVariation, setBossAttackVariation] = useState<'dual_slam' | 'right_sweep'>('dual_slam');
  const [bossAttackPhase, setBossAttackPhase] = useState<'idle' | 'rise' | 'down' | 'slam' | 'sweep_prep'>('idle');
  const [canCounterAttack, setCanCounterAttack] = useState(false);
  const [parryResolved, setParryResolved] = useState(false);

  useEffect(() => {
    setGhostHp(enemy?.hp || 0);
  }, [targetEnemyIndex]);

  useEffect(() => {
    if (enemy.hp < ghostHp) {
      setHpShaking(true);
      const shakeTimer = setTimeout(() => setHpShaking(false), 400);
      const ghostTimer = setTimeout(() => setGhostHp(enemy.hp), 800);
      return () => { clearTimeout(shakeTimer); clearTimeout(ghostTimer); };
    } else if (enemy.hp > ghostHp) {
      setGhostHp(enemy.hp);
    }
  }, [enemy.hp, ghostHp]);

  useEffect(() => {
    if (!isShrineBandit) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W') {
        keys.current.w = true;
        setIsMovingUp(true);
        if (partyGroupRef.current) partyGroupRef.current.style.transition = 'none';
      }
      if (e.key === 's' || e.key === 'S') {
        keys.current.s = true;
        setIsMovingUp(false);
        if (partyGroupRef.current) partyGroupRef.current.style.transition = 'none';
      }
      if (e.key === 'Shift') { keys.current.shift = true; }
      if (e.key === ' ' && !isHeroTurn && enemy.id.startsWith('bakunawa') && activeAction === 'none') {
        e.preventDefault();
        tryParryRef.current();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W') {
        keys.current.w = false;
        if (!keys.current.s) {
          setIsMovingUp(false);
          if (partyGroupRef.current) partyGroupRef.current.style.transition = '';
        }
      }
      if (e.key === 's' || e.key === 'S') {
        keys.current.s = false;
        if (!keys.current.w && partyGroupRef.current) {
          partyGroupRef.current.style.transition = '';
        }
      }
      if (e.key === 'Shift') { keys.current.shift = false; }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let frameId: number;
    let lastTime = performance.now();

    // Core Game Loop - Now highly robust against desyncs
    const loop = () => {
      const time = performance.now(); // Bulletproof time fetching
      const dt = time - lastTime;
      lastTime = time;

      let dashSpeedMult = 1;
      if (keys.current.shift && time - dashStateRef.current.lastDash > 1500) {
        dashStateRef.current.isDashing = true;
        dashStateRef.current.dashTimer = time;
        dashStateRef.current.lastDash = time;
        setIsDashing(true);
      }
      if (dashStateRef.current.isDashing) {
        if (time - dashStateRef.current.dashTimer < 200) {
          dashSpeedMult = 3.5;
        } else {
          dashStateRef.current.isDashing = false;
          setIsDashing(false);
        }
      }

      if ((keys.current.w || keys.current.s) && introStep === 'combat' && !isHeroTurn && !enemy.staggered) {
        const speed = 0.15 * dashSpeedMult;
        if (keys.current.w) boardYRef.current = Math.min(100, boardYRef.current + dt * speed);
        else if (keys.current.s) boardYRef.current = Math.max(0, boardYRef.current - dt * speed);
        setBoardY(boardYRef.current);
      }

      let currentBakunawaY = previousBakunawaY.current;
      if (enemy.id.startsWith('bakunawa')) {
        currentBakunawaY += (boardYRef.current - currentBakunawaY) * 0.04;
      }
      if (Math.abs(previousBakunawaY.current - currentBakunawaY) > 0.05) {
        previousBakunawaY.current = currentBakunawaY;
        setBakunawaY(currentBakunawaY);
      }

      const combatEl = combatContainerRef.current;
      const imgEl = window.innerWidth < 1024 ? bakunawaMobileImgRef.current : bakunawaDesktopImgRef.current;
      if (combatEl && imgEl && imgEl.offsetWidth > 0) {
        const combatRect = combatEl.getBoundingClientRect();
        const imgRect = imgEl.getBoundingClientRect();
        const combatH = combatEl.clientHeight;
        const combatW = combatEl.clientWidth;
        const mouthFromCombatTop = (imgRect.top - combatRect.top) + imgRect.height * 0.65;
        bakunawaMouthBottomPxRef.current = combatH - mouthFromCombatTop;
        const mouthFromCombatLeft = (imgRect.left - combatRect.left) + (imgRect.width * 0.12);
        bakunawaMouthXPercentRef.current = Math.min(98, Math.max(50, (mouthFromCombatLeft / combatW) * 100));
      } else {
        // Safe fallbacks if image bounds aren't ready
        bakunawaMouthBottomPxRef.current = window.innerHeight * 0.5;
        bakunawaMouthXPercentRef.current = 85;
      }

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

      let am = attackManagerRef.current;
      if (!isHeroTurn && enemy.id.startsWith('bakunawa') && activeAction === 'none' && introStep === 'combat' && !enemy.staggered) {
        let hitAny = false;

        const spawnOrb = (type: 'blue' | 'gold', vy = 0, amp = 0, freq = 0, yOffsetPx = 0) => {
          projectilesRef.current.push({
            id: performance.now() + Math.random(),
            type,
            x: bakunawaMouthXPercentRef.current,
            baseY: bakunawaMouthBottomPxRef.current + yOffsetPx,
            y: bakunawaMouthBottomPxRef.current + yOffsetPx,
            vy,
            amplitude: amp,
            frequency: freq,
            speed: 0.02 + Math.random() * 0.015,
            chargeElapsed: 0,
            spawnTime: time
          });
        };

        if (am.state === 'waiting') {
          if (time - am.timer > 1500) {
            am.state = 'firing';
            am.timer = time;
            am.shotsFired = 0;
            am.currentPattern = Math.floor(Math.random() * 5);
          }
        } else if (am.state === 'firing') {
          const timeInPattern = time - am.timer;

          if (am.currentPattern === 0) {
            if (timeInPattern > am.shotsFired * 300 && am.shotsFired < 4) {
              spawnOrb('blue', 0, 0, 0, (Math.random() - 0.5) * 40);
              am.shotsFired++;
            } else if (am.shotsFired >= 4) {
              am.state = 'waiting'; am.timer = time;
            }
          }
          else if (am.currentPattern === 1) {
            if (am.shotsFired === 0) {
              spawnOrb('blue', 0, 0, 0);
              spawnOrb('blue', 0.04, 0, 0);
              spawnOrb('blue', -0.04, 0, 0);
              spawnOrb('gold', 0, 0, 0, -80);
              am.shotsFired++;
              am.state = 'waiting'; am.timer = time;
            }
          }
          else if (am.currentPattern === 2) {
            if (timeInPattern > am.shotsFired * 500 && am.shotsFired < 3) {
              spawnOrb('blue', 0, 60, 0.005);
              am.shotsFired++;
            } else if (am.shotsFired >= 3) {
              am.state = 'waiting'; am.timer = time;
            }
          }
          else if (am.currentPattern === 3) {
            if (am.shotsFired === 0) {
              spawnOrb('blue', 0, 0, 0, -100);
              spawnOrb('blue', 0, 0, 0, 100);
              spawnOrb('gold', 0, 0, 0, 0);
              am.shotsFired++;
              am.state = 'waiting'; am.timer = time;
            }
          }
          else if (am.currentPattern === 4) {
            if (am.shotsFired === 0) {
              // Fully randomized vertical spawning area (from 15% to 85% of screen height)
              const targetYPct = 15 + Math.random() * 70;
              beamsRef.current.push({ id: time, yPercent: Math.max(10, Math.min(90, targetYPct)), heightPercent: 25, state: 'warning', elapsed: 0 });
              am.shotsFired++;
              am.state = 'waiting';
              am.timer = time + 2500;
            }
          }
        }

        const br = partyBoardRectRef.current;
        const boardBottom = br.bottom;
        const boardTop = br.bottom + br.height;

        projectilesRef.current = projectilesRef.current.map(p => {
          if (p.chargeElapsed < CHARGE_DURATION) {
            return { ...p, chargeElapsed: p.chargeElapsed + dt };
          }
          const flightTime = time - (p.spawnTime + CHARGE_DURATION);
          const newX = p.x - dt * p.speed;
          const newY = p.baseY + (p.vy * flightTime) + (Math.sin(flightTime * p.frequency) * p.amplitude);
          return { ...p, x: newX, y: newY, chargeElapsed: p.chargeElapsed + dt };
        }).filter(p => {
          if (p.x < -10) return false;
          if (p.x < br.rightPct && p.x > br.leftPct && p.y > boardBottom - 10 && p.y < boardTop + 20) {
            hitAny = true;
            return false;
          }
          return true;
        });

        let beamHitAny = false;
        const combatH = combatContainerRef.current?.clientHeight || 600;
        const boardTopPct = (br.bottom + br.height) / combatH * 100;
        const boardBottomPct = br.bottom / combatH * 100;

        beamsRef.current = beamsRef.current.map(b => {
          const newElapsed = b.elapsed + dt;
          let newState = b.state;
          if (b.state === 'warning' && newElapsed > 1500) {
            newState = 'firing';
            audioEngine.playHitSFX('sick');
          } else if (b.state === 'firing' && newElapsed > 2200) {
            newState = 'done';
          }

          if (newState === 'firing') {
            const beamTop = b.yPercent + (b.heightPercent / 2);
            const beamBottom = b.yPercent - (b.heightPercent / 2);
            if (boardTopPct > beamBottom && boardBottomPct < beamTop) {
              beamHitAny = true;
            }
          }
          return { ...b, elapsed: newElapsed, state: newState };
        }).filter(b => b.state !== 'done');

        if ((hitAny || beamHitAny) && time - lastDamageTimeRef.current > 400) {
          handleProjectileHitRef.current(hitAny ? 20 : 35);
          lastDamageTimeRef.current = time;
        }

        setProjectiles([...projectilesRef.current]);
        setBeams([...beamsRef.current]);

      } else if (projectilesRef.current.length > 0 || beamsRef.current.length > 0) {
        projectilesRef.current = [];
        setProjectiles([]);
        beamsRef.current = [];
        setBeams([]);
      }

      const currentlyShooting = am.state === 'firing' || beamsRef.current.length > 0 || projectilesRef.current.length > 0;
      if (currentlyShooting !== isShootingRef.current) {
        isShootingRef.current = currentlyShooting;
        setIsShooting(currentlyShooting);
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(frameId);
    };
  }, [isShrineBandit, isHeroTurn, enemy.id, activeAction, introStep, enemy.staggered, handlePointerMove]);

  const activeAttackingEnemy = !isHeroTurn ? (currentTurnUnit.unit as EnemyProfile) : enemy;

  useEffect(() => {
    if (onTurnUpdate) {
      const isMobile = window.innerWidth < 1024;
      if (isMobile) {
        onTurnUpdate(null);
      } else {
        onTurnUpdate({
          queue: turnQueue.map(u => ({
            isHero: u.isHero,
            avatar: u.isHero ? (u.unit as HeroProfile).avatar : '👹'
          })),
          index: turnIndex
        });
      }
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

  useEffect(() => {
    if (activeAction === 'parry' && isBoss) {
      setCanCounterAttack(false);
      setParryResolved(false);
      if (bossAttackVariation === 'dual_slam') {
        setBossAttackPhase('rise');
        const t1 = setTimeout(() => setBossAttackPhase('down'), 450);
        const t2 = setTimeout(() => setBossAttackPhase('slam'), 600);
        return () => { clearTimeout(t1); clearTimeout(t2); };
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
    bgm.play().catch(() => { });

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
    if (isEndingBattle) return;

    let nextIdx = overrideIndex !== undefined ? overrideIndex : (turnIndex + 1) % turnQueue.length;
    let nextUnit = turnQueue[nextIdx]!;

    let loopCount = 0;
    while (loopCount < turnQueue.length) {
      const isDead = nextUnit.unit.hp <= 0 || (nextUnit.isHero && partyList.every(h => h.hp <= 0));
      const isStaggeredEnemy = !nextUnit.isHero && (nextUnit.unit as EnemyProfile).staggered;

      if (!isDead && !isStaggeredEnemy) {
        break;
      }

      if (isStaggeredEnemy && !isDead) {
        setEnemies(prev => {
          const n = [...prev];
          const eIdx = n.findIndex(e => e.id === nextUnit.unit.id);
          if (eIdx !== -1) n[eIdx] = { ...n[eIdx], staggered: false, stagger: 0 };
          return n;
        });
      }

      nextIdx = (nextIdx + 1) % turnQueue.length;
      nextUnit = turnQueue[nextIdx]!;
      loopCount++;
    }

    setTurnIndex(nextIdx);

    if (!nextUnit.isHero) {
      if (enemies[0]?.id.startsWith('bakunawa')) {
        attackManagerRef.current.state = 'waiting';
        attackManagerRef.current.timer = performance.now() + 1000;
      } else {
        setTimeout(() => {
          if (!isEndingBattle) {
            if (isBoss) setBossAttackVariation(v => v === 'dual_slam' ? 'right_sweep' : 'dual_slam');
            setActiveAction('parry');
          }
        }, 800);
      }
    }
  }, [turnIndex, turnQueue, isEndingBattle, isBoss, partyList, enemies]);

  useEffect(() => {
    advanceTurnRef.current = advanceTurn;
  }, [advanceTurn]);

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
      if (prev.staggered) return { ...prev, hp: nextHp };

      const nextStagger = Math.min(prev.maxStagger, prev.stagger + staggerGain);
      const isStaggered = nextStagger >= prev.maxStagger;
      return { ...prev, hp: nextHp, stagger: isStaggered ? prev.maxStagger : nextStagger, staggered: isStaggered };
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
      return { ...prev, hp: nextHp };
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
      if (parried) setCanCounterAttack(true);
      else setCanCounterAttack(false);
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

      setTimeout(() => checkPostTurnStates(null, Object.values(updatedPartyMap)), 1000);
      return updatedPartyMap;
    });

    setParryStanceActive(false);
    if (isBoss) {
      if (enemy.id.startsWith('bakunawa')) {
        if (parried) setEnemy(prev => ({ ...prev, stagger: prev.maxStagger, staggered: true }));
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
  }, [enemy, parryStanceActive, activeHero, onUpdateParty, partyList, checkPostTurnStates, advanceTurn, triggerDamagePopup, isEndingBattle, isBoss]);

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

    if (updatedEnemyHp <= 0) checkPostTurnStates(updatedEnemyHp, partyList);

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
      className="relative flex-1 w-full h-full overflow-hidden bg-[#151828] bg-cover bg-center bg-no-repeat select-none"
      style={{ backgroundImage: `linear-gradient(rgba(15, 12, 12, 0.35), rgba(15, 12, 12, 0.5)), url('${isShrineBandit ? '/assets/expedition/shrine_bg.png' : '/assets/expedition/battle_bg.png'}')` }}
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
        @keyframes dashWake {
          0% { opacity: 0.6; transform: scale(1) translateY(0); filter: blur(0px); }
          100% { opacity: 0; transform: scale(1.4) translateY(30px); filter: blur(4px); }
        }
        @keyframes beamSlideLeft {
          0% { background-position: 0 0; }
          100% { background-position: -200px 0; }
        }
        @keyframes beamShake {
          0% { transform: translateY(0px); }
          25% { transform: translateY(-4px); }
          50% { transform: translateY(4px); }
          75% { transform: translateY(-2px); }
          100% { transform: translateY(0px); }
        }
      `}</style>

      {/* PORTRAIT LOCK OVERLAY FOR MOBILE DEVICES */}
      <div className="portrait:flex hidden absolute inset-0 z-[9999] bg-[#0f0c0c] flex-col items-center justify-center p-6 text-center shadow-inner overflow-hidden pointer-events-auto">
        <div className="animate-bounce mb-6">
          <svg className="w-20 h-20 text-[#facc15]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
        </div>
        <h2 className="text-white font-orbitron font-black text-3xl mb-4 tracking-wider text-shadow-md">ROTATE DEVICE</h2>
        <p className="text-slate-300 font-sans text-lg">This boss encounter requires landscape mode for the intended layout.</p>
      </div>

      {enemy.hp <= 0 && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-[flashWhite_2s_ease-out_forwards]" />
      )}

      {/* BOSS RENDER (Desktop & Mobile) */}
      {isBoss && (
        <>
          <div className="hidden lg:flex absolute inset-0 z-[1] pointer-events-none items-center justify-center overflow-visible">
            <div className={`animate-boss-breathe w-full h-full flex flex-col items-center justify-center relative ${enemy.id.startsWith('bakunawa') ? 'translate-x-[40%]' : ''}`}>
              <div
                className={`w-full h-full flex flex-col items-center transition-transform duration-75 ${enemy.id.startsWith('bakunawa') ? 'justify-end pb-16' : 'justify-center'}`}
                style={enemy.id.startsWith('bakunawa') ? { transform: `translateY(-${bakunawaY * 0.65}%)` } : {}}
              >
                {enemy.staggered && enemy.hp > 0 && (
                  <div className={`absolute z-20 flex flex-col items-center justify-center pointer-events-none animate-fadeIn ${enemy.id.startsWith('bakunawa') ? 'top-[5%] left-[25%]' : '-translate-y-40 sm:-translate-y-52'}`}>
                    <div className="relative w-48 h-16 flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center justify-around animate-[spin_3s_linear_infinite] drop-shadow-[0_0_12px_#facc15]">
                        <span className="text-3xl animate-bounce">⭐</span><span className="text-xl text-[#facc15] animate-pulse">✨</span><span className="text-3xl animate-bounce" style={{ animationDelay: '200ms' }}>⭐</span><span className="text-xl text-[#facc15] animate-pulse" style={{ animationDelay: '400ms' }}>✨</span><span className="text-3xl animate-bounce" style={{ animationDelay: '600ms' }}>⭐</span>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-around animate-[spin_2s_linear_infinite_reverse] drop-shadow-[0_0_8px_#ff8000] scale-75 opacity-90">
                        <span className="text-2xl">💫</span><span className="text-2xl">💫</span><span className="text-2xl">💫</span>
                      </div>
                    </div>
                  </div>
                )}
                <img
                  ref={bakunawaDesktopImgRef}
                  src={enemy.id.startsWith('bakunawa') ? (bossAttackPhase !== 'idle' || isShooting ? "/assets/expedition/bakunawa_mouth_open_transparent.png" : "/assets/expedition/bakunawa_normal_transparent.png") : "/assets/expedition/echo_boss_body.png"}
                  alt={enemy.name}
                  className={`w-auto ${enemy.id.startsWith('bakunawa') ? 'h-[75%] sm:h-[85%]' : 'h-[50%] sm:h-[55%]'} max-w-none object-contain transition-transform ${introStep === 'dialogue' ? '-translate-y-12 sm:-translate-y-16 duration-[1500ms] ease-in-out' : 'translate-y-[150px] sm:translate-y-[170px] duration-300'} ${bossAttackPhase !== 'idle' ? 'scale-110 drop-shadow-[0_0_20px_rgba(218,45,70,0.8)]' : 'scale-100'}`}
                />
              </div>
            </div>
          </div>

          <div className="lg:hidden absolute inset-0 z-[1] pointer-events-none flex items-center justify-center overflow-visible">
            <div className={`animate-boss-breathe w-full h-full flex flex-col items-center justify-center relative ${enemy.id.startsWith('bakunawa') ? 'translate-x-[25%]' : ''}`}>
              <div className={`w-full h-full flex flex-col items-center transition-transform duration-75 ${enemy.id.startsWith('bakunawa') ? 'justify-end pb-[10%]' : 'justify-center'}`} style={enemy.id.startsWith('bakunawa') ? { transform: `translateY(calc(26% - ${bakunawaY * 0.65}%))` } : {}}>
                {enemy.staggered && enemy.hp > 0 && (
                  <div className={`absolute z-20 flex flex-col items-center justify-center pointer-events-none animate-fadeIn ${enemy.id.startsWith('bakunawa') ? 'top-[5%] left-[25%]' : '-translate-y-28 sm:-translate-y-36'}`}>
                    <div className="relative w-36 h-12 flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center justify-around animate-[spin_3s_linear_infinite] drop-shadow-[0_0_10px_#facc15]">
                        <span className="text-2xl animate-bounce">⭐</span><span className="text-base text-[#facc15] animate-pulse">✨</span>
                      </div>
                    </div>
                  </div>
                )}
                <img
                  ref={bakunawaMobileImgRef}
                  src={enemy.id.startsWith('bakunawa') ? (bossAttackPhase !== 'idle' || isShooting ? "/assets/expedition/bakunawa_mouth_open_transparent.png" : "/assets/expedition/bakunawa_normal_transparent.png") : "/assets/expedition/echo_boss_body.png"}
                  alt={enemy.name}
                  className={`max-w-none object-contain transition-transform ${introStep === 'dialogue' ? '-translate-y-12 sm:-translate-y-16 duration-[1500ms] ease-in-out' : 'translate-y-0 duration-300'} ${bossAttackPhase !== 'idle' ? 'scale-110 drop-shadow-[0_0_20px_rgba(218,45,70,0.8)]' : 'scale-100'} ${enemy.id.startsWith('bakunawa') ? 'h-[75%] sm:h-[85%] w-auto translate-x-[20%]' : 'h-[60%] sm:h-[70%] w-auto'}`}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Desktop Boss Wings */}
      {isBoss && !enemy.id.startsWith('bakunawa') && (
        <>
          <div className="hidden lg:flex absolute inset-0 pointer-events-none items-center justify-center overflow-visible z-[2]">
            <div className="animate-boss-breathe w-full h-full flex items-center justify-center">
              {isRightSweepAttack ? (
                <div className="flex items-center justify-center w-full h-full">
                  <div className="w-1/2 flex justify-end items-center h-full">
                    <img src="/assets/expedition/echo_boss_wings_strike_left.png" alt="Left Wing Base Form" className="w-auto h-[52%] sm:h-[57%] max-w-none object-contain -translate-y-4 sm:-translate-y-6" />
                  </div>
                  <div className="w-1/2" />
                </div>
              ) : !(bossAttackPhase === 'slam' || (activeAction === 'parry' && enemyFrame >= 4 && !isBoss)) && (
                <div className={`flex items-center justify-center transition-all ${bossAttackPhase === 'rise' ? 'duration-500 ease-out scale-120 -translate-y-36 sm:-translate-y-48 animate-pulse drop-shadow-[0_0_35px_rgba(250,204,21,0.9)]' : bossAttackPhase === 'down' ? 'duration-150 ease-in scale-95 translate-y-10 sm:translate-y-14' : 'duration-300 scale-100 -translate-y-4 sm:-translate-y-6'}`}>
                  <img src="/assets/expedition/echo_boss_wings_strike_left.png" alt="Left Wing Base Form" className="w-auto h-[52%] sm:h-[57%] max-w-none object-contain" />
                  <img src="/assets/expedition/echo_boss_wings_strike_right.png" alt="Right Wing Base Form" className="w-auto h-[52%] sm:h-[57%] max-w-none object-contain" />
                </div>
              )}
            </div>
          </div>
          <div className="hidden lg:flex absolute inset-0 pointer-events-none items-center justify-center overflow-visible z-15">
            <div className="animate-boss-breathe w-full h-full flex items-center justify-center">
              {isRightSweepAttack ? (
                <div className="flex items-center justify-center w-full h-full">
                  <div className="w-1/2" />
                  <div className="w-1/2 flex justify-start items-center h-full overflow-visible">
                    <img src="/assets/expedition/echo_boss_wings_slam_right.png" alt="Right Wing Sweep Slam" className={`w-auto h-[54%] sm:h-[59%] max-w-none object-contain transition-all ${bossAttackPhase === 'sweep_prep' ? 'duration-300 scale-125 translate-x-[80px] sm:translate-x-[180px] translate-y-12 sm:translate-y-20 drop-shadow-[0_0_30px_rgba(218,45,70,0.8)]' : 'duration-700 ease-out scale-135 -translate-x-[140px] sm:-translate-x-[300px] translate-y-12 sm:translate-y-20 drop-shadow-[0_0_50px_rgba(218,45,70,1)]'}`} />
                  </div>
                </div>
              ) : (bossAttackPhase === 'slam' || (activeAction === 'parry' && enemyFrame >= 4 && !isBoss)) && (
                <div className="flex items-center justify-center transition-all duration-200 scale-130 translate-y-20 sm:translate-y-28 drop-shadow-[0_0_40px_rgba(218,45,70,1)]">
                  <img src="/assets/expedition/echo_boss_wings_slam_left.png" alt="Left Wing Slam on Floor" className="w-auto h-[54%] sm:h-[59%] max-w-none object-contain" />
                  <img src="/assets/expedition/echo_boss_wings_slam_right.png" alt="Right Wing Slam on Floor" className="w-auto h-[54%] sm:h-[59%] max-w-none object-contain" />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 top-[45%] lg:top-[54%] bg-repeat-x bg-bottom pointer-events-none z-10 opacity-95 drop-shadow-[0_-8px_16px_rgba(0,0,0,0.95)] transition-transform duration-[1500ms] ease-in-out ${introStep === 'dialogue' ? 'translate-y-0' : 'translate-y-[200%]'}`}
        style={{ backgroundImage: `url('${isShrineBandit ? '/assets/expedition/shrine_ground.png' : '/assets/expedition/battle_ground.png'}')`, backgroundSize: 'auto 100%' }}
      />

      {/* Mobile Combat Controls Overlay */}
      {!isHeroTurn && enemy.id.startsWith('bakunawa') && introStep === 'combat' && !enemy.staggered && (
        <div className="lg:hidden absolute inset-0 z-[45] flex pointer-events-none">
          {/* Left Screen: Drag & Swipe to Dash */}
          <div
            className="w-1/2 h-full flex items-center justify-start p-4 touch-none pointer-events-auto"
            onPointerDown={handleLeftPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handleLeftPointerUp}
            onPointerCancel={handleLeftPointerUp}
          >
            <div className="h-[50%] w-12 border-2 border-white/20 rounded-full flex flex-col items-center justify-between p-2 opacity-50 bg-black/20 pointer-events-none">
              <ChevronUp className="text-white w-6 h-6" />
              <span className="font-orbitron font-bold text-white text-[10px] -rotate-90 tracking-widest">DRAG</span>
              <ChevronDown className="text-white w-6 h-6" />
            </div>
          </div>

          {/* Right Screen: Tap to Parry */}
          <div
            className="w-1/2 h-full flex items-center justify-end p-6 touch-none pointer-events-auto"
            onPointerDown={() => {
              if (activeAction === 'none') tryParryRef.current();
            }}
          >
            <div className="w-24 h-24 border-[4px] border-[#facc15]/50 rounded-full flex items-center justify-center opacity-60 bg-[#facc15]/20 animate-pulse pointer-events-none">
              <span className="font-orbitron font-black text-[#facc15] text-sm tracking-wider">PARRY</span>
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">

        {beams.map(b => {
          const isWarning = b.state === 'warning';
          return (
            <div
              key={b.id}
              className={`absolute z-20 flex items-center justify-center overflow-hidden transition-all duration-150 ${isWarning ? 'opacity-80' : 'opacity-100'
                }`}
              style={{
                left: '-20%',
                right: `${100 - bakunawaMouthXPercentRef.current}%`,
                height: `${b.heightPercent}%`,
                bottom: `calc(${b.yPercent}% - ${b.heightPercent / 2}%)`,
              }}
            >
              {isWarning ? (
                <div className="relative w-full h-full bg-gradient-to-r from-transparent via-[#da2d46]/40 to-[#da2d46]/80 border-y-[2px] border-[#da2d46]/60 flex items-center overflow-hidden shadow-[0_0_30px_rgba(218,45,70,0.6)]">
                  <div className="absolute w-full h-[2px] bg-[#da2d46] shadow-[0_0_10px_#da2d46,0_0_20px_#da2d46] animate-pulse" />
                  <div
                    className="absolute w-full h-full opacity-30 animate-[beamSlideLeft_0.5s_linear_infinite]"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 20px, #da2d46 20px, #da2d46 40px)',
                      backgroundSize: '200% 100%'
                    }}
                  />
                  <div className="w-full flex justify-around opacity-90 relative z-10">
                    {[...Array(6)].map((_, i) => (
                      <span key={i} className="font-orbitron font-black text-[#ff3b56] text-sm sm:text-2xl tracking-widest animate-[ping_0.5s_ease-in-out_infinite]">
                        LOCKED
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-end animate-[beamShake_0.05s_linear_infinite]">
                  <div className="absolute w-[120%] h-[250%] bg-[#38bdf8] blur-[30px] sm:blur-[50px] opacity-60 z-0 rounded-l-full" />

                  <div className="absolute w-[110%] h-[160%] bg-[#a855f7] blur-[20px] mix-blend-screen opacity-80 z-10 rounded-l-full animate-pulse" />

                  <div
                    className="absolute w-full h-[120%] z-10 opacity-90 mix-blend-color-dodge animate-[beamSlideLeft_0.15s_linear_infinite]"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(110deg, transparent, transparent 10px, rgba(255,255,255,0.9) 10px, rgba(255,255,255,0.9) 25px)',
                      backgroundSize: '200% 100%',
                      borderRadius: '100px 0 0 100px'
                    }}
                  />

                  <div
                    className="absolute w-full h-[120%] z-10 opacity-70 mix-blend-color-dodge animate-[beamSlideLeft_0.1s_linear_infinite_reverse]"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(70deg, transparent, transparent 15px, #38bdf8 15px, #38bdf8 35px)',
                      backgroundSize: '200% 100%',
                      borderRadius: '100px 0 0 100px'
                    }}
                  />

                  <div className="absolute w-[105%] h-[50%] bg-white rounded-l-full shadow-[inset_0_0_20px_#38bdf8,0_0_30px_#ffffff,0_0_60px_#facc15] z-20 animate-[beamShake_0.1s_linear_infinite]" />

                  <div className="absolute right-0 w-24 sm:w-40 h-[400%] bg-white rounded-full blur-2xl z-30 opacity-100 animate-pulse" />
                  <div className="absolute right-0 w-12 sm:w-20 h-[300%] bg-[#facc15] rounded-full blur-xl mix-blend-screen z-30 opacity-100 animate-pulse" />
                </div>
              )}
            </div>
          );
        })}

        {projectiles.map(p => {
          const charging = p.chargeElapsed < CHARGE_DURATION;
          const chargeProgress = Math.min(1, p.chargeElapsed / CHARGE_DURATION);
          const BASE = 64;
          const FULL = BASE * 2;
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
                width: `${sizePx}px`, height: `${sizePx}px`,
                left: `${p.x}%`, bottom: `${p.y}px`, transform: 'translateX(-50%)',
                filter: `drop-shadow(0 0 ${glowSize}px ${glowColor})`,
              }}
            />
          );
        })}

        {introStep === 'hint' && enemy.id.startsWith('bakunawa') && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity animate-in fade-in duration-500">
            <div className="flex flex-col landscape:flex-row items-center gap-4 landscape:gap-8 bg-[#0f0c0c]/95 border-[4px] border-[#4ade80] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] p-4 sm:p-8 max-w-3xl w-[95%] -skew-x-3 text-center landscape:text-left">
              <div className="flex flex-col gap-3 flex-1">
                <h2 className="font-orbitron font-black text-xl sm:text-4xl text-[#4ade80] uppercase tracking-widest drop-shadow-md">Boss Battle Rules</h2>
                <div className="text-white font-sans text-sm sm:text-lg leading-relaxed space-y-2">
                  <p><span className="text-[#facc15] font-bold">MOVE:</span> <span className="hidden lg:inline">Use <strong className="text-[#38bdf8]">W / S keys</strong></span><span className="inline lg:hidden">Drag <strong className="text-[#38bdf8]">Left Screen</strong> up/down</span> to steer.</p>
                  <p><span className="text-[#38bdf8] font-bold">DASH:</span> <span className="hidden lg:inline">Hold <strong className="text-[#facc15]">SHIFT</strong></span><span className="inline lg:hidden">Swipe <strong className="text-[#facc15]">Quickly</strong></span> for a speed boost.</p>
                </div>
              </div>
              <div className="flex flex-col gap-4 flex-1 items-center landscape:items-stretch">
                <div className="bg-[#1e2238] p-3 border-l-[4px] border-[#facc15] text-left flex flex-col gap-2 text-sm sm:text-base">
                  <p>⚠️ <strong className="text-white">DODGE</strong> the <span className="text-blue-400 font-bold">Blue Orbs</span> and <span className="text-red-400 font-bold">Red Beams</span>.</p>
                  <p>⚔️ <strong className="text-white">PARRY</strong> the <span className="text-[#facc15] font-bold">Gold Orbs</span> by <span className="hidden lg:inline">pressing <strong className="text-[#da2d46]">SPACE</strong></span><span className="inline lg:hidden">tapping <strong className="text-[#da2d46]">Right Screen</strong></span>!</p>
                </div>
                <button
                  onClick={() => setIntroStep('combat')}
                  className="w-full py-3 sm:py-4 bg-[#4ade80] text-[#0f0c0c] border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-lg sm:text-xl uppercase hover:bg-[#6bee9c] hover:-translate-y-1 transition-transform active:translate-y-0 active:shadow-none"
                >
                  OK, LET'S GO!
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        {damagePopups.map(p => {
          const baseX = p.customX || (p.isEnemy ? '75%' : '30%');
          const baseY = p.customY || (p.isEnemy ? '50%' : '45%');
          return (
            <div key={p.id} className="absolute flex items-center justify-center pointer-events-none" style={{ left: baseX, top: baseY, transform: `translate(calc(-50% + ${p.offsetX}px), calc(-50% + ${p.offsetY}px))` }}>
              <div className="absolute inset-0 flex items-center justify-center">
                {p.effectType === 'slash' && <div className="w-32 h-4 bg-white rounded-full shadow-[0_0_20px_#facc15,0_0_40px_#facc15]" style={{ animation: 'slashFx 0.4s ease-out forwards' }} />}
                {p.effectType === 'magic' && <Sparkles className="w-32 h-32 text-[#facc15] fill-[#facc15] opacity-0" style={{ animation: 'magicFx 0.6s ease-out forwards' }} />}
                {p.effectType === 'block' && <div className="w-20 h-20 border-[#38bdf8] rounded-full opacity-0 shadow-[0_0_15px_#38bdf8]" style={{ animation: 'blockFx 0.5s ease-out forwards' }} />}
              </div>
              <div className="font-orbitron font-black tracking-widest text-4xl sm:text-6xl text-white relative z-10" style={{ color: p.color, WebkitTextStroke: '3px #0f0c0c', textShadow: '4px 4px 0 #0f0c0c, 0 0 25px currentColor', animation: 'damageNumberBounce 1s cubic-bezier(0.36, 0, 0.66, -0.56) forwards' }}>
                {p.text}
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute top-2 inset-x-0 flex flex-col items-center justify-center z-20 gap-2 pointer-events-none px-2 sm:px-4">
        <div className={`w-full max-w-xl mx-auto flex flex-col gap-1 pointer-events-auto transition-opacity duration-1000 ${introStep === 'dialogue' ? 'opacity-0' : 'opacity-100'}`}>
          <div className="flex items-baseline justify-between font-orbitron tracking-wide px-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            <span className="font-black text-sm sm:text-base text-white uppercase tracking-wider leading-tight">{enemy.name}</span>
            <span className="text-[10px] sm:text-xs text-[#facc15] font-bold text-right">LV. {enemy.level} {enemy.isBoss && 'BOSS'} — {enemy.hp}/{enemy.maxHp} HP</span>
          </div>
          <div className="relative w-full h-3 sm:h-4 bg-[#0f0c0c]/90 border-[2px] border-slate-700 shadow-[0_4px_16px_rgba(0,0,0,0.9)] overflow-hidden" style={{ animation: hpShaking ? 'hpShake 0.4s ease-out both' : 'none' }}>
            <div className="absolute top-0 left-0 h-full bg-white transition-all duration-700 ease-out" style={{ width: `${ghostPct}%` }} />
            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#da2d46] to-[#ff4b68] transition-all duration-300 ease-out" style={{ width: `${hpPct}%` }} />
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

        {!isShrineBandit && (
          <div className="absolute right-2 sm:right-4 top-2 sm:top-4 flex items-center gap-1 sm:gap-2 bg-[#1e2238]/90 border-[2px] sm:border-[3px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] px-2 py-1 sm:px-3 sm:py-1.5 -skew-x-2 backdrop-blur-sm pointer-events-auto z-50">
            <span className="font-orbitron font-black text-[8px] sm:text-2xs text-[#facc15] uppercase border-r border-slate-600 pr-1.5 sm:pr-2">TURN</span>
            <div className="flex items-center gap-1 sm:gap-1.5">
              {turnQueue.map((unit, idx) => {
                const isCurrent = idx === turnIndex % turnQueue.length;
                return (
                  <div key={idx} className={`w-5 h-5 sm:w-auto sm:h-auto sm:px-1 sm:py-0.5 border border-[#0f0c0c] flex items-center justify-center transition-all ${isCurrent ? 'bg-[#facc15] text-[#0f0c0c] scale-110 sm:scale-105 shadow-[1px_1px_0px_0px_#0f0c0c] z-10' : unit.isHero ? 'bg-[#2a2d43] text-white opacity-90 sm:opacity-100' : 'bg-[#da2d46] text-white opacity-90 sm:opacity-100'}`}>
                    {unit.isHero ? <img src={(unit.unit as HeroProfile).avatar} alt="Hero" className="w-full h-full sm:w-5 sm:h-5 object-cover" /> : <span className="text-[10px] sm:text-xs">👹</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MOVED: Party Drawer extracted from z-20 container and elevated to z-50 to sit above the mobile drag overlay */}
      <div className={`lg:hidden absolute z-50 top-[25%] left-0 flex items-center pointer-events-auto transition-all duration-300 ease-in-out ${introStep === 'dialogue' ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${isPartyDrawerOpen ? 'translate-x-0' : '-translate-x-[calc(100%-2.5rem)]'}`}>
        <div className="flex flex-col gap-1.5 p-2 bg-[#151828]/95 backdrop-blur-md border-y-[3px] border-r-[3px] border-[#0f0c0c] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.4)] w-[220px] rounded-r-xl">
          {partyList.map((hero) => {
            const isTurn = isHeroTurn && activeHero.id === hero.id;
            const inst = dex[hero.equippedId] || dex['cebuano_gitara']!;
            return (
              <div key={hero.id} className={`flex items-center gap-2 p-1.5 border-[2px] border-[#0f0c0c] transition-all -skew-x-3 ${isTurn ? 'bg-[#facc15] text-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c]' : 'bg-[#1e2238]/90 text-white opacity-90'}`}>
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

      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-end">

        <div className={`hidden lg:flex absolute bottom-[100px] left-6 flex-row gap-3 z-40 transition-opacity duration-1000 ${introStep === 'dialogue' ? 'opacity-0 pointer-events-none' : 'opacity-100'} pointer-events-auto`}>
          {partyList.map((hero) => {
            const isTurn = isHeroTurn && activeHero.id === hero.id;
            const inst = dex[hero.equippedId] || dex['cebuano_gitara']!;
            return (
              <div key={hero.id} className={`flex items-center gap-2 p-2 border-[3px] border-[#0f0c0c] transition-all -skew-x-6 w-48 ${isTurn ? 'bg-[#facc15] text-[#0f0c0c] scale-105 shadow-[4px_4px_0px_0px_#0f0c0c]' : 'bg-[#1e2238]/90 text-white opacity-90 backdrop-blur-sm'}`}>
                <img src={hero.avatar} alt={hero.name} className="w-10 h-10 object-cover border-2 border-[#0f0c0c] shrink-0" />
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="font-orbitron font-black text-xs flex items-center justify-between gap-1">
                    <span className="truncate">{hero.name}</span>
                    <span className="text-[10px] bg-white border border-[#0f0c0c] w-4 h-4 flex items-center justify-center shrink-0">
                      <img src={`/assets/instruments/${inst.id}.png`} alt={inst.name} className="w-full h-full object-contain scale-110 mix-blend-multiply" />
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-bold font-orbitron mt-0.5">
                    <span>HP: {hero.hp}/{hero.maxHp}</span>
                  </div>
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({ length: hero.maxAp }).map((_, i) => (
                      <div key={i} className={`w-2 h-2 border border-[#0f0c0c] ${i < hero.ap ? (isTurn ? 'bg-[#da2d46]' : 'bg-[#38bdf8]') : 'bg-slate-700'}`} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {isShrineBandit ? (
          <>
            {introStep === 'combat' && (
              <div className="hidden lg:flex absolute left-8 xl:left-12 top-[35%] flex-col items-center pointer-events-auto z-50">
                <div className="text-[#38bdf8] font-orbitron font-black text-sm mb-2 drop-shadow-[0px_2px_4px_rgba(0,0,0,0.8)]">SHIFT: DASH</div>
                <div className="text-white font-orbitron font-bold text-sm mb-2 mt-4 drop-shadow-[0px_2px_4px_rgba(0,0,0,0.8)]">UP</div>
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
                    setBoardY(val);
                  }}
                  onPointerUp={() => setIsMovingUp(false)}
                  onMouseLeave={() => setIsMovingUp(false)}
                  className={`flex-1 appearance-none border-4 rounded-full h-32 w-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] transition-colors ${isDashing ? 'bg-[#38bdf8] border-white' : 'bg-[#0f0c0c]/80 border-[#facc15]'}`}
                  style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                />
                <div className="text-white font-orbitron font-bold text-sm mt-2 drop-shadow-[0px_2px_4px_rgba(0,0,0,0.8)]">DOWN</div>
              </div>
            )}

            <div
              ref={partyGroupRef}
              className="absolute left-[5%] lg:left-[10%] xl:left-[12%] flex items-end justify-start z-20 transition-all duration-75 pointer-events-auto"
              style={{ bottom: `calc(10% + ${boardY * 0.65}%)` }}
            >
              {introStep === 'dialogue' ? (
                <div className="flex items-end justify-center gap-4">
                  <img src="/assets/expedition/boy1_idle.gif" className="w-24 h-24 sm:w-40 sm:h-40 object-contain" />
                  <img src="/assets/expedition/girl_idle.gif" className="w-24 h-24 sm:w-40 sm:h-40 object-contain" />
                  <img src="/assets/expedition/boy2_idle.gif" className="w-24 h-24 sm:w-40 sm:h-40 object-contain" />
                </div>
              ) : (
                <div className="relative">
                  {isDashing && (
                    <img
                      src={isMovingUp ? "/assets/expedition/party_board_normal.png" : "/assets/expedition/party_board_falling.png"}
                      className="absolute inset-0 w-[200px] lg:w-[250px] object-contain opacity-50 blur-sm brightness-200 animate-[dashWake_0.3s_ease-out_forwards] -translate-x-12 z-0"
                    />
                  )}
                  <img
                    ref={partyBoardImgRef}
                    src={isMovingUp ? "/assets/expedition/party_board_normal.png" : "/assets/expedition/party_board_falling.png"}
                    alt="Party Board"
                    className="w-[200px] lg:w-[250px] object-contain drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)] relative z-10"
                  />
                </div>
              )}
              {parryFlashes.map(flash => (
                <svg key={flash.id} viewBox="0 0 100 200" className="absolute -right-12 top-1/2 -translate-y-1/2 w-16 h-32 lg:w-20 lg:h-40 drop-shadow-[0_0_12px_rgba(255,255,255,0.9)] animate-parry-arc pointer-events-none z-30">
                  <path d="M 0 0 C 100 50, 100 150, 0 200 C 50 150, 50 50, 0 0 Z" fill="white" />
                </svg>
              ))}
            </div>
          </>
        ) : null}

        {!isBoss ? (
          <div className="absolute inset-x-0 bottom-[15%] lg:bottom-[12%] flex items-end justify-center gap-4 z-20 pointer-events-auto">
            {enemies.length > 1 ? (
              enemies.map((e, idx) => {
                if (e.hp <= 0 && isEndingBattle) return null;
                const isCurrent = idx === targetEnemyIndex;
                const isAttacking = currentTurnUnit && !currentTurnUnit.isHero && currentTurnUnit.unit.id === e.id;

                return (
                  <div key={e.id} className="flex flex-col items-center gap-3 cursor-pointer transition-all" onClick={() => e.hp > 0 && setTargetEnemyIndex(idx)}>
                    <div className="w-24 h-2 bg-[#0f0c0c]/80 border-2 border-white/50 flex mb-2 shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6">
                      <div className="bg-[#da2d46] h-full transition-all" style={{ width: `${Math.max(0, (e.hp / e.maxHp) * 100)}%` }} />
                    </div>
                    <div className={`relative transition-transform flex items-center justify-center ${e.staggered ? 'animate-bounce' : isAttacking ? 'animate-pulse scale-110' : ''}`}>
                      <img src={`/assets/expedition/enemy_frame_${isAttacking ? enemyFrame : 0}.png`} alt={e.name} className={`w-40 h-40 lg:w-56 lg:h-56 object-contain scale-x-[-1] transition-all duration-300 ${isCurrent ? 'drop-shadow-[0px_0px_12px_rgba(250,204,21,1)]' : 'drop-shadow-[0px_12px_24px_rgba(0,0,0,0.8)]'}`} />
                      {e.hp <= 0 && <div className="absolute inset-0 bg-red-600/50 mix-blend-color-burn rounded-full animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_infinite]" />}
                    </div>
                    <span className={`font-orbitron font-black text-xs lg:text-sm uppercase tracking-wider text-[#da2d46] bg-[#0f0c0c] px-4 py-1 border-[2px] border-[#da2d46] shadow-[3px_3px_0px_0px_#0f0c0c] -skew-x-6 ${!isCurrent ? 'opacity-80' : ''}`}>{e.name}</span>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className={`relative transition-transform flex items-center justify-center ${enemy.staggered ? 'animate-bounce' : ''}`}>
                  <img src={`/assets/expedition/enemy_frame_${enemyFrame}.png`} alt={enemy.name} className="w-56 h-56 lg:w-72 lg:h-72 object-contain drop-shadow-[0px_12px_24px_rgba(0,0,0,0.8)] scale-x-[-1]" />
                </div>
                <span className="font-orbitron font-black text-sm uppercase tracking-wider text-[#da2d46] bg-[#0f0c0c] px-4 py-1 border-[2px] border-[#da2d46] shadow-[3px_3px_0px_0px_#0f0c0c] -skew-x-6">{enemy.name}</span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {introStep === 'dialogue' && (
        <div
          className="absolute inset-0 z-[70] flex items-center justify-center pointer-events-auto pb-[20%] cursor-pointer"
          onClick={() => {
            if (dialogueIndex < introDialogue.length - 1) setDialogueIndex(i => i + 1);
            else setIntroStep('hint');
          }}
        >
          <div className="flex items-center gap-3 sm:gap-6 bg-[#0f0c0c]/90 border-[4px] border-[#facc15] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] p-4 sm:p-6 max-w-2xl w-[90%] -skew-x-3 hover:scale-[1.02] transition-transform pointer-events-none">
            <img src={introDialogue[dialogueIndex].avatar} className="w-16 h-16 sm:w-20 sm:h-20 object-cover shrink-0" />
            <div className="flex flex-col justify-center">
              <span className="font-orbitron font-black text-[#facc15] text-lg sm:text-xl uppercase tracking-widest mb-1">{introDialogue[dialogueIndex].name}</span>
              <span className="text-white font-medium text-sm sm:text-lg leading-snug font-sans">{introDialogue[dialogueIndex].text}</span>
              <span className="text-slate-400 text-[10px] sm:text-xs font-bold mt-2 sm:mt-3 animate-pulse uppercase tracking-wider">Click anywhere to continue...</span>
            </div>
          </div>
        </div>
      )}

      <div className={`absolute bottom-0 left-0 w-full z-40 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isHeroTurn && introStep !== 'dialogue' ? 'translate-y-0' : 'translate-y-[110%]'}`}>

        <div className="lg:hidden flex flex-col items-center justify-between gap-1.5 sm:gap-3 bg-[#1e2238] border-t-[2px] sm:border-t-[4px] border-[#0f0c0c] shadow-[0px_-3px_0px_0px_#0f0c0c] p-2 sm:p-3 pb-safe">
          <div className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-3 px-2 py-1 sm:px-4 py-2 bg-[#0f0c0c] text-[#facc15] border-[2px] sm:border-[3px] border-[#facc15] font-orbitron font-black text-[9px] sm:text-sm uppercase tracking-wider -skew-x-6">
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
              <Shield className="w-4 h-4 fill-current" />
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
            <button onClick={() => onCombatResult({ victory: true, xpGained: 1000 })} disabled={isEndingBattle} className="col-span-2 sm:col-span-1 px-1.5 py-1.5 sm:px-4 sm:py-3 bg-fuchsia-600 text-white border-[2px] sm:border-[4px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-[8px] sm:text-sm uppercase -skew-x-6 hover:bg-fuchsia-500 transition-all flex items-center justify-center sm:justify-start gap-1 sm:gap-2 active:translate-y-0.5 active:shadow-none">
              <div className="flex flex-col text-left justify-center">
                <span className="leading-tight text-white">SKIP BATTLE ()</span>
              </div>
            </button>
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-between gap-4 bg-[#1e2238] border-t-[4px] border-[#0f0c0c] shadow-[0px_-4px_0px_0px_#0f0c0c] p-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-[#0f0c0c] text-[#facc15] border-[3px] border-[#facc15] font-orbitron font-black text-sm uppercase tracking-wider -skew-x-6 shrink-0">
            <Zap className="w-4 h-4 text-[#da2d46] fill-current animate-pulse shrink-0" />
            <span>ACTIVE TURN: {isHeroTurn ? activeHero.name.toUpperCase() : "ENEMY ATTACK PHASE"}</span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button onClick={handleCommandAttack} disabled={!isHeroTurn || activeHero.ap < 1 || activeAction !== 'none' || isEndingBattle} className="px-4 py-3 bg-[#da2d46] text-white border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-[#ff3b56] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2 active:translate-y-0.5 active:shadow-none">
              <Sword className="w-4 h-4 fill-current" />
              <div className="flex flex-col text-left">
                <span>RHYTHM ATTACK</span>
                <span className="text-2xs font-bold opacity-80">(1 AP) Note Highway</span>
              </div>
            </button>
            <button onClick={handleCommandSkill} disabled={!isHeroTurn || activeHero.ap < 2 || activeAction !== 'none' || isEndingBattle} className="px-4 py-3 bg-[#facc15] text-[#0f0c0c] border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-[#ffdf3d] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2 active:translate-y-0.5 active:shadow-none">
              <Sparkles className="w-4 h-4 fill-current" />
              <div className="flex flex-col text-left">
                <span>OVERDRIVE ULTIMATE</span>
                <span className="text-2xs font-bold opacity-80">(2 AP) Magic Circle</span>
              </div>
            </button>
            <button onClick={handleCommandAttune} disabled={!isHeroTurn || activeAction !== 'none' || isEndingBattle} className="px-4 py-3 bg-[#38bdf8] text-[#0f0c0c] border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-[#5cd0ff] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2 active:translate-y-0.5 active:shadow-none">
              <Disc className="w-4 h-4 fill-current" />
              <div className="flex flex-col text-left">
                <span>ATTUNE / CAPTURE</span>
                <span className="text-2xs font-bold opacity-80">(HP &lt; 35%) Seal Instrument</span>
              </div>
            </button>
            <button onClick={handleCommandDefend} disabled={!isHeroTurn || activeAction !== 'none' || isEndingBattle} className="px-4 py-3 bg-[#4ade80] text-[#0f0c0c] border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-[#6bee9c] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2 active:translate-y-0.5 active:shadow-none">
              <Shield className="w-4 h-4 fill-current" />
              <div className="flex flex-col text-left">
                <span>PARRY STANCE</span>
                <span className="text-2xs font-bold opacity-80">(+2 AP) Block &amp; Counter</span>
              </div>
            </button>
            <button onClick={onFlee} disabled={isEndingBattle} className="px-4 py-3 bg-[#2a2d43] text-white border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-[#383d5a] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2 active:translate-y-0.5 active:shadow-none">
              <ArrowLeft className="w-4 h-4" />
              <div className="flex flex-col text-left">
                <span>RETREAT</span>
                <span className="text-2xs font-bold opacity-80">Flee Battle</span>
              </div>
            </button>
            <button onClick={() => onCombatResult({ victory: true, xpGained: 1000 })} disabled={isEndingBattle} className="px-4 py-3 bg-fuchsia-600 text-white border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-fuchsia-500 transition-all flex items-center gap-2 active:translate-y-0.5 active:shadow-none">
              <div className="flex flex-col text-left">
                <span>SKIP BATTLE</span>
                <span className="text-2xs font-bold opacity-80 text-white">Instant Win</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {activeAction !== 'none' && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto w-full h-full max-w-4xl flex items-center justify-center landscape:scale-[0.75] sm:landscape:scale-100 origin-center [&>div]:!bg-transparent [&>div]:!backdrop-blur-none">
            {activeAction === 'rhythm' && <RhythmHighwayOverlay mode="attack" preset={enemy.preset} isCapture={false} onComplete={(stats) => handleRhythmComplete(stats, false)} />}
            {activeAction === 'spell' && <UltimateSequenceOverlay hero={activeHero} instrument={dex[activeHero.equippedId] || dex['cebuano_gitara']!} onComplete={handleSpellComplete} />}
            {activeAction === 'parry' && !parryResolved && !canCounterAttack && <ParryQteOverlay enemyName={enemy.name} onParry={handleParryResult} />}
            {activeAction === 'parry' && isBoss && bossAttackPhase === 'slam' && canCounterAttack && <WingSlamCounterMinigame bossName={enemy.name} onComplete={handleWingSlamCounterComplete} />}
            {activeAction === 'attune' && <AttuneCaptureOverlay enemy={enemy} onComplete={handleAttuneComplete} />}
          </div>
        </div>
      )}
    </div>
  );
}