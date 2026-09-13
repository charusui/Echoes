import { Check, Flag, Lock, Notes } from 'pixelarticons/react';
import { type ExpeditionQuest } from '../../types/expedition';
import { PixelBar, PixelButton, PixelChip, PixelModal } from '../ui';
import { cn } from '../../lib/cn';

interface QuestsModalProps {
  quests: Record<string, ExpeditionQuest>;
  onClose: () => void;
}

export function QuestsModal({ quests, onClose }: QuestsModalProps) {
  const questList = Object.values(quests);
  const completedCount = questList.filter(q => q.status === 'completed').length;
  const totalCount = questList.length;

  return (
    <PixelModal
      onClose={onClose}
      title="Quest Journal"
      subtitle={`${completedCount} of ${totalCount} quests complete`}
      icon={<Notes />}
      maxWidth="max-w-2xl"
      footer={<PixelButton variant="primary" sound="ui_back" onClick={onClose}>Back to Map</PixelButton>}
    >
      <PixelBar kind="heal" value={completedCount} max={totalCount || 1} height={8} segments={0} className="mb-4" />

      <ol className="flex flex-col gap-3">
        {questList.map(quest => {
          const isCompleted = quest.status === 'completed';
          const isActive = quest.status === 'active';
          const isLocked = quest.status === 'locked';

          return (
            <li
              key={quest.id}
              className={cn(
                'px-frame flex items-start gap-3 p-3',
                isActive && 'px-frame-parchment',
                isCompleted && 'px-frame-plum',
                isLocked && 'px-frame-inset opacity-70',
              )}
              title={isLocked ? 'Complete earlier quests to unlock' : undefined}
            >
              <span
                className={cn(
                  'shrink-0 size-9 flex items-center justify-center border-[3px] border-ink [&_svg]:size-5',
                  isActive && 'bg-gold-500 text-ink',
                  isCompleted && 'bg-heal text-ink',
                  isLocked && 'bg-plum-800 text-plum-400',
                )}
                aria-hidden
              >
                {isActive && <Flag />}
                {isCompleted && <Check />}
                {isLocked && <Lock />}
              </span>

              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3
                    className={cn(
                      'font-bold text-lg leading-tight',
                      isActive && 'text-ink',
                      isCompleted && 'text-parchment-300',
                      isLocked && 'text-plum-400',
                    )}
                  >
                    {quest.title}
                  </h3>
                  <PixelChip tone={isActive ? 'gold' : isCompleted ? 'heal' : 'dark'}>{quest.status}</PixelChip>
                </div>
                <p
                  className={cn(
                    'text-sm leading-snug',
                    isActive && 'text-wood-700',
                    isCompleted && 'text-parchment-500',
                    isLocked && 'text-plum-400',
                  )}
                >
                  {quest.desc}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </PixelModal>
  );
}
