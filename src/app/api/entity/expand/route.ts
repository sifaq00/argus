import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { error: 'Intelligence graph disabled in Argus v1', nodes: [], links: [] },
    { status: 503 },
  );
}
