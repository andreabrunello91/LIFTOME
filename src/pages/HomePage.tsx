import React, { useState } from 'react';
import { Avatar, Card, StatusBadge, SectionHeader } from '@/components/ui';
import { formatDistance, formatEuroCompact, formatRelativeTime, getCategory } from '@/lib/utils';
import type { Request } from '@/types';

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_REQUESTS: Request[] = [
  {
    id: '1', title: 'Spesa supermercato — lista corta', description: 'Lista di 8 prodotti al Coop di Via Tortona. Urgente!',
    category: 'spesa', status: 'pending', urgency: 'now', price: 12,
    requester: { id: 'u1', name: 'Sara', surname: 'L.', initials: 'SL', email: '', role: 'both', rating: 4.9, rating_count: 43, missions_count: 43, earnings_total: 0, success_rate: 100, is_available: true, is_verified: true, badges: [], radius_km: 1, created_at: '' },
    address_delivery: 'Via Tortona 12', distance_m: 180, created_at: new Date(Date.now() - 3*60000).toISOString(),
  },
  {
    id: '2', title: 'Passeggiata cane 30 min', description: 'Labrador di 3 anni, molto tranquillo. Zona Navigli.',
    category: 'cane', status: 'pending', urgency: 'now', price: 8,
    requester: { id: 'u2', name: 'Giulia', surname: 'F.', initials: 'GF', email: '', role: 'both', rating: 5.0, rating_count: 21, missions_count: 21, earnings_total: 0, success_rate: 100, is_available: true, is_verified: true, badges: [], radius_km: 1, created_at: '' },
    address_delivery: 'Navigli', distance_m: 350, created_at: new Date(Date.now() - 8*60000).toISOString(),
  },
  {
    id: '3', title: 'Fila posta — raccomandata', description: 'Ritiro raccomandata all\'ufficio postale. Delega pronta.',
    category: 'fila', status: 'pending', urgency: 'now', price: 10,
    requester: { id: 'u3', name: 'Luca', surname: 'B.', initials: 'LB', email: '', role: 'both', rating: 4.7, rating_count: 18, missions_count: 18, earnings_total: 0, success_rate: 95, is_available: true, is_verified: false, badges: [], radius_km: 1, created_at: '' },
    address_delivery: 'P.za XXIV Maggio', distance_m: 520, created_at: new Date(Date.now() - 15*60000).toISOString(),
  },
];

const HELPERS = [
  { initials: 'AL', name: 'Alessandro', spec: 'Spesa · Consegne', rating: 4.9, dist: 120 },
  { initials: 'CM', name: 'Chiara M.',  spec: 'Cane · Babysit',  rating: 5.0, dist: 280 },
  { initials: 'RF', name: 'Roberto F.', spec: 'Traslochi · Fila', rating: 4.8, dist: 410 },
  { initials: 'VP', name: 'Valentina',  spec: 'Spesa · Fila',    rating: 4.7, dist: 490 },
];

const CATEGORY_FILTERS = [
  { id: 'all', label: 'Tutti', emoji: '⚡' },
  { id: 'spesa', label: 'Spesa', emoji: '🛒' },
  { id: 'consegna', label: 'Consegne', emoji: '📦' },
  { id: 'cane', label: 'Cane', emoji: '🐕' },
  { id: 'fila', label: 'Code', emoji: '⏳' },
  { id: 'trasloco', label: 'Traslochi', emoji: '🏠' },
  { id: 'babysit', label: 'Babysit', emoji: '👶' },
];

interface HomePageProps {
  onAccept: (req: Request) => void;
  onOpenRequest: (req: Request) => void;
  userName?: string;
}

export default function HomePage({ onAccept, onOpenRequest, userName = 'Marco' }: HomePageProps) {
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered = MOCK_REQUESTS.filter(r => activeFilter === 'all' || r.category === activeFilter);
  const urgent   = filtered[0];

  return (
    <div className="flex flex-col" style={{ paddingTop: 'var(--safe-top)' }}>
      {/* Top bar */}
      <div className="bg-white px-4 pt-12 pb-3 border-b border-[--bd]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[12px] text-[--muted] font-medium">Buongiorno 👋</p>
            <h1 className="text-[20px] font-black text-[--dark] tracking-tight">
              Ciao, <span className="text-[--or]">{userName}!</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative w-9 h-9 rounded-full bg-[--bg] border border-[--bd] flex items-center justify-center text-[18px] cursor-pointer">
              🔔
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-[--or] rounded-full border-2 border-white" />
            </button>
            <div className="w-9 h-9 rounded-full bg-[--or] flex items-center justify-center text-white text-[13px] font-bold cursor-pointer">
              {userName.slice(0,2).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2.5 bg-[--bg] border border-[--bd] rounded-[14px] px-3.5 py-2.5 cursor-pointer">
          <span className="text-[--muted] text-base">🔍</span>
          <span className="text-[14px] text-[--muted] flex-1">Cerca un tipo di aiuto...</span>
          <div className="w-7 h-7 bg-[--or] rounded-[8px] flex items-center justify-center text-white text-sm">⚙</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
          {CATEGORY_FILTERS.map(f => (
            <button key={f.id}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-[13px] font-bold whitespace-nowrap flex-shrink-0 transition-all cursor-pointer"
              style={{
                background: activeFilter === f.id ? 'var(--or)' : 'white',
                borderColor: activeFilter === f.id ? 'var(--or)' : 'var(--bd)',
                color: activeFilter === f.id ? 'white' : 'var(--dark)',
              }}
              onClick={() => setActiveFilter(f.id)}>
              <span>{f.emoji}</span> {f.label}
            </button>
          ))}
        </div>

        {/* Urgent banner */}
        {urgent && (
          <div className="mx-4 mb-0 bg-[--or] rounded-[22px] p-4 flex items-center justify-between animate-fade-up">
            <div>
              <div className="text-[11px] font-bold text-white/60 uppercase tracking-wide mb-1">Richiesta urgente</div>
              <div className="text-[17px] font-black text-white leading-tight">
                {getCategory(urgent.category).emoji} {urgent.title.split('—')[0].trim()}
              </div>
              <div className="text-[12px] text-white/65 mt-1">
                A {formatDistance(urgent.distance_m ?? 0)} · {formatEuroCompact(urgent.price)} · {formatRelativeTime(urgent.created_at)}
              </div>
            </div>
            <button
              className="bg-white text-[--or] font-bold text-[13px] px-4 py-2.5 rounded-[13px] border-none cursor-pointer active:opacity-80 flex-shrink-0 ml-3"
              onClick={() => onAccept(urgent)}>
              Accetta →
            </button>
          </div>
        )}

        {/* Requests */}
        <div className="px-4 mt-4">
          <SectionHeader title="Richieste vicine" action="Vedi mappa →" />
          <div className="flex flex-col gap-2.5">
            {filtered.map((req, i) => (
              <RequestCard key={req.id} req={req} onAccept={() => onAccept(req)} onOpen={() => onOpenRequest(req)}
                style={{ animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
        </div>

        {/* Helpers online */}
        <div className="mt-5">
          <div className="px-4 mb-2">
            <SectionHeader title="Helper online vicino a te" action="Tutti →" />
          </div>
          <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 no-scrollbar">
            {HELPERS.map(h => (
              <div key={h.initials} className="bg-white rounded-[18px] border border-[--bd] p-3 w-[130px] flex-shrink-0 cursor-pointer active:bg-[--bg] transition-colors">
                <Avatar initials={h.initials} online size="md" className="mb-2" />
                <div className="text-[13px] font-bold text-[--dark] truncate">{h.name}</div>
                <div className="text-[11px] text-[--muted] mt-0.5 truncate">{h.spec}</div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[12px] text-[--or]">★ {h.rating}</span>
                </div>
                <div className="text-[11px] text-[--muted] mt-0.5">📍 {formatDistance(h.dist)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── RequestCard ─────────────────────────────────────────────────────────────

interface RequestCardProps {
  req: Request;
  onAccept: () => void;
  onOpen: () => void;
  style?: React.CSSProperties;
}

function RequestCard({ req, onAccept, onOpen, style }: RequestCardProps) {
  const cat = getCategory(req.category);

  return (
    <div className="bg-white rounded-[20px] border border-[--bd] p-3.5 cursor-pointer active:bg-[#FAFAF8] transition-colors animate-fade-up"
      style={style}
      onClick={onOpen}>
      {/* Top row */}
      <div className="flex items-center justify-between mb-2.5">
        <StatusBadge label={`${cat.emoji} ${cat.label}`} color={cat.color} bg={cat.bg} />
        <span className="text-[12px] font-semibold text-[--muted]">⏱ {formatRelativeTime(req.created_at)}</span>
      </div>

      <h3 className="text-[15px] font-black text-[--dark] tracking-tight mb-1">{req.title}</h3>
      {req.description && <p className="text-[13px] text-[--muted] leading-relaxed mb-2.5 line-clamp-2">{req.description}</p>}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar initials={req.requester.initials} size="xs" />
          <span className="text-[13px] font-semibold text-[--dark]">{req.requester.name} {req.requester.surname}</span>
          <span className="text-[12px] text-[--or]">★ {req.requester.rating}</span>
        </div>
        <div className="flex items-center gap-2">
          {req.distance_m !== undefined && (
            <span className="text-[12px] text-[--muted]">📍 {formatDistance(req.distance_m)}</span>
          )}
          <span className="text-[16px] font-black text-[--dark]">{formatEuroCompact(req.price)}</span>
          <button
            className="text-[13px] font-bold px-3 py-2 rounded-[12px] border-none cursor-pointer active:opacity-80 transition-all"
            style={{ background: cat.bg, color: cat.color }}
            onClick={e => { e.stopPropagation(); onAccept(); }}>
            Accetta
          </button>
        </div>
      </div>
    </div>
  );
}
