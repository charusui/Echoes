import { useState, useEffect, useRef, useCallback } from 'react';
import { audioEngine } from '../../services/audioSynth';
import wildSummit_bg from '../../assets/boss_bg/wildSummit_bg.png?v=2';
import { type HeroProfile, type HarmonydexEntry } from '../../types/expedition';
import { UltimateSequenceOverlay } from './UltimateSequenceOverlay';
import { ArrowLeft as PxArrowLeft, ArrowRight as PxArrowRight, Tablet as PxDeviceTablet } from 'pixelarticons/react';
import { Kbd, PixelBar, PixelButton, PixelPanel } from '../ui';
import { cn } from '../../lib/cn';

interface SantelmoBossBattleProps {
  party: Record<string, HeroProfile>;
  bossName: string;
  dex: Record<string, HarmonydexEntry>;
  onComplete: (result: { victory: boolean; xpGained: number }) => void;
  onFlee?: () => void;
}

// Game Constants
const GAME_W = 1000;
const GAME_H = 600;
const GROUND_Y = 520;
const GRAVITY = 0.5;
const JUMP_VELOCITY = -12;
const MOVE_SPEED = 6;
const PLAYER_W = 40;
const PLAYER_H = 60;
const BOSS_R = 100;
const FIREBALL_R = 15;
const CRATERS = [200, 500, 800]; // X positions

type Fireball = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'ground' | 'sky';
  state: 'active' | 'deflected' | 'dead';
};

export default function SantelmoBossBattle({
  party,
  bossName,
  dex,
  onComplete,
  onFlee,
}: SantelmoBossBattleProps) {
  // Party stats
  const totalPartyHp = Object.values(party).reduce((acc, hero) => acc + hero.maxHp, 0) * 6;
  
  // React state for UI overlays
  const [_frame, setFrame] = useState(0);
  const [gameResult, setGameResult] = useState<'victory' | 'defeat' | null>(null);
  const [transitionState, setTransitionState] = useState<'none' | 'select_p1' | 'select_p2' | 'ultimate'>('none');
  const [introStep, setIntroStep] = useState<'hint' | 'combat'>('hint');
  const [activeHeroId, setActiveHeroId] = useState<string | null>(null);

  useEffect(() => {
    if (gameResult) return;

    const bgm = new Audio('/assets/audio/bgm/volcano_bgm.mp3');
    bgm.loop = true;
    bgm.volume = 0.45;
    bgm.muted = audioEngine.muted;
    bgm.play().catch((err) => {
      console.warn("Autoplay policy blocked volcano BGM:", err);
    });

    return () => {
      bgm.pause();
      bgm.currentTime = 0;
    };
  }, [gameResult]);

  // Mutable Game State
  const state = useRef({
    player: { x: 100, y: GROUND_Y, vx: 0, vy: 0, isSwinging: false, swingTimer: 0, facing: 1 as 1 | -1, invulnTimer: 0, isDashing: false, dashTimer: 0, dashCooldown: 0, canDoubleJump: true },
    boss: { x: GAME_W / 2, y: 150, hp: 3000, maxHp: 3000, phase: 1, hurtTimer: 0 },
    partyHp: totalPartyHp,
    maxPartyHp: totalPartyHp,
    fireballs: [] as Fireball[],
    afterimages: [] as { id: number, x: number, y: number, facing: number, timer: number, colorIndex: number }[],
    windParticles: [] as { id: number, x: number, y: number, timer: number }[],
    keys: { left: false, right: false, up: false, swing: false, dash: false },
    nextFireballId: 0,
    nextAfterimageId: 0,
    spawnTimer: 0,
    skySpawnTimer: 0,
  });

  const animRef = useRef<number | null>(null);

  // Controls Handlers
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const s = state.current.keys;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') s.left = true;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') s.right = true;
    if (e.code === 'KeyW' || e.code === 'ArrowUp') s.up = true;
    if (e.code === 'Space') s.swing = true;
    if (e.code === 'KeyE') s.dash = true;
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const s = state.current.keys;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') s.left = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') s.right = false;
    if (e.code === 'KeyW' || e.code === 'ArrowUp') s.up = false;
    if (e.code === 'Space') s.swing = false;
    if (e.code === 'KeyE') s.dash = false;
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Mobile Controls
  const onButtonDown = (btn: 'left' | 'right' | 'up' | 'swing' | 'dash') => {
    state.current.keys[btn] = true;
  };
  const onButtonUp = (btn: 'left' | 'right' | 'up' | 'swing' | 'dash') => {
    state.current.keys[btn] = false;
  };

  // Game Loop
  useEffect(() => {
    if (gameResult || transitionState !== 'none' || introStep === 'hint') return;

    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      const s = state.current;

      // HMR Safe Initialization for newly added state properties
      if (!s.afterimages) s.afterimages = [];
      if (!s.windParticles) s.windParticles = [];
      if (s.keys.dash === undefined) s.keys.dash = false;
      if (s.player.isDashing === undefined) {
        s.player.isDashing = false;
        s.player.dashTimer = 0;
        s.player.dashCooldown = 0;
        s.nextAfterimageId = 0;
      }
      if (s.player.canDoubleJump === undefined) s.player.canDoubleJump = true;

      // Update Player
      if (!s.player.isDashing) {
        if (s.keys.left) { s.player.vx = -MOVE_SPEED; s.player.facing = -1; }
        else if (s.keys.right) { s.player.vx = MOVE_SPEED; s.player.facing = 1; }
        else { s.player.vx = 0; }
      }

      // Dash initiation
      if (s.keys.dash && s.player.dashCooldown <= 0 && !s.player.isDashing) {
        s.player.isDashing = true;
        s.player.dashTimer = 0.15; // 150ms dash
        s.player.dashCooldown = 1.0;
        s.player.vx = s.player.facing * (MOVE_SPEED * 3.5);
        s.player.vy = 0;
        s.player.invulnTimer = 0.2;
        audioEngine.playHitSFX('parry'); 
      }

      // Dash update
      if (s.player.isDashing) {
        s.player.dashTimer -= dt;
        if (Math.random() > 0.05) { // INCREASED spawn rate significantly
          const colorIndex = Math.floor(Math.random() * 3);
          s.afterimages.push({ id: s.nextAfterimageId++, x: s.player.x, y: s.player.y, facing: s.player.facing, timer: 0.3, colorIndex });
        }
        if (s.player.dashTimer <= 0) {
          s.player.isDashing = false;
          s.player.vx = 0;
        }
      }

      if (s.player.dashCooldown > 0) s.player.dashCooldown -= dt;

      // Update afterimages & wind
      for (let i = s.afterimages.length - 1; i >= 0; i--) {
        s.afterimages[i].timer -= dt;
        if (s.afterimages[i].timer <= 0) s.afterimages.splice(i, 1);
      }
      for (let i = s.windParticles.length - 1; i >= 0; i--) {
        s.windParticles[i].timer -= dt;
        s.windParticles[i].y += 50 * dt; // slowly drift down
        if (s.windParticles[i].timer <= 0) s.windParticles.splice(i, 1);
      }

      if (s.keys.up) {
        if (s.player.y >= GROUND_Y) {
          s.player.vy = JUMP_VELOCITY;
          s.player.canDoubleJump = true;
          s.keys.up = false;
          audioEngine.playHitSFX('ui_click');
        } else if (s.player.canDoubleJump && s.player.vy > -5) {
          s.player.vy = JUMP_VELOCITY * 0.9;
          s.player.canDoubleJump = false;
          s.keys.up = false;
          // Spawn wind below feet
          for (let i = 0; i < 6; i++) {
            s.windParticles.push({ 
              id: s.nextAfterimageId++, 
              x: s.player.x + (Math.random() * 60 - 30), 
              y: s.player.y, // at feet
              timer: 0.3 + Math.random() * 0.2 
            });
          }
          audioEngine.playHitSFX('ui_click');
        }
      }

      s.player.x += s.player.vx;
      s.player.vy += GRAVITY;
      s.player.y += s.player.vy;

      if (s.player.y >= GROUND_Y) {
        s.player.y = GROUND_Y;
        s.player.vy = 0;
        s.player.canDoubleJump = true;
      }

      // Crater Collision
      if (s.player.invulnTimer <= 0 && s.player.y >= GROUND_Y - 10) {
        for (const cx of CRATERS) {
          const craterWidth = GAME_W * 0.1 * (s.boss.phase === 2 ? 1.5 : 1.0);
          if (Math.abs(s.player.x - cx) < craterWidth / 2) {
            s.partyHp -= 30; // Burn damage
            s.player.invulnTimer = 1.0;
            s.player.vy = -8; // Bounce off
            audioEngine.playHitSFX('damage');
            break;
          }
        }
      }
      
      // Clamp bounds
      if (s.player.x < 20) s.player.x = 20;
      if (s.player.x > GAME_W - 20) s.player.x = GAME_W - 20;

      // Invulnerability
      if (s.player.invulnTimer > 0) s.player.invulnTimer -= dt;
      if (s.boss.hurtTimer > 0) s.boss.hurtTimer -= dt;

      // Swinging mechanics
      if (s.keys.swing && !s.player.isSwinging && s.player.swingTimer <= 0) {
        s.player.isSwinging = true;
        s.player.swingTimer = 0.3; // active for 300ms
        audioEngine.playHitSFX('parry'); 
      }
      if (s.player.swingTimer > 0) {
        s.player.swingTimer -= dt;
      } else {
        s.player.isSwinging = false;
      }

      // Spawning Ground Fireballs
      s.spawnTimer -= dt;
      if (s.spawnTimer <= 0) {
        // Roll for how many to spawn: 1 or 2 (slightly more chance of 2 in Phase 2)
        const count = Math.random() < (s.boss.phase === 2 ? 0.4 : 0.3) ? 2 : 1;

        // Select distinct craters
        const selectedCraters: number[] = [];
        const availableCraters = [...CRATERS];
        for (let c = 0; c < count; c++) {
          if (availableCraters.length === 0) break;
          const idx = Math.floor(Math.random() * availableCraters.length);
          selectedCraters.push(availableCraters.splice(idx, 1)[0]!);
        }

        selectedCraters.forEach(craterX => {
          s.fireballs.push({
            id: s.nextFireballId++,
            x: craterX,
            y: GROUND_Y,
            vx: (Math.random() - 0.5) * 2.5, // Slight horizontal drift
            vy: -15 - Math.random() * 5, // Moderately fast upward velocity
            type: 'ground',
            state: 'active'
          });
        });

        // Spawn fireballs faster in Phase 1 (every 0.25 - 0.55s), keeping Phase 2 unchanged
        s.spawnTimer = s.boss.phase === 2
          ? 0.4 + Math.random() * 0.4
          : 0.25 + Math.random() * 0.3;
      }

      // Phase 2: Sky Fireballs
      if (s.boss.phase === 2) {
        s.skySpawnTimer -= dt;
        if (s.skySpawnTimer <= 0) {
          // Spawn 1 or 2 fireballs simultaneously
          const count = Math.random() < 0.3 ? 2 : 1;
          for (let c = 0; c < count; c++) {
            s.fireballs.push({
              id: s.nextFireballId++,
              x: Math.random() * GAME_W,
              y: -50,
              vx: (Math.random() - 0.5) * 4,
              vy: 5 + Math.random() * 4, // Balanced downward speed
              type: 'sky',
              state: 'active'
            });
          }
          // Spawn every 0.4 - 0.9s
          s.skySpawnTimer = 0.4 + Math.random() * 0.5;
        }
      }

      // Update Fireballs
      for (let i = s.fireballs.length - 1; i >= 0; i--) {
        const fb = s.fireballs[i];
        if (fb.state === 'dead') continue;

        // Sky fireballs lightly track the player's X position
        if (fb.type === 'sky' && fb.state === 'active') {
          fb.vx += (s.player.x - fb.x) * 0.002;
          fb.vx = Math.max(-7, Math.min(7, fb.vx)); // Cap horizontal tracking speed
        }

        fb.x += fb.vx;
        fb.vy += fb.type === 'ground' && fb.state === 'active' ? GRAVITY * 0.8 : 0;
        fb.y += fb.vy;

        // Dynamic fireball radius
        const currentFbRadius = FIREBALL_R * (s.boss.phase === 2 ? 1.5 : 1.0);

        // Player Collision
        if (fb.state === 'active' && s.player.invulnTimer <= 0) {
          const dx = Math.abs(fb.x - s.player.x);
          const dy = Math.abs(fb.y - (s.player.y - PLAYER_H/2));
          if (dx < PLAYER_W/2 + currentFbRadius && dy < PLAYER_H/2 + currentFbRadius) {
            // Hit player
            s.partyHp -= 50;
            s.player.invulnTimer = 1.0;
            audioEngine.playHitSFX('damage');
            fb.state = 'dead';
          }
        }

        // Deflect logic
        if (s.player.isSwinging && fb.state === 'active' && fb.type === 'ground') {
          // Check hitbox extending in front of player
          const hitX = s.player.x + (s.player.facing * 40);
          const hitY = s.player.y - PLAYER_H/2;
          const dist = Math.hypot(fb.x - hitX, fb.y - hitY);
          
          if (dist < 60) {
            fb.state = 'deflected';
            // Aim at boss
            const dx = s.boss.x - fb.x;
            const dy = s.boss.y - fb.y;
            const angle = Math.atan2(dy, dx);
            const speed = 20;
            fb.vx = Math.cos(angle) * speed;
            fb.vy = Math.sin(angle) * speed;
            audioEngine.playHitSFX('parry');
            s.player.isSwinging = false; // end swing early on hit
          }
        }

        // Boss Collision (only if deflected)
        if (fb.state === 'deflected') {
          const dx = fb.x - s.boss.x;
          const dy = fb.y - s.boss.y;
          if (Math.hypot(dx, dy) < BOSS_R + currentFbRadius) {
            s.boss.hp -= 100;
            s.boss.hurtTimer = 0.2;
            audioEngine.playHitSFX('boss_damage');
            fb.state = 'dead';
          }
        }

        // Offscreen cleanup
        if (fb.y > GAME_H + 100 || fb.y < -100 || fb.x < -100 || fb.x > GAME_W + 100) {
          fb.state = 'dead';
        }
      }

      // Filter dead fireballs
      s.fireballs = s.fireballs.filter(f => f.state !== 'dead');

      // Check end conditions / transitions
      if (s.boss.phase === 1 && s.boss.hp <= s.boss.maxHp / 2) {
        s.boss.hp = s.boss.maxHp / 2; // Clamp at exactly 250
        setTransitionState('select_p1');
        return; // Stop loop this frame
      }
      
      if (s.boss.phase === 2 && s.boss.hp <= 0) {
        s.boss.hp = 1; // Clamp at 1 until ultimate finishes
        setTransitionState('select_p2');
        return; // Stop loop this frame
      }

      if (s.partyHp <= 0) {
        setGameResult('defeat');
        setTimeout(() => onComplete({ victory: false, xpGained: 0 }), 2000);
      }

      setFrame(f => f + 1); // trigger render
      if (!gameResult) {
        animRef.current = requestAnimationFrame(loop);
      }
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [gameResult, transitionState, introStep, onComplete]);

  const s = state.current;
  const avatar = '/girl_idle.gif'; // Fixed player sprite

  return (
    <div className="w-full h-full flex flex-col bg-plum-950 relative select-none overflow-hidden touch-none">
      {/* PORTRAIT LOCK OVERLAY FOR MOBILE DEVICES - conditionally hidden when game is over */}
      {!gameResult && (
        <div className="portrait:flex hidden absolute inset-0 z-[9999] bg-plum-950 flex-col items-center justify-center gap-4 p-6 text-center pointer-events-auto">
          <PxDeviceTablet className="size-16 text-gold-300 rotate-90" aria-hidden />
          <h2 className="font-bold text-3xl leading-none text-parchment-100">Rotate your device</h2>
          <p className="text-base text-parchment-300">This boss battle is played in landscape.</p>
        </div>
      )}

      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start gap-4 z-50 pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <PixelPanel padding="sm" small className="w-52">
            <PixelBar kind="heal" height={10} segments={0} label="Party" valueText={`${Math.max(0, Math.round(s.partyHp))} / ${s.maxPartyHp}`} value={s.partyHp} max={s.maxPartyHp} transition="width 200ms" />
          </PixelPanel>
          {onFlee && !gameResult && (
            <PixelButton size="sm" variant="ghost" icon={<PxArrowLeft />} onClick={onFlee} className="self-start [text-shadow:0_2px_0_var(--color-ink)]">
              Retreat
            </PixelButton>
          )}
        </div>

        {/* Boss HP */}
        <PixelPanel padding="sm" small className="w-72 pointer-events-auto">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="font-bold text-lg leading-none text-parchment-100">{bossName}</span>
            {s.boss.phase === 2 && <span className="px-1.5 py-0.5 border-2 border-ink bg-hp text-xs font-semibold leading-none text-parchment-100">Phase 2 · Enraged</span>}
          </div>
          <div className="px-frame px-frame-inset px-frame-sm overflow-hidden">
            <div className="relative h-3.5">
              {/* Lower half of the health pool */}
              <div
                className="absolute top-0 right-0 h-full bg-el-brass transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min((s.boss.hp / (s.boss.maxHp / 2)) * 100, 100))}%` }}
              />
              {/* Upper half of the health pool */}
              <div
                className="absolute top-0 right-0 h-full bg-hp shadow-[inset_0_-3px_0_var(--color-hp-dark)] transition-all duration-300"
                style={{ width: `${Math.max(0, ((s.boss.hp - s.boss.maxHp / 2) / (s.boss.maxHp / 2)) * 100)}%` }}
              />
            </div>
          </div>
        </PixelPanel>
      </div>

      {/* Game Window */}
      <div className="flex-1 w-full h-full flex items-center justify-center relative z-10 bg-plum-950 overflow-hidden">
        {/* Fullscreen Container */}
        <div 
          className="relative w-full h-full overflow-hidden"
        >
          {/* Background */}
          <div className="absolute inset-0 z-0">
            <img src={wildSummit_bg} alt="BG" className="w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-plum-950 to-transparent" />
          </div>

          {/* Boss */}
          <div 
            className="absolute z-20 flex items-center justify-center transition-transform"
            style={{ 
              left: `${(s.boss.x / GAME_W) * 100}%`, 
              top: `${(s.boss.y / GAME_H) * 100}%`,
              transform: `translate(-50%, -50%)`
            }}
          >
            <div 
              className="flex items-center justify-center overflow-visible transition-[filter] duration-1000"
              style={{ 
                width: `${(BOSS_R * 3.5 / GAME_W) * 100}vw`, 
                maxWidth: `${BOSS_R * 3.5}px`, 
                height: `${(BOSS_R * 3.5 / GAME_W) * 100}vw`, 
                maxHeight: `${BOSS_R * 3.5}px`, 
                aspectRatio: '1/1',
                transform: s.boss.phase === 1 
                  ? `scale(${s.boss.hurtTimer > 0 ? 1.7 : 1.5 + Math.sin(Date.now() / 800) * 0.15})` 
                  : `scale(${s.boss.hurtTimer > 0 ? 2.7 : 2.5 + Math.sin(Date.now() / 300) * 0.1})`,
                filter: s.boss.hurtTimer > 0 
                  ? 'sepia(1) hue-rotate(220deg) saturate(10) brightness(1.2)' 
                  : (s.boss.phase === 2 ? 'hue-rotate(-25deg) saturate(2) brightness(0.9)' : 'none')
              }}
            >
              {/* Pulsing Glow behind the boss */}
              <div className="absolute inset-8 bg-orange-500 rounded-full blur-[30px] opacity-40 animate-pulse -z-10" />
              <img src="/assets/expedition/santelmo_boss.png?v=2" alt="Santelmo" className="w-full h-full object-contain" />
            </div>
          </div>

          {/* Craters */}
          {CRATERS.map((cx, i) => (
            <div 
              key={i}
              className="absolute z-25 w-[10%] h-[5%] transition-transform duration-1000 origin-center"
              style={{ 
                left: `${(cx / GAME_W) * 100}%`, 
                top: `${(GROUND_Y / GAME_H) * 100}%`,
                transform: `translate(-50%, -85%) scale(${s.boss.phase === 2 ? 1.5 : 1.0})`
              }}
            >
              <img src="/assets/expedition/crater.png?v=2" alt="crater" className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-orange-500 opacity-40 blur-md animate-pulse pointer-events-none" />
            </div>
          ))}

          {/* Afterimages */}
          {(s.afterimages || []).map(img => {
            // Smoothly shift hue from ~100 (green) to ~160 (light green/cyan) based on sequence ID
            const hue = 100 + (img.id * 8) % 60;
            // Removed expensive drop-shadow, using mix-blend-mode for performance
            const filterStyle = `sepia(1) hue-rotate(${hue}deg) saturate(10) brightness(1.5)`;
            return (
            <div 
              key={img.id}
              className="absolute z-25 flex items-end justify-center pointer-events-none transition-opacity duration-200 mix-blend-screen"
              style={{ 
                left: `${(img.x / GAME_W) * 100}%`, 
                top: `${(img.y / GAME_H) * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: `${(PLAYER_W / GAME_W) * 100}%`,
                height: `${(PLAYER_H / GAME_H) * 100}%`,
                opacity: img.timer / 0.3 * 0.9,
                filter: filterStyle
              }}
            >
              <img 
                src={avatar} 
                alt="Afterimage" 
                className="h-[150%] max-w-none object-contain" 
                style={{ transform: `scaleX(${img.facing})` }} 
              />
            </div>
          )})}

          {/* Wind Particles */}
          {(s.windParticles || []).map(wp => (
            <div
              key={wp.id}
              className="absolute z-25 bg-parchment-100/70 rounded-full blur-[1px] pointer-events-none"
              style={{
                left: `${(wp.x / GAME_W) * 100}%`,
                top: `${(wp.y / GAME_H) * 100}%`,
                width: `15px`,
                height: `4px`,
                transform: 'translate(-50%, -50%)',
                opacity: wp.timer / 0.5
              }}
            />
          ))}

          {/* Player */}
          <div 
            className="absolute z-30 flex items-end justify-center"
            style={{ 
              left: `${(s.player.x / GAME_W) * 100}%`, 
              top: `${(s.player.y / GAME_H) * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: `${(PLAYER_W / GAME_W) * 100}%`,
              height: `${(PLAYER_H / GAME_H) * 100}%`,
              opacity: s.player.invulnTimer > 0 && Math.floor(s.player.invulnTimer * 10) % 2 === 0 ? 0.5 : 1
            }}
          >
            <img 
              src={avatar} 
              alt="Player" 
              className="h-[150%] max-w-none object-contain" 
              style={{ transform: `scaleX(${s.player.facing})` }} 
            />
            {/* Bat Swing Hitbox Visual (Baseball Bat) */}
            {s.player.isSwinging && (
              <>
                <div 
                  className="absolute"
                  style={{ 
                    bottom: '75%',
                    left: s.player.facing === 1 ? '40%' : 'auto', 
                    right: s.player.facing === -1 ? '40%' : 'auto',
                    width: '80%',
                    height: '140%',
                    transformOrigin: s.player.facing === 1 ? 'bottom left' : 'bottom right',
                    transform: s.player.facing === 1 ? 'rotate(60deg)' : 'rotate(-60deg)',
                    animation: s.player.facing === 1 ? 'swingRight 0.15s ease-out forwards' : 'swingLeft 0.15s ease-out forwards',
                  }} 
                >
                  <img 
                    src="/assets/expedition/ancestral_gold_bat.png?v=2" 
                    alt="Ancestral Golden Bat"
                    className="w-full h-full object-contain pointer-events-none"
                    style={{ 
                      objectPosition: 'bottom left',
                      transform: s.player.facing === -1 ? 'scaleX(-1)' : 'none' 
                    }}
                  />
                </div>
                
                {/* Dynamic Circular Trail */}
                <svg 
                  className="absolute pointer-events-none"
                  style={{ 
                    bottom: '75%',
                    left: s.player.facing === 1 ? '40%' : 'auto', 
                    right: s.player.facing === -1 ? '40%' : 'auto',
                    width: '160px', 
                    height: '160px',
                    transform: s.player.facing === 1 
                      ? 'translate(-50%, 50%) rotate(0deg)' 
                      : 'translate(50%, 50%) scaleX(-1)', 
                    animation: 'trailFade 0.15s ease-out forwards'
                  }}
                  viewBox="-100 -100 200 200"
                >
                  <path 
                    d="M -69 -40 A 80 80 0 0 1 75 27" 
                    fill="none" 
                    stroke="url(#slashGrad)" 
                    strokeWidth="16" 
                    strokeLinecap="round"
                    className="blur-[2px]"
                  />
                  <defs>
                    <linearGradient id="slashGrad" x1="0" y1="1" x2="1" y2="0">
                      <stop offset="0%" stopColor="white" stopOpacity="0" />
                      <stop offset="50%" stopColor="white" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </>
            )}
          </div>

          {/* Fireballs */}
          {s.fireballs.map(fb => {
            const glowColor = fb.type === 'sky' ? 'bg-purple-500' : fb.state === 'deflected' ? 'bg-xp' : 'bg-orange-500';
            return (
            <div 
              key={fb.id}
              className="absolute z-25 flex items-center justify-center transition-transform duration-500"
              style={{ 
                left: `${(fb.x / GAME_W) * 100}%`, 
                top: `${(fb.y / GAME_H) * 100}%`,
                transform: `translate(-50%, -50%) scale(${s.boss.phase === 2 ? 1.5 : 1.0})`,
                width: `${(FIREBALL_R * 4 / GAME_W) * 100}%`,
                height: `${(FIREBALL_R * 4 / GAME_H) * 100}%`
              }}
            >
              <div className={`absolute inset-2 ${glowColor} rounded-full blur-md opacity-80 -z-10`} />
              <img 
                src={fb.state === 'deflected' 
                  ? (fb.vy < 0 
                      ? (fb.vx > 0 ? '/assets/expedition/fireball_top_left.png?v=2' : '/assets/expedition/fireball_bottom_left.png?v=2') 
                      : (fb.vx > 0 ? '/assets/expedition/fireball_top_right.png?v=2' : '/assets/expedition/fireball_bottom_right.png?v=2')
                    ) 
                  : (fb.vy < 0 ? '/assets/expedition/fireball_top.png?v=2' : '/assets/expedition/fireball_bottom.png?v=2')}
                alt="Fireball"
                className={`w-full h-full object-contain ${fb.type === 'sky' ? 'hue-rotate-[270deg] brightness-125' : fb.state === 'deflected' ? 'hue-rotate-[180deg] saturate-200 brightness-150' : ''}`}
              />
            </div>
          )})}

          {/* Ground Line */}
          <div 
            className="absolute bottom-0 w-full z-30 pointer-events-none bg-repeat-x bg-bottom"
            style={{ 
              height: `${((GAME_H - GROUND_Y) / GAME_H) * 100}%`,
              backgroundImage: `url('/assets/expedition/volcano_ground.png?v=2')`,
              backgroundSize: 'auto 100%',
            }}
          />
        </div>
      </div>

      {/* Ultimate Selection Overlay */}
      {transitionState.startsWith('select_') && (
        <div className="absolute inset-0 z-50 bg-plum-950/85 flex items-center justify-center p-4 px-fade-in">
          <PixelPanel frame="wood" padding="lg" className="flex flex-col items-center gap-5 text-center max-w-2xl">
            <div>
              <h2 className="font-bold text-3xl leading-none text-hp-light">
                {transitionState === 'select_p1' ? 'Phase 2 unlocked' : 'Finishing blow'}
              </h2>
              <p className="mt-2 text-base text-parchment-300">Choose a hero to perform their Ultimate.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {Object.values(party).map(hero => {
                const inst = dex[hero.equippedId];
                const canSelect = inst && inst.baseDmg > 0;
                return (
                  <button
                    key={hero.id}
                    disabled={!canSelect}
                    onClick={() => {
                      setActiveHeroId(hero.id);
                      setTransitionState('ultimate');
                    }}
                    className={cn(
                      'px-frame w-36 flex flex-col items-center gap-2 p-3 focus-visible:outline-[3px] focus-visible:outline-gold-300',
                      canSelect ? 'px-frame-parchment hover:brightness-105' : 'px-frame-inset opacity-50 cursor-not-allowed',
                    )}
                  >
                    <img src={hero.avatar || '/boy2_idle.gif'} alt="" className="size-16 object-contain border-2 border-ink pixelated" />
                    <span className={cn('font-bold text-lg leading-none', canSelect ? 'text-ink' : 'text-parchment-300')}>{hero.name}</span>
                    <span className={cn('text-xs leading-none', canSelect ? 'text-wood-700' : 'text-parchment-500')}>{canSelect ? 'Damage ultimate' : 'Support only'}</span>
                  </button>
                );
              })}
            </div>
          </PixelPanel>
        </div>
      )}

      {/* Ultimate Minigame Overlay */}
      {transitionState === 'ultimate' && activeHeroId && (
        <UltimateSequenceOverlay 
          hero={party[activeHeroId]}
          instrument={dex[party[activeHeroId].equippedId]}
          onComplete={(success, pts) => {
            if (success) {
              if (state.current.boss.phase === 1) {
                state.current.boss.phase = 2;
                state.current.boss.hp -= Math.min(pts * 2, 50); // Small bonus damage
              } else {
                state.current.boss.hp = 0; 
                setGameResult('victory');
                setTimeout(() => onComplete({ victory: true, xpGained: 1500 }), 2000);
              }
            } else {
              // Player failed the sequence - heal the boss slightly so they have to try again
              if (state.current.boss.phase === 1) {
                state.current.boss.hp = (state.current.boss.maxHp / 2) + 50;
              } else {
                state.current.boss.hp = 50;
              }
            }
            setTransitionState('none');
            setActiveHeroId(null);
          }}
        />
      )}

      {/* Result Overlays */}
      {gameResult && (
        <div className="absolute inset-0 z-50 bg-plum-950/85 flex items-center justify-center px-fade-in">
          <h1 className={cn('font-bold text-6xl md:text-8xl leading-none [text-shadow:0_6px_0_var(--color-ink)]', gameResult === 'victory' ? 'text-gold-300' : 'text-hp-light')}>
            {gameResult === 'victory' ? 'Victory' : 'Defeat'}
          </h1>
        </div>
      )}

      {/* Mobile Controls Overlay */}
      <div className="lg:hidden absolute bottom-4 inset-x-4 flex justify-between items-end z-40 opacity-90 pointer-events-auto">
        <div className="flex gap-2">
          <button
            aria-label="Move left"
            className="px-btn px-btn-secondary size-16 p-0 touch-none select-none"
            onPointerDown={(e) => { e.preventDefault(); onButtonDown('left'); }}
            onPointerUp={(e) => { e.preventDefault(); onButtonUp('left'); }}
            onPointerCancel={(e) => { e.preventDefault(); onButtonUp('left'); }}
          >
            <PxArrowLeft className="size-7" />
          </button>
          <button
            aria-label="Move right"
            className="px-btn px-btn-secondary size-16 p-0 touch-none select-none"
            onPointerDown={(e) => { e.preventDefault(); onButtonDown('right'); }}
            onPointerUp={(e) => { e.preventDefault(); onButtonUp('right'); }}
            onPointerCancel={(e) => { e.preventDefault(); onButtonUp('right'); }}
          >
            <PxArrowRight className="size-7" />
          </button>
        </div>

        <div className="flex gap-2 items-end">
          <button
            className="px-btn px-btn-secondary size-16 p-0 text-sm touch-none select-none"
            onPointerDown={(e) => { e.preventDefault(); onButtonDown('dash'); }}
            onPointerUp={(e) => { e.preventDefault(); onButtonUp('dash'); }}
            onPointerCancel={(e) => { e.preventDefault(); onButtonUp('dash'); }}
          >
            Dash
          </button>
          <button
            className="px-btn px-btn-secondary size-16 p-0 text-sm touch-none select-none"
            onPointerDown={(e) => { e.preventDefault(); onButtonDown('up'); }}
            onPointerUp={(e) => { e.preventDefault(); onButtonUp('up'); }}
            onPointerCancel={(e) => { e.preventDefault(); onButtonUp('up'); }}
          >
            Jump
          </button>
          <button
            className="px-btn px-btn-primary size-20 p-0 text-base touch-none select-none"
            onPointerDown={(e) => { e.preventDefault(); onButtonDown('swing'); }}
            onPointerUp={(e) => { e.preventDefault(); onButtonUp('swing'); }}
            onPointerCancel={(e) => { e.preventDefault(); onButtonUp('swing'); }}
          >
            Swing
          </button>
        </div>
      </div>
      
      {/* Intro Tutorial Pop-up */}
      {introStep === 'hint' && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-plum-950/80 pointer-events-auto px-fade-in">
          <PixelPanel frame="wood" padding="lg" className="w-full max-w-xl flex flex-col gap-4" role="dialog" aria-modal="true" aria-labelledby="santelmo-rules-title">
            <h2 id="santelmo-rules-title" className="font-bold text-2xl sm:text-3xl leading-none text-parchment-100">How to fight Santelmo</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-base leading-snug">
              <dt className="font-label text-base text-gold-300">Move</dt>
              <dd className="text-parchment-300"><Kbd>W</Kbd> <Kbd>A</Kbd> <Kbd>S</Kbd> <Kbd>D</Kbd> or arrow keys to run and jump.</dd>
              <dt className="font-label text-base text-gold-300">Dash</dt>
              <dd className="text-parchment-300"><Kbd>E</Kbd> to dash through danger.</dd>
              <dt className="font-label text-base text-gold-300">Deflect</dt>
              <dd className="text-parchment-300"><Kbd>Space</Kbd> or tap Swing to hit ground fireballs back at Santelmo.</dd>
            </dl>
            <p className="px-frame px-frame-inset px-frame-sm px-3 py-2 text-sm text-parchment-100">
              <span className="font-semibold text-hp-light">Watch out:</span> purple sky fireballs can't be deflected. Dodge them.
            </p>
            <PixelButton variant="primary" size="lg" className="self-end" onClick={() => setIntroStep('combat')}>
              Start Battle
            </PixelButton>
          </PixelPanel>
        </div>
      )}

      {/* Keyboard Hint for Desktop */}
      <div className="hidden lg:flex absolute bottom-4 left-1/2 -translate-x-1/2 z-40 items-center gap-4 text-sm text-parchment-300 pointer-events-none [text-shadow:0_2px_0_var(--color-ink)]">
        <span><Kbd>W</Kbd> <Kbd>A</Kbd> <Kbd>D</Kbd> Move</span>
        <span><Kbd>Space</Kbd> Swing</span>
        <span><Kbd>E</Kbd> Dash</span>
      </div>
    </div>
  );
}