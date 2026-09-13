import { useState, useEffect } from 'react';
import type { ActiveInstrumentProfile } from '../types';
import { useProgress } from '../context/ProgressProvider';
import { useGemini } from '../context/GeminiProvider';
import { ChevronRight, ArrowLeft } from 'pixelarticons/react';
import { PixelButton, PixelChip, PixelPanel } from './ui';
import { playUiSound } from '../hooks/useUiSound';
import { cn } from '../lib/cn';
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
      <div className="min-h-screen bg-plum-950 text-parchment-100 flex items-center justify-center p-6">
        <PixelPanel frame="wood" padding="lg" className="max-w-sm flex flex-col items-center gap-4 text-center">
          <h2 className="font-bold text-2xl leading-none">The story went quiet</h2>
          <p className="text-base text-parchment-300">We couldn't reach the storyteller right now. Let's keep going!</p>
          <PixelButton variant="primary" fullWidth icon={<ChevronRight />} onClick={onComplete}>Continue</PixelButton>
        </PixelPanel>
      </div>
    );
  }

  // ─── LOADING STATE ────────────────────────────────────────────────────────
  if (isLoading || !story) {
    return (
      <div className="min-h-screen bg-plum-950 text-parchment-100 flex items-center justify-center p-6">
        <PixelPanel frame="wood" padding="lg" className="flex flex-col items-center gap-4 text-center" aria-live="polite">
          <h2 className="font-bold text-2xl leading-none">Gathering a story...</h2>
          <div className="flex gap-2" aria-hidden>
            {[0, 150, 300].map(delay => (
              <span key={delay} className="size-4 border-2 border-ink bg-gold-500 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
            ))}
          </div>
        </PixelPanel>
      </div>
    );
  }

  // ─── MAIN STORY CONTENT ───────────────────────────────────────────────────
  const OUTCOME = (xp: number) =>
    xp >= 15 ? { label: 'Great choice', tone: 'heal' as const, frame: 'px-frame-parchment' }
      : xp > 0 ? { label: 'Okay choice', tone: 'gold' as const, frame: 'px-frame-parchment' }
        : { label: 'Not respectful', tone: 'hp' as const, frame: 'px-frame-inset' };

  return (
    <div className="min-h-screen bg-plum-950 text-parchment-100 flex flex-col items-center px-4 pt-6 pb-12 pb-safe">
      <div className="w-full max-w-lg flex flex-col gap-5">
        <header className="flex items-center justify-between gap-3">
          <PixelButton size="sm" variant="ghost" icon={<ArrowLeft />} sound="ui_back" onClick={onBack}>Quit</PixelButton>
          <h1 className="font-bold text-2xl leading-none">Story Time</h1>
          <span className="w-16" aria-hidden />
        </header>

        <PixelPanel frame="parchment" padding="lg" title="What happens">
          <p className="text-lg leading-snug text-ink">{story.scenario}</p>
        </PixelPanel>

        <section className="flex flex-col gap-2.5">
          <h2 className="font-semibold text-base text-parchment-300">What do you do?</h2>
          {story.choices.map((choice, idx) => {
            const isSelected = selectedIdx === idx;
            const hasSelection = selectedIdx !== null;
            const outcome = OUTCOME(choice.xp);
            const letters = ['A', 'B', 'C'];
            const colors = ['bg-xp text-ink', 'bg-heal text-ink', 'bg-purple-500 text-parchment-100'];

            return (
              <button
                key={idx}
                type="button"
                onClick={() => { playUiSound(choice.xp >= 15 ? 'perfect' : choice.xp > 0 ? 'good' : 'miss'); handleSelect(idx); }}
                disabled={hasSelection}
                className={cn(
                  'px-frame w-full flex flex-col gap-2 p-3 text-left focus-visible:outline-[3px] focus-visible:outline-gold-300',
                  !hasSelection && 'px-frame-plum hover:brightness-115',
                  isSelected && outcome.frame,
                  hasSelection && !isSelected && 'px-frame-inset opacity-50',
                )}
              >
                <span className="flex items-center gap-3">
                  <span className={cn('shrink-0 size-10 flex items-center justify-center border-[3px] border-ink font-label text-base leading-none', colors[idx])}>
                    {letters[idx]}
                  </span>
                  <span className={cn('flex-1 text-base leading-snug', isSelected && outcome.frame === 'px-frame-parchment' ? 'text-ink font-semibold' : 'text-parchment-100')}>
                    {choice.text}
                  </span>
                </span>
                {isSelected && (
                  <span className="flex flex-col gap-2 pt-2 border-t-2 border-parchment-300 px-rise-in">
                    <PixelChip tone={outcome.tone} className="self-start">{outcome.label} · +{choice.xp} XP</PixelChip>
                    <span className={cn('text-sm leading-snug', outcome.frame === 'px-frame-parchment' ? 'text-wood-700' : 'text-parchment-300')}>{choice.feedback}</span>
                  </span>
                )}
              </button>
            );
          })}
        </section>

        {selectedIdx !== null && (
          <PixelButton variant="primary" size="lg" className="self-end px-rise-in" icon={<ChevronRight />} onClick={onComplete}>
            Continue
          </PixelButton>
        )}
      </div>
    </div>
  );
}
