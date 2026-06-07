import { useState, useEffect } from 'react';
import type { ActiveInstrumentProfile } from '../types';
import { useProgress } from '../context/ProgressProvider';
import { useGemini } from '../context/GeminiProvider';
import { ChevronRight, Sparkles, ArrowLeft } from 'lucide-react';
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

  if (error) {
    return (
      <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center p-6 text-center">
        <p className="text-light-gray mb-4">The ancestors are quiet right now...</p>
        <button onClick={onComplete} className="px-6 py-3 bg-dark-slate rounded-xl text-light-gray">Continue</button>
      </div>
    );
  }

  if (isLoading || !story) {
    return (
      <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center p-6 text-center pb-safe">
        <Sparkles size={48} className="text-pale-pink animate-pulse mb-6" />
        <h2 className="font-orbitron font-bold text-light-gray tracking-widest uppercase animate-pulse">
          Consulting the Ancestors...
        </h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian flex flex-col p-6 relative overflow-hidden pb-12 md:pb-16 pb-safe">
      {/* Background ambient light */}
      <div className="absolute top-[-10%] left-[-25%] w-[90%] h-[60%] bg-crimson/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-25%] w-[90%] h-[60%] bg-gold/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-[35%] right-[-20%] w-[60%] h-[40%] bg-purple/10 rounded-full blur-[110px] pointer-events-none" />

      <div className="flex-1 flex flex-col max-w-md mx-auto w-full pt-6 pb-12 relative z-10">
        
        {/* Header Bar with Back Button */}
        <div className="flex items-center justify-between mb-6 w-full">
          <button 
            onClick={onBack}
            className="px-3 py-1.5 rounded-lg bg-dark-slate/30 border border-pale-pink/10 hover:border-crimson/50 hover:bg-dark-slate/50 text-pale-pink hover:text-crimson transition-all duration-200 flex items-center justify-center gap-1.5 font-orbitron text-[10px] font-bold tracking-widest uppercase"
          >
            <ArrowLeft size={14} /> BACK
          </button>
          
          <div className="text-right">
            <span className="font-space-mono text-[9px] text-crimson font-black tracking-[0.2em] uppercase block">
              CULTURAL NARRATIVE
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="font-orbitron font-black text-light-gray text-xl tracking-widest uppercase glow-crimson">
            ECHOES OF THE PAST
          </h2>
        </div>

        {/* Story Text Box */}
        <div className="relative p-6 rounded-2xl border border-pale-pink/10 bg-gradient-to-b from-dark-slate/50 to-obsidian/70 backdrop-blur-md mb-8 shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Corner decorative accents */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-crimson/60" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-crimson/60" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-crimson/60" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-crimson/60" />

          <div className="flex items-center gap-2 mb-4 border-b border-light-gray/10 pb-3">
            <Sparkles size={16} className="text-crimson animate-pulse" />
            <span className="font-orbitron text-[10px] text-pale-pink/80 font-black tracking-widest uppercase">
              SCENARIO LOG
            </span>
          </div>

          <p className="font-sans text-light-gray/90 leading-relaxed text-sm md:text-base">
            {story.scenario}
          </p>
        </div>

        {/* Choices Container */}
        <div className="space-y-4 mt-auto">
          <span className="block font-orbitron text-[9px] text-slate-gray font-black tracking-widest uppercase mb-1">
            CHOOSE YOUR REACTION:
          </span>
          
          {story.choices.map((choice, idx) => {
            const isSelected = selectedIdx === idx;
            const hasSelection = selectedIdx !== null;
            const letters = ['A', 'B', 'C'];
            
            let btnClass = "w-full text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden flex items-start gap-4 ";
            
            if (!hasSelection) {
              btnClass += "bg-gradient-to-br from-dark-slate/40 to-obsidian/30 border-pale-pink/10 text-light-gray/80 hover:border-crimson/50 hover:from-dark-slate/60 hover:to-obsidian/40 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-[0_4px_20px_rgba(218,45,70,0.15)]";
            } else if (isSelected) {
              btnClass += choice.xp === 15 
                ? "bg-gradient-to-br from-green-950/40 to-green-900/20 border-green-500/40 text-green-100 shadow-[0_0_25px_rgba(34,197,94,0.2)]" 
                : choice.xp > 0 
                  ? "bg-gradient-to-br from-amber-950/40 to-amber-900/20 border-amber-500/40 text-amber-100 shadow-[0_0_25px_rgba(245,158,11,0.2)]"
                  : "bg-gradient-to-br from-red-950/40 to-red-900/20 border-red-500/40 text-red-100 shadow-[0_0_25px_rgba(239,68,68,0.25)]";
            } else {
              btnClass += "bg-obsidian/20 border-light-gray/5 text-light-gray/30 opacity-40";
            }

            return (
              <button 
                key={idx}
                onClick={() => handleSelect(idx)}
                className={btnClass}
                disabled={hasSelection}
              >
                <span className={`font-space-mono text-xs px-2 py-0.5 rounded border transition-colors shrink-0 ${
                  !hasSelection 
                    ? 'border-pale-pink/20 bg-obsidian/50 text-pale-pink/60' 
                    : isSelected 
                      ? choice.xp === 15
                        ? 'border-green-500/30 bg-green-950/50 text-green-400'
                        : choice.xp > 0
                          ? 'border-amber-500/30 bg-amber-950/50 text-amber-400'
                          : 'border-red-500/30 bg-red-950/50 text-red-400'
                      : 'border-light-gray/5 bg-obsidian/20 text-light-gray/20'
                }`}>
                  {letters[idx]}
                </span>

                <div className="flex-1">
                  <span className="block font-sans text-sm leading-relaxed">{choice.text}</span>
                  
                  {/* Feedback Panel */}
                  {isSelected && (
                    <div className={`mt-3 pt-3 border-t text-xs leading-relaxed transition-all duration-500 ${
                      choice.xp === 15 
                        ? 'border-green-500/20 text-green-200/90' 
                        : choice.xp > 0 
                          ? 'border-amber-500/20 text-amber-200/90' 
                          : 'border-red-500/20 text-red-200/90'
                    }`}>
                      <span className="font-bold font-orbitron block text-[10px] tracking-wider uppercase mb-1">
                        {choice.xp === 15 ? 'Optimal Reaction' : choice.xp > 0 ? 'Acceptable Reaction' : 'Cultural Faux Pas'} (+{choice.xp} XP)
                      </span>
                      {choice.feedback}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {selectedIdx !== null && (
          <button 
            onClick={onComplete}
            className="w-full mt-6 py-4 rounded-xl font-orbitron text-xs font-black tracking-widest uppercase
              bg-gradient-to-r from-crimson to-pale-pink text-obsidian
              hover:shadow-lg hover:shadow-crimson/30 hover:-translate-y-0.5 active:translate-y-0
              transition-all duration-200 flex items-center justify-center gap-3 animate-judgement-pop"
          >
            CONTINUE JOURNEY <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
