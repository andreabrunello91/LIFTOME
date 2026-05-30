import React, { useState, useRef, useEffect } from 'react';
import { Avatar } from '@/components/ui';
import { formatRelativeTime } from '@/lib/utils';
import { getCategory } from '@/lib/utils';

interface Msg { id: string; sent: boolean; text?: string; type: 'text' | 'system' | 'card'; card?: { title: string; emoji: string; body: string }; time: string; }

const CONVS = [
  {
    id: 'al', name: 'Alessandro L.', initials: 'AL', online: true,
    tag: { label: '🛒 Spesa', color: 'var(--or-dark)', bg: 'var(--or-bg)' },
    statusTag: { label: 'In corso', color: 'var(--green-dark)', bg: 'var(--green-bg)' },
    preview: 'Ho trovato tutto, arrivo in 8 min! 🛒', unread: true, time: 'adesso',
    msgs: [
      { id:'1', sent:false, type:'text', text:'Ciao! Ho visto la tua lista, parto subito dal Coop 👍', time:'9:28' },
      { id:'2', sent:true, type:'text', text:'Perfetto grazie! Se non trovi il latte di avena va bene anche quello di riso 🙏', time:'9:29' },
      { id:'3', sent:false, type:'text', text:'Ok capito! Ho trovato tutto tranne le chips bio, va bene quelle normali?', time:'9:35' },
      { id:'4', sent:true, type:'text', text:'Sì sì, tranquillo! 😊', time:'9:36' },
      { id:'5', sent:false, type:'card', card:{ title:'Foto scontrino 🧾', emoji:'🧾', body:'Totale: € 11,40 · Resto: € 0,60' }, time:'9:38' },
      { id:'6', sent:false, type:'text', text:'Ho trovato tutto! Arrivo in 8 minuti 🛒', time:'9:41' },
      { id:'7', sent:false, type:'system', text:'📍 Alessandro è a 180 m da te', time:'' },
    ] as Msg[],
  },
  {
    id: 'cm', name: 'Chiara M.', initials: 'CM', online: true,
    tag: { label: '🐕 Cane', color: 'var(--green-dark)', bg: 'var(--green-bg)' },
    statusTag: { label: 'Completata', color: '#5F5E5A', bg: '#F1EFE8' },
    preview: 'Ottimo, grazie mille! Ci risentiamo 😊', unread: false, time: 'ieri',
    msgs: [
      { id:'1', sent:false, type:'text', text:'Buongiorno! Sono qui sotto, posso salire a prendere Birillo? 🐕', time:'10:02' },
      { id:'2', sent:true, type:'text', text:'Sì arrivo subito! Il guinzaglio è già pronto 😊', time:'10:03' },
      { id:'3', sent:false, type:'text', text:'Birillo è adorabile! Stiamo facendo un giro ai Navigli 🌿', time:'10:22' },
      { id:'4', sent:false, type:'card', card:{ title:'Foto passeggiata 📸', emoji:'🐕', body:'Birillo sta benissimo!' }, time:'10:25' },
      { id:'5', sent:false, type:'system', text:'Missione completata ✓', time:'' },
      { id:'6', sent:true, type:'text', text:'Ottimo, grazie mille! Ci risentiamo 😊', time:'10:33' },
    ] as Msg[],
  },
  {
    id: 'rf', name: 'Roberto F.', initials: 'RF', online: false,
    tag: { label: '🏠 Trasloco', color: 'var(--purple-dark)', bg: '#EEF2FF' },
    statusTag: { label: 'Programmata', color: 'var(--amber-dark)', bg: 'var(--amber-bg)' },
    preview: 'Perfetto, a domani allora per il trasloco', unread: false, time: 'lun',
    msgs: [
      { id:'1', sent:false, type:'text', text:'Ciao! Ho letto la richiesta, quante scale ci sono?', time:'15:10' },
      { id:'2', sent:true, type:'text', text:'Ciao Roberto! Tre piani, niente ascensore purtroppo 😅', time:'15:14' },
      { id:'3', sent:false, type:'text', text:'Nessun problema! Sono abituato. Ci vediamo domani mattina alle 10?', time:'15:16' },
      { id:'4', sent:true, type:'text', text:'Perfetto, a domani allora per il trasloco 💪', time:'15:18' },
      { id:'5', sent:false, type:'system', text:'Missione confermata per domani 10:00 ✓', time:'' },
    ] as Msg[],
  },
];

interface ChatPageProps { onBack?: () => void; }

export default function ChatPage({ onBack }: ChatPageProps) {
  const [openConv, setOpenConv] = useState<string | null>(null);
  const conv = CONVS.find(c => c.id === openConv);

  if (conv) return <ConversationView conv={conv} onBack={() => setOpenConv(null)} />;

  return (
    <div className="flex flex-col" style={{ paddingTop: 'var(--safe-top)' }}>
      <div className="bg-white px-4 pt-12 pb-4 border-b border-[--bd]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[22px] font-black text-[--dark] tracking-tight">Messaggi</h1>
          <button className="w-9 h-9 rounded-full bg-[--bg] border border-[--bd] flex items-center justify-center text-base cursor-pointer">✏</button>
        </div>
        <div className="flex items-center gap-2 bg-[--bg] border border-[--bd] rounded-[12px] px-3 py-2.5">
          <span className="text-[--muted]">🔍</span>
          <span className="text-[14px] text-[--muted]">Cerca conversazioni...</span>
        </div>
      </div>

      {/* Active mission banner */}
      <div className="mx-4 mt-3 bg-[--or] rounded-[18px] p-3.5 flex items-center justify-between cursor-pointer active:opacity-90" onClick={() => setOpenConv('al')}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xl">🛒</div>
          <div>
            <div className="text-[14px] font-black text-white">Missione in corso</div>
            <div className="text-[12px] text-white/65">Alessandro sta facendo la spesa</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[20px] font-black text-white leading-tight">8'</div>
          <div className="text-[10px] text-white/65 font-semibold">arrivo</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 mt-2">
        {CONVS.map(c => (
          <div key={c.id}
            className="flex items-center gap-3 px-4 py-3.5 bg-white border-b border-[--bd] cursor-pointer active:bg-[--bg] transition-colors"
            onClick={() => setOpenConv(c.id)}>
            <Avatar initials={c.initials} online={c.online} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[15px] font-black text-[--dark]">{c.name}</span>
                <span className="text-[12px] text-[--muted]">{c.time}</span>
              </div>
              <p className={`text-[13px] truncate ${c.unread ? 'text-[--dark] font-bold' : 'text-[--muted]'}`}>{c.preview}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: c.tag.bg, color: c.tag.color }}>{c.tag.label}</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: c.statusTag.bg, color: c.statusTag.color }}>{c.statusTag.label}</span>
                {c.unread && <div className="w-2 h-2 rounded-full bg-[--or] ml-auto flex-shrink-0" />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Conversation ─────────────────────────────────────────────────────────────
function ConversationView({ conv, onBack }: { conv: typeof CONVS[0]; onBack: () => void }) {
  const [msgs, setMsgs]   = useState(conv.msgs);
  const [text, setText]   = useState('');
  const [showQR, setShowQR] = useState(conv.id === 'al');
  const endRef = useRef<HTMLDivElement>(null);
  const catInfo = conv.id === 'al' ? { color:'var(--or-dark)', bg:'var(--or-bg)', bd:'var(--or-bd)', label:'🛒 Spesa · Via Tortona 26 · € 12', status:'In corso', statusColor:'var(--green)' }
                : conv.id === 'cm' ? { color:'var(--green-dark)', bg:'var(--green-bg)', bd:'#9FE1CB', label:'🐕 Passeggiata · Navigli · € 8', status:'Completata', statusColor:'var(--muted)' }
                : { color:'var(--purple-dark)', bg:'#EEF2FF', bd:'#AFA9EC', label:'🏠 Trasloco · Via Tortona · € 40', status:'Domani', statusColor:'var(--amber)' };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  function send(t?: string) {
    const txt = (t ?? text).trim();
    if (!txt) return;
    setMsgs(m => [...m, { id: Date.now().toString(), sent: true, type: 'text', text: txt, time: new Date().toLocaleTimeString('it',{hour:'2-digit',minute:'2-digit'}) }]);
    setText(''); setShowQR(false);
    if (conv.id === 'al') {
      setTimeout(() => {
        setMsgs(m => [...m, { id: Date.now().toString(), sent: false, type: 'text', text: 'Ok, ci vediamo tra poco! 👍', time: new Date().toLocaleTimeString('it',{hour:'2-digit',minute:'2-digit'}) }]);
      }, 1200);
    }
  }

  return (
    <div className="flex flex-col h-screen" style={{ paddingTop: 'var(--safe-top)' }}>
      {/* Header */}
      <div className="bg-white px-3 pt-12 pb-3 border-b border-[--bd] flex items-center gap-2.5">
        <button className="w-9 h-9 rounded-full bg-[--bg] border border-[--bd] flex items-center justify-center text-lg cursor-pointer flex-shrink-0" onClick={onBack}>←</button>
        <Avatar initials={conv.initials} online={conv.online} size="sm" />
        <div className="flex-1">
          <div className="text-[15px] font-black text-[--dark]">{conv.name}</div>
          <div className="text-[12px] font-semibold" style={{ color: conv.online ? 'var(--green)' : 'var(--muted)' }}>
            {conv.online ? 'Online' : 'Offline'}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="w-9 h-9 rounded-full bg-[--bg] border border-[--bd] flex items-center justify-center text-base cursor-pointer">📞</button>
          <button className="w-9 h-9 rounded-full bg-[--bg] border border-[--bd] flex items-center justify-center text-base cursor-pointer">⋮</button>
        </div>
      </div>

      {/* Mission strip */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[--bd]" style={{ background: catInfo.bg, borderColor: catInfo.bd }}>
        <div>
          <div className="text-[13px] font-black" style={{ color: catInfo.color }}>{catInfo.label}</div>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] font-bold" style={{ color: catInfo.statusColor }}>
          ● {catInfo.status}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-[--bg] px-3 py-3 flex flex-col gap-1.5">
        <div className="text-center mb-1">
          <span className="text-[11px] font-semibold text-[--muted] bg-[--bg] px-3 py-1 rounded-full border border-[--bd]">Oggi</span>
        </div>
        {msgs.map(msg => {
          if (msg.type === 'system') return (
            <div key={msg.id} className="text-center my-1">
              <span className="text-[12px] text-[--muted] bg-white px-3 py-1 rounded-full border border-[--bd] font-medium">{msg.text}</span>
            </div>
          );
          if (msg.type === 'card') return (
            <div key={msg.id} className={`flex ${msg.sent ? 'justify-end' : 'items-end gap-2'}`}>
              {!msg.sent && <Avatar initials={conv.initials} size="xs" />}
              <div>
                <div className="bg-white rounded-[16px] border border-[--bd] p-3 max-w-[220px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-[8px] bg-[--green-bg] flex items-center justify-center text-sm">📸</div>
                    <span className="text-[13px] font-black text-[--dark]">{msg.card!.title}</span>
                  </div>
                  <div className="bg-[--bg] rounded-[8px] p-3 text-center text-2xl mb-2">{msg.card!.emoji}</div>
                  <div className="text-[12px] text-[--muted]">{msg.card!.body}</div>
                </div>
                <div className="text-[11px] text-[--muted] mt-0.5 px-1">{msg.time}</div>
              </div>
            </div>
          );
          return (
            <div key={msg.id} className={`flex ${msg.sent ? 'justify-end' : 'items-end gap-2'}`}>
              {!msg.sent && <Avatar initials={conv.initials} size="xs" />}
              <div className={`max-w-[75%] ${msg.sent ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`px-3.5 py-2.5 rounded-[18px] text-[14px] leading-relaxed ${msg.sent ? 'text-white rounded-br-[5px]' : 'text-[--dark] border border-[--bd] rounded-bl-[5px]'}`}
                  style={{ background: msg.sent ? 'var(--or)' : 'white' }}>
                  {msg.text}
                </div>
                <div className={`text-[11px] text-[--muted] mt-0.5 px-1 ${msg.sent ? 'text-right' : ''}`}>{msg.time} {msg.sent && '✓✓'}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Quick replies */}
      {showQR && (
        <div className="flex gap-2 overflow-x-auto px-3 py-2 bg-[--bg] border-t border-[--bd] no-scrollbar">
          {['Ok, ti aspetto! 👍', 'Suona al citofono', 'Grazie mille!', 'Lascia fuori dalla porta'].map(qr => (
            <button key={qr}
              className="flex-shrink-0 px-3.5 py-2 bg-white border-[1.5px] border-[--bd] rounded-full text-[13px] font-bold text-[--dark] cursor-pointer active:bg-[--or-bg] active:border-[--or-bd] active:text-[--or-dark] whitespace-nowrap"
              onClick={() => send(qr)}>
              {qr}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-[--bd] px-3 py-2.5 flex items-center gap-2" style={{ paddingBottom: 'calc(10px + var(--safe-bottom))' }}>
        <button className="w-9 h-9 rounded-full bg-[--bg] border border-[--bd] flex items-center justify-center text-base cursor-pointer flex-shrink-0">+</button>
        <input
          className="flex-1 bg-[--bg] border border-[--bd] rounded-full px-4 py-2.5 text-[14px] text-[--dark] outline-none placeholder:text-[#C0BDB6]"
          placeholder="Scrivi un messaggio..."
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()} />
        <button className="w-9 h-9 rounded-full bg-[--bg] border border-[--bd] flex items-center justify-center text-base cursor-pointer flex-shrink-0">🎤</button>
        <button
          className="w-9 h-9 rounded-full bg-[--or] flex items-center justify-center text-white text-base cursor-pointer flex-shrink-0 active:bg-[#E04D00] transition-colors"
          onClick={() => send()}>
          ➤
        </button>
      </div>
    </div>
  );
}
