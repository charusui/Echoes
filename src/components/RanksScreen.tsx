import { useState } from 'react';
import { ArrowLeft, Flame, Trophy, Shield, MapPin, TrendingUp } from 'lucide-react';
import { useProgress } from '../context/ProgressProvider';

interface RanksScreenProps {
  onBack: () => void;
  onOpenBadges?: () => void;
}

export function RanksScreen({ onBack, onOpenBadges }: RanksScreenProps) {
  const { progress, getClassroomLeaderboard } = useProgress();
  const [selectedTab, setSelectedTab] = useState<string>('All Ranks');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const leaderboard = getClassroomLeaderboard();

  const tabs = ['All Ranks', 'Visayan Legends', 'Classroom Squad', 'Top Musicians'];

  const filteredLeaderboard = leaderboard.filter(entry => {
    if (searchQuery && !entry.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedTab === 'Visayan Legends') return entry.xp >= 1500;
    if (selectedTab === 'Classroom Squad') return entry.isPlayer || entry.xp < 1500;
    if (selectedTab === 'Top Musicians') return entry.title.toLowerCase().includes('rhythm') || entry.title.toLowerCase().includes('master') || entry.title.toLowerCase().includes('prodigy');
    return true;
  });

  const topThree = leaderboard.slice(0, 3);
  const playerRankIndex = leaderboard.findIndex(e => e.isPlayer);
  const playerRankNumber = playerRankIndex !== -1 ? playerRankIndex + 1 : leaderboard.length;

  const getBadgeImage = (badgeId?: number) => {
    const id = badgeId || 1;
    return `/badges/${id}.png`;
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 text-black border-amber-200 shadow-[0_0_12px_rgba(250,204,21,0.8)]';
    if (rank === 2) return 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-black border-white shadow-[0_0_12px_rgba(203,213,225,0.8)]';
    if (rank === 3) return 'bg-gradient-to-br from-amber-600 via-orange-500 to-amber-700 text-white border-amber-300 shadow-[0_0_12px_rgba(249,115,22,0.8)]';
    return 'bg-[#2a2d43] text-white border-[#888ea1] font-black shadow-sm';
  };

  return (
    <div className="min-h-screen bg-[#0f0c0c] text-[#e0e5ed] font-space-mono flex flex-col justify-between p-3 sm:p-6 relative overflow-x-hidden selection:bg-[#da2d46] selection:text-white">
      {/* Background ambient glow */}
      <div className="absolute top-[5%] right-[15%] w-[450px] h-[450px] bg-[#da2d46]/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[10%] left-[10%] w-[500px] h-[500px] bg-[#1e3a8a]/20 blur-[160px] rounded-full pointer-events-none" />

      {/* Header */}
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
                <Flame className="text-[#da2d46] animate-pulse flex-shrink-0" size={28} />
                <h1 className="font-orbitron font-black text-2xl sm:text-3xl md:text-4xl tracking-wide uppercase bg-gradient-to-r from-white via-[#f0dde0] to-[#da2d46] bg-clip-text text-transparent">
                  Expedition Leaderboard
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-[#cbd5e1] mt-1 font-bold">
                Honoring the top Filipino ethnomusicologists, rhythm weavers, and instrument scouts.
              </p>
            </div>
          </div>

          {/* Player Summary Pill & Actions */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 self-start lg:self-center flex-shrink-0">
            {onOpenBadges && (
              <button
                onClick={onOpenBadges}
                className="px-5 py-2.5 bg-[#2a2d43] border-[2px] border-[#da2d46] -skew-x-6 hover:bg-[#da2d46] hover:text-white transition-all shadow-[3px_3px_0px_0px_#0f0c0c] flex items-center gap-2.5 text-xs sm:text-sm font-bold flex-shrink-0 group"
              >
                <Shield size={18} className="skew-x-6 text-[#da2d46] group-hover:text-white" />
                <span className="skew-x-6 whitespace-nowrap">View Badges Archive</span>
              </button>
            )}

            <div className="bg-[#da2d46] px-5 py-2 border-[2px] border-[#0f0c0c] -skew-x-6 shadow-[3px_3px_0px_0px_#0f0c0c] flex items-center gap-4 text-white flex-shrink-0">
              <div className="text-right skew-x-6">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold opacity-90 tracking-wider whitespace-nowrap">Your Rank</div>
                <div className="font-orbitron font-black text-sm sm:text-base whitespace-nowrap">#{playerRankNumber} Overall</div>
              </div>
              <div className="h-8 w-[2px] bg-white/30 skew-x-6 flex-shrink-0" />
              <div className="text-right skew-x-6">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold opacity-90 tracking-wider whitespace-nowrap">Total XP</div>
                <div className="font-orbitron font-black text-sm sm:text-base whitespace-nowrap">{progress.xp} XP</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-6">
          <div className="flex flex-wrap gap-2">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-4 py-1.5 font-bold text-xs uppercase -skew-x-6 border-[2px] border-[#0f0c0c] transition-all ${
                  selectedTab === tab
                    ? 'bg-[#da2d46] text-white shadow-[3px_3px_0px_0px_#0f0c0c] translate-y-[-2px]'
                    : 'bg-[#2a2d43] text-[#888ea1] hover:bg-[#2a2d43]/80 hover:text-white'
                }`}
              >
                <span className="skew-x-6 block">{tab}</span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64 -skew-x-6">
            <input
              type="text"
              placeholder="Search Filipino musicians..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#18161a] border-[2px] border-[#2a2d43] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#da2d46] skew-x-6 placeholder-[#888ea1]"
            />
          </div>
        </div>
      </div>

      {/* Top 3 Podium Showcase (Only show on All Ranks when not filtering) */}
      {selectedTab === 'All Ranks' && !searchQuery && topThree.length >= 3 && (
        <div className="max-w-6xl w-full mx-auto my-6 z-10 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* #2 Rank (Silver) */}
          <div className="order-2 md:order-1 bg-[#18161a] border-[3px] border-slate-300 p-4 -skew-x-2 shadow-[4px_4px_0px_0px_#0f0c0c] relative flex flex-col items-center text-center">
            <div className="absolute top-2 left-2 px-2.5 py-0.5 bg-gradient-to-r from-slate-300 to-slate-400 text-slate-900 font-orbitron font-black text-xs rounded-full">
              #2 SILVER
            </div>
            <div className="w-20 h-20 relative my-3">
              <div className="absolute inset-0 bg-slate-400/20 rounded-full blur-md" />
              <img src={getBadgeImage(topThree[1].badgeId)} alt="badge" className="w-full h-full object-contain" />
            </div>
            <h3 className="font-orbitron font-black text-base text-white truncate w-full">{topThree[1].name}</h3>
            <p className="text-[10px] text-slate-300 font-bold uppercase mt-0.5">{topThree[1].title}</p>
            <div className="w-full flex justify-between items-center bg-[#0f0c0c] p-2 mt-3 border border-slate-400/30 text-xs font-bold">
              <span className="text-slate-300 flex items-center gap-1"><Flame size={14} className="text-amber-400" /> {topThree[1].streak}d streak</span>
              <span className="font-orbitron text-white">{topThree[1].xp} XP</span>
            </div>
          </div>

          {/* #1 Rank (Gold - Center & Taller) */}
          <div className="order-1 md:order-2 bg-gradient-to-b from-[#2a1f14] to-[#18161a] border-[4px] border-amber-400 p-5 -skew-x-2 shadow-[0_0_25px_rgba(251,191,36,0.3),6px_6px_0px_0px_#0f0c0c] relative flex flex-col items-center text-center md:translate-y-[-12px]">
            <div className="absolute top-2 left-2 px-3 py-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-amber-950 font-orbitron font-black text-xs rounded-full flex items-center gap-1 shadow-md">
              <Trophy size={14} /> #1 CHAMPION
            </div>
            <div className="w-24 h-24 relative my-3 animate-bounce-subtle">
              <div className="absolute inset-0 bg-amber-400/30 rounded-full blur-xl animate-pulse" />
              <img src={getBadgeImage(topThree[0].badgeId)} alt="badge" className="w-full h-full object-contain drop-shadow-[0_5px_10px_rgba(251,191,36,0.5)]" />
            </div>
            <h3 className="font-orbitron font-black text-lg text-amber-300 truncate w-full">{topThree[0].name}</h3>
            <p className="text-xs text-amber-200/90 font-bold uppercase mt-0.5">{topThree[0].title}</p>
            <div className="w-full flex justify-between items-center bg-[#0f0c0c] p-2.5 mt-4 border border-amber-400/50 text-xs font-bold shadow-inner">
              <span className="text-amber-300 flex items-center gap-1"><Flame size={16} className="text-orange-500 animate-pulse" /> {topThree[0].streak}d streak</span>
              <span className="font-orbitron font-black text-sm text-amber-400">{topThree[0].xp} XP</span>
            </div>
          </div>

          {/* #3 Rank (Bronze) */}
          <div className="order-3 md:order-3 bg-[#18161a] border-[3px] border-amber-700 p-4 -skew-x-2 shadow-[4px_4px_0px_0px_#0f0c0c] relative flex flex-col items-center text-center">
            <div className="absolute top-2 left-2 px-2.5 py-0.5 bg-gradient-to-r from-amber-700 to-amber-600 text-amber-100 font-orbitron font-black text-xs rounded-full">
              #3 BRONZE
            </div>
            <div className="w-20 h-20 relative my-3">
              <div className="absolute inset-0 bg-amber-700/20 rounded-full blur-md" />
              <img src={getBadgeImage(topThree[2].badgeId)} alt="badge" className="w-full h-full object-contain" />
            </div>
            <h3 className="font-orbitron font-black text-base text-white truncate w-full">{topThree[2].name}</h3>
            <p className="text-[10px] text-amber-500 font-bold uppercase mt-0.5">{topThree[2].title}</p>
            <div className="w-full flex justify-between items-center bg-[#0f0c0c] p-2 mt-3 border border-amber-700/30 text-xs font-bold">
              <span className="text-amber-500 flex items-center gap-1"><Flame size={14} className="text-amber-400" /> {topThree[2].streak}d streak</span>
              <span className="font-orbitron text-white">{topThree[2].xp} XP</span>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="max-w-6xl w-full mx-auto my-6 z-10 flex-1 bg-[#18161a] border-[3px] border-[#2a2d43] p-4 sm:p-6 -skew-x-2 shadow-[6px_6px_0px_0px_#0f0c0c] overflow-x-auto">
        <div className="skew-x-2 min-w-[600px]">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 pb-3 border-b-[2px] border-[#2a2d43] text-[#888ea1] font-orbitron font-bold text-xs uppercase tracking-wider">
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-4">Musician & Title</div>
            <div className="col-span-3">Region</div>
            <div className="col-span-2 text-center">Streak</div>
            <div className="col-span-2 text-right">Expedition XP</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-[#2a2d43]/50 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar mt-2">
            {filteredLeaderboard.map(entry => {
              const actualRank = leaderboard.findIndex(e => e.id === entry.id) + 1;
              const badgeStyle = getRankBadgeColor(actualRank);

              return (
                <div
                  key={entry.id}
                  className={`grid grid-cols-12 gap-3 py-3.5 items-center transition-all ${
                    entry.isPlayer
                      ? 'bg-[#da2d46]/15 border-l-[4px] border-[#da2d46] px-2 font-bold my-1 rounded-r shadow-[0_0_15px_rgba(218,45,70,0.2)]'
                      : 'hover:bg-[#2a2d43]/40 px-2'
                  }`}
                >
                  {/* Rank Column */}
                  <div className="col-span-1 flex justify-center">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-orbitron font-black text-xs border ${badgeStyle}`}>
                      {actualRank}
                    </span>
                  </div>

                  {/* Musician Column with Badge Avatar */}
                  <div className="col-span-4 flex items-center gap-3 truncate">
                    <div className="w-10 h-10 rounded-full bg-[#2a2d43] border-[2px] border-[#0f0c0c] overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-sm" style={{ backgroundColor: entry.avatarBg || '#2a2d43' }}>
                      <img
                        src={getBadgeImage(entry.badgeId)}
                        alt="avatar"
                        className="w-8 h-8 object-contain drop-shadow"
                      />
                    </div>
                    <div className="truncate">
                      <div className={`font-orbitron font-bold text-sm truncate flex items-center gap-1.5 ${entry.isPlayer ? 'text-[#da2d46]' : 'text-white'}`}>
                        <span>{entry.name}</span>
                        {entry.isPlayer && (
                          <span className="px-1.5 py-0.2 bg-[#da2d46] text-white text-[9px] rounded uppercase font-black tracking-tighter">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#cbd5e1] font-bold uppercase truncate">
                        {entry.title}
                      </div>
                    </div>
                  </div>

                  {/* Region Column */}
                  <div className="col-span-3 flex items-center gap-1.5 text-xs text-[#e0e5ed] font-bold truncate">
                    <MapPin size={13} className="text-[#da2d46] flex-shrink-0" />
                    <span className="truncate">{entry.region}</span>
                  </div>

                  {/* Streak Column */}
                  <div className="col-span-2 flex justify-center items-center gap-1 text-xs font-bold text-amber-400">
                    <Flame size={15} className="text-orange-500 animate-pulse" />
                    <span>{entry.streak} days</span>
                  </div>

                  {/* XP Score Column */}
                  <div className="col-span-2 text-right font-orbitron font-black text-sm text-white">
                    <span className={entry.isPlayer ? 'text-[#da2d46]' : 'text-[#f0dde0]'}>
                      {entry.xp.toLocaleString()}
                    </span>{' '}
                    <span className="text-[10px] text-[#cbd5e1] font-normal">XP</span>
                  </div>
                </div>
              );
            })}

            {filteredLeaderboard.length === 0 && (
              <div className="py-8 text-center text-[#888ea1] font-bold text-sm">
                No musicians found matching your search or tab filter.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="max-w-6xl w-full mx-auto z-10 pt-4 border-t-[2px] border-[#2a2d43] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#888ea1]">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-[#da2d46]" />
          <span>Leaderboard ranks update in real-time as you scan instruments and complete rhythm weave tracks!</span>
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
