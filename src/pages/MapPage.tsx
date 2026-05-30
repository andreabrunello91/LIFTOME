import React, { useState, useEffect, useRef } from 'react';
import { Avatar, StatusBadge } from '@/components/ui';
import { getCategory, formatDistance, formatEuroCompact } from '@/lib/utils';
import type { Request } from '@/types';

// Mock requests with coords (Milan area)
const MOCK_PINS = [
  { id:'1', lat:45.4620, lng:9.1800, category:'spesa'    as const, price:12, dist:180, title:'Spesa Coop' },
  { id:'2', lat:45.4585, lng:9.1740, category:'cane'     as const, price:8,  dist:350, title:'Passeggiata cane' },
  { id:'3', lat:45.4600, lng:9.1860, category:'fila'     as const, price:10, dist:520, title:'Fila posta' },
  { id:'4', lat:45.4640, lng:9.1750, category:'consegna' as const, price:9,  dist:680, title:'Consegna pacchi' },
];

const HELPERS_ON_MAP = [
  { id:'h1', lat:45.4612, lng:9.1810, initials:'AL', name:'Alessandro L.' },
  { id:'h2', lat:45.4598, lng:9.1770, initials:'CM', name:'Chiara M.' },
  { id:'h3', lat:45.4625, lng:9.1835, initials:'RF', name:'Roberto F.' },
];

interface MapPageProps {
  onSelectRequest?: (req: any) => void;
}

export default function MapPage({ onSelectRequest }: MapPageProps) {
  const mapRef          = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapboxMap, setMapboxMap] = useState<any>(null);

  // Try to load Mapbox if token is available
  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token || token === 'pk.tuo-token-mapbox') {
      setMapLoaded(false);
      return;
    }

    let map: any;
    import('mapbox-gl').then(({ default: mapboxgl }) => {
      mapboxgl.accessToken = token;
      if (!mapRef.current) return;

      map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [9.1840, 45.4610],
        zoom: 15,
        pitch: 30,
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'top-right');

      map.on('load', () => {
        setMapLoaded(true);
        setMapboxMap(map);

        // Add request pins
        MOCK_PINS.forEach(pin => {
          const cat = getCategory(pin.category);
          const el = document.createElement('div');
          el.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;font-size:18px;border:2.5px solid ${cat.color};box-shadow:0 2px 8px rgba(0,0,0,.2);cursor:pointer;">${cat.emoji}</div>`;
          el.addEventListener('click', () => setSelected(pin.id));

          new mapboxgl.Marker({ element: el })
            .setLngLat([pin.lng, pin.lat])
            .addTo(map);
        });

        // Add helper pins
        HELPERS_ON_MAP.forEach(h => {
          const el = document.createElement('div');
          el.innerHTML = `<div style="width:32px;height:32px;border-radius:50%;background:#534AB7;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:white;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,.2);">${h.initials}</div>`;
          new mapboxgl.Marker({ element: el })
            .setLngLat([h.lng, h.lat])
            .addTo(map);
        });
      });
    }).catch(() => setMapLoaded(false));

    return () => { map?.remove(); };
  }, []);

  const selectedPin = MOCK_PINS.find(p => p.id === selected);

  return (
    <div className="relative flex flex-col" style={{ height: '100dvh', paddingTop: 'var(--safe-top)' }}>
      {/* Header */}
      <div className="absolute z-10 left-0 right-0 flex items-center gap-2.5 px-4" style={{ top: 'calc(52px + var(--safe-top))' }}>
        <div className="flex-1 bg-white rounded-[14px] shadow-lg px-3.5 py-2.5 flex items-center gap-2.5 border border-[--bd]">
          <span className="text-[--muted]">🔍</span>
          <span className="text-[14px] text-[--muted]">Cerca in questa zona...</span>
        </div>
        <button className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border border-[--bd] cursor-pointer">
          ⚙
        </button>
      </div>

      {/* Map area */}
      <div className="flex-1 relative">
        {/* Mapbox container */}
        <div ref={mapRef} className="absolute inset-0" />

        {/* Fallback SVG map (when no Mapbox token) */}
        {!mapLoaded && (
          <div className="absolute inset-0 overflow-hidden" style={{ background: '#E8F0E0' }}>
            <svg viewBox="0 0 360 600" className="w-full h-full">
              <rect width="360" height="600" fill="#E8F0E0"/>
              {/* Streets */}
              <rect x="0" y="240" width="360" height="22" fill="#D0DCCA"/>
              <rect x="160" y="0" width="22" height="600" fill="#D0DCCA"/>
              <rect x="0" y="120" width="360" height="10" fill="#DCE7D6"/>
              <rect x="0" y="380" width="360" height="10" fill="#DCE7D6"/>
              <rect x="60" y="0" width="10" height="600" fill="#DCE7D6"/>
              <rect x="280" y="0" width="10" height="600" fill="#DCE7D6"/>
              {/* Blocks */}
              {[[10,10,40,100],[80,10,70,100],[192,10,78,100],[298,10,52,100],
                [10,130,40,100],[80,130,70,100],[192,130,78,100],[298,130,100,100],
                [10,262,40,108],[80,262,70,108],[192,262,78,108],[298,262,52,108],
                [10,400,40,110],[80,400,70,110],[192,400,78,110],[298,400,52,110],
              ].map(([x,y,w,h],i)=><rect key={i} x={x} y={y} width={w} height={h} rx="6" fill="#CADCC3" stroke="#B8CEB2" strokeWidth="0.5"/>)}
              {/* User dot */}
              <circle cx="171" cy="251" r="8" fill="#4285F4" stroke="white" strokeWidth="2.5"/>
              <circle cx="171" cy="251" r="20" fill="#4285F4" fillOpacity="0.15"/>
              {/* Request pins */}
              <circle cx="110" cy="195" r="18" fill="white" stroke="#FF5A00" strokeWidth="2"/>
              <text x="110" y="201" textAnchor="middle" fontSize="16">🛒</text>
              <circle cx="220" cy="300" r="18" fill="white" stroke="#1D9E75" strokeWidth="2"/>
              <text x="220" y="306" textAnchor="middle" fontSize="16">🐕</text>
              <circle cx="80" cy="320" r="18" fill="white" stroke="#BA7517" strokeWidth="2"/>
              <text x="80" y="326" textAnchor="middle" fontSize="16">⏳</text>
              <circle cx="280" cy="180" r="18" fill="white" stroke="#534AB7" strokeWidth="2"/>
              <text x="280" y="186" textAnchor="middle" fontSize="16">📦</text>
              {/* Helper dots */}
              {[{x:130,y:260,i:'AL',c:'#534AB7'},{x:240,y:240,i:'CM',c:'#0F6E56'},{x:90,y:280,i:'RF',c:'#993556'}].map(h=>(
                <g key={h.i}>
                  <circle cx={h.x} cy={h.y} r="14" fill={h.c} stroke="white" strokeWidth="2"/>
                  <text x={h.x} y={h.y+4} textAnchor="middle" fontSize="9" fontWeight="700" fill="white">{h.i}</text>
                </g>
              ))}
            </svg>

            {/* Clickable overlays for SVG pins */}
            <div className="absolute inset-0">
              {MOCK_PINS.map((pin, i) => {
                const positions = [{left:'28%',top:'32%'},{left:'59%',top:'50%'},{left:'18%',top:'52%'},{left:'75%',top:'29%'}];
                const pos = positions[i];
                return (
                  <button key={pin.id}
                    className="absolute w-9 h-9 rounded-full -translate-x-1/2 -translate-y-1/2 cursor-pointer bg-transparent border-none"
                    style={{ left: pos.left, top: pos.top }}
                    onClick={() => setSelected(selected === pin.id ? null : pin.id)} />
                );
              })}
            </div>
          </div>
        )}

        {/* Live badge */}
        <div className="absolute bottom-4 left-4 z-10 bg-white rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-md border border-[--bd]">
          <div className="w-2 h-2 rounded-full bg-[--or]" style={{ animation: 'blink 1s ease-in-out infinite' }} />
          <span className="text-[12px] font-black text-[--dark]">LIVE</span>
        </div>

        {/* Stats badge */}
        <div className="absolute bottom-4 right-4 z-10 bg-white rounded-[14px] px-3 py-2 shadow-md border border-[--bd] text-center">
          <div className="text-[13px] font-black text-[--dark]">{MOCK_PINS.length} richieste</div>
          <div className="text-[11px] text-[--green] font-semibold">{HELPERS_ON_MAP.length} helper online</div>
        </div>

        {/* Category filter pills on map */}
        <div className="absolute z-10 flex gap-2 overflow-x-auto no-scrollbar px-4"
          style={{ top: 'calc(106px + var(--safe-top))' }}>
          {[{id:'all',e:'⚡',l:'Tutti'},{id:'spesa',e:'🛒',l:'Spesa'},{id:'cane',e:'🐕',l:'Cane'},{id:'consegna',e:'📦',l:'Consegne'},{id:'fila',e:'⏳',l:'Code'}].map(f => (
            <button key={f.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold bg-white border border-[--bd] shadow-sm whitespace-nowrap flex-shrink-0 cursor-pointer">
              {f.e} {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Selected pin card */}
      {selectedPin && (
        <div className="absolute bottom-0 left-0 right-0 z-20 animate-slide-up"
          style={{ paddingBottom: 'calc(80px + var(--safe-bottom))' }}>
          <div className="mx-4 bg-white rounded-[20px] border border-[--bd] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[--bd]">
              <StatusBadge
                label={`${getCategory(selectedPin.category).emoji} ${getCategory(selectedPin.category).label}`}
                color={getCategory(selectedPin.category).color}
                bg={getCategory(selectedPin.category).bg} />
              <button className="text-[--muted] bg-transparent border-none cursor-pointer text-lg" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="p-4">
              <h3 className="text-[16px] font-black text-[--dark] tracking-tight mb-1">{selectedPin.title}</h3>
              <div className="flex items-center gap-3 text-[13px] text-[--muted] mb-4">
                <span>📍 {formatDistance(selectedPin.dist)}</span>
                <span className="text-[--or] font-bold">⏱ ~8 min</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex-1">
                  <div className="text-[22px] font-black text-[--dark] tracking-tight">{formatEuroCompact(selectedPin.price)}</div>
                  <div className="text-[11px] text-[--muted]">Compenso</div>
                </div>
                <button
                  className="flex-1 py-3.5 bg-[--or] text-white font-black text-[15px] rounded-[14px] border-none cursor-pointer active:opacity-80 transition-opacity"
                  onClick={() => { setSelected(null); onSelectRequest?.(selectedPin); }}>
                  Accetta missione →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
