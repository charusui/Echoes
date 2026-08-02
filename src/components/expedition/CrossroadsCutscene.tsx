import { useState, useMemo } from 'react';

interface CrossroadsCutsceneProps {
  onComplete: () => void;
}

export function CrossroadsCutscene({ onComplete }: CrossroadsCutsceneProps) {
  const [dialogueIndex, setDialogueIndex] = useState(0);

  const dialogue = useMemo(() => [
    { 
      name: "Lolo Boy", 
      avatar: "/assets/expedition/merchant_normal.png?v=2", 
      text: "Hey there, travelers! I'm Lolo Boy, a traveling merchant. Thank you so much for saving me from those bandits!" 
    },
    { 
      name: "Lolo Boy", 
      avatar: "/assets/expedition/merchant_normal.png?v=2", 
      text: "I was on my way to Cadence Town, but you should know... things are bad at Echo Village." 
    },
    { 
      name: "Lolo Boy", 
      avatar: "/assets/expedition/merchant_normal.png?v=2", 
      text: "Rumors say a colossal beast has nested there!" 
    },
    { 
      name: "Lolo Boy", 
      avatar: "/assets/expedition/merchant_giving.png?v=2", 
      text: "Here are some supplies I sent ahead to Maria's shop to help you on your journey. Thank you again!" 
    },
    { 
      name: "System", 
      avatar: "/assets/expedition/merchant_giving.png?v=2", 
      text: "New items unlocked in the Shop! (Mystery Key & Reverse Potion)" 
    }
  ], []);

  const handleNext = () => {
    if (dialogueIndex < dialogue.length - 1) {
      setDialogueIndex(i => i + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div 
      className="absolute inset-0 z-50 flex flex-col items-center justify-end overflow-hidden bg-black select-none pointer-events-auto"
      onClick={handleNext}
    >
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-80"
        style={{ backgroundImage: `url('/assets/expedition/crossroads_bg.png?v=2')` }}
      />
      
      {/* Large Merchant Sprite */}
      <img 
        src={dialogue[dialogueIndex].avatar} 
        className="relative z-10 h-[50vh] sm:h-[70vh] max-w-[90vw] object-contain object-bottom -mb-4 sm:-mb-8 pointer-events-none drop-shadow-[0px_0px_20px_rgba(0,0,0,0.8)] transition-all duration-300" 
        alt="Merchant"
      />
      
      {/* Dialogue Overlay */}
      <div className="relative z-50 flex items-center justify-center w-full pb-8 sm:pb-12 px-4 pointer-events-none">
        <div 
          className="pointer-events-none flex flex-col justify-center bg-[#0f0c0c]/95 border-[4px] border-[#facc15] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] p-4 sm:p-6 max-w-3xl w-full -skew-x-3"
        >
          <span className="font-orbitron font-black text-[#facc15] text-lg sm:text-2xl uppercase tracking-widest mb-2">
            {dialogue[dialogueIndex].name}
          </span>
          <span className={`font-medium text-base sm:text-xl leading-snug font-sans ${dialogue[dialogueIndex].name === 'System' ? 'text-green-400 font-bold' : 'text-white'}`}>
            {dialogue[dialogueIndex].text}
          </span>
          <div className="w-full text-right mt-3 sm:mt-4">
            <span className="text-slate-400 text-[10px] sm:text-xs font-bold animate-pulse uppercase tracking-wider inline-block">
              Click anywhere to continue...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
