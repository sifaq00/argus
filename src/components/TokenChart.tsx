'use client';
import { useEffect, useRef, useState } from 'react';
import { CandlestickSeries, createChart, createSeriesMarkers, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts';

interface Trade { time: string; price: number; side: string; signature: string }

interface Candle { time: UTCTimestamp; open: number; high: number; low: number; close: number }

function toCandles(trades: Trade[], bucketSec: number): { candles: Candle[]; marks: { time: number; price: number; side: string }[] } {
  const buckets = new Map<number, Trade[]>();
  for (const t of trades) {
    const b = Math.floor(new Date(t.time).getTime() / 1000 / bucketSec) * bucketSec as UTCTimestamp;
    if (!buckets.has(b)) buckets.set(b, []);
    buckets.get(b)!.push(t);
  }
  const candles: Candle[] = [];
  const marks: { time: UTCTimestamp; price: number; side: string }[] = [];
  for (const [time, ts] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
    const prices = ts.map((t) => t.price);
    candles.push({ time: time as UTCTimestamp, open: prices[0], high: Math.max(...prices), low: Math.min(...prices), close: prices[prices.length - 1] });
    for (const t of ts) marks.push({ time: time as UTCTimestamp, price: t.price, side: t.side });
  }
  return { candles, marks };
}

export default function TokenChart() {
  const ref = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<{ price: number; n: number; up: boolean } | null>(null);

  useEffect(() => {
    let stop = false;
    let chart: IChartApi | null = null;
    let series: ISeriesApi<'Candlestick'> | null = null;
    const load = async () => {
      try {
        const r = await fetch('/api/token/chart');
        if (!r.ok || stop) return;
        const j = await r.json();
        const trades = (j.trades ?? []) as Trade[];
        if (!trades.length || !ref.current) return;
        if (!chart) {
          chart = createChart(ref.current, {
            width: ref.current.clientWidth || 600,
            height: 320,
            layout: { background: { color: 'transparent' }, textColor: 'rgba(255,255,255,0.6)' },
            grid: { vertLines: { color: 'rgba(255,255,255,0.06)' }, horzLines: { color: 'rgba(255,255,255,0.06)' } },
            timeScale: { timeVisible: true, secondsVisible: false },
          });
          series = chart.addSeries(CandlestickSeries, {
            upColor: '#00E676', downColor: '#FF3D3D', borderVisible: false,
            wickUpColor: '#00E676', wickDownColor: '#FF3D3D',
          });
        }
        const { candles, marks } = toCandles(trades, 60);
        series!.setData(candles);
        createSeriesMarkers(series!, marks.map((m) => ({
          time: m.time as UTCTimestamp, position: m.side === 'buy' ? 'belowBar' : 'aboveBar',
          color: m.side === 'buy' ? '#00E676' : '#FF3D3D',
          shape: 'circle', size: 1,
        })));
        chart!.timeScale().fitContent();
        const last = trades[trades.length - 1];
        if (!stop) setStats({ price: last.price, n: trades.length, up: last.price >= trades[0].price });
      } catch { /* chart optional */ }
    };
    load();
    const iv = setInterval(load, 15000);
    const onResize = () => { if (chart && ref.current) chart.applyOptions({ width: ref.current.clientWidth }); };
    window.addEventListener('resize', onResize);
    return () => { stop = true; clearInterval(iv); window.removeEventListener('resize', onResize); chart?.remove(); };
  }, []);

  return (
    <div>
      <div className="flex justify-between items-baseline font-mono mb-1">
        <span className="hud-label">DRILL/SOL LIVE</span>
        {stats && (
          <span className="text-lg font-bold" style={{ color: stats.up ? '#00E676' : '#FF3D3D' }}>
            {stats.price.toLocaleString()} <span className="text-[10px]">({stats.n} trades)</span>
          </span>
        )}
      </div>
      <div ref={ref} className="w-full" />
    </div>
  );
}
