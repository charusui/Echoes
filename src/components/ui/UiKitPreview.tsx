import { useState } from 'react';
import { BookOpen, Camera, Compass, Home, Map, Message, Shield, Sword, Trophy, Volume3, Check } from 'pixelarticons/react';
import {
  PixelBar, PixelButton, PixelChip, PixelIconButton, PixelModal, PixelPanel, PixelTabs, PixelToast, SectionLabel,
} from './index';

/** Dev-only design review page. Open with `?ui-kit` in the URL. */
export function UiKitPreview() {
  const [tab, setTab] = useState<'all' | 'string' | 'wind'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [hp, setHp] = useState(72);

  return (
    <div className="min-h-[100dvh] bg-plum-950 text-parchment-100 p-6 flex flex-col gap-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-bold text-5xl leading-none">Pixel UI Kit</h1>
          <p className="mt-2 text-base text-parchment-300">Musikultura design system — review page</p>
        </div>
        <PixelButton variant="ghost" onClick={() => { window.location.assign(window.location.pathname); }}>Back to game</PixelButton>
      </header>

      <section className="flex flex-col gap-3">
        <SectionLabel>Typography</SectionLabel>
        <div className="flex flex-col gap-2">
          <p className="text-5xl font-bold leading-none">Display 48 — Town of Cadence</p>
          <p className="text-3xl font-bold leading-none">Heading 32 — Map of the Silent Valley</p>
          <p className="text-2xl font-semibold leading-none">Title 24 — Visayas Arc</p>
          <p className="text-xl leading-tight">Subtitle 20 — Choose your next destination</p>
          <p className="text-base leading-snug max-w-prose text-parchment-300">
            Body 16 — A peaceful village home to Elder Cadence and Maria's Fine Goods, the premier shop for tonics, gear, and acoustic upgrades.
          </p>
          <p className="font-label text-base uppercase">Silkscreen 16 — LVL 1 · 0 / 100 XP · 250 G</p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Buttons — one primary per view</SectionLabel>
        <div className="flex flex-wrap items-center gap-4">
          <PixelButton variant="primary" size="lg" icon={<Message />}>Talk to NPC</PixelButton>
          <PixelButton variant="secondary" icon={<Camera />}>Scan Instrument</PixelButton>
          <PixelButton variant="secondary" size="sm">Shop</PixelButton>
          <PixelButton variant="ghost" icon={<Compass />}>Quest Journal</PixelButton>
          <PixelButton variant="danger">Flee</PixelButton>
          <PixelButton variant="primary" disabled>Area Cleared</PixelButton>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm text-parchment-500">Battle command colors:</span>
          <button className="px-btn px-btn-purple min-h-11 px-4">Overdrive</button>
          <button className="px-btn px-btn-blue min-h-11 px-4">Attune</button>
          <button className="px-btn px-btn-green min-h-11 px-4">Defend</button>
          <button className="px-btn px-btn-pink min-h-11 px-4">Items</button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PixelIconButton icon={<Volume3 />} label="Mute" />
          <PixelIconButton icon={<Map />} label="Radar" showLabel />
          <PixelIconButton icon={<Shield />} label="Badges" showLabel />
          <PixelIconButton icon={<Trophy />} label="Ranks" showLabel />
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <PixelPanel frame="plum" title="Plum panel · HUD">
          <p className="text-2xl font-bold leading-none">Visayas Arc</p>
          <div className="mt-2 flex gap-2"><PixelChip tone="gold">Apprentice</PixelChip><PixelChip>Region 1 of 4</PixelChip></div>
          <PixelBar className="mt-3" kind="xp" value={15} label="LVL 1" valueText="15 / 100 XP" />
        </PixelPanel>

        <PixelPanel frame="wood" padding="lg" title="Wood panel · Dialogs">
          <p className="text-base text-parchment-300">Frames sidebars and modals.</p>
          <div className="mt-3 flex flex-col gap-2">
            <PixelButton variant="primary" fullWidth icon={<Sword />}>Battle Bandit</PixelButton>
            <PixelButton variant="secondary" fullWidth>Shop</PixelButton>
          </div>
        </PixelPanel>

        <PixelPanel frame="parchment" title="Parchment · Lore">
          <p className="text-base leading-snug">
            Long-form lore and quest text sits on parchment for comfortable reading.
          </p>
        </PixelPanel>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <PixelPanel title="Bars">
          <div className="flex flex-col gap-3">
            <PixelBar kind="hp" value={hp} label="Aya" valueText={`${hp} / 100 HP`} />
            <PixelBar kind="heal" value={40} label="Shield" valueText="40%" />
            <PixelBar kind="gold" value={80} label="Loading" valueText="80%" height={16} />
            <div className="flex gap-2">
              <PixelButton size="sm" variant="danger" onClick={() => setHp(v => Math.max(0, v - 12))}>Hit</PixelButton>
              <PixelButton size="sm" onClick={() => setHp(100)}>Heal</PixelButton>
            </div>
          </div>
        </PixelPanel>

        <PixelPanel title="Chips · Weakness matrix">
          <div className="flex flex-wrap items-center gap-2">
            <PixelChip tone="string">String</PixelChip><span aria-hidden>›</span>
            <PixelChip tone="perc">Perc</PixelChip><span aria-hidden>›</span>
            <PixelChip tone="brass">Brass</PixelChip><span aria-hidden>›</span>
            <PixelChip tone="synth">Synth</PixelChip><span aria-hidden>›</span>
            <PixelChip tone="wood">Wood</PixelChip>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <PixelChip tone="hp">Weak</PixelChip><PixelChip tone="heal">Healed</PixelChip><PixelChip tone="xp">+50 XP</PixelChip><PixelChip tone="dark" icon={<Home />}>Town</PixelChip>
          </div>
        </PixelPanel>
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Tabs · Modal · Toast</SectionLabel>
        <div>
          <PixelTabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'all', label: 'All', icon: <BookOpen /> },
              { id: 'string', label: 'String' },
              { id: 'wind', label: 'Wind' },
            ]}
          />
          <PixelPanel className="-mt-[3px]">
            <p className="text-base text-parchment-300">Selected tab: {tab}</p>
          </PixelPanel>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <PixelButton onClick={() => setModalOpen(true)}>Open modal</PixelButton>
          <PixelToast icon={<Check />} tone="success">Tultugan added to your Dex</PixelToast>
        </div>
      </section>

      <PixelModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Maria's Fine Goods"
        subtitle="Tonics, gear and acoustic upgrades"
        icon={<Home />}
        maxWidth="max-w-lg"
        footer={<>
          <PixelButton variant="ghost" onClick={() => setModalOpen(false)}>Cancel</PixelButton>
          <PixelButton variant="primary" onClick={() => setModalOpen(false)}>Buy · 120 G</PixelButton>
        </>}
      >
        <p className="text-base text-parchment-300">Modal body content. Esc closes, focus is trapped.</p>
      </PixelModal>
    </div>
  );
}
