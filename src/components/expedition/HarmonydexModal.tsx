import { CollectionScreen } from '../CollectionScreen';
import { type HarmonydexEntry } from '../../types/expedition';

interface HarmonydexModalProps {
  dex?: Record<string, HarmonydexEntry>;
  onClose: () => void;
}

export function HarmonydexModal({ onClose }: HarmonydexModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-[#2a2d43]">
      <CollectionScreen
        onBack={onClose}
        onSelectInstrument={() => {}}
        onSelectCustomProfile={() => {}}
        onOpenKorlongHunt={() => {}}
        onOpenScanner={() => {}}
      />
    </div>
  );
}
