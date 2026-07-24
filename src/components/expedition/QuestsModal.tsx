import { X, ScrollText, CheckCircle2, CircleDot, Lock, Flame, ArrowRight } from 'lucide-react';
import { type ExpeditionQuest } from '../../types/expedition';

interface QuestsModalProps {
  quests: Record<string, ExpeditionQuest>;
  onClose: () => void;
}

export function QuestsModal({ quests, onClose }: QuestsModalProps) {
  const questList = Object.values(quests);
  
  // Calculate completion for the progress bar
  const completedCount = questList.filter(q => q.status === 'completed').length;
  const totalCount = questList.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0f0c0c]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto quest-anim-fade">
      
      <div className="bg-[#151828] border-[4px] border-[#0f0c0c] shadow-[12px_12px_0px_0px_#0f0c0c] max-w-3xl w-full flex flex-col max-h-[90vh] relative overflow-hidden quest-anim-pop">
        
        {/* ─── HEADER (Red/Black Diagonal Stripes) ─── */}
        <div className="header-stripes px-4 sm:px-6 py-4 border-b-[4px] border-[#0f0c0c] flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 shrink-0">
          
          <div className="flex items-center gap-3 sm:gap-4 relative z-10">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#facc15] border-[3px] border-[#0f0c0c] flex items-center justify-center shadow-[3px_3px_0px_0px_#f43f5e] shrink-0">
              <ScrollText className="w-5 h-5 sm:w-6 sm:h-6 text-[#0f0c0c]" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col justify-center pt-1">
              <h2 className="font-orbitron font-black text-lg sm:text-2xl text-[#f43f5e] tracking-wider uppercase leading-none [text-shadow:2px_2px_0px_#facc15]">
                EXPEDITION JOURNAL
              </h2>
              <span className="font-space-mono text-[9px] sm:text-[11px] text-[#38bdf8] font-bold uppercase tracking-widest mt-1.5 block">
                ACTIVE OBJECTIVES LOG
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-6 relative z-10 w-full sm:w-auto">
            <div className="flex flex-col items-end">
              <span className="font-space-mono text-[9px] sm:text-[10px] text-[#facc15] font-black uppercase tracking-widest mb-1.5">
                SYNC: {progressPercentage}%
              </span>
              <div className="w-24 sm:w-28 h-2 bg-[#0f0c0c] border-[1px] border-[#0f0c0c] relative overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-[#4ade80] transition-all duration-1000 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-[#f43f5e] text-white border-[3px] border-[#0f0c0c] hover:bg-[#ff5a75] transition-transform hover:scale-105 active:scale-95"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 font-black" strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* ─── QUEST LIST ─── */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 pb-12 flex flex-col gap-4 sm:gap-5 overflow-y-auto relative z-10 custom-scrollbar border-r-[4px] sm:border-r-[6px] border-[#f43f5e]">
          {questList.map((quest, idx) => {
            const isCompleted = quest.status === 'completed';
            const isActive = quest.status === 'active';
            const isLocked = quest.status === 'locked';

            return (
              <div
                key={quest.id}
                className="quest-anim-slide group cursor-default"
                style={{ animationDelay: `${150 + idx * 75}ms` }}
                title={isLocked ? "Quest locked. Requires higher synchronization." : ""}
              >
                <div
                  className={`p-4 sm:p-5 transition-all duration-150 ease-out flex items-start gap-4 relative overflow-hidden ${
                    isActive 
                      ? 'border-[3px] sm:border-[4px] border-[#f43f5e] shadow-[6px_6px_0px_0px_#f43f5e] active-stripes translate-x-1 sm:translate-x-2 hover:translate-x-3 active-pulse-border' 
                      : isCompleted 
                      ? 'border-[3px] border-[#0f0c0c] bg-[#1e2238] hover:bg-[#262b47] shadow-[4px_4px_0px_0px_#0f0c0c] hover:translate-x-1' 
                      : 'border-[3px] border-[#131624] bg-[#131624]'
                  }`}
                >
                  
                  {/* Icon Indicator */}
                  <div className="pt-0.5 shrink-0 relative z-10">
                    <div className={`w-10 h-10 flex items-center justify-center border-[3px] transition-colors duration-150 ${
                      isActive ? 'bg-[#facc15] border-[#0f0c0c] text-[#0f0c0c]' 
                      : isCompleted ? 'bg-[#4ade80] border-[#0f0c0c] text-[#0f0c0c]' 
                      : 'bg-transparent border-[#1e2238] text-[#64748b]'
                    }`}>
                      {isCompleted && <CheckCircle2 className="w-5 h-5" strokeWidth={2.5} />}
                      {isActive && <CircleDot className="w-5 h-5 animate-pulse" strokeWidth={2.5} />}
                      {isLocked && <Lock className="w-5 h-5 transition-transform duration-150 group-hover:animate-shake" strokeWidth={2.5} />}
                    </div>
                  </div>

                  {/* Quest Details */}
                  <div className="flex-1 flex flex-col gap-2 relative z-10">
                    <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-2">
                      <h3 className={`font-orbitron font-black text-sm sm:text-base md:text-lg tracking-wider uppercase transition-colors duration-150 ${
                        isActive ? 'text-[#facc15] group-hover:text-[#ffdf3d] group-hover:brightness-110' : isCompleted ? 'text-slate-200 opacity-90 line-through decoration-[#4ade80] decoration-[2px]' : 'text-[#94a3b8]'
                      }`}>
                        {quest.title}
                      </h3>
                      
                      {/* Status Badge */}
                      <div className={`px-2.5 py-1 text-[9px] sm:text-[10px] font-space-mono font-black uppercase tracking-widest flex items-center gap-1.5 ${
                        isActive ? 'bg-[#f43f5e] text-white border-[2px] border-[#f43f5e]' : isCompleted ? 'bg-[#4ade80] text-[#0f0c0c]' : 'text-[#64748b]'
                      }`}>
                        {isActive && <Flame size={12} className="fill-current" />}
                        <span className="block leading-none">{quest.status}</span>
                      </div>
                    </div>

                    {/* Left Accent Line next to description */}
                    <p className={`text-xs sm:text-sm font-bold leading-relaxed border-l-[3px] pl-3 py-0.5 mt-1 transition-colors duration-150 ${
                      isActive ? 'text-white border-[#facc15]' : isCompleted ? 'text-slate-300 border-[#4ade80]' : 'text-[#64748b] border-[#334155]'
                    }`}>
                      {quest.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── FOOTER ─── */}
        <div className="bg-[#0f0c0c] px-4 sm:px-6 lg:px-8 py-5 flex justify-end relative z-10 shrink-0 border-t-[4px] border-[#151828]">
          <button
            onClick={onClose}
            className="group px-6 sm:px-8 py-3.5 bg-[#facc15] text-[#0f0c0c] border-[3px] border-[#0f0c0c] shadow-[6px_6px_0px_0px_#f43f5e] font-orbitron font-black text-xs sm:text-sm tracking-widest uppercase transition-all duration-150 ease-out hover:bg-[#0f0c0c] hover:text-[#facc15] hover:border-[#facc15] hover:shadow-[6px_6px_0px_0px_#facc15] active:translate-y-1 active:translate-x-1 active:shadow-none"
          >
            <span className="block flex items-center justify-center gap-2">
              RETURN TO EXPEDITION
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" strokeWidth={3} />
            </span>
          </button>
        </div>
      </div>

      {/* ─── CUSTOM CSS (Stripes, Animations, Scrollbar) ─── */}
      <style>{`
        /* Header Stripes Background */
        .header-stripes {
          background: repeating-linear-gradient(
            -45deg,
            #1a1014,
            #1a1014 12px,
            #221319 12px,
            #221319 24px
          );
        }

        /* Active Quest Stripes Background */
        .active-stripes {
          background: repeating-linear-gradient(
            45deg,
            #1e2238,
            #1e2238 10px,
            #252031 10px,
            #252031 20px
          );
        }

        /* Entrance Animations */
        @keyframes questFadeIn {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(8px); }
        }
        @keyframes questPopIn {
          0% { transform: scale(0.95) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes questSlideIn {
          0% { transform: translateX(-30px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        
        /* Interactive Animations */
        @keyframes borderPulse {
          0%, 100% { border-color: #f43f5e; box-shadow: 6px 6px 0px 0px #f43f5e; }
          50% { border-color: #ff5a75; box-shadow: 6px 6px 0px 0px #ff5a75; }
        }
        .active-pulse-border {
          animation: borderPulse 3s infinite ease-in-out;
        }

        @keyframes lockShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px) rotate(-5deg); }
          50% { transform: translateX(2px) rotate(5deg); }
          75% { transform: translateX(-2px) rotate(-5deg); }
        }
        .group:hover .group-hover\\:animate-shake {
          animation: lockShake 0.4s ease-in-out;
        }

        .quest-anim-fade { 
          animation: questFadeIn 0.3s ease-out forwards; 
        }
        .quest-anim-pop { 
          animation: questPopIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; 
        }
        .quest-anim-slide { 
          animation: questSlideIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; 
          opacity: 0; 
        }

        /* Styled Scrollbar matching the UI */
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0f0c0c; border-left: 3px solid #151828; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #facc15; border: 2px solid #0f0c0c; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ffdf3d; }
      `}</style>
    </div>
  );
}