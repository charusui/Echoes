import React, { useState, useEffect } from 'react';
import type { ActiveInstrumentProfile } from '../types';
import { useProgress } from '../context/ProgressProvider';
import { Check, X, ChevronRight } from 'lucide-react';

interface QuizScreenProps {
  profile: ActiveInstrumentProfile;
  onComplete: () => void;
}

export function QuizScreen({ profile, onComplete }: QuizScreenProps) {
  const { addXP } = useProgress();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [questionData, setQuestionData] = useState<{ q: string; opts: string[]; correctIdx: number } | null>(null);

  // Generate a dynamic question based on the instrument
  useEffect(() => {
    // A simple mock for question generation based on the instrument
    const rand = Math.random();
    if (rand < 0.33) {
      setQuestionData({
        q: `What is the Hornbostel-Sachs classification of the ${profile.instrument.name}?`,
        opts: [
          profile.instrument.hornbostelSachs,
          '111.2 - Idiophone / Bamboo Tubes',
          '321.32 - Chordophone / Lute',
          '411 - Aerophone / Lip-vibrated'
        ].sort(() => Math.random() - 0.5),
      });
    } else if (rand < 0.66) {
      setQuestionData({
        q: `Which ethno-linguistic group is primarily known for playing the ${profile.instrument.name}?`,
        opts: [
          profile.instrument.ethnoLinguisticGroup,
          'Ifugao',
          'Tagalog',
          'Tausug'
        ].sort(() => Math.random() - 0.5),
      });
    } else {
      setQuestionData({
        q: `What is the primary cultural purpose of the ${profile.instrument.name}?`,
        opts: [
          profile.instrument.culturalPurpose,
          'Military signals during battles',
          'Accompanying modern pop music',
          'Strictly for children\'s play'
        ].sort(() => Math.random() - 0.5),
      });
    }
  }, [profile]);

  useEffect(() => {
    if (questionData) {
      // Re-find the correct index after sorting
      let correct = 0;
      if (questionData.q.includes('classification')) {
        correct = questionData.opts.indexOf(profile.instrument.hornbostelSachs);
      } else if (questionData.q.includes('group')) {
        correct = questionData.opts.indexOf(profile.instrument.ethnoLinguisticGroup);
      } else {
        correct = questionData.opts.indexOf(profile.instrument.culturalPurpose);
      }
      setQuestionData(prev => prev ? { ...prev, correctIdx: correct } : null);
    }
  }, [questionData?.q]);

  const handleSelect = (idx: number) => {
    if (isRevealed) return;
    setSelectedIdx(idx);
    setIsRevealed(true);
    
    if (idx === questionData?.correctIdx) {
      addXP(10, 'quiz');
    }
  };

  if (!questionData) return null;

  return (
    <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center p-6 relative pb-safe">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="font-orbitron font-black text-crimson text-xl tracking-widest uppercase mb-2 glow-crimson">
            KNOWLEDGE CHECK
          </h2>
          <p className="font-space-mono text-light-gray/60 text-sm">
            Answer correctly for bonus XP
          </p>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-pale-pink/20 mb-8 shadow-2xl">
          <h3 className="font-space-mono font-bold text-light-gray text-lg mb-6 leading-relaxed">
            {questionData.q}
          </h3>

          <div className="space-y-3">
            {questionData.opts.map((opt, idx) => {
              let btnClass = "w-full text-left p-4 rounded-xl border font-space-mono text-sm transition-all duration-300 relative overflow-hidden ";
              let icon = null;

              if (!isRevealed) {
                btnClass += selectedIdx === idx 
                  ? "bg-dark-slate border-pale-pink text-light-gray" 
                  : "bg-obsidian border-light-gray/10 text-light-gray/80 hover:border-light-gray/30 hover:bg-dark-slate/50 active:scale-[0.98]";
              } else {
                if (idx === questionData.correctIdx) {
                  btnClass += "bg-green-900/40 border-green-500/50 text-green-100 shadow-[0_0_15px_rgba(34,197,94,0.2)]";
                  icon = <Check size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400" />;
                } else if (idx === selectedIdx) {
                  btnClass += "bg-danger/20 border-danger/50 text-danger-100";
                  icon = <X size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-danger" />;
                } else {
                  btnClass += "bg-obsidian border-light-gray/5 text-light-gray/30 opacity-50";
                }
              }

              return (
                <button 
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  className={btnClass}
                >
                  <span className="pr-8 block">{opt}</span>
                  {icon}
                </button>
              );
            })}
          </div>
        </div>

        {isRevealed && (
          <button 
            onClick={onComplete}
            className="w-full py-5 rounded-2xl font-orbitron text-sm font-bold tracking-widest uppercase
              bg-gradient-to-r from-crimson to-pale-pink text-obsidian
              hover:shadow-lg hover:shadow-crimson/40 active:scale-[0.98]
              transition-all duration-200 flex items-center justify-center gap-3 animate-judgement-pop"
          >
            CONTINUE <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
