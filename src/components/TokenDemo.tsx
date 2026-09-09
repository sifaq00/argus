'use client';
import { useEffect, useState } from 'react';

interface Demo {
  network: string;
  mint: string;
  supply: string;
  decimals: number;
  recent: { signature: string; time: string | null }[];
  explorer: string;
}

export default function TokenDemo() {
  const [data, setData] = useState<Demo | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let stop = false;
    fetch('/api/token/demo')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => { if (!stop) setData(j); })
      .catch(() => { if (!stop) setError(true); });
    return () => { stop = true; };
  }, []);
  if (error) return <div className="hud-label">TOKEN DEMO: DEVNET UNREACHABLE</div>;
  if (!data) return <div className="hud-label">TOKEN DEMO: LOADING DEVNET…</div>;
  return (
    <div>
      <div className="hud-label mb-2">ARGUS TOKEN DEMO — {data.network.toUpperCase()}</div>
      <div className="mb-1">SUPPLY: {data.supply}</div>
      <div className="mb-2 break-all">MINT: {data.mint}</div>
      <div className="hud-label mb-1">RECENT TRANSACTIONS</div>
      {data.recent.map((t) => (
        <div key={t.signature} className="mb-1 break-all">
          <a href={`${data.explorer}`} target="_blank" rel="noreferrer">
            {t.signature.slice(0, 24)}…
          </a>
        </div>
      ))}
      <a href={data.explorer} target="_blank" rel="noreferrer" className="underline">
        Open in explorer
      </a>
    </div>
  );
}
