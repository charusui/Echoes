import { X, ScrollText, CheckCircle2, CircleDot, Lock } from 'lucide-react';
import { type ExpeditionQuest } from '../../types/expedition';

interface QuestsModalProps {
  quests: Record<string, ExpeditionQuest>;
  onClose: () => void;
}

export function QuestsModal({ quests, onClose }: QuestsModalProps) {
  const questList = Object.values(quests);

  return (
    <div className="fixed inset-0 z-[100] bg-[#0f0c0c]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#1e2238] border-[4px] sm:border-[5px] border-[#0f0c0c] shadow-[10px_10px_0px_0px_#0f0c0c] max-w-2xl w-full flex flex-col max-h-[90vh] -skew-x-1 animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden">
        
        {/* Halftone Overlay */}
        <div className="absolute inset-0 opacity-[0.2] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#0f0c0c 2px, transparent 2px)', backgroundSize: '12px 12px' }} />

        {/* Top Header */}
        <div className="bg-[#0f0c0c] text-white px-4 sm:px-6 py-4 border-b-[4px] border-[#0f0c0c] flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <ScrollText className="w-5 h-5 sm:w-6 sm:h-6 text-[#f43f5e]" />
            <h2 className="font-orbitron font-black text-sm sm:text-xl text-[#f43f5e] tracking-widest uppercase drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              EXPEDITION QUEST JOURNAL
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-[#f43f5e] text-white border-[3px] border-[#0f0c0c] hover:bg-[#ff3b56] transition-all shadow-[3px_3px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none"
          >
            <X className="w-5 h-5 font-black" />
          </button>
        </div>

        {/* Quest List */}
        <div className="flex-1 p-4 sm:p-6 flex flex-col gap-5 overflow-y-auto bg-[#151828] relative z-10 custom-scrollbar">
          {questList.map(quest => {
            const isCompleted = quest.status === 'completed';
            const isActive = quest.status === 'active';
            const isLocked = quest.status === 'locked';

            return (
              <div
                key={quest.id}
                className={`p-4 sm:p-5 border-[4px] sm:border-[5px] transition-all flex items-start gap-3 sm:gap-4 -skew-x-2 relative overflow-hidden ${
                  isActive 
                    ? 'bg-[#1e2238] shadow-[6px_6px_0px_0px_#f43f5e] border-[#f43f5e]' 
                    : isCompleted ? 'bg-[#1e2238]/60 opacity-80 shadow-[4px_4px_0px_0px_#0f0c0c] border-[#0f0c0c]' : 'bg-[#0f0c0c] opacity-60 shadow-[4px_4px_0px_0px_#0f0c0c] border-[#0f0c0c]'
                }`}
              >
                {isActive && <div className="absolute inset-0 bg-[#f43f5e]/5 pointer-events-none" />}
                
                <div className="pt-0.5 shrink-0 relative z-10">
                  {isCompleted && <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-[#4ade80]" />}
                  {isActive && <CircleDot className="w-6 h-6 sm:w-7 sm:h-7 text-[#facc15] animate-pulse" />}
                  {isLocked && <Lock className="w-6 h-6 sm:w-7 sm:h-7 text-slate-500" />}
                </div>

                <div className="flex-1 flex flex-col gap-1.5 sm:gap-2 relative z-10">
                  <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-2">
                    <h3 className={`font-orbitron font-black text-sm sm:text-lg tracking-wider uppercase drop-shadow-[1px_1px_0px_#0f0c0c] ${
                      isActive ? 'text-[#facc15]' : isCompleted ? 'text-white line-through decoration-[#4ade80] decoration-2' : 'text-slate-400'
                    }`}>
                      {quest.title}
                    </h3>
                    <div className={`px-2.5 py-1 text-[9px] sm:text-[10px] font-space-mono font-black uppercase border-[2px] border-[#0f0c0c] tracking-widest skew-x-2 shadow-[2px_2px_0px_0px_#0f0c0c] ${
                      isActive ? 'bg-[#f43f5e] text-white' : isCompleted ? 'bg-[#4ade80] text-[#0f0c0c]' : 'bg-[#2a2d43] text-slate-400'
                    }`}>
                      <span className="skew-x-[-2deg] block leading-none">{quest.status}</span>
                    </div>
                  </div>

                  <p className={`text-xs sm:text-sm font-bold leading-relaxed ${isActive ? 'text-white' : 'text-slate-400'}`}>
                    {quest.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-[#0f0c0c] px-4 sm:px-6 py-4 border-t-[4px] border-[#0f0c0c] flex justify-end relative z-10">
          <button
            onClick={onClose}
            className="px-6 sm:px-8 py-3 bg-[#f43f5e] text-white border-[3px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#ffffff] font-orbitron font-black text-xs sm:text-sm tracking-widest uppercase -skew-x-6 hover:bg-[#ff5a75] hover:shadow-[6px_6px_0px_0px_#ffffff] transition-all active:translate-y-1 active:translate-x-1 active:shadow-none"
          >
            <span className="skew-x-6 block">RETURN TO EXPEDITION</span>
          </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0f0c0c; border-left: 3px solid #1e2238; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #f43f5e; border: 2px solid #0f0c0c; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ff5a75; }
      `}</style>
    </div>
  );
}