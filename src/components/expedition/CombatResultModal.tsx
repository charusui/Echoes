import { type HarmonydexEntry } from '../../types/expedition';

interface CombatResultModalProps {
  result: {
    victory: boolean;
    xpGained: number;
    capturedEntry?: HarmonydexEntry;
  };
  onContinue: () => void;
}

export function CombatResultModal({ result, onContinue }: CombatResultModalProps) {
  const { victory, xpGained, capturedEntry } = result;

  return (
    <div className="fixed inset-0 z-50 bg-[#0f0c0c]/85 flex items-center justify-center p-4 overflow-y-auto">
      <div className={`border-[6px] border-[#0f0c0c] max-w-lg w-full p-6 sm:p-8 flex flex-col items-center gap-5 -skew-x-2 animate-in fade-in zoom-in-95 duration-200 text-center shadow-[12px_12px_0px_0px_#0f0c0c] ${
        victory ? 'bg-[#1e2238]' : 'bg-[#da2d46]'
      }`}>
        {/* Banner Trophy/Alert */}
        <div className={`text-6xl p-4 border-[4px] border-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] ${
          victory ? 'bg-[#facc15]' : 'bg-[#0f0c0c] text-white'
        }`}>
          {capturedEntry ? '🔮' : victory ? '🏆' : '💀'}
        </div>

        <div>
          <h2 className={`font-orbitron font-black text-2xl sm:text-3xl tracking-widest uppercase ${
            victory ? 'text-[#facc15] drop-shadow-[2px_2px_0px_#0f0c0c]' : 'text-white drop-shadow-[2px_2px_0px_#0f0c0c]'
          }`}>
            {capturedEntry ? '⚡ ANOMALY CAPTURED!' : victory ? '⚡ HARMONY RESTORED!' : '💥 EXPEDITION DEFEATED'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 font-bold mt-1">
            {capturedEntry 
              ? `You successfully attuned and sealed ${capturedEntry.name} into your Harmonydex!` 
              : victory 
                ? 'The corrupted frequencies have been banished from this sector.' 
                : 'Your party collapsed from overwhelming dissonance resonance.'}
          </p>
        </div>

        {/* Rewards Box */}
        <div className="w-full bg-[#0f0c0c] p-4 border-[4px] border-[#0f0c0c] flex flex-col gap-3">
          <div className="flex items-center justify-between font-orbitron font-black text-sm text-white">
            <span>🎉 EXPEDITION XP AWARDED:</span>
            <span className="text-xl text-[#4ade80]">+{xpGained} XP</span>
          </div>

          {capturedEntry && (
            <div className="bg-[#151828] p-3 border-[2px] border-[#38bdf8] flex items-center gap-3 text-left">
              <span className="text-3xl bg-[#0f0c0c] p-2 border border-[#0f0c0c]">
                {capturedEntry.icon}
              </span>
              <div className="flex flex-col">
                <span className="font-orbitron font-black text-sm text-[#38bdf8]">
                  NEW HARMONYDEX ENTRY!
                </span>
                <span className="font-orbitron font-bold text-xs text-white">
                  {capturedEntry.name} ({capturedEntry.type.toUpperCase()})
                </span>
                <span className="text-2xs text-slate-300 line-clamp-1">
                  Skill: {capturedEntry.skillName} ({capturedEntry.skillCost} AP)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={onContinue}
          className="w-full py-3.5 bg-[#4ade80] text-[#0f0c0c] border-[4px] border-[#0f0c0c] shadow-[6px_6px_0px_0px_#ffffff] font-orbitron font-black text-sm sm:text-base uppercase -skew-x-6 hover:bg-[#6bee9c] transition-all active:translate-y-0.5 active:shadow-none mt-2"
        >
          {victory ? '▶ RETURN TO OVERWORLD MAP' : '↺ RETRY OR RETREAT'}
        </button>
      </div>
    </div>
  );
}
