import { useState } from 'react';
import { ArrowLeft, Shield, Lock, Sparkles, CheckCircle2, Eye, EyeOff, Star } from 'lucide-react';
import { useProgress } from '../context/ProgressProvider';
import { BADGES_LIST } from '../constants/badges';
import type { BadgeMetadata } from '../types';

interface BadgesScreenProps {
  onBack: () => void;
}

export function BadgesScreen({ onBack }: BadgesScreenProps) {
  const { progress, awardBadge } = useProgress();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedBadge, setSelectedBadge] = useState<BadgeMetadata | null>(BADGES_LIST[0]);
  const [demoUnlockAll, setDemoUnlockAll] = useState<boolean>(true); // Default true so user sees all glowing badges!

  const categories = ['All', 'Exploration', 'Rhythm', 'Lore', 'Mastery'];

  const isUnlocked = (badge: BadgeMetadata) => {
    if (demoUnlockAll) return true;
    return progress.badges.includes(badge.name) || progress.badges.includes(badge.title) || badge.id <= 3; // First 3 unlocked as starters if empty
  };

  const filteredBadges = BADGES_LIST.filter(b => {
    if (selectedCategory === 'All') return true;
    return b.category === selectedCategory;
  });

  const unlockedCount = BADGES_LIST.filter(b => isUnlocked(b)).length;
  const totalXpRewards = BADGES_LIST.filter(b => isUnlocked(b)).reduce((acc, curr) => acc + curr.xpReward, 0);

  const handleUnlockBadge = (badge: BadgeMetadata) => {
    awardBadge(badge.name);
  };

  return (
    <div className="min-h-screen bg-[#0f0c0c] text-[#e0e5ed] font-space-mono flex flex-col justify-between p-3 sm:p-6 relative overflow-x-hidden selection:bg-[#da2d46] selection:text-white">
      {/* Background ambient glow */}
      <div className="absolute top-[-10%] left-[20%] w-[400px] h-[400px] bg-[#da2d46]/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-[#2a2d43]/30 blur-[150px] rounded-full pointer-events-none" />

      {/* Top Header */}
      <div className="max-w-6xl w-full mx-auto z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b-[3px] border-[#da2d46]">
          {/* Title Area */}
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <button
              onClick={onBack}
              className="p-3 bg-[#2a2d43] border-[3px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#da2d46] -skew-x-6 hover:bg-[#da2d46] hover:text-white transition-all flex-shrink-0 mt-1 sm:mt-0 active:translate-x-0.5 active:translate-y-0.5"
            >
              <ArrowLeft size={22} className="skew-x-6" />
            </button>
            <div className="skew-x-2 min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <Shield className="text-[#da2d46] flex-shrink-0" size={28} />
                <h1 className="font-orbitron font-black text-2xl sm:text-3xl md:text-4xl tracking-wide uppercase bg-gradient-to-r from-white via-[#f0dde0] to-[#da2d46] bg-clip-text text-transparent">
                  Cultural Badges
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-[#cbd5e1] mt-1 font-bold">
                Collect indigenous medals by exploring Visayan musical heritage and rhythm mastery.
              </p>
            </div>
          </div>

          {/* Stats & Demo Toggle */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 self-start lg:self-center flex-shrink-0">
            <button
              onClick={() => setDemoUnlockAll(!demoUnlockAll)}
              className={`px-4 py-2.5 border-[2px] border-[#0f0c0c] font-bold text-xs sm:text-sm flex items-center gap-2 -skew-x-6 transition-all shadow-[2px_2px_0px_0px_#0f0c0c] flex-shrink-0 ${
                demoUnlockAll ? 'bg-[#da2d46] text-white' : 'bg-[#2a2d43] text-[#cbd5e1]'
              }`}
              title="Toggle to preview all badges in unlocked glowing state"
            >
              {demoUnlockAll ? <Eye size={16} className="skew-x-6" /> : <EyeOff size={16} className="skew-x-6" />}
              <span className="skew-x-6 whitespace-nowrap">{demoUnlockAll ? 'Demo: All Unlocked' : 'Real Progress'}</span>
            </button>

            <div className="bg-[#2a2d43] px-5 py-2 border-[2px] border-[#da2d46] -skew-x-6 shadow-[3px_3px_0px_0px_#0f0c0c] flex items-center gap-4 flex-shrink-0">
              <div className="text-right skew-x-6">
                <div className="text-[9px] sm:text-[10px] text-[#cbd5e1] uppercase font-bold tracking-wider whitespace-nowrap">Unlocked</div>
                <div className="font-orbitron font-black text-sm sm:text-base text-[#da2d46] whitespace-nowrap">
                  {unlockedCount} / {BADGES_LIST.length}
                </div>
              </div>
              <div className="h-8 w-[2px] bg-[#888ea1]/30 skew-x-6 flex-shrink-0" />
              <div className="text-right skew-x-6">
                <div className="text-[9px] sm:text-[10px] text-[#cbd5e1] uppercase font-bold tracking-wider whitespace-nowrap">Badge XP</div>
                <div className="font-orbitron font-black text-sm sm:text-base text-[#f0dde0] whitespace-nowrap">
                  +{totalXpRewards} XP
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-2 mt-6">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 font-bold text-xs uppercase -skew-x-6 border-[2px] border-[#0f0c0c] transition-all ${
                selectedCategory === cat
                  ? 'bg-[#da2d46] text-white shadow-[3px_3px_0px_0px_#0f0c0c] translate-y-[-2px]'
                  : 'bg-[#2a2d43] text-[#888ea1] hover:bg-[#2a2d43]/80 hover:text-white'
              }`}
            >
              <span className="skew-x-6 block">{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Badges Grid & Showcase */}
      <div className="max-w-6xl w-full mx-auto my-6 z-10 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Badges Grid (Left 2 Columns) */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 lg:max-h-[68vh] lg:overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
          {filteredBadges.map(badge => {
            const unlocked = isUnlocked(badge);
            const isSelected = selectedBadge?.id === badge.id;

            return (
              <div
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                className={`group relative p-3 bg-[#18161a] border-[3px] transition-all duration-300 cursor-pointer flex flex-col items-center justify-between gap-2 -skew-x-3 ${
                  isSelected
                    ? 'border-[#da2d46] bg-[#2a2d43] shadow-[0_0_15px_rgba(218,45,70,0.5)] translate-y-[-4px]'
                    : unlocked
                    ? 'border-[#2a2d43] hover:border-[#f0dde0] hover:bg-[#221f26] shadow-[3px_3px_0px_0px_#0f0c0c]'
                    : 'border-[#1f1d22] bg-[#121013] opacity-60 hover:opacity-80'
                }`}
              >
                {/* Category & ID tag */}
                <div className="w-full flex justify-between items-center text-[9px] font-bold tracking-tighter uppercase skew-x-3 text-[#888ea1]">
                  <span>#{badge.id}</span>
                  {unlocked ? (
                    <span className="text-[#da2d46] font-black">+{badge.xpReward} XP</span>
                  ) : (
                    <Lock size={10} className="text-[#888ea1]" />
                  )}
                </div>

                {/* Badge Image Container */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center my-1 skew-x-3">
                  {unlocked && (
                    <div className="absolute inset-0 bg-radial from-[#da2d46]/20 to-transparent rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                  <img
                    src={`/badges/${badge.id}.png`}
                    alt={badge.name}
                    className={`w-full h-full object-contain transition-transform duration-300 group-hover:scale-110 ${
                      !unlocked ? 'grayscale contrast-125 brightness-50' : ''
                    }`}
                  />
                  {!unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                      <Lock size={22} className="text-[#888ea1] animate-pulse" />
                    </div>
                  )}
                </div>

                {/* Badge Name */}
                <div className="text-center w-full skew-x-3">
                  <div className={`font-orbitron font-bold text-[11px] leading-tight truncate ${unlocked ? 'text-white' : 'text-[#888ea1]'}`}>
                    {badge.name}
                  </div>
                  <div className="text-[9px] text-[#da2d46] font-bold uppercase mt-0.5 truncate">
                    {badge.title}
                  </div>
                </div>

                {/* Unlocked status accent line */}
                <div className={`w-full h-[3px] skew-x-3 mt-1 ${unlocked ? 'bg-gradient-to-r from-transparent via-[#da2d46] to-transparent' : 'bg-[#2a2d43]'}`} />
              </div>
            );
          })}
        </div>

        {/* Selected Badge Feature Panel (Right Column) */}
        <div className="lg:col-span-1 bg-[#18161a] border-[3px] border-[#da2d46] p-5 -skew-x-2 shadow-[6px_6px_0px_0px_#0f0c0c] relative overflow-hidden flex flex-col justify-between min-h-[360px]">
          {selectedBadge ? (
            <>
              {/* Background watermark */}
              <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none skew-x-2">
                <img src={`/badges/${selectedBadge.id}.png`} alt="watermark" className="w-64 h-64 object-contain" />
              </div>

              <div className="skew-x-2 relative z-10 flex flex-col items-center text-center">
                <div className="inline-block px-3 py-1 bg-[#2a2d43] border border-[#da2d46] text-[#da2d46] text-[10px] font-bold uppercase tracking-widest rounded-full mb-3">
                  {selectedBadge.category} Medal • #{selectedBadge.id}
                </div>

                {/* Hero Icon */}
                <div className="w-36 h-36 relative flex items-center justify-center my-2">
                  <div className="absolute inset-0 bg-[#da2d46]/20 rounded-full blur-xl animate-pulse" />
                  <img
                    src={`/badges/${selectedBadge.id}.png`}
                    alt={selectedBadge.name}
                    className={`w-full h-full object-contain drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)] ${
                      !isUnlocked(selectedBadge) ? 'grayscale contrast-125 brightness-50' : ''
                    }`}
                  />
                </div>

                <h2 className="font-orbitron font-black text-xl sm:text-2xl text-white mt-3 uppercase tracking-wide">
                  {selectedBadge.name}
                </h2>
                <div className="text-sm font-bold text-[#da2d46] uppercase tracking-wider mt-0.5">
                  « {selectedBadge.title} »
                </div>

                {/* Status Badge */}
                <div className="mt-4 flex items-center justify-center gap-2">
                  {isUnlocked(selectedBadge) ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-xs font-bold rounded-full">
                      <CheckCircle2 size={14} /> Unlocked Honor
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-950/80 border border-amber-500/50 text-amber-400 text-xs font-bold rounded-full">
                      <Lock size={14} /> Locked Achievement
                    </span>
                  )}
                </div>

                <div className="w-full h-[1px] bg-[#2a2d43] my-4" />

                {/* Description & Criteria */}
                <div className="text-left w-full">
                  <div className="text-[10px] text-[#888ea1] uppercase font-bold tracking-wider mb-1">
                    Unlocking Criteria & Lore
                  </div>
                  <p className="text-xs sm:text-sm text-[#e0e5ed] leading-relaxed bg-[#0f0c0c]/80 p-3 border-l-[3px] border-[#da2d46]">
                    {selectedBadge.description}
                  </p>
                </div>

                {/* Reward info */}
                <div className="w-full flex justify-between items-center bg-[#2a2d43]/60 p-3 mt-4 border border-[#2a2d43]">
                  <span className="text-xs font-bold text-[#888ea1]">Mastery Bonus:</span>
                  <span className="font-orbitron font-black text-sm text-[#da2d46] flex items-center gap-1">
                    <Sparkles size={14} /> +{selectedBadge.xpReward} XP
                  </span>
                </div>

                {!isUnlocked(selectedBadge) && !demoUnlockAll && (
                  <button
                    onClick={() => handleUnlockBadge(selectedBadge)}
                    className="w-full mt-4 py-2.5 bg-[#da2d46] text-white font-orbitron font-bold text-xs uppercase tracking-wider -skew-x-6 hover:bg-white hover:text-[#0f0c0c] transition-all shadow-[3px_3px_0px_0px_#0f0c0c]"
                  >
                    <span className="skew-x-6 block">Unlock Now (Test Mode)</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-[#888ea1] font-bold text-sm">
              Select a badge from the grid to inspect.
            </div>
          )}
        </div>
      </div>

      {/* Footer Banner */}
      <div className="max-w-6xl w-full mx-auto z-10 pt-4 border-t-[2px] border-[#2a2d43] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#888ea1]">
        <div className="flex items-center gap-2">
          <Star size={14} className="text-[#da2d46]" />
          <span>Badges are permanently awarded to your Visayan Expedition Archive.</span>
        </div>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-[#da2d46] text-white font-orbitron font-bold uppercase tracking-wider -skew-x-6 hover:bg-white hover:text-[#0f0c0c] transition-all shadow-[3px_3px_0px_0px_#0f0c0c]"
        >
          <span className="skew-x-6 block">Return to Map</span>
        </button>
      </div>
    </div>
  );
}
