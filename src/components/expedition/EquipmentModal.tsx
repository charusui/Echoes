import { useState } from 'react';
import { Check, Sword } from 'pixelarticons/react';
import { type HeroProfile, type HarmonydexEntry } from '../../types/expedition';
import { PixelButton, PixelChip, PixelModal, PixelPanel, PixelTabs, SectionLabel } from '../ui';
import { playUiSound } from '../../hooks/useUiSound';
import { cn } from '../../lib/cn';

interface EquipmentModalProps {
  party: Record<string, HeroProfile>;
  dex: Record<string, HarmonydexEntry>;
  onEquip: (heroId: string, instrumentId: string) => void;
  onClose: () => void;
}

export function EquipmentModal({
  party,
  dex,
  onEquip,
  onClose,
}: EquipmentModalProps) {
  const heroList = Object.values(party);
  const [selectedHeroId, setSelectedHeroId] = useState<string>(heroList[0]?.id || 'gustave');
  const activeHero = party[selectedHeroId] || heroList[0]!;
  const capturedInstruments = Object.values(dex).filter(i => i.captured && !i.isEnemy);
  const equipped = dex[activeHero.equippedId] || dex['cebuano_gitara']!;

  return (
    <PixelModal
      onClose={onClose}
      title="Party Loadout"
      subtitle="Choose which captured instrument each hero plays in battle"
      icon={<Sword />}
      maxWidth="max-w-4xl"
      bodyClassName="p-0 sm:p-0 flex flex-col"
      footer={<PixelButton variant="primary" sound="ui_back" onClick={onClose}>Done</PixelButton>}
    >
      <PixelTabs
        className="px-3 sm:px-4 pt-3 bg-plum-900 border-b-[3px] border-ink"
        value={selectedHeroId}
        onChange={setSelectedHeroId}
        tabs={heroList.map(hero => ({
          id: hero.id,
          label: hero.name,
          icon: <img src={hero.avatar} alt="" className="size-5 object-cover pixelated" />,
        }))}
      />

      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        {/* Hero summary */}
        <div className="md:w-5/12 p-3 sm:p-4 flex flex-col gap-4 border-b-[3px] md:border-b-0 md:border-r-[3px] border-ink">
          <div className="flex items-center gap-3">
            <div className="px-frame px-frame-inset size-20 shrink-0 p-1">
              <img src={activeHero.avatar} alt={activeHero.name} className="w-full h-full object-cover pixelated" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-2xl leading-none text-parchment-100">{activeHero.name}</h3>
              <p className="mt-1 text-sm text-parchment-300">{activeHero.role}</p>
            </div>
          </div>

          <p className="text-sm leading-snug text-parchment-300">{activeHero.bio}</p>

          <PixelPanel frame="inset" padding="sm" title="Stats">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-parchment-500">Max HP</dt>
              <dd className="text-right font-semibold text-heal">{activeHero.maxHp}</dd>
              <dt className="text-parchment-500">Action points</dt>
              <dd className="text-right font-semibold text-xp">{activeHero.maxAp} AP</dd>
              <dt className="text-parchment-500">Shield</dt>
              <dd className="text-right font-semibold text-parchment-100">{activeHero.shield}</dd>
              <dt className="text-parchment-500">Equipped</dt>
              <dd className="text-right font-semibold text-gold-300 truncate">{equipped.name}</dd>
            </dl>
          </PixelPanel>
        </div>

        {/* Instrument list */}
        <div className="md:w-7/12 p-3 sm:p-4 flex flex-col gap-3 overflow-y-auto">
          <SectionLabel>Captured instruments</SectionLabel>

          <ul className="flex flex-col gap-2">
            {capturedInstruments.map(item => {
              const isEquipped = activeHero.equippedId === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={isEquipped}
                    onClick={() => { if (!isEquipped) { playUiSound('ui_click'); onEquip(activeHero.id, item.id); } }}
                    className={cn(
                      'px-frame w-full flex items-center gap-3 p-2 text-left',
                      'focus-visible:outline-[3px] focus-visible:outline-gold-300',
                      isEquipped ? 'px-frame-parchment' : 'px-frame-plum hover:brightness-110',
                    )}
                  >
                    <span className="shrink-0 size-14 bg-parchment-100 border-[3px] border-ink overflow-hidden p-1">
                      <img src={`/assets/instruments/${item.id}.png?v=2`} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                    </span>
                    <span className="flex-1 min-w-0 flex flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={cn('font-semibold text-base leading-none', isEquipped ? 'text-ink' : 'text-parchment-100')}>{item.name}</span>
                        <PixelChip tone="dark">{item.type}</PixelChip>
                      </span>
                      <span className={cn('text-xs leading-snug', isEquipped ? 'text-wood-700' : 'text-parchment-300')}>
                        {item.baseDmg} dmg · {item.skillName} ({item.skillCost} AP)
                      </span>
                    </span>
                    {isEquipped ? (
                      <PixelChip tone="heal" icon={<Check />}>Equipped</PixelChip>
                    ) : (
                      <span className="text-sm font-semibold text-gold-300 pr-1">Equip</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </PixelModal>
  );
}
