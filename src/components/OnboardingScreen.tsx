import { useState } from 'react';
import { Map, Camera, Music, ArrowRight, ChevronsRight } from 'lucide-react';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    title: "BE AN EXPLORER",
    description: "Embark on an expedition across the Visayas to uncover lost musical traditions.",
    icon: <Map size={64} className="text-[#0f0c0c] skew-x-6" />,
    // Panel color behind the icon
    panelColor: "bg-[#f0dde0]", 
    accentColor: "bg-[#da2d46]",
  },
  {
    title: "SCAN & DISCOVER",
    description: "Use your device's camera to scan real traditional Philippine instruments to add them to your collection.",
    icon: <Camera size={64} className="text-[#0f0c0c] skew-x-6" />,
    panelColor: "bg-[#e0e5ed]",
    accentColor: "bg-[#888ea1]",
  },
  {
    title: "PLAY & MASTER",
    description: "Play rhythmic minigames to master the instruments, earn XP, and unlock dynamic ancestral stories.",
    icon: <Music size={64} className="text-[#0f0c0c] skew-x-6" />,
    panelColor: "bg-[#da2d46]",
    accentColor: "bg-[#f0dde0]",
  }
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  return (
    // Base container uses Dark Slate (#2a2d43)
    <div className="relative min-h-screen flex flex-col bg-[#2a2d43] overflow-hidden z-0">
      
      {/* 1. Halftone Dot Pattern Background */}
      <div 
        className="absolute inset-0 z-[-3] opacity-30 pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(#da2d46 2px, transparent 2px)',
          backgroundSize: '20px 20px'
        }}
      />

      {/* 2. Dynamic Speed Slash Background */}
      {/* Changes color based on the slide to give a sense of progression */}
      <div 
        className={`absolute top-0 right-0 w-[150%] md:w-[80%] h-[120%] -skew-x-12 translate-x-20 md:translate-x-32 z-[-2] border-l-[12px] border-[#0f0c0c] transition-colors duration-500 ease-in-out ${SLIDES[currentSlide].accentColor}`} 
      />

      {/* --- FOREGROUND CONTENT --- */}
      {/* We use a key based on currentSlide to re-trigger the CSS animations on every slide change */}
      <div key={currentSlide} className="relative z-10 flex-1 flex flex-col justify-center items-center px-6 md:px-10 text-center animate-comic-pop">
        
        {/* Floating Comic Panel (Replaces the soft floating icon) */}
        <div className="relative mb-10 md:mb-16">
          {/* Decorative background panel offset */}
          <div className="absolute inset-0 bg-[#0f0c0c] -skew-x-6 translate-x-3 translate-y-3" />
          
          {/* Main Icon Panel */}
          <div className={`relative w-40 h-40 md:w-48 md:h-48 border-[6px] border-[#0f0c0c] flex items-center justify-center -skew-x-6 overflow-hidden transition-colors duration-300 ${SLIDES[currentSlide].panelColor}`}>
            {/* Speedlines inside the icon panel */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #0f0c0c 10px, #0f0c0c 12px)' }}
            />
            {SLIDES[currentSlide].icon}
          </div>
        </div>

        {/* Typography Segment */}
        <div className="max-w-md w-full flex flex-col items-center"> 
          
          {/* Title with Chromatic Shadow */}
          <h2 
            className="font-orbitron font-black text-3xl md:text-5xl tracking-tight text-[#e0e5ed] mb-6 uppercase"
            style={{ textShadow: '4px 4px 0px #0f0c0c, -3px 0px 0px #da2d46' }}
          >
            {SLIDES[currentSlide].title}
          </h2>
          
          {/* Description Text - Housed in a rigid comic caption box */}
          <div className="bg-[#0f0c0c] border-4 border-[#da2d46] px-6 py-4 -skew-x-6 shadow-[6px_6px_0px_0px_#da2d46] w-full">
            <p className="font-space-mono text-sm md:text-base text-[#f0dde0] leading-relaxed skew-x-6 font-bold">
              {SLIDES[currentSlide].description}
            </p>
          </div>
        </div>
      </div>

      {/* --- BOTTOM NAVIGATION --- */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 px-6 md:px-12 pb-10 pt-6">
        
        {/* Progress Tracker (Replaces minimal dots with skewed blocks) */}
        <div className="flex justify-center gap-2 order-2 md:order-1">
          {SLIDES.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-4 transition-all duration-300 -skew-x-6 border-2 border-[#0f0c0c] ${
                currentSlide === idx 
                  ? 'w-12 bg-[#da2d46] shadow-[3px_3px_0px_0px_#0f0c0c]' 
                  : 'w-4 bg-[#888ea1] opacity-50'
              }`}
            />
          ))}
        </div>

        {/* Action Buttons Container */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end order-1 md:order-2">
          
          {/* Skip Button - Styled as a secondary comic tag */}
          <button 
            onClick={onComplete}
            className={`font-space-mono text-xs font-bold tracking-widest transition-opacity duration-300 uppercase px-4 py-2 border-2 border-[#0f0c0c] -skew-x-6 shadow-[3px_3px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-[0px_0px_0px_0px_#0f0c0c] ${
              currentSlide === SLIDES.length - 1 
                ? 'opacity-0 pointer-events-none' 
                : 'opacity-100 bg-[#2a2d43] text-[#888ea1] hover:bg-[#e0e5ed] hover:text-[#0f0c0c]'
            }`}
          >
            <span className="skew-x-6 block">Skip</span>
          </button>

          {/* Next / Start Button - Heavy Crimson block matching the landing page */}
          <button 
            onClick={handleNext}
            className="group relative h-12 shrink-0 bg-[#da2d46] border-[4px] border-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] transition-all duration-200 ease-out -skew-x-6 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_#0f0c0c] active:translate-y-2 active:translate-x-2 active:shadow-[0px_0px_0px_0px_#0f0c0c]"
          >
            <div className="relative z-10 flex items-center justify-center w-full h-full px-6 text-[#0f0c0c]">
              <span className="font-space-mono font-black tracking-widest uppercase text-sm skew-x-6 mr-2">
                {currentSlide === SLIDES.length - 1 ? 'INITIATE' : 'NEXT'}
              </span>
              {currentSlide === SLIDES.length - 1 ? (
                <ChevronsRight size={20} className="stroke-[3px] skew-x-6" />
              ) : (
                <ArrowRight size={20} className="stroke-[3px] skew-x-6" />
              )}
            </div>
          </button>
        </div>

      </div>
      
      {/* CSS Keyframes for the snappy comic page turn effect */}
      <style>{`
        @keyframes comic-pop {
          0% { opacity: 0; transform: scale(0.95) translateX(20px); }
          60% { transform: scale(1.02) translateX(-5px); }
          100% { opacity: 1; transform: scale(1) translateX(0); }
        }
        .animate-comic-pop { 
          animation: comic-pop 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards; 
        }
      `}</style>
    </div>
  );
}