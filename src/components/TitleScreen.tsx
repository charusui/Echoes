import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
}

export function TitleScreen({ onStart }: TitleScreenProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen bg-obsidian flex flex-col items-center justify-center overflow-hidden pb-safe">
      {/* Background Map Image */}
      <div 
        className={`absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-[3000ms] ${mounted ? 'opacity-30' : 'opacity-0'} mix-blend-screen`}
        style={{ backgroundImage: 'url(/visayas_map.png)' }}
      />
      
      {/* Vignette & Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent z-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-obsidian via-transparent to-transparent z-0" />

      {/* Main Content */}
      <div className={`relative z-10 flex flex-col items-center px-6 transition-all duration-[2000ms] delay-500 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <h2 className="font-space-mono text-pale-pink tracking-[0.4em] text-xs uppercase mb-4 glow-pale-pink">
          The Cultural Resonance Project
        </h2>
        
        <h1 className="font-orbitron font-black text-5xl md:text-7xl text-center text-light-gray leading-tight mb-2 drop-shadow-2xl">
          ECHOES<br/>
          <span className="text-2xl md:text-4xl text-crimson glow-crimson tracking-widest">OF THE</span><br/>
          ANCESTORS
        </h1>

        <div className="w-32 h-px bg-gradient-to-r from-transparent via-pale-pink to-transparent my-8 opacity-50" />

        {/* Pulse button */}
        <button 
          onClick={onStart}
          className="group relative mt-12 flex items-center gap-3 active:scale-95 transition-all duration-300"
        >
          <div className="absolute inset-0 bg-crimson/20 rounded-full blur-xl group-hover:bg-crimson/40 transition-all animate-pulse" />
          <div className="relative w-16 h-16 rounded-full bg-crimson/10 border border-crimson/40 flex items-center justify-center text-crimson shadow-[0_0_30px_rgba(218,45,70,0.3)] backdrop-blur-sm">
            <Play size={24} className="ml-1" />
          </div>
          <span className="font-space-mono font-bold text-light-gray tracking-widest uppercase animate-pulse">
            Tap to Begin
          </span>
        </button>
      </div>

      <div className={`absolute bottom-6 text-center w-full z-10 transition-opacity duration-1000 delay-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <p className="font-space-mono text-[10px] text-light-gray/30 uppercase tracking-widest">
          Headphones Recommended
        </p>
      </div>
    </div>
  );
}
