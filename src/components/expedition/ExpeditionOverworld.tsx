import { useState, useMemo, useRef, useEffect, useCallback, type ComponentType, type SVGProps } from 'react';
import {
  Camera, ChevronUp, Close, Compass, Fire, Home, Map, MessageText, Shield, Skull, Sparkles, Store, Sword, Trophy, User,
} from 'pixelarticons/react';
import { type MapNode, type ExpeditionQuest } from '../../types/expedition';
import visayasMap from '../../assets/png/visayas_map.png?v=2';
import corruptedVisayasMap from '../../assets/png/corrupted_visayas_map.png?v=2';
import { DevMenu } from '../DevMenu';
import { playUiSound } from '../../hooks/useUiSound';
import { useProgress } from '../../context/ProgressProvider';
import { PixelBar, PixelButton, PixelChip, PixelIconButton, PixelPanel, SectionLabel } from '../ui';

import bakunawa_prev from '../../assets/png/bakunawa_prev.png?v=2';
import wakwak_prev from '../../assets/png/wakwak_prev.png?v=2';
import bandit_prev from '../../assets/png/bandit_prev.png?v=2';
import town_prev from '../../assets/png/town_prev.png?v=2';
import whisper_prev from '../../assets/png/whisper_prev.png?v=2';
import santelmo_prev from '../../assets/png/santelmo_prev.png?v=2';

import cloud_one from '../../assets/png/cloud_one.png?v=2';
import cloud_two from '../../assets/png/cloud_two.png?v=2';
import cloud_three from '../../assets/png/cloud_three.png?v=2';
import cloud_four from '../../assets/png/cloud_four.png?v=2';

const NODE_TYPE_ICON: Record<MapNode['type'], ComponentType<SVGProps<SVGSVGElement>>> = {
  town: Home,
  battle: Sword,
  boss: Skull,
  shrine: Sparkles,
};

const XP_FOR_NEXT_LEVEL = (level: number) => level === 1 ? 100 : level === 2 ? 250 : level === 3 ? 500 : 900;
const LEVEL_TITLE = (level: number) =>
  level === 1 ? 'Apprentice'
    : level === 2 ? 'Village Musician'
      : level === 3 ? 'Cultural Keeper'
        : level === 4 ? 'Regional Expert'
          : 'Master Instrumentalist';

/** Stepped octagon: a pixel-art "circle" for map pins. */
const pixelDisc = (r: number, step: number) =>
  `${-r + step},${-r} ${r - step},${-r} ${r},${-r + step} ${r},${r - step} ${r - step},${r} ${-r + step},${r} ${-r},${r - step} ${-r},${-r + step}`;

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
  onNodeComplete?: (nodeId: string) => void;
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
  onStartGameplay,
  onNodeComplete
}: ExpeditionOverworldProps) {
  const [showDialogue, setShowDialogue] = useState(false);
  const [dialogueStep, setDialogueStep] = useState(0);
  const [avatarPos, setAvatarPos] = useState<{ x: number; y: number } | null>(null);
  const [isTraveling, setIsTraveling] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const playSound = playUiSound;
  const { progress } = useProgress();

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

  // A node is discovered if the previous node in the linear path is completed,
  // making it playable and clearing the fog. Town is always discovered.
  const discoveredNodeIds = useMemo(() => {
    const discovered = new Set<string>(['cadence_town']);
    const forceUnlock = localStorage.getItem('echoes_dev_force_unlock') === '1';

    for (let i = 1; i < LINEAR_NODES.length; i++) {
      const prevId = LINEAR_NODES[i - 1];
      if (forceUnlock || prevId === 'cadence_town' || nodes[prevId]?.completed) {
        discovered.add(LINEAR_NODES[i]);
      }
    }
    return discovered;
  }, [nodes]);

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
    playSound('node_select');
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
          text: 'Thank you! Those Bandits were using dissonant instruments to stun their victims — I have never seen anything like it.',
          choice: 'Are you hurt?',
        },
        {
          speaker: 'Rescued Traveler',
          avatar: '🧑',
          text: 'Please be careful on your way to Echo Village. A Wakwak boss is nesting there — its sonic screech can disorient an entire party.',
          choice: 'A Wakwak? We will be ready.',
        }
      ];
    }
    
    if (currentNodeId === 'whispering_path') {
      return [
        {
          speaker: 'Wandering Merchant',
          avatar: '🧕',
          text: 'You are heading toward Echo Village? You are brave — or foolish. The Wakwak there has been attuning corrupted instruments to amplify its screech.',
          choice: 'What do you know about it?',
        },
        {
          speaker: 'Wandering Merchant',
          avatar: '🧕',
          text: 'Weaken it in battle first — get its HP below 35% — then use your ATTUNE command to capture it. That is how Conductors seal instruments.',
          choice: 'Thanks for the tip!',
        }
      ];
    }
    
    return [
      {
        speaker: 'Elder Cadence',
        avatar: '👴',
        text: 'Welcome, brave Conductors. The Great Dissonance has corrupted the traditional instruments of the Visayas — you must restore harmony.',
        choice: 'We are ready, Elder.',
      },
      {
        speaker: 'Elder Cadence',
        avatar: '👴',
        text: 'Scan instruments using the AI Scanner to capture them to your Dex. In battle, weaken enemies then use ATTUNE to seal their instrument.',
        choice: 'How do we get stronger?',
      },
      {
        speaker: 'Elder Cadence',
        avatar: '👴',
        text: 'Defeat enemies to earn Harmonic Shards — spend them at Maria\'s Shop in Cadence Town. The road to Echo Village is long. Stay in tune.',
        choice: 'To battle!',
      },
    ];
  }, [currentNodeId]);

  const handleNextDialogue = () => {
    playSound('dialogue_next');
    if (dialogueStep + 1 < dialogues.length) {
      setDialogueStep(dialogueStep + 1);
    } else {
      setShowDialogue(false);
      setDialogueStep(0);
      if (onNodeComplete) {
        onNodeComplete(currentNodeId);
      }
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
      playSound('ui_back');
      setIsSidebarOpen(false); // Slid far enough to close
    } else if (Math.abs(dragDeltaY.current) < 5) {
      playSound('ui_back');
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
    const regionMeta: Record<string, { region: string; collection: string }> = {
      echo_woods:      { region: 'Western Visayas', collection: '0 / 6 instruments' },
      harmonic_shrine: { region: 'Central Visayas', collection: '0 / 5 instruments' },
      silent_peak:     { region: 'Eastern Visayas', collection: 'Legendary hunt' },
    };

    const INK = 'var(--color-ink)';

    return Object.values(nodes).map(node => {
      const isSelected = node.id === currentNodeId;
      const isBoss = node.type === 'boss';
      const Icon = NODE_TYPE_ICON[node.type];

      const { x: renderX, y: renderY } = getDisplayCoords(node.id, node.x, node.y);

      const labelWidth = Math.max(112, Math.round(node.name.length * 9.5) + 28);
      const labelX = -labelWidth / 2;
      const meta = regionMeta[node.id];
      const isDiscovered = discoveredNodeIds.has(node.id);

      const discFill = isSelected ? 'var(--color-gold-500)' : isBoss ? 'var(--color-hp)' : 'var(--color-plum-800)';
      const discHi = isSelected ? 'var(--color-gold-300)' : isBoss ? '#ef7a67' : 'var(--color-plum-600)';
      const iconColor = isSelected ? 'var(--color-ink)' : 'var(--color-parchment-100)';

      return (
        <g
          key={node.id}
          transform={`translate(${renderX}, ${renderY}) scale(${dynamicPinScale})`}
          className={`cursor-pointer group pointer-events-auto transition-opacity duration-500 ${isDiscovered ? '' : 'opacity-40 grayscale pointer-events-none'}`}
          onClick={() => isDiscovered && handleNodeClick(node.id)}
          shapeRendering="crispEdges"
        >
          <g className="transition-transform duration-100 group-hover:-translate-y-1">
            {isSelected && (
              <polygon points={pixelDisc(46, 12)} fill="none" stroke="var(--color-gold-300)" strokeWidth="4" />
            )}

            <polygon points={pixelDisc(34, 10)} fill={INK} />
            <polygon points={pixelDisc(28, 8)} fill={discFill} />
            <polygon points="-20,-28 20,-28 24,-24 -24,-24" fill={discHi} />
            <Icon x={-16} y={-16} width={32} height={32} style={{ color: iconColor }} aria-hidden />

            {isDiscovered && (
              <g className="select-none pointer-events-none" fontFamily="'Pixelify Sans', monospace">
                <rect x={labelX - 3} y="41" width={labelWidth + 6} height="30" fill={INK} />
                <rect x={labelX} y="44" width={labelWidth} height="24" fill="var(--color-parchment-100)" />
                <text y="61" textAnchor="middle" fontSize="16" fontWeight="600" fill={INK}>
                  {node.name}
                </text>

                {meta && (
                  <>
                    <rect x={labelX - 3} y="71" width={labelWidth + 6} height="36" fill={INK} />
                    <rect x={labelX} y="71" width={labelWidth} height="33" fill="var(--color-plum-800)" />
                    <text y="85" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--color-parchment-300)">
                      {meta.region}
                    </text>
                    <text y="99" textAnchor="middle" fontSize="12" fontWeight="500" fill="var(--color-gold-300)">
                      {meta.collection}
                    </text>
                  </>
                )}
              </g>
            )}
          </g>
        </g>
      );
    });
  }, [nodes, currentNodeId, dynamicPinScale, getDisplayCoords, discoveredNodeIds]);

  // ─── DYNAMIC FOG OF WAR MASK ───
  const dynamicMask = useMemo(() => {
    // If all battle/boss/shrine nodes are completed (or dev unlocked), remove the mask to reveal the full clean map
    const allBattlesCompleted = Object.values(nodes).every(n => n.type === 'town' || n.completed);
    const forceUnlock = localStorage.getItem('echoes_dev_force_unlock') === '1';
    if (allBattlesCompleted || forceUnlock) {
      return 'linear-gradient(rgba(0,0,0,1), rgba(0,0,0,1))';
    }

    // Now correctly tied to the logical clearing chain instead of just discovery
    const unlockedNodes = Object.values(nodes).filter(n => n.completed || n.id === 'cadence_town');
    if (unlockedNodes.length === 0) {
      return 'radial-gradient(circle 350px at 30% 50%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 80%)';
    }
    
    return unlockedNodes.map(node => {
      // Use getDisplayCoords to align the mask exactly with where the node is rendered
      const { x, y } = getDisplayCoords(node.id, node.x, node.y);
      const xPct = (x / 1000) * 100;
      const yPct = (y / 650) * 100;
      // Boss nodes reveal a larger area
      const radius = node.type === 'boss' ? '500px' : '350px';
      return `radial-gradient(circle ${radius} at ${xPct}% ${yPct}%, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 80%)`;
    }).join(', ');
  }, [nodes, getDisplayCoords]);

  // ─── CENTRALIZED PREVIEW DICTIONARY ───
  // Add any future images here to automatically link them to map nodes!
  const nodePreviewImages: Record<string, string> = {
    'cadence_town': town_prev,
    'crossroads': bandit_prev,
    'echo_woods': wakwak_prev,
    'echo_village': wakwak_prev,
    'harmonic_shrine': bakunawa_prev,
    'whispering_path': whisper_prev,
    'silent_peak': santelmo_prev,
  };

  const currentPreviewImg = nodePreviewImages[currentNodeId];

  const xpForNextLevel = XP_FOR_NEXT_LEVEL(progress.level);
  const currentDialogue = dialogues[dialogueStep];

  const closeSidebarOnMobile = () => { if (isMobile) setIsSidebarOpen(false); };

  // Exactly one primary action per node; everything else steps down in weight.
  const renderNodeActions = () => {
    if (currentNode.type === 'town') {
      return (
        <>
          <PixelButton
            variant="primary"
            fullWidth
            icon={<MessageText />}
            sound="npc_talk"
            onClick={() => { setDialogueStep(0); setShowDialogue(true); closeSidebarOnMobile(); }}
          >
            Talk to {dialogues[0]?.speaker ?? 'Villager'}
          </PixelButton>
          {currentNodeId === 'cadence_town' && (
            <PixelButton
              fullWidth
              icon={<Store />}
              sound="shop_open"
              onClick={() => { onOpenShop?.(); closeSidebarOnMobile(); }}
            >
              Maria's Shop
            </PixelButton>
          )}
        </>
      );
    }

    if (currentNode.completed) {
      return currentNodeId === 'crossroads' ? (
        <PixelButton
          variant="primary"
          fullWidth
          icon={<MessageText />}
          sound="npc_talk"
          onClick={() => { setDialogueStep(0); setShowDialogue(true); closeSidebarOnMobile(); }}
        >
          Talk to Rescued Traveler
        </PixelButton>
      ) : (
        <PixelButton variant="primary" fullWidth disabled icon={<Trophy />}>
          Area Cleared
        </PixelButton>
      );
    }

    const enemyId = currentNode.enemyId || currentNode.enemyIds?.[0];
    const enemyName = (enemyId || 'enemies').replace(/_/g, ' ');
    return (
      <PixelButton
        variant="primary"
        fullWidth
        icon={<Sword />}
        sound="battle_start"
        onClick={() => {
          if (currentNode.enemyIds) onStartBattle(currentNode.enemyIds[0], currentNode.enemyIds);
          else if (currentNode.enemyId) onStartBattle(currentNode.enemyId);
        }}
      >
        <span className="capitalize">Battle {enemyName}</span>
      </PixelButton>
    );
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full h-full relative">

      <DevMenu
        onOpenStudentSession={onOpenStudentSession || (() => {})}
        onOpenKorlongHunt={onOpenKorlongHunt || (() => {})}
        onStartGameplay={onStartGameplay}
      />

      {isMobile && isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-plum-950/80 z-40 px-fade-in"
          onClick={() => { playSound('ui_back'); setIsSidebarOpen(false); }}
        />
      )}

      <div className="flex-1 flex flex-col bg-plum-950 border-b-[3px] md:border-b-0 md:border-r-[3px] border-ink overflow-hidden relative">

        {/* ─── MAP HEADER ─── */}
        <div className={`bg-plum-900 px-3 py-2 sm:px-4 sm:py-3 border-b-[3px] border-ink flex items-center justify-between gap-3 z-40 relative shrink-0 transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="min-w-0">
            <h2 className="font-bold text-lg sm:text-2xl leading-none text-parchment-100 truncate">
              Map of the Silent Valley
            </h2>
            <p className="hidden sm:block text-sm text-parchment-300 mt-1">
              Select a location to travel, talk to villagers, or start a battle.
            </p>
          </div>
          <PixelChip tone="dark" icon={<Map />}>Region 1 of 4</PixelChip>
        </div>

        {/* ─── MAP CONTAINER ─── */}
        <div ref={mapContainerRef} className={`flex-1 w-full h-full relative bg-plum-900 overflow-hidden transition-opacity duration-700 ease-in-out delay-100 ${mounted ? 'opacity-100' : 'opacity-0'}`}>

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
                src={corruptedVisayasMap}
                alt="Corrupted Visayas Map Background"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: 0.95, mixBlendMode: 'normal' }}
              />
              <img
                src={visayasMap}
                alt="Visayas Map Background"
                className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out"
                style={{
                  opacity: 0.95,
                  mixBlendMode: 'normal',
                  WebkitMaskImage: dynamicMask,
                  maskImage: dynamicMask,
                  WebkitMaskComposite: 'add',
                  maskComposite: 'add'
                }}
              />
            </div>

            <svg
              className="w-full h-full absolute inset-0 z-10 pointer-events-none"
              viewBox="0 0 1000 650"
              preserveAspectRatio="xMidYMid slice"
            >
              <path
                d="M 300,250 C 340,290 380,320 420,355 C 440,380 380,480 340,560 C 380,580 480,440 540,380 C 570,350 610,450 640,490 C 680,530 750,320 780,220"
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth={path1Width + 6}
                strokeDasharray={path1Dash}
                strokeLinecap="butt"
                className="opacity-70"
              />
              <path
                d="M 300,250 C 340,290 380,320 420,355 C 440,380 380,480 340,560 C 380,580 480,440 540,380 C 570,350 610,450 640,490 C 680,530 750,320 780,220"
                fill="none"
                stroke="var(--color-parchment-100)"
                strokeWidth={path1Width}
                strokeDasharray={path1Dash}
                strokeLinecap="butt"
              />

              {memoizedNodes}

              {/* ─── FOG OF WAR CLOUDS ─── */}
              {LINEAR_NODES.map((nodeId, index) => {
                if (discoveredNodeIds.has(nodeId)) return null;

                const node = nodes[nodeId];
                const origX = node?.x || 0;
                const origY = node?.y || 0;
                const { x, y } = getDisplayCoords(nodeId, origX, origY);

                const cloudImages = [cloud_one, cloud_two, cloud_three, cloud_four];
                const cloudImg = cloudImages[index % cloudImages.length];

                return (
                  <image
                    key={`fog-cloud-${nodeId}`}
                    href={cloudImg}
                    x={x - 175}
                    y={y - 125}
                    width="350"
                    height="250"
                    className="opacity-75 pointer-events-none transition-opacity duration-1000 ease-in-out animate-cloud-drift"
                  />
                );
              })}

              {(() => {
                const currentRenderCoords = getDisplayCoords(currentNode.id, currentNode.x, currentNode.y);
                const displayPos = avatarPos || { x: currentRenderCoords.x, y: currentRenderCoords.y };

                const labelText = isTraveling ? 'Traveling' : 'Party here';
                const halfW = Math.round(labelText.length * 4.8) + 12;

                return (
                  <g
                    transform={`translate(${displayPos.x}, ${displayPos.y - (50 * dynamicPinScale)}) scale(${dynamicPinScale})`}
                    className="transition-all duration-450 ease-in-out pointer-events-none"
                    shapeRendering="crispEdges"
                  >
                    <path
                      d={`M-${halfW + 3},-55 L${halfW + 3},-55 L${halfW + 3},-19 L9,-19 L0,-7 L-9,-19 L-${halfW + 3},-19 Z`}
                      fill="var(--color-ink)"
                    />
                    <path
                      d={`M-${halfW},-52 L${halfW},-52 L${halfW},-22 L6,-22 L0,-13 L-6,-22 L-${halfW},-22 Z`}
                      fill="var(--color-gold-500)"
                    />
                    <text y="-31" textAnchor="middle" fontSize="16" fontFamily="'Pixelify Sans', monospace" fontWeight="600" fill="var(--color-ink)">
                      {labelText}
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* ─── PROGRESS HUD ─── */}
          <div className={`absolute top-2 right-2 sm:top-3 sm:right-3 z-30 flex flex-col items-stretch gap-2 w-[180px] sm:w-[240px] transition-opacity duration-300 delay-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <PixelPanel padding="sm" className="sm:p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-base sm:text-xl leading-none text-parchment-100">Visayas Arc</p>
                  <p className="mt-1 text-xs sm:text-sm leading-none text-gold-300">{LEVEL_TITLE(progress.level)}</p>
                </div>
                <PixelChip tone="dark" icon={<Fire />}>{progress.currentStreak}</PixelChip>
              </div>
              <PixelBar
                className="mt-2 sm:mt-3"
                kind="xp"
                height={8}
                value={progress.xp}
                max={xpForNextLevel}
                label={`Lvl ${progress.level}`}
                valueText={`${progress.xp} / ${xpForNextLevel} XP`}
              />
            </PixelPanel>

            <div className="flex gap-1.5 sm:gap-2 justify-end">
              <PixelIconButton className="flex-1" icon={<Map />} label="Radar" showLabel onClick={() => onOpenLocationServices?.()} />
              <PixelIconButton className="flex-1" icon={<Shield />} label="Badges" showLabel onClick={() => onOpenBadges?.()} />
              <PixelIconButton className="flex-1" icon={<Trophy />} label="Ranks" showLabel onClick={() => onOpenRanks?.()} />
            </div>
          </div>

          {/* ─── SCAN INSTRUMENT ─── */}
          <div className={`absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 transition-opacity duration-300 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <PixelButton size="lg" icon={<Camera />} sound="scan_init" onClick={() => onOpenScanner?.()}>
              Scan Instrument
            </PixelButton>
          </div>

          <PixelButton
            size="sm"
            icon={<ChevronUp className="-rotate-90" />}
            sound="drawer_open"
            onClick={() => setIsSidebarOpen(true)}
            className={`md:hidden absolute right-2 bottom-20 z-30 transition-opacity duration-200 ${isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            Info
          </PixelButton>
        </div>
      </div>

      {/* ─── LOCATION SIDEBAR ─── */}
      <aside
        className={`
          fixed md:relative inset-x-0 bottom-0 md:bottom-auto z-50 md:z-0
          w-full md:w-[340px] xl:w-[400px] h-[85vh] md:h-full
          flex flex-col gap-3 bg-plum-900 p-3 md:p-4 border-t-[3px] md:border-t-0 md:border-l-[3px] border-ink
          overflow-hidden select-none shrink-0 md:shrink
          transition-all duration-300 ease-out
          ${isMobile
            ? (isSidebarOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0')
            : (mounted ? 'opacity-100' : 'opacity-0')}
        `}
        style={{
          ...(isMobile && isSidebarOpen && {
            transform: `translate3d(0, ${isDraggingDrawer ? dragOffset : 0}px, 0)`,
            transition: isDraggingDrawer ? 'none' : 'transform 0.25s ease-out, opacity 0.25s ease-out',
          })
        }}
      >
        {/* ─── DRAGGABLE HANDLE ─── */}
        <div
          className="md:hidden w-full flex items-center justify-center pb-2 pt-1 cursor-grab active:cursor-grabbing relative z-10 touch-none shrink-0"
          onTouchStart={handleDrawerTouchStart}
          onTouchMove={handleDrawerTouchMove}
          onTouchEnd={handleDrawerTouchEnd}
          onMouseDown={handleDrawerTouchStart}
          onMouseMove={handleDrawerTouchMove}
          onMouseUp={handleDrawerTouchEnd}
          onMouseLeave={handleDrawerTouchEnd}
        >
          <div className="w-14 h-1.5 bg-plum-600" />
        </div>

        <PixelIconButton
          className="md:hidden absolute top-3 right-3 z-20 size-10"
          icon={<Close />}
          label="Close"
          sound="ui_back"
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* ─── LOCATION PANEL ─── */}
        <PixelPanel frame="wood" padding="sm" className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
          <div className="shrink-0 flex flex-col gap-2 px-1 pt-1">
            <SectionLabel tone="gold" className="flex items-center gap-2">
              {(() => { const Icon = NODE_TYPE_ICON[currentNode.type]; return <Icon className="size-4" aria-hidden />; })()}
              {currentNode.type}
            </SectionLabel>
            <h3 className="font-bold text-2xl xl:text-3xl leading-none text-parchment-100 line-clamp-2">
              {currentNode.name}
            </h3>
          </div>

          {currentPreviewImg && (
            <div className="px-frame px-frame-inset px-frame-sm flex-1 min-h-0 max-h-[160px] xl:max-h-[200px] w-full overflow-hidden">
              <img
                src={currentPreviewImg}
                alt={`${currentNode.name} preview`}
                className={`w-full h-full object-cover ${currentNodeId === 'silent_peak' ? 'object-bottom' : 'object-top'} animate-ken-burns`}
              />
            </div>
          )}

          <p className="shrink-0 px-1 text-sm xl:text-base leading-snug text-parchment-300 whitespace-pre-wrap">
            {currentNode.desc}
          </p>

          <div className="shrink-0 mt-auto flex flex-col gap-3 px-1 pb-1">
            <div className="flex flex-col gap-1">
              <SectionLabel>Rewards</SectionLabel>
              <p className="text-sm leading-snug text-parchment-100">{currentNode.rewards}</p>
            </div>

            <div className="flex flex-col gap-2">
              {renderNodeActions()}
              <PixelButton
                variant="ghost"
                size="sm"
                icon={<Compass />}
                sound="journal_open"
                onClick={onOpenQuests}
                className="self-center"
              >
                Open Quest Journal
              </PixelButton>
            </div>
          </div>
        </PixelPanel>

        {/* ─── WEAKNESS MATRIX ─── */}
        <PixelPanel padding="sm" className="shrink-0 mb-4 md:mb-0" title={<span className="px-1">Weakness Chart</span>}>
          <ol className="flex flex-wrap items-center justify-center gap-y-1.5 px-1 text-parchment-500" aria-label="Each type is strong against the next">
            {(['string', 'perc', 'brass', 'synth', 'wood'] as const).map((tone, i) => (
              <li key={tone} className="flex items-center">
                {i > 0 && <span className="px-1" aria-hidden>›</span>}
                <PixelChip tone={tone}>{tone}</PixelChip>
              </li>
            ))}
          </ol>
          <p className="mt-2 px-1 text-xs leading-snug text-parchment-300">
            Super effective attacks deal <strong className="font-semibold text-parchment-100">2× damage</strong> and double stagger buildup.
          </p>
        </PixelPanel>
      </aside>

      {/* ─── NPC DIALOGUE ─── */}
      {showDialogue && currentDialogue && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 sm:p-6">
          <div className="absolute inset-0 bg-plum-950/75 px-fade-in" />
          <PixelPanel frame="wood" padding="none" className="relative w-full max-w-2xl px-rise-in" role="dialog" aria-modal="true" aria-label={currentDialogue.speaker}>
            <div className="flex gap-4 p-4 sm:p-5">
              <div className="px-frame px-frame-inset shrink-0 size-16 sm:size-20 flex items-center justify-center text-parchment-300">
                <User className="size-10 sm:size-12" aria-hidden />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-lg sm:text-xl leading-none text-gold-300">{currentDialogue.speaker}</span>
                  <span className="text-xs leading-none text-parchment-500">{dialogueStep + 1}/{dialogues.length}</span>
                </div>
                <p className="text-base sm:text-lg leading-snug text-parchment-100">
                  {currentDialogue.text}
                </p>
              </div>
            </div>
            <div className="flex justify-end border-t-[3px] border-ink bg-plum-800 px-4 py-3">
              <PixelButton variant="primary" sound={null} onClick={handleNextDialogue}>
                {currentDialogue.choice}
              </PixelButton>
            </div>
          </PixelPanel>
        </div>
      )}
    </div>
  );
}
