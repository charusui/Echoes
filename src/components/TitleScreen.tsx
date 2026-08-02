import { useEffect, useState, useRef } from 'react';

// Running animation frames
import one from '../assets/running animation/1.png?v=2';
import two from '../assets/running animation/2.png?v=2';
import three from '../assets/running animation/3.png?v=2';
import four from '../assets/running animation/4.png?v=2';
import five from '../assets/running animation/5.png?v=2';
import six from '../assets/running animation/6.png?v=2';
import seven from '../assets/running animation/7.png?v=2';
import eight from '../assets/running animation/8.png?v=2';
import nine from '../assets/running animation/9.png?v=2';
import ten from '../assets/running animation/10.png?v=2';
import eleven from '../assets/running animation/11.png?v=2';
import twelve from '../assets/running animation/12.png?v=2';
import thirteen from '../assets/running animation/13.png?v=2';
import fourteen from '../assets/running animation/14.png?v=2';
import fifteen from '../assets/running animation/15.png?v=2';
import sixteen from '../assets/running animation/16.png?v=2';
import seventeen from '../assets/running animation/17.png?v=2';
import eighteen from '../assets/running animation/18.png?v=2';
import nineteen from '../assets/running animation/19.png?v=2';
import twenty from '../assets/running animation/20.png?v=2';

// Background and Title
import bg from '../assets/titlescreen/bg.jpeg';
import title from '../assets/titlescreen/title.png?v=2';
import bush from '../assets/titlescreen/bush.png?v=2';

const FRAMES = [
  one, two, three, four, five, six, seven, eight, nine, ten,
  eleven, twelve, thirteen, fourteen, fifteen, sixteen, seventeen,
  eighteen, nineteen, twenty,
];

const FRAME_DURATION = 80;

interface TitleScreenProps {
  onStart: () => void;
}

export function TitleScreen({ onStart }: TitleScreenProps) {
  const [mounted, setMounted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [frameIdx, setFrameIdx] = useState(0);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [loadingText, setLoadingText] = useState('INITIALIZING...');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mount animation trigger
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 150);
    return () => clearTimeout(t);
  }, []);

  // Character running animation loop
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setFrameIdx(prev => (prev + 1) % FRAMES.length);
    }, FRAME_DURATION);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Parallax mouse tracker
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { innerWidth, innerHeight } = window;
    const x = (e.clientX / innerWidth - 0.5) * 2; 
    const y = (e.clientY / innerHeight - 0.5) * 2; 
    setMouseOffset({ x, y });
  };

  const handleMouseLeave = () => {
    setMouseOffset({ x: 0, y: 0 });
  };

  const handleStartGame = () => {
    setIsStarting(true);
    
    // Cycle loading text for extra polish
    setTimeout(() => setLoadingText('LOADING ASSETS...'), 800);
    setTimeout(() => setLoadingText('CALIBRATING AUDIO...'), 1600);

    setTimeout(() => {
      onStart();
    }, 2500);
  };

  return (
    <div
      className="relative w-full h-[100dvh] overflow-hidden flex flex-col bg-[#0f0c0c] selection:bg-transparent"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── BACKGROUND LAYER ── */}
      <img
        src={bg}
        alt="Background"
        aria-hidden
        className={`absolute inset-0 w-full h-full object-cover object-center z-[1] pointer-events-none transition-all duration-1000 ${isStarting ? 'opacity-20 blur-md scale-110' : 'opacity-100 scale-105'}`}
        style={{
          transform: `translate3d(${mouseOffset.x * -15}px, ${mouseOffset.y * -8}px, 0) ${isStarting ? 'scale(1.1)' : 'scale(1.05)'}`,
          transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), opacity 1s ease, filter 1s ease',
        }}
      />

      {/* ── FOREGROUND LAYER (BUSH) ── */}
      <img
        src={bush}
        alt="Foreground Bush"
        aria-hidden
        className={`hidden md:block absolute -bottom-[35%] left-[-0%] w-[110%] h-auto object-bottom z-[2] pointer-events-none transition-all duration-1000 ${isStarting ? 'opacity-0 translate-y-12 blur-md' : 'opacity-100 translate-y-0 scale-105'}`}
        style={{
          transform: `translate3d(${mouseOffset.x * -40}px, ${mouseOffset.y * -15}px, 0) ${isStarting ? 'scale(1.1)' : 'scale(1.05)'}`,
          transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), opacity 1s ease, filter 1s ease',
        }}
      />

      {/* ── SUBTLE DOT OVERLAY ── */}
      <div
        className="absolute inset-0 pointer-events-none z-[3] opacity-40 mix-blend-overlay"
        style={{
          backgroundImage: 'radial-gradient(rgba(0,0,0,0.8) 1.5px, transparent 1.5px)',
          backgroundSize: '4px 4px',
        }}
      />

      {/* ── MAIN UI LAYER ── */}
      <div 
        className={`relative z-10 w-full h-full flex flex-col items-center justify-between pt-[1vh] pb-[6vh] px-4 transition-all duration-700 ease-in-out ${mounted && !isStarting ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8 pointer-events-none'}`}
      >
        
        {/* TOP CENTER: Title Image */}
        <div className="flex flex-col items-center w-full">
          <img 
            src={title} 
            alt="Musikultura Title" 
            className="w-[80vw] sm:w-[60vw] md:w-[45vw] max-w-[600px] h-auto object-contain drop-shadow-[6px_6px_0px_rgba(0,0,0,0.7)] transition-transform duration-200"
            style={{
              transform: `translate3d(${mouseOffset.x * -5}px, ${mouseOffset.y * -3}px, 0)`,
            }}
          />
        </div>

        {/* BOTTOM CENTER: Single Play Button */}
        <div className="flex flex-col items-center justify-center shrink-0 w-full mb-[5vh]">
          <button
            onClick={handleStartGame}
            disabled={isStarting}
            className="group relative flex items-center justify-center gap-3 sm:gap-4 bg-[#e52b35] text-[#0d0d12] border-[4px] border-[#0d0d12] px-10 py-4 sm:px-14 sm:py-5 shadow-[8px_8px_0px_0px_#0d0d12] hover:bg-[#ff3b46] active:translate-y-[8px] active:translate-x-[8px] active:shadow-none transition-all outline-none cursor-pointer disabled:opacity-50 -skew-x-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 sm:w-[22px] sm:h-[22px] skew-x-2">
              <path d="M4 2v20l17-10z" />
            </svg>
            <span className="font-['Press_Start_2P',_monospace] text-sm sm:text-lg uppercase tracking-widest leading-none pt-1 skew-x-2">
              Play Game
            </span>
          </button>
        </div>

      </div>

      {/* ── UPDATED COMIC-STYLE LOADING SCREEN (z-50) ── */}
      <div 
        className={`absolute inset-0 z-50 flex transition-opacity duration-700 delay-200 ${isStarting ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <div className={`absolute bottom-0 left-0 w-full flex flex-col items-center pb-12 sm:pb-16 transition-transform duration-700 transform ${isStarting ? 'translate-y-0' : 'translate-y-12'}`}>
          
          {/* Running Character animation */}
          <img
            src={FRAMES[frameIdx]}
            alt="Loading Character"
            className="h-[clamp(80px,15vh,160px)] w-auto object-contain mb-3 drop-shadow-[4px_4px_0px_rgba(0,0,0,0.8)]"
            style={{ imageRendering: 'pixelated' }}
          />

          {/* Progress Section */}
          <div className="w-[85%] max-w-md flex flex-col gap-3">
            
            {/* Pixelated Text Row */}
            <div className="flex justify-between items-end px-1">
              <span className="font-['Press_Start_2P',_monospace] text-white text-[8px] sm:text-[10px] uppercase tracking-wider animate-pulse drop-shadow-[2px_2px_0px_#000]">
                {loadingText}
              </span>
              <span className="font-['Press_Start_2P',_monospace] text-white text-[8px] sm:text-[10px] tracking-wider drop-shadow-[2px_2px_0px_#000]">
                {isStarting ? '100%' : '0%'}
              </span>
            </div>
            
            {/* Comic Style Progress Bar */}
            <div className="w-full h-5 sm:h-7 bg-[#f8fafc] border-[3px] sm:border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] sm:shadow-[6px_6px_0px_0px_#0f0c0c] p-1 -skew-x-3">
              <div 
                className="h-full bg-[#facc15] border-r-[3px] sm:border-r-[4px] border-[#0f0c0c] transition-all duration-[2400ms] ease-out" 
                style={{ width: isStarting ? '100%' : '0%' }}
              />
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}