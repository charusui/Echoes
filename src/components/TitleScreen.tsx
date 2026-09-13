import { useEffect, useState, useRef } from 'react';
import { Key, Play } from 'pixelarticons/react';
import { useGemini } from '../context/GeminiProvider';
import { PixelBar, PixelButton, PixelPanel } from './ui';

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

  // Mount animation trigger & Title BGM
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 150);
    const bgm = new Audio('/assets/audio/bgm/menu_bgm.mp3');
    bgm.loop = true;
    bgm.volume = 0.35;
    bgm.play().catch(() => {});
    return () => {
      clearTimeout(t);
      bgm.pause();
      bgm.currentTime = 0;
    };
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

  const { isElectron, showApiKeyPrompt } = useGemini();

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
      className="relative w-full h-[100dvh] overflow-hidden flex flex-col bg-plum-950 selection:bg-transparent"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* API Key Configure Button (Only shown inside Electron) */}
      {isElectron && !isStarting && (
        <PixelButton size="sm" icon={<Key />} onClick={showApiKeyPrompt} className="absolute top-4 right-4 z-50">
          Configure API Key
        </PixelButton>
      )}

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

      {/* ── MAIN UI LAYER ── */}
      <div 
        className={`relative z-10 w-full h-full flex flex-col items-center justify-between pt-[1vh] pb-[6vh] px-4 transition-all duration-700 ease-in-out ${mounted && !isStarting ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8 pointer-events-none'}`}
      >
        
        {/* TOP CENTER: Title Image */}
        <div className="flex flex-col items-center w-full">
          <img 
            src={title} 
            alt="Musikultura Title" 
            className="w-[80vw] sm:w-[60vw] md:w-[45vw] max-w-[600px] h-auto object-contain transition-transform duration-200"
            style={{
              transform: `translate3d(${mouseOffset.x * -5}px, ${mouseOffset.y * -3}px, 0)`,
            }}
          />
        </div>

        {/* BOTTOM CENTER: Single Play Button */}
        <div className="flex flex-col items-center justify-center shrink-0 w-full mb-[5vh]">
          <PixelButton
            variant="primary"
            size="lg"
            icon={<Play />}
            onClick={handleStartGame}
            disabled={isStarting}
            className="min-w-56 sm:min-w-64 sm:text-2xl"
          >
            Play
          </PixelButton>
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
            className="h-[clamp(80px,15vh,160px)] w-auto object-contain mb-3"
            style={{ imageRendering: 'pixelated' }}
          />

          <PixelPanel padding="md" className="w-[85%] max-w-md">
            <PixelBar
              kind="gold"
              height={14}
              value={isStarting ? 100 : 0}
              label={<span className="text-sm text-parchment-100">{loadingText}</span>}
              transition="width 2400ms steps(24)"
            />
          </PixelPanel>

        </div>
      </div>

    </div>
  );
}