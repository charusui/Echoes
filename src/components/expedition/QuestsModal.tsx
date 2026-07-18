import { X, ScrollText, CheckCircle2, CircleDot, Lock } from 'lucide-react';
import { type ExpeditionQuest } from '../../types/expedition';

interface QuestsModalProps {
  quests: Record<string, ExpeditionQuest>;
  onClose: () => void;
}

export function QuestsModal({ quests, onClose }: QuestsModalProps) {
  const questList = Object.values(quests);

  return (
    <div className="fixed inset-0 z-50 bg-[#0f0c0c]/80 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#1e2238] border-[5px] border-[#0f0c0c] shadow-[10px_10px_0px_0px_#0f0c0c] max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden -skew-x-1 animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="bg-[#0f0c0c] text-white px-5 py-3 border-b-[4px] border-[#0f0c0c] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-[#f43f5e]" />
            <h2 className="font-orbitron font-black text-lg sm:text-xl text-[#f43f5e] tracking-wider uppercase">
              📜 EXPEDITION QUEST JOURNAL
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 bg-[#da2d46] text-white border-[2px] border-[#0f0c0c] hover:bg-[#ff3b56] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quest List */}
        <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto bg-[#151828]">
          {questList.map(quest => {
            const isCompleted = quest.status === 'completed';
            const isActive = quest.status === 'active';
            const isLocked = quest.status === 'locked';

            return (
              <div
                key={quest.id}
                className={`p-4 border-[4px] border-[#0f0c0c] transition-all flex items-start gap-4 -skew-x-2 ${
                  isActive 
                    ? 'bg-[#1e2238] shadow-[6px_6px_0px_0px_#f43f5e] border-[#f43f5e]' 
                    : isCompleted ? 'bg-[#1e2238]/60 opacity-80' : 'bg-[#0f0c0c] opacity-50'
                }`}
              >
                <div className="pt-0.5">
                  {isCompleted && <CheckCircle2 className="w-6 h-6 text-[#4ade80]" />}
                  {isActive && <CircleDot className="w-6 h-6 text-[#facc15] animate-pulse" />}
                  {isLocked && <Lock className="w-6 h-6 text-slate-500" />}
                </div>

                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className={`font-orbitron font-black text-base sm:text-lg tracking-wider ${
                      isActive ? 'text-[#facc15]' : isCompleted ? 'text-white line-through' : 'text-slate-400'
                    }`}>
                      {quest.title}
                    </h3>
                    <span className={`px-2 py-0.5 text-[10px] font-orbitron font-black uppercase border border-[#0f0c0c] ${
                      isActive ? 'bg-[#da2d46] text-white' : isCompleted ? 'bg-[#4ade80] text-[#0f0c0c]' : 'bg-[#2a2d43] text-slate-400'
                    }`}>
                      {quest.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-1">
                    {quest.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-[#0f0c0c] px-5 py-3 border-t-[4px] border-[#0f0c0c] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#f43f5e] text-white border-[3px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#ffffff] font-orbitron font-black text-sm uppercase -skew-x-6 hover:bg-[#ff5a75] transition-all active:translate-y-0.5 active:shadow-none"
          >
            RETURN TO EXPEDITION
          </button>
        </div>
      </div>
    </div>
  );
}
