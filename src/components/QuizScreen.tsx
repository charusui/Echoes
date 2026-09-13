import { useState } from 'react';
import type { ActiveInstrumentProfile } from '../types';
import { useProgress } from '../context/ProgressProvider';
import { Check, Close as X, ChevronRight, Sparkles, ArrowLeft } from 'pixelarticons/react';
import { PixelBar, PixelButton, PixelChip, PixelPanel } from './ui';
import { playUiSound } from '../hooks/useUiSound';
import { cn } from '../lib/cn';

interface QuizScreenProps {
  profile: ActiveInstrumentProfile;
  onComplete: () => void;
  onBack: () => void;
}

export function QuizScreen({ profile, onComplete, onBack }: QuizScreenProps) {
  const { addXP } = useProgress();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // Generate 5 dynamic questions based on the instrument
  const [questions] = useState(() => {
    const q1 = {
      q: `What is the Hornbostel-Sachs classification of the ${profile.instrument.name}?`,
      opts: [
        profile.instrument.hornbostelSachs,
        '111.2 - Idiophone / Bamboo Tubes',
        '321.32 - Chordophone / Lute',
        '411 - Aerophone / Lip-vibrated'
      ]
    };
    
    const q2 = {
      q: `Which ethno-linguistic group is primarily known for playing the ${profile.instrument.name}?`,
      opts: [
        profile.instrument.ethnoLinguisticGroup,
        'Ifugao',
        'Tagalog',
        'Tausug'
      ]
    };
    
    const q3 = {
      q: `What is the primary cultural purpose of the ${profile.instrument.name}?`,
      opts: [
        profile.instrument.culturalPurpose,
        'Military signals during battles',
        'Accompanying modern pop music',
        "Strictly for children's play"
      ]
    };

    const q4 = {
      q: `From which region does the ${profile.instrument.name} originate?`,
      opts: [
        profile.instrument.region,
        'Metro Manila',
        'Batanes',
        'Central Visayas'
      ]
    };

    const q5 = {
      q: `Which category does the ${profile.instrument.name} belong to?`,
      opts: [
        profile.instrument.category,
        profile.instrument.category === 'string' ? 'percussion' : 'string',
        profile.instrument.category === 'wind' ? 'percussion' : 'wind',
        'brass'
      ]
    };

    return [q1, q2, q3, q4, q5].map(q => {
      // Deduplicate options
      const uniqueOpts = Array.from(new Set(q.opts));
      let idx = 0;
      while (uniqueOpts.length < 4) {
          idx++;
          uniqueOpts.push('Unknown Option ' + idx);
      }
      
      // Deterministic pseudo-shuffle
      const shuffledOpts = uniqueOpts.slice(0, 4).sort((a, b) => {
        const valA = a.length + a.charCodeAt(0);
        const valB = b.length + b.charCodeAt(0);
        return valA - valB;
      });
      
      const correctIdx = shuffledOpts.indexOf(q.opts[0]);
      return { ...q, opts: shuffledOpts, correctIdx };
    });
  });

  const currentQuestionData = questions[currentQuestionIdx];

  const handleSelect = (idx: number) => {
    if (isRevealed) return;
    setSelectedIdx(idx);
    setIsRevealed(true);
    
    if (idx === currentQuestionData?.correctIdx) {
      addXP(10, 'quiz');
    }
  };

  const handleNext = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setIsRevealed(false);
      setSelectedIdx(null);
    } else {
      onComplete();
    }
  };

  if (questions.length === 0 || !currentQuestionData) return null;

  const ANSWER_COLORS = ['bg-xp text-ink', 'bg-heal text-ink', 'bg-purple-500 text-parchment-100', 'bg-pink-500 text-ink'];

  return (
    <div className="min-h-screen bg-plum-950 text-parchment-100 flex flex-col items-center px-4 pt-6 pb-12 pb-safe">
      <div className="w-full max-w-lg flex flex-col gap-5">
        <header className="flex items-center justify-between gap-3">
          <PixelButton size="sm" variant="ghost" icon={<ArrowLeft />} sound="ui_back" onClick={onBack}>Quit</PixelButton>
          <h1 className="font-bold text-2xl leading-none">Knowledge Check</h1>
          <PixelChip tone="gold" icon={<Sparkles />}>{currentQuestionIdx + 1} / {questions.length}</PixelChip>
        </header>

        <PixelBar kind="gold" height={8} segments={20} value={currentQuestionIdx + (isRevealed ? 1 : 0)} max={questions.length} />

        <PixelPanel frame="wood" padding="lg" className="flex flex-col gap-5">
          <h2 className="font-semibold text-xl leading-snug text-parchment-100">{currentQuestionData.q}</h2>

          <ul className="flex flex-col gap-2.5">
            {currentQuestionData.opts.map((opt, idx) => {
              const letters = ['A', 'B', 'C', 'D'];
              const isCorrect = idx === currentQuestionData.correctIdx;
              const isPicked = idx === selectedIdx;
              const state = !isRevealed ? 'idle' : isCorrect ? 'correct' : isPicked ? 'wrong' : 'dim';

              return (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => { playUiSound(isCorrect ? 'perfect' : 'miss'); handleSelect(idx); }}
                    disabled={isRevealed}
                    className={cn(
                      'px-frame w-full flex items-center gap-3 p-2.5 text-left focus-visible:outline-[3px] focus-visible:outline-gold-300',
                      state === 'idle' && 'px-frame-plum hover:brightness-115 cursor-pointer',
                      state === 'correct' && 'px-frame-parchment',
                      state === 'wrong' && 'px-frame-inset',
                      state === 'dim' && 'px-frame-inset opacity-50',
                    )}
                  >
                    <span
                      className={cn(
                        'shrink-0 size-10 flex items-center justify-center border-[3px] border-ink font-label text-base leading-none',
                        state === 'correct' ? 'bg-heal text-ink' : state === 'wrong' ? 'bg-hp text-parchment-100' : ANSWER_COLORS[idx],
                      )}
                    >
                      {state === 'correct' ? <Check className="size-5" /> : state === 'wrong' ? <X className="size-5" /> : letters[idx]}
                    </span>
                    <span className={cn('flex-1 text-base leading-snug', state === 'correct' ? 'text-ink font-semibold' : 'text-parchment-100')}>
                      {opt}
                    </span>
                    {state === 'correct' && <PixelChip tone="heal">+10 XP</PixelChip>}
                  </button>
                </li>
              );
            })}
          </ul>
        </PixelPanel>

        {isRevealed && (
          <div className="flex items-center justify-between gap-3 px-rise-in">
            <p className={cn('font-semibold text-lg', selectedIdx === currentQuestionData.correctIdx ? 'text-heal' : 'text-hp-light')}>
              {selectedIdx === currentQuestionData.correctIdx ? 'Correct!' : 'Not quite!'}
            </p>
            <PixelButton variant="primary" size="lg" icon={<ChevronRight />} onClick={handleNext}>
              {currentQuestionIdx < questions.length - 1 ? 'Next Question' : 'Continue'}
            </PixelButton>
          </div>
        )}
      </div>
    </div>
  );
}
