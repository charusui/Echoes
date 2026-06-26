import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';

// imported picture
import person from '../assets/images/pose_three.png';

interface TitleScreenProps {
  onStart: () => void;
}

export function TitleScreen({ onStart }: TitleScreenProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    // Base container uses Dark Slate (#2a2d43)
    <div className="relative min-h-screen bg-[#2a2d43] flex flex-col pt-24 md:pt-0 md:justify-center overflow-hidden pb-safe px-6 md:px-12 z-0">
      
      {/* 1. Halftone Dot Pattern Background */}
      {/* Uses radial-gradient to generate comic dots purely with CSS */}
      <div 
        className="absolute inset-0 z-[-3] opacity-30 pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(#da2d46 2px, transparent 2px)',
          backgroundSize: '20px 20px'
        }}
      />

      {/* 2. Dynamic Speed Slashes */}
      {/* A massive, skewed Crimson shape breaking the background */}
      <div className="absolute top-0 right-0 w-[120%] md:w-[65%] h-[120%] bg-[#da2d46] -skew-x-12 translate-x-20 md:translate-x-32 z-[-2] border-l-[12px] border-[#0f0c0c]" />

      {/* Abstract comic panel framing the characters */}
      <div className="absolute bottom-20 right-35 w-[50%] h-[60%] bg-[#f0dde0] border-[8px] border-[#0f0c0c] shadow-[16px_16px_0px_0px_#0f0c0c] -skew-x-6 z-[-1] hidden md:block" />

      {/* 3. Characters */}
      <div className={`absolute bottom-0 md:-bottom-10 left-[-1rem] md:left-auto md:right-0 z-10 h-[55vh] md:h-[105vh] w-[85%] md:w-auto transition-transform duration-[1200ms] ease-out ${mounted ? 'translate-x-0' : 'translate-x-32'}`}>
        
        {/* Applying a hard drop shadow to the PNG itself instead of a soft glow */}
        <img 
          src={person} 
          alt="person posing" 
          className="h-full w-full md:w-auto object-cover md:object-contain object-bottom md:object-right drop-shadow-[8px_8px_0px_rgba(15,12,12,1)]" 
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[80vh] z-10 bg-gradient-to-t from-[#0f0c0c] via-[#2a2d43]/40 to-transparent pointer-events-none" />
      
      {/* Main Content - Text Container */}
      <div className={`relative z-20 flex flex-col items-end md:items-start w-full transition-transform duration-[800ms] ease-out ${mounted ? 'translate-x-0' : '-translate-x-16'}`}>
        
        {/* Project Label - Framed in a skewed container */}
        <div className="bg-[#0f0c0c] px-4 py-2 mb-6 border-4 border-[#da2d46] -skew-x-6 shadow-[6px_6px_0px_0px_#da2d46]">
          <h2 className="font-space-mono text-[#f0dde0] font-bold tracking-[0.2em] text-xs md:text-sm uppercase skew-x-6">
            The Cultural Resonance Project
          </h2>
        </div>
        
        {/* 4. Chromatic Aberration Typography */}
        <div className="relative">
          <h1 
            className="font-orbitron font-black text-5xl md:text-[7rem] text-right md:text-left leading-none mb-2 relative text-[#e0e5ed] uppercase tracking-tighter"
            style={{
              // Text shadow handles the heavy black outline and the Crimson/Pink glitch offsets
              textShadow: '6px 6px 0px #0f0c0c, -5px 0px 0px #da2d46, 5px 0px 0px #f0dde0'
            }}
          >
            MUSIKULTURA
          </h1>
        </div>
        <div className="w-[80%] max-w-[250px] md:max-w-md h-3 bg-[#0f0c0c] my-6 md:my-8 border-b-4 border-[#da2d46] ml-auto md:ml-0 -skew-x-12" />
      </div>

      {/* 5. The "Action" Button */}
      {/* Removes opacity transitions for hard translations. Active state presses the button into its shadow. */}
      <div className={`absolute bottom-8 left-6 md:bottom-12 md:left-12 z-20 transition-transform duration-[800ms] delay-300 ease-out ${mounted ? 'translate-y-0' : 'translate-y-24'}`}>
        <button 
          onClick={onStart}
          className="group relative flex items-center gap-4 transition-transform active:translate-y-2 active:translate-x-2"
        >
          
          {/* Main Button Block */}
          {/* Added hover translations and expanded hover shadow for the "lift" effect */}
          <div className="relative h-16 shrink-0 bg-[#da2d46] border-[4px] border-[#0f0c0c] shadow-[8px_8px_0px_0px_#0f0c0c] transition-all duration-200 ease-out -skew-x-6 overflow-hidden group-hover:-translate-y-1 group-hover:-translate-x-1 group-hover:shadow-[12px_12px_0px_0px_#0f0c0c] group-active:translate-y-2 group-active:translate-x-2 group-active:shadow-[0px_0px_0px_0px_#0f0c0c]">
            
            {/* 1. The Circling LED Effect (Spinning Gradient) */}
            {/* Sits completely in the background, scaled up to ensure it covers the corners while spinning */}
            <div 
              className="absolute inset-[-150%] animate-[spin_2s_linear_infinite] z-0"
              style={{
                background: 'conic-gradient(from 0deg, transparent 75%, #f0dde0 90%, #ffffff 100%)'
              }}
            />

            {/* 2. Inner Mask */}
            {/* This blocks out the center of the spinning gradient, leaving only a 3px glowing LED border */}
            <div className="absolute inset-[3px] bg-[#da2d46] z-0" />

            {/* 3. Button Content */}
            {/* Needs relative and z-10 to sit above the background layers */}
            <div className="relative z-10 flex items-center justify-center w-full h-full px-8 text-[#0f0c0c]">
              <Play size={28} className="fill-current skew-x-6 font-black" />
              <span className="font-space-mono font-black tracking-widest uppercase text-lg skew-x-6 ml-3">
                START 
              </span>
            </div>
          </div>

          {/* Supplemental Info Tag - Formatted as an attached comic caption box */}
          <div className="flex flex-col items-start text-left bg-[#2a2d43] border-4 border-[#0f0c0c] px-4 py-2 -skew-x-6 shadow-[6px_6px_0px_0px_#0f0c0c] hidden md:flex">
            <span className="font-space-mono text-sm text-[#e0e5ed] font-bold uppercase tracking-widest skew-x-6">
              System Ready
            </span>
            <span className="font-space-mono text-xs text-[#888ea1] uppercase tracking-widest mt-1 skew-x-6 font-bold">
              Headphones Rec.
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}