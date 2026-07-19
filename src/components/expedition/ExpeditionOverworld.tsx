import { useState, useMemo, useRef, useEffect } from 'react';
import { Play, MessageSquare, Compass, ShieldAlert, Award, Camera, Map, Flame, Shield } from 'lucide-react';
import { type MapNode, type ExpeditionQuest } from '../../types/expedition';
import visayasMap from '../../assets/png/visayas_map.png';

interface ExpeditionOverworldProps {
  nodes: Record<string, MapNode>;
  currentNodeId: string;
  onSelectNode: (nodeId: string) => void;
  onStartBattle: (enemyId: string) => void;
  onOpenQuests: () => void;
  quests: Record<string, ExpeditionQuest>;
  onOpenScanner?: () => void;
  onOpenLocationServices?: () => void;
  onOpenCollection?: () => void;
  onOpenBadges?: () => void;
  onOpenRanks?: () => void;
}

export function ExpeditionOverworld({
  nodes,
  currentNodeId,
  onSelectNode,
  onStartBattle,
  onOpenQuests,
  quests,
  onOpenScanner,
  onOpenLocationServices,
  onOpenBadges,
  onOpenRanks,
}: ExpeditionOverworldProps) {
  const [showDialogue, setShowDialogue] = useState(false);
  const [dialogueStep, setDialogueStep] = useState(0);

  const currentNode = nodes[currentNodeId] || nodes['cadence_town']!;

  const dialogues: Array<{ speaker: string; avatar: string; text: string; choice?: string }> = useMemo(() => [
    {
      speaker: 'Elder Cadence',
      avatar: '👴',
      text: 'Welcome to the Silent Valley, brave harmonist. The dissonance anomaly has twisted the local instruments.',
      choice: 'We are ready to restore harmony, Elder.',
    },
    {
      speaker: 'Elder Cadence',
      avatar: '👴',
      text: 'To restore equilibrium, you must engage the anomalies in turn-based acoustic combat and seal their resonance.',
      choice: 'Understood! We will head to Echo Woods.',
    },
    {
      speaker: 'Elder Cadence',
      avatar: '👴',
      text: 'Beware Lord Cacophony at the peak! His brass shockwaves can shatter an unprepared party in seconds.',
      choice: 'To battle!',
    },
  ], []);

  const handleNextDialogue = () => {
    if (dialogueStep + 1 < dialogues.length) {
      setDialogueStep(dialogueStep + 1);
    } else {
      setShowDialogue(false);
      setDialogueStep(0);
    }
  };

  // ─── MAP PANNING, ZOOMING & RESIZE OBSERVER ───
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 650 });
  const [mapScale, setMapScale] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [touchStartDist, setTouchStartDist] = useState(0);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setDimensions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height,
        });
      }
    });
    if (mapContainerRef.current) observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const getBoundedPan = (x: number, y: number, scale: number) => {
    const limitX = scale > 1 ? (dimensions.width * scale - dimensions.width) / 2 : 0;
    const limitY = scale > 1 ? (dimensions.height * scale - dimensions.height) / 2 : 0;
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
    setPanOffset(getBoundedPan(clientX - panStart.x, clientY - panStart.y, mapScale));
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
      const delta = (dist - touchStartDist) * 0.01;
      const newScale = Math.max(1.0, Math.min(4.0, mapScale + delta));
      setMapScale(newScale);
      setTouchStartDist(dist);
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
    const zoomSensitivity = 0.0015;
    const scaleAmount = -e.deltaY * zoomSensitivity;
    const newScale = Math.max(1.0, Math.min(4.0, mapScale * (1 + scaleAmount)));
    setMapScale(newScale);
    setPanOffset(prev => getBoundedPan(prev.x, prev.y, newScale));
  };

  // ─── HELPER: ADJUST WATER NODES ONTO LAND ───
  const getDisplayCoords = (nodeId: string, originalX: number, originalY: number) => {
    if (nodeId === 'cadence_town') return { x: 300, y: 380 }; // Moved onto Panay Island
    if (nodeId === 'harmonic_shrine') return { x: 750, y: 430 }; // Moved onto Bohol Island
    return { x: originalX, y: originalY };
  };

  // ─── DYNAMIC SCALING CALCULATIONS ───
  const dynamicPinScale = 1 / Math.pow(mapScale, 1.3);
  
  const path1Width = 10 * dynamicPinScale;
  const path1Dash = `16,10`.split(',').map(n => parseInt(n) * dynamicPinScale).join(',');
  
  const path2Width = 8 * dynamicPinScale;
  const path2Dash = `12,8`.split(',').map(n => parseInt(n) * dynamicPinScale).join(',');

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      {/* Left Area: Map Viewpoint */}
      <div className="flex-1 flex flex-col bg-[#151828] border-b md:border-b-0 md:border-r-[4px] border-[#0f0c0c] overflow-hidden relative">
        
        {/* Top Region Banner */}
        <div className="bg-[#1e2238] px-4 py-2.5 border-b-[4px] border-[#0f0c0c] flex items-center justify-between flex-wrap gap-2 z-40 relative">
          <div>
            <h2 className="font-orbitron font-black text-base sm:text-lg text-white uppercase tracking-wider">
              🗺️ MAP OF THE SILENT VALLEY
            </h2>
            <p className="text-xs text-slate-300 font-medium">
              Click nodes to travel, converse with NPCs, or trigger expedition encounters
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenQuests}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#f43f5e] text-white font-orbitron font-black text-xs uppercase -skew-x-6 border-[2px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] hover:bg-[#ff5a75] transition-all active:translate-y-0.5 active:shadow-none"
            >
              <Award className="w-4 h-4" />
              <span>QUESTS ({Object.values(quests).filter(q => q.status === 'active').length})</span>
            </button>
            <span className="px-2 py-1 bg-[#38bdf8] text-[#0f0c0c] font-orbitron font-bold text-2xs uppercase -skew-x-6 border-[2px] border-[#0f0c0c]">
              REGION 1 OF 4
            </span>
          </div>
        </div>

        {/* Merged Overworld Map Viewpoint with Pan/Zoom */}
        <div ref={mapContainerRef} className="flex-1 w-full h-full relative bg-[#2a2d43] overflow-hidden">
          
          <div
            className={`absolute inset-0 select-none touch-none cursor-grab active:cursor-grabbing ${isPanning ? '' : 'transition-transform duration-300 ease-out'}`}
            style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${mapScale})`, transformOrigin: 'center center' }}
            onMouseDown={e => handlePanStart(e.clientX, e.clientY)}
            onMouseMove={e => handlePanMove(e.clientX, e.clientY)}
            onMouseUp={handlePanEnd}
            onMouseLeave={handlePanEnd}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            {/* Background Map Image */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
              <img
                src={visayasMap}
                alt="Visayas Map Background"
                className="w-full h-full object-cover"
                style={{
                  opacity: 0.85,
                  mixBlendMode: 'hard-light',
                  filter: 'saturate(1.5) contrast(1.2) sepia(0.3) hue-rotate(-10deg)',
                }}
              />
              <div 
                className="absolute inset-0 opacity-25"
                style={{ backgroundImage: 'radial-gradient(#da2d46 2px, transparent 2px)', backgroundSize: '20px 20px' }}
              />
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#da2d46]/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#38bdf8]/15 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* SVG Map Data */}
            <svg 
              className="w-full h-full absolute inset-0 drop-shadow-[0px_4px_10px_rgba(0,0,0,0.5)] z-10 pointer-events-none" 
              viewBox="0 0 1000 650"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <linearGradient id="map-path-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#da2d46" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* Dynamic Connecting Paths - Fixed coordinates! */}
              <path 
                d="M 300,380 C 370,380 390,330 480,330 C 600,330 680,200 820,180" 
                fill="none" 
                stroke="url(#map-path-grad)" 
                strokeWidth={path1Width} 
                strokeDasharray={path1Dash} 
                strokeLinecap="round"
              />
              <path 
                d="M 480,330 C 530,430 640,450 750,430" 
                fill="none" 
                stroke="#facc15" 
                strokeWidth={path2Width} 
                strokeDasharray={path2Dash} 
                strokeLinecap="round"
              />

              {/* Nodes */}
              {Object.values(nodes).map(node => {
                const isSelected = node.id === currentNodeId;
                const isBoss = node.type === 'boss';
                const isShrine = node.type === 'shrine';
                
                // Route coordinates through the land-patch helper
                const { x: renderX, y: renderY } = getDisplayCoords(node.id, node.x, node.y);
                const ringColor = isBoss ? '#da2d46' : isShrine ? '#facc15' : '#38bdf8';

                return (
                  <g 
                    key={node.id} 
                    transform={`translate(${renderX}, ${renderY}) scale(${dynamicPinScale})`}
                    className="cursor-pointer group pointer-events-auto"
                    onClick={() => onSelectNode(node.id)}
                  >
                    <g className="transition-transform duration-200 group-hover:scale-110">
                      {isSelected && (
                        <circle 
                          r="46" 
                          fill="none" 
                          stroke={ringColor} 
                          strokeWidth="3" 
                          strokeDasharray="6 6"
                          className="animate-spin"
                          style={{ animationDuration: '8s' }}
                        />
                      )}

                      <circle r="34" fill="#1e2238" stroke="#0f0c0c" strokeWidth="6" />
                      <circle 
                        r="30" 
                        fill={isSelected ? ringColor : '#2a2d43'} 
                        stroke="#0f0c0c" 
                        strokeWidth="3" 
                        className="group-hover:fill-white transition-colors"
                      />

                      <text y="8" textAnchor="middle" fontSize="22" className="select-none pointer-events-none">
                        {node.icon}
                      </text>

                      <rect x="-80" y="42" width="160" height="28" fill="#0f0c0c" stroke={ringColor} strokeWidth="2" rx="0" />
                      <text 
                        y="60" 
                        textAnchor="middle" 
                        fontSize="12" 
                        fontFamily="Orbitron, sans-serif" 
                        fontWeight="900" 
                        fill="#ffffff"
                        className="select-none pointer-events-none tracking-wider"
                      >
                        {node.name.toUpperCase()}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Party Token Avatar on Current Node */}
              <g 
                transform={`translate(${getDisplayCoords(currentNode.id, currentNode.x, currentNode.y).x}, ${getDisplayCoords(currentNode.id, currentNode.x, currentNode.y).y - (55 * dynamicPinScale)}) scale(${dynamicPinScale})`}
                className="transition-all duration-500 ease-out pointer-events-none"
              >
                <polygon points="0,-36 28,-10 0,16 -28,-10" fill="#facc15" stroke="#0f0c0c" strokeWidth="4" />
                <text y="-4" textAnchor="middle" fontSize="20">🧑‍🎤</text>
                <text 
                  y="-46" 
                  textAnchor="middle" 
                  fontSize="11" 
                  fontFamily="Orbitron, sans-serif" 
                  fontWeight="900" 
                  fill="#facc15"
                  className="drop-shadow-[1px_1px_0px_#0f0c0c]"
                >
                  PARTY HERE
                </text>
              </g>
            </svg>
          </div>

          {/* ─── FIXED HUD ELEMENTS OVER MAP ─── */}
          <div className="absolute top-3 right-3 z-30 p-2 flex flex-col items-end gap-2 pointer-events-none w-full max-w-[210px] sm:max-w-[260px]">
            <div className="bg-[#e0e5ed] border-[3px] border-[#0f0c0c] p-2 shadow-[4px_4px_0px_0px_#0f0c0c] -skew-x-2 pointer-events-auto w-full">
              <div className="flex items-start justify-between gap-2 skew-x-2">
                <div className="text-left flex-1">
                  <h1 className="font-orbitron text-sm sm:text-lg font-black uppercase text-[#e0e5ed] leading-none" style={{ textShadow: '2px 2px 0px #0f0c0c, -1px 0px 0px #da2d46' }}>
                    VISAYAS ARC
                  </h1>
                  <div className="inline-block bg-[#0f0c0c] px-1.5 py-0.5 mt-1 -skew-x-6">
                    <p className="font-space-mono text-[7px] sm:text-[9px] uppercase font-bold text-[#f0dde0] skew-x-6 tracking-widest leading-tight">
                      APPRENTICE
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 font-orbitron font-black text-xs sm:text-sm bg-[#da2d46] border-2 border-[#0f0c0c] px-1.5 shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6 text-[#0f0c0c]">
                    <Flame size={12} className="skew-x-6" />
                    <span className="skew-x-6">1</span>
                  </div>
                  <div className="flex gap-0.5 mt-1">
                    <Shield size={8} className="text-[#0f0c0c] fill-[#f0dde0]" />
                  </div>
                </div>
              </div>
              <div className="mt-2 skew-x-2">
                <div className="flex justify-between mb-0.5 font-space-mono text-[7px] sm:text-[8px] font-black text-[#0f0c0c] uppercase">
                  <span>LVL 1</span>
                  <span>0 / 100 XP</span>
                </div>
                <div className="h-1.5 sm:h-2 w-full border-[2px] border-[#0f0c0c] bg-[#2a2d43] relative skew-x-6">
                  <div className="h-full bg-[#da2d46] w-[15%]" />
                </div>
              </div>
            </div>

            <div className="flex gap-1.5 pointer-events-auto w-full justify-end">
              <button
                onClick={onOpenLocationServices}
                className="flex-1 py-1 sm:py-1.5 bg-[#f0dde0] border-[2px] border-[#0f0c0c] flex flex-col items-center justify-center gap-0.5 shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6 hover:bg-[#da2d46] hover:text-white transition-all group"
              >
                <Map size={13} className="skew-x-6 text-[#0f0c0c] group-hover:text-white" />
                <span className="font-space-mono uppercase font-black text-[7px] sm:text-[8px] skew-x-6 text-[#0f0c0c] group-hover:text-white">Radar</span>
              </button>
              <button
                onClick={onOpenBadges}
                className="flex-1 py-1 sm:py-1.5 bg-[#fbe8eb] border-[2px] border-[#0f0c0c] flex flex-col items-center justify-center gap-0.5 shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6 hover:bg-[#da2d46] hover:text-white transition-all group"
              >
                <ShieldAlert size={13} className="skew-x-6 text-[#da2d46] group-hover:text-white" />
                <span className="font-space-mono uppercase font-black text-[7px] sm:text-[8px] skew-x-6 text-[#0f0c0c] group-hover:text-white">Badges</span>
              </button>
              <button
                onClick={onOpenRanks}
                className="flex-1 py-1 sm:py-1.5 bg-[#fef3c7] border-[2px] border-[#0f0c0c] flex flex-col items-center justify-center gap-0.5 shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6 hover:bg-[#da2d46] hover:text-white transition-all group"
              >
                <Flame size={13} className="skew-x-6 text-[#d97706] group-hover:text-white" />
                <span className="font-space-mono uppercase font-black text-[7px] sm:text-[8px] skew-x-6 text-[#0f0c0c] group-hover:text-white">Ranks</span>
              </button>
            </div>
          </div>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 w-full max-w-xs sm:max-w-sm px-4 pointer-events-none">
            <button
              onClick={onOpenScanner}
              className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3.5 bg-[#da2d46] border-[3px] sm:border-[5px] border-[#0f0c0c] text-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all -skew-x-6 pointer-events-auto group"
            >
              <Camera size={18} className="skew-x-6 font-black sm:w-5 sm:h-5" />
              <span className="font-space-mono font-black text-xs sm:text-base tracking-widest uppercase skew-x-6">
                SCAN INSTRUMENT
              </span>
            </button>
          </div>

        </div>
      </div>

      {/* Right/Sidebar: Location Details & Type Weakness Chart */}
      <aside className="w-full lg:w-96 flex flex-col gap-4 bg-[#151828] p-4 border-t-[4px] md:border-t-0 border-[#0f0c0c] md:overflow-y-auto">
        
        {/* Location Info Card */}
        <div className="bg-[#1e2238] border-[4px] border-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 bg-[#38bdf8] text-[#0f0c0c] border-[3px] border-[#0f0c0c] font-orbitron font-black text-xs uppercase -skew-x-6">
              {currentNode.type.toUpperCase()} NODE
            </span>
            <span className="text-2xl">{currentNode.icon}</span>
          </div>

          <div>
            <h3 className="font-orbitron font-black text-xl text-white tracking-wider">
              {currentNode.name}
            </h3>
            <p className="text-sm text-slate-300 mt-1 leading-relaxed">
              {currentNode.desc}
            </p>
          </div>

          <div className="bg-[#0f0c0c] p-3 border-[3px] border-[#0f0c0c] flex flex-col gap-1">
            <span className="text-2xs font-orbitron font-bold uppercase text-[#facc15] tracking-wider">
              📍 REGIONAL REWARDS / OPPORTUNITY
            </span>
            <span className="text-xs text-white font-bold">
              {currentNode.rewards}
            </span>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            {currentNode.type === 'town' ? (
              <button
                onClick={() => {
                  setDialogueStep(0);
                  setShowDialogue(true);
                }}
                className="w-full py-3 bg-[#facc15] text-[#0f0c0c] border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-sm uppercase -skew-x-6 hover:bg-[#ffdf3d] transition-all flex items-center justify-center gap-2 active:translate-y-0.5 active:shadow-none"
              >
                <MessageSquare className="w-4 h-4 fill-current" />
                <span>TALK TO ELDER CADENCE</span>
              </button>
            ) : (
              <button
                onClick={() => currentNode.enemyId && onStartBattle(currentNode.enemyId)}
                className="w-full py-3 bg-[#da2d46] text-white border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-sm uppercase -skew-x-6 hover:bg-[#ff3b56] transition-all flex items-center justify-center gap-2 active:translate-y-0.5 active:shadow-none"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>ENTER BATTLE ({currentNode.name.split(' ')[0]})</span>
              </button>
            )}

            <button
              onClick={onOpenQuests}
              className="w-full py-2 bg-[#2a2d43] text-[#38bdf8] border-[3px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] font-orbitron font-bold text-xs uppercase -skew-x-6 hover:bg-[#323652] transition-all flex items-center justify-center gap-1.5 active:translate-y-0.5 active:shadow-none"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>CHECK ACTIVE QUEST JOURNAL</span>
            </button>
          </div>
        </div>

        {/* Type Weakness Circle Chart Card */}
        <div className="bg-[#1e2238] border-[4px] border-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b-[2px] border-[#0f0c0c] pb-2">
            <ShieldAlert className="w-4 h-4 text-[#facc15]" />
            <h4 className="font-orbitron font-black text-xs uppercase tracking-wider text-[#facc15]">
              ⚡ TYPE WEAKNESS MATRIX
            </h4>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 text-2xs font-orbitron font-bold py-1">
            <span className="px-2 py-1 bg-[#da2d46] text-white border border-[#0f0c0c] -skew-x-6">STRING</span>
            <span>➔</span>
            <span className="px-2 py-1 bg-[#facc15] text-[#0f0c0c] border border-[#0f0c0c] -skew-x-6">PERC</span>
            <span>➔</span>
            <span className="px-2 py-1 bg-[#f97316] text-white border border-[#0f0c0c] -skew-x-6">BRASS</span>
            <span>➔</span>
            <span className="px-2 py-1 bg-[#a855f7] text-white border border-[#0f0c0c] -skew-x-6">SYNTH</span>
            <span>➔</span>
            <span className="px-2 py-1 bg-[#4ade80] text-[#0f0c0c] border border-[#0f0c0c] -skew-x-6">WOOD</span>
            <span>➔</span>
            <span className="px-2 py-1 bg-[#da2d46] text-white border border-[#0f0c0c] -skew-x-6">STRING</span>
          </div>

          <p className="text-2xs text-slate-300 leading-normal bg-[#0f0c0c] p-2.5 border-[2px] border-[#0f0c0c]">
            Super Effective attacks deal <strong className="text-[#4ade80]">2.0x Damage</strong> and double your Stagger bar buildup!
          </p>
        </div>
      </aside>

      {/* NPC Dialogue Box Modal */}
      {showDialogue && (
        <div className="fixed inset-0 z-50 bg-[#0f0c0c]/80 flex items-center justify-center p-4">
          <div className="bg-[#1e2238] border-[5px] border-[#0f0c0c] shadow-[8px_8px_0px_0px_#0f0c0c] max-w-xl w-full p-6 flex flex-col sm:flex-row gap-5 items-center sm:items-start -skew-x-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-5xl bg-[#0f0c0c] p-4 border-[3px] border-[#facc15] shadow-[4px_4px_0px_0px_#facc15] flex items-center justify-center">
              {dialogues[dialogueStep]?.avatar}
            </div>

            <div className="flex-1 flex flex-col gap-3 text-center sm:text-left">
              <div className="flex items-center justify-between border-b-[2px] border-[#0f0c0c] pb-2">
                <span className="font-orbitron font-black text-lg text-[#facc15] tracking-wider">
                  {dialogues[dialogueStep]?.speaker}
                </span>
                <span className="text-2xs font-orbitron text-slate-400 font-bold">
                  STEP {dialogueStep + 1}/{dialogues.length}
                </span>
              </div>

              <p className="text-base text-white font-medium leading-relaxed">
                "{dialogues[dialogueStep]?.text}"
              </p>

              <div className="pt-3">
                <button
                  onClick={handleNextDialogue}
                  className="w-full py-2.5 bg-[#4ade80] text-[#0f0c0c] border-[3px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-[#6bee9c] transition-all active:translate-y-0.5 active:shadow-none"
                >
                  ▶ {dialogues[dialogueStep]?.choice}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}