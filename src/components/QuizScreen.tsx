import { useState } from 'react';
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

  return (
    <div className="min-h-screen bg-[#2a2d43] flex flex-col items-center justify-start p-4 pt-10 md:pt-12 relative overflow-hidden pb-12 md:pb-16 pb-safe z-0">
      
      {/* Halftone Background Pattern */}
      <div 
        className="absolute inset-0 z-[-3] opacity-30 pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#da2d46 2px, transparent 2px)', backgroundSize: '20px 20px' }}
      />
      
      {/* Slanted Background Block for dynamic layout */}
      <div className="absolute top-0 right-0 w-[120%] h-[40%] bg-[#0f0c0c] -skew-y-6 -translate-y-10 z-[-2] border-b-[8px] border-[#da2d46]" />

      <div className="w-full max-w-lg relative z-10 flex flex-col items-center">
        
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
              RETENTION QUIZ
            </span>
          </div>
        </div>

        {/* Title Area */}
        <div className="text-center mb-8">
          <h2 
            className="font-orbitron font-black text-[#e0e5ed] text-3xl md:text-4xl tracking-widest uppercase leading-none"
            style={{ textShadow: '4px 4px 0px #0f0c0c, -2px -2px 0px #da2d46' }}
          >
            KNOWLEDGE<br/>CHECK
          </h2>
        </div>

        {/* Main Comic Panel (The Question) */}
        <div className="w-full bg-[#e0e5ed] border-[6px] border-[#0f0c0c] p-5 md:p-8 shadow-[12px_12px_0px_0px_#0f0c0c] relative mb-8 -skew-x-1">
          
          {/* Top-Left Tag / Progress */}
          <div className="absolute -top-4 -left-2 bg-[#da2d46] border-[3px] border-[#0f0c0c] px-3 py-1 flex items-center gap-1.5 shadow-[4px_4px_0px_0px_#0f0c0c] -skew-x-6">
            <Sparkles size={14} className="text-[#0f0c0c] skew-x-6" />
            <span className="font-orbitron text-[10px] md:text-xs text-[#0f0c0c] font-black tracking-widest uppercase skew-x-6">
              PAGE {currentQuestionIdx + 1}/5
            </span>
          </div>

          <h3 className="font-space-mono font-bold text-[#0f0c0c] text-sm md:text-base mt-4 mb-6 leading-relaxed skew-x-1">
            {currentQuestionData.q}
          </h3>

          {/* Options Grid */}
          <div className="space-y-3 skew-x-1">
            {currentQuestionData.opts.map((opt, idx) => {
              const letters = ['A', 'B', 'C', 'D'];
              
              let btnClass = "w-full text-left p-3 md:p-4 border-[3px] transition-all duration-150 flex items-center gap-3 md:gap-4 -skew-x-2 outline-none font-space-mono font-bold text-xs md:text-sm ";
              let icon = null;

              if (!isRevealed) {
                // Default State
                btnClass += "bg-[#2a2d43] border-[#0f0c0c] text-[#e0e5ed] shadow-[4px_4px_0px_0px_#0f0c0c] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[6px_6px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none cursor-pointer";
              } else {
                // Revealed State
                btnClass += " cursor-default pointer-events-none "; // disable interaction
                
                if (idx === currentQuestionData.correctIdx) {
                  // CORRECT ANSWER
                  btnClass += "bg-[#4ade80] border-[#0f0c0c] text-[#0f0c0c] shadow-none translate-y-1 translate-x-1";
                  icon = <div className="bg-[#0f0c0c] p-1 rounded-sm skew-x-2 ml-auto"><Check size={16} className="text-[#4ade80] stroke-[4px]" /></div>;
                } else if (idx === selectedIdx) {
                  // WRONG SELECTED ANSWER
                  btnClass += "bg-[#da2d46] border-[#0f0c0c] text-[#0f0c0c] shadow-none translate-y-1 translate-x-1";
                  icon = <div className="bg-[#0f0c0c] p-1 rounded-sm skew-x-2 ml-auto"><X size={16} className="text-[#da2d46] stroke-[4px]" /></div>;
                } else {
                  // UNSELECTED WRONG ANSWER
                  btnClass += "bg-[#e0e5ed] border-[#888ea1] border-dashed text-[#888ea1] shadow-none opacity-60";
                }
              }

              return (
                <button 
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  className={btnClass}
                  disabled={isRevealed}
                >
                  <div className={`shrink-0 flex items-center justify-center w-6 h-6 md:w-8 md:h-8 border-[2px] skew-x-2 ${
                    !isRevealed ? 'bg-[#0f0c0c] border-[#0f0c0c] text-[#e0e5ed]' : 
                    idx === currentQuestionData.correctIdx ? 'bg-[#0f0c0c] border-[#0f0c0c] text-[#4ade80]' :
                    idx === selectedIdx ? 'bg-[#0f0c0c] border-[#0f0c0c] text-[#da2d46]' :
                    'bg-transparent border-[#888ea1] text-[#888ea1]'
                  }`}>
                    <span className="font-orbitron font-black">{letters[idx]}</span>
                  </div>
                  
                  <span className="flex-1 leading-snug skew-x-2">{opt}</span>
                  {icon}
                </button>
              );
            })}
          </div>
        </div>

        {/* Continue Button */}
        {isRevealed && (
          <div className="w-full flex justify-end animate-comic-pop">
            <button 
              onClick={handleNext}
              className="px-8 py-4 bg-[#da2d46] border-[4px] border-[#0f0c0c] font-orbitron text-sm md:text-base font-black tracking-widest uppercase text-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_#0f0c0c] active:translate-y-2 active:translate-x-2 active:shadow-none transition-all flex items-center gap-2 -skew-x-6"
            >
              <span className="skew-x-6">CONTINUE</span> <ChevronRight size={20} className="skew-x-6 stroke-[3px]" />
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes comic-pop {
          0% { transform: scale(0.8) translateY(20px); opacity: 0; }
          60% { transform: scale(1.05) translateY(-5px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-comic-pop {
          animation: comic-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
    </div>
  );
}