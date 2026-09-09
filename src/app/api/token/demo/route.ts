import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MINT = 'jNbSbe3PSHrUfBdNhLcY2F3UYpUERbXFw4ygLe2NndW';
const RPC = 'https://api.devnet.solana.com';

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(RPC, {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(j.error.message || 'RPC error');
  return j.result;
}

export async function GET() {
  try {
    const [supply, sigs] = await Promise.all([
      rpc('getTokenSupply', [MINT, { commitment: 'confirmed' }]),
      rpc('getSignaturesForAddress', [MINT, { limit: 5, commitment: 'confirmed' }]),
    ]);
    return NextResponse.json(
      {
        network: 'solana-devnet',
        mint: MINT,
        supply: supply.value.uiAmountString,
        decimals: supply.value.decimals,
        recent: (sigs as { signature: string; blockTime: number | null }[]).map((s) => ({
          signature: s.signature,
          time: s.blockTime ? new Date(s.blockTime * 1000).toISOString() : null,
        })),
        explorer: `https://explorer.solana.com/address/${MINT}?cluster=devnet`,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
    );
  } catch {
    return NextResponse.json({ error: 'Devnet unreachable' }, { status: 502 });
  }
}
