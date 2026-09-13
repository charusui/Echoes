import { useState, useRef, useEffect, type ReactNode } from 'react';
import type { ActiveInstrumentProfile } from '../types';
import { ChevronRight, Sparkles } from 'pixelarticons/react';
import { PixelButton, PixelChip, type PixelChipTone } from './ui';
import { cn } from '../lib/cn';
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
    <div className="min-h-screen bg-plum-950 text-parchment-100 flex flex-col items-center px-4 pt-10 pb-12 pb-safe overflow-x-hidden">
      <div className="w-full max-w-sm flex flex-col items-center gap-5">
        <header className="flex flex-col items-center gap-2 text-center">
          {isNew && <PixelChip tone="gold" icon={<Sparkles />}>New discovery</PixelChip>}
          <h2 className="font-bold text-3xl md:text-4xl leading-none">{isNew ? 'You found an instrument!' : 'Instrument profile'}</h2>
          <p className="text-sm text-parchment-500">Drag the card to flip it over</p>
        </header>

        {/* 3D card */}
        <div
          className={cn('relative w-full max-w-[280px] sm:max-w-xs aspect-[3/4] perspective-1000 cursor-grab active:cursor-grabbing', profile.instrument.name.toLowerCase() === 'korlong' && 'animate-card-bounce-in')}
          onMouseDown={e => handleStart(e.clientX, e.clientY)}
          onMouseMove={e => handleMove(e.clientX, e.clientY)}
          onTouchStart={e => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={e => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
        >
          <div
            ref={cardRef}
            className="w-full h-full preserve-3d transition-transform duration-300 ease-out"
            style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
          >
            {/* Front */}
            <div className="absolute inset-0 backface-hidden px-frame px-frame-wood flex flex-col gap-3 p-4">
              <div className="flex-1 min-h-0 px-frame px-frame-inset overflow-hidden flex items-center justify-center">
                <img
                  src={profile.imageBase64 ? `data:${profile.imageMimeType};base64,${profile.imageBase64}` : `${IMAGE_BASE}${profile.instrument.name.toLowerCase().replace(/ /g, '_')}.png?v=2`}
                  alt={profile.instrument.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-bold text-2xl md:text-3xl leading-none text-gold-300">{profile.instrument.name}</h3>
                <PixelChip tone={CATEGORY_TONE[String(profile.instrument.category).toLowerCase()] ?? 'neutral'} className="self-start">
                  {profile.instrument.category}
                </PixelChip>
              </div>
            </div>

            {/* Back */}
            <div className="absolute inset-0 backface-hidden px-frame px-frame-wood flex flex-col gap-3 p-4" style={{ transform: 'rotateY(180deg)' }}>
              <h3 className="font-bold text-xl leading-none text-gold-300 text-center">{profile.instrument.name}</h3>
              <dl className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                <FactRow label="Origin">{profile.instrument.ethnoLinguisticGroup} · {profile.instrument.region}</FactRow>
                <FactRow label="Classification">{profile.instrument.hornbostelSachs}</FactRow>
                <FactRow label="Purpose" parchment>{profile.instrument.culturalPurpose}</FactRow>
                <FactRow label="Description" parchment>{profile.instrument.description}</FactRow>
                {profile.instrument.history && <FactRow label="History" parchment>{profile.instrument.history}</FactRow>}
              </dl>
            </div>
          </div>
        </div>

        <div className="w-full max-w-[280px] sm:max-w-xs flex flex-col gap-3">
          <PixelButton variant="primary" size="lg" fullWidth icon={<ChevronRight />} onClick={() => handleLeave(onContinue)}>
            Play Instrument
          </PixelButton>
          <PixelButton fullWidth sound="ui_back" onClick={() => handleLeave(onBack)}>
            Back to Adventure
          </PixelButton>
        </div>
      </div>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }

        @keyframes card-bounce-in {
          0% { transform: scale(0.3) translateY(300px); opacity: 0; }
          60% { transform: scale(1.05) translateY(-20px); opacity: 1; }
          100% { transform: scale(1) translateY(0); }
        }
        .animate-card-bounce-in { animation: card-bounce-in 0.6s steps(12) forwards; }
      `}</style>
    </div>
  );
}

const CATEGORY_TONE: Record<string, PixelChipTone> = { percussion: 'perc', string: 'string', wind: 'wood', woodwind: 'wood' };

function FactRow({ label, children, parchment }: { label: string; children: ReactNode; parchment?: boolean }) {
  return (
    <div className={cn('px-frame px-frame-sm p-2.5', parchment ? 'px-frame-parchment' : 'px-frame-inset')}>
      <dt className={cn('text-xs font-semibold', parchment ? 'text-wood-700' : 'text-gold-300')}>{label}</dt>
      <dd className={cn('mt-1 text-sm leading-snug', parchment ? 'text-ink' : 'text-parchment-100')}>{children}</dd>
    </div>
  );
}
