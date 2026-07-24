import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Play, MessageSquare, Compass, ShieldAlert, Camera, Map, Flame, X, ChevronUp } from 'lucide-react';
import { type MapNode, type ExpeditionQuest } from '../../types/expedition';
import visayasMap from '../../assets/png/visayas_map.png';
import { DevMenu } from '../DevMenu'; 

interface ExpeditionOverworldProps {
  nodes: Record<string, MapNode>;
  currentNodeId: string;
  onSelectNode: (nodeId: string) => void;
  onStartBattle: (enemyId: string, enemyGauntlet?: string[]) => void;
  onOpenQuests: () => void;
  quests: Record<string, ExpeditionQuest>;
  onOpenScanner?: () => void;
  onOpenLocationServices?: () => void;
  onOpenCollection?: () => void;
  onOpenBadges?: () => void;
  onOpenRanks?: () => void;
  onOpenShop?: () => void;
  
  onOpenStudentSession?: () => void;
  onOpenKorlongHunt?: () => void;
  onStartGameplay?: (instrument: string) => void;
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
  onOpenStudentSession,
  onOpenKorlongHunt,
  onStartGameplay
}: ExpeditionOverworldProps) {
  const [showDialogue, setShowDialogue] = useState(false);
  const [dialogueStep, setDialogueStep] = useState(0);
  const [avatarPos, setAvatarPos] = useState<{ x: number; y: number } | null>(null);
  const [isTraveling, setIsTraveling] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ─── DRAWER DRAG STATE ───
  const [dragOffset, setDragOffset] = useState(0);
  const [isDraggingDrawer, setIsDraggingDrawer] = useState(false);
  const dragStartY = useRef(0);
  const dragDeltaY = useRef(0);

  // ─── MOUNT STATE FOR ENTRANCE ANIMATIONS ───
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const currentNode = nodes[currentNodeId] || nodes['cadence_town']!;
  const LINEAR_NODES = ['cadence_town', 'crossroads', 'echo_woods', 'whispering_path', 'harmonic_shrine', 'silent_peak'];

  // ─── RESTORED ORIGINAL COORDINATES (WITH FIXED ECHO WOODS & PEAK) ───
  const getDisplayCoords = useCallback((nodeId: string, originalX: number, originalY: number) => {
    if (nodeId === 'cadence_town') return { x: 300, y: 250 };
    if (nodeId === 'crossroads') return { x: 420, y: 355 };
    if (nodeId === 'echo_woods') return { x: 340, y: 560 };
    if (nodeId === 'whispering_path') return { x: 540, y: 380 };
    if (nodeId === 'harmonic_shrine') return { x: 640, y: 490 };
    if (nodeId === 'silent_peak') return { x: 780, y: 220 };
    return { x: originalX, y: originalY };
  }, []);

  const handleNodeClick = (targetId: string) => {
    if (isTraveling || targetId === currentNodeId) {
      setIsSidebarOpen(true); 
      return;
    }

    const fromIndex = LINEAR_NODES.indexOf(currentNodeId);
    const toIndex = LINEAR_NODES.indexOf(targetId);

    if (fromIndex !== -1 && toIndex !== -1 && Math.abs(toIndex - fromIndex) > 1) {
      setIsTraveling(true);
      setIsSidebarOpen(false); 
      
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
          setIsSidebarOpen(true); 
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
            setIsSidebarOpen(true); 
          }
        }
      }, 450);
    } else {
      onSelectNode(targetId);
      setIsSidebarOpen(true); 
    }
  };

  const dialogues = useMemo(() => {
    if (currentNodeId === 'crossroads') {
      return [
        {
          speaker: 'Rescued Traveler',
          avatar: '🧑',
          text: 'Thank you for saving me! Those bandits were fierce.',
          choice: 'Are you hurt?',
        },
        {
          speaker: 'Rescued Traveler',
          avatar: '🧑',
          text: 'I am fine... but be careful on your way to Echo Village. There is a Wakwak boss wreaking havoc there!',
          choice: 'A Wakwak? We will be ready.',
        }
      ];
    }
    
    if (currentNodeId === 'whispering_path') {
      return [
        {
          speaker: 'Wandering Merchant',
          avatar: '🧕',
          text: 'You head toward the Harmonic Shrine? I would reconsider.',
          choice: 'Why? What is there?',
        },
        {
          speaker: 'Wandering Merchant',
          avatar: '🧕',
          text: 'Rumors say the Shrine is guarded by a massive brass beast that hypnotizes travelers with deep, resonant shockwaves.',
          choice: 'Hypnosis? Thanks for the warning.',
        }
      ];
    }
    
    return [
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
    ];
  }, [currentNodeId]);

  const handleNextDialogue = () => {
    if (dialogueStep + 1 < dialogues.length) {
      setDialogueStep(dialogueStep + 1);
    } else {
      setShowDialogue(false);
      setDialogueStep(0);
    }
  };

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

  // ─── DRAWER TOUCH HANDLERS ───
  const handleDrawerTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    dragDeltaY.current = 0;
    setIsDraggingDrawer(true);
  };

  const handleDrawerTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDraggingDrawer) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const delta = clientY - dragStartY.current;
    dragDeltaY.current = delta;
    
    if (delta > 0) {
      setDragOffset(delta);
    } else {
      setDragOffset(delta * 0.15); // Slight resistance pulling up
    }
  };

  const handleDrawerTouchEnd = () => {
    if (!isDraggingDrawer) return;
    setIsDraggingDrawer(false);
    
    if (dragDeltaY.current > 60) {
      setIsSidebarOpen(false); // Slid far enough to close
    } else if (Math.abs(dragDeltaY.current) < 5) {
      setIsSidebarOpen(false); // Treat as a tap to close
    }
    
    setDragOffset(0);
    dragDeltaY.current = 0;
  };

  // ─── REFINED SCALING LOGIC ───
  const isMobile = dimensions.width < 768;
  const basePinScale = isMobile ? 0.65 : 0.9; 
  const dynamicPinScale = basePinScale * (1 / Math.pow(mapScale, 0.75));
  
  const path1Width = 12 * dynamicPinScale; 
  const path1Dash = `20,12`.split(',').map(n => parseInt(n) * dynamicPinScale).join(',');

  const memoizedNodes = useMemo(() => {
    const regionMeta: Record<string, {
      region: string;
      collection: string;
      collectionBg: string;
      collectionText: string;
    }> = {
      echo_woods:      { region: 'WESTERN VISAYAS', collection: '0 / 6 INSTRUMENTS', collectionBg: '#f8fafc', collectionText: '#38bdf8' },
      harmonic_shrine: { region: 'CENTRAL VISAYAS',  collection: '0 / 5 INSTRUMENTS', collectionBg: '#f8fafc', collectionText: '#d97706' },
      silent_peak:     { region: 'EASTERN VISAYAS',  collection: '✦ LEGENDARY HUNT',  collectionBg: '#facc15', collectionText: '#0f0c0c' },
    };

    return Object.values(nodes).map(node => {
      const isSelected = node.id === currentNodeId;
      const isBoss = node.type === 'boss';
      const isShrine = node.type === 'shrine';

      const { x: renderX, y: renderY } = getDisplayCoords(node.id, node.x, node.y);
      const ringColor = isBoss ? '#da2d46' : isShrine ? '#facc15' : '#38bdf8';

      const isLongName = node.name.length > 14;
      const mainFontSize = isLongName ? 10 : 12;
      const boxWidth = Math.max(150, node.name.length * (isLongName ? 7 : 8.5) + 20);
      const boxX = -boxWidth / 2;

      const meta = regionMeta[node.id];

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
                r="48"
                fill="none"
                stroke={ringColor}
                strokeWidth="4"
                strokeDasharray="8 8"
                className="animate-spin drop-shadow-[2px_2px_0px_#0f0c0c]"
                style={{ animationDuration: '6s' }}
              />
            )}

            {/* Comic Node Base */}
            <circle r="36" fill="#f8fafc" stroke="#0f0c0c" strokeWidth="6" />
            <circle
              r="30"
              fill={isSelected ? ringColor : '#e2e8f0'}
              stroke="#0f0c0c"
              strokeWidth="4"
              className="transition-colors group-hover:fill-white"
            />

            <text y="8" textAnchor="middle" fontSize="22" className="select-none pointer-events-none drop-shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
              {node.icon}
            </text>

            {/* ── Main Name Box (Comic Style) ── */}
            <rect x={boxX} y="44" width={boxWidth} height="24" fill="#f8fafc" stroke="#0f0c0c" strokeWidth="4" />
            <text
              y="60"
              textAnchor="middle"
              fontSize={mainFontSize}
              fontFamily="Orbitron, sans-serif"
              fontWeight="900"
              fill="#0f0c0c"
              className="select-none pointer-events-none tracking-wider"
            >
              {node.name.toUpperCase()}
            </text>

            {/* ── Region + Collection Stack ── */}
            {meta && (
              <>
                <rect x={boxX} y="68" width={boxWidth} height="16" fill={ringColor} stroke="#0f0c0c" strokeWidth="4" />
                <text
                  y="79"
                  textAnchor="middle"
                  fontSize="8"
                  fontFamily="Orbitron, sans-serif"
                  fontWeight="900"
                  fill="#0f0c0c"
                  className="select-none pointer-events-none tracking-widest"
                >
                  {meta.region}
                </text>

                <rect x={boxX} y="84" width={boxWidth} height="18" fill={meta.collectionBg} stroke="#0f0c0c" strokeWidth="4" />
                <text
                  y="96"
                  textAnchor="middle"
                  fontSize="8.5"
                  fontFamily="Orbitron, sans-serif"
                  fontWeight="900"
                  fill={meta.collectionText}
                  className="select-none pointer-events-none tracking-widest drop-shadow-[1px_1px_0px_#0f0c0c]"
                >
                  {meta.collection}
                </text>
              </>
            )}
          </g>
        </g>
      );
    });
  }, [nodes, currentNodeId, dynamicPinScale, getDisplayCoords]);

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full h-full relative font-orbitron">
      
      <DevMenu 
        onOpenStudentSession={onOpenStudentSession || (() => {})} 
        onOpenKorlongHunt={onOpenKorlongHunt || (() => {})} 
        onStartGameplay={onStartGameplay} 
      />

      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-[#0f0c0c]/80 z-40 animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* CHANGED FROM bg-white TO bg-[#151828] */}
      <div className="flex-1 flex flex-col bg-[#151828] border-b md:border-b-0 md:border-r-[4px] border-[#0f0c0c] overflow-hidden relative">
        
        {/* ─── COMIC STYLE HEADER (DARK) ─── */}
        {/* CHANGED FROM bg-[#f8fafc] TO bg-[#1e2238] */}
        <div className={`bg-[#1e2238] px-3 py-2 sm:px-4 sm:py-3 border-b-[4px] border-[#0f0c0c] shadow-[0_4px_0_0_#0f0c0c] flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 z-40 relative shrink-0 transition-all duration-500 ease-out transform ${mounted ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
          <div className="absolute inset-0 opacity-[0.2]" style={{ backgroundImage: 'radial-gradient(#0f0c0c 2px, transparent 2px)', backgroundSize: '12px 12px' }} />
          
          <div className="relative z-10">
            {/* CHANGED text-[#0f0c0c] TO text-white */}
            <h2 className="font-orbitron font-black text-sm sm:text-xl text-white uppercase tracking-wider leading-none">
              MAP OF THE SILENT VALLEY
            </h2>
            {/* CHANGED text-slate-700 TO text-slate-300 */}
            <p className="text-[9px] sm:text-xs text-slate-300 font-bold mt-1">
              Click nodes to travel, converse with NPCs, or trigger encounters
            </p>
          </div>
          <div className="relative z-10 flex items-center gap-2 self-start sm:self-auto mt-1 sm:mt-0">
            <span className="px-3 py-1 sm:py-1.5 bg-[#38bdf8] text-[#0f0c0c] font-black text-[9px] sm:text-xs uppercase -skew-x-6 border-[3px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c]">
              REGION 1 OF 4
            </span>
          </div>
        </div>

        {/* ─── MAP CONTAINER ─── */}
        <div ref={mapContainerRef} className={`flex-1 w-full h-full relative bg-[#2a2d43] overflow-hidden transition-opacity duration-700 ease-in-out delay-100 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          
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
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden will-change-transform">
              <img
                src={visayasMap}
                alt="Visayas Map Background"
                className="w-full h-full object-cover"
                style={{
                  opacity: 0.95,
                  mixBlendMode: 'normal',
                }}
              />
              <div 
                className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'radial-gradient(#0f0c0c 2.5px, transparent 2.5px)', backgroundSize: '24px 24px' }}
              />
            </div>

            <svg 
              className="w-full h-full absolute inset-0 z-10 pointer-events-none drop-shadow-[4px_4px_0px_rgba(0,0,0,0.5)]" 
              viewBox="0 0 1000 650"
              preserveAspectRatio="xMidYMid slice"
            >
              {/* ─── NEW PATH ALIGNED TO YOUR EXACT COORDINATES ─── */}
              <path 
                d="M 300,250 C 340,290 380,320 420,355 C 440,380 380,480 340,560 C 380,580 480,440 540,380 C 570,350 610,450 640,490 C 680,530 750,320 780,220"
                fill="none" 
                stroke="#0f0c0c" 
                strokeWidth={path1Width + 4} 
                strokeLinecap="round"
                className="opacity-50"
              />
              <path 
                d="M 300,250 C 340,290 380,320 420,355 C 440,380 380,480 340,560 C 380,580 480,440 540,380 C 570,350 610,450 640,490 C 680,530 750,320 780,220"
                fill="none" 
                stroke="#ffffff" 
                strokeWidth={path1Width} 
                strokeDasharray={path1Dash} 
                strokeLinecap="round"
              />

              {memoizedNodes}

              {(() => {
                const currentRenderCoords = getDisplayCoords(currentNode.id, currentNode.x, currentNode.y);
                const displayPos = avatarPos || { x: currentRenderCoords.x, y: currentRenderCoords.y };
                
                // ─── RESPONSIVE AVATAR TOOLTIP FIX ───
                const labelText = isTraveling ? 'TRAVELING' : 'PARTY HERE';
                const boxW = Math.max(50, (labelText.length * 5) + 8); 

                return (
                  <g 
                    transform={`translate(${displayPos.x}, ${displayPos.y - (50 * dynamicPinScale)}) scale(${dynamicPinScale})`}
                    className="transition-all duration-450 ease-in-out pointer-events-none"
                  >
                    <path 
                      d={`M-${boxW},-50 L${boxW},-50 L${boxW},-20 L10,-20 L0,-5 L-10,-20 L-${boxW},-20 Z`} 
                      fill="#facc15" 
                      stroke="#0f0c0c" 
                      strokeWidth="4" 
                    />
                    <text 
                      y="-31" 
                      textAnchor="middle" 
                      fontSize="12" 
                      fontFamily="Orbitron, sans-serif" 
                      fontWeight="900" 
                      fill="#0f0c0c"
                    >
                      {labelText}
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* ─── COMIC TOP RIGHT HUD (DARK) ─── */}
          <div className={`absolute top-2 right-2 sm:top-3 sm:right-3 z-30 p-1 sm:p-2 flex flex-col items-end gap-2 pointer-events-none w-full max-w-[150px] sm:max-w-[220px] md:max-w-[260px] transition-all duration-500 ease-out delay-200 transform ${mounted ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0'}`}>
            {/* CHANGED bg-white TO bg-[#1e2238] */}
            <div className="bg-[#1e2238] border-[3px] sm:border-[4px] border-[#0f0c0c] p-2 sm:p-3 shadow-[4px_4px_0px_0px_#0f0c0c] sm:shadow-[6px_6px_0px_0px_#0f0c0c] -skew-x-2 pointer-events-auto w-full relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(#0f0c0c 2px, transparent 2px)', backgroundSize: '8px 8px' }} />
              
              <div className="flex items-start justify-between gap-1.5 sm:gap-2 skew-x-2 relative z-10">
                <div className="text-left flex-1">
                  {/* CHANGED text-[#0f0c0c] TO text-white */}
                  <h1 className="font-orbitron text-[10px] sm:text-sm md:text-lg font-black uppercase text-white leading-none drop-shadow-[2px_2px_0px_#0f0c0c]">
                    VISAYAS ARC
                  </h1>
                  <div className="inline-block bg-[#facc15] border-[2px] border-[#0f0c0c] px-1.5 sm:px-2 py-0.5 mt-1.5 -skew-x-6">
                    <p className="font-space-mono text-[6px] sm:text-[8px] md:text-[10px] uppercase font-black text-[#0f0c0c] skew-x-6 tracking-widest leading-none">
                      APPRENTICE
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 font-orbitron font-black text-[9px] sm:text-xs md:text-sm bg-[#da2d46] border-[2px] sm:border-[3px] border-[#0f0c0c] px-1.5 sm:px-2 shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6 text-white">
                    <Flame size={isMobile ? 10 : 14} fill="currentColor" className="skew-x-6" />
                    <span className="skew-x-6">1</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 sm:mt-3 skew-x-2 relative z-10">
                {/* CHANGED text-[#0f0c0c] TO text-white */}
                <div className="flex justify-between mb-1 font-space-mono text-[6px] sm:text-[8px] md:text-[10px] font-black text-white uppercase drop-shadow-[1px_1px_0px_#0f0c0c]">
                  <span>LVL 1</span>
                  <span>0 / 100 XP</span>
                </div>
                {/* CHANGED bg-slate-200 TO bg-[#0f0c0c] */}
                <div className="h-2 sm:h-2.5 md:h-3 w-full border-[2px] sm:border-[3px] border-[#0f0c0c] bg-[#0f0c0c] relative skew-x-6">
                  <div className="h-full bg-[#38bdf8] border-r-[2px] sm:border-r-[3px] border-[#0f0c0c] w-[15%]" />
                </div>
              </div>
            </div>

            <div className="flex gap-1.5 sm:gap-2 pointer-events-auto w-full justify-end mt-1">
              {/* HUD Buttons CHANGED TO DARK BLUE (bg-[#2a2d43] text-white) */}
              <button
                onClick={onOpenLocationServices}
                className="flex-1 py-1.5 sm:py-2 bg-[#2a2d43] border-[3px] border-[#0f0c0c] flex flex-col items-center justify-center gap-1 shadow-[4px_4px_0px_0px_#0f0c0c] -skew-x-6 hover:bg-[#38bdf8] hover:text-[#0f0c0c] transition-all group active:translate-y-1 active:translate-x-1 active:shadow-none text-white"
              >
                <Map size={isMobile ? 12 : 16} className="skew-x-6 text-white group-hover:text-[#0f0c0c]" />
                <span className="font-space-mono uppercase font-black text-[6px] sm:text-[8px] md:text-[9px] skew-x-6 text-white group-hover:text-[#0f0c0c]">Radar</span>
              </button>
              <button
                onClick={onOpenBadges}
                className="flex-1 py-1.5 sm:py-2 bg-[#2a2d43] border-[3px] border-[#0f0c0c] flex flex-col items-center justify-center gap-1 shadow-[4px_4px_0px_0px_#0f0c0c] -skew-x-6 hover:bg-[#da2d46] hover:text-white transition-all group active:translate-y-1 active:translate-x-1 active:shadow-none text-white"
              >
                <ShieldAlert size={isMobile ? 12 : 16} className="skew-x-6 text-white group-hover:text-white" />
                <span className="font-space-mono uppercase font-black text-[6px] sm:text-[8px] md:text-[9px] skew-x-6 text-white group-hover:text-white">Badges</span>
              </button>
              <button
                onClick={onOpenRanks}
                className="flex-1 py-1.5 sm:py-2 bg-[#2a2d43] border-[3px] border-[#0f0c0c] flex flex-col items-center justify-center gap-1 shadow-[4px_4px_0px_0px_#0f0c0c] -skew-x-6 hover:bg-[#facc15] hover:text-[#0f0c0c] transition-all group active:translate-y-1 active:translate-x-1 active:shadow-none text-white"
              >
                <Flame size={isMobile ? 12 : 16} className="skew-x-6 text-white group-hover:text-[#0f0c0c]" />
                <span className="font-space-mono uppercase font-black text-[6px] sm:text-[8px] md:text-[9px] skew-x-6 text-white group-hover:text-[#0f0c0c]">Ranks</span>
              </button>
            </div>
          </div>

          {/* ─── ANIMATED SCAN BUTTON ─── */}
          <div className={`absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 w-[85%] max-w-[240px] sm:max-w-[320px] px-2 sm:px-4 pointer-events-none transition-all duration-500 ease-out delay-300 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            <button
              onClick={onOpenScanner}
              className="w-full flex items-center justify-center gap-2 sm:gap-3 py-2 sm:py-3.5 md:py-4 bg-[#da2d46] border-[4px] sm:border-[5px] border-[#0f0c0c] text-white shadow-[6px_6px_0px_0px_#0f0c0c] sm:shadow-[8px_8px_0px_0px_#0f0c0c] hover:bg-[#ff3b56] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all -skew-x-6 pointer-events-auto group"
            >
              <Camera className="skew-x-6 font-black w-4 h-4 sm:w-6 sm:h-6 fill-current" />
              <span className="font-orbitron font-black text-xs sm:text-sm md:text-lg tracking-widest uppercase skew-x-6 drop-shadow-[2px_2px_0px_#0f0c0c]">
                SCAN INSTRUMENT
              </span>
            </button>
          </div>

          <button
            onClick={() => setIsSidebarOpen(true)}
            className={`
              md:hidden absolute right-0 bottom-20 z-30
              bg-[#facc15] text-[#0f0c0c] py-2 px-2.5 pl-3.5 rounded-l-none border-y-[4px] border-l-[4px] border-[#0f0c0c] shadow-[-6px_6px_0px_0px_#0f0c0c]
              transition-all duration-300 ease-in-out hover:bg-[#ffdf3d] active:translate-y-1 active:shadow-[0px_0px_0px_0px_#0f0c0c]
              flex items-center gap-1.5 cursor-pointer
              ${isSidebarOpen ? 'translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}
            `}
          >
            <ChevronUp size={18} className="font-black -rotate-90" />
            <span className="font-orbitron font-black text-[11px] tracking-widest uppercase">
              INFO
            </span>
          </button>
        </div>
      </div>

      {/* ─── COMIC RIGHT SIDEBAR (DARK) ─── */}
      <aside 
        className={`
          fixed md:relative inset-x-0 bottom-0 md:bottom-auto z-50 md:z-0
          w-full md:w-[340px] xl:w-[400px] max-h-[85vh] md:max-h-none
          flex flex-col gap-3 bg-[#151828] p-4 md:p-5 border-t-[4px] md:border-t-0 md:border-l-[4px] border-[#0f0c0c]
          overflow-y-auto md:overflow-hidden select-none shrink-0 md:shrink
          transition-all duration-500 ease-out shadow-[0px_-10px_20px_rgba(0,0,0,0.3)] md:shadow-none
          ${isMobile 
            ? (isSidebarOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0') 
            : (mounted ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0')}
        `}
        style={{
          ...(isMobile && isSidebarOpen && {
            transform: `translate3d(0, ${isDraggingDrawer ? dragOffset : 0}px, 0)`,
            transition: isDraggingDrawer ? 'none' : 'transform 0.25s ease-out, opacity 0.25s ease-out',
          })
        }}
      >
        
        <div className="absolute inset-0 opacity-[0.2]" style={{ backgroundImage: 'radial-gradient(#0f0c0c 2px, transparent 2px)', backgroundSize: '12px 12px' }} />

        {/* ─── DRAGGABLE HANDLE ─── */}
        <div 
          className="md:hidden w-full flex items-center justify-center pb-4 pt-1 cursor-grab active:cursor-grabbing group relative z-10 touch-none" 
          onTouchStart={handleDrawerTouchStart}
          onTouchMove={handleDrawerTouchMove}
          onTouchEnd={handleDrawerTouchEnd}
          onMouseDown={handleDrawerTouchStart}
          onMouseMove={handleDrawerTouchMove}
          onMouseUp={handleDrawerTouchEnd}
          onMouseLeave={handleDrawerTouchEnd}
        >
          <div className="w-14 h-2 bg-[#0f0c0c] rounded-full group-hover:bg-slate-700 transition-colors" />
        </div>

        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden absolute top-4 right-4 text-white hover:text-[#da2d46] transition-colors z-10"
        >
          <X size={28} className="font-black" />
        </button>

        {/* CHANGED bg-white TO bg-[#1e2238] */}
        <div className="bg-[#1e2238] border-[4px] border-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] p-4 flex flex-col gap-3 shrink-0 md:flex-1 md:justify-between md:min-h-0 md:overflow-hidden relative z-10">
          <div className="pr-6 md:pr-0">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-1 bg-[#38bdf8] text-[#0f0c0c] border-[3px] border-[#0f0c0c] font-orbitron font-black text-[10px] sm:text-xs uppercase -skew-x-6 shadow-[3px_3px_0px_0px_#0f0c0c]">
                {currentNode.type.toUpperCase()} NODE
              </span>
              <span className="text-2xl leading-none hidden md:block drop-shadow-[2px_2px_0px_#0f0c0c]">{currentNode.icon}</span>
            </div>

            {/* CHANGED text-[#0f0c0c] TO text-white */}
            <h3 className="font-orbitron font-black text-xl sm:text-xl xl:text-2xl text-white tracking-wider leading-tight line-clamp-2 mt-2">
              {currentNode.name}
            </h3>
            {/* CHANGED text-slate-700 TO text-slate-300, border-[#0f0c0c] TO border-[#38bdf8] */}
            <p className="text-xs sm:text-sm text-slate-300 font-bold mt-2 leading-relaxed line-clamp-3 border-l-[4px] border-[#38bdf8] pl-3">
              {currentNode.desc}
            </p>
          </div>

            {/* CHANGED bg-[#facc15] TO bg-[#0f0c0c] */}
          <div className="bg-[#0f0c0c] p-3 border-[4px] border-[#0f0c0c] flex flex-col gap-1 shrink-0 my-2 md:my-0 shadow-[4px_4px_0px_0px_#0f0c0c] -skew-x-2">
            <span className="text-[10px] sm:text-xs font-orbitron font-black uppercase text-[#facc15] tracking-wider skew-x-2">
              📍 REGIONAL REWARDS
            </span>
            <span className="text-xs sm:text-sm text-white font-black truncate skew-x-2">
              {currentNode.rewards}
            </span>
          </div>

          <div className="flex flex-col gap-3 pt-2 shrink-0">
            {currentNode.type === 'town' ? (
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={() => {
                    setDialogueStep(0);
                    setShowDialogue(true);
                    if (isMobile) setIsSidebarOpen(false);
                  }}
                  className="w-full py-3 bg-[#facc15] text-[#0f0c0c] border-[4px] border-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-[#ffdf3d] transition-all flex items-center justify-center gap-2 active:translate-y-[4px] active:translate-x-[4px] active:shadow-none"
                >
                  <MessageSquare className="w-5 h-5 fill-current shrink-0 skew-x-6" />
                  <span className="truncate skew-x-6">TALK TO NPC</span>
                </button>

                {currentNodeId === 'cadence_town' && (
                  <button
                    onClick={() => {
                      if (onOpenShop) onOpenShop();
                      if (isMobile) setIsSidebarOpen(false);
                    }}
                    className="w-full py-2.5 sm:py-2 xl:py-2.5 bg-[#f97316] text-white border-[3px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-xs xl:text-sm uppercase -skew-x-6 hover:bg-[#fb923c] transition-all flex items-center justify-center gap-1.5 sm:gap-2 active:translate-y-0.5 active:shadow-none animate-pulse"
                  >
                    <span className="truncate font-black tracking-wider">SHOP</span>
                  </button>
                )}
              </div>
            ) : currentNode.completed ? (
              <div className="flex flex-col gap-2 w-full">
                {currentNodeId === 'crossroads' && (
                  <button
                    onClick={() => {
                      setDialogueStep(0);
                      setShowDialogue(true);
                      if (isMobile) setIsSidebarOpen(false);
                    }}
                    className="w-full py-2.5 sm:py-2 xl:py-2.5 bg-[#facc15] text-[#0f0c0c] border-[3px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-xs xl:text-sm uppercase -skew-x-6 hover:bg-[#ffdf3d] transition-all flex items-center justify-center gap-1.5 sm:gap-2 active:translate-y-0.5 active:shadow-none"
                  >
                    <MessageSquare className="w-4 h-4 sm:w-3.5 sm:h-3.5 fill-current shrink-0" />
                    <span className="truncate">TALK TO RESCUED NPC</span>
                  </button>
                )}
                <button
                  disabled
                  className="w-full py-3 bg-gray-500 text-white border-[4px] border-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
                >
                  <span className="truncate skew-x-6 drop-shadow-[2px_2px_0px_#0f0c0c]">AREA CLEARED</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (currentNode.enemyIds) onStartBattle(currentNode.enemyIds[0], currentNode.enemyIds);
                  else if (currentNode.enemyId) onStartBattle(currentNode.enemyId);
                }}
                className="w-full py-3 sm:py-4 bg-[#da2d46] text-white border-[4px] border-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] font-orbitron font-black text-sm sm:text-base uppercase -skew-x-6 hover:bg-[#ff3b56] transition-all flex items-center justify-center gap-2 active:translate-y-[4px] active:translate-x-[4px] active:shadow-none"
              >
                <Play className="w-5 h-5 fill-current shrink-0 skew-x-6" />
                <span className="truncate skew-x-6 drop-shadow-[2px_2px_0px_#0f0c0c]">BATTLE {currentNode.name.split(' ')[0]}</span>
              </button>
            )}

            <button
              onClick={onOpenQuests}
              className="w-full py-2.5 bg-[#38bdf8] text-[#0f0c0c] border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-[#7dd3fc] transition-all flex items-center justify-center gap-2 active:translate-y-[4px] active:translate-x-[4px] active:shadow-none mt-1"
            >
              <Compass className="w-4 h-4 shrink-0 skew-x-6" />
              <span className="truncate skew-x-6">OPEN QUEST JOURNAL</span>
            </button>
          </div>
        </div>

        {/* CHANGED bg-white TO bg-[#1e2238] */}
        <div className="bg-[#1e2238] border-[4px] border-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] p-4 flex flex-col gap-3 shrink-0 mb-4 md:mb-0 relative z-10">
          <div className="absolute -top-4 left-4 bg-[#facc15] px-3 py-1 border-[3px] border-[#0f0c0c] -skew-x-6 shadow-[3px_3px_0px_0px_#0f0c0c]">
             <h4 className="font-orbitron font-black text-[10px] sm:text-xs uppercase tracking-wider text-[#0f0c0c] skew-x-6 flex items-center gap-1.5">
               <ShieldAlert size={14} className="fill-[#0f0c0c] text-[#facc15]"/> WEAKNESS MATRIX
             </h4>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[9px] sm:text-xs font-orbitron font-black pt-4 pb-1">
            <span className="px-2 py-1 bg-[#da2d46] text-white border-[2px] border-[#0f0c0c] -skew-x-6 shadow-[2px_2px_0px_0px_#0f0c0c]">STRING</span>
            {/* CHANGED text-[#0f0c0c] TO text-white */}
            <span className="text-white font-black drop-shadow-[1px_1px_0px_#0f0c0c]">➔</span>
            <span className="px-2 py-1 bg-[#facc15] text-[#0f0c0c] border-[2px] border-[#0f0c0c] -skew-x-6 shadow-[2px_2px_0px_0px_#0f0c0c]">PERC</span>
            <span className="text-white font-black drop-shadow-[1px_1px_0px_#0f0c0c]">➔</span>
            <span className="px-2 py-1 bg-[#f97316] text-white border-[2px] border-[#0f0c0c] -skew-x-6 shadow-[2px_2px_0px_0px_#0f0c0c]">BRASS</span>
            <span className="text-white font-black drop-shadow-[1px_1px_0px_#0f0c0c]">➔</span>
            <span className="px-2 py-1 bg-[#a855f7] text-white border-[2px] border-[#0f0c0c] -skew-x-6 shadow-[2px_2px_0px_0px_#0f0c0c]">SYNTH</span>
            <span className="text-white font-black drop-shadow-[1px_1px_0px_#0f0c0c]">➔</span>
            <span className="px-2 py-1 bg-[#4ade80] text-[#0f0c0c] border-[2px] border-[#0f0c0c] -skew-x-6 shadow-[2px_2px_0px_0px_#0f0c0c]">WOOD</span>
          </div>

          {/* CHANGED bg-slate-100 TO bg-[#0f0c0c], text-[#0f0c0c] TO text-slate-300 */}
          <p className="text-[10px] sm:text-xs text-slate-300 font-bold leading-tight bg-[#0f0c0c] p-2.5 border-[2px] border-[#0f0c0c]">
            Super Effective attacks deal <strong className="text-[#da2d46] font-black">2.0x Damage</strong> and double Stagger buildup!
          </p>
        </div>
      </aside>

      {/* ─── COMIC DIALOGUE MODAL (DARK) ─── */}
      {showDialogue && (
        <div className="fixed inset-0 z-[60] bg-[#0f0c0c]/80 backdrop-blur-sm flex items-center justify-center p-4">
          {/* CHANGED bg-white TO bg-[#1e2238] */}
          <div className="bg-[#1e2238] border-[5px] border-[#0f0c0c] shadow-[12px_12px_0px_0px_#0f0c0c] max-w-2xl w-full p-6 sm:p-8 flex flex-col sm:flex-row gap-5 items-center sm:items-start -skew-x-2 animate-in fade-in zoom-in-95 duration-200">
            {/* CHANGED bg-[#f8fafc] TO bg-[#0f0c0c] */}
            <div className="text-5xl sm:text-6xl bg-[#0f0c0c] p-4 sm:p-5 border-[4px] border-[#facc15] shadow-[6px_6px_0px_0px_#facc15] flex items-center justify-center shrink-0">
              {dialogues[dialogueStep]?.avatar}
            </div>

            <div className="flex-1 flex flex-col gap-3 sm:gap-4 text-center sm:text-left w-full skew-x-2">
              <div className="flex flex-col sm:flex-row items-center justify-between border-b-[4px] border-[#0f0c0c] pb-3 gap-2 sm:gap-0">
                <span className="font-orbitron font-black text-lg sm:text-xl text-[#0f0c0c] bg-[#facc15] px-3 py-1 border-[3px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] -skew-x-3">
                  {dialogues[dialogueStep]?.speaker}
                </span>
                <span className="text-[10px] sm:text-xs font-orbitron text-slate-400 font-black">
                  STEP {dialogueStep + 1}/{dialogues.length}
                </span>
              </div>

              {/* CHANGED text-[#0f0c0c] TO text-white */}
              <p className="text-base sm:text-xl text-white font-black leading-relaxed my-2">
                "{dialogues[dialogueStep]?.text}"
              </p>

              <div className="pt-2 sm:pt-4">
                <button
                  onClick={handleNextDialogue}
                  className="w-full py-3 sm:py-4 bg-[#4ade80] text-[#0f0c0c] border-[4px] border-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] font-orbitron font-black text-sm sm:text-base uppercase -skew-x-3 hover:bg-[#6bee9c] transition-all active:translate-y-[4px] active:translate-x-[4px] active:shadow-none"
                >
                  <span className="skew-x-3 drop-shadow-[1px_1px_0px_rgba(0,0,0,0.2)]">▶ {dialogues[dialogueStep]?.choice}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}