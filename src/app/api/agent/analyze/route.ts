import { NextResponse } from 'next/server';
import { buildAgentPrompt, type AnomalyRow } from '@/lib/agent';
import { isAnomaly } from '@/lib/baseline';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const rl = new Map<string, { count: number; resetAt: number }>();
function limited(ip: string): boolean {
  const now = Date.now();
  const e = rl.get(ip);
  if (!e || now > e.resetAt) { rl.set(ip, { count: 1, resetAt: now + 60_000 }); return false; }
  e.count++;
  return e.count > 5;
}
function stripFences(s: string): string {
  return s.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (limited(ip)) return NextResponse.json({ error: 'Rate limit' }, { status: 429 });
  const { LLM_API_URL, LLM_API_KEY, LLM_MODEL } = process.env;
  if (!LLM_API_URL || !LLM_API_KEY || !LLM_MODEL) {
    return NextResponse.json({ error: 'LLM not configured' }, { status: 503 });
  }
  let db;
  try {
    db = supabaseAdmin();
  } catch {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }
  const { data: latest } = await db.from('snapshots').select('captured_at').order('captured_at', { ascending: false }).limit(1);
  const captured_at: string = latest?.[0]?.captured_at ?? new Date().toISOString();
  const { data: snaps } = await db.from('snapshots').select('source,count').eq('captured_at', captured_at);
  const { data: bases } = await db.from('baselines').select('source,mean,stddev,samples');
  const bmap = new Map(((bases ?? []) as { source: string; mean: number; stddev: number; samples: number }[]).map((b) => [b.source, b]));
  const rows: AnomalyRow[] = ((snaps ?? []) as { source: string; count: number }[]).map((s) => {
    const b = bmap.get(s.source as string);
    return { source: s.source as string, count: s.count as number, mean: Number(b?.mean ?? 0), stddev: Number(b?.stddev ?? 0), samples: Number(b?.samples ?? 0) };
  });
  const hot = rows.filter((r) => isAnomaly(r.count, r.mean, r.stddev, r.samples));
  const prompt = buildAgentPrompt({ captured_at, rows: hot.length ? hot : rows });
  const res = await fetch(LLM_API_URL, {
    method: 'POST',
    signal: AbortSignal.timeout(30000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM_API_KEY}` },
    body: JSON.stringify({ model: LLM_MODEL, temperature: 0.2, max_tokens: 800, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) return NextResponse.json({ error: `LLM HTTP ${res.status}` }, { status: 502 });
  const j = await res.json();
  const content: string = j.choices?.[0]?.message?.content ?? '';
  let parsed: { severity?: string; summary?: string; details?: Record<string, unknown> } = {};
  try {
    parsed = JSON.parse(stripFences(content));
  } catch {
    // LLM flaked (empty/non-JSON). Fall back to a rule-based summary so the
    // feed never dead-ends; the raw snippet goes to function logs.
    console.error('[agent] LLM unparseable, len=%d head=%s', content.length, content.slice(0, 200));
    const top = (hot.length ? hot : rows).slice(0, 3).map((r) => `${r.source} ${r.count}`).join(', ');
    parsed = {
      severity: hot.length ? 'ELEVATED' : 'LOW',
      summary: hot.length
        ? `Anomalous activity: ${top} above 7-day baseline.`
        : `All quiet. Latest counts: ${top || 'no data'}.`,
      details: { notes: 'Rule-based fallback; LLM response unparseable.', captured_at },
    };
  }
  const { data: ins, error } = await db.from('analyses').insert({
    model: LLM_MODEL, severity: parsed.severity ?? 'LOW',
    summary: parsed.summary ?? '', details: { ...(parsed.details ?? {}), captured_at },
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: ins.id, severity: parsed.severity, summary: parsed.summary });
}
