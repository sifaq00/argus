import { NextResponse } from 'next/server';
import { supabaseAnon } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = supabaseAnon();
    const { data, error } = await db
      .from('token_trades')
      .select('time,price,side,signature')
      .order('time', { ascending: true })
      .limit(200);
    if (error) throw error;
    return NextResponse.json(
      { trades: data ?? [] },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
    );
  } catch {
    return NextResponse.json({ error: 'Chart unavailable', trades: [] }, { status: 503 });
  }
}
