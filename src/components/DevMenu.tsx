import { useState } from 'react';
import { Settings, Unlock, Zap, Star, BookOpen, Trash2, X } from 'lucide-react';
import { useProgress } from '../context/ProgressProvider';

interface DevMenuProps {
  onOpenStudentSession: () => void;
}

const DEV_STORAGE_KEY = 'echoes_dev_mode';

/** Returns true if the dev menu should be visible */
export function isDevMenuEnabled(): boolean {
  return import.meta.env.DEV || localStorage.getItem(DEV_STORAGE_KEY) === '1';
}

export function DevMenu({ onOpenStudentSession }: DevMenuProps) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
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
        showToast('✓ Demo mode enabled. Open Korlong Hunt from Collection.');
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
    </>
  );
}
