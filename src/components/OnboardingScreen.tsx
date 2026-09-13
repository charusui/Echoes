import { useState } from 'react';
import { ArrowRight, Camera, Map, Music, Play } from 'pixelarticons/react';
import bg from '../assets/titlescreen/bg.jpeg';
import { PixelButton, PixelPanel } from './ui';
import { cn } from '../lib/cn';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    title: 'Be an explorer',
    description: 'Embark on an expedition across the Visayas to uncover lost musical traditions.',
    icon: <Map />,
    tile: 'bg-xp text-ink',
  },
  {
    title: 'Scan & discover',
    description: "Use your device's camera to scan real traditional Philippine instruments and add them to your collection.",
    icon: <Camera />,
    tile: 'bg-heal text-ink',
  },
  {
    title: 'Play & master',
    description: 'Play rhythm games to master each instrument, earn Harmonic Shards and unlock ancestral stories.',
    icon: <Music />,
    tile: 'bg-purple-500 text-parchment-100',
  },
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = SLIDES[currentSlide];
  const isLast = currentSlide === SLIDES.length - 1;

  const handleNext = () => {
    if (!isLast) setCurrentSlide(prev => prev + 1);
    else onComplete();
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-plum-950 px-4 py-8">
      <img src={bg} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-30 pixelated" />
      <div className="absolute inset-0 bg-gradient-to-b from-plum-950/40 via-plum-950/70 to-plum-950" aria-hidden />

      <PixelPanel frame="wood" padding="none" className="relative w-full max-w-md">
        <div key={currentSlide} className="flex flex-col items-center gap-5 px-6 pt-8 pb-6 text-center px-rise-in">
          <div className={cn('px-frame flex items-center justify-center size-32 [&_svg]:size-16', slide.tile)} style={{ ['--frame-bg' as string]: 'transparent' }}>
            {slide.icon}
          </div>
          <h2 className="font-bold text-3xl md:text-4xl leading-none text-parchment-100">{slide.title}</h2>
          <p className="text-base md:text-lg leading-snug text-parchment-300">{slide.description}</p>
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-plum-800 border-t-[3px] border-ink">
          <ol className="flex items-center gap-2" aria-label={`Step ${currentSlide + 1} of ${SLIDES.length}`}>
            {SLIDES.map((_, idx) => (
              <li
                key={idx}
                className={cn('h-3 border-2 border-ink transition-all', idx === currentSlide ? 'w-8 bg-gold-500' : 'w-3 bg-plum-600')}
              />
            ))}
          </ol>

          <div className="flex items-center gap-2">
            {!isLast && (
              <PixelButton variant="ghost" size="sm" onClick={onComplete}>Skip</PixelButton>
            )}
            <PixelButton variant="primary" icon={isLast ? <Play /> : <ArrowRight />} onClick={handleNext}>
              {isLast ? 'Start' : 'Next'}
            </PixelButton>
          </div>
        </div>
      </PixelPanel>
    </div>
  );
}
