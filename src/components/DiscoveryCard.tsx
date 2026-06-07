import React, { useState, useRef, useEffect } from 'react';
import type { ActiveInstrumentProfile } from '../types';
import { ChevronRight, ArrowLeft } from 'lucide-react';

interface DiscoveryCardProps {
  profile: ActiveInstrumentProfile;
  onContinue: () => void;
  onBack: () => void;
}

export function DiscoveryCard({ profile, onContinue, onBack }: DiscoveryCardProps) {
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

  return (
    <div className="min-h-screen bg-obsidian/95 flex flex-col items-center justify-center p-6 relative overflow-hidden backdrop-blur-md pb-12 md:pb-16 pb-safe">
      {/* Background ambient light */}
      <div className="absolute top-[-10%] left-[-25%] w-[90%] h-[60%] bg-crimson/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-25%] w-[90%] h-[60%] bg-gold/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 pb-12 flex flex-col items-center">
        {/* Header Bar with Back Button */}
        <div className="flex items-center justify-between mb-6 w-full">
          <button 
            onClick={onBack}
            className="px-3 py-1.5 rounded-lg bg-dark-slate/30 border border-pale-pink/10 hover:border-crimson/50 hover:bg-dark-slate/50 text-pale-pink hover:text-crimson transition-all duration-200 flex items-center justify-center gap-1.5 font-orbitron text-[10px] font-bold tracking-widest uppercase"
          >
            <ArrowLeft size={14} /> BACK
          </button>
          
          <div className="text-right">
            <span className="font-space-mono text-[9px] text-crimson font-black tracking-[0.2em] uppercase block">
              DISCOVERY
            </span>
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="font-orbitron font-black text-light-gray text-xl tracking-widest uppercase mb-1 glow-crimson">
            NEW DISCOVERY
          </h2>
          <p className="font-space-mono text-slate-gray text-[10px] tracking-widest uppercase">
            Drag to inspect
          </p>
        </div>

      {/* 3D Scene Container */}
      <div 
        className="relative w-full max-w-sm aspect-[3/4] perspective-1000 cursor-grab active:cursor-grabbing"
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
            // Intense glow scales with movement speed/rotation
            boxShadow: Math.abs(rotation.x) > 5 || Math.abs(rotation.y) > 5 ? '0 0 30px rgba(218, 45, 70, 0.5)' : '0 0 10px rgba(42, 45, 67, 0.5)'
          }}
        >
          {/* Front Face */}
          <div className="absolute inset-0 backface-hidden bg-dark-slate border-2 border-slate-gray rounded-3xl overflow-hidden flex flex-col p-4">
            <div className="flex-1 bg-obsidian rounded-2xl border border-light-gray/10 relative flex items-center justify-center overflow-hidden mb-4">
              <img 
                src={`data:${profile.imageMimeType};base64,${profile.imageBase64}`} 
                alt={profile.instrument.name}
                className="w-full h-full object-contain p-4 mix-blend-screen"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-slate to-transparent mix-blend-multiply opacity-50" />
            </div>
            <div className="text-center pb-2">
              <h3 className="font-orbitron font-black text-2xl text-light-gray">{profile.instrument.name}</h3>
              <p className="font-space-mono text-xs text-pale-pink">{profile.instrument.category.toUpperCase()}</p>
            </div>
          </div>

          {/* Back Face */}
          <div 
            className="absolute inset-0 backface-hidden bg-dark-slate border-2 border-slate-gray rounded-3xl overflow-hidden flex flex-col p-6"
            style={{ transform: 'rotateY(180deg)' }}
          >
            <h3 className="font-orbitron font-black text-xl text-light-gray border-b border-light-gray/20 pb-3 mb-4">
              {profile.instrument.name}
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              <div>
                <span className="block font-orbitron text-[10px] text-slate-gray uppercase">Origin</span>
                <span className="font-space-mono text-sm text-pale-pink">{profile.instrument.ethnoLinguisticGroup} - {profile.instrument.region}</span>
              </div>
              
              <div>
                <span className="block font-orbitron text-[10px] text-slate-gray uppercase">Classification</span>
                <span className="font-space-mono text-sm text-pale-pink">{profile.instrument.hornbostelSachs}</span>
              </div>

              <div>
                <span className="block font-orbitron text-[10px] text-slate-gray uppercase">Purpose</span>
                <p className="font-space-mono text-sm text-light-gray leading-relaxed">{profile.instrument.culturalPurpose}</p>
              </div>

              <div>
                <span className="block font-orbitron text-[10px] text-slate-gray uppercase">Description</span>
                <p className="font-space-mono text-sm text-light-gray/80 leading-relaxed">{profile.instrument.description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 w-full max-w-sm">
        <button 
          onClick={onContinue}
          className="w-full py-5 rounded-2xl font-orbitron text-sm font-bold tracking-widest uppercase
            bg-gradient-to-r from-crimson to-pale-pink text-obsidian
            hover:shadow-lg hover:shadow-crimson/40 active:scale-[0.98]
            transition-all duration-200 flex items-center justify-center gap-3"
        >
          PLAY INSTRUMENT <ChevronRight size={20} />
        </button>
      </div>

      </div>

      {/* Required CSS for 3D */}
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #da2d46; border-radius: 4px; }
      `}</style>
    </div>
  );
}
