import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';

// imported picture
import person from '../assets/images/pose_one_colored_removebg.png';

interface TitleScreenProps {
  onStart: () => void;
}

export function TitleScreen({ onStart }: TitleScreenProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    // Responsive Wrapper: Padding top on mobile to push text up, centered vertically on desktop
    <div className="relative min-h-screen bg-[#2a2d43] flex flex-col pt-24 md:pt-0 md:justify-center overflow-hidden pb-safe px-6 md:px-12">

      {/* Background Image / Character */}
      {/* Fixed mobile height to 65vh so it actually fits on the screen */}
      <div className={`absolute -bottom-15 right-0 md:right-10 z-0 h-[65vh] md:h-[105vh] transition-opacity duration-[2000ms] ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <img 
          src={person} 
          alt="person posing" 
          className="h-full w-auto object-contain object-right-bottom md:object-right" 
        />
      </div>
      
      {/* Vignette & Gradients */}
      <div className="absolute bottom-0 left-0 right-0 h-[80vh] z-0 bg-gradient-to-t from-[#0f0c0c] via-[#2a2d43]/40 to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-[70vh] md:h-[30vh] z-0 bg-gradient-to-b from-[#0f0c0c] via-transparent to-transparent pointer-events-none" />

      {/* Main Content - Text Container */}
      {/* Responsive: items-end (right side) on mobile, items-start (left side) on desktop */}
      <div className={`relative z-20 flex flex-col items-end md:items-start w-full transition-all duration-[2000ms] delay-500 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        
        {/* Responsive text alignment */}
        <h2 className="font-space-mono text-pale-pink tracking-[0.4em] text-xs md:text-sm uppercase mb-4 glow-pale-pink text-right md:text-left">
          The Cultural Resonance Project
        </h2>
        
        <h1 className="font-orbitron font-black text-4xl md:text-5xl lg:text-[6rem] text-right md:text-left text-light-gray leading-none mb-2 drop-shadow-2xl">
          ECHOES<br/>
          OF THE<br/>
          ANCESTORS
        </h1>

        {/* Responsive Divider: Align right on mobile, left on desktop */}
        <div className="w-[80%] max-w-[250px] md:max-w-md h-px bg-gradient-to-l md:bg-gradient-to-r from-pale-pink/50 to-transparent my-6 md:my-8 opacity-50 ml-auto md:ml-0" />
      </div>

      {/* Play button & Minor Text - Anchored to Bottom Left */}
      <div className={`absolute bottom-8 left-6 md:bottom-12 md:left-12 z-20 transition-all duration-1000 delay-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <button 
          onClick={onStart}
          className="group relative flex items-center gap-4 active:scale-95 transition-all duration-300"
        >
          {/* Button Glow/Pulse */}
          <div className="absolute left-0 w-16 h-16 bg-crimson/20 rounded-full blur-xl group-hover:bg-crimson/40 transition-all animate-pulse" />
          
          {/* Button Icon - Fixed invalid w-30 to standard w-32 */}
          <div className="relative w-32 h-14 shrink-0 rounded-xl bg-crimson/10 border border-crimson/40 flex items-center justify-center text-crimson shadow-[0_0_30px_rgba(218,45,70,0.3)] backdrop-blur-sm">
            <Play size={24} className="ml-1 fill-current" />
          </div>

          {/* Button Text & Subtext */}
          <div className="flex flex-col items-start text-left">
            <span className="font-space-mono font-bold text-light-gray tracking-widest uppercase text-sm md:text-base animate-pulse">
              Tap to Begin
            </span>
            <span className="font-space-mono text-[10px] text-light-gray/40 uppercase tracking-widest mt-1">
              Headphones Recommended
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}