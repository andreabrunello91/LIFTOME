import React, { useState } from 'react';
import { Avatar, Button, Card, Stars, Toggle, SectionHeader, FieldRow } from '@/components/ui';
import { formatEuroCompact } from '@/lib/utils';
import type { User } from '@/types';

const MOCK_USER: User = {
  id: 'u1', name: 'Marco', surname: 'Rossi', initials: 'MR', email: 'marco@email.it',
  phone: '+39 333 000 0000', bio: 'Helper certificato 💪 Aiuto con spesa, traslochi e consegne. Sempre puntuale!',
  role: 'both', location: 'Milano, Navigli', radius_km: 2,
  rating: 4.8, rating_count: 127, missions_count: 248,
  earnings_total: 2400, success_rate: 98, is_available: true, is_verified: true,
  badges: [
    { id: 'super', label: 'Super helper', emoji: '⚡', color: 'var(--or-dark)', bg: 'var(--or-bg)', border: 'var(--or-bd)' },
    { id: 'verified', label: 'Verificato', emoji: '🛡', color: 'var(--green-dark)', bg: 'var(--green-bg)', border: '#9FE1CB' },
    { id: 'top', label: 'Top 5%', emoji: '⭐', color: 'var(--amber-dark)', bg: 'var(--amber-bg)', border: 'var(--amber-bd)' },
    { id: 'punct', label: 'Puntuale', emoji: '⏱', color: 'var(--or-dark)', bg: 'var(--or-bg)', border: 'var(--or-bd)' },
  ],
  created_at: '2024-01-01',
};

const REVIEWS = [
  { id: '1', author: { initials: 'SL', name: 'Sara L.' }, rating: 5, text: 'Marco è stato fantastico! Spesa fatta in 8 minuti, tutto perfetto e gentilissimo. Lo richiedo sicuro!', category: 'spesa', created_at: new Date(Date.now() - 2*86400000).toISOString() },
  { id: '2', author: { initials: 'GF', name: 'Giovanni F.' }, rating: 5, text: 'Trasloco camera gestito in modo impeccabile. Preciso, veloce e molto affidabile.', category: 'trasloco', created_at: new Date(Date.now() - 5*86400000).toISOString() },
];

type Tab = 'profile' | 'settings' | 'edit';

interface ProfilePageProps { onSignOut?: () => void; }

export default function ProfilePage({ onSignOut }: ProfilePageProps) {
  const [tab, setTab]               = useState<Tab>('profile');
  const [user, setUser]             = useState(MOCK_USER);
  const [notifOn, setNotifOn]       = useState(true);
  const [locationOn, setLocationOn] = useState(true);

  if (tab === 'settings') return <SettingsTab onBack={() => setTab('profile')} onSignOut={onSignOut} notifOn={notifOn} setNotifOn={setNotifOn} locationOn={locationOn} setLocationOn={setLocationOn} />;
  if (tab === 'edit')     return <EditTab user={user} onBack={() => setTab('profile')} onSave={u => { setUser(u); setTab('profile'); }} />;

  return (
    <div className="flex flex-col" style={{ paddingTop: 'var(--safe-top)' }}>
      {/* Navbar */}
      <div className="bg-white px-4 pt-12 pb-3 border-b border-[--bd] flex items-center justify-between">
        <h1 className="text-[17px] font-black text-[--dark] tracking-tight">Il mio profilo</h1>
        <div className="flex gap-2">
          <button className="w-9 h-9 rounded-full bg-[--bg] border border-[--bd] flex items-center justify-center text-base cursor-pointer" aria-label="Condividi">↗</button>
          <button className="w-9 h-9 rounded-full bg-[--bg] border border-[--bd] flex items-center justify-center text-base cursor-pointer" aria-label="Impostazioni" onClick={() => setTab('settings')}>⚙</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 bg-[--bg]">

        {/* Hero card */}
        <div className="mx-4 mt-3 bg-white rounded-[24px] border border-[--bd] p-5 animate-fade-up">
          <div className="flex items-start justify-between mb-4">
            <div className="relative">
              <Avatar initials={user.initials} size="xl" />
              {user.is_verified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-white flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-[--green] flex items-center justify-center">
                    <span className="text-white text-[10px]">✓</span>
                  </div>
                </div>
              )}
            </div>
            <button
              className="flex items-center gap-1.5 bg-[--bg] border border-[--bd] rounded-[20px] px-3.5 py-2 text-[13px] font-semibold text-[--dark] cursor-pointer active:bg-[--bd]"
              onClick={() => setTab('edit')}>
              ✏ Modifica
            </button>
          </div>

          <h2 className="text-[22px] font-black text-[--dark] tracking-tight leading-tight">{user.name} {user.surname}</h2>
          <p className="text-[14px] text-[--muted] mt-0.5">@{user.name.toLowerCase()}{user.surname.toLowerCase()} · {user.location}</p>
          {user.bio && <p className="text-[13px] text-[#5a5a6a] leading-relaxed mt-2.5">{user.bio}</p>}

          <div className="flex items-center gap-2 mt-3">
            <Stars rating={user.rating} size={15} />
            <span className="text-[15px] font-black text-[--dark]">{user.rating}</span>
            <span className="text-[13px] text-[--muted]">({user.rating_count} recensioni)</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[13px] text-[--muted]">
            <span className="text-[--or]">📍</span>
            Raggio operativo: {user.radius_km} km
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5 mx-4 mt-3">
          {[
            { val: user.missions_count.toString(), label: 'Missioni' },
            { val: `€${(user.earnings_total/1000).toFixed(1)}k`, label: 'Guadagnato' },
            { val: `${user.success_rate}%`, label: 'Successo' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-[18px] border border-[--bd] p-3.5 text-center">
              <div className="text-[22px] font-black text-[--dark] tracking-tight">{s.val}</div>
              <div className="text-[11px] text-[--muted] mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Availability + earnings */}
        <div className="mx-4 mt-3">
          <div className="bg-white rounded-[18px] border border-[--bd] p-4 flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: user.is_available ? 'var(--green)' : 'var(--muted)' }} />
              <div>
                <div className="text-[14px] font-bold text-[--dark]">{user.is_available ? 'Disponibile ora' : 'Non disponibile'}</div>
                <div className="text-[12px] text-[--muted]">{user.is_available ? 'Accetti nuove richieste' : 'Non ricevi richieste'}</div>
              </div>
            </div>
            <Toggle checked={user.is_available} onChange={v => setUser(u => ({ ...u, is_available: v }))} />
          </div>

          <div className="bg-[--or] rounded-[20px] p-4 flex items-center justify-between">
            <div>
              <div className="text-[12px] font-semibold text-white/65">Guadagni questo mese</div>
              <div className="text-[28px] font-black text-white tracking-tight leading-tight mt-0.5">€ 342</div>
              <div className="text-[12px] text-white/65 mt-0.5">↑ +18% rispetto al mese scorso</div>
            </div>
            <button className="bg-white/20 border-none text-white font-bold text-[13px] px-4 py-2.5 rounded-[14px] cursor-pointer active:bg-white/30">
              Preleva
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="mx-4 mt-4">
          <SectionHeader title="Badge e traguardi" />
          <div className="flex flex-wrap gap-2">
            {user.badges.map(b => (
              <span key={b.id}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-bold border"
                style={{ background: b.bg, color: b.color, borderColor: b.border }}>
                {b.emoji} {b.label}
              </span>
            ))}
          </div>
        </div>

        {/* Services */}
        <div className="mx-4 mt-4">
          <SectionHeader title="Cosa offro" action="Gestisci" />
          <div className="flex flex-wrap gap-2">
            {[['🛒','Spesa',true],['📦','Consegne',true],['🏠','Traslochi',true],['🐕','Cane',false],['⏳','Code',false]].map(([e,l,a]) => (
              <span key={l as string}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold border-[1.5px] cursor-pointer transition-all"
                style={{ background: a ? 'var(--or-bg)' : 'white', borderColor: a ? 'var(--or-bd)' : 'var(--bd)', color: a ? 'var(--or-dark)' : 'var(--dark)' }}>
                {e as string} {l as string}
              </span>
            ))}
          </div>
        </div>

        {/* Reviews */}
        <div className="mx-4 mt-4">
          <SectionHeader title="Recensioni recenti" action="Tutte →" />
          {REVIEWS.map(r => (
            <div key={r.id} className="bg-white rounded-[18px] border border-[--bd] p-3.5 mb-2.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <Avatar initials={r.author.initials} size="sm" />
                  <div>
                    <div className="text-[14px] font-bold text-[--dark]">{r.author.name}</div>
                    <div className="text-[12px] text-[--muted]">2 giorni fa</div>
                  </div>
                </div>
                <Stars rating={r.rating} size={13} />
              </div>
              <p className="text-[13px] text-[#5a5a6a] leading-relaxed">{r.text}</p>
              <span className="inline-block mt-2 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[--green-bg] text-[--green-dark]">
                ✓ Verificata
              </span>
            </div>
          ))}
        </div>

        {/* Quick settings */}
        <div className="mx-4 mt-4 mb-2">
          <SectionHeader title="Impostazioni rapide" />
          <div className="bg-white rounded-[20px] border border-[--bd] overflow-hidden">
            {[
              { icon: '🔔', iconBg: 'var(--or-bg)', label: 'Notifiche', toggle: <Toggle checked={notifOn} onChange={setNotifOn} /> },
              { icon: '📍', iconBg: 'var(--green-bg)', label: 'Posizione', toggle: <Toggle checked={locationOn} onChange={setLocationOn} /> },
              { icon: '🛡', iconBg: 'var(--purple-bg)', label: 'Privacy e sicurezza', arrow: true, onClick: () => setTab('settings') },
              { icon: '💳', iconBg: 'var(--or-bg)', label: 'Metodo di pagamento', value: 'Visa •• 4242', arrow: true },
            ].map((item, i, arr) => (
              <div key={item.label}
                className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer ${i < arr.length-1 ? 'border-b border-[--bd]' : ''} active:bg-[--bg]`}
                onClick={item.onClick}>
                <div className="w-9 h-9 rounded-[12px] flex items-center justify-center text-lg flex-shrink-0" style={{ background: item.iconBg }}>{item.icon}</div>
                <span className="flex-1 text-[14px] font-semibold text-[--dark]">{item.label}</span>
                {item.value && <span className="text-[13px] text-[--muted]">{item.value}</span>}
                {item.toggle}
                {item.arrow && <span className="text-[--bd] text-lg">›</span>}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── SettingsTab ─────────────────────────────────────────────────────────────
function SettingsTab({ onBack, onSignOut, notifOn, setNotifOn, locationOn, setLocationOn }: any) {
  return (
    <div style={{ paddingTop: 'var(--safe-top)' }}>
      <div className="bg-white px-4 pt-12 pb-3 border-b border-[--bd] flex items-center gap-3">
        <button className="w-9 h-9 rounded-full bg-[--bg] border border-[--bd] flex items-center justify-center cursor-pointer" onClick={onBack}>←</button>
        <h1 className="text-[17px] font-black text-[--dark]">Impostazioni</h1>
      </div>
      <div className="px-4 mt-4 flex flex-col gap-2">
        <div className="bg-white rounded-[20px] border border-[--bd] overflow-hidden">
          {[
            { icon: '👤', bg: 'var(--or-bg)',     label: 'Dati personali' },
            { icon: '💳', bg: 'var(--green-bg)',  label: 'Pagamenti e IBAN' },
            { icon: '🛡', bg: 'var(--purple-bg)', label: 'Privacy' },
            { icon: '⭐', bg: 'var(--amber-bg)',  label: 'Recensioni ricevute', value: '127' },
            { icon: '❓', bg: 'var(--bg)',         label: 'Supporto' },
          ].map((item, i, arr) => (
            <div key={item.label} className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-[--bg] ${i < arr.length-1 ? 'border-b border-[--bd]' : ''}`}>
              <div className="w-9 h-9 rounded-[12px] flex items-center justify-center text-lg" style={{ background: item.bg }}>{item.icon}</div>
              <span className="flex-1 text-[14px] font-semibold text-[--dark]">{item.label}</span>
              {item.value && <span className="text-[13px] text-[--muted]">{item.value}</span>}
              <span className="text-[--bd] text-lg">›</span>
            </div>
          ))}
        </div>
        <button
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-[--red-bg] rounded-[16px] border border-[--bd] cursor-pointer active:opacity-80"
          onClick={onSignOut}>
          <div className="w-9 h-9 rounded-[12px] bg-[#FCEBEB] flex items-center justify-center text-lg">🚪</div>
          <span className="text-[14px] font-semibold text-[--red]">Esci dall'account</span>
        </button>
      </div>
    </div>
  );
}

// ─── EditTab ─────────────────────────────────────────────────────────────────
function EditTab({ user, onBack, onSave }: { user: User; onBack: () => void; onSave: (u: User) => void }) {
  const [draft, setDraft] = useState(user);
  return (
    <div style={{ paddingTop: 'var(--safe-top)' }}>
      <div className="bg-white px-4 pt-12 pb-3 border-b border-[--bd] flex items-center gap-3">
        <button className="w-9 h-9 rounded-full bg-[--bg] border border-[--bd] flex items-center justify-center cursor-pointer" onClick={onBack}>←</button>
        <h1 className="text-[17px] font-black text-[--dark]">Modifica profilo</h1>
      </div>
      <div className="px-4 mt-4 flex flex-col gap-3 pb-32">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-2">
          <div className="relative">
            <Avatar initials={draft.initials} size="xl" />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[--or] border-2 border-white flex items-center justify-center cursor-pointer">
              <span className="text-white text-[12px]">📷</span>
            </div>
          </div>
          <p className="text-[13px] text-[--muted] mt-2">Tocca per cambiare foto</p>
        </div>
        <div className="bg-white rounded-[20px] border border-[--bd] overflow-hidden">
          {[
            { icon: '👤', label: 'Nome', value: `${draft.name} ${draft.surname}` },
            { icon: '✏', label: 'Bio', value: draft.bio ?? '' },
            { icon: '📍', label: 'Zona', value: draft.location ?? '' },
            { icon: '📏', label: 'Raggio operativo', value: `${draft.radius_km} km` },
          ].map((f, i, arr) => (
            <FieldRow key={f.label} icon={f.icon} label={f.label} value={f.value} onClick={() => {}} last={i === arr.length - 1} />
          ))}
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[--bd] px-4 py-3" style={{ paddingBottom: 'calc(12px + var(--safe-bottom))' }}>
        <Button size="lg" fullWidth onClick={() => onSave(draft)}>Salva modifiche</Button>
      </div>
    </div>
  );
}
