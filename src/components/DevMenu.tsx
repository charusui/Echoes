import { useState } from 'react';
import { Settings, Unlock, Zap, Star, BookOpen, Trash2, X, Users } from 'lucide-react';
import { useProgress } from '../context/ProgressProvider';
import { getPendingReviews } from '../services/verificationService';
import type { CommunityReviewPayload } from '../services/verificationService';

interface DevMenuProps {
  onOpenStudentSession: () => void;
  onOpenKorlongHunt: () => void;
}

// const DEV_STORAGE_KEY = 'echoes_dev_mode';

/** Returns true if the dev menu should be visible */
export function isDevMenuEnabled(): boolean {
  return true; // Forced to always show for testing
}

export function DevMenu({ onOpenStudentSession, onOpenKorlongHunt }: DevMenuProps) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState<Array<CommunityReviewPayload & { ticketId: string }>>([]);
  const { unlockAllInstruments, addXP } = useProgress();

  if (!isDevMenuEnabled()) return null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleUnlockAll = () => {
    unlockAllInstruments();
    showToast('✓ All instruments unlocked + Level 5');
  };

  const handleMaxXP = () => {
    addXP(999, 'dev_menu');
    showToast('✓ +999 XP added');
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

  const actions = [
    {
      label: 'UNLOCK ALL',
      sublabel: 'All instruments + Level 5',
      icon: <Unlock size={16} className="stroke-[2.5px]" />,
      onClick: handleUnlockAll,
      color: '#da2d46',
    },
    {
      label: 'MAX XP',
      sublabel: '+999 XP instant',
      icon: <Zap size={16} className="stroke-[2.5px]" />,
      onClick: handleMaxXP,
      color: '#da2d46',
    },
    {
      label: 'UNLOCK KORLONG',
      sublabel: 'Add legendary instrument',
      icon: <Star size={16} className="stroke-[2.5px]" />,
      onClick: () => {
        unlockAllInstruments();
        showToast('✓ Korlong unlocked (all instruments unlocked)');
      },
      color: '#da2d46',
    },
    {
      label: 'SIMULATE KORLONG HUNT',
      sublabel: 'Demo near-arrival state',
      icon: <Star size={16} className="stroke-[2.5px]" />,
      onClick: () => {
        localStorage.setItem('echoes_korlong_demo_mode', '1');
        showToast('✓ Demo mode enabled. Launching Korlong Hunt...');
        setTimeout(() => {
          setOpen(false);
          onOpenKorlongHunt();
        }, 800);
      },
      color: '#888ea1',
    },
    {
      label: 'TEACH A STUDENT',
      sublabel: 'Open endgame student chat',
      icon: <BookOpen size={16} className="stroke-[2.5px]" />,
      onClick: handleOpenStudent,
      color: '#e0e5ed',
    },
    {
      label: 'RESET PROGRESS',
      sublabel: 'Clear all localStorage data',
      icon: <Trash2 size={16} className="stroke-[2.5px]" />,
      onClick: handleReset,
      color: '#888ea1',
    },
    {
      label: 'COMMUNITY REVIEWS',
      sublabel: 'View pending review queue',
      icon: <Users size={16} className="stroke-[2.5px]" />,
      onClick: () => {
        setReviews(getPendingReviews());
        setShowReviews(true);
        setOpen(false);
      },
      color: '#e0e5ed',
    },
  ];

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(p => !p)}
        className="fixed top-4 right-4 z-[200] w-10 h-10 bg-[#0f0c0c] border-[3px] border-[#da2d46] flex items-center justify-center text-[#da2d46] shadow-[3px_3px_0px_0px_#da2d46] hover:bg-[#da2d46] hover:text-[#0f0c0c] transition-all active:translate-y-0.5 active:shadow-none"
        title="Dev Menu"
      >
        {open ? <X size={18} className="stroke-[2.5px]" /> : <Settings size={18} className="stroke-[2.5px]" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed top-16 right-4 z-[199] w-64 bg-[#0f0c0c] border-[4px] border-[#da2d46] shadow-[8px_8px_0px_0px_#da2d46]">
          {/* Panel header */}
          <div className="bg-[#da2d46] px-3 py-2 border-b-[3px] border-[#0f0c0c]">
            <p className="font-orbitron text-[10px] font-black text-[#0f0c0c] tracking-widest uppercase">
              ⚙ DEV MENU — TESTING ONLY
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col divide-y-[2px] divide-[#2a2d43]">
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className="flex items-center gap-3 px-4 py-3 text-left hover:bg-[#2a2d43] transition-colors group"
              >
                <span style={{ color: action.color }} className="shrink-0 group-hover:scale-110 transition-transform">
                  {action.icon}
                </span>
                <div>
                  <p className="font-orbitron font-black text-[10px] tracking-widest uppercase" style={{ color: action.color }}>
                    {action.label}
                  </p>
                  <p className="font-space-mono text-[9px] text-[#888ea1] mt-0.5">{action.sublabel}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Footer note */}
          <div className="border-t-[2px] border-[#2a2d43] px-3 py-2">
            <p className="font-space-mono text-[8px] text-[#888ea1] leading-relaxed">
              Visible in DEV mode or when<br />
              <code className="text-[#da2d46]">echoes_dev_mode=1</code> is set in localStorage.
            </p>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] bg-[#0f0c0c] border-[3px] border-[#da2d46] px-4 py-2 shadow-[4px_4px_0px_0px_#da2d46] -skew-x-6 pointer-events-none">
          <p className="font-space-mono text-xs font-black text-[#da2d46] skew-x-6 whitespace-nowrap">{toast}</p>
        </div>
      )}

      {/* Community Reviews Modal */}
      {showReviews && (
        <div className="fixed inset-0 z-[250] bg-[#0f0c0c]/80 flex items-center justify-center p-4">
          <div className="bg-[#2a2d43] border-[4px] border-[#da2d46] w-full max-w-md max-h-[80vh] flex flex-col shadow-[8px_8px_0px_0px_#0f0c0c] -skew-x-2">
            <div className="flex justify-between items-center bg-[#da2d46] p-3 border-b-[4px] border-[#0f0c0c] skew-x-2">
              <h3 className="font-orbitron font-black text-[#0f0c0c] text-sm tracking-widest uppercase">Community Reviews</h3>
              <button onClick={() => setShowReviews(false)} className="text-[#0f0c0c] hover:scale-110 transition-transform">
                <X size={20} className="stroke-[3px]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 skew-x-2 custom-scrollbar">
              {reviews.length === 0 ? (
                <p className="font-space-mono text-xs text-[#888ea1] text-center py-8">No pending reviews in queue.</p>
              ) : (
                reviews.map((r, i) => (
                  <div key={i} className="bg-[#0f0c0c] border-[3px] border-[#888ea1] p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="font-space-mono text-[10px] text-[#da2d46] font-bold">{r.ticketId}</span>
                      <span className="font-space-mono text-[9px] text-[#888ea1]">{new Date(r.timestamp).toLocaleDateString()}</span>
                    </div>
                    {r.imageBase64Thumb && (
                      <div className="h-24 w-full bg-[#2a2d43] overflow-hidden border-[2px] border-[#888ea1]">
                        <img src={`data:image/jpeg;base64,${r.imageBase64Thumb}`} alt="Thumb" className="w-full h-full object-cover opacity-70" />
                      </div>
                    )}
                    {r.playerNote && (
                      <p className="font-space-mono text-[10px] text-[#e0e5ed] italic border-l-[2px] border-[#da2d46] pl-2 mt-1">"{r.playerNote}"</p>
                    )}
                    <button className="mt-2 w-full py-1.5 bg-[#da2d46] text-[#0f0c0c] font-orbitron font-black text-[10px] uppercase transition-colors hover:bg-[#e0e5ed]">APPROVE (+XP)</button>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 bg-[#0f0c0c] border-t-[4px] border-[#da2d46] skew-x-2">
              <button 
                onClick={() => { localStorage.removeItem('echoes_community_reviews'); setReviews([]); showToast('Queue cleared'); }} 
                className="w-full py-2 bg-[#888ea1] text-[#0f0c0c] font-orbitron font-black text-xs uppercase shadow-[3px_3px_0px_0px_#0f0c0c] active:translate-y-1 active:shadow-none"
              >
                CLEAR QUEUE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
