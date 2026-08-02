import { useState, useRef, useEffect } from 'react';
import type { ActiveInstrumentProfile } from '../types';
import { ChevronRight } from 'lucide-react';
import { IMAGE_BASE } from '../constants';

interface DiscoveryCardProps {
  profile: ActiveInstrumentProfile;
  isNew?: boolean;
  onContinue: () => void;
  onBack: () => void;
}

export function DiscoveryCard({ profile, isNew = true, onContinue, onBack }: DiscoveryCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Add 3D rotation logic for mouse/touch
  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || !cardRef.current) return;
    const dx = clientX - dragStart.x;
    const dy = clientY - dragStart.y;
    
    // Rotate slightly on drag
    const newRotateY = Math.max(-30, Math.min(30, rotation.y + dx * 0.2));
    const newRotateX = Math.max(-20, Math.min(20, rotation.x - dy * 0.2));
    
    setRotation({ x: newRotateX, y: newRotateY });
    setDragStart({ x: clientX, y: clientY });
    
    // If dragged horizontally far enough, flip
    if (Math.abs(newRotateY) > 25) {
      setIsFlipped(newRotateY > 0);
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
    // Snap back to 0 or 180 depending on flip state
    setRotation({ x: 0, y: isFlipped ? 180 : 0 });
  };

  useEffect(() => {
    const handleMouseUp = () => handleEnd();
    const handleTouchEnd = () => handleEnd();
    
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isFlipped]);

  // Let the cinematic Korlong music continue playing on this screen!
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).korlongHuntAudio) {
      const audio = (window as any).korlongHuntAudio as HTMLAudioElement;
      
      // If the audio somehow already ended or paused, restart the intense loop
      if (audio.ended || audio.paused) {
         audio.currentTime = 20;
         audio.play().catch(() => {});
      }

      // When the song reaches the end of its natural climax, loop back to the intense drop!
      const handleEnded = () => {
         audio.currentTime = 20;
         audio.play().catch(() => {});
      };
      
      audio.addEventListener('ended', handleEnded);
      
      return () => {
        audio.removeEventListener('ended', handleEnded);
        // Audio is now strictly cleaned up by the button click handlers.
      };
    }
  }, []);

  const handleLeave = (action: () => void) => {
    if (typeof window !== 'undefined' && (window as any).korlongHuntAudio) {
      (window as any).korlongHuntAudio.pause();
      (window as any).korlongHuntAudio = null;
    }
    action();
  };

  return (
    <div className="min-h-screen bg-[#2a2d43] flex flex-col items-center justify-start p-4 pt-10 md:pt-12 relative overflow-hidden overflow-x-hidden pb-12 md:pb-16 pb-safe z-0">
      
      {/* Halftone Background Pattern */}
      <div 
        className="absolute inset-0 z-[-3] opacity-30 pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#da2d46 2px, transparent 2px)', backgroundSize: '20px 20px' }}
      />
      
      {/* Sharp Diagonal Background Cut */}
      <div className="absolute top-0 left-0 w-[120%] h-[35%] bg-[#0f0c0c] -skew-y-3 -translate-y-10 z-[-2] border-b-[8px] border-[#da2d46]" />

      <div className="w-full max-w-sm relative z-10 pb-12 flex flex-col items-center">
        
        {/* Header Bar */}
        <div className="flex items-center justify-start mb-6 w-full min-h-[32px]">
          {isNew && (
            <div className="bg-[#0f0c0c] border-[3px] border-[#da2d46] px-3 py-1 -skew-x-6 shadow-[4px_4px_0px_0px_#da2d46]">
              <span className="font-space-mono text-[9px] md:text-xs text-[#f0dde0] font-black tracking-widest uppercase skew-x-6 block">
                ACQUISITION
              </span>
            </div>
          )}
        </div>

        {/* Title */}
        <div className="text-center mb-4 md:mb-8 shrink-0">
          <h2 
            className="font-orbitron font-black text-[#e0e5ed] text-3xl md:text-4xl tracking-widest uppercase leading-none"
            style={{ textShadow: '4px 4px 0px #0f0c0c, -2px -2px 0px #da2d46' }}
          >
            {isNew ? <>NEW<br/>DISCOVERY</> : <>INSTRUMENT<br/>PROFILE</>}
          </h2>
          <div className="inline-block bg-[#0f0c0c] border-[2px] border-[#e0e5ed] px-2 py-0.5 mt-3 -skew-x-6 shadow-[2px_2px_0px_0px_#da2d46] animate-comic-pulse">
            <p className="font-space-mono text-[#e0e5ed] text-[10px] tracking-widest uppercase font-bold skew-x-6">
              [ Drag to inspect ]
            </p>
          </div>
        </div>

        {/* 3D Scene Container */}
        <div 
          className={`relative w-full max-w-[260px] sm:max-w-xs md:max-w-sm aspect-[3/4] perspective-1000 cursor-grab active:cursor-grabbing shrink ${profile.instrument.name.toLowerCase() === 'korlong' ? 'animate-card-bounce-in' : ''}`}
          onMouseDown={e => handleStart(e.clientX, e.clientY)}
          onMouseMove={e => handleMove(e.clientX, e.clientY)}
          onTouchStart={e => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={e => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
        >
          {/* The Card */}
          <div 
            ref={cardRef}
            className="w-full h-full preserve-3d transition-transform duration-300 ease-out"
            style={{ 
              transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            }}
          >
            
            {/* Front Face */}
            <div 
              className="absolute inset-0 backface-hidden bg-[#e0e5ed] border-[6px] border-[#0f0c0c] flex flex-col p-4 transition-shadow duration-200"
              style={{
                boxShadow: isDragging ? '16px 16px 0px 0px #da2d46' : '8px 8px 0px 0px #0f0c0c'
              }}
            >
              {/* Image Frame */}
              <div className="flex-1 bg-[#0f0c0c] border-[4px] border-[#0f0c0c] relative flex items-center justify-center overflow-hidden mb-4 shadow-[inset_4px_4px_0px_0px_#da2d46]">
                <img 
                  src={profile.imageBase64 ? `data:${profile.imageMimeType};base64,${profile.imageBase64}` : `${IMAGE_BASE}${profile.instrument.name.toLowerCase().replace(/ /g, '_')}.png?v=2`} 
                  alt={profile.instrument.name}
                  className="w-full h-full object-contain p-4 mix-blend-screen opacity-90 contrast-125 saturate-50"
                />
                {/* Comic Halftone Overlay over image */}
                <div 
                  className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay" 
                  style={{ backgroundImage: 'radial-gradient(#f0dde0 2px, transparent 2px)', backgroundSize: '8px 8px' }}
                />
              </div>
              
              {/* Front Label */}
              <div className="text-left border-t-[6px] border-[#0f0c0c] pt-3 flex flex-col">
                <h3 className="font-orbitron font-black text-2xl md:text-3xl text-[#0f0c0c] uppercase leading-none tracking-tighter">
                  {profile.instrument.name}
                </h3>
                <div className="bg-[#0f0c0c] px-2 py-0.5 mt-2 w-fit -skew-x-6">
                  <p className="font-space-mono text-[10px] md:text-xs text-[#da2d46] font-bold tracking-widest uppercase skew-x-6">
                    {profile.instrument.category} CLASS
                  </p>
                </div>
              </div>
            </div>

            {/* Back Face (Dossier) */}
            <div 
              className="absolute inset-0 backface-hidden bg-[#2a2d43] border-[6px] border-[#0f0c0c] flex flex-col p-5 transition-shadow duration-200"
              style={{ 
                transform: 'rotateY(180deg)',
                boxShadow: isDragging ? '-16px 16px 0px 0px #da2d46' : '-8px 8px 0px 0px #0f0c0c'
              }}
            >
              {/* Back Header Tag */}
              <div className="bg-[#da2d46] border-[4px] border-[#0f0c0c] px-3 py-2 -skew-x-2 shadow-[4px_4px_0px_0px_#0f0c0c] mb-5">
                <h3 className="font-orbitron font-black text-xl text-[#0f0c0c] uppercase skew-x-2 tracking-widest text-center">
                  {profile.instrument.name}
                </h3>
              </div>
              
              {/* Scrollable Data Container */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                
                <div className="bg-[#0f0c0c] p-3 border-[3px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#da2d46]">
                  <span className="block font-space-mono text-[9px] text-[#da2d46] font-black uppercase tracking-widest border-b-[2px] border-[#da2d46]/30 pb-1 mb-1.5">Origin</span>
                  <span className="font-orbitron font-bold text-xs text-[#e0e5ed] uppercase leading-snug">{profile.instrument.ethnoLinguisticGroup} - {profile.instrument.region}</span>
                </div>
                
                <div className="bg-[#0f0c0c] p-3 border-[3px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#da2d46]">
                  <span className="block font-space-mono text-[9px] text-[#da2d46] font-black uppercase tracking-widest border-b-[2px] border-[#da2d46]/30 pb-1 mb-1.5">Classification</span>
                  <span className="font-orbitron font-bold text-xs text-[#e0e5ed] uppercase leading-snug">{profile.instrument.hornbostelSachs}</span>
                </div>

                <div className="bg-[#e0e5ed] p-3 border-[3px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c]">
                  <span className="block font-space-mono text-[9px] text-[#0f0c0c] font-black uppercase tracking-widest border-b-[2px] border-[#0f0c0c]/30 pb-1 mb-1.5">Purpose</span>
                  <p className="font-space-mono text-xs text-[#0f0c0c] font-bold leading-relaxed">{profile.instrument.culturalPurpose}</p>
                </div>

                <div className="bg-[#e0e5ed] p-3 border-[3px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c]">
                  <span className="block font-space-mono text-[9px] text-[#0f0c0c] font-black uppercase tracking-widest border-b-[2px] border-[#0f0c0c]/30 pb-1 mb-1.5">Description</span>
                  <p className="font-space-mono text-xs text-[#0f0c0c] font-bold leading-relaxed">{profile.instrument.description}</p>
                </div>

                {profile.instrument.history && (
                  <div className="bg-[#e0e5ed] p-3 border-[3px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c]">
                    <span className="block font-space-mono text-[9px] text-[#0f0c0c] font-black uppercase tracking-widest border-b-[2px] border-[#0f0c0c]/30 pb-1 mb-1.5">History</span>
                    <p className="font-space-mono text-xs text-[#0f0c0c] font-bold leading-relaxed">{profile.instrument.history}</p>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="mt-5 md:mt-10 w-full max-w-[260px] sm:max-w-xs md:max-w-sm relative z-10 shrink-0 flex flex-col gap-4">
          <button 
            onClick={() => handleLeave(onContinue)}
            className="w-full py-4 bg-[#da2d46] border-[6px] border-[#0f0c0c] font-orbitron text-sm md:text-base font-black tracking-widest uppercase text-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0px_0px_#0f0c0c] active:translate-y-2 active:translate-x-2 active:shadow-none transition-all flex items-center justify-center gap-3 -skew-x-6"
          >
            <span className="skew-x-6">PLAY INSTRUMENT</span> <ChevronRight size={24} className="skew-x-6 stroke-[3px]" />
          </button>

          <button 
            onClick={() => handleLeave(onBack)}
            className="w-full py-4 bg-[#f0dde0] border-[6px] border-[#0f0c0c] font-orbitron text-sm md:text-base font-black tracking-widest uppercase text-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0px_0px_#0f0c0c] active:translate-y-2 active:translate-x-2 active:shadow-none transition-all flex items-center justify-center gap-3 -skew-x-6"
          >
            <span className="skew-x-6">CONTINUE ADVENTURE</span>
          </button>
        </div>

      </div>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        
        @keyframes comic-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(0.95); opacity: 0.9; }
        }
        .animate-comic-pulse { animation: comic-pulse 1.5s ease-in-out infinite; }
        
        @keyframes card-bounce-in {
          0% { transform: scale(0.3) translateY(300px) rotate(-10deg); opacity: 0; }
          50% { transform: scale(1.1) translateY(-30px) rotate(5deg); opacity: 1; }
          75% { transform: scale(0.95) translateY(10px) rotate(-2deg); }
          100% { transform: scale(1) translateY(0) rotate(0deg); }
        }
        .animate-card-bounce-in { animation: card-bounce-in 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }

        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0f0c0c; border-left: 2px solid #2a2d43; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #da2d46; border: 1px solid #0f0c0c; }
      `}</style>
    </div>
  );
}