import { useState, useEffect } from 'react';
import type { ActiveInstrumentProfile } from '../types';
import { useProgress } from '../context/ProgressProvider';
import { useGemini } from '../context/GeminiProvider';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { GEMINI_MODEL } from '../constants';

interface StoryScreenProps {
  profile: ActiveInstrumentProfile;
  onComplete: () => void;
  onBack: () => void;
}

interface StoryData {
  scenario: string;
  choices: {
    text: string;
    xp: number;
    feedback: string;
  }[];
}

export function StoryScreen({ profile, onComplete, onBack }: StoryScreenProps) {
  const { addXP } = useProgress();
  const { client } = useGemini();
  
  const [story, setStory] = useState<StoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function generateStory() {
      if (!client) return;
      try {
        const prompt = `You are a storyteller in a traditional Philippine setting. 
The player has just learned to play the ${profile.instrument.name} (${profile.instrument.hornbostelSachs}).
Write a 2-sentence scenario involving the player and this instrument in a cultural context (e.g., a festival, a ritual, or a village gathering).
Then, provide 3 choices for the player to react to the situation. 
One choice must be culturally optimal (15 XP), one neutral (5 XP), and one poor/disrespectful (0 XP).
Return strictly in this JSON format:
{
  "scenario": "...",
  "choices": [
    { "text": "...", "xp": 15, "feedback": "..." },
    { "text": "...", "xp": 5, "feedback": "..." },
    { "text": "...", "xp": 0, "feedback": "..." }
  ]
}`;

        const response = await client.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.7,
          }
        });

        if (!mounted) return;
        const text = response.text;
        if (!text) {
          throw new Error("Empty response from story generator");
        }
        const data = JSON.parse(text) as StoryData;
        // Shuffle choices so 15XP isn't always first
        data.choices = data.choices.sort(() => Math.random() - 0.5);
        setStory(data);
        setIsLoading(false);
      } catch (e) {
        console.error("Story generation failed:", e);
        if (mounted) {
          setError(true);
          setIsLoading(false);
        }
      }
    }

    generateStory();
    return () => { mounted = false; };
  }, [client, profile]);

  const handleSelect = (idx: number) => {
    if (selectedIdx !== null) return;
    setSelectedIdx(idx);
    const choice = story!.choices[idx];
    if (choice.xp > 0) {
      addXP(choice.xp, 'story');
    }
  };

  // ─── ERROR STATE ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#2a2d43] flex flex-col items-center justify-center p-6 relative z-0">
        <div className="absolute inset-0 z-[-1] opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#da2d46 2px, transparent 2px)', backgroundSize: '20px 20px' }} />
        
        <div className="bg-[#f0dde0] border-[6px] border-[#0f0c0c] p-6 -skew-x-2 shadow-[8px_8px_0px_0px_#da2d46] text-center max-w-sm">
          <div className="inline-block bg-[#0f0c0c] text-[#da2d46] px-3 py-1 mb-4 font-orbitron font-black uppercase tracking-widest -skew-x-6">
            SYSTEM FAILURE
          </div>
          <p className="font-space-mono font-bold text-[#0f0c0c] mb-6 skew-x-2">
            The ancestors are quiet right now. Transmission lost.
          </p>
          <button 
            onClick={onComplete} 
            className="w-full px-6 py-3 bg-[#da2d46] border-[4px] border-[#0f0c0c] text-[#0f0c0c] font-orbitron font-black tracking-widest uppercase shadow-[4px_4px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all skew-x-2"
          >
            CONTINUE
          </button>
        </div>
      </div>
    );
  }

  // ─── LOADING STATE ────────────────────────────────────────────────────────
  if (isLoading || !story) {
    return (
      <div className="min-h-screen bg-[#2a2d43] flex flex-col items-center justify-center p-6 relative z-0">
        <div className="absolute inset-0 z-[-1] opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#da2d46 2px, transparent 2px)', backgroundSize: '20px 20px' }} />
        
        <div className="bg-[#0f0c0c] border-[4px] border-[#da2d46] p-8 -skew-x-2 shadow-[8px_8px_0px_0px_#da2d46] text-center animate-comic-pulse">
          <h2 className="font-orbitron font-black text-[#e0e5ed] text-xl md:text-2xl tracking-widest uppercase skew-x-2">
            Consulting<br/>Ancestors...
          </h2>
          <div className="mt-4 flex justify-center gap-2 skew-x-2">
            <div className="w-4 h-4 bg-[#da2d46] border-[2px] border-[#e0e5ed] animate-block-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-4 h-4 bg-[#da2d46] border-[2px] border-[#e0e5ed] animate-block-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-4 h-4 bg-[#da2d46] border-[2px] border-[#e0e5ed] animate-block-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>

        <style>{`
          @keyframes comic-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(0.98); opacity: 0.9; }
          }
          @keyframes block-bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
          .animate-comic-pulse { animation: comic-pulse 2s ease-in-out infinite; }
          .animate-block-bounce { animation: block-bounce 0.6s infinite ease-in-out; }
        `}</style>
      </div>
    );
  }

  // ─── MAIN STORY CONTENT ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#2a2d43] flex flex-col p-4 pt-10 md:pt-12 relative overflow-hidden pb-12 md:pb-16 pb-safe z-0">
      
      {/* Halftone Pattern Background */}
      <div 
        className="absolute inset-0 z-[-3] opacity-30 pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#da2d46 2px, transparent 2px)', backgroundSize: '20px 20px' }}
      />
      
      {/* Heavy Diagonal Background Block */}
      <div className="absolute top-0 right-0 w-[120%] h-[35%] bg-[#0f0c0c] -skew-y-3 -translate-y-10 z-[-2] border-b-[8px] border-[#da2d46]" />

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full pt-4 pb-12 relative z-10">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between w-full mb-8">
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-[#f0dde0] border-[3px] border-[#0f0c0c] hover:bg-[#da2d46] text-[#0f0c0c] transition-all flex items-center gap-1.5 font-orbitron text-[10px] md:text-xs font-black tracking-widest uppercase -skew-x-6 shadow-[3px_3px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none"
          >
            <ArrowLeft size={16} className="skew-x-6 stroke-[3px]" /> 
            <span className="skew-x-6 hidden sm:block">ABORT</span>
          </button>
          
          <div className="bg-[#0f0c0c] border-[3px] border-[#da2d46] px-3 py-1 -skew-x-6 shadow-[4px_4px_0px_0px_#da2d46]">
            <span className="font-space-mono text-[9px] md:text-xs text-[#f0dde0] font-black tracking-widest uppercase skew-x-6 block">
              CULTURAL NARRATIVE
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h2 
            className="font-orbitron font-black text-[#e0e5ed] text-3xl md:text-4xl tracking-widest uppercase leading-none"
            style={{ textShadow: '4px 4px 0px #0f0c0c, -2px -2px 0px #da2d46' }}
          >
            ECHOES<br/>OF THE PAST
          </h2>
        </div>

        {/* Story Text Box (Narrator Panel) */}
        <div className="w-full bg-[#e0e5ed] border-[6px] border-[#0f0c0c] p-5 md:p-8 shadow-[12px_12px_0px_0px_#0f0c0c] relative mb-10 -skew-x-1">
          {/* Top-Left Tag */}
          <div className="absolute -top-4 -left-2 bg-[#da2d46] border-[3px] border-[#0f0c0c] px-3 py-1 shadow-[4px_4px_0px_0px_#0f0c0c] -skew-x-6">
            <span className="font-orbitron text-[10px] md:text-xs text-[#0f0c0c] font-black tracking-widest uppercase skew-x-6 block">
              SCENARIO LOG
            </span>
          </div>

          <p className="font-space-mono font-bold text-[#0f0c0c] text-sm md:text-base mt-2 leading-relaxed skew-x-1">
            {story.scenario}
          </p>
        </div>

        {/* Choices Container */}
        <div className="space-y-4 mt-auto">
          <div className="inline-block bg-[#0f0c0c] border-[2px] border-[#e0e5ed] px-2 py-0.5 mb-2 -skew-x-6">
            <span className="block font-space-mono text-[10px] text-[#e0e5ed] font-black tracking-widest uppercase skew-x-6">
              CHOOSE YOUR REACTION:
            </span>
          </div>
          
          {story.choices.map((choice, idx) => {
            const isSelected = selectedIdx === idx;
            const hasSelection = selectedIdx !== null;
            const letters = ['A', 'B', 'C'];
            
            let btnClass = "w-full text-left p-4 md:p-5 border-[4px] transition-all duration-300 relative flex flex-col items-start gap-2 -skew-x-2 outline-none ";
            let letterClass = "font-orbitron font-black w-6 h-6 md:w-8 md:h-8 border-[2px] flex items-center justify-center shrink-0 skew-x-2 ";

            if (!hasSelection) {
              // Unselected idle state
              btnClass += "bg-[#2a2d43] border-[#0f0c0c] text-[#e0e5ed] shadow-[4px_4px_0px_0px_#0f0c0c] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none cursor-pointer";
              letterClass += "bg-[#0f0c0c] border-[#0f0c0c] text-[#e0e5ed]";
            } else if (isSelected) {
              // Selected state (Locking down the clicked option)
              btnClass += "shadow-none translate-y-1 translate-x-1 cursor-default ";
              letterClass += "bg-[#0f0c0c] border-[#0f0c0c] ";
              
              if (choice.xp === 15) {
                btnClass += "bg-[#4ade80] border-[#0f0c0c] text-[#0f0c0c]"; // Green (Optimal)
                letterClass += "text-[#4ade80]";
              } else if (choice.xp > 0) {
                btnClass += "bg-[#fbbf24] border-[#0f0c0c] text-[#0f0c0c]"; // Yellow (Neutral)
                letterClass += "text-[#fbbf24]";
              } else {
                btnClass += "bg-[#da2d46] border-[#0f0c0c] text-[#0f0c0c]"; // Red (Poor)
                letterClass += "text-[#da2d46]";
              }
            } else {
              // Unselected disabled state
              btnClass += "bg-[#e0e5ed] border-[#888ea1] border-dashed text-[#888ea1] shadow-none opacity-60 pointer-events-none";
              letterClass += "bg-transparent border-[#888ea1] text-[#888ea1]";
            }

            return (
              <button 
                key={idx}
                onClick={() => handleSelect(idx)}
                className={btnClass}
                disabled={hasSelection}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={letterClass}>
                    <span>{letters[idx]}</span>
                  </div>
                  <span className="flex-1 font-space-mono font-bold text-sm leading-snug skew-x-2">
                    {choice.text}
                  </span>
                </div>
                
                {/* Feedback Panel (Appears inside the selected choice) */}
                {isSelected && (
                  <div className={`mt-3 w-full pt-3 border-t-[3px] border-[#0f0c0c]/20 skew-x-2 animate-comic-pop`}>
                    <div className="font-orbitron font-black text-[10px] md:text-xs tracking-widest uppercase mb-2 bg-[#0f0c0c] text-[#e0e5ed] inline-block px-2 py-0.5">
                      {choice.xp === 15 ? 'OPTIMAL' : choice.xp > 0 ? 'ACCEPTABLE' : 'FAUX PAS'} [+{(choice.xp).toString()} XP]
                    </div>
                    <p className="font-space-mono text-xs md:text-sm font-bold leading-relaxed">
                      {choice.feedback}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {selectedIdx !== null && (
          <div className="w-full flex justify-end mt-8 animate-comic-pop">
            <button 
              onClick={onComplete}
              className="px-8 py-4 bg-[#da2d46] border-[4px] border-[#0f0c0c] font-orbitron text-sm md:text-base font-black tracking-widest uppercase text-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_#0f0c0c] active:translate-y-2 active:translate-x-2 active:shadow-none transition-all flex items-center gap-2 -skew-x-6"
            >
              <span className="skew-x-6">CONTINUE</span> <ChevronRight size={20} className="skew-x-6 stroke-[3px]" />
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes comic-pop {
          0% { transform: scale(0.9) translateY(10px); opacity: 0; }
          60% { transform: scale(1.02) translateY(-2px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-comic-pop {
          animation: comic-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
    </div>
  );
}