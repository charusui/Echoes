import { useState, useCallback } from 'react';
import { Volume2, VolumeX, ArrowLeft, Map, BookOpen, Settings, ScrollText } from 'lucide-react';
import { audioEngine } from '../../services/audioSynth';
import { 
  DEFAULT_HEROES, 
  EXPEDITION_INSTRUMENTS, 
  EXPEDITION_NODES, 
  EXPEDITION_QUESTS,
  type HeroProfile, 
  type HarmonydexEntry,
  type MapNode,
  type ExpeditionQuest
} from '../../types/expedition';
import { ExpeditionOverworld } from './ExpeditionOverworld';
import { ExpeditionCombat } from './ExpeditionCombat';
import { HarmonydexModal } from './HarmonydexModal';
import { EquipmentModal } from './EquipmentModal';
import { QuestsModal } from './QuestsModal';
import { CombatResultModal } from './CombatResultModal';

interface ExpeditionScreenProps {
  onBack: () => void;
}

export function ExpeditionScreen({ onBack }: ExpeditionScreenProps) {
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
  const [activeModal, setActiveModal] = useState<'none' | 'harmonydex' | 'equipment' | 'quests' | 'result'>('none');
  const [lastBattleResult, setLastBattleResult] = useState<{
    victory: boolean;
    xpGained: number;
    capturedEntry?: HarmonydexEntry;
  } | null>(null);

  const [isMuted, setIsMuted] = useState(false);

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
    <div className="min-h-screen bg-[#2a2d43] text-white font-sans flex flex-col overflow-hidden relative">
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
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e0e5ed] text-[#0f0c0c] border-[3px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] hover:bg-[#da2d46] hover:text-white transition-all font-orbitron font-black text-xs uppercase -skew-x-6 active:translate-y-0.5 active:shadow-none"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">LEAVE EXPEDITION</span>
            <span className="sm:hidden">EXIT</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-orbitron font-black text-[#facc15] tracking-wider drop-shadow-[2px_2px_0px_#0f0c0c]">
              🎼 HARMONYDEX
            </span>
          </div>

          {/* Active Quest Pill */}
          <div 
            onClick={() => setActiveModal('quests')}
            className="cursor-pointer flex items-center gap-2 px-3 py-1 bg-[#da2d46] text-white border-[3px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6 hover:bg-[#ff3b56] transition-all"
            title="Click to view Quest Journal"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#facc15] animate-pulse border border-[#0f0c0c]" />
            <span className="font-orbitron font-bold text-2xs sm:text-xs uppercase tracking-wider">
              QUEST: {activeQuest ? activeQuest.title.split('. ')[1] || activeQuest.title : 'Valley Cleansed!'}
            </span>
          </div>
        </div>

        {/* Right: Navigation Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setSubView('overworld')}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 border-[3px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] font-orbitron font-bold text-xs uppercase -skew-x-6 transition-all active:translate-y-0.5 active:shadow-none ${
              subView === 'overworld' ? 'bg-[#facc15] text-[#0f0c0c]' : 'bg-[#1e2238] text-white hover:bg-[#2a304e]'
            }`}
            title="Overworld Map"
          >
            <Map className="w-3.5 h-3.5" />
            <span className="hidden md:inline">MAP</span>
          </button>

          <button
            onClick={() => setActiveModal('harmonydex')}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#38bdf8] text-[#0f0c0c] border-[3px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] font-orbitron font-bold text-xs uppercase -skew-x-6 hover:bg-[#5cd0ff] transition-all active:translate-y-0.5 active:shadow-none"
            title="Instrument Encyclopedia"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden md:inline">DEX</span>
            <span className="px-1.5 py-0.5 bg-[#0f0c0c] text-[#facc15] rounded-none text-[10px] font-black skew-x-6">
              {capturedCount}/{totalCount}
            </span>
          </button>

          <button
            onClick={() => setActiveModal('equipment')}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-[#4ade80] text-[#0f0c0c] border-[3px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] font-orbitron font-bold text-xs uppercase -skew-x-6 hover:bg-[#6bee9c] transition-all active:translate-y-0.5 active:shadow-none"
            title="Equip Weapons to Heroes"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden md:inline">EQUIP</span>
          </button>

          <button
            onClick={() => setActiveModal('quests')}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-[#f43f5e] text-white border-[3px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] font-orbitron font-bold text-xs uppercase -skew-x-6 hover:bg-[#ff5a75] transition-all active:translate-y-0.5 active:shadow-none"
            title="Quest Journal"
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span className="hidden md:inline">QUESTS</span>
          </button>

          <button
            onClick={handleToggleMute}
            className="p-1.5 sm:p-2 bg-[#e0e5ed] text-[#0f0c0c] border-[3px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6 hover:bg-[#da2d46] hover:text-white transition-all active:translate-y-0.5 active:shadow-none"
            title="Toggle Audio"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
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
          />
        ) : (
          <ExpeditionCombat 
            party={party}
            enemyId={activeEnemyId}
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
