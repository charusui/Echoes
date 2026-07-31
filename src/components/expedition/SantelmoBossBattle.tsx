import { useState, useEffect, useRef, useCallback } from 'react';
import { audioEngine } from '../../services/audioSynth';
import wildSummit_bg from '../../assets/boss_bg/wildSummit_bg.png';
import { type HeroProfile, type HarmonydexEntry } from '../../types/expedition';
import { UltimateSequenceOverlay } from './UltimateSequenceOverlay';

interface SantelmoBossBattleProps {
  party: Record<string, HeroProfile>;
  bossName: string;
  dex: Record<string, HarmonydexEntry>;
  onComplete: (result: { victory: boolean; xpGained: number }) => void;
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
}: SantelmoBossBattleProps) {
  // Party stats
  const totalPartyHp = Object.values(party).reduce((acc, hero) => acc + hero.maxHp, 0);
  
  // React state for UI overlays
  const [_frame, setFrame] = useState(0);
  const [gameResult, setGameResult] = useState<'victory' | 'defeat' | null>(null);
  const [transitionState, setTransitionState] = useState<'none' | 'select_p1' | 'select_p2' | 'ultimate'>('none');
  const [introStep, setIntroStep] = useState<'hint' | 'combat'>('hint');
  const [activeHeroId, setActiveHeroId] = useState<string | null>(null);

  // Mutable Game State
  const state = useRef({
    player: { x: 100, y: GROUND_Y, vx: 0, vy: 0, isSwinging: false, swingTimer: 0, facing: 1 as 1 | -1, invulnTimer: 0, isDashing: false, dashTimer: 0, dashCooldown: 0, canDoubleJump: true },
    boss: { x: GAME_W / 2, y: 150, hp: 500, maxHp: 500, phase: 1, hurtTimer: 0 },
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
        const craterX = CRATERS[Math.floor(Math.random() * CRATERS.length)];
        s.fireballs.push({
          id: s.nextFireballId++,
          x: craterX,
          y: GROUND_Y,
          vx: (Math.random() - 0.5) * 2, // Slight horizontal drift
          vy: -14 - Math.random() * 4,
          type: 'ground',
          state: 'active'
        });
        s.spawnTimer = 1.0 + Math.random() * 1.0; // Spawn every 1-2s
      }

      // Phase 2: Sky Fireballs
      if (s.boss.phase === 2) {
        s.skySpawnTimer -= dt;
        if (s.skySpawnTimer <= 0) {
          s.fireballs.push({
            id: s.nextFireballId++,
            x: Math.random() * GAME_W,
            y: -50,
            vx: (Math.random() - 0.5) * 3,
            vy: 5 + Math.random() * 3,
            type: 'sky',
            state: 'active'
          });
          s.skySpawnTimer = 0.5 + Math.random() * 1.0; // Spawn every 0.5-1.5s
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
    <div className="w-full h-full flex flex-col bg-black relative select-none overflow-hidden touch-none font-orbitron">
      {/* PORTRAIT LOCK OVERLAY FOR MOBILE DEVICES - conditionally hidden when game is over */}
      {!gameResult && (
        <div className="portrait:flex hidden absolute inset-0 z-[9999] bg-[#0f0c0c] flex-col items-center justify-center p-6 text-center shadow-inner overflow-hidden pointer-events-auto">
          <div className="animate-bounce mb-6">
            <svg className="w-20 h-20 text-[#facc15]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
          </div>
          <h2 className="text-white font-orbitron font-black text-3xl mb-4 tracking-wider text-shadow-md">ROTATE DEVICE</h2>
          <p className="text-slate-300 font-sans text-lg">This boss encounter requires landscape mode for the intended layout.</p>
        </div>
      )}

      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between z-50 pointer-events-none">
        <div className="flex flex-col gap-1">
          <span className="text-white font-black text-sm drop-shadow-md">PARTY HP</span>
          <div className="w-48 h-4 bg-gray-900 border-2 border-black">
            <div 
              className="h-full bg-green-500 transition-all duration-200" 
              style={{ width: `${Math.max(0, (s.partyHp / s.maxPartyHp) * 100)}%` }} 
            />
          </div>
        </div>
        
        {/* Boss HP */}
        <div className="flex flex-col gap-1 w-64 items-end">
          <span className="text-[#facc15] font-bold text-sm tracking-wider uppercase">{bossName}</span>
          <div className="relative w-full h-4 bg-[#0f0c0c] border-2 border-[#facc15] overflow-hidden">
            {/* Orange layer (Bottom 50%) */}
            <div 
              className="absolute top-0 right-0 h-full bg-orange-500 transition-all duration-300" 
              style={{ width: `${Math.max(0, Math.min((s.boss.hp / (s.boss.maxHp / 2)) * 100, 100))}%` }} 
            />
            {/* Red layer (Top 50%) */}
            <div 
              className="absolute top-0 right-0 h-full bg-red-600 transition-all duration-300" 
              style={{ width: `${Math.max(0, ((s.boss.hp - s.boss.maxHp / 2) / (s.boss.maxHp / 2)) * 100)}%` }} 
            />
          </div>
          {s.boss.phase === 2 && (
            <span className="text-red-500 font-bold text-xs animate-pulse">PHASE 2: ENRAGED</span>
          )}
        </div>
      </div>

      {/* Game Window */}
      <div className="flex-1 w-full h-full flex items-center justify-center relative z-10 bg-black overflow-hidden">
        {/* Fullscreen Container */}
        <div 
          className="relative w-full h-full overflow-hidden"
        >
          {/* Background */}
          <div className="absolute inset-0 z-0">
            <img src={wildSummit_bg} alt="BG" className="w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
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
              className="flex items-center justify-center overflow-visible drop-shadow-[0_0_30px_rgba(255,0,0,0.8)] transition-[filter] duration-1000"
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
              <div className="absolute inset-8 bg-orange-600 rounded-full blur-[30px] opacity-40 animate-pulse -z-10" />
              <img src="/assets/expedition/santelmo_boss.png" alt="Santelmo" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,200,0,0.4)]" />
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
              <img src="/assets/expedition/crater.png" alt="crater" className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-orange-500 rounded-[100%] opacity-40 blur-md animate-pulse pointer-events-none" />
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
              className="absolute z-25 bg-white/70 rounded-full blur-[1px] pointer-events-none"
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
                    src="/assets/expedition/ancestral_gold_bat.png" 
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
            const glowColor = fb.type === 'sky' ? 'bg-purple-500' : fb.state === 'deflected' ? 'bg-blue-500' : 'bg-orange-600';
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
                      ? (fb.vx > 0 ? '/assets/expedition/fireball_top_left.png' : '/assets/expedition/fireball_bottom_left.png') 
                      : (fb.vx > 0 ? '/assets/expedition/fireball_top_right.png' : '/assets/expedition/fireball_bottom_right.png')
                    ) 
                  : (fb.vy < 0 ? '/assets/expedition/fireball_top.png' : '/assets/expedition/fireball_bottom.png')}
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
              backgroundImage: `url('/assets/expedition/volcano_ground.png')`,
              backgroundSize: 'auto 100%',
            }}
          />
        </div>
      </div>

      {/* Ultimate Selection Overlay */}
      {transitionState.startsWith('select_') && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center font-orbitron animate-in fade-in duration-300">
          <h2 className="text-3xl text-red-500 font-bold mb-8 animate-pulse shadow-black drop-shadow-md">
            {transitionState === 'select_p1' ? 'PHASE 2 UNLOCKED' : 'FINISHING BLOW'}
          </h2>
          <p className="text-xl text-white mb-8">Select a party member to perform an Ultimate Attack!</p>
          <div className="flex gap-6">
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
                  className={`flex flex-col items-center p-4 border-2 rounded-lg transition-transform ${canSelect ? 'border-[#facc15] hover:scale-110 cursor-pointer shadow-[0_0_15px_#facc15]' : 'border-gray-600 opacity-50 cursor-not-allowed'}`}
                >
                  <img src={hero.avatar || '/boy2_idle.gif'} alt={hero.name} className="w-16 h-16 object-contain mb-2" />
                  <span className="text-[#f0dde0] text-lg font-bold">{hero.name}</span>
                  <span className="text-xs text-gray-400 mt-1">{canSelect ? 'Damaging Ultimate' : 'Healing/Support'}</span>
                </button>
              );
            })}
          </div>
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
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center animate-fadeIn">
          <h1 className={`font-black text-6xl md:text-8xl tracking-widest drop-shadow-[0_0_20px_rgba(0,0,0,1)] ${gameResult === 'victory' ? 'text-yellow-400' : 'text-red-600'}`}>
            {gameResult === 'victory' ? 'VICTORY' : 'DEFEATED'}
          </h1>
        </div>
      )}

      {/* Mobile Controls Overlay */}
      <div className="lg:hidden absolute bottom-4 inset-x-4 flex justify-between z-40 opacity-80 pointer-events-auto">
        <div className="flex gap-2">
          <button 
            className="w-16 h-16 bg-[#2a2d43] border-4 border-black rounded-lg active:bg-slate-500 flex items-center justify-center touch-none select-none"
            onPointerDown={(e) => { e.preventDefault(); onButtonDown('left'); }}
            onPointerUp={(e) => { e.preventDefault(); onButtonUp('left'); }}
            onPointerCancel={(e) => { e.preventDefault(); onButtonUp('left'); }}
          >
            <span className="text-white font-black text-2xl">←</span>
          </button>
          <button 
            className="w-16 h-16 bg-[#2a2d43] border-4 border-black rounded-lg active:bg-slate-500 flex items-center justify-center touch-none select-none"
            onPointerDown={(e) => { e.preventDefault(); onButtonDown('right'); }}
            onPointerUp={(e) => { e.preventDefault(); onButtonUp('right'); }}
            onPointerCancel={(e) => { e.preventDefault(); onButtonUp('right'); }}
          >
            <span className="text-white font-black text-2xl">→</span>
          </button>
        </div>

        <div className="flex gap-2">
          <button 
            className="w-16 h-16 bg-cyan-600 border-4 border-black rounded-full active:bg-cyan-400 flex items-center justify-center touch-none select-none"
            onPointerDown={(e) => { e.preventDefault(); onButtonDown('dash'); }}
            onPointerUp={(e) => { e.preventDefault(); onButtonUp('dash'); }}
            onPointerCancel={(e) => { e.preventDefault(); onButtonUp('dash'); }}
          >
            <span className="text-white font-black text-xs">DASH</span>
          </button>
          <button 
            className="w-16 h-16 bg-blue-600 border-4 border-black rounded-full active:bg-blue-400 flex items-center justify-center touch-none select-none"
            onPointerDown={(e) => { e.preventDefault(); onButtonDown('up'); }}
            onPointerUp={(e) => { e.preventDefault(); onButtonUp('up'); }}
            onPointerCancel={(e) => { e.preventDefault(); onButtonUp('up'); }}
          >
            <span className="text-white font-black text-xs">JUMP</span>
          </button>
          <button 
            className="w-20 h-20 bg-red-600 border-4 border-black rounded-full active:bg-red-400 flex items-center justify-center touch-none select-none -translate-y-4"
            onPointerDown={(e) => { e.preventDefault(); onButtonDown('swing'); }}
            onPointerUp={(e) => { e.preventDefault(); onButtonUp('swing'); }}
            onPointerCancel={(e) => { e.preventDefault(); onButtonUp('swing'); }}
          >
            <span className="text-white font-black text-sm">BAT</span>
          </button>
        </div>
      </div>
      
      {/* Intro Tutorial Pop-up */}
      {introStep === 'hint' && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity">
          <div className="flex flex-col items-center gap-4 bg-[#0f0c0c]/95 border-[4px] border-[#4ade80] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] p-6 sm:p-8 max-w-2xl w-[95%] text-center -skew-x-3">
            <h2 className="font-orbitron font-black text-2xl sm:text-4xl text-[#4ade80] uppercase tracking-widest drop-shadow-md">Boss Battle Rules</h2>
            <div className="text-white font-sans text-sm sm:text-lg leading-relaxed space-y-3 mt-4 text-left">
              <p><span className="text-[#facc15] font-bold">MOVE:</span> Use <strong className="text-[#38bdf8]">W / A / S / D</strong> or <strong className="text-[#38bdf8]">Arrow Keys</strong> to run and jump.</p>
              <p><span className="text-[#facc15] font-bold">DASH:</span> Press <strong className="text-[#38bdf8]">E</strong> to dash and avoid damage.</p>
              <p><span className="text-[#facc15] font-bold">DEFLECT:</span> Press <strong className="text-[#38bdf8]">SPACE</strong> or tap <strong className="text-[#38bdf8]">BAT</strong> to swing. Hit the ground fireballs back at Santelmo!</p>
              <p className="text-[#da2d46] font-bold mt-2 text-sm italic">Avoid the purple sky fireballs, they cannot be deflected!</p>
            </div>
            <button 
              onClick={() => setIntroStep('combat')}
              className="mt-6 px-8 py-3 bg-[#facc15] text-[#0f0c0c] font-orbitron font-black text-xl uppercase tracking-widest border-[3px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] hover:bg-[#ffdf3d] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f0c0c] transition-all"
            >
              START BATTLE
            </button>
          </div>
        </div>
      )}

      {/* Keyboard Hint for Desktop */}
      <div className="hidden lg:block absolute bottom-4 left-1/2 -translate-x-1/2 z-40 text-white/50 text-xs font-space-mono pointer-events-none">
        [W/A/D] Move & Jump • [SPACE] Swing Bat • [E] Dash
      </div>
    </div>
  );
}