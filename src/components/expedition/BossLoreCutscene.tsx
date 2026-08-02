import React, { useState, useEffect } from 'react';
import { ChevronRight, Swords } from 'lucide-react';

interface BossLoreCutsceneProps {
  bossId: string;
  onComplete: () => void;
}

interface BossLoreData {
  name: string;
  title: string;
  origin: string;
  tagColor: string;
  glowColor: string;
  slides: { headline: string; body: string }[];
  battleCry: string;
}

const BOSS_LORE: Record<string, BossLoreData> = {
  wakwak: {
    name: 'WAKWAK',
    title: 'The Night Stalker of the Visayas',
    origin: 'Visayan Mythology',
    tagColor: '#da2d46',
    glowColor: 'rgba(218,45,70,0.4)',
    slides: [
      {
        headline: 'Born from Darkness',
        body: "The Wakwak is a vampiric, bird-like creature from ancient Visayan folklore. Its name is onomatopoeic - derived from the rhythmic flapping of its leathery, bat-like wings as it hunts through the night sky.",
      },
      {
        headline: 'A Warning in Sound',
        body: "Villagers knew the Wakwak was near by its wings. If the \"wak-wak\" sound grew loud, the creature was far away. If it grew faint - it was already upon you, preparing to strike with razor-sharp talons.",
      },
      {
        headline: 'Instrument of Fear',
        body: "Pre-colonial Visayans used the Wakwak myth to explain unexplained deaths and illnesses. It served as a cautionary force, keeping the community alert to dangers lurking beyond the firelight.",
      },
      {
        headline: 'Now It Sings',
        body: "Corrupted by the Great Dissonance, this Wakwak has attuned a stolen instrument to weaponize its screech. Weaken it below 35% HP - then use ATTUNE to seal its resonance and capture it.",
      },
    ],
    battleCry: 'The screech of wings fills Echo Village...',
  },
  bakunawa: {
    name: 'BAKUNAWA',
    title: 'The Moon-Devouring Sea Serpent',
    origin: 'Visayan & Bicol Mythology',
    tagColor: '#0ea5e9',
    glowColor: 'rgba(14,165,233,0.4)',
    slides: [
      {
        headline: 'The Moon Eater',
        body: "The Bakunawa is a colossal sea serpent from Visayan mythology, believed to cause lunar eclipses by swallowing the moon. Its name means \"bent snake\" - a naga of the deep ocean.",
      },
      {
        headline: 'Seven Moons',
        body: "Legend says there were once seven moons in the sky. Mesmerized by their beauty, the Bakunawa rose from the ocean and swallowed them one by one. Only Haliya, goddess of the moon, escaped its hunger.",
      },
      {
        headline: 'The Ritual of Sound',
        body: "When a lunar eclipse came, ancient Visayans believed the Bakunawa was striking again. Communities would bang drums, gongs, and panastanes to startle the serpent and drive it back into the sea.",
      },
      {
        headline: 'The Depths Stir',
        body: "Empowered by the Great Dissonance, the Bakunawa has risen once more. Its roar distorts sound itself. Your party must play in perfect harmony - Rhythm, Skill, and Unity - or be silenced forever.",
      },
    ],
    battleCry: 'The ocean trembles... the serpent awakens.',
  },
  santelmo: {
    name: 'SANTELMO',
    title: 'The Wandering Spirit of Fire',
    origin: 'Philippine Folk Belief',
    tagColor: '#f97316',
    glowColor: 'rgba(249,115,22,0.4)',
    slides: [
      {
        headline: 'Soul of the Restless Dead',
        body: "Santelmo - short for Apoy ni San Elmo, \"St. Elmo's Fire\" - is the restless soul of one who died a violent or tragic death, often near water. It manifests as a glowing ball of fire: orange, red, blue, or violet.",
      },
      {
        headline: 'The Deceiver',
        body: "The Santelmo is known to trick travelers. It leads them off their path, causing them to wander in circles through swamps and fields until exhausted. Provincial folk say turning your clothes inside out breaks its enchantment.",
      },
      {
        headline: 'Science and Spirit',
        body: "Modern science may explain it as ball lightning or oxidizing swamp gases - but in the Philippines, the Santelmo remains a vessel of ancestral memory: a soul tethered to the world by unfinished business.",
      },
      {
        headline: 'An Unquiet Flame',
        body: "This Santelmo has been corrupted beyond a simple spirit. It channels dissonant energy into a blazing musical assault. Counter its rhythmic fire with perfect timing - Parry, Defend, and strike back hard.",
      },
    ],
    battleCry: 'A ball of fire drifts through the darkness...',
  },
};

const DEFAULT_LORE: BossLoreData = {
  name: 'BOSS ENCOUNTER',
  title: 'A Corrupted Creature Awakens',
  origin: 'Philippine Mythology',
  tagColor: '#facc15',
  glowColor: 'rgba(250,204,21,0.4)',
  slides: [
    {
      headline: 'The Dissonance Spreads',
      body: "A creature twisted by the Great Dissonance blocks your path. It has absorbed corrupted sonic energy and turned it into a weapon. Prepare your party and choose your actions wisely.",
    },
  ],
  battleCry: 'A corrupted presence looms ahead...',
};

export const BossLoreCutscene: React.FC<BossLoreCutsceneProps> = ({ bossId, onComplete }) => {
  const lore = BOSS_LORE[bossId] ?? DEFAULT_LORE;
  const [slideIndex, setSlideIndex] = useState(0);
  const [typewriterText, setTypewriterText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showFlash, setShowFlash] = useState(true);

  const currentSlide = lore.slides[slideIndex]!;
  const fullText = currentSlide.body;
  const isLast = slideIndex === lore.slides.length - 1;

  useEffect(() => {
    const t = setTimeout(() => setShowFlash(false), 50);
    const bgm = new Audio('/assets/audio/bgm/before_boss_fight_bgm.mp3');
    bgm.loop = true;
    bgm.volume = 0.4;
    bgm.play().catch(() => {});
    return () => {
      clearTimeout(t);
      bgm.pause();
      bgm.currentTime = 0;
    };
  }, []);

  useEffect(() => {
    setTypewriterText('');
    setIsTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTypewriterText(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 18);
    return () => clearInterval(interval);
  }, [slideIndex, fullText]);

  const handleNext = () => {
    if (isTyping) {
      setTypewriterText(fullText);
      setIsTyping(false);
      return;
    }
    if (isLast) {
      onComplete();
    } else {
      setSlideIndex(s => s + 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0b0f] overflow-hidden"
      onClick={handleNext}
    >
      <div
        className={`absolute inset-0 z-50 pointer-events-none transition-opacity duration-700 ease-out ${
          showFlash ? 'opacity-80' : 'opacity-0'
        }`}
        style={{ backgroundColor: lore.tagColor }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${lore.glowColor} 0%, transparent 70%)`,
          animation: 'lorePulse 3s ease-in-out infinite',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)' }}
      />

      {/* Styled header bar with thick border and shadow */}
      <div className="w-full border-b-[4px] border-[#0f0c0c] shadow-[0_4px_0_0_#0f0c0c] relative z-10">
        <div className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: lore.tagColor }}>
          <div className="flex items-center gap-3">
            <span className="font-space-mono font-black text-[10px] text-white/90 uppercase tracking-[0.3em] drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">CODEX ENTRY</span>
            <span className="font-space-mono font-black text-[10px] text-white/90 uppercase tracking-[0.3em] drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">//</span>
            <span className="font-space-mono font-black text-[10px] text-white uppercase tracking-[0.3em] drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">{lore.origin}</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onComplete(); }}
            className="px-3 py-1 bg-black/40 hover:bg-black/60 text-white font-orbitron font-black text-[10px] uppercase tracking-wider border-[2px] border-white/80 hover:border-white transition-all shadow-[2px_2px_0px_0px_#000] -skew-x-6"
          >
            <span className="skew-x-6 block">SKIP LORE</span>
          </button>
        </div>
      </div>

      <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col justify-center px-6 sm:px-10 py-8 relative z-10">
        
        {/* Boss Name Title */}
        <div className="flex items-center gap-4 mb-6">
          <div>
            <h1
              className="font-orbitron font-black text-4xl sm:text-5xl leading-none uppercase"
              style={{ color: lore.tagColor, textShadow: `4px 4px 0px #0f0c0c, 0 0 30px ${lore.tagColor}` }}
            >
              {lore.name}
            </h1>
            <p className="font-space-mono text-sm text-slate-300 font-bold mt-1 uppercase tracking-widest drop-shadow-[1px_1px_0_#0f0c0c]">{lore.title}</p>
          </div>
        </div>

        {/* Progress Dots with styling */}
        <div className="flex gap-2 mb-6">
          {lore.slides.map((_, i) => (
            <div
              key={i}
              className="h-2 border-[2px] border-[#0f0c0c] transition-all duration-300 shadow-[2px_2px_0_0_#0f0c0c] -skew-x-6"
              style={{ width: i === slideIndex ? '40px' : '12px', backgroundColor: i <= slideIndex ? lore.tagColor : '#1e2238' }}
            />
          ))}
        </div>

        {/* Skewed Headline Tag */}
        <div
          className="inline-block px-4 py-1.5 mb-4 font-orbitron font-black text-xs uppercase tracking-widest border-[3px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] -skew-x-3 self-start"
          style={{ backgroundColor: lore.tagColor, color: '#0f0c0c' }}
        >
          <span className="skew-x-3 block drop-shadow-[1px_1px_0_rgba(255,255,255,0.3)]">{currentSlide.headline}</span>
        </div>

        {/* Typewriter Text Box with Skew and Thick Borders */}
        <div className="bg-[#151828]/95 border-[3px] border-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] p-6 sm:p-8 mb-8 min-h-[120px] -skew-x-2">
          <p className="font-space-mono text-sm sm:text-base text-slate-200 font-bold leading-relaxed skew-x-2 drop-shadow-[1px_1px_0_#0f0c0c]">
            {typewriterText}
            {isTyping && (
              <span className="inline-block w-2 h-4 ml-1 align-middle animate-pulse" style={{ backgroundColor: lore.tagColor }} />
            )}
          </p>
        </div>

        {isLast && !isTyping && (
          <p className="font-orbitron font-black text-sm sm:text-base italic text-center mb-6 animate-pulse drop-shadow-[2px_2px_0_#0f0c0c]" style={{ color: lore.tagColor }}>
            "{lore.battleCry}"
          </p>
        )}

        {/* Bottom controls */}
        <div className="flex items-center justify-between mt-auto mb-4">
          <span className="font-space-mono text-[10px] text-slate-400 uppercase tracking-widest font-black drop-shadow-[1px_1px_0_#0f0c0c]">TAP ANYWHERE TO CONTINUE</span>
          <button
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="flex items-center gap-2 px-6 py-3 font-orbitron font-black text-sm uppercase border-[3px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] transition-all active:translate-y-1 active:shadow-none hover:scale-105 -skew-x-3"
            style={{ backgroundColor: isLast && !isTyping ? lore.tagColor : '#1e2238', color: isLast && !isTyping ? '#0f0c0c' : 'white' }}
          >
            <div className="flex items-center gap-2 skew-x-3">
              {isLast && !isTyping ? (
                <><Swords className="w-5 h-5" /><span>ENTER BATTLE</span></>
              ) : (
                <><span>NEXT</span><ChevronRight className="w-5 h-5" /></>
              )}
            </div>
          </button>
        </div>
      </div>

      <div className="w-full h-2 border-t-[3px] border-[#0f0c0c]" style={{ backgroundColor: lore.tagColor }} />

      <style>{`
        @keyframes lorePulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
