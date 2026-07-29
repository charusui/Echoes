import React, { useState, useEffect } from 'react';
import { ChevronRight, FastForward } from 'lucide-react';

interface TownEntranceCutsceneProps {
  onComplete: () => void;
}

const SCENES = [
  {
    image: '/assets/story/chieftess_scene1.png',
    dialogues: [
      "Welcome to Cadence Town, brave travelers.",
      "Please, accept these fruits as a token of our hospitality. You must be weary from your journey."
    ]
  },
  {
    image: '/assets/story/chieftess_scene2.png',
    dialogues: [
      "Recently, our merchants and supply lines have been experiencing vicious attacks on the roads.",
      "Without these vital supplies, I fear the harmony of our happy town will shatter, and people will soon turn on each other."
    ]
  },
  {
    image: '/assets/story/chieftess_scene3.png',
    dialogues: [
      "But seeing your strength gives me hope.",
      "I believe you can put an end to these attacks, save the day, and protect our beloved town."
    ]
  }
];

export const TownEntranceCutscene: React.FC<TownEntranceCutsceneProps> = ({ onComplete }) => {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [typewriterText, setTypewriterText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const currentScene = SCENES[sceneIndex];
  const fullText = currentScene?.dialogues[dialogueIndex] || '';

  // Typewriter effect
  useEffect(() => {
    if (!fullText) return;
    
    setIsTyping(true);
    setTypewriterText('');
    
    let i = 0;
    const intervalId = setInterval(() => {
      setTypewriterText(fullText.substring(0, i + 1));
      i++;
      if (i >= fullText.length) {
        setIsTyping(false);
        clearInterval(intervalId);
      }
    }, 30); // 30ms per character

    return () => clearInterval(intervalId);
  }, [fullText]);

  const handleNext = () => {
    if (isFading) return;

    if (isTyping) {
      // Skip typewriter
      setTypewriterText(fullText);
      setIsTyping(false);
      return;
    }

    if (dialogueIndex < currentScene.dialogues.length - 1) {
      setDialogueIndex(prev => prev + 1);
    } else {
      if (sceneIndex < SCENES.length - 1) {
        setIsFading(true);
        setTimeout(() => {
          setSceneIndex(prev => prev + 1);
          setDialogueIndex(0);
          setIsFading(false);
        }, 800);
      } else {
        onComplete();
      }
    }
  };

  if (!currentScene) return null;

  return (
    <div 
      className="absolute inset-0 z-[100] bg-[#11111a] flex flex-col items-center justify-center font-sans select-none cursor-pointer overflow-hidden p-4 md:p-8"
      onClick={handleNext}
    >
      {/* Comic Halftone Background Pattern */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#2a2d43 2px, transparent 2px)',
          backgroundSize: '24px 24px'
        }}
      />

      <div className="relative w-full max-w-5xl flex flex-col items-center justify-center gap-5 md:gap-6 z-20 mt-4 md:mt-0 h-full max-h-[90vh]">
        
        {/* Comic Panel Frame */}
        <div className="relative w-full aspect-video max-w-[calc(45vh*16/9)] md:max-w-[calc(55vh*16/9)] bg-[#0f0c0c] border-[4px] md:border-[8px] border-[#2a2d43] shadow-[6px_6px_0_0_rgba(0,0,0,1)] md:shadow-[12px_12px_0_0_rgba(0,0,0,1)] transition-transform duration-300 mx-auto">
          
          {/* Scene Image */}
          <div 
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}
            style={{
              backgroundImage: `url(${currentScene.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          
          <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] md:shadow-[inset_0_0_80px_rgba(0,0,0,0.8)] pointer-events-none mix-blend-multiply" />
        </div>

        {/* Comic Caption Dialogue Box */}
        <div 
          className="bg-[#0f0c0c] border-[4px] border-[#facc15] w-full max-w-[calc(45vh*16/9)] md:max-w-[calc(55vh*16/9)] mx-auto p-4 md:p-6 shadow-[6px_6px_0_0_rgba(0,0,0,1)] md:shadow-[8px_8px_0_0_rgba(0,0,0,1)] relative transition-all duration-300 shrink-0"
          style={{ minHeight: '100px' }}
        >
          {/* Narrator Badge */}
          <div className="absolute -top-4 md:-top-5 left-4 md:left-8 bg-[#facc15] text-black font-orbitron font-black uppercase tracking-wider px-3 md:px-4 py-1 border-[3px] border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] md:shadow-[4px_4px_0_0_rgba(0,0,0,1)] text-[10px] md:text-sm">
            Chieftess
          </div>

          {/* Dialogue Text */}
          <div className="font-orbitron font-bold text-white text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed tracking-wide uppercase mt-2 md:mt-1 min-h-[40px] md:min-h-[60px]">
            {typewriterText}
          </div>

          {/* Next indicator */}
          {!isTyping && (
            <div className="absolute bottom-3 right-3 md:bottom-6 md:right-6 animate-bounce">
              <ChevronRight className="w-6 h-6 md:w-8 md:h-8 text-[#facc15]" strokeWidth={3} />
            </div>
          )}
          
          <div className="absolute -bottom-6 md:-bottom-8 right-0 text-[#a1a1aa] text-[10px] md:text-xs font-mono uppercase tracking-widest opacity-70 font-bold bg-[#11111a] px-2 py-1">
            Click anywhere to continue
          </div>
        </div>

      </div>
      
      {/* Skip button */}
      <button 
        className="absolute top-4 right-4 md:top-6 md:right-6 px-3 py-1.5 md:px-4 md:py-2 bg-[#ef4444] text-white border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] md:shadow-[6px_6px_0_0_rgba(0,0,0,1)] font-orbitron font-bold uppercase tracking-widest z-30 hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all flex items-center gap-1 md:gap-2 group text-xs md:text-sm"
        onClick={(e) => {
          e.stopPropagation();
          onComplete();
        }}
      >
        <span>Skip</span>
        <FastForward className="w-3 h-3 md:w-4 md:h-4 group-hover:text-black transition-colors" />
      </button>
    </div>
  );
};
