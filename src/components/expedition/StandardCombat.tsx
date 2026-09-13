// @ts-nocheck
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Sword, Sparkles, Shield, Music as Disc, Zap, ArrowLeft, Users, ChevronLeft, ChevronRight, Package } from 'pixelarticons/react';
import { ItemMenuOverlay } from './ItemMenuOverlay';
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
import { useCombatEngine, type TurnUpdateInfo } from './useCombatEngine';
import {
  ArrowLeft as PxArrowLeft, ChevronLeft as PxChevronLeft, ChevronRight as PxChevronRight, Users as PxUsers, Music as PxMusic, Package as PxPackage, Shield as PxShield, Sparkles as PxSparkles, Sword as PxSword,
} from 'pixelarticons/react';
import { cn } from '../../lib/cn';
import { CommandMenu, EnemyHealthBar, PartyMemberCard, TurnIndicator, UnitNameplate, type CombatCommand } from './hud';

export interface ExpeditionCombatProps {
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

export function StandardCombat(props: ExpeditionCombatProps) {
  const engine = useCombatEngine(props);
  const {
    enemies, setTargetEnemyIndex, targetEnemyIndex, turnIndex, setTurnIndex,
    activeAction, setActiveAction, parryStanceActive, enemyFrame, isPartyDrawerOpen, setIsPartyDrawerOpen,
    damagePopups, isEndingBattle, ghostHp, hpShaking, bossAttackVariation, bossAttackPhase,
    canCounterAttack, parryResolved, isBoss, isShrineBandit, enemy, baseEnemyInst, partyList,
    turnQueue, currentTurnUnit, isHeroTurn, activeHero, activeAttackingEnemy,
    handleCommandAttack, handleCommandSkill, handleCommandAttune, handleCommandDefend,
    handleRhythmComplete, handleSpellComplete, handleParryResult, handleWingSlamCounterComplete, handleAttuneComplete, isRightSweepAttack,
    handleUseItem, inventory,
  } = engine;

  const [showItemsMenu, setShowItemsMenu] = useState(false);

  // NEW LOGIC FROM PULLED CODE: Dynamic hero sprites based on combat state
  const getHeroSprite = (hero: HeroProfile) => {
    const n = hero.name.toLowerCase();
    let folder = 'boy2_gifs';
    let defaultIdle = '/boy2_idle.gif';

    if (n.includes('gustave')) { folder = 'boy1_gifs'; defaultIdle = '/boy1_idle.gif'; }
    else if (n.includes('maelle')) { folder = 'girl_gifs'; defaultIdle = '/girl_idle.gif'; }

    if (hero.hp <= 0) return `/assets/expedition/${folder}/Defeated.gif`;

    const isTakingDamage = damagePopups.some(p => !p.isEnemy);
    if (isTakingDamage) return `/assets/expedition/${folder}/Taking damage.gif`;

    if (activeAction === 'parry' || parryStanceActive) return `/assets/expedition/${folder}/Block.gif`;

    if (activeAction === 'rhythm' || activeAction === 'spell' || activeAction === 'attune' || activeAction === 'post_attack_anim') {
      const inst = dex[hero.equippedId];
      if (inst && (inst.category === 'woodwind' || inst.category === 'percussion')) {
        return `/assets/expedition/${folder}/Flute skill.gif`;
      }
      return `/assets/expedition/${folder}/Guitar skill.gif`;
    }

    return defaultIdle;
  };

  const onFlee = props.onFlee;
  const onCombatResult = props.onCombatResult;
  const dex = props.dex;


  const renderTurnBar = () => (
    <TurnIndicator isHeroTurn={isHeroTurn} activeHeroName={activeHero.name} turnQueue={turnQueue} turnIndex={turnIndex} />
  );

  const selectHeroTurn = (hero: HeroProfile) => {
    if (isHeroTurn && activeAction === 'none' && !isEndingBattle && hero.hp > 0) {
      const idx = turnQueue.findIndex(u => u.isHero && u.unit.id === hero.id);
      if (idx !== -1) setTurnIndex(idx);
    }
  };

  const combatCommands: CombatCommand[] = [
    { id: 'attack', label: 'Rhythm Attack', hint: '1 AP', icon: <PxSword />, variant: 'primary', featured: true, onClick: handleCommandAttack, disabled: !isHeroTurn || activeHero.ap < 1 || activeAction !== 'none' || isEndingBattle },
    { id: 'skill', label: 'Overdrive', hint: '2 AP', icon: <PxSparkles />, variant: 'purple', onClick: handleCommandSkill, disabled: !isHeroTurn || activeHero.ap < 2 || activeAction !== 'none' || isEndingBattle },
    { id: 'attune', label: 'Attune', hint: 'Enemy HP < 35%', icon: <PxMusic />, variant: 'blue', onClick: handleCommandAttune, disabled: !isHeroTurn || activeAction !== 'none' || isEndingBattle },
    { id: 'defend', label: 'Defend', hint: '+2 AP', icon: <PxShield />, variant: 'green', onClick: handleCommandDefend, disabled: !isHeroTurn || activeAction !== 'none' || isEndingBattle },
    { id: 'items', label: 'Items', icon: <PxPackage />, variant: 'pink', onClick: () => setShowItemsMenu(true), disabled: isEndingBattle || !isHeroTurn || activeAction !== 'none' },
    { id: 'flee', label: 'Retreat', icon: <PxArrowLeft />, variant: 'ghost', onClick: onFlee, disabled: isEndingBattle },
  ];

  return (
    <div
      className="flex-1 flex flex-col justify-between relative overflow-hidden bg-plum-900 bg-cover bg-center bg-no-repeat select-none"
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
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {enemy.hp <= 0 && (
        <div className="absolute inset-0 bg-parchment-100 z-50 pointer-events-none animate-[flashWhite_2s_ease-out_forwards]" />
      )}

      {isBoss && (
        <div className="hidden lg:flex absolute inset-0 z-[1] pointer-events-none items-center justify-center overflow-visible">
          <div className="animate-boss-breathe w-full h-full flex flex-col items-center justify-center relative">
            {enemy.staggered && enemy.hp > 0 && (
              <div className="absolute -translate-y-40 sm:-translate-y-52 z-20 flex flex-col items-center justify-center pointer-events-none animate-fadeIn">
                <div className="w-48 h-24 overflow-hidden relative">
                  <img src="/assets/expedition/stun_spritesheet_tight.png" className="absolute top-0 left-0 h-full w-[500%] max-w-none animate-sprite-5" alt="Stun" />
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
                className={`flex items-center justify-center transition-all ${bossAttackPhase === 'rise'
                    ? 'duration-500 ease-out scale-120 -translate-y-36 sm:-translate-y-48 animate-pulse '
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
                    className={`w-auto h-[54%] sm:h-[59%] max-w-none object-contain transition-all ${bossAttackPhase === 'sweep_prep'
                        ? 'duration-300 scale-125 translate-x-[80px] sm:translate-x-[180px] translate-y-12 sm:translate-y-20 '
                        : 'duration-700 ease-out scale-135 -translate-x-[140px] sm:-translate-x-[300px] translate-y-12 sm:translate-y-20 '
                      }`}
                  />
                </div>
              </div>
            ) : (bossAttackPhase === 'slam' || (activeAction === 'parry' && enemyFrame >= 4 && !isBoss)) && (
              <div className="flex items-center justify-center transition-all duration-200 scale-130 translate-y-20 sm:translate-y-28">
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
                  <div className="w-32 h-4 bg-parchment-100 rounded-full" style={{ animation: 'slashFx 0.4s ease-out forwards' }} />
                )}
                {p.effectType === 'magic' && (
                  <Sparkles className="w-32 h-32 text-gold-300 fill-gold-300 opacity-0" style={{ animation: 'magicFx 0.6s ease-out forwards' }} />
                )}
                {p.effectType === 'block' && (
                  <div className="w-20 h-20 border-xp rounded-full opacity-0" style={{ animation: 'blockFx 0.5s ease-out forwards' }} />
                )}
              </div>

              <div
                className="font-pixel font-bold text-4xl sm:text-6xl text-parchment-100 relative z-10"
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

      {/* Top Header stats area */}
      <div className="lg:hidden relative w-full flex flex-col items-center justify-center pt-2 px-2 z-20 gap-2">
        <div className="flex flex-col items-center shrink-0 portrait:flex landscape:hidden">
          {renderTurnBar()}
        </div>

        <EnemyHealthBar
          className="max-w-xl mx-auto px-2 sm:px-4 pointer-events-auto"
          name={enemy.name}
          level={enemy.level}
          isBoss={enemy.isBoss}
          hp={enemy.hp}
          maxHp={enemy.maxHp}
          ghostHp={ghostHp}
          stagger={enemy.stagger}
          maxStagger={enemy.maxStagger}
          shaking={hpShaking}
        />
      </div>

      <div className="hidden lg:flex relative w-full justify-center pt-3 z-20">
        <EnemyHealthBar
          className="max-w-xl px-4"
          name={enemy.name}
          level={enemy.level}
          isBoss={enemy.isBoss}
          hp={enemy.hp}
          maxHp={enemy.maxHp}
          ghostHp={ghostHp}
          stagger={enemy.stagger}
          maxStagger={enemy.maxStagger}
          shaking={hpShaking}
        />
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
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-28 h-14 sm:w-36 sm:h-18 overflow-hidden relative">
                        <img src="/assets/expedition/stun_spritesheet_tight.png" className="absolute top-0 left-0 h-full w-[500%] max-w-none animate-sprite-5" alt="Stun" />
                      </div>
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
                  className={`w-full h-full flex items-center justify-center transition-all ${bossAttackPhase === 'rise'
                      ? 'duration-500 ease-out scale-115 -translate-y-16 sm:-translate-y-24 animate-pulse '
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
                      className={`w-auto h-52 sm:h-64 max-w-none object-contain transition-all ${bossAttackPhase === 'sweep_prep'
                          ? 'duration-300 scale-115 translate-x-12 sm:translate-x-20 translate-y-14 sm:translate-y-20 '
                          : 'duration-700 ease-out scale-120 -translate-x-[110px] sm:-translate-x-[200px] translate-y-14 sm:translate-y-20 '
                        }`}
                    />
                  </div>
                </div>
              ) : (bossAttackPhase === 'slam' || (activeAction === 'parry' && enemyFrame >= 4 && !isBoss)) && (
                <div className="w-full h-full flex items-center justify-center -space-x-4 sm:-space-x-8 transition-all duration-200 scale-110 sm:scale-115 translate-y-14 sm:translate-y-20">
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
          <div className="flex flex-col gap-1.5 p-2 bg-plum-900 border-y-[3px] border-r-[3px] border-ink w-[220px]">
            {partyList.map((hero) => (
              <PartyMemberCard
                key={hero.id}
                hero={hero}
                instrument={dex[hero.equippedId] || dex['cebuano_gitara']}
                isTurn={isHeroTurn && activeHero.id === hero.id}
                onSelect={() => selectHeroTurn(hero)}
              />
            ))}
          </div>

          <button
            onClick={() => setIsPartyDrawerOpen(!isPartyDrawerOpen)}
            aria-label={isPartyDrawerOpen ? 'Hide party' : 'Show party'}
            className="px-btn px-btn-secondary w-10 h-16 p-0 flex-col gap-1 [&_svg]:size-4"
          >
            {isPartyDrawerOpen ? <PxChevronLeft /> : <><PxUsers /><PxChevronRight /></>}
          </button>
        </div>

        {/* ── ACTIVE CHARACTER FOCUS (Mobile Portrait Alignment Fix) ── */}
        {isShrineBandit && !isBoss ? (
          <div className="absolute bottom-[8%] sm:bottom-[18%] left-4 sm:left-12 flex items-end justify-center z-30 pointer-events-none transition-all duration-300">
            <div key={activeHero.id} className="flex flex-col items-center gap-0 z-30 animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="relative origin-bottom flex items-center justify-center">
                <img src={getHeroSprite(activeHero)} alt={activeHero.name} className="w-44 h-44 sm:w-72 sm:h-72 object-contain drop-shadow-[0px_8px_16px_rgba(0,0,0,0.8)]" />
              </div>
              <UnitNameplate side="hero" className="-mt-10 sm:-mt-20">{activeHero.name}</UnitNameplate>
            </div>
          </div>
        ) : null}

        {/* ── ENEMIES FOCUS (Mobile Portrait Alignment Fix) ── */}
        {!isBoss ? (
          <div className="absolute bottom-[10%] sm:bottom-[18%] right-2 sm:right-4 flex items-end justify-end gap-1 sm:gap-4 z-20">
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
                    <div className="w-12 sm:w-16 h-1.5 bg-plum-950 border-2 border-ink flex">
                      <div className="bg-hp h-full transition-all" style={{ width: `${Math.max(0, (e.hp / e.maxHp) * 100)}%` }} />
                    </div>
                    <div className={`relative origin-bottom flex items-center justify-center ${e.hp <= 0 ? 'animate-[bossDeath_2s_ease-in_forwards]' : e.staggered ? 'animate-bounce' : isAttacking ? 'animate-pulse scale-110' : 'transition-all duration-300'}`}>
                      <img src={`/assets/expedition/enemy_frame_${isAttacking ? enemyFrame : 0}.png`} alt={e.name} className={`w-20 h-20 sm:w-28 sm:h-28 object-contain scale-x-[-1] transition-all duration-300 ${isCurrent ? 'drop-shadow-[0px_0px_8px_rgba(250,204,21,1)]' : 'drop-shadow-[0px_8px_16px_rgba(0,0,0,0.8)]'}`} onError={(ev) => { (ev.currentTarget as HTMLElement).style.display = 'none'; }} />
                      {e.hp <= 0 && <div className="absolute inset-0 bg-hp/50 mix-blend-color-burn rounded-full animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_infinite]" />}
                      {e.staggered && e.hp > 0 && (
                        <div className="absolute inset-x-0 -top-6 z-20 flex items-center justify-center pointer-events-none">
                          <div className="w-20 h-10 overflow-hidden relative">
                            <img src="/assets/expedition/stun_spritesheet_tight.png" className="absolute top-0 left-0 h-full w-[500%] max-w-none animate-sprite-5" alt="Stun" />
                          </div>
                        </div>
                      )}
                    </div>
                    <UnitNameplate side="enemy" className={cn('max-w-[100px]', !isCurrent && 'opacity-80')}>{e.name}</UnitNameplate>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-20 h-1.5 bg-plum-950 border-2 border-ink flex">
                  <div className="bg-hp h-full transition-all" style={{ width: `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%` }} />
                </div>
                <div className={`relative origin-bottom flex items-center justify-center ${enemy.hp <= 0 ? 'animate-[bossDeath_2s_ease-in_forwards]' : enemy.staggered ? 'animate-bounce' : 'transition-all duration-300'}`}>
                  <img src={`/assets/expedition/enemy_frame_${enemyFrame}.png`} alt={enemy.name} className="w-36 h-36 sm:w-40 sm:h-40 object-contain drop-shadow-[0px_8px_16px_rgba(0,0,0,0.8)] scale-x-[-1]" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
                  {enemy.hp <= 0 && <div className="absolute inset-0 bg-hp/50 mix-blend-color-burn rounded-full animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_infinite]" />}
                  {enemy.staggered && enemy.hp > 0 && (
                    <div className="absolute inset-x-0 -top-6 z-20 flex items-center justify-center pointer-events-none">
                      <div className="w-28 h-14 overflow-hidden relative">
                        <img src="/assets/expedition/stun_spritesheet_tight.png" className="absolute top-0 left-0 h-full w-[500%] max-w-none animate-sprite-5" alt="Stun" />
                      </div>
                    </div>
                  )}
                </div>
                <UnitNameplate side="enemy">{enemy.name}</UnitNameplate>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-between px-12 py-8 relative z-20">
        <div className="flex flex-col gap-4 z-40">
          {partyList.map((hero) => (
            <div key={hero.id} className="w-64">
              <PartyMemberCard
                size="md"
                hero={hero}
                instrument={dex[hero.equippedId] || dex['cebuano_gitara']}
                isTurn={isHeroTurn && activeHero.id === hero.id}
                onSelect={() => selectHeroTurn(hero)}
              />
            </div>
          ))}
        </div>

        {/* ── ACTIVE CHARACTER FOCUS (Desktop Hero Shifted Left) ── */}
        {isShrineBandit && !isBoss ? (
          <div className="flex items-end justify-center translate-x-16 lg:-translate-x-16 -translate-y-4 lg:-translate-y-8 z-20 pointer-events-none">
            <div key={activeHero.id} className="flex flex-col items-center gap-0 z-30 animate-in fade-in slide-in-from-left-8 duration-300">
              <div className="relative origin-bottom transition-transform flex items-center justify-center">
                <img src={getHeroSprite(activeHero)} alt={activeHero.name} className="w-[470px] h-[470px] object-contain drop-shadow-[0px_12px_24px_rgba(0,0,0,0.8)]" />
              </div>
              <UnitNameplate side="hero" size="md" className="-mt-36">{activeHero.name}</UnitNameplate>
            </div>
          </div>
        ) : null}

        {/* ── ENEMIES FOCUS (Desktop Alignment Fix) ── */}
        {!isBoss ? (
          <div className="flex items-end justify-center gap-4 -translate-x-20 lg:translate-y-28 z-10">
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
                    <div className="w-24 h-2 bg-plum-950 border-2 border-ink flex">
                      <div className="bg-hp h-full transition-all" style={{ width: `${Math.max(0, (e.hp / e.maxHp) * 100)}%` }} />
                    </div>
                    <div className={`relative transition-transform flex items-center justify-center ${e.staggered ? 'animate-bounce' : isAttacking ? 'animate-pulse scale-110' : ''}`}>
                      <img src={`/assets/expedition/enemy_frame_${isAttacking ? enemyFrame : 0}.png`} alt={e.name} className={`w-56 h-56 object-contain scale-x-[-1] transition-all duration-300 ${isCurrent ? 'drop-shadow-[0px_0px_12px_rgba(250,204,21,1)]' : 'drop-shadow-[0px_12px_24px_rgba(0,0,0,0.8)]'}`} onError={(ev) => { (ev.currentTarget as HTMLElement).style.display = 'none'; }} />
                      {e.hp <= 0 && <div className="absolute inset-0 bg-hp/50 mix-blend-color-burn rounded-full animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_infinite]" />}
                      {e.staggered && e.hp > 0 && (
                        <div className="absolute inset-x-0 -top-8 z-20 flex items-center justify-center pointer-events-none">
                          <div className="w-36 h-18 overflow-hidden relative">
                            <img src="/assets/expedition/stun_spritesheet_tight.png" className="absolute top-0 left-0 h-full w-[500%] max-w-none animate-sprite-5" alt="Stun" />
                          </div>
                        </div>
                      )}
                    </div>
                    <UnitNameplate side="enemy" size="md" className={cn(!isCurrent && 'opacity-80')}>{e.name}</UnitNameplate>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center gap-1 -translate-x-20 lg:-translate-y-8 z-10">
                <div className="w-32 h-2 bg-plum-950 border-2 border-ink flex">
                  <div className="bg-hp h-full transition-all" style={{ width: `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%` }} />
                </div>
                <div className={`relative transition-transform flex items-center justify-center ${enemy.staggered ? 'animate-bounce' : ''}`}>
                  <img src={`/assets/expedition/enemy_frame_${enemyFrame}.png`} alt={enemy.name} className="w-72 h-72 object-contain drop-shadow-[0px_12px_24px_rgba(0,0,0,0.8)] scale-x-[-1]" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
                  {enemy.hp <= 0 && <div className="absolute inset-0 bg-hp/50 mix-blend-color-burn rounded-full animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_infinite]" />}
                  {enemy.staggered && enemy.hp > 0 && (
                    <div className="absolute inset-x-0 -top-8 z-20 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-24 overflow-hidden relative">
                        <img src="/assets/expedition/stun_spritesheet_tight.png" className="absolute top-0 left-0 h-full w-[500%] max-w-none animate-sprite-5" alt="Stun" />
                      </div>
                    </div>
                  )}
                </div>
                <UnitNameplate side="enemy" size="md">{enemy.name}</UnitNameplate>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="lg:hidden relative z-40 w-full flex flex-col gap-2 bg-plum-900 border-t-[3px] border-ink p-2 sm:p-3 pb-safe">
        <div className="hidden landscape:flex justify-center">
          {renderTurnBar()}
        </div>
        <CommandMenu commands={combatCommands} />
      </div>

      <div className="hidden lg:flex relative z-40 items-center justify-between gap-4 bg-plum-900 border-t-[3px] border-ink px-4 py-3">
        <div className="shrink-0">
          {renderTurnBar()}
        </div>
        <CommandMenu commands={combatCommands} />
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
          {showItemsMenu && (
            <ItemMenuOverlay
              inventory={inventory}
              onClose={() => setShowItemsMenu(false)}
              onUseItem={(id) => { handleUseItem(id); setShowItemsMenu(false); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}