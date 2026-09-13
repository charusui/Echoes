import { useState, type ReactNode } from 'react';
import { SettingsCog as Settings, Unlock, Zap, Star, BookOpen, Trash as Trash2, Close as X, Users, Play, Check, Grid3x3 as Grid } from 'pixelarticons/react';
import { PixelButton, PixelChip, PixelIconButton, PixelModal, PixelPanel, PixelToast } from './ui';
import { cn } from '../lib/cn';
import { useProgress } from '../context/ProgressProvider';
import { getPendingReviews } from '../services/verificationService';
import type { CommunityReviewPayload } from '../services/verificationService';

interface DevMenuProps {
  onOpenStudentSession: () => void;
  onOpenKorlongHunt: () => void;
  onStartGameplay?: (instrument: string) => void;
}

// const DEV_STORAGE_KEY = 'echoes_dev_mode';

/** Returns true if the dev menu should be visible */
export function isDevMenuEnabled(): boolean {
  return true; // Forced to always show for testing
}

export function DevMenu({ onOpenStudentSession, onOpenKorlongHunt, onStartGameplay }: DevMenuProps) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showReviews, setShowReviews] = useState(false);
  const [showGameplayDemoModal, setShowGameplayDemoModal] = useState(false);
  const [reviews, setReviews] = useState<Array<CommunityReviewPayload & { ticketId: string }>>([]);
  const { unlockAllInstruments, addXP } = useProgress();

  if (!isDevMenuEnabled()) return null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleUnlockAll = () => {
    unlockAllInstruments();
    showToast('All instruments unlocked + level 5');
  };

  const handleMaxXP = () => {
    addXP(999, 'dev_menu');
    showToast('+999 XP added');
  };

  const handleOpenStudent = () => {
    setOpen(false);
    onOpenStudentSession();
  };

  const handleReset = () => {
    if (confirm('Reset ALL progress? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const actions: { label: string; sublabel: string; icon: ReactNode; onClick: () => void; tone: string }[] = [
    { label: 'Unlock all', sublabel: 'All instruments + level 5', icon: <Unlock />, onClick: handleUnlockAll, tone: 'text-gold-300' },
    {
      label: 'Unlock all levels',
      sublabel: 'Removes fog, keeps battles',
      icon: <Unlock />,
      onClick: () => {
        localStorage.setItem('echoes_dev_force_unlock', '1');
        showToast('Fog of war removed. Reloading...');
        setTimeout(() => window.location.reload(), 1000);
      },
      tone: 'text-xp',
    },
    { label: 'Max XP', sublabel: '+999 XP instantly', icon: <Zap />, onClick: handleMaxXP, tone: 'text-xp' },
    {
      label: 'Unlock Korlong',
      sublabel: 'Add the legendary instrument',
      icon: <Star />,
      onClick: () => {
        unlockAllInstruments();
        showToast('Korlong unlocked (all instruments unlocked)');
      },
      tone: 'text-gold-300',
    },
    {
      label: 'Simulate Korlong hunt',
      sublabel: 'Demo near-arrival state',
      icon: <Star />,
      onClick: () => {
        localStorage.setItem('echoes_korlong_demo_mode', '1');
        showToast('Demo mode on. Launching Korlong Hunt...');
        setTimeout(() => {
          setOpen(false);
          onOpenKorlongHunt();
        }, 800);
      },
      tone: 'text-parchment-300',
    },
    {
      label: 'Korlong gameplay demo',
      sublabel: 'Cutscene during gameplay',
      icon: <Play />,
      onClick: () => {
        setOpen(false);
        setShowGameplayDemoModal(true);
      },
      tone: 'text-parchment-300',
    },
    { label: 'Teach a student', sublabel: 'Open endgame student chat', icon: <BookOpen />, onClick: handleOpenStudent, tone: 'text-heal' },
    {
      label: 'Community reviews',
      sublabel: 'View the pending review queue',
      icon: <Users />,
      onClick: () => {
        setReviews(getPendingReviews());
        setShowReviews(true);
        setOpen(false);
      },
      tone: 'text-parchment-300',
    },
    { label: 'UI kit', sublabel: 'Open the pixel design system page', icon: <Grid />, onClick: () => { window.location.assign('?ui-kit'); }, tone: 'text-purple-300' },
    { label: 'Reset progress', sublabel: 'Clear all saved data', icon: <Trash2 />, onClick: handleReset, tone: 'text-hp-light' },
  ];

  return (
    <>
      <PixelIconButton
        className="absolute top-20 left-4 z-[200] size-10"
        variant={open ? 'primary' : 'secondary'}
        icon={open ? <X /> : <Settings />}
        label={open ? 'Close dev menu' : 'Dev menu'}
        onClick={() => setOpen(p => !p)}
      />

      {open && (
        <PixelPanel frame="wood" padding="none" className="absolute top-32 left-4 z-[199] w-72 px-rise-in">
          <p className="px-3 py-2 bg-plum-800 border-b-[3px] border-ink text-sm font-semibold text-gold-300">Dev menu · testing only</p>
          <ul className="flex flex-col max-h-[60vh] overflow-y-auto">
            {actions.map((action) => (
              <li key={action.label} className="border-b-2 border-plum-800 last:border-b-0">
                <button
                  type="button"
                  onClick={action.onClick}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-plum-800 focus-visible:outline-[3px] focus-visible:outline-gold-300 focus-visible:-outline-offset-[3px]"
                >
                  <span className={cn('shrink-0 flex [&_svg]:size-5', action.tone)} aria-hidden>{action.icon}</span>
                  <span className="min-w-0">
                    <span className={cn('block font-semibold text-sm leading-none', action.tone)}>{action.label}</span>
                    <span className="block mt-1 text-xs text-parchment-500">{action.sublabel}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </PixelPanel>
      )}

      {toast && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[300] pointer-events-none">
          <PixelToast tone="success" icon={<Check />}>{toast}</PixelToast>
        </div>
      )}

      {showReviews && (
        <PixelModal
          onClose={() => setShowReviews(false)}
          title="Community Reviews"
          icon={<Users />}
          maxWidth="max-w-md"
          footer={
            <PixelButton
              variant="danger"
              size="sm"
              onClick={() => { localStorage.removeItem('echoes_community_reviews'); setReviews([]); showToast('Queue cleared'); }}
            >
              Clear Queue
            </PixelButton>
          }
        >
          {reviews.length === 0 ? (
            <p className="py-8 text-center text-sm text-parchment-500">No pending reviews.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {reviews.map((r, i) => (
                <li key={i} className="px-frame px-frame-plum flex flex-col gap-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <PixelChip tone="gold">{r.ticketId}</PixelChip>
                    <span className="text-xs text-parchment-500">{new Date(r.timestamp).toLocaleDateString()}</span>
                  </div>
                  {r.imageBase64Thumb && (
                    <div className="px-frame px-frame-inset h-24 overflow-hidden">
                      <img src={`data:image/jpeg;base64,${r.imageBase64Thumb}`} alt="Submitted instrument" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {r.playerNote && <p className="text-sm text-parchment-300">"{r.playerNote}"</p>}
                  <PixelButton size="sm" fullWidth>Approve (+XP)</PixelButton>
                </li>
              ))}
            </ul>
          )}
        </PixelModal>
      )}

      {showGameplayDemoModal && (
        <PixelModal onClose={() => setShowGameplayDemoModal(false)} title="Gameplay Demo" icon={<Play />} maxWidth="max-w-sm">
          <p className="mb-4 text-sm text-parchment-300">Pick an instrument type to test the mid-song Korlong trigger.</p>
          <div className="flex flex-col gap-2">
            {[
              { label: 'String (Buktot)', val: 'Buktot' },
              { label: 'Drum (Tultugan)', val: 'Tultugan' },
              { label: 'Wind (Tulali)', val: 'Tulali' },
            ].map(opt => (
              <PixelButton
                key={opt.val}
                fullWidth
                onClick={() => {
                  localStorage.setItem('echoes_demo_korlong_gameplay', '1');
                  setShowGameplayDemoModal(false);
                  onStartGameplay?.(opt.val);
                }}
              >
                {opt.label}
              </PixelButton>
            ))}
          </div>
        </PixelModal>
      )}
    </>
  );
}
