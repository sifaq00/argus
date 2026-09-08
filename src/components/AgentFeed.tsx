'use client';
import { useEffect, useState } from 'react';

interface Item { id: number; created_at: string; severity: string; summary: string }

export default function AgentFeed() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const r = await fetch('/api/agent/feed');
        if (r.ok && !stop) setItems(((await r.json()).items ?? []) as Item[]);
      } catch { /* feed is optional */ }
    };
    load();
    const iv = setInterval(load, 5 * 60_000);
    return () => { stop = true; clearInterval(iv); };
  }, []);
  if (!items.length) return <div className="hud-label">ARGUS AGENT: NO REPORTS YET</div>;
  return (
    <div>
      <div className="hud-label mb-2">ARGUS AGENT FEED</div>
      {items.map((i) => (
        <div key={i.id} className="mb-2">
          <span>[{i.severity}]</span> <span>{i.summary}</span>
        </div>
      ))}
    </div>
  );
}
