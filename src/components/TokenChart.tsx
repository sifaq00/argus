'use client';
import { useEffect, useState } from 'react';

interface Trade { time: string; price: number; side: string; signature: string }

export default function TokenChart() {
  const [trades, setTrades] = useState<Trade[] | null>(null);
  useEffect(() => {
    let stop = false;
    const load = () => {
      fetch('/api/token/chart')
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((j) => { if (!stop) setTrades(j.trades); })
        .catch(() => { if (!stop) setTrades([]); });
    };
    load();
    const iv = setInterval(load, 15000);
    return () => { stop = true; clearInterval(iv); };
  }, []);
  if (!trades) return <div className="hud-label">CHART: LOADING…</div>;
  if (!trades.length) return <div className="hud-label">CHART: NO TRADES YET</div>;
  const w = 300, h = 80;
  const prices = trades.map((t) => t.price);
  const min = Math.min(...prices), max = Math.max(...prices);
  const span = max - min || 1;
  const pts = trades.map((t, i) =>
    `${((i / Math.max(trades.length - 1, 1)) * w).toFixed(1)},${(h - ((t.price - min) / span) * (h - 8) - 4).toFixed(1)}`,
  );
  const last = trades[trades.length - 1];
  const up = last.price >= trades[0].price;
  return (
    <div>
      <div className="flex justify-between text-[10px] font-mono mb-1">
        <span className="hud-label">DRILL/SOL LIVE</span>
        <span style={{ color: up ? '#00E676' : '#FF3D3D' }}>{last.price.toLocaleString()} ({trades.length} trades)</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" preserveAspectRatio="none">
        <polyline points={pts.join(' ')} fill="none" stroke={up ? '#00E676' : '#FF3D3D'} strokeWidth="1.5" />
        {trades.map((t, i) => {
          const [x, y] = pts[i].split(',');
          return <circle key={t.signature} cx={x} cy={y} r="2" fill={t.side === 'buy' ? '#00E676' : '#FF3D3D'} />;
        })}
      </svg>
    </div>
  );
}
