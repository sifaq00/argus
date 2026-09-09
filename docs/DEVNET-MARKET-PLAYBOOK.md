# Devnet Market Playbook — SPL Token + Orca Pool + Real Trades

> Full reusable guide. Proven end-to-end on Solana devnet. Goal: drill token,
> live market, verifiable trade history — the "proof of testnet" package.

## Table of Contents

1. [Result (proof)](#1-result-proof)
2. [Prerequisites](#2-prerequisites)
3. [Environment & scripts inventory](#3-environment--scripts-inventory)
4. [Step 1 — Drill wallet](#step-1--drill-wallet)
5. [Step 2 — Faucet](#step-2--faucet)
6. [Step 3 — Token mint](#step-3--token-mint)
7. [Step 4 — Check Orca devnet prerequisites](#step-4--check-orca-devnet-prerequisites)
8. [Step 5 — Create Orca v1 pool (manual)](#step-5--create-orca-v1-pool-manual)
9. [Step 6 — Tick arrays](#step-6--tick-arrays)
10. [Step 7 — Open position](#step-7--open-position)
11. [Step 8 — Fund + add liquidity](#step-8--fund--add-liquidity)
12. [Step 9 — Swaps (price moves)](#step-9--swaps-price-moves)
13. [Step 10 — Read price](#step-10--read-price)
14. [Real costs](#real-costs)
15. [Dead ends — do NOT retry](#dead-ends--do-not-retry)
16. [Wiring a chart (next)](#wiring-a-chart-next)
17. [Troubleshooting table](#troubleshooting-table)

---

## 1. Result (proof)

| Artifact | Address |
|---|---|
| Drill mint | `jNbSbe3PSHrUfBdNhLcY2F3UYpUERbXFw4ygLe2NndW` |
| Orca pool (v1, spacing 8) | `JDUAmhVMnm8aT4unwcxhnzX5qvcKVrU8Aj7EooeQypzC` |
| Position | `FUZ8rRHRsCBHxy3qDGg4mFp4V9EXzFytqAJ3KQCYUiqH` |
| Price walk (3 swaps) | 1,000,000 → 985,059 → 970,450 → 956,164 drill/SOL |
| Explorer suffix | `?cluster=devnet` on every link |

## 2. Prerequisites

- Node 18+, npm, PowerShell or bash.
- Free Helius API key (helius.dev). Public RPC (`api.devnet.solana.com`) and
  the public faucet are 429-banned from server IPs — use
  `https://devnet.helius-rpc.com/?api-key=KEY` for every RPC call.
- 0.15 devnet SOL total (0.1 drill wallet + buffer). Get it via
  faucet.solana.com from a residential IP, or transfer from Phantom
  (Settings → Developer Settings → testnet mode → Solana Devnet).
- Solana testnet is deprecated — always choose **devnet**, never testnet.

## 3. Environment & scripts inventory

Work dir (throwaway, never committed): any temp folder.

```bash
npm init -y
npm i @solana/web3.js @solana/spl-token @orca-so/whirlpools-client gill
```

| Script | Purpose |
|---|---|
| `launch.mjs` | Keypair, mint (6 decimals), mint 1B, transfer drill, revoke mint+freeze authorities |
| `pool.mjs` / `pool2.mjs` / `send-pool.mjs` | FAILED Orca v8 attempts (kept as reference, do not run) |
| `ray-pool.mjs` / `ray-clmm.mjs` / `ray-pos.mjs` | FAILED Raydium attempts: CPMM has no devnet program; CLMM pool created (`9s5m…9ayU`) but position needs API-shaped poolInfo that doesn't exist for devnet pools |
| `orca-v1.mjs` | THE working script: pool + arrays + position + liquidity |
| `swap.mjs` | Swap + print price before/after, append to `trades.jsonl` |
| `drill.json` | Drill secret key (gitignore, never share) |
| `position.json` | Opened position refs (resume-safe reruns) |

## Step 1 — Drill wallet

```js
import { Keypair } from '@solana/web3.js';
const dev = Keypair.generate();
fs.writeFileSync('drill.json', JSON.stringify(Array.from(dev.secretKey)));
```

Never share mainnet keys. Devnet throwaway is fine. Never commit `drill.json`.

## Step 2 — Faucet

- faucet.solana.com → devnet → paste address → up to 5 SOL (2 requests / 8h).
- Or Phantom (devnet mode) → transfer to drill address. This also drills the
  operator in sending; verify on Solscan (`?cluster=devnet`).

## Step 3 — Token mint

```js
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, transfer,
  setAuthority, AuthorityType } from '@solana/spl-token';

const mint = await createMint(connection, dev, dev.publicKey, dev.publicKey, 6);
const ata = await getOrCreateAssociatedTokenAccount(connection, dev, mint, dev.publicKey);
await mintTo(connection, dev, mint, ata.address, dev.publicKey, 1_000_000_000n * 1_000_000n);
await transfer(connection, dev, ata.address, friendAta.address, dev.publicKey, 1000n * 1_000_000n);
await setAuthority(connection, dev, mint, dev.publicKey, AuthorityType.MintTokens, null);
await setAuthority(connection, dev, mint, dev.publicKey, AuthorityType.FreezeAccount, null);
```

6 decimals = pump.fun standard. Revoking both authorities locks supply forever
(proof point for the announcement post).

## Step 4 — Check Orca devnet prerequisites

```js
import { getFeeTierAddress, getFeeTierDecoder, getTokenBadgeAddress } from '@orca-so/whirlpools-client';
const DEP = { programId: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  configAddress: 'FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR' };
// scan fee tier indexes 0..11, decode spacing+fee, check account exists
// check getTokenBadgeAddress(cfg, mint) existence per mint
```

Findings on devnet: tiers 1/2/4/8 exist (spacing 1/2/4/8). **No 60/64** → no
splash pools. Token badges MISSING for new mints → `initialize_pool_v2`
impossible → must use v1 `getInitializePoolInstruction`. We used tier idx 8
(spacing 8, fee 500).

## Step 5 — Create Orca v1 pool (manual)

Why manual: `@orca-so/whirlpools` v8 generates vault keypairs internally and
never returns them → un-signable. We generate our own vaults.

Canonical mint order is byte-sorted (WSOL first vs our mint — the SDK asserts
this; keep the order that passes).

Price math: display 1M drill/SOL with 9/6 decimals → raw price 1000.
`sqrtPriceX64 = isqrt(1000 * 2^128)` with BigInt Newton iteration.

Pool PDA: seeds `['whirlpool', config, mintA, mintB, u16le(feeTierIndex)]`
under the whirlpool program. **Derive manually** with
`PublicKey.findProgramAddressSync` — the kit helper crashes when web3.js and
kit copies mix in one process (version skew).

```js
getInitializePoolInstruction({ whirlpoolsConfig, tokenMintA/B, funder,
  whirlpool, tokenVaultA/B (OUR keypairs), feeTier, tickSpacing,
  initialSqrtPrice, whirlpoolBump }, { programAddress });
// signers: [dev, vaultA, vaultB] — newborn vault accounts MUST sign creation
```

Convert kit instruction → web3: `{address, role}` → `{pubkey, isSigner:
role>=2, isWritable: role odd}`. PLUS: mark funder/owner and any newborn
keypairs as signers explicitly (kit roles omit them).

## Step 6 — Tick arrays

Array span = 88 × spacing (704 for spacing 8). Needed starts:
`floor(t/span)*span` for t in {lower, upper, current tick}.

Tick-array PDA seeds: `['tick_array', pool, startTick AS UTF8 STRING]`
(not u16 — string!). Check existence via `getAccountInfo`; init missing with
`getInitializeDynamicTickArrayInstruction({whirlpool, funder, tickArray,
startTickIndex, idempotent:false})`, signer [dev].

## Step 7 — Open position

```js
const positionMint = Keypair.generate(); // WE sign open with it
const [positionAddr, positionBump] = await getPositionAddress(mint58, PROGRAM); // works
const positionAta = getAssociatedTokenAddressSync(positionMint, owner); // created by ix
getOpenPositionInstruction({ funder, owner, position, positionMint,
  positionTokenAccount, whirlpool, positionBump, tickLowerIndex, tickUpperIndex });
// signers: [dev, positionMint]
```

Range: ±2400 ticks around current, snapped to spacing multiples.

## Step 8 — Fund + add liquidity

Wrap SOL: create WSOL ATA if missing + `SystemProgram.transfer` + 
...[truncated 1790 chars]