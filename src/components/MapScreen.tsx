import React, { useState, useCallback, useEffect } from 'react';
import { Volume2, VolumeX, ArrowLeft, Map, BookOpen, Settings, Camera, Flame, Shield, Lock, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useProgress } from '../context/ProgressProvider';
import mapImg from '../assets/png/visayas_map.png';
import { audioEngine } from '../services/audioSynth';
import { 
  DEFAULT_HEROES, 
  EXPEDITION_INSTRUMENTS, 
  EXPEDITION_NODES, 
  EXPEDITION_QUESTS,
  type HeroProfile, 
  type HarmonydexEntry,
  type MapNode,
  type ExpeditionQuest
} from '../types/expedition';
import { ExpeditionOverworld } from './expedition/ExpeditionOverworld';
import { ExpeditionCombat, type TurnUpdateInfo } from './expedition/ExpeditionCombat';
import { HarmonydexModal } from './expedition/HarmonydexModal';
import { EquipmentModal } from './expedition/EquipmentModal';
import { QuestsModal } from './expedition/QuestsModal';
import { CombatResultModal } from './expedition/CombatResultModal';
import { MariaShopModal } from './expedition/MariaShopModal';

export interface ExpeditionScreenProps {
  onBack: () => void;
  onOpenScanner?: () => void;
  onOpenLocationServices?: () => void;
  onOpenCollection?: () => void;
  onOpenBadges?: () => void;
  onOpenRanks?: () => void;
  isRootMap?: boolean;
  onCombatStateChange?: (inCombat: boolean) => void;
}

export function ExpeditionScreen({
  onBack,
  onOpenScanner,
  onOpenLocationServices,
  onOpenCollection,
  onOpenBadges,
  onOpenRanks,
  isRootMap,
  onCombatStateChange,
}: ExpeditionScreenProps) {
  // State for party, inventory, nodes, and quests
  const [party, setParty] = useState<Record<string, HeroProfile>>({ ...DEFAULT_HEROES });
  const [dex, setDex] = useState<Record<string, HarmonydexEntry>>({ ...EXPEDITION_INSTRUMENTS });
  const [nodes, setNodes] = useState<Record<string, MapNode>>({ ...EXPEDITION_NODES });
  const [quests, setQuests] = useState<Record<string, ExpeditionQuest>>({ ...EXPEDITION_QUESTS });
  
  // Navigation & View state
  const [subView, setSubView] = useState<'overworld' | 'combat'>('overworld');
  const [activeEnemyId, setActiveEnemyId] = useState<string>('corrupted_violin');
  const [currentNodeId, setCurrentNodeId] = useState<string>('cadence_town');
  
  // Modal states
  const [activeModal, setActiveModal] = useState<'none' | 'harmonydex' | 'equipment' | 'quests' | 'result' | 'shop'>('none');
  const [lastBattleResult, setLastBattleResult] = useState<{
    victory: boolean;
    xpGained: number;
    capturedEntry?: HarmonydexEntry;
  } | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [turnInfo, setTurnInfo] = useState<TurnUpdateInfo | null>(null);

  useEffect(() => {
    onCombatStateChange?.(subView === 'combat');
  }, [subView, onCombatStateChange]);

  const handleToggleMute = useCallback(() => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  }, []);

  // Compute active quest
  const activeQuest = Object.values(quests).find(q => q.status === 'active') || Object.values(quests)[2] || Object.values(quests)[0];
  const capturedCount = Object.values(dex).filter(i => i.captured).length;
  const totalCount = Object.keys(dex).length;

  const handleStartBattle = useCallback((enemyId: string) => {
    setActiveEnemyId(enemyId);
    setSubView('combat');
  }, []);

  const handleCombatResult = useCallback((result: { victory: boolean; xpGained: number; capturedEntry?: HarmonydexEntry }) => {
    if (result.capturedEntry) {
      setDex(prev => ({
        ...prev,
        [result.capturedEntry!.id]: {
          ...prev[result.capturedEntry!.id]!,
          captured: true,
        }
      }));
    }

    if (result.victory) {
      setNodes(prev => ({
        ...prev,
        [currentNodeId]: {
          ...prev[currentNodeId]!,
          completed: true,
        }
      }));

      if (activeEnemyId === 'corrupted_violin' && quests['q2']?.status === 'active') {
        setQuests(prev => ({
          ...prev,
          q2: { ...prev.q2!, status: 'completed' },
          q3: { ...prev.q3!, status: 'active' },
        }));
      } else if (activeEnemyId === 'titan_brass' && quests['q3']?.status === 'active') {
        setQuests(prev => ({
          ...prev,
          q3: { ...prev.q3!, status: 'completed' },
          q4: { ...prev.q4!, status: 'active' },
        }));
      } else if (activeEnemyId === 'lord_cacophony' && quests['q4']?.status === 'active') {
        setQuests(prev => ({
          ...prev,
          q4: { ...prev.q4!, status: 'completed' },
        }));
      }
    }

    setLastBattleResult(result);
    setActiveModal('result');
    setSubView('overworld');
  }, [activeEnemyId, quests]);

  const handleEquipWeapon = useCallback((heroId: string, instrumentId: string) => {
    setParty(prev => {
      const hero = prev[heroId];
      if (!hero) return prev;
      return {
        ...prev,
        [heroId]: {
          ...hero,
          equippedId: instrumentId,
        }
      };
    });
  }, []);

  return (
    <div className="h-screen max-h-screen bg-[#2a2d43] text-white font-sans flex flex-col overflow-hidden relative">
      {/* Background Halftone Pattern & Speed Slashes */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#da2d46 2px, transparent 2px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#da2d46]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#38bdf8]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Neo-Brutalist HUD Bar */}
      <header className="relative z-20 bg-[#1e2238] border-b-[4px] border-[#0f0c0c] px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-[0px_4px_0px_0px_#0f0c0c]">
        {/* Left: Brand & Active Quest Pill */}
        <div className="flex items-center gap-3 flex-wrap">
          {!isRootMap && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e0e5ed] text-[#0f0c0c] border-[3px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] hover:bg-[#da2d46] hover:text-white transition-all font-orbitron font-black text-xs uppercase -skew-x-6 active:translate-y-0.5 active:shadow-none"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">LEAVE EXPEDITION</span>
              <span className="sm:hidden">EXIT</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-orbitron font-black text-[#facc15] tracking-wider drop-shadow-[2px_2px_0px_#0f0c0c]">
              🎼 MUSIKULTURA
            </span>
          </div>

          {/* Active Quest Pill */}
          <div 
            onClick={() => setActiveModal('quests')}
            className="cursor-pointer flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 bg-[#da2d46] text-white border-[2px] sm:border-[3px] border-[#0f0c0c] shadow-[1px_1px_0px_0px_#0f0c0c] sm:shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6 hover:bg-[#ff3b56] transition-all max-w-[145px] sm:max-w-xs"
            title="Click to view Quest Journal"
          >
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#facc15] animate-pulse border border-[#0f0c0c] shrink-0" />
            <span className="font-orbitron font-bold text-[9px] sm:text-xs uppercase tracking-wider truncate">
              QUEST: {activeQuest ? activeQuest.title.split('. ')[1] || activeQuest.title : 'Valley Cleansed!'}
            </span>
          </div>
        </div>

        {/* Right: Navigation Buttons & Mobile Turn Bar right next to mute sound button */}
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
          <button
            onClick={() => onOpenCollection ? onOpenCollection() : setActiveModal('harmonydex')}
            className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-1 sm:py-1.5 bg-[#38bdf8] text-[#0f0c0c] border-[2px] sm:border-[3px] border-[#0f0c0c] shadow-[1px_1px_0px_0px_#0f0c0c] sm:shadow-[2px_2px_0px_0px_#0f0c0c] font-orbitron font-bold text-[10px] sm:text-xs uppercase -skew-x-6 hover:bg-[#5cd0ff] transition-all active:translate-y-0.5 active:shadow-none"
            title="Instrument Encyclopedia"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">DEX</span>
            <span className="px-1 py-0.5 bg-[#0f0c0c] text-[#facc15] rounded-none text-[9px] sm:text-[10px] font-black skew-x-6">
              {capturedCount}/{totalCount}
            </span>
          </button>

          <button
            onClick={() => setActiveModal('equipment')}
            className="flex items-center gap-1 px-1.5 sm:px-3 py-1 sm:py-1.5 bg-[#4ade80] text-[#0f0c0c] border-[2px] sm:border-[3px] border-[#0f0c0c] shadow-[1px_1px_0px_0px_#0f0c0c] sm:shadow-[2px_2px_0px_0px_#0f0c0c] font-orbitron font-bold text-[10px] sm:text-xs uppercase -skew-x-6 hover:bg-[#6bee9c] transition-all active:translate-y-0.5 active:shadow-none"
            title="Equip Weapons to Heroes"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">EQUIP</span>
          </button>

          <button
            onClick={handleToggleMute}
            className="p-1 sm:p-2 bg-[#e0e5ed] text-[#0f0c0c] border-[2px] sm:border-[3px] border-[#0f0c0c] shadow-[1px_1px_0px_0px_#0f0c0c] sm:shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6 hover:bg-[#da2d46] hover:text-white transition-all active:translate-y-0.5 active:shadow-none"
            title="Toggle Audio"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          {subView === 'combat' && turnInfo && (
            <div className="lg:hidden flex items-center gap-0.5 bg-[#1e2238]/95 border-[2px] border-[#0f0c0c] shadow-[1px_1px_0px_0px_#0f0c0c] px-1.5 py-0.5 -skew-x-2 backdrop-blur-sm scale-[0.82] sm:scale-95 origin-left">
              <span className="font-orbitron font-black text-[8px] text-[#facc15] uppercase border-r border-slate-600 pr-1">
                TURN
              </span>
              <div className="flex items-center gap-0.5">
                {turnInfo.queue.map((unit, idx) => {
                  const isCurrent = idx === turnInfo.index % turnInfo.queue.length;
                  return (
                    <div 
                      key={idx}
                      className={`px-1 py-0.5 border border-[#0f0c0c] font-orbitron font-bold text-[8px] sm:text-[9px] flex items-center transition-all ${
                        isCurrent ? 'bg-[#facc15] text-[#0f0c0c] scale-105 shadow-[1px_1px_0px_0px_#0f0c0c]' : unit.isHero ? 'bg-[#2a2d43] text-white' : 'bg-[#da2d46] text-white'
                      }`}
                    >
                      <span>{unit.avatar}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main View Area */}
      <main className="relative z-10 flex-1 flex overflow-hidden">
        {subView === 'overworld' ? (
          <ExpeditionOverworld 
            nodes={nodes}
            currentNodeId={currentNodeId}
            onSelectNode={setCurrentNodeId}
            onStartBattle={handleStartBattle}
            onOpenQuests={() => setActiveModal('quests')}
            quests={quests}
            onOpenScanner={onOpenScanner}
            onOpenLocationServices={onOpenLocationServices}
            onOpenCollection={onOpenCollection}
            onOpenBadges={onOpenBadges}
            onOpenRanks={onOpenRanks}
            onOpenShop={() => setActiveModal('shop')}
          />
        ) : (
          <ExpeditionCombat 
            party={party}
            enemyId={activeEnemyId}
            dex={dex}
            onCombatResult={handleCombatResult}
            onFlee={() => setSubView('overworld')}
            onUpdateParty={setParty}
            onTurnUpdate={setTurnInfo}
          />
        )}
      </main>

      {/* Modals */}
      {activeModal === 'harmonydex' && (
        <HarmonydexModal 
          dex={dex}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'equipment' && (
        <EquipmentModal 
          party={party}
          dex={dex}
          onEquip={handleEquipWeapon}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'shop' && (
        <MariaShopModal 
          party={party}
          onUpdateParty={setParty}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'quests' && (
        <QuestsModal 
          quests={quests}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'result' && lastBattleResult && (
        <CombatResultModal 
          result={lastBattleResult}
          onContinue={() => setActiveModal('none')}
        />
      )}
    </div>
  );
}

export interface MapScreenProps {
  onOpenScanner: () => void;
  onOpenLocationServices: () => void;
  onSelectInstrument?: (instrumentName: string) => void;
  onOpenCollection: () => void;
  onOpenBadges?: () => void;
  onOpenRanks?: () => void;
  onOpenExpedition?: () => void;
}

export function MapScreen({ onOpenScanner, onOpenLocationServices, onOpenCollection, onOpenBadges, onOpenRanks, onOpenExpedition }: MapScreenProps) {
  return (
    <ExpeditionScreen
      isRootMap={true}
      onBack={onOpenExpedition || (() => {})}
      onOpenScanner={onOpenScanner}
      onOpenLocationServices={onOpenLocationServices}
      onOpenCollection={onOpenCollection}
      onOpenBadges={onOpenBadges}
      onOpenRanks={onOpenRanks}
    />
  );
}

const REGION_PINS = [
  { id: 'western', name: 'Western Visayas', instrument: 'Tultugan', levelRequired: 1, top: '45%', left: '25%', emoji: '🪘', totalInstruments: 6 },
  { id: 'central', name: 'Central Visayas', instrument: 'Cebuano Gitara', levelRequired: 2, top: '65%', left: '55%', emoji: '🎸', totalInstruments: 5 },
  { id: 'eastern', name: 'Eastern Visayas', instrument: 'Lantoy', levelRequired: 3, top: '40%', left: '80%', emoji: '🎶', totalInstruments: 3 },
  { id: 'negros', name: 'Negros Region', instrument: 'Subing', levelRequired: 4, top: '60%', left: '42%', emoji: '🎵'}, 
];

// Legacy MapScreen code kept for reference if needed
export function LegacyMapScreen({ onOpenScanner, onOpenLocationServices, onSelectInstrument, onOpenCollection: _onOpenCollection, onOpenBadges, onOpenRanks, onOpenExpedition }: MapScreenProps) {
  const { progress } = useProgress();
  const [isExpeditionsExpanded, setIsExpeditionsExpanded] = useState(false);

  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1000,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Panning & Zoom States
  const [mapScale, setMapScale] = useState(1.2);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [touchStartDist, setTouchStartDist] = useState(0);

  const getBoundedPan = (x: number, y: number, scale: number) => {
    const limitX = scale > 1 ? (dimensions.width / 2) * (1 - 1 / scale) : 0;
    const limitY = scale > 1 ? (dimensions.height / 2) * (1 - 1 / scale) : 0;
    return {
      x: Math.max(-limitX, Math.min(limitX, x)),
      y: Math.max(-limitY, Math.min(limitY, y)),
    };
  };

  const handlePanStart = (clientX: number, clientY: number) => {
    setIsPanning(true);
    setPanStart({ x: clientX - panOffset.x, y: clientY - panOffset.y });
  };

  const handlePanMove = (clientX: number, clientY: number) => {
    if (!isPanning) return;
    const newX = clientX - panStart.x;
    const newY = clientY - panStart.y;
    setPanOffset(getBoundedPan(newX, newY, mapScale));
  };

  const handlePanEnd = () => setIsPanning(false);

  const getTouchDist = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) setTouchStartDist(getTouchDist(e.touches));
    else if (e.touches.length === 1) handlePanStart(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDist > 0) {
      const dist = getTouchDist(e.touches);
      const factor = dist / touchStartDist;
      const newScale = Math.max(1.0, Math.min(3.0, mapScale * (1 + (factor - 1) * 0.1)));
      setMapScale(newScale);
      setPanOffset(prev => getBoundedPan(prev.x, prev.y, newScale));
    } else if (e.touches.length === 1) {
      handlePanMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) setTouchStartDist(0);
    handlePanEnd();
  };

  const handleWheel = (e: React.WheelEvent) => {
    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.max(1.0, Math.min(3.0, mapScale + scaleAmount));
    setMapScale(newScale);
    setPanOffset(prev => getBoundedPan(prev.x, prev.y, newScale));
  };

  const xpForNextLevel = progress.level === 1 ? 100 : progress.level === 2 ? 250 : progress.level === 3 ? 500 : progress.level === 4 ? 900 : 900;
  const xpProgress = Math.min((progress.xp / xpForNextLevel) * 100, 100);

  const levelTitle =
    progress.level === 1 ? 'APPRENTICE'
    : progress.level === 2 ? 'VILLAGE MUSICIAN'
    : progress.level === 3 ? 'CULTURAL KEEPER'
    : progress.level === 4 ? 'REGIONAL EXPERT'
    : 'MASTER INSTRUMENTALIST';

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden pb-safe bg-[#2a2d43] z-0">
      
      <div 
        className="absolute inset-0 z-[-3] opacity-30 pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#da2d46 2px, transparent 2px)', backgroundSize: '20px 20px' }}
      />

      {/* ─── Background Map Image & Interactive Pins ─── */}
      <div
        className={`absolute inset-0 z-[2] select-none cursor-grab active:cursor-grabbing ${isPanning ? '' : 'transition-transform duration-300 ease-out'}`}
        style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${mapScale})` }}
        onMouseDown={e => handlePanStart(e.clientX, e.clientY)}
        onMouseMove={e => handlePanMove(e.clientX, e.clientY)}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={mapImg}
            alt="Visayas Map"
            className="w-full h-full object-cover"
            style={{
              opacity: 0.8,
              mixBlendMode: 'hard-light',
              filter: 'saturate(1.5) contrast(1.2) sepia(0.3) hue-rotate(-10deg)',
            }}
          />
        </div>

        {/* ─── Map Pins ─── */}
        <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
          {REGION_PINS.map(pin => {
            let isUnlocked = progress.unlockedRegions.includes(pin.name);
            if (pin.name === 'Western Visayas') isUnlocked = progress.level >= 1;
            else if (pin.name === 'Central Visayas') isUnlocked = progress.level >= 2;
            else if (pin.name === 'Eastern Visayas') isUnlocked = progress.level >= 3;
            else if (pin.name === 'Negros Region') isUnlocked = progress.level >= 4;

            const acquiredCount = progress.unlockedInstruments.includes(pin.instrument) ? 1 : 0;

            // DYNAMIC LABEL OFFSET: Calculates screen position to prevent edge clipping
            const pinLeftRatio = parseFloat(pin.left) / 100;
            const relativeX = dimensions.width * pinLeftRatio - dimensions.width / 2;
            const screenX = dimensions.width / 2 + (relativeX + panOffset.x) * mapScale;
            
            let labelOffset = '-50%'; // default centered
            if (screenX < 120) labelOffset = '-15%'; // Pin near left edge -> shift right
            else if (screenX > dimensions.width - 120) labelOffset = '-85%'; // Pin near right edge -> shift left

            return (
              <button
                key={pin.id}
                onClick={() => isUnlocked && onSelectInstrument?.(pin.instrument)}
                disabled={!isUnlocked}
                className="absolute pointer-events-auto group"
                style={{
                  top: pin.top, left: pin.left,
                  cursor: isUnlocked ? 'pointer' : 'not-allowed',
                  transform: `translate(-50%, -50%) scale(${1 / mapScale})`,
                  transformOrigin: 'center center',
                }}
              >
                {/* Wrapper ensures animation affects both circle and label without messing up flex centering */}
                <div className="relative flex flex-col items-center animate-comic-bounce">
                  
                  {/* Bouncing Circular Pin */}
                  <div className={`relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full border-[3px] sm:border-[4px] border-[#0f0c0c] flex items-center justify-center text-lg sm:text-xl transition-colors ${
                    isUnlocked 
                      ? 'bg-gradient-to-br from-[#da2d46] to-[#f0dde0] shadow-[4px_4px_0px_0px_#0f0c0c]' 
                      : 'bg-gradient-to-br from-[#2a2d43] to-[#888ea1] shadow-[2px_2px_0px_0px_#0f0c0c]'
                  }`}>
                    
                    {/* Comic Ripples */}
                    {isUnlocked && (
                      <>
                        <div className="absolute inset-0 rounded-full border-[3px] border-[#da2d46] animate-comic-ripple" />
                        <div className="absolute inset-0 rounded-full border-[3px] border-[#da2d46] animate-comic-ripple-delayed" />
                      </>
                    )}
                    <span className="relative z-10 block translate-y-px">{isUnlocked ? pin.emoji : <Lock size={16} className="text-[#0f0c0c]"/>}</span>
                  </div>

                  {/* Absolutely Positioned Label (Stays connected to circle but adjusts bounds dynamically) */}
                  <div 
                    className={`absolute top-full mt-2 w-max px-3 py-1 sm:px-4 sm:py-1.5 border-[3px] border-[#0f0c0c] flex flex-col items-center justify-center text-center shadow-[4px_4px_0px_0px_#0f0c0c] transition-all duration-300 ${
                      isUnlocked ? 'bg-[#da2d46] group-hover:bg-[#e0e5ed]' : 'bg-[#2a2d43]'
                    }`}
                    style={{
                      left: '50%',
                      transform: `translateX(${labelOffset}) skewX(-6deg)`
                    }}
                  >
                    <p className={`font-orbitron font-black text-[9px] sm:text-[10px] tracking-widest uppercase ${isUnlocked ? 'text-[#0f0c0c]' : 'text-[#888ea1]'}`}>
                      {isUnlocked ? pin.name : 'LOCKED'}
                    </p>
                    
                    {isUnlocked ? (
                      <p className="font-space-mono flex items-center justify-center gap-1 text-[8px] sm:text-[9px] text-[#0f0c0c] font-black uppercase mt-0.5">
                        <span>♪ {pin.instrument}</span>
                        {pin.totalInstruments && (
                          <span className="bg-[#0f0c0c] text-[#f0dde0] px-1 ml-1 rounded-[2px]">
                            {acquiredCount}/{pin.totalInstruments}
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="font-space-mono flex items-center justify-center gap-1 text-[8px] sm:text-[9px] text-[#888ea1] font-black uppercase mt-0.5">
                        <Lock size={10} /> LVL {pin.levelRequired}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none z-[3] border-[12px] border-[#0f0c0c] md:hidden" />

      {/* ─── HUD (COMPACTED HEAVILY FOR MOBILE) ─── */}
      <div className="absolute top-0 right-0 z-40 p-2 pt-6 sm:p-6 sm:pt-12 flex flex-col items-end gap-1.5 sm:gap-3 pointer-events-none w-full max-w-[220px] sm:max-w-sm">
        
        {/* Main HUD Panel */}
        <div className="bg-[#e0e5ed] border-[2px] sm:border-[4px] border-[#0f0c0c] p-1.5 sm:p-3 shadow-[3px_3px_0px_0px_#0f0c0c] sm:shadow-[6px_6px_0px_0px_#0f0c0c] -skew-x-2 pointer-events-auto w-full">
          
          <div className="flex items-start justify-between gap-1.5 sm:gap-3 skew-x-2">
            <div className="text-left flex-1">
              <h1 
                className="font-orbitron text-[14px] sm:text-2xl font-black uppercase text-[#e0e5ed] leading-none"
                style={{ textShadow: '2px 2px 0px #0f0c0c, -1px 0px 0px #da2d46' }}
              >
                VISAYAS ARC
              </h1>
              <div className="inline-block bg-[#0f0c0c] px-1 sm:px-2 py-0.5 mt-0.5 sm:mt-1 -skew-x-6">
                <p className="font-space-mono text-[7px] sm:text-[10px] uppercase font-bold text-[#f0dde0] skew-x-6 tracking-widest leading-tight">
                  {levelTitle}
                </p>
              </div>
            </div>

            {/* Streak & Shields */}
            <div className="flex flex-col items-end mt-0.5">
              <div className="flex items-center gap-1 font-orbitron font-black text-[10px] sm:text-lg bg-[#da2d46] border-2 border-[#0f0c0c] px-1 sm:px-2 shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6 text-[#0f0c0c]">
                <Flame size={10} className="skew-x-6 sm:w-4 sm:h-4" />
                <span className="skew-x-6 leading-tight">{progress.currentStreak}</span>
              </div>
              <div className="flex gap-0.5 sm:gap-1 mt-1 sm:mt-1.5">
                {Array.from({ length: progress.streakShields }).map((_, i) => (
                  <Shield key={i} size={8} className="text-[#0f0c0c] fill-[#f0dde0] sm:w-[14px]" />
                ))}
              </div>
            </div>
          </div>

          {/* Heavy XP Bar */}
          <div className="mt-1.5 sm:mt-4 skew-x-2">
            <div className="flex justify-between mb-0.5 sm:mb-1 font-space-mono text-[7px] sm:text-[10px] font-black text-[#0f0c0c] uppercase">
              <span>LVL {progress.level}</span>
              <span>{progress.xp} / {xpForNextLevel} XP</span>
            </div>
            <div className="h-1.5 sm:h-3 w-full border-[2px] sm:border-[3px] border-[#0f0c0c] bg-[#2a2d43] relative skew-x-6">
              <div
                className="h-full bg-[#da2d46] transition-all duration-500 ease-out"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Game Icon Menus - Row of Skewed Buttons */}
        <div className="flex gap-1.5 sm:gap-3 pointer-events-auto w-full justify-end">
          <button
            onClick={onOpenLocationServices}
            className="flex-1 max-w-[60px] sm:max-w-[80px] py-1 sm:py-2 bg-[#f0dde0] border-[2px] sm:border-[4px] border-[#0f0c0c] flex flex-col items-center justify-center gap-0.5 sm:gap-1 shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] -skew-x-6 active:translate-y-1 active:translate-x-1 active:shadow-none hover:bg-[#da2d46] hover:text-white transition-all group"
          >
            <Map size={14} className="skew-x-6 text-[#0f0c0c] group-hover:text-white sm:w-5 sm:h-5" />
            <span className="font-space-mono uppercase font-black text-[7px] sm:text-[9px] skew-x-6 text-[#0f0c0c] group-hover:text-white">Radar</span>
          </button>

          <button
            onClick={onOpenBadges}
            className="flex-1 max-w-[60px] sm:max-w-[80px] py-1 sm:py-2 bg-[#fbe8eb] border-[2px] sm:border-[4px] border-[#0f0c0c] flex flex-col items-center justify-center gap-0.5 sm:gap-1 shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] -skew-x-6 active:translate-y-1 active:translate-x-1 active:shadow-none hover:bg-[#da2d46] hover:text-white transition-all group"
          >
            <Shield size={14} className="skew-x-6 text-[#da2d46] group-hover:text-white sm:w-5 sm:h-5" />
            <span className="font-space-mono uppercase font-black text-[7px] sm:text-[9px] skew-x-6 text-[#0f0c0c] group-hover:text-white">Badges</span>
          </button>

          <button
            onClick={onOpenRanks}
            className="flex-1 max-w-[60px] sm:max-w-[80px] py-1 sm:py-2 bg-[#fef3c7] border-[2px] sm:border-[4px] border-[#0f0c0c] flex flex-col items-center justify-center gap-0.5 sm:gap-1 shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] -skew-x-6 active:translate-y-1 active:translate-x-1 active:shadow-none hover:bg-[#da2d46] hover:text-white transition-all group"
          >
            <Flame size={14} className="skew-x-6 text-[#d97706] group-hover:text-white sm:w-5 sm:h-5 animate-pulse" />
            <span className="font-space-mono uppercase font-black text-[7px] sm:text-[9px] skew-x-6 text-[#0f0c0c] group-hover:text-white">Ranks</span>
          </button>

          <button
            onClick={onOpenExpedition}
            className="flex-1 max-w-[60px] sm:max-w-[80px] py-1 sm:py-2 bg-[#facc15] border-[2px] sm:border-[4px] border-[#0f0c0c] flex flex-col items-center justify-center gap-0.5 sm:gap-1 shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] -skew-x-6 active:translate-y-1 active:translate-x-1 active:shadow-none hover:bg-[#da2d46] hover:text-white transition-all group animate-pulse"
            title="Harmonydex Expedition 33 Mode"
          >
            <Sparkles size={14} className="skew-x-6 text-[#0f0c0c] group-hover:text-white sm:w-5 sm:h-5" />
            <span className="font-space-mono uppercase font-black text-[7px] sm:text-[9px] skew-x-6 text-[#0f0c0c] group-hover:text-white">Exped</span>
          </button>
        </div>

        {/* Expeditions Accordion */}
        <div className="w-full pointer-events-auto bg-[#f0dde0] border-[2px] sm:border-[4px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] sm:shadow-[6px_6px_0px_0px_#0f0c0c] -skew-x-2">
          <button
            onClick={() => setIsExpeditionsExpanded(!isExpeditionsExpanded)}
            className="w-full p-1.5 sm:p-3 flex items-center justify-between text-left active:bg-[#da2d46] transition-colors"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 skew-x-2">
              <Sparkles size={12} className="text-[#0f0c0c] sm:w-4 sm:h-4" />
              <h2 className="font-orbitron font-black text-[8px] sm:text-[12px] text-[#0f0c0c] tracking-widest uppercase">
                YOUR EXPEDITIONS
              </h2>
            </div>
            {isExpeditionsExpanded ? <ChevronUp size={14} className="text-[#0f0c0c] skew-x-2" /> : <ChevronDown size={14} className="text-[#0f0c0c] skew-x-2" />}
          </button>

          {isExpeditionsExpanded && (
            <div className="p-2 sm:p-4 border-t-[2px] sm:border-t-[4px] border-[#0f0c0c] bg-[#e0e5ed] skew-x-2">
              <button
                onClick={onOpenExpedition}
                className="w-full mb-3 py-2 sm:py-2.5 bg-[#da2d46] text-white border-[3px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] font-orbitron font-black text-[9px] sm:text-xs uppercase -skew-x-6 hover:bg-[#ff3b56] transition-all flex items-center justify-center gap-1.5 active:translate-y-0.5 active:shadow-none"
              >
                <Sparkles size={14} className="fill-current animate-spin" />
                <span>ENTER HARMONYDEX EXPEDITION 33 ➔</span>
              </button>
              <div className="font-space-mono text-[7px] sm:text-[10px] font-bold text-[#e0e5ed] bg-[#0f0c0c] p-1.5 sm:p-3 -skew-x-2 mb-2 sm:mb-3 shadow-[1px_1px_0px_0px_#da2d46] sm:shadow-[3px_3px_0px_0px_#da2d46]">
                <span className="skew-x-2 block">
                  Scan instruments or play rhythm games to earn XP. Level up to unlock new regions!
                </span>
              </div>
              <div className="flex flex-col gap-1.5 sm:gap-3">
                {REGION_PINS.map(pin => {
                  const isUnlocked = progress.level >= pin.levelRequired;
                  const xpNeeded = pin.levelRequired === 1 ? 0 : pin.levelRequired === 2 ? 100 : pin.levelRequired === 3 ? 250 : 500;
                  const regionProgress = isUnlocked ? 100 : Math.min((progress.xp / Math.max(xpNeeded, 1)) * 100, 99);
                  return (
                    <div key={pin.id}>
                      <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                        <span className={`font-space-mono text-[7px] sm:text-[10px] font-black uppercase ${isUnlocked ? 'text-[#0f0c0c]' : 'text-[#888ea1]'}`}>
                          {pin.emoji} {pin.name}
                        </span>
                        <span className={`font-space-mono text-[6px] sm:text-[9px] font-black uppercase ${isUnlocked ? 'text-[#da2d46]' : 'text-[#888ea1]'}`}>
                          {isUnlocked ? 'UNLOCKED' : `LVL ${pin.levelRequired}`}
                        </span>
                      </div>
                      <div className="h-1 sm:h-2 w-full border border-[#0f0c0c] bg-[#2a2d43] -skew-x-6">
                        <div
                          className={`h-full transition-all duration-500 ease-out ${isUnlocked ? 'bg-[#da2d46]' : 'bg-[#888ea1]'}`}
                          style={{ width: `${regionProgress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── BOTTOM CTA (SCAN BUTTON & TOOLTIP) ─── */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none w-full px-4 sm:px-6 max-w-sm">
        
        <div className="relative w-full pointer-events-auto">
          {/* Restored: Tooltip Speech Bubble positioned clearly above */}
          {progress.xp === 0 && progress.unlockedInstruments.length === 0 && (
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-comic-float flex flex-col items-center">
              <div className="bg-[#f0dde0] border-[3px] sm:border-[4px] border-[#0f0c0c] text-[#0f0c0c] font-space-mono font-black text-[9px] sm:text-xs px-3 py-1.5 sm:px-4 sm:py-2 -skew-x-6 shadow-[3px_3px_0px_0px_#0f0c0c] whitespace-nowrap">
                <span className="skew-x-6 block tracking-widest">START YOUR ADVENTURE!</span>
              </div>
              {/* Bubble Tail */}
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#0f0c0c] mt-0.5" />
            </div>
          )}

          <button
            onClick={onOpenScanner}
            className="w-full flex items-center justify-center gap-2 sm:gap-3 py-3 sm:py-4 bg-[#da2d46] border-[4px] sm:border-[6px] border-[#0f0c0c] text-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] sm:shadow-[8px_8px_0px_0px_#0f0c0c] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_#0f0c0c] active:translate-y-2 active:translate-x-2 active:shadow-[0px_0px_0px_0px_#0f0c0c] transition-all -skew-x-6 group"
          >
            <Camera size={18} className="skew-x-6 font-black sm:w-6 sm:h-6" />
            <span className="font-space-mono font-black text-sm sm:text-lg tracking-widest uppercase skew-x-6">
              SCAN INSTRUMENT
            </span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes comic-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes comic-ripple {
          0% { transform: scale(0.8); opacity: 1; border-width: 4px; }
          100% { transform: scale(2.2); opacity: 0; border-width: 1px; }
        }
        @keyframes comic-float {
          0%, 100% { transform: translateY(0) translateX(-50%); }
          50% { transform: translateY(-6px) translateX(-50%); }
        }
        .animate-comic-bounce { animation: comic-bounce 1.5s ease-in-out infinite; }
        .animate-comic-ripple { animation: comic-ripple 2s ease-out infinite; }
        .animate-comic-ripple-delayed { animation: comic-ripple 2s 1s ease-out infinite; }
        .animate-comic-float { animation: comic-float 2s ease-in-out infinite; }

        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #2a2d43; border: 2px solid #0f0c0c; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #da2d46; border-right: 2px solid #0f0c0c; }
      `}</style>
    </div>
  );
}