import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useProgress } from '../context/ProgressProvider';
import { audioEngine } from '../services/audioSynth';
import {
  ArrowLeft as PxArrowLeft, BookOpen as PxBookOpen, Flag as PxFlag, Sword as PxSword,
  Volume3 as PxVolume3, VolumeX as PxVolumeX,
} from 'pixelarticons/react';
import { PixelButton, PixelIconButton } from './ui';
import { playUiSound } from '../hooks/useUiSound';
import { devParam } from '../lib/devParams';
import {
  type HeroProfile,
  type HarmonydexEntry,
  type MapNode,
  type ExpeditionQuest,
  DEFAULT_HEROES,
  EXPEDITION_INSTRUMENTS,
  EXPEDITION_NODES,
  EXPEDITION_QUESTS
} from '../types/expedition';
import { ExpeditionOverworld } from './expedition/ExpeditionOverworld';
import { ExpeditionCombat } from './expedition/ExpeditionCombat';
import { HarmonyStage } from './expedition/HarmonyStage';
import { HarmonydexModal } from './expedition/HarmonydexModal';
import { EquipmentModal } from './expedition/EquipmentModal';
import { QuestsModal } from './expedition/QuestsModal';
import { CombatResultModal } from './expedition/CombatResultModal';
import { MariaShopModal } from './expedition/MariaShopModal';
import { CrossroadsCutscene } from './expedition/CrossroadsCutscene';
import { TownEntranceCutscene } from './expedition/TownEntranceCutscene';
import { BossLoreCutscene } from './expedition/BossLoreCutscene';

export interface ExpeditionScreenProps {
  onBack: () => void;
  onOpenScanner?: () => void;
  onOpenLocationServices?: () => void;
  onOpenCollection?: () => void;
  onOpenBadges?: () => void;
  onOpenRanks?: () => void;
  onOpenKorlongHunt?: () => void;
  isRootMap?: boolean;
  onCombatStateChange?: (inCombat: boolean) => void;
  party: Record<string, HeroProfile>;
  setParty: React.Dispatch<React.SetStateAction<Record<string, HeroProfile>>>;
  dex: Record<string, HarmonydexEntry>;
  setDex: React.Dispatch<React.SetStateAction<Record<string, HarmonydexEntry>>>;
  nodes: Record<string, MapNode>;
  setNodes: React.Dispatch<React.SetStateAction<Record<string, MapNode>>>;
  quests: Record<string, ExpeditionQuest>;
  setQuests: React.Dispatch<React.SetStateAction<Record<string, ExpeditionQuest>>>;
}

export function ExpeditionScreen({
  onBack,
  onOpenScanner,
  onOpenLocationServices,
  onOpenCollection,
  onOpenBadges,
  onOpenRanks,
  onOpenKorlongHunt,
  isRootMap,
  onCombatStateChange,
  party,
  setParty,
  dex,
  setDex,
  nodes,
  setNodes,
  quests,
  setQuests,
}: ExpeditionScreenProps) {
  // Navigation & View state
  const { progress, updateInventory, updateShards } = useProgress();
  const [subView, setSubView] = useState<'overworld' | 'combat' | 'crossroads_cutscene' | 'town_cutscene' | 'boss_lore'>(() => (devParam('dev-subview') as 'crossroads_cutscene' | 'town_cutscene' | 'boss_lore' | null) ?? (devParam('dev-enemy') ? 'combat' : 'overworld'));
  const [activeEnemyId, setActiveEnemyId] = useState<string>(() => devParam('dev-enemy') ?? 'corrupted_violin');
  const [activeEnemyGauntlet, setActiveEnemyGauntlet] = useState<string[] | undefined>();
  const [currentNodeId, setCurrentNodeId] = useState<string>(() => devParam('dev-node') ?? 'cadence_town');

  // Boss lore: track pending enemy until lore is dismissed
  const [pendingBossId, setPendingBossId] = useState<string | null>(() => devParam('dev-subview') === 'boss_lore' ? (devParam('dev-enemy') ?? 'wakwak') : null);
  const [pendingGauntlet, setPendingGauntlet] = useState<string[] | undefined>();

  const BOSS_IDS = ['wakwak', 'bakunawa', 'santelmo'];

  const handleStartBattle = useCallback((enemyId: string, enemyGauntlet?: string[]) => {
    setActiveEnemyId(enemyId);
    setActiveEnemyGauntlet(enemyGauntlet);
    const isBoss = BOSS_IDS.some(b => enemyId === b || enemyGauntlet?.includes(b));
    if (isBoss) {
      const bossId = BOSS_IDS.find(b => enemyId === b || enemyGauntlet?.includes(b))!;
      setPendingBossId(bossId);
      setPendingGauntlet(enemyGauntlet);
      setSubView('boss_lore');
    } else {
      setSubView('combat');
    }
  }, []);
  const [activeModal, setActiveModal] = useState<'none' | 'harmonydex' | 'equipment' | 'quests' | 'result' | 'shop'>(() => (devParam('dev-modal') as 'harmonydex' | 'equipment' | 'quests' | 'shop' | null) ?? 'none');
  const [lastBattleResult, setLastBattleResult] = useState<{
    victory: boolean;
    xpGained: number;
    capturedEntry?: HarmonydexEntry;
  } | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const mapBgmRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Only play map BGM when we are in the overworld view and the shop is not open
    const shouldPlayMapBgm = subView === 'overworld' && activeModal !== 'shop';
    
    if (shouldPlayMapBgm) {
      if (!mapBgmRef.current) {
        mapBgmRef.current = new Audio('/assets/audio/bgm/map_bgm.mp3');
        mapBgmRef.current.loop = true;
        mapBgmRef.current.volume = 0.3;
      }
      mapBgmRef.current.muted = isMuted;
      mapBgmRef.current.play().catch((err) => {
        console.warn("Autoplay blocked map BGM:", err);
      });
    } else {
      if (mapBgmRef.current) {
        mapBgmRef.current.pause();
        mapBgmRef.current.currentTime = 0;
        mapBgmRef.current = null;
      }
    }

    return () => {
      if (mapBgmRef.current) {
        mapBgmRef.current.pause();
        mapBgmRef.current.currentTime = 0;
        mapBgmRef.current = null;
      }
    };
  }, [subView, activeModal, isMuted]);

  useEffect(() => {
    onCombatStateChange?.(subView === 'combat');
  }, [subView, onCombatStateChange]);

  const [hasSeenTownIntro, setHasSeenTownIntro] = useState(() => localStorage.getItem('echoes_town_intro') === 'true' || devParam('dev-view') !== null);

  useEffect(() => {
    if (currentNodeId === 'cadence_town' && !hasSeenTownIntro && subView === 'overworld') {
      setSubView('town_cutscene');
    }
  }, [currentNodeId, hasSeenTownIntro, subView]);

  const handleToggleMute = useCallback(() => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  }, []);

  // Compute active quest
  const activeQuest = Object.values(quests).find(q => q.status === 'active') || Object.values(quests)[2] || Object.values(quests)[0];
  const dexEntries = Object.values(dex).filter(i => !i.id.startsWith('generic_') && !i.isEnemy);
  const capturedCount = dexEntries.filter(i => i.captured).length;
  const totalCount = dexEntries.length;


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
      } else if ((activeEnemyId === 'titan_brass' || activeEnemyId === 'bandit') && quests['q3']?.status === 'active') {
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

    if (result.victory && currentNodeId === 'crossroads') {
      setSubView('crossroads_cutscene');
    } else {
      setLastBattleResult(result);
      setActiveModal('result');
      setSubView('overworld');
    }
  }, [activeEnemyId, quests, currentNodeId]);

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
    <div className="h-screen max-h-screen bg-plum-950 text-parchment-100 flex flex-col overflow-hidden relative">
      {/* Top bar — hidden on mobile landscape */}
      <header className="relative z-20 bg-plum-900 border-b-[3px] border-ink px-3 sm:px-5 py-2 flex items-center justify-between gap-3 [@media(orientation:landscape)_and_(max-height:600px)]:hidden">
        <div className="flex items-center gap-3 sm:gap-5 min-w-0">
          {!isRootMap && (
            <PixelButton size="sm" variant="ghost" icon={<PxArrowLeft />} sound="ui_back" onClick={onBack}>
              <span className="hidden sm:inline">Leave Expedition</span>
              <span className="sm:hidden">Exit</span>
            </PixelButton>
          )}

          <span className="shrink-0 font-bold text-xl sm:text-2xl leading-none text-gold-300">Musikultura</span>

          <button
            type="button"
            onClick={() => { playUiSound('journal_open'); setActiveModal('quests'); }}
            className="hidden min-[480px]:flex items-center gap-2 min-w-0 max-w-xs text-sm text-parchment-300 hover:text-parchment-100 focus-visible:outline-[3px] focus-visible:outline-gold-300"
            title="Open Quest Journal"
          >
            <PxFlag className="size-4 shrink-0 text-gold-300" aria-hidden />
            <span className="truncate">
              {activeQuest ? activeQuest.title.split('. ')[1] || activeQuest.title : 'Valley Cleansed!'}
            </span>
          </button>
        </div>

        <nav className="flex items-center gap-2 shrink-0">
          <PixelButton
            size="sm"
            icon={<PxBookOpen />}
            title="Instrument Encyclopedia"
            onClick={() => onOpenCollection ? onOpenCollection() : setActiveModal('harmonydex')}
          >
            <span className="hidden sm:inline">Dex </span>
            <span className="sm:ml-1 text-gold-300">{capturedCount}/{totalCount}</span>
          </PixelButton>

          <PixelButton size="sm" icon={<PxSword />} title="Equip instruments to heroes" onClick={() => setActiveModal('equipment')}>
            <span className="hidden sm:inline">Equip</span>
          </PixelButton>

          <PixelIconButton
            className="size-9"
            icon={isMuted ? <PxVolumeX /> : <PxVolume3 />}
            label={isMuted ? 'Unmute audio' : 'Mute audio'}
            onClick={handleToggleMute}
          />
        </nav>
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
            onOpenKorlongHunt={onOpenKorlongHunt}
            onOpenShop={() => setActiveModal('shop')}
            onNodeComplete={(id) => {
              setNodes(prev => ({ ...prev, [id]: { ...prev[id]!, completed: true } }));
            }}
          />
        ) : subView === 'town_cutscene' ? (
          <TownEntranceCutscene
            onComplete={() => {
              localStorage.setItem('echoes_town_intro', 'true');
              setHasSeenTownIntro(true);
              setSubView('overworld');
            }}
          />
        ) : subView === 'crossroads_cutscene' ? (
          <CrossroadsCutscene
            onComplete={() => {
              setSubView('overworld');
            }}
          />
        ) : subView === 'boss_lore' && pendingBossId ? (
          <BossLoreCutscene
            bossId={pendingBossId}
            onComplete={() => {
              setPendingBossId(null);
              setSubView('combat');
            }}
          />
        ) : activeEnemyId.startsWith('bakunawa') ? (
          <HarmonyStage
            party={party}
            enemyId={activeEnemyId}
            enemyGauntlet={activeEnemyGauntlet}
            dex={dex}
            onCombatResult={handleCombatResult}
            onFlee={() => setSubView('overworld')}
            onUpdateParty={setParty}
          />
        ) : (
          <ExpeditionCombat
            party={party}
            enemyId={activeEnemyId}
            enemyGauntlet={activeEnemyGauntlet}
            dex={dex}
            onCombatResult={handleCombatResult}
            onFlee={() => setSubView('overworld')}
            onUpdateParty={setParty}
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
          nodes={nodes}
          onUpdateParty={setParty}
          onClose={() => setActiveModal('none')}
          onUpdateInventory={updateInventory}
          shards={progress.shards || 0}
          onUpdateShards={updateShards}
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
