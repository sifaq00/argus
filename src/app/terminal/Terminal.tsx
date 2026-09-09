'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlestickSeries, HistogramSeries, createChart,
  type IChartApi, type ISeriesApi, type UTCTimestamp,
} from 'lightweight-charts';

interface Trade { time: string; price: number; side: string; signature: string }
interface Paper { id: string; time: string; side: 'buy' | 'sell'; amountSol: number; price: number }

const TF = [60, 300, 900] as const;

function bucketize(trades: Trade[], sec: number) {
  const map = new Map<number, Trade[]>();
  for (const t of trades) {
    const b = Math.floor(new Date(t.time).getTime() / 1000 / sec) * sec;
    if (!map.has(b)) map.set(b, []);
    map.get(b)!.push(t);
  }
  const candles = [...map.entries()].sort((a, b) => a[0] - b[0]).map(([time, ts]) => {
    const p = ts.map((t) => t.price);
    return {
      time: time as UTCTimestamp,
      open: p[0], high: Math.max(...p), low: Math.min(...p), close: p[p.length - 1],
      volume: ts.length,
    };
  });
  return candles;
}

function loadPaper(): Paper[] {
  try { return JSON.parse(localStorage.getItem('argus-paper') || '[]'); } catch { return []; }
}

export default function Terminal() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartApi = useRef<IChartApi | null>(null);
  const candleApi = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volApi = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tf, setTf] = useState<number>(60);
  const [amount, setAmount] = useState('0.001');
  const [paper, setPaper] = useState<Paper[]>([]);
  const [tab, setTab] = useState<'chain' | 'paper'>('chain');

  useEffect(() => { setPaper(loadPaper()); }, []);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/token/chart');
      if (!r.ok) return;
      const j = await r.json();
      setTrades(j.trades ?? []);
    } catch { /* optional */ }
  }, []);
  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 15000);
    return () => clearInterval(iv);
  }, [refresh]);

  const candles = useMemo(() => bucketize(trades, tf), [trades, tf]);
  const last = trades.length ? trades[trades.length - 1].price : 0;
  const first = trades.length ? trades[0].price : 0;
  const up = last >= first;

  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartApi.current) {
      const chart = createChart(chartRef.current, {
        width: chartRef.current.clientWidth || 800,
        height: 460,
        layout: { background: { color: '#0a0e14' }, textColor: 'rgba(255,255,255,0.65)' },
        grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
        timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'rgba(255,255,255,0.15)' },
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.15)' },
      });
      candleApi.current = chart.addSeries(CandlestickSeries, {
        upColor: '#00E676', downColor: '#FF3D3D', borderVisible: false,
        wickUpColor: '#00E676', wickDownColor: '#FF3D3D',
      });
      volApi.current = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' }, priceScaleId: 'vol',
      });
      chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      chartApi.current = chart;
      const onResize = () => { if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth }); };
      window.addEventListener('resize', onResize);
      return () => { window.removeEventListener('resize', onResize); chart.remove(); chartApi.current = null; };
    }
  }, []);

  useEffect(() => {
    if (!candleApi.current || !volApi.current || !chartApi.current) return;
    candleApi.current.setData(candles.map(({ volume, ...c }) => c));
    volApi.current.setData(candles.map((c) => ({
      time: c.time, value: c.volume,
      color: c.close >= c.open ? 'rgba(0,230,118,0.4)' : 'rgba(255,61,61,0.4)',
    })));
    chartApi.current.timeScale().fitContent();
  }, [candles]);

  const place = (side: 'buy' | 'sell') => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !last) return;
    const next = [...paper, { id: `${Date.now()}`, time: new Date().toISOString(), side, amountSol: amt, price: last }];
    setPaper(next);
    localStorage.setItem('argus-paper', JSON.stringify(next));
  };

  const pos = useMemo(() => {
    let d = 0, s = 0;
    for (const p of paper) {
      const units = (p.amountSol / p.price) * 1e6;
      if (p.side === 'buy') { d += units; s += p.amountSol; } else { d -= units; s -= p.amountSol; }
    }
    return { drill: d, spent: s, cur: (d / 1e6) * last };
  }, [paper, last]);
  const pnl = paper.length && last ? pos.cur - pos.spent : 0;

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white">
      <header className="flex items-center gap-4 px-4 py-2 border-b border-white/10 font-mono">
        <span className="font-bold">DRILL/SOL</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00E676]/15 text-[#00E676]">DEVNET · PAPER</span>
        <span className="text-2xl font-bold" style={{ color: up ? '#00E676' : '#FF3D3D' }}>
          {last ? last.toLocaleString() : '—'}
        </span>
        <span className="text-xs text-white/50">{trades.length} chain trades</span>
      </header>

      <div className="flex flex-col lg:flex-row">
        <div className="flex-1 min-w-0 p-3">
          <div className="flex gap-1 mb-2">
            {TF.map((t) => (
              <button key={t} onClick={() => setTf(t)}
                className={`px-2.5 py-1 text-xs font-mono rounded ${tf === t ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/5'}`}>
                {t / 60}m
              </button>
            ))}
          </div>
          <div ref={chartRef} className="w-full" />
        </div>

        <aside className="w-full lg:w-[280px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 p-3 font-mono">
          <div className="text-xs text-white/50 mb-2">PAPER TRADE (simulated)</div>
          <div className="flex gap-2 mb-2">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal"
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-2 py-2 text-sm" placeholder="SOL amount" />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button onClick={() => place('buy')} className="py-2.5 rounded font-bold bg-[#00E676]/20 text-[#00E676] hover:bg-[#00E676]/30">BUY</button>
            <button onClick={() => place('sell')} className="py-2.5 rounded font-bold bg-[#FF3D3D]/20 text-[#FF3D3D] hover:bg-[#FF3D3D]/30">SELL</button>
          </div>
          <div className="text-xs space-y-1.5">
            <div className="flex justify-between"><span className="text-white/50">Position</span><span>{(pos.drill / 1e6).toFixed(1)} DRILL</span></div>
            <div className="flex justify-between"><span className="text-white/50">Net spent</span><span>{pos.spent.toFixed(4)} SOL</span></div>
            <div className="flex justify-between"><span className="text-white/50">Value</span><span>{pos.cur.toFixed(4)} SOL</span></div>
            <div className="flex justify-between font-bold">
              <span className="text-white/50">PnL</span>
              <span style={{ color: pnl >= 0 ? '#00E676' : '#FF3D3D' }}>{pnl >= 0 ? '+' : ''}{pnl.toFixed(5)} SOL</span>
            </div>
          </div>
          <div className="text-[10px] text-white/30 mt-3">Fills at live pool price. No real funds move.</div>
        </aside>
      </div>

      <div className="border-t border-white/10 px-4 py-2 font-mono text-xs">
        <div className="flex gap-4 mb-2">
          <button onClick={() => setTab('chain')} className={tab === 'chain' ? 'text-white' : 'text-white/40'}>CHAIN TRADES</button>
          <button onClick={() => setTab('paper')} className={tab === 'paper' ? 'text-white' : 'text-white/40'}>MY PAPER ({paper.length})</button>
        </div>
        <div className="max-h-48 overflow-y-auto">
          {tab === 'chain' ? (
            <table className="w-full text-left">
              <tbody>
                {[...trades].reverse().slice(0, 50).map((t) => (
                  <tr key={t.signature} className="border-t border-white/5">
                    <td className="py-1 pr-3" style={{ color: t.side === 'buy' ? '#00E676' : '#FF3D3D' }}>{t.side.toUpperCase()}</td>
                    <td className="pr-3">{t.price.toLocaleString()}</td>
                    <td className="text-white/40">{new Date(t.time).toLocaleTimeString()}</td>
                    <td className="text-white/40 hidden sm:table-cell">{t.signature.slice(0, 12)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <tbody>
                {[...paper].reverse().map((p) => (
                  <tr key={p.id} className="border-t border-white/5">
                    <td className="py-1 pr-3" style={{ color: p.side === 'buy' ? '#00E676' : '#FF3D3D' }}>{p.side.toUpperCase()}</td>
                    <td className="pr-3">{p.amountSol} SOL @ {p.price.toLocaleString()}</td>
                    <td className="text-white/40">{new Date(p.time).toLocaleTimeString()}</td>
                  </tr>
                ))}
                {!paper.length && <tr><td className="py-2 text-white/40">No paper trades yet.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
