import React, { useState, useEffect } from 'react';
import { Avatar, Button } from '@/components/ui';
import { formatDistance } from '@/lib/utils';

type MissionStep = 'accepted' | 'at_store' | 'in_transit' | 'delivered';

const STEPS: { id: MissionStep; label: string; icon: string }[] = [
  { id: 'accepted',   label: 'Accettato',  icon: '✓' },
  { id: 'at_store',   label: 'Al negozio', icon: '🛒' },
  { id: 'in_transit', label: 'In viaggio', icon: '🛵' },
  { id: 'delivered',  label: 'Consegnato', icon: '🏠' },
];

const POSITIONS = [
  { x: 90,  y: 322, eta: "8'", dist: 180 },
  { x: 90,  y: 280, eta: "7'", dist: 155 },
  { x: 90,  y: 230, eta: "6'", dist: 130 },
  { x: 90,  y: 205, eta: "5'", dist: 105 },
  { x: 130, y: 205, eta: "4'", dist: 82  },
  { x: 180, y: 205, eta: "3'", dist: 60  },
  { x: 230, y: 205, eta: "2'", dist: 40  },
  { x: 258, y: 205, eta: "1'", dist: 20  },
  { x: 258, y: 165, eta: "<1'",dist: 10  },
  { x: 258, y: 148, eta: "🏠", dist: 0   },
];

interface TrackingPageProps {
  onBack: () => void;
  onDelivered?: () => void;
}

export default function TrackingPage({ onBack, onDelivered }: TrackingPageProps) {
  const [posIdx, setPosIdx]         = useState(0);
  const [missionStep, setMissionStep] = useState<MissionStep>('at_store');
  const [showArrived, setShowArrived] = useState(false);

  const pos  = POSITIONS[posIdx];

  useEffect(() => {
    if (posIdx >= POSITIONS.length - 1) {
      setTimeout(() => setShowArrived(true), 400);
      return;
    }
    const t = setTimeout(() => {
      setPosIdx(i => i + 1);
      if (posIdx === 3) setMissionStep('in_transit');
    }, 1800);
    return () => clearTimeout(t);
  }, [posIdx]);

  const stepIdx = STEPS.findIndex(s => s.id === missionStep);

  return (
    <div className="flex flex-col h-screen relative" style={{ background: '#E8F0E0' }}>

      {/* Status bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 z-20"
        style={{ paddingTop: 'calc(12px + var(--safe-top))', height: 'calc(44px + var(--safe-top))' }}>
        <span className="text-[15px] font-bold text-white drop-shadow">9:41</span>
        <div className="flex items-center gap-1 text-[13px] text-white drop-shadow">
          <span>4G</span><span>WiFi</span><span>🔋</span>
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-shrink-0" style={{ height: 460 }}>
        <svg viewBox="0 0 360 460" className="absolute inset-0 w-full h-full">
          {/* Background */}
          <rect width="360" height="460" fill="#E8F0E0"/>
          {/* Streets */}
          <rect x="0" y="195" width="360" height="20" fill="#D0DCCA"/>
          <rect x="155" y="0" width="22" height="460" fill="#D0DCCA"/>
          <rect x="0" y="100" width="360" height="9" fill="#DCE7D6"/>
          <rect x="0" y="310" width="360" height="9" fill="#DCE7D6"/>
          <rect x="55" y="0" width="9" height="460" fill="#DCE7D6"/>
          <rect x="270" y="0" width="9" height="460" fill="#DCE7D6"/>
          {/* Blocks */}
          {[[10,10,35,80],[74,10,72,80],[187,10,74,80],[289,10,56,80],
            [10,109,35,76],[74,109,72,76],[187,109,74,76],[289,109,56,76],
            [10,224,35,76],[74,224,72,76],[187,224,74,76],[289,224,56,76],
            [10,319,35,80],[74,319,72,80],[187,319,74,80],[289,319,56,80]
          ].map(([x,y,w,h],i) => <rect key={i} x={x} y={y} width={w} height={h} rx="5" fill="#CADCC3" stroke="#B8CEB2" strokeWidth="0.5"/>)}
          {/* Route already done */}
          <polyline points={`${POSITIONS[0].x},${POSITIONS[0].y} ${POSITIONS[posIdx].x},${POSITIONS[posIdx].y}`}
            stroke="#1D9E75" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.7"/>
          {/* Route remaining */}
          <polyline points="90,380 90,205 260,205 260,148"
            stroke="#FF5A00" strokeWidth="3.5" fill="none" strokeDasharray="7,5" strokeLinecap="round" opacity="0.7"/>
          {/* Destination */}
          <circle cx="258" cy="148" r="14" fill="#FF5A00" stroke="white" strokeWidth="2.5"/>
          <text x="258" y="152" textAnchor="middle" fontSize="12">🏠</text>
          <circle cx="258" cy="148" r="28" fill="#FF5A00" fillOpacity="0.12"/>
          {/* Me dot */}
          <circle cx="258" cy="165" r="6" fill="#4285F4" stroke="white" strokeWidth="2"/>
          <circle cx="258" cy="165" r="14" fill="#4285F4" fillOpacity="0.15"/>
          {/* Coop marker */}
          <rect x="68" y="36" width="28" height="28" rx="7" fill="white" stroke="#EBEBEB" strokeWidth="1"/>
          <text x="82" y="54" textAnchor="middle" fontSize="14">🛒</text>
        </svg>

        {/* Helper marker — positioned absolutely */}
        <div className="absolute z-10 transition-all duration-[1800ms] ease-in-out"
          style={{ left: pos.x - 23, top: pos.y - 52, transitionProperty: 'left, top' }}>
          <div className="relative flex flex-col items-center">
            <div className="absolute -inset-1.5 rounded-full border-2 border-[--or] animate-[pulseRing_1.5s_ease-out_infinite]" />
            <div className="w-11 h-11 rounded-full bg-[--purple] flex items-center justify-center text-white font-bold text-base border-[3px] border-white shadow-lg">AL</div>
            <div className="bg-[--dark] text-white text-[11px] font-bold rounded-full px-2 py-0.5 mt-1 whitespace-nowrap shadow-md">Alessandro · In moto</div>
          </div>
        </div>

        {/* Floating topbar */}
        <div className="absolute z-20 flex items-center gap-2 px-3" style={{ top: 'calc(54px + var(--safe-top))', left: 0, right: 0 }}>
          <button className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-[--dark] text-lg cursor-pointer border-none flex-shrink-0" onClick={onBack}>←</button>
          <div className="flex-1 bg-white rounded-[14px] shadow-md px-3.5 py-2.5 flex items-center gap-2.5">
            <span className="text-xl">🛒</span>
            <div className="flex-1">
              <div className="text-[13px] font-black text-[--dark]">Spesa supermercato</div>
              <div className="text-[11px] text-[--muted]">Sara L. · Via Tortona 12</div>
            </div>
            <span className="text-[15px] font-black text-[--or]">€12</span>
          </div>
        </div>

        {/* ETA badge */}
        <div className="absolute bottom-4 right-4 z-10 bg-[--dark] rounded-[16px] px-4 py-2 text-center shadow-lg">
          <div className="text-[24px] font-black text-white tracking-tight leading-tight">{pos.eta}</div>
          <div className="text-[10px] text-white/60 font-semibold uppercase tracking-wide">arrivo</div>
        </div>

        {/* LIVE badge */}
        <div className="absolute bottom-4 left-4 z-10 bg-white rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-md">
          <div className="w-2 h-2 rounded-full bg-[--or] animate-[blink_1s_ease-in-out_infinite]" />
          <span className="text-[12px] font-black text-[--dark]">LIVE</span>
        </div>
      </div>

      {/* Bottom sheet */}
      <div className="flex-1 bg-white rounded-t-[24px] -mt-4 px-4 pt-4 shadow-xl overflow-y-auto" style={{ paddingBottom: 'calc(24px + var(--safe-bottom))' }}>
        <div className="w-9 h-1 bg-[--bd] rounded-full mx-auto mb-4" />

        {/* Helper row */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar initials="AL" online size="lg" />
          <div className="flex-1">
            <div className="text-[17px] font-black text-[--dark] tracking-tight">Alessandro L.</div>
            <div className="flex items-center gap-1.5 text-[12px] text-[--muted] mt-0.5">
              <span className="text-[--or]">★ 4.9</span>
              <span>· 248 missioni</span>
              <span className="text-[--green] font-bold">· {formatDistance(pos.dist)} da te</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="w-10 h-10 rounded-full bg-[--bg] border border-[--bd] flex items-center justify-center text-lg cursor-pointer">💬</button>
            <button className="w-10 h-10 rounded-full bg-[--or] flex items-center justify-center text-white text-lg cursor-pointer border-none shadow-[var(--shadow-or)]">📞</button>
          </div>
        </div>

        {/* Progress stepper */}
        <div className="mb-4">
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] border-2 transition-all duration-300"
                    style={{
                      borderColor: i <= stepIdx ? 'var(--or)' : 'var(--bd)',
                      background: i === stepIdx ? 'var(--or)' : i < stepIdx ? 'var(--or-bg)' : 'var(--bg)',
                      color: i === stepIdx ? 'white' : i < stepIdx ? 'var(--or)' : 'var(--muted)',
                      boxShadow: i === stepIdx ? '0 0 0 4px var(--or-bg)' : 'none',
                    }}>
                    {s.icon}
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-[3px] mx-1 rounded-full transition-colors duration-500"
                    style={{ background: i < stepIdx ? 'var(--or)' : 'var(--bd)' }} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            {STEPS.map((s, i) => (
              <span key={s.id} className="text-[10px] font-semibold text-center"
                style={{ color: i === stepIdx ? 'var(--or)' : i < stepIdx ? 'var(--green)' : 'var(--muted)', width: 28, flex: '0 0 28px' }}>
                {s.label.split(' ')[0]}
              </span>
            ))}
          </div>
        </div>

        {/* Info strip */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { val: formatDistance(pos.dist), label: 'Distanza' },
            { val: pos.eta, label: 'ETA arrivo', color: 'var(--or)' },
            { val: '€ 12', label: 'Compenso', color: 'var(--green)' },
          ].map(item => (
            <div key={item.label} className="bg-[--bg] rounded-[14px] p-3 text-center">
              <div className="text-[17px] font-black tracking-tight" style={{ color: item.color ?? 'var(--dark)' }}>{item.val}</div>
              <div className="text-[10px] text-[--muted] font-semibold mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" onClick={onBack}>✕ Annulla</Button>
          <Button variant="green" onClick={() => setShowArrived(true)}>✓ Confermo ricezione</Button>
        </div>
      </div>

      {/* Arrived overlay */}
      {showArrived && (
        <div className="absolute inset-0 bg-black/50 flex items-end z-30 animate-fade-in rounded-[36px]">
          <div className="bg-white rounded-t-[28px] w-full px-5 pt-5 pb-8 animate-slide-up">
            <div className="w-9 h-1 bg-[--bd] rounded-full mx-auto mb-5" />
            <div className="w-18 h-18 w-[72px] h-[72px] rounded-full bg-[--green-bg] flex items-center justify-center mx-auto mb-4 animate-pop-in">
              <span className="text-[36px]">📦</span>
            </div>
            <h2 className="text-[22px] font-black text-[--dark] text-center tracking-tight mb-2">Alessandro è arrivato! 🎉</h2>
            <p className="text-[14px] text-[--muted] text-center leading-relaxed mb-4">La tua spesa è qui. Conferma la ricezione per sbloccare il pagamento.</p>

            <div className="bg-[--bg] rounded-[16px] p-4 mb-5 text-left">
              <div className="text-[12px] font-bold text-[--muted] uppercase tracking-wide mb-3">RIEPILOGO SPESA</div>
              {[
                { label: 'Totale spesa', val: '€ 11,40' },
                { label: 'Compenso helper', val: '€ 12,00', color: 'var(--or)' },
                { label: 'Commissione', val: '€ 1,20', color: 'var(--muted)' },
              ].map(r => (
                <div key={r.label} className="flex justify-between mb-2">
                  <span className="text-[13px] text-[--dark]">{r.label}</span>
                  <span className="text-[13px] font-bold" style={{ color: r.color ?? 'var(--dark)' }}>{r.val}</span>
                </div>
              ))}
              <div className="h-px bg-[--bd] my-2" />
              <div className="flex justify-between">
                <span className="text-[14px] font-black text-[--dark]">Totale</span>
                <span className="text-[14px] font-black text-[--dark]">€ 24,60</span>
              </div>
            </div>

            <Button variant="green" size="lg" fullWidth className="mb-2.5" onClick={() => { setShowArrived(false); onDelivered?.(); }}>
              ✓ Confermo ricezione
            </Button>
            <Button variant="secondary" size="lg" fullWidth onClick={() => setShowArrived(false)}>
              Segnala problema
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
