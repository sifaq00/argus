// ARGUS swap bot: dust swap on the devnet Orca pool + record to token_trades.
// Env: HELIUS_KEY, DRILL_SECRET (JSON array), SUPABASE_URL,
//   SUPABASE_SERVICE_ROLE_KEY, SIDE=buy|sell (default alternates by minute).
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import {
  getSwapInstruction, getTickArrayAddress, getOracleAddress,
  getWhirlpoolDecoder,
} from '@orca-so/whirlpools-client';

const PROGRAM = 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc';
const POOL = '81tXj5b4Fuyai9gxmXVqk1xoc7wDLAxCLHosc596T9ek';
const WSOL = 'So11111111111111111111111111111111111111112';

const RPC_URL = `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_KEY}`;
const connection = new Connection(RPC_URL, 'confirmed');
const dev = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.DRILL_SECRET)));
const owner = dev.publicKey;

function kitToWeb3(ix) {
  return new TransactionInstruction({
    programId: new PublicKey(ix.programAddress),
    keys: ix.accounts.map((a) => ({
      pubkey: new PublicKey(a.address ?? a.pubkey),
      isSigner: a.role === 2 || a.role === 3 || (a.address ?? a.pubkey) === owner.toBase58(),
      isWritable: a.role === 1 || a.role === 3,
    })),
    data: Buffer.from(ix.data),
  });
}

const poolData = getWhirlpoolDecoder().decode((await connection.getAccountInfo(new PublicKey(POOL))).data);
const SPAN = 88 * poolData.tickSpacing;
const start = Math.floor(poolData.tickCurrentIndex / SPAN) * SPAN;
const [arr0] = await getTickArrayAddress(POOL, start, PROGRAM);
const [arrPrev] = await getTickArrayAddress(POOL, start - SPAN, PROGRAM);
const [arrNext] = await getTickArrayAddress(POOL, start + SPAN, PROGRAM);
const [oracle] = await getOracleAddress(POOL, PROGRAM);
const ataA = getAssociatedTokenAddressSync(new PublicKey(poolData.tokenMintA), owner);
const ataB = getAssociatedTokenAddressSync(new PublicKey(poolData.tokenMintB), owner);

const aIsSol = poolData.tokenMintA === WSOL;
async function price() {
  const d = getWhirlpoolDecoder().decode((await connection.getAccountInfo(new PublicKey(POOL))).data);
  const p = Number(d.sqrtPrice) / 2 ** 64;
  return p * p * 10 ** (aIsSol ? 9 - 6 : 6 - 9); // drill per SOL
}

const SIDE = process.env.SIDE || (Math.random() < 0.52 ? 'buy' : 'sell');
const aToB = SIDE === 'buy' ? aIsSol : !aIsSol;
const seq = aToB ? [arr0, arrPrev, arrPrev] : [arr0, arrNext, arrNext];
const ix = getSwapInstruction({
  whirlpool: POOL, tokenAuthority: owner.toBase58(),
  tokenOwnerAccountA: ataA.toBase58(), tokenOwnerAccountB: ataB.toBase58(),
  tokenVaultA: poolData.tokenVaultA, tokenVaultB: poolData.tokenVaultB,
  tickArray0: seq[0], tickArray1: seq[1], tickArray2: seq[2], oracle,
  amount: SIDE === 'buy'
    ? BigInt(500_000 + Math.floor(Math.random() * 2_000_000))
    : BigInt(400_000_000 + Math.floor(Math.random() * 1_600_000_000)),
  otherAmountThreshold: 1n,
  sqrtPriceLimit: aToB ? 4295048016n : 79226673515401279992447579055n,
  amountSpecifiedIsInput: true, aToB,
}, { programAddress: PROGRAM });
const tx = new Transaction();
tx.add(kitToWeb3(ix));
tx.feePayer = owner;
const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
tx.recentBlockhash = blockhash;
tx.partialSign(dev);
const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
const px = await price();
console.log(`SWAP ${SIDE}:`, sig, 'price:', px);

// record
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const res = await fetch(`${SUPABASE_URL}/rest/v1/token_trades`, {
  method: 'POST',
  headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates' },
  body: JSON.stringify({ signature: sig, time: new Date().toISOString(), price: px, side: SIDE }),
});
if (!res.ok) throw new Error('record failed: ' + (await res.text()));
console.log('RECORDED');
