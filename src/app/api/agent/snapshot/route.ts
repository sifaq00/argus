import { NextResponse } from 'next/server';
import { meanStd } from '@/lib/baseline';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SOURCES = ['flights', 'earthquakes', 'fires', 'gdelt-events', 'news'] as const;

function baseUrl(): string {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

function countOf(json: unknown): { count: number; sample: unknown[] } {
  if (!json || typeof json !== 'object') return { count: 0, sample: [] };
  const j = json as Record<string, unknown>;
  const list = (Object.values(j).find(Array.isArray) as unknown[] | undefined) ?? [];
  return { count: typeof j.total === 'number' ? j.total : list.length, sample: list.slice(0, 5) };
}

export async function GET(req: Request) {
  if (process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let db;
  try {
    db = supabaseAdmin();
  } catch {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }
  const captured_at = new Date().toISOString();
  const settled = await Promise.allSettled(
    SOURCES.map(async (s) => {
      const res = await fetch(`${baseUrl()}/api/${s}`, { signal: AbortSignal.timeout(25000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { source: s, ...countOf(await res.json()) };
    }),
  );
  const results = [];
  for (let i = 0; i < SOURCES.length; i++) {
    const s = SOURCES[i];
    const r = settled[i];
    if (r.status === 'fulfilled') {
      await db.from('snapshots').insert({ captured_at, source: s, count: r.value.count, sample: r.value.sample });
      const { data } = await db.from('snapshots').select('count').eq('source', s).order('captured_at', { ascending: false }).limit(7 * 48);
      const values = (data ?? []).map((d) => d.count as number);
      if (values.length >= 5) {
        const { mean, std } = meanStd(values);
        await db.from('baselines').upsert({ source: s, window_days: 7, mean, stddev: std, samples: values.length, updated_at: captured_at });
      }
      results.push({ source: s, count: r.value.count, ok: true });
    } else {
      results.push({ source: s, count: 0, ok: false });
    }
  }
  return NextResponse.json({ captured_at, results });
}
