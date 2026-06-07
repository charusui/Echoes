import { useState, useEffect } from 'react';
import type { ActiveInstrumentProfile } from '../types';
import { useProgress } from '../context/ProgressProvider';
import { Check, X, ChevronRight, Sparkles, ArrowLeft } from 'lucide-react';

interface QuizScreenProps {
  profile: ActiveInstrumentProfile;
  onComplete: () => void;
  onBack: () => void;
}

export function QuizScreen({ profile, onComplete, onBack }: QuizScreenProps) {
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
        correctIdx: -1,
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
        correctIdx: -1,
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
        correctIdx: -1,
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
    <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center p-6 relative overflow-hidden pb-12 md:pb-16 pb-safe">
      {/* Background ambient light */}
      <div className="absolute top-[-10%] left-[-25%] w-[90%] h-[60%] bg-crimson/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-25%] w-[90%] h-[60%] bg-gold/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-[35%] right-[-20%] w-[60%] h-[40%] bg-purple/10 rounded-full blur-[110px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 pb-12">
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
              RETENTION QUIZ
            </span>
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="font-orbitron font-black text-light-gray text-xl tracking-widest uppercase glow-crimson">
            KNOWLEDGE CHECK
          </h2>
        </div>

        <div className="relative p-6 rounded-2xl border border-pale-pink/10 bg-gradient-to-b from-dark-slate/50 to-obsidian/70 backdrop-blur-md mb-8 shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Corner decorative accents */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-crimson/60" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-crimson/60" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-crimson/60" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-crimson/60" />

          <div className="flex items-center gap-2 mb-4 border-b border-light-gray/10 pb-3">
            <Sparkles size={16} className="text-crimson animate-pulse" />
            <span className="font-orbitron text-[10px] text-pale-pink/80 font-black tracking-widest uppercase">
              COMPREHENSION CHECK
            </span>
          </div>

          <h3 className="font-sans font-semibold text-light-gray text-base md:text-lg mb-6 leading-relaxed">
            {questionData.q}
          </h3>

          <div className="space-y-3">
            {questionData.opts.map((opt, idx) => {
              const letters = ['A', 'B', 'C', 'D'];
              
              let btnClass = "w-full text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden flex items-center gap-4 ";
              let icon = null;

              if (!isRevealed) {
                btnClass += "bg-gradient-to-br from-dark-slate/40 to-obsidian/30 border-pale-pink/10 text-light-gray/80 hover:border-crimson/50 hover:from-dark-slate/60 hover:to-obsidian/40 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-[0_4px_20px_rgba(218,45,70,0.15)]";
              } else {
                if (idx === questionData.correctIdx) {
                  btnClass += "bg-gradient-to-br from-green-950/40 to-green-900/20 border-green-500/40 text-green-100 shadow-[0_0_25px_rgba(34,197,94,0.2)]";
                  icon = <Check size={18} className="text-green-400 shrink-0 ml-auto" />;
                } else if (idx === selectedIdx) {
                  btnClass += "bg-gradient-to-br from-red-950/40 to-red-900/20 border-red-500/40 text-red-100 shadow-[0_0_25px_rgba(239,68,68,0.25)]";
                  icon = <X size={18} className="text-red-400 shrink-0 ml-auto" />;
                } else {
                  btnClass += "bg-obsidian/20 border-light-gray/5 text-light-gray/30 opacity-40";
                }
              }

              return (
                <button 
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  className={btnClass}
                  disabled={isRevealed}
                >
                  <span className={`font-space-mono text-xs px-2 py-0.5 rounded border transition-colors shrink-0 ${
                    !isRevealed 
                      ? 'border-pale-pink/20 bg-obsidian/50 text-pale-pink/60' 
                      : idx === questionData.correctIdx
                        ? 'border-green-500/30 bg-green-950/50 text-green-400'
                        : idx === selectedIdx
                          ? 'border-red-500/30 bg-red-950/50 text-red-400'
                          : 'border-light-gray/5 bg-obsidian/20 text-light-gray/20'
                  }`}>
                    {letters[idx]}
                  </span>
                  
                  <span className="flex-1 font-sans text-sm leading-relaxed">{opt}</span>
                  {icon}
                </button>
              );
            })}
          </div>
        </div>

        {isRevealed && (
          <button 
            onClick={onComplete}
            className="w-full py-4 rounded-xl font-orbitron text-xs font-black tracking-widest uppercase
              bg-gradient-to-r from-crimson to-pale-pink text-obsidian
              hover:shadow-lg hover:shadow-crimson/30 hover:-translate-y-0.5 active:translate-y-0
              transition-all duration-200 flex items-center justify-center gap-3 animate-judgement-pop"
          >
            CONTINUE <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
