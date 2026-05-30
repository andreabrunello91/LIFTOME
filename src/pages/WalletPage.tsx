import React, { useState } from 'react';
import { Button, SectionHeader } from '@/components/ui';
import { formatEuroCompact } from '@/lib/utils';

const TRANSACTIONS = [
  { id:'1', emoji:'🛒', label:'Spesa — Sara L.',         sub:'Oggi, 9:42',    amount: 12,   type:'in'  as const },
  { id:'2', emoji:'⏳', label:'Fila posta — Luca B.',    sub:'Ieri, 11:48',   amount: 10,   type:'in'  as const },
  { id:'3', emoji:'🐕', label:'Passeggiata — Giulia F.', sub:'Ieri, 10:33',   amount: 8,    type:'in'  as const },
  { id:'4', emoji:'💸', label:'Prelievo IBAN',            sub:'Lun, 14:00',    amount: -200, type:'out' as const },
  { id:'5', emoji:'🏠', label:'Trasloco — Anna M.',      sub:'Dom, 15:00',    amount: 40,   type:'pend'as const },
];

const MONTHLY = [
  { label:'Gen', h:45 }, { label:'Feb', h:55 }, { label:'Mar', h:40 },
  { label:'Apr', h:70 }, { label:'Mag', h:60 }, { label:'Giu', h:100 },
];

type View = 'wallet' | 'withdraw' | 'topup' | 'success' | 'history';

export default function WalletPage() {
  const [view, setView]         = useState<View>('wallet');
  const [wdAmount, setWdAmount] = useState(200);
  const [balance, setBalance]   = useState(342.50);

  if (view === 'withdraw') return (
    <div className="min-h-screen" style={{ background:'rgba(20,20,30,.5)', paddingTop:'var(--safe-top)' }}>
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] px-5 pb-8 pt-5 animate-slide-up" style={{ paddingBottom: 'calc(32px + var(--safe-bottom))' }}>
        <div className="w-9 h-1 bg-[--bd] rounded-full mx-auto mb-5" />
        <h2 className="text-[20px] font-black text-[--dark] tracking-tight mb-1">Preleva guadagni</h2>
        <p className="text-[14px] text-[--muted] mb-5">Sul tuo conto bancario in 1-2 giorni lavorativi</p>

        <div className="text-center mb-5">
          <div className="text-[48px] font-black text-[--dark] tracking-[-2px]">
            <span className="text-[28px]">€</span> {wdAmount}
          </div>
          <div className="text-[13px] text-[--muted] mt-1">Disponibile: {formatEuroCompact(balance)}</div>
        </div>

        <div className="flex gap-2 justify-center mb-5">
          {[50,100,200,Math.floor(balance)].map(a => (
            <button key={a}
              className="px-3.5 py-2 rounded-full border-[1.5px] text-[13px] font-bold cursor-pointer transition-all"
              style={{ borderColor: wdAmount === a ? 'var(--or)' : 'var(--bd)', background: wdAmount === a ? 'var(--or-bg)' : 'white', color: wdAmount === a ? 'var(--or-dark)' : 'var(--dark)' }}
              onClick={() => setWdAmount(a)}>
              {a === Math.floor(balance) ? 'Tutto' : `€ ${a}`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 bg-[--bg] rounded-[16px] p-3.5 border border-[--bd] mb-4">
          <div className="w-9 h-9 rounded-[12px] bg-[--green-bg] flex items-center justify-center text-xl flex-shrink-0">🏦</div>
          <div className="flex-1">
            <div className="text-[12px] text-[--muted] font-semibold">Accredito su</div>
            <div className="text-[14px] font-bold text-[--dark]">IT60 •••• •••• 9876 — Intesa SP</div>
          </div>
          <span className="text-[--bd] text-lg">›</span>
        </div>

        <Button size="lg" fullWidth onClick={() => { setBalance(b => b - wdAmount); setView('success'); }} className="mb-2.5">
          Conferma prelievo → {formatEuroCompact(wdAmount)}
        </Button>
        <Button size="lg" variant="secondary" fullWidth onClick={() => setView('wallet')}>Annulla</Button>
      </div>
    </div>
  );

  if (view === 'topup') return (
    <div className="min-h-screen" style={{ background:'rgba(20,20,30,.5)', paddingTop:'var(--safe-top)' }}>
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] px-5 pb-8 pt-5 animate-slide-up" style={{ paddingBottom: 'calc(32px + var(--safe-bottom))' }}>
        <div className="w-9 h-1 bg-[--bd] rounded-full mx-auto mb-5" />
        <h2 className="text-[20px] font-black text-[--dark] tracking-tight mb-1">Ricarica wallet</h2>
        <p className="text-[14px] text-[--muted] mb-5">Aggiungi fondi per pagare le richieste</p>
        <div className="text-center mb-5">
          <div className="text-[48px] font-black text-[--dark] tracking-[-2px]"><span className="text-[28px]">€</span> 20</div>
        </div>
        <div className="flex gap-2 justify-center mb-5">
          {[10,20,50,100].map(a => (
            <button key={a} className="px-3.5 py-2 rounded-full border-[1.5px] border-[--bd] text-[13px] font-bold text-[--dark] bg-white cursor-pointer">€ {a}</button>
          ))}
        </div>
        <div className="flex items-center gap-3 bg-[--bg] rounded-[16px] p-3.5 border border-[--bd] mb-4">
          <div className="w-9 h-9 rounded-[12px] bg-[--purple-bg] flex items-center justify-center text-xl flex-shrink-0">💳</div>
          <div className="flex-1">
            <div className="text-[12px] text-[--muted] font-semibold">Carta selezionata</div>
            <div className="text-[14px] font-bold text-[--dark]">Visa •••• 4242 — Default</div>
          </div>
          <span className="text-[--bd] text-lg">›</span>
        </div>
        <Button size="lg" fullWidth onClick={() => setView('wallet')} className="mb-2.5">Ricarica € 20</Button>
        <Button size="lg" variant="secondary" fullWidth onClick={() => setView('wallet')}>Annulla</Button>
      </div>
    </div>
  );

  if (view === 'success') return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center" style={{ paddingTop: 'var(--safe-top)' }}>
      <div className="w-20 h-20 rounded-full bg-[--green-bg] flex items-center justify-center mb-5 animate-pop-in">
        <span className="text-4xl">✅</span>
      </div>
      <h1 className="text-[24px] font-black text-[--dark] tracking-tight mb-2">Prelievo inviato!</h1>
      <p className="text-[14px] text-[--muted] leading-relaxed mb-5">
        {formatEuroCompact(wdAmount)} in arrivo sul tuo<br/>conto Intesa SP.
      </p>
      <div className="w-full bg-[--bg] rounded-[16px] p-4 mb-6 text-left">
        {[
          { label: 'Importo', val: formatEuroCompact(wdAmount) },
          { label: 'Destinazione', val: 'IT60 ••• 9876' },
          { label: 'Accredito previsto', val: '1–2 giorni lav.', color: 'var(--green)' },
        ].map(r => (
          <div key={r.label} className="flex justify-between mb-2 last:mb-0">
            <span className="text-[13px] text-[--muted]">{r.label}</span>
            <span className="text-[13px] font-bold" style={{ color: r.color ?? 'var(--dark)' }}>{r.val}</span>
          </div>
        ))}
      </div>
      <Button size="lg" fullWidth onClick={() => setView('wallet')}>Torna al wallet</Button>
    </div>
  );

  if (view === 'history') return (
    <div style={{ paddingTop: 'var(--safe-top)' }}>
      <div className="bg-white px-4 pt-12 pb-3 border-b border-[--bd] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="w-9 h-9 rounded-full bg-[--bg] border border-[--bd] flex items-center justify-center cursor-pointer" onClick={() => setView('wallet')}>←</button>
          <h1 className="text-[17px] font-black text-[--dark]">Storico transazioni</h1>
        </div>
        <button className="w-9 h-9 rounded-full bg-[--bg] border border-[--bd] flex items-center justify-center cursor-pointer">⚙</button>
      </div>
      <div className="px-4 pt-4 pb-8">
        {['Giugno 2025', 'Maggio 2025'].map(month => (
          <div key={month} className="mb-4">
            <div className="text-[12px] font-bold text-[--muted] uppercase tracking-wide mb-2">{month}</div>
            <TxList transactions={TRANSACTIONS} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col" style={{ paddingTop: 'var(--safe-top)' }}>
      <div className="bg-white px-4 pt-12 pb-3 border-b border-[--bd] flex items-center justify-between">
        <h1 className="text-[17px] font-black text-[--dark]">Wallet</h1>
        <button className="w-9 h-9 rounded-full bg-[--bg] border border-[--bd] flex items-center justify-center cursor-pointer" onClick={() => setView('history')}>⏱</button>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 bg-[--bg]">
        {/* Hero */}
        <div className="mx-4 mt-3 rounded-[24px] p-5 relative overflow-hidden bg-[--dark]">
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-[--or]/20 pointer-events-none" />
          <div className="absolute -bottom-10 -left-5 w-28 h-28 rounded-full bg-[--purple]/15 pointer-events-none" />
          <div className="text-[12px] font-semibold text-white/50 uppercase tracking-wide mb-1.5">Saldo disponibile</div>
          <div className="text-[42px] font-black text-white tracking-[-2px] leading-tight mb-1">
            <span className="text-[24px]">€</span> {balance.toFixed(2).replace('.',',')}
          </div>
          <div className="text-[13px] text-white/45 mb-5">Aggiornato ora · +€ 15 oggi</div>
          <div className="grid grid-cols-2 gap-2.5">
            <button className="flex items-center justify-center gap-2 py-3 bg-[--or] rounded-[14px] text-white font-bold text-[14px] cursor-pointer border-none active:opacity-80 transition-opacity"
              onClick={() => setView('withdraw')}>
              ↑ Preleva
            </button>
            <button className="flex items-center justify-center gap-2 py-3 rounded-[14px] text-white font-bold text-[14px] cursor-pointer border border-white/15 bg-white/10 active:bg-white/20 transition-colors"
              onClick={() => setView('topup')}>
              + Ricarica
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5 mx-4 mt-3">
          {[
            { val:'€2.4k', label:'Totale guadagni', trend:'↑ +18%', trendColor:'var(--green)' },
            { val:'248',   label:'Missioni',         trend:'↑ +12',  trendColor:'var(--green)' },
            { val:'€9.7',  label:'Media/miss.',      trend:'→ stabile', trendColor:'var(--muted)' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-[18px] border border-[--bd] p-3.5 text-center">
              <div className="text-[20px] font-black text-[--dark] tracking-tight">{s.val}</div>
              <div className="text-[11px] text-[--muted] mt-0.5">{s.label}</div>
              <div className="text-[11px] font-bold mt-1" style={{ color: s.trendColor }}>{s.trend}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="mx-4 mt-4">
          <SectionHeader title="Guadagni mensili" />
          <div className="bg-white rounded-[20px] border border-[--bd] p-4">
            <div className="mb-3">
              <div className="text-[24px] font-black text-[--dark] tracking-tight">€ 342</div>
              <div className="text-[12px] text-[--green] font-semibold mt-0.5">↑ +18% vs mese scorso</div>
            </div>
            <div className="flex items-end gap-1.5 h-20">
              {MONTHLY.map(m => (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full rounded-t-[6px] transition-all"
                    style={{ height: `${m.h}%`, background: m.label === 'Giu' ? 'var(--or)' : m.label === 'Mag' ? 'rgba(255,90,0,.25)' : 'var(--bd)' }} />
                  <span className="text-[10px] font-semibold" style={{ color: m.label === 'Giu' ? 'var(--or)' : 'var(--muted)' }}>{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="mx-4 mt-4">
          <SectionHeader title="Ultime transazioni" action="Tutte →" onAction={() => setView('history')} />
          <TxList transactions={TRANSACTIONS} />
        </div>

        {/* Cards */}
        <div className="mt-4">
          <div className="px-4 mb-2"><SectionHeader title="Metodi di pagamento" /></div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
            {[
              { gradient:'from-[#1A1A2E] to-[#2D2A6E]', network:'Visa',       last4:'4242', exp:'12/27', default:true },
              { gradient:'from-[#1D9E75] to-[#0B5C44]', network:'Mastercard', last4:'8810', exp:'08/26', default:false },
            ].map(c => (
              <div key={c.last4} className={`flex-shrink-0 w-52 bg-gradient-to-br ${c.gradient} rounded-[18px] p-4 relative cursor-pointer`}>
                {c.default && <div className="absolute top-3 right-3 bg-white/15 rounded-full px-2 py-0.5 text-[10px] font-bold text-white">Default</div>}
                <div className="text-[11px] text-white/50 font-bold uppercase tracking-wide">{c.network}</div>
                <div className="text-[15px] text-white font-bold tracking-[2px] mt-2.5">•••• •••• •••• {c.last4}</div>
                <div className="flex justify-between mt-3">
                  <span className="text-[12px] text-white/55">Marco Rossi</span>
                  <span className="text-[12px] text-white/55">{c.exp}</span>
                </div>
              </div>
            ))}
            <div className="flex-shrink-0 w-36 h-[110px] bg-white border-2 border-dashed border-[--or-bd] rounded-[18px] flex flex-col items-center justify-center gap-2 cursor-pointer">
              <span className="text-[22px] text-[--or]">+</span>
              <span className="text-[13px] font-bold text-[--or-dark]">Aggiungi carta</span>
            </div>
          </div>
        </div>

        {/* Guarantee */}
        <div className="mx-4 mt-4 mb-2 flex items-start gap-3 p-3.5 bg-[--green-bg] rounded-[16px] border border-[#9FE1CB]">
          <span className="text-xl text-[--green]">🛡</span>
          <div>
            <div className="text-[13px] font-black text-[--green-dark]">Pagamenti protetti da Liftome</div>
            <div className="text-[12px] text-[--green-dark]/75 mt-0.5 leading-snug">Il tuo denaro è al sicuro. Paghi solo quando la missione è confermata.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TxList({ transactions }: { transactions: typeof TRANSACTIONS }) {
  return (
    <div className="bg-white rounded-[20px] border border-[--bd] overflow-hidden">
      {transactions.map((tx, i) => (
        <div key={tx.id} className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-[--bg] ${i < transactions.length-1 ? 'border-b border-[--bd]' : ''}`}>
          <div className="w-10 h-10 rounded-[14px] flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: tx.type === 'in' ? 'var(--green-bg)' : tx.type === 'out' ? 'var(--red-bg)' : 'var(--amber-bg)' }}>
            {tx.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold text-[--dark] truncate">{tx.label}</div>
            <div className="text-[12px] text-[--muted] mt-0.5">{tx.sub}</div>
          </div>
          <div className="text-[15px] font-black"
            style={{ color: tx.type === 'in' ? 'var(--green)' : tx.type === 'pend' ? 'var(--amber)' : 'var(--dark)' }}>
            {tx.type === 'in' ? '+' : tx.type === 'out' ? '−' : ''}{formatEuroCompact(Math.abs(tx.amount))}
          </div>
        </div>
      ))}
    </div>
  );
}
