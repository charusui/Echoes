import React, { useState, useEffect } from 'react';
import type { ActiveInstrumentProfile } from '../types';
import { useProgress } from '../context/ProgressProvider';
import { useGemini } from '../context/GeminiProvider';
import { ChevronRight, Sparkles } from 'lucide-react';
import { GEMINI_MODEL } from '../constants';

interface StoryScreenProps {
  profile: ActiveInstrumentProfile;
  onComplete: () => void;
}

interface StoryData {
  scenario: string;
  choices: {
    text: string;
    xp: number;
    feedback: string;
  }[];
}

export function StoryScreen({ profile, onComplete }: StoryScreenProps) {
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
        const text = response.text();
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
    <div className="min-h-screen bg-obsidian flex flex-col p-6 relative pb-safe">
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full pt-12">
        
        <div className="text-center mb-10">
          <h2 className="font-orbitron font-black text-pale-pink text-xl tracking-widest uppercase mb-2 glow-pale-pink">
            ECHOES OF THE PAST
          </h2>
        </div>

        {/* Story Text */}
        <div className="glass-card p-6 rounded-3xl border border-pale-pink/20 mb-8 shadow-2xl relative">
          <div className="absolute -top-4 -left-4 w-8 h-8 bg-dark-slate rounded-full border border-pale-pink/30 flex items-center justify-center">
            <Sparkles size={14} className="text-pale-pink" />
          </div>
          <p className="font-space-mono text-light-gray leading-relaxed text-sm">
            {story.scenario}
          </p>
        </div>

        {/* Choices */}
        <div className="space-y-3 mt-auto">
          {story.choices.map((choice, idx) => {
            const isSelected = selectedIdx === idx;
            const hasSelection = selectedIdx !== null;
            
            let btnClass = "w-full text-left p-4 rounded-xl border font-space-mono text-sm transition-all duration-300 ";
            
            if (!hasSelection) {
              btnClass += "bg-dark-slate border-light-gray/10 text-light-gray/80 hover:border-pale-pink/50 hover:bg-dark-slate/80 active:scale-[0.98]";
            } else if (isSelected) {
              btnClass += choice.xp === 15 
                ? "bg-green-900/40 border-green-500/50 text-green-100 shadow-[0_0_15px_rgba(34,197,94,0.2)]" 
                : choice.xp > 0 
                  ? "bg-pale-pink/20 border-pale-pink/50 text-pale-pink"
                  : "bg-danger/20 border-danger/50 text-danger-100";
            } else {
              btnClass += "bg-obsidian border-light-gray/5 text-light-gray/30 opacity-50";
            }

            return (
              <button 
                key={idx}
                onClick={() => handleSelect(idx)}
                className={btnClass}
                disabled={hasSelection}
              >
                {choice.text}
                
                {/* Feedback Dropdown */}
                {isSelected && (
                  <div className={`mt-3 pt-3 border-t text-xs leading-relaxed ${choice.xp === 15 ? 'border-green-500/30' : choice.xp > 0 ? 'border-pale-pink/30' : 'border-danger/30'}`}>
                    <span className="font-bold mb-1 block">+{choice.xp} XP</span>
                    {choice.feedback}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {selectedIdx !== null && (
          <button 
            onClick={onComplete}
            className="w-full mt-6 py-5 rounded-2xl font-orbitron text-sm font-bold tracking-widest uppercase
              bg-gradient-to-r from-pale-pink to-light-gray text-obsidian
              hover:shadow-lg hover:shadow-pale-pink/40 active:scale-[0.98]
              transition-all duration-200 flex items-center justify-center gap-3 animate-judgement-pop"
          >
            CONTINUE JOURNEY <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
