import React from 'react';
import { Heart, Package, Sparkles, Zap } from 'pixelarticons/react';
import { PixelButton, PixelChip, PixelModal } from '../ui';

interface ItemMenuOverlayProps {
  inventory: Record<string, number>;
  onClose: () => void;
  onUseItem: (itemId: string) => void;
}

const ITEMS_DB: Record<string, { name: string, desc: string, icon: React.ReactNode, type: 'heal' | 'ap' | 'buff' }> = {
  'turmeric_tonic': { name: 'Visayan Turmeric Tonic', desc: 'Heals all party members by 150 HP.', icon: <Heart className="text-hp-light" />, type: 'heal' },
  'cadence_fork': { name: 'Cadence Tuning Fork', desc: 'Fully restores AP.', icon: <Zap className="text-xp" />, type: 'ap' },
  'solar_spice': { name: "Maria's Solar Spice Pack", desc: 'Grants Overdrive to your party.', icon: <Sparkles className="text-gold-300" />, type: 'buff' },
  'reverse_potion': { name: 'Reverse Potion', desc: 'Fully restores HP and AP.', icon: <Heart className="text-heal" />, type: 'heal' },
};

export function ItemMenuOverlay({ inventory, onClose, onUseItem }: ItemMenuOverlayProps) {
  const availableItems = Object.entries(inventory).filter(([id, count]) => count > 0 && ITEMS_DB[id]);

  return (
    <PixelModal onClose={onClose} title="Items" icon={<Package />} maxWidth="max-w-2xl" closeSound="miss">
      {availableItems.length === 0 ? (
        <div className="h-40 flex flex-col items-center justify-center gap-2 text-center text-parchment-300">
          <Package className="size-8 text-parchment-500" aria-hidden />
          <p className="font-semibold text-base text-parchment-100">Your bag is empty.</p>
          <p className="text-sm">Visit Maria's Shop in Cadence Town to stock up.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {availableItems.map(([id, count]) => {
            const item = ITEMS_DB[id];
            return (
              <li key={id} className="px-frame px-frame-plum p-3 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 [&_svg]:size-5 [&_svg]:shrink-0">
                    {item.icon}
                    <h3 className="font-semibold text-base leading-tight text-parchment-100 truncate">{item.name}</h3>
                  </div>
                  <PixelChip tone="dark">×{count}</PixelChip>
                </div>
                <p className="text-sm leading-snug text-parchment-300">{item.desc}</p>
                <PixelButton
                  size="sm"
                  fullWidth
                  sound="perfect"
                  onClick={() => {
                    onUseItem(id);
                    onClose();
                  }}
                >
                  Use
                </PixelButton>
              </li>
            );
          })}
        </ul>
      )}
    </PixelModal>
  );
}
