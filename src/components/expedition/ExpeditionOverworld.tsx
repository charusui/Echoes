import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Play, MessageSquare, Compass, ShieldAlert, Camera, Map, Flame, Shield, X, ChevronUp } from 'lucide-react';
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
  onOpenShop?: () => void;
}

export function ExpeditionOverworld({
  nodes,
  currentNodeId,
  onSelectNode,
  onStartBattle,
  onOpenQuests,
  quests: _quests,
  onOpenScanner,
  onOpenLocationServices,
  onOpenBadges,
  onOpenRanks,
  onOpenShop,
}: ExpeditionOverworldProps) {
  const [showDialogue, setShowDialogue] = useState(false);
  const [dialogueStep, setDialogueStep] = useState(0);
  const [avatarPos, setAvatarPos] = useState<{ x: number; y: number } | null>(null);
  const [isTraveling, setIsTraveling] = useState(false);
  
  // New state to control the mobile bottom sheet
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const currentNode = nodes[currentNodeId] || nodes['cadence_town']!;
  const LINEAR_NODES = ['cadence_town', 'echo_woods', 'harmonic_shrine', 'silent_peak'];

  // ─── HELPER: ADJUST WATER NODES ONTO LAND ───
  const getDisplayCoords = useCallback((nodeId: string, originalX: number, originalY: number) => {
    if (nodeId === 'cadence_town') return { x: 300, y: 380 };
    if (nodeId === 'harmonic_shrine') return { x: 750, y: 430 };
    return { x: originalX, y: originalY };
  }, []);

  const handleNodeClick = (targetId: string) => {
    if (isTraveling || targetId === currentNodeId) {
      setIsSidebarOpen(true); // Just open the menu if they click the current node
      return;
    }

    const fromIndex = LINEAR_NODES.indexOf(currentNodeId);
    const toIndex = LINEAR_NODES.indexOf(targetId);

    if (fromIndex !== -1 && toIndex !== -1 && Math.abs(toIndex - fromIndex) > 1) {
      setIsTraveling(true);
      setIsSidebarOpen(false); // Hide panel so they can watch the travel animation
      
      const stepDirection = toIndex > fromIndex ? 1 : -1;
      let stepIndex = fromIndex + stepDirection;

      const firstStepNodeId = LINEAR_NODES[stepIndex];
      const firstStepNode = firstStepNodeId ? nodes[firstStepNodeId] : null;
      if (firstStepNode) {
        const { x: renderX, y: renderY } = getDisplayCoords(firstStepNode.id, firstStepNode.x, firstStepNode.y);
        setAvatarPos({ x: renderX, y: renderY });
      }

      const stepInterval = setInterval(() => {
        if (stepIndex === toIndex) {
          clearInterval(stepInterval);
          setIsTraveling(false);
          onSelectNode(targetId);
          setAvatarPos(null);
          setIsSidebarOpen(true); // Re-open panel when arrived
        } else {
          stepIndex += stepDirection;
          const stepNodeId = LINEAR_NODES[stepIndex];
          const stepNode = stepNodeId ? nodes[stepNodeId] : null;
          if (stepNode) {
            const { x: renderX, y: renderY } = getDisplayCoords(stepNode.id, stepNode.x, stepNode.y);
            setAvatarPos({ x: renderX, y: renderY });
          }
          if (stepIndex === toIndex) {
            clearInterval(stepInterval);
            setIsTraveling(false);
            onSelectNode(targetId);
            setAvatarPos(null);
            setIsSidebarOpen(true); // Re-open panel when arrived
          }
        }
      }, 450);
    } else {
      onSelectNode(targetId);
      setIsSidebarOpen(true); // Open panel immediately
    }
  };

  const dialogues = useMemo(() => [
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
      choice: 'Understood! We will head to Echo Village.',
    },
    {
      speaker: 'Elder Cadence',
      avatar: '👴',
      text: 'Beware Lord Cacophony at The Wild Peak Summit! His brass shockwaves can shatter an unprepared party in seconds.',
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

  // ─── HIGH PERFORMANCE MAP PANNING & ZOOMING ───
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const panWrapperRef = useRef<HTMLDivElement>(null);
  const panOffsetRef = useRef({ x: 0, y: 0 }); 
  const animationFrameRef = useRef<number | null>(null);
  
  const [dimensions, setDimensions] = useState({ width: 1000, height: 650 });
  const [mapScale, setMapScale] = useState(1.0);
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

  const mapRatio = 1000 / 650;
  const containerRatio = dimensions.width / (dimensions.height || 1);
  const visualWidth = containerRatio < mapRatio ? dimensions.height * mapRatio : dimensions.width;
  const visualHeight = containerRatio < mapRatio ? dimensions.height : dimensions.width / mapRatio;

  const getBoundedPan = (x: number, y: number, scale: number) => {
    const limitX = Math.max(0, (visualWidth * scale - dimensions.width) / 2);
    const limitY = Math.max(0, (visualHeight * scale - dimensions.height) / 2);
    return {
      x: Math.max(-limitX, Math.min(limitX, x)),
      y: Math.max(-limitY, Math.min(limitY, y)),
    };
  };

  const handlePanStart = (clientX: number, clientY: number) => {
    setIsPanning(true);
    setPanStart({ 
      x: clientX - panOffsetRef.current.x, 
      y: clientY - panOffsetRef.current.y 
    });
  };

  const handlePanMove = (clientX: number, clientY: number) => {
    if (!isPanning) return;
    
    const newOffset = getBoundedPan(clientX - panStart.x, clientY - panStart.y, mapScale);
    panOffsetRef.current = newOffset;

    // Use requestAnimationFrame for smooth 60fps tracking without layout thrashing
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(() => {
      if (panWrapperRef.current) {
        panWrapperRef.current.style.transform = `translate3d(${newOffset.x}px, ${newOffset.y}px, 0) scale(${mapScale})`;
      }
    });
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
      
      panOffsetRef.current = getBoundedPan(panOffsetRef.current.x, panOffsetRef.current.y, newScale);
      
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = requestAnimationFrame(() => {
        if (panWrapperRef.current) {
          panWrapperRef.current.style.transform = `translate3d(${panOffsetRef.current.x}px, ${panOffsetRef.current.y}px, 0) scale(${newScale})`;
        }
      });
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
    panOffsetRef.current = getBoundedPan(panOffsetRef.current.x, panOffsetRef.current.y, newScale);
    
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(() => {
      if (panWrapperRef.current) {
        panWrapperRef.current.style.transform = `translate3d(${panOffsetRef.current.x}px, ${panOffsetRef.current.y}px, 0) scale(${newScale})`;
      }
    });
  };

  // ─── DYNAMIC SCALING CALCULATIONS ───
  const isMobile = dimensions.width < 768;
  const screenScaleAdjustment = isMobile ? 1.4 : 1;
  const dynamicPinScale = (1 / Math.pow(mapScale, 1.3)) * screenScaleAdjustment;
  
  const path1Width = 10 * dynamicPinScale;
  const path1Dash = `16,10`.split(',').map(n => parseInt(n) * dynamicPinScale).join(',');

  // ─── MEMOIZED SVG NODES ───
  const memoizedNodes = useMemo(() => {
    return Object.values(nodes).map(node => {
      const isSelected = node.id === currentNodeId;
      const isBoss = node.type === 'boss';
      const isShrine = node.type === 'shrine';
      
      const { x: renderX, y: renderY } = getDisplayCoords(node.id, node.x, node.y);
      const ringColor = isBoss ? '#da2d46' : isShrine ? '#facc15' : '#38bdf8';

      const isLongName = node.name.length > 16;
      const labelFontSize = isLongName ? 10.5 : 12;
      const labelWidth = Math.max(160, node.name.length * (isLongName ? 8.5 : 10) + 32);
      const labelX = -labelWidth / 2;

      return (
        <g 
          key={node.id} 
          transform={`translate(${renderX}, ${renderY}) scale(${dynamicPinScale})`}
          className="cursor-pointer group pointer-events-auto"
          onClick={() => handleNodeClick(node.id)}
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

            <rect x={labelX} y="42" width={labelWidth} height="28" fill="#0f0c0c" stroke={ringColor} strokeWidth="2" rx="0" />
            <text 
              y="60" 
              textAnchor="middle" 
              fontSize={labelFontSize} 
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
    });
  }, [nodes, currentNodeId, dynamicPinScale, getDisplayCoords]);

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full h-full relative">
      
      {/* Mobile Backdrop for Drawer */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-[#0f0c0c]/60 z-40 animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Left Area: Map Viewpoint */}
      <div className="flex-1 flex flex-col bg-[#151828] border-b md:border-b-0 md:border-r-[4px] border-[#0f0c0c] overflow-hidden relative">
        
        {/* Top Region Banner */}
        <div className="bg-[#1e2238] px-3 sm:px-4 py-2 sm:py-2.5 border-b-[4px] border-[#0f0c0c] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 z-40 relative shrink-0">
          <div>
            <h2 className="font-orbitron font-black text-sm sm:text-lg text-white uppercase tracking-wider">
              🗺️ MAP OF THE SILENT VALLEY
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-300 font-medium">
              Click nodes to travel, converse with NPCs, or trigger encounters
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-2 py-1 bg-[#38bdf8] text-[#0f0c0c] font-orbitron font-bold text-[9px] sm:text-2xs uppercase -skew-x-6 border-[2px] border-[#0f0c0c]">
              REGION 1 OF 4
            </span>
          </div>
        </div>

        {/* Merged Overworld Map Viewpoint with Pan/Zoom */}
        <div ref={mapContainerRef} className="flex-1 w-full h-full relative bg-[#2a2d43] overflow-hidden">
          
          <div
            ref={panWrapperRef}
            className={`absolute select-none touch-none cursor-grab active:cursor-grabbing will-change-transform transform-gpu ${isPanning ? '' : 'transition-transform duration-300 ease-out'}`}
            style={{ 
              width: `${visualWidth}px`,
              height: `${visualHeight}px`,
              left: '50%',
              top: '50%',
              marginLeft: `${-visualWidth / 2}px`,
              marginTop: `${-visualHeight / 2}px`,
              transform: `translate3d(${panOffsetRef.current.x}px, ${panOffsetRef.current.y}px, 0) scale(${mapScale})`, 
              transformOrigin: 'center center',
              backfaceVisibility: 'hidden'
            }}
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
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden will-change-transform">
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
            {/* Removed the heavy drop-shadow filter from this SVG container to fix mobile rendering lag */}
            <svg 
              className="w-full h-full absolute inset-0 z-10 pointer-events-none" 
              viewBox="0 0 1000 650"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <linearGradient id="map-path-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#da2d46" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* Connecting Path */}
              <path 
                d="M 300,380 C 370,380 390,330 480,330 C 580,330 640,430 750,430 C 820,430 840,280 820,180" 
                fill="none" 
                stroke="url(#map-path-grad)" 
                strokeWidth={path1Width} 
                strokeDasharray={path1Dash} 
                strokeLinecap="round"
              />

              {/* Render Memoized Nodes to prevent lag on pan */}
              {memoizedNodes}

              {/* Party Token Avatar on Current Node */}
              {(() => {
                const currentRenderCoords = getDisplayCoords(currentNode.id, currentNode.x, currentNode.y);
                const displayPos = avatarPos || { x: currentRenderCoords.x, y: currentRenderCoords.y };
                return (
                  <g 
                    transform={`translate(${displayPos.x}, ${displayPos.y - (55 * dynamicPinScale)}) scale(${dynamicPinScale})`}
                    className="transition-all duration-450 ease-in-out pointer-events-none"
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
                      {isTraveling ? 'TRAVELING...' : 'PARTY HERE'}
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* ─── FIXED HUD ELEMENTS OVER MAP ─── */}
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-30 p-1 sm:p-2 flex flex-col items-end gap-1.5 sm:gap-2 pointer-events-none w-full max-w-[190px] sm:max-w-[240px] md:max-w-[260px]">
            <div className="bg-[#e0e5ed] border-[2px] sm:border-[3px] border-[#0f0c0c] p-1.5 sm:p-2 shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] -skew-x-2 pointer-events-auto w-full">
              <div className="flex items-start justify-between gap-2 skew-x-2">
                <div className="text-left flex-1">
                  <h1 className="font-orbitron text-xs sm:text-sm md:text-lg font-black uppercase text-[#e0e5ed] leading-none" style={{ textShadow: '2px 2px 0px #0f0c0c, -1px 0px 0px #da2d46' }}>
                    VISAYAS ARC
                  </h1>
                  <div className="inline-block bg-[#0f0c0c] px-1 sm:px-1.5 py-0.5 mt-1 -skew-x-6">
                    <p className="font-space-mono text-[6px] sm:text-[7px] md:text-[9px] uppercase font-bold text-[#f0dde0] skew-x-6 tracking-widest leading-tight">
                      APPRENTICE
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 font-orbitron font-black text-[10px] sm:text-xs md:text-sm bg-[#da2d46] border-2 border-[#0f0c0c] px-1 sm:px-1.5 shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6 text-[#0f0c0c]">
                    <Flame size={isMobile ? 10 : 12} className="skew-x-6" />
                    <span className="skew-x-6">1</span>
                  </div>
                  <div className="flex gap-0.5 mt-1 hidden sm:flex">
                    <Shield size={8} className="text-[#0f0c0c] fill-[#f0dde0]" />
                  </div>
                </div>
              </div>
              <div className="mt-1.5 sm:mt-2 skew-x-2">
                <div className="flex justify-between mb-0.5 font-space-mono text-[6px] sm:text-[7px] md:text-[8px] font-black text-[#0f0c0c] uppercase">
                  <span>LVL 1</span>
                  <span>0 / 100 XP</span>
                </div>
                <div className="h-1 sm:h-1.5 md:h-2 w-full border-[1px] sm:border-[2px] border-[#0f0c0c] bg-[#2a2d43] relative skew-x-6">
                  <div className="h-full bg-[#da2d46] w-[15%]" />
                </div>
              </div>
            </div>

            <div className="flex gap-1 sm:gap-1.5 pointer-events-auto w-full justify-end">
              <button
                onClick={onOpenLocationServices}
                className="flex-1 py-1 sm:py-1.5 bg-[#f0dde0] border-[2px] border-[#0f0c0c] flex flex-col items-center justify-center gap-0.5 shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6 hover:bg-[#da2d46] hover:text-white transition-all group"
              >
                <Map size={isMobile ? 11 : 13} className="skew-x-6 text-[#0f0c0c] group-hover:text-white" />
                <span className="font-space-mono uppercase font-black text-[6px] sm:text-[7px] md:text-[8px] skew-x-6 text-[#0f0c0c] group-hover:text-white">Radar</span>
              </button>
              <button
                onClick={onOpenBadges}
                className="flex-1 py-1 sm:py-1.5 bg-[#fbe8eb] border-[2px] border-[#0f0c0c] flex flex-col items-center justify-center gap-0.5 shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6 hover:bg-[#da2d46] hover:text-white transition-all group"
              >
                <ShieldAlert size={isMobile ? 11 : 13} className="skew-x-6 text-[#da2d46] group-hover:text-white" />
                <span className="font-space-mono uppercase font-black text-[6px] sm:text-[7px] md:text-[8px] skew-x-6 text-[#0f0c0c] group-hover:text-white">Badges</span>
              </button>
              <button
                onClick={onOpenRanks}
                className="flex-1 py-1 sm:py-1.5 bg-[#fef3c7] border-[2px] border-[#0f0c0c] flex flex-col items-center justify-center gap-0.5 shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6 hover:bg-[#da2d46] hover:text-white transition-all group"
              >
                <Flame size={isMobile ? 11 : 13} className="skew-x-6 text-[#d97706] group-hover:text-white" />
                <span className="font-space-mono uppercase font-black text-[6px] sm:text-[7px] md:text-[8px] skew-x-6 text-[#0f0c0c] group-hover:text-white">Ranks</span>
              </button>
            </div>
          </div>

          <div className="absolute bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-[280px] sm:max-w-sm px-2 sm:px-4 pointer-events-none">
            <button
              onClick={onOpenScanner}
              className="w-full flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 md:py-3.5 bg-[#da2d46] border-[3px] sm:border-[4px] md:border-[5px] border-[#0f0c0c] text-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] sm:shadow-[6px_6px_0px_0px_#0f0c0c] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_#0f0c0c] sm:hover:shadow-[8px_8px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all -skew-x-6 pointer-events-auto group"
            >
              <Camera className="skew-x-6 font-black w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-space-mono font-black text-[11px] sm:text-xs md:text-base tracking-widest uppercase skew-x-6">
                SCAN INSTRUMENT
              </span>
            </button>
          </div>

          {/* Floating Toggle Button for Mobile Drawer (Redesigned) */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className={`
              md:hidden absolute right-0 bottom-24 z-30
              bg-[#facc15] text-[#0f0c0c] py-2 px-3 pl-4 rounded-l-md border-y-[3px] border-l-[3px] border-[#0f0c0c] shadow-[-4px_4px_0px_0px_#0f0c0c]
              transition-all duration-300 ease-in-out hover:bg-[#ffdf3d] active:translate-y-1 active:shadow-[0px_0px_0px_0px_#0f0c0c]
              flex items-center gap-1.5 cursor-pointer
              ${isSidebarOpen ? 'translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}
            `}
          >
            <ChevronUp size={16} className="font-black -rotate-90" />
            <span className="font-orbitron font-black text-[10px] tracking-widest uppercase">
              NODE INFO
            </span>
          </button>
        </div>
      </div>

      {/* Right/Bottom Sidebar (Drawer on Mobile): Location Details & Type Weakness Chart */}
      <aside className={`
        fixed md:relative inset-x-0 bottom-0 md:bottom-auto z-50 md:z-0
        w-full md:w-80 xl:w-96 max-h-[85vh] md:max-h-none
        flex flex-col gap-2.5 bg-[#151828] p-4 md:p-3 border-t-[4px] md:border-t-0 border-[#0f0c0c]
        overflow-y-auto md:overflow-hidden select-none shrink-0 md:shrink
        transition-transform duration-300 ease-out shadow-[0px_-10px_20px_rgba(0,0,0,0.5)] md:shadow-none
        ${isSidebarOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
      `}>
        
        {/* Drawer Drag Handle (Mobile Only) */}
        <div 
          className="md:hidden w-full flex items-center justify-center pb-3 pt-1 cursor-pointer group" 
          onClick={() => setIsSidebarOpen(false)}
        >
          <div className="w-12 h-1.5 bg-slate-600 rounded-full group-hover:bg-slate-400 transition-colors" />
        </div>

        {/* Close Button (Mobile Only) */}
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Location Info Card */}
        <div className="bg-[#1e2238] border-[3px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] p-3.5 flex flex-col gap-2 shrink-0 md:flex-1 md:justify-between md:min-h-0 md:overflow-hidden">
          <div className="pr-6 md:pr-0">
            <div className="flex items-center justify-between mb-1">
              <span className="px-1.5 sm:px-2 py-0.5 bg-[#38bdf8] text-[#0f0c0c] border-[2px] border-[#0f0c0c] font-orbitron font-black text-[9px] sm:text-2xs uppercase -skew-x-6">
                {currentNode.type.toUpperCase()} NODE
              </span>
              <span className="text-lg sm:text-xl leading-none hidden md:block">{currentNode.icon}</span>
            </div>

            <h3 className="font-orbitron font-black text-base sm:text-base xl:text-lg text-white tracking-wider leading-tight truncate">
              {currentNode.name}
            </h3>
            <p className="text-[11px] sm:text-2xs xl:text-xs text-slate-300 mt-1 leading-snug line-clamp-2">
              {currentNode.desc}
            </p>
          </div>

          <div className="bg-[#0f0c0c] p-2 border-[2px] border-[#0f0c0c] flex flex-col gap-0.5 shrink-0 my-1 md:my-0">
            <span className="text-[9px] sm:text-3xs xl:text-2xs font-orbitron font-bold uppercase text-[#facc15] tracking-wider">
              📍 REGIONAL REWARDS / OPPORTUNITY
            </span>
            <span className="text-[11px] sm:text-2xs xl:text-xs text-white font-bold truncate">
              {currentNode.rewards}
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:gap-2 pt-1 shrink-0">
            {currentNode.type === 'town' ? (
              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={() => {
                    setDialogueStep(0);
                    setShowDialogue(true);
                    if (isMobile) setIsSidebarOpen(false); // Hide panel on mobile when dialogue opens
                  }}
                  className="w-full py-2.5 sm:py-2 xl:py-2.5 bg-[#facc15] text-[#0f0c0c] border-[3px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-xs xl:text-sm uppercase -skew-x-6 hover:bg-[#ffdf3d] transition-all flex items-center justify-center gap-1.5 sm:gap-2 active:translate-y-0.5 active:shadow-none"
                >
                  <MessageSquare className="w-4 h-4 sm:w-3.5 sm:h-3.5 fill-current shrink-0" />
                  <span className="truncate">TALK TO ELDER CADENCE</span>
                </button>

                <button
                  onClick={() => {
                    if (onOpenShop) onOpenShop();
                    if (isMobile) setIsSidebarOpen(false);
                  }}
                  className="w-full py-2.5 sm:py-2 xl:py-2.5 bg-[#f97316] text-white border-[3px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-xs xl:text-sm uppercase -skew-x-6 hover:bg-[#fb923c] transition-all flex items-center justify-center gap-1.5 sm:gap-2 active:translate-y-0.5 active:shadow-none animate-pulse"
                >
                  <span className="text-sm sm:text-base leading-none">🏪</span>
                  <span className="truncate font-black tracking-wider">VISIT MARIA'S FINE GOODS</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => currentNode.enemyId && onStartBattle(currentNode.enemyId)}
                className="w-full py-2.5 sm:py-2 xl:py-2.5 bg-[#da2d46] text-white border-[3px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-xs xl:text-sm uppercase -skew-x-6 hover:bg-[#ff3b56] transition-all flex items-center justify-center gap-1.5 sm:gap-2 active:translate-y-0.5 active:shadow-none"
              >
                <Play className="w-4 h-4 sm:w-3.5 sm:h-3.5 fill-current shrink-0" />
                <span className="truncate">ENTER BATTLE ({currentNode.name.split(' ')[0]})</span>
              </button>
            )}

            <button
              onClick={onOpenQuests}
              className="w-full py-2 xl:py-2 bg-[#2a2d43] text-[#38bdf8] border-[2px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] font-orbitron font-bold text-[10px] sm:text-2xs xl:text-xs uppercase -skew-x-6 hover:bg-[#323652] transition-all flex items-center justify-center gap-1.5 active:translate-y-0.5 active:shadow-none"
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">CHECK ACTIVE QUEST JOURNAL</span>
            </button>
          </div>
        </div>

        {/* Type Weakness Circle Chart Card */}
        <div className="bg-[#1e2238] border-[3px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] p-3 flex flex-col gap-2 shrink-0 mb-4 md:mb-0">
          <div className="flex items-center gap-1.5 border-b border-[#0f0c0c] pb-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-[#facc15]" />
            <h4 className="font-orbitron font-black text-[10px] sm:text-2xs uppercase tracking-wider text-[#facc15]">
              ⚡ TYPE WEAKNESS MATRIX
            </h4>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1 text-[9px] sm:text-3xs xl:text-2xs font-orbitron font-bold py-0.5">
            <span className="px-1.5 py-0.5 bg-[#da2d46] text-white border border-[#0f0c0c] -skew-x-6">STRING</span>
            <span>➔</span>
            <span className="px-1.5 py-0.5 bg-[#facc15] text-[#0f0c0c] border border-[#0f0c0c] -skew-x-6">PERC</span>
            <span>➔</span>
            <span className="px-1.5 py-0.5 bg-[#f97316] text-white border border-[#0f0c0c] -skew-x-6">BRASS</span>
            <span>➔</span>
            <span className="px-1.5 py-0.5 bg-[#a855f7] text-white border border-[#0f0c0c] -skew-x-6">SYNTH</span>
            <span>➔</span>
            <span className="px-1.5 py-0.5 bg-[#4ade80] text-[#0f0c0c] border border-[#0f0c0c] -skew-x-6">WOOD</span>
            <span>➔</span>
            <span className="px-1.5 py-0.5 bg-[#da2d46] text-white border border-[#0f0c0c] -skew-x-6">STRING</span>
          </div>

          <p className="text-[10px] sm:text-3xs xl:text-2xs text-slate-300 leading-tight bg-[#0f0c0c] p-2 border border-[#0f0c0c]">
            Super Effective attacks deal <strong className="text-[#4ade80]">2.0x Damage</strong> and double your Stagger bar buildup!
          </p>
        </div>
      </aside>

      {/* NPC Dialogue Box Modal */}
      {showDialogue && (
        <div className="fixed inset-0 z-[60] bg-[#0f0c0c]/90 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#1e2238] border-[4px] sm:border-[5px] border-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] sm:shadow-[8px_8px_0px_0px_#0f0c0c] max-w-xl w-full p-4 sm:p-6 flex flex-col sm:flex-row gap-3 sm:gap-5 items-center sm:items-start -skew-x-2 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="text-4xl sm:text-5xl bg-[#0f0c0c] p-3 sm:p-4 border-[3px] border-[#facc15] shadow-[4px_4px_0px_0px_#facc15] flex items-center justify-center shrink-0">
              {dialogues[dialogueStep]?.avatar}
            </div>

            <div className="flex-1 flex flex-col gap-2 sm:gap-3 text-center sm:text-left w-full">
              <div className="flex flex-col sm:flex-row items-center justify-between border-b-[2px] border-[#0f0c0c] pb-2 gap-1 sm:gap-0">
                <span className="font-orbitron font-black text-base sm:text-lg text-[#facc15] tracking-wider">
                  {dialogues[dialogueStep]?.speaker}
                </span>
                <span className="text-[10px] sm:text-2xs font-orbitron text-slate-400 font-bold">
                  STEP {dialogueStep + 1}/{dialogues.length}
                </span>
              </div>

              <p className="text-sm sm:text-base text-white font-medium leading-relaxed my-2 sm:my-0">
                "{dialogues[dialogueStep]?.text}"
              </p>

              <div className="pt-2 sm:pt-3">
                <button
                  onClick={handleNextDialogue}
                  className="w-full py-2 sm:py-2.5 bg-[#4ade80] text-[#0f0c0c] border-[3px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-[11px] sm:text-sm uppercase -skew-x-6 hover:bg-[#6bee9c] transition-all active:translate-y-0.5 active:shadow-none break-words px-2"
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