import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { CATEGORIES, type CategoryId, type UrgencyLevel } from '@/types';
import { formatEuroCompact, calcTotal, calcCommission, clamp } from '@/lib/utils';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3 | 'sent';

interface CreateRequestPageProps {
  onClose: () => void;
  onSubmitted?: () => void;
}

export default function CreateRequestPage({ onClose, onSubmitted }: CreateRequestPageProps) {
  const [step, setStep]         = useState<Step>(1);
  const [category, setCategory] = useState<CategoryId>('spesa');
  const [urgency, setUrgency]   = useState<UrgencyLevel>('now');
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [delivery, setDelivery] = useState('Via Tortona 12, Milano');
  const [pickup, setPickup]     = useState('');
  const [price, setPrice]       = useState(12);
  const [loading, setLoading]   = useState(false);

  const cat = CATEGORIES.find(c => c.id === category)!;

  function handleSubmit() {
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep('sent'); }, 1200);
  }

  /* ── SENT ─────────────────────────────────────────────────────── */
  if (step === 'sent') return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center" style={{ paddingTop: 'var(--safe-top)' }}>
      <div className="w-20 h-20 rounded-full bg-[--or-bg] flex items-center justify-center mb-6 animate-pop-in" style={{ boxShadow: '0 0 0 0 rgba(255,90,0,.3)', animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both, pulseRing 1.5s ease-out 0.5s infinite' }}>
        <span className="text-4xl">🚀</span>
      </div>
      <h1 className="text-[24px] font-black text-[--dark] tracking-tight mb-2">Richiesta inviata!</h1>
      <p className="text-[14px] text-[--muted] leading-relaxed mb-6">
        Stiamo avvisando gli helper vicino a te.<br/>Di solito rispondono in meno di <strong className="text-[--dark]">5 minuti</strong>.
      </p>
      {/* Helper incoming */}
      <div className="w-full bg-[--bg] rounded-[18px] p-4 flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-[--purple] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">AL</div>
        <div className="flex-1">
          <div className="text-[15px] font-black text-[--dark]">Alessandro L.</div>
          <div className="text-[12px] text-[--muted] mt-0.5">★ 4.9 · 248 missioni · 120 m</div>
        </div>
        <div className="text-center">
          <div className="text-[20px] font-black text-[--or] tracking-tight">3'</div>
          <div className="text-[11px] text-[--muted] font-semibold">ETA</div>
        </div>
      </div>
      <Button size="lg" fullWidth onClick={() => { onSubmitted?.(); onClose(); }} className="mb-3">
        ✓ Accetta Alessandro
      </Button>
      <Button size="lg" variant="secondary" fullWidth onClick={() => { onSubmitted?.(); onClose(); }}>
        Aspetta altri helper
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ paddingTop: 'var(--safe-top)' }}>
      {/* Top bar */}
      <div className="px-4 pt-12 pb-3 border-b border-[--bd] flex items-center justify-between">
        <button className="w-9 h-9 rounded-full bg-[--bg] border border-[--bd] flex items-center justify-center text-lg cursor-pointer" onClick={onClose} aria-label="Chiudi">✕</button>
        <span className="text-[17px] font-black text-[--dark]">
          {step === 1 ? 'Nuova richiesta' : step === 2 ? 'Dettagli' : 'Riepilogo'}
        </span>
        <div className="flex items-center gap-1.5 bg-[--or-bg] border border-[--or-bd] rounded-full px-3 py-1.5">
          <span className="text-[12px] font-bold text-[--or-dark]">{step} di 3</span>
        </div>
      </div>

      {/* Progress */}
      <div className="h-[3px] bg-[--bd]">
        <div className="h-full bg-[--or] transition-all duration-500" style={{ width: `${(step as number) / 3 * 100}%` }} />
      </div>

      <div className="flex-1 overflow-y-auto pb-28 px-4 pt-4">

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="animate-fade-up">
            <p className="text-[12px] font-bold text-[--muted] uppercase tracking-wide mb-3">Di cosa hai bisogno?</p>
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {CATEGORIES.filter(c => c.id !== 'altro').map(c => (
                <div key={c.id}
                  className="border-2 rounded-[18px] p-3.5 cursor-pointer transition-all flex items-center gap-2.5 active:scale-[.97]"
                  style={{ borderColor: category === c.id ? 'var(--or)' : 'var(--bd)', background: category === c.id ? 'var(--or-bg)' : 'white' }}
                  onClick={() => setCategory(c.id)}>
                  <div className="w-10 h-10 rounded-[12px] flex items-center justify-center text-xl flex-shrink-0" style={{ background: c.bg }}>
                    {c.emoji}
                  </div>
                  <div>
                    <div className="text-[14px] font-black text-[--dark]">{c.label}</div>
                    <div className="text-[11px] text-[--muted]">{c.description}</div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[12px] font-bold text-[--muted] uppercase tracking-wide mb-3">Quanto è urgente?</p>
            <div className="grid grid-cols-2 gap-2.5">
              {([['now','🔴','Adesso','Entro 10 min'],['scheduled','⚫','Programma','Scegli orario']] as const).map(([u, dot, label, sub]) => (
                <div key={u}
                  className="border-2 rounded-[14px] p-3.5 cursor-pointer transition-all flex items-center gap-2.5"
                  style={{ borderColor: urgency === u ? 'var(--or)' : 'var(--bd)', background: urgency === u ? 'var(--or-bg)' : 'white' }}
                  onClick={() => setUrgency(u)}>
                  <span className="text-lg">{dot}</span>
                  <div>
                    <div className="text-[13px] font-bold text-[--dark]">{label}</div>
                    <div className="text-[11px] text-[--muted]">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="animate-fade-up flex flex-col gap-4">
            <div>
              <p className="text-[12px] font-bold text-[--muted] uppercase tracking-wide mb-2">Descrivi la richiesta</p>
              <div className="bg-white rounded-[18px] border border-[--bd] overflow-hidden">
                <div className="flex items-start gap-3 p-3.5 border-b border-[--bd]">
                  <div className="w-8 h-8 rounded-[10px] bg-[--or-bg] flex items-center justify-center text-base flex-shrink-0 mt-0.5">✏</div>
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold text-[--muted] uppercase tracking-wide mb-1.5">Titolo breve</div>
                    <input
                      className="w-full border-none outline-none text-[14px] font-semibold text-[--dark] bg-transparent placeholder:text-[#C0BDB6] placeholder:font-normal"
                      placeholder={`Es. ${cat.label} urgente`}
                      value={title} onChange={e => setTitle(e.target.value)} />
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5">
                  <div className="w-8 h-8 rounded-[10px] bg-[--or-bg] flex items-center justify-center text-base flex-shrink-0 mt-0.5">📝</div>
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold text-[--muted] uppercase tracking-wide mb-1.5">Descrizione (opzionale)</div>
                    <textarea
                      className="w-full border-none outline-none text-[14px] text-[--dark] bg-transparent resize-none leading-relaxed placeholder:text-[#C0BDB6]"
                      placeholder="Aggiungi dettagli utili all'helper..."
                      rows={2} value={desc} onChange={e => setDesc(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[12px] font-bold text-[--muted] uppercase tracking-wide mb-2">Dove?</p>
              <div className="bg-white rounded-[18px] border border-[--bd] overflow-hidden">
                <div className="flex items-center gap-3 p-3.5 border-b border-[--bd]">
                  <div className="w-8 h-8 rounded-[10px] bg-[--green-bg] flex items-center justify-center text-base flex-shrink-0">📍</div>
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold text-[--muted] uppercase tracking-wide mb-1">Indirizzo di consegna</div>
                    <input className="w-full border-none outline-none text-[14px] font-bold text-[--dark] bg-transparent" value={delivery} onChange={e => setDelivery(e.target.value)} />
                  </div>
                  <span className="text-[--bd]">›</span>
                </div>
                <div className="flex items-center gap-3 p-3.5">
                  <div className="w-8 h-8 rounded-[10px] bg-[--green-bg] flex items-center justify-center text-base flex-shrink-0">🏪</div>
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold text-[--muted] uppercase tracking-wide mb-1">Dove andare</div>
                    <input className="w-full border-none outline-none text-[14px] font-bold text-[--dark] bg-transparent placeholder:font-normal placeholder:text-[#C0BDB6]" placeholder="Es. Coop Via Tortona" value={pickup} onChange={e => setPickup(e.target.value)} />
                  </div>
                  <span className="text-[--bd]">›</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[12px] font-bold text-[--muted] uppercase tracking-wide mb-2">Quanto offri?</p>
              <div className="bg-white rounded-[18px] border border-[--bd] p-4 flex items-center gap-3 mb-2.5">
                <button className="w-10 h-10 rounded-full border-[1.5px] border-[--bd] bg-[--bg] flex items-center justify-center text-xl font-bold text-[--dark] cursor-pointer active:bg-[--or] active:text-white active:border-[--or] transition-all"
                  onClick={() => setPrice(p => clamp(p - 1, 5, 100))}>−</button>
                <div className="flex-1 text-center">
                  <div className="text-[32px] font-black text-[--dark] tracking-tight">€ {price}</div>
                  <div className="text-[12px] text-[--muted]">Compenso per l'helper</div>
                </div>
                <button className="w-10 h-10 rounded-full border-[1.5px] border-[--bd] bg-[--bg] flex items-center justify-center text-xl font-bold text-[--dark] cursor-pointer active:bg-[--or] active:text-white active:border-[--or] transition-all"
                  onClick={() => setPrice(p => clamp(p + 1, 5, 100))}>+</button>
              </div>
              <div className="flex gap-2 mb-3">
                {[8,12,15,20].map(p => (
                  <button key={p} onClick={() => setPrice(p)}
                    className="flex-1 py-2 rounded-full border-[1.5px] text-[13px] font-bold cursor-pointer transition-all"
                    style={{ borderColor: price === p ? 'var(--or)' : 'var(--bd)', background: price === p ? 'var(--or-bg)' : 'white', color: price === p ? 'var(--or-dark)' : 'var(--dark)' }}>
                    € {p}
                  </button>
                ))}
              </div>
              {price >= 10 && (
                <div className="flex items-center gap-2 p-3 bg-[--green-bg] rounded-[12px]">
                  <span className="text-[--green]">ℹ</span>
                  <p className="text-[12px] text-[--green-dark] leading-snug">
                    Richieste da <strong>€ 10+</strong> ricevono risposta <strong>3x più veloce</strong> nella tua zona.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3 — RIEPILOGO ── */}
        {step === 3 && (
          <div className="animate-fade-up flex flex-col gap-3">
            {/* Summary card */}
            <div className="rounded-[20px] overflow-hidden border border-[--bd]">
              <div className="p-4 flex items-center justify-between" style={{ background: cat.color }}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat.emoji}</span>
                  <div>
                    <div className="text-[16px] font-black text-white tracking-tight">{title || cat.label}</div>
                    <div className="text-[12px] text-white/65">{urgency === 'now' ? 'Adesso · Urgente' : 'Programmata'}</div>
                  </div>
                </div>
                <div className="text-[26px] font-black text-white tracking-tight">{formatEuroCompact(price)}</div>
              </div>
              <div className="bg-white px-4 py-1">
                {[
                  { icon: '📍', bg: 'var(--or-bg)', label: 'Consegna a', val: delivery },
                  { icon: '🏪', bg: 'var(--green-bg)', label: 'Dove andare', val: pickup || 'Non specificato' },
                  { icon: '⏱', bg: 'var(--amber-bg)', label: 'Urgenza', val: urgency === 'now' ? 'Entro 10 minuti' : 'Programmata', valColor: 'var(--or)' },
                  { icon: '💳', bg: 'var(--purple-bg)', label: 'Pagamento', val: 'Visa •• 4242' },
                  { icon: '🧾', bg: 'var(--bg)', label: 'Commissione', val: `${formatEuroCompact(calcCommission(price))} (10%)`, valColor: 'var(--muted)' },
                ].map((r, i, arr) => (
                  <div key={r.label} className={`flex items-center gap-2.5 py-3 ${i < arr.length-1 ? 'border-b border-[--bd]' : ''}`}>
                    <div className="w-7 h-7 rounded-[8px] flex items-center justify-center text-sm flex-shrink-0" style={{ background: r.bg }}>{r.icon}</div>
                    <span className="text-[13px] text-[--muted] flex-1">{r.label}</span>
                    <span className="text-[13px] font-bold" style={{ color: r.valColor ?? 'var(--dark)' }}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Helpers preview */}
            <div className="bg-white rounded-[18px] border border-[--bd] p-4">
              <div className="text-[13px] font-bold text-[--dark] mb-3">Helper disponibili ora vicino a te</div>
              <div className="flex items-center mb-2">
                {['AL','CM','RF','VP'].map((init, i) => (
                  <div key={init} className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white border-2 border-white -ml-1.5 first:ml-0" style={{ background: ['#534AB7','#0F6E56','#993556','#854F0B'][i] }}>{init}</div>
                ))}
                <div className="w-8 h-8 rounded-full bg-[--bd] flex items-center justify-center text-[11px] text-[--muted] font-bold border-2 border-white -ml-1.5">+8</div>
                <span className="text-[13px] text-[--muted] ml-2">12 helper online</span>
              </div>
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-[--green]">
                ⏱ Risposta media: <strong>4 minuti</strong>
              </div>
            </div>

            {/* Guarantee */}
            <div className="flex items-start gap-3 p-3.5 bg-[--or-bg] rounded-[16px] border border-[--or-bd]">
              <span className="text-xl text-[--or] flex-shrink-0">🛡</span>
              <div>
                <div className="text-[13px] font-black text-[--or-dark]">Paghi solo a missione completata</div>
                <div className="text-[12px] text-[--or-dark]/75 leading-snug mt-0.5">L'importo viene bloccato ora e rilasciato all'helper solo quando confermi la consegna.</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[--bd] px-4 py-3" style={{ paddingBottom: 'calc(12px + var(--safe-bottom))' }}>
        <Button size="lg" fullWidth loading={loading} onClick={() => step < 3 ? setStep((step as number + 1) as Step) : handleSubmit()}>
          {step === 1 && 'Continua →'}
          {step === 2 && 'Anteprima →'}
          {step === 3 && <>🚀 Pubblica · {formatEuroCompact(calcTotal(price))}</>}
        </Button>
      </div>
    </div>
  );
}
