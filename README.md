<div align="center">

# ⬡ ARGUS

### Live global intelligence — watched by an agent, not a dashboard

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![MapLibre](https://img.shields.io/badge/MapLibre_GL-GPU_Rendered-396CB2?style=for-the-badge)](https://maplibre.org)
[![License](https://img.shields.io/badge/License-MIT-D4AF37?style=for-the-badge)](LICENSE)

**ARGUS watches live global data and reports what changed — military flight
activity up 3x over the 7-day baseline, a Telegram surge from channel Y, a
quake cluster on a tectonic corridor — as a narrative feed. No screen-staring.**

[Join Discord](https://discord.gg/argus)

</div>

---

## Overview

Argus is built on a real-time OSINT map foundation (Next.js 16 + MapLibre GL,
WebGL-rendered at 60fps) with an agent layer on top: snapshots every 30 minutes
go to Supabase, baselines are computed over a 7-day rolling window, and an LLM
writes short anomaly narratives to a timeline feed.

| Domain | Data Points | Sources |
|--------|------------|---------|
| **Aviation** | Commercial, Private, Military, Jets | OpenSky Network |
| **Maritime** | 39 Global Ports, 10 Chokepoints | Static Naval Intel |
| **Seismic** | Real-time M2.5+ | USGS Earthquake API |
| **Fires** | Active Hotspots | NASA FIRMS |
| **News** | 24/7 Live Streams | 25+ Global Broadcasters |
| **Weather** | Severe Events | NASA EONET |
| **Space** | Solar Weather, Satellites | NOAA SWPC, N2YO |
| **Cyber** | CVE Threats | NVD |
| **Conflict** | 13 Active Zones | Static OSINT Intel |
| **Crypto** | BTC + ETH Wallet Tracing, OFAC SDN Match | blockstream.info, Blockscout, OpenSanctions |
| **Sanctions** | Person / Org / Vessel SDN Search | OpenSanctions (US OFAC SDN mirror) |
| **Telegram OSINT** | Geoparsed Posts from Public Channels | `t.me/s/<channel>` web preview |
| **Agent feed** | Anomaly narratives vs 7-day baseline | Supabase + LLM |

---

## Quick Start (Vercel)

```bash
git clone https://github.com/sifaq00/argus.git
cd argus
cp .env.example .env.local   # fill in credentials, see table below
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Deploy: import the repo in Vercel, set the same environment variables, deploy.
The snapshot cron (`/api/agent/snapshot` every 30 minutes) activates automatically via
`vercel.json`.

### Environment Variables

```env
# Public (client-safe)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server only (never expose)
SUPABASE_SERVICE_ROLE_KEY=
LLM_API_URL=
LLM_API_KEY=
LLM_MODEL=
CRON_SECRET=

# Optional (keyless feeds work without these)
SCANNER_URL=
SCANNER_KEY=
CLOUDFLARE_API_TOKEN=
ETHERSCAN_API_KEY=
HELIUS_API_KEY=
FIRMS_API_KEY=
OPENSKY_CLIENT_ID=
OPENSKY_CLIENT_SECRET=
N2YO_API_KEY=
AIS_API_KEY=
```

Without `SUPABASE_*` + `LLM_*`, the map still works; agent feed returns 503 by design.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Map Engine | MapLibre GL JS (WebGL) |
| Persistence | Supabase (snapshots, baselines, analyses) |
| Agent | OpenAI-compatible LLM, prompt analitik anomali |
| Deployment | Vercel (cron 30 menit) |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `F` | Toggle flight layers |
| `E` | Toggle earthquakes |
| `S` | Toggle satellites |
| `D` | Toggle day/night cycle |
| `Escape` | Close panels |

---

## License

MIT — see [LICENSE](LICENSE) for details.

Built on top of [OSIRIS](https://github.com/simplifaisoul/osiris) (MIT).
