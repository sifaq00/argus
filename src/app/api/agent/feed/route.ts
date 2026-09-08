import { NextResponse } from 'next/server';
import { supabaseAnon } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = supabaseAnon();
    const { data, error } = await db.from('analyses').select('id,created_at,severity,summary').order('created_at', { ascending: false }).limit(20);
    if (error) throw error;
    return NextResponse.json({ items: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Feed unavailable', items: [] }, { status: 503 });
  }
}
