import React, { useState, useEffect } from 'react';
import scene1 from '../assets/intro/scene1.png';
import scene2 from '../assets/intro/scene2.png';
import scene3 from '../assets/intro/scene3.png';
import scene4 from '../assets/intro/scene4.png';
import { ChevronRight } from 'lucide-react';

interface IntroCutsceneProps {
  onComplete: () => void;
}

const SCENES = [
  {
    image: scene1,
    dialogues: [
      "The sky didn't just break... it screamed.",
      "When The Great Dissonance tore through our world, it brought the myths with it."
    ]
  },
  {
    image: scene2,
    dialogues: [
      "Monsters of ancient folklore poured through the rift, feeding on the chaos.",
      "Steel and gunpowder were useless against them. The world fell out of tune."
    ]
  },
  {
    image: scene3,
    dialogues: [
      "But our ancestors knew this day would come.",
      "They left behind the Legendary Instruments—relics forged not just for music, but for war."
    ]
  },
  {
    image: scene4,
    dialogues: [
      "Here in the Visayas, three conductors rise.",
      "To strike back, we must find the lost instruments. We must find the perfect pitch.",
      "And we must play the monsters back to hell."
    ]
  }
];

export const IntroCutscene: React.FC<IntroCutsceneProps> = ({ onComplete }) => {
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
        }, 1000); // 1s crossfade
      } else {
        onComplete();
      }
    }
  };

  if (!currentScene) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black flex flex-col font-sans select-none cursor-pointer"
      onClick={handleNext}
    >
      {/* Background Image */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}
        style={{
          backgroundImage: `url(${currentScene.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          // Pixel art rendering
          imageRendering: 'pixelated'
        }}
      />
      
      {/* Vignette / Dark gradient to make text readable */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none" />

      {/* Ren'Py style Dialogue Box at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
        <div 
          className="bg-[#0f0c0c]/90 border-t-[4px] border-l-[4px] border-[#2a2d43] p-4 md:p-6 shadow-2xl relative transition-all duration-300 transform"
          style={{ minHeight: '120px' }}
        >
          {/* Speaker / Title tag optional, but maybe just leave it clean for the narrator */}
          
          <div className="font-orbitron text-white text-sm md:text-lg lg:text-xl leading-relaxed tracking-wide drop-shadow-md min-h-[60px]">
            {typewriterText}
          </div>

          {/* Next indicator */}
          {!isTyping && (
            <div className="absolute bottom-4 right-4 animate-bounce">
              <ChevronRight className="w-6 h-6 text-[#facc15]" />
            </div>
          )}
          
          <div className="absolute top-2 right-4 text-[#a1a1aa] text-xs font-mono uppercase tracking-widest opacity-50">
            Click to continue
          </div>
        </div>
      </div>
      
      {/* Skip button top right */}
      <button 
        className="absolute top-4 right-4 px-4 py-2 bg-black/50 text-white/70 hover:text-white border border-white/20 text-xs font-orbitron uppercase tracking-widest z-10 hover:bg-black transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onComplete();
        }}
      >
        Skip Intro
      </button>
    </div>
  );
};
