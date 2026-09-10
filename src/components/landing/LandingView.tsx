'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { ArrowDown, ArrowUpRight, Menu, X, Shield, Radio, Activity, Orbit, Cpu } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import './landing.css';

const LandingGlobe = dynamic(() => import('./LandingGlobe'), { ssr: false });
const LandingHero2DMap = dynamic(() => import('./LandingHero2DMap'), { ssr: false });
const Landing2DMap = dynamic(() => import('./Landing2DMap'), { ssr: false });

type NavItem = { label: string; href: string };
const nav: NavItem[] = [
  { label: 'Platforms', href: '#platforms' },
  { label: 'Capabilities', href: '#capabilities' },
  { label: 'Agent Engine', href: '#agent' },
  { label: 'Docs', href: '/docs' },
];

export default function LandingView() {
  const [open, setOpen] = useState(false);
  const [agentReady, setAgentReady] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Explicitly unlock document scroll for landing page (only html scrolls, body is visible)
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflowY = html.style.overflowY;
    const prevHtmlOverflowX = html.style.overflowX;
    const prevHtmlHeight = html.style.height;
    const prevBodyOverflowY = body.style.overflowY;
    const prevBodyOverflowX = body.style.overflowX;
    const prevBodyHeight = body.style.height;

    html.style.overflowY = 'auto';
    html.style.overflowX = 'hidden';
    html.style.height = 'auto';
    body.style.overflowY = 'visible';
    body.style.overflowX = 'clip';
    body.style.height = 'auto';

    gsap.registerPlugin(ScrollTrigger);

    // ponytail: kentang mode — skip smooth-scroll + scrub parallax di perangkat lemah.
    // Visual akhir sama, yang dipangkas cuma animasi per-frame.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    const smallScreen = window.matchMedia('(max-width: 800px)').matches;
    const weakCpu = (navigator.hardwareConcurrency ?? 8) <= 4;
    const lite = reduceMotion || saveData || smallScreen || weakCpu;

    // Map #agent berat (MapLibre ke-3) — mount hanya saat section dekat viewport.
    const agentEl = document.querySelector('#agent');
    let agentIO: IntersectionObserver | null = null;
    if (agentEl) {
      if (typeof IntersectionObserver === 'undefined') {
        setAgentReady(true);
      } else {
        agentIO = new IntersectionObserver(
          (es) => {
            if (es.some((e) => e.isIntersecting)) {
              setAgentReady(true);
              agentIO?.disconnect();
            }
          },
          { rootMargin: '600px 0px' }
        );
        agentIO.observe(agentEl);
      }
    } else {
      setAgentReady(true);
    }

    let lenis: Lenis | null = null;
    const tickerCb = (time: number) => {
      lenis?.raf(time * 1000);
    };
    if (!lite) {
      lenis = new Lenis({ duration: 1.15, smoothWheel: true, touchMultiplier: 1.2 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(tickerCb);
      gsap.ticker.lagSmoothing(0);
    }

    const ctx = gsap.context(() => {
      if (reduceMotion) {
        gsap.set('.nav-item, .hero-line, .hero-meta, .reveal, .line-draw', { clearProps: 'all' });
        return;
      }
      gsap.from('.nav-item', { y: -20, opacity: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out' });
      gsap.from('.hero-line', { yPercent: 115, skewY: 7, duration: 1.25, stagger: 0.08, ease: 'power4.out', delay: 0.15 });
      gsap.from('.hero-meta', { opacity: 0, y: 20, duration: 0.8, delay: 0.7, ease: 'power3.out' });
      if (!lite) {
        gsap.to('.hero-visual', {
          yPercent: 16,
          scale: 1.1,
          ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 },
        });
        gsap.to('.hero-crosshair', {
          rotation: 180,
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.4 },
        });
        gsap.to('.orb', {
          yPercent: -18,
          xPercent: 8,
          scrollTrigger: { trigger: '#agent', start: 'top bottom', end: 'bottom top', scrub: 1.2 },
        });
      }
      gsap.utils.toArray<HTMLElement>('.reveal').forEach((el) =>
        gsap.from(el, {
          y: 70,
          opacity: 0,
          duration: 1,
          scrollTrigger: { trigger: el, start: 'top 84%', once: true },
          ease: 'power3.out',
        })
      );
      gsap.utils.toArray<HTMLElement>('.line-draw').forEach((el) =>
        gsap.from(el, {
          scaleX: 0,
          transformOrigin: 'left center',
          duration: 1.1,
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          ease: 'power3.inOut',
        })
      );
    }, root);

    return () => {
      html.style.overflowY = prevHtmlOverflowY;
      html.style.overflowX = prevHtmlOverflowX;
      html.style.height = prevHtmlHeight;
      body.style.overflowY = prevBodyOverflowY;
      body.style.overflowX = prevBodyOverflowX;
      body.style.height = prevBodyHeight;

      agentIO?.disconnect();
      gsap.ticker.remove(tickerCb);
      ctx.revert();
      lenis?.destroy();
    };
  }, []);

  /* Map #agent mount belakangan → tinggi section berubah → posisi trigger basi.
     Refresh biar reveal di bawahnya tetap jalan, tidak blank. */
  useEffect(() => {
    if (agentReady) ScrollTrigger.refresh();
  }, [agentReady]);

  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh();
    if (document.readyState === 'complete') {
      refresh();
    } else {
      window.addEventListener('load', refresh);
    }
    document.fonts?.ready.then(refresh).catch(() => {});
    const t = setTimeout(refresh, 3000);
    return () => {
      window.removeEventListener('load', refresh);
      clearTimeout(t);
    };
  }, []);

  const go = (href: string) => {
    setOpen(false);
    if (href.startsWith('#')) {
      const el = document.querySelector(href);
      if (el) {
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
      }
    } else {
      window.location.href = href;
    }
  };

  return (
    <div className="landing-root">
      <div ref={root} className="site">
        {/* Floating Header */}
        <header className="nav-wrap">
          <nav className="nav">
            <button className="brand nav-item" onClick={() => go('#top')} aria-label="ARGUS home">
              <span className="brand-mark">
                <Image
                  src="/argus-logo.webp"
                  alt="ARGUS logo"
                  width={38}
                  height={38}
                  className="object-contain"
                  priority
                />
              </span>
              <span className="brand-word">ARGUS</span>
            </button>
            <div className="nav-center">
              {nav.map((n) => (
                <button key={n.href} className="nav-link nav-item" onClick={() => go(n.href)}>
                  {n.label}
                </button>
              ))}
            </div>
            <button className="nav-cta" onClick={() => go('/app')}>
              <span className="inline-flex items-center gap-1.5 leading-none">
                <span>Launch Map</span>
                <ArrowUpRight size={14} className="shrink-0" />
              </span>
            </button>
            <button
              className="menu-btn"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close Menu' : 'Open Menu'}
              aria-expanded={open}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </nav>
          {open && (
            <div className="mobile-menu" role="dialog" aria-label="Mobile Navigation">
              {nav.map((n) => (
                <button key={n.href} onClick={() => go(n.href)}>
                  {n.label}
                  <ArrowUpRight size={16} />
                </button>
              ))}
              <button className="mobile-cta" onClick={() => go('/app')}>
                Launch Tactical Map
                <ArrowUpRight size={16} />
              </button>
            </div>
          )}
        </header>

        <main id="top">
          {/* Hero Section */}
          <section className="hero section-dark">
            <div className="hero-inner">
              <div className="eyebrow hero-meta">
                <span className="dot" /> LIVE PLANETARY &amp; OSINT SURVEILLANCE // DECISION ADVANTAGE
              </div>
              <h1 className="display hero-title">
                <span className="clip">
                  <span className="hero-line">Get Intelligence</span>
                </span>
                <span className="clip">
                  <span className="hero-line accent-text">Into Operations.</span>
                </span>
              </h1>
              <p className="hero-copy hero-meta">
                Argus fuses kinetic movements (ADS-B flights, strategic chokepoints, orbital satellites), planetary
                anomalies (USGS seismic, NASA thermal, space weather), and cyber threat telemetry into an autonomous OSINT
                decision engine.
              </p>
              <div className="hero-actions hero-meta">
                <button className="button button-accent" onClick={() => go('/app')}>
                  Launch Tactical Map <ArrowUpRight size={16} />
                </button>
                <button className="button button-outline" onClick={() => go('#platforms')}>
                  Explore Platforms ↳
                </button>
                <button className="text-link" onClick={() => go('/docs')}>
                  API Docs <ArrowUpRight size={15} />
                </button>
              </div>
            </div>
            <div className="hero-visual">
              <LandingHero2DMap />
              <LandingGlobe />
              <div className="hero-crosshair">
                <span />
                <span />
              </div>
              <div className="hero-bottom-fade" />
              <div className="hero-top-fade" />
            </div>
            <div className="hero-telemetry-bar hero-meta">
              <div className="telemetry-item">
                <span className="dot" />
                <span className="telemetry-label">TELEMETRY:</span>
                <span className="telemetry-val">LIVE PLANETARY FEEDS</span>
              </div>
              <div className="telemetry-item">
                <span className="telemetry-label">INGESTION:</span>
                <span className="telemetry-val">45+ KEYLESS ENDPOINTS</span>
              </div>
              <div className="telemetry-item">
                <span className="telemetry-label">CYCLE:</span>
                <span className="telemetry-val">30-MIN SNAPSHOT</span>
              </div>
              <div className="telemetry-item">
                <span className="telemetry-label">BASELINE:</span>
                <span className="telemetry-val">7-DAY GAUSSIAN (μ + 2σ)</span>
              </div>
            </div>
          </section>

          {/* 01 / THE PROBLEM */}
          <section className="statement section-light">
            <div className="statement-grid">
              <div className="kicker reveal">01 / THE OPERATIONAL CHALLENGE</div>
              <div className="statement-copy reveal">
                <p className="massive">Global signals move faster than human analysts can watch.</p>
                <p className="subcopy">
                  Military flight diversions, seismic clusters on active faults, sudden Telegram channel activity, and
                  novel zero-day CVE exploits don&apos;t announce themselves. Staring at 40 disconnected tabs creates
                  analyst fatigue, siloed data, and missed correlations. Argus unifies raw global telemetry into one
                  continuous operating picture.
                </p>
              </div>
            </div>
            <div className="rule line-draw" />
          </section>

          {/* 02 / PLATFORMS & INSTRUMENTS */}
          <section id="platforms" className="platform section-light">
            <div className="section-head">
              <div className="kicker reveal">02 / PLATFORMS &amp; INSTRUMENTS</div>
              <p className="section-intro reveal">
                Foundational Intelligence of Tomorrow. Delivered Today.™
              </p>
            </div>
            <div className="feature-grid">
              {/* Card 1: Sentinel */}
              <article className="feature feature-dark reveal">
                <div className="feature-index">↳ SENTINEL</div>
                <span className="feature-tag">AIR · SEA · ORBIT</span>
                <h3>Kinetic Surface</h3>
                <p>
                  Global OpenSky ADS-B flights (commercial, military, VIP, helicopters), 39 naval ports, 10 strategic
                  chokepoints (Hormuz, Malacca, Bab-el-Mandeb), and SGP4 TLE orbital tracking for 2,000+ satellites.
                </p>
                <button className="feature-action" onClick={() => go('/app')}>
                  Explore Sentinel ↳
                </button>
                <div className="mini-grid">
                  <div />
                  <div />
                  <div />
                  <div />
                </div>
              </article>

              {/* Card 2: Pulse */}
              <article className="feature feature-line reveal">
                <div className="feature-index">↳ PULSE</div>
                <span className="feature-tag" style={{ color: '#c14a00' }}>
                  SEISMIC · THERMAL · SPACE
                </span>
                <h3>Planetary Activity</h3>
                <p>
                  USGS real-time earthquake telemetry (M2.5+), NASA FIRMS satellite thermal hotspot detection, NOAA SWPC
                  solar flare and geomagnetic storms, and NASA EONET extreme weather alerts.
                </p>
                <button className="feature-action" onClick={() => go('/app')}>
                  Explore Pulse ↳
                </button>
                <div className="signal-bars">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </article>

              {/* Card 3: Shield & Signal */}
              <article className="feature feature-dark reveal">
                <div className="feature-index">↳ SHIELD &amp; SIGNAL</div>
                <span className="feature-tag">CYBER · SANCTIONS · OSINT</span>
                <h3>Threat Vectors</h3>
                <p>
                  NIST NVD CVE vulnerabilities, live malware telemetry (MalwareBazaar/URLhaus), US OFAC SDN crypto
                  wallet designation matching (BTC, ETH, XMR, TRX), and 20+ countries public traffic CCTV feeds.
                </p>
                <button className="feature-action" onClick={() => go('/app')}>
                  Explore Shield ↳
                </button>
                <div className="pulse">
                  <span />
                  <span />
                  <span />
                </div>
              </article>

              {/* Card 4: Agent Core */}
              <article className="feature feature-line reveal">
                <div className="feature-index">↳ AGENT CORE</div>
                <span className="feature-tag">
                  AUTONOMOUS · SYNTHESIS · CRON
                </span>
                <h3>Anomaly Engine</h3>
                <p>
                  30-minute background snapshot cycle to Supabase, 7-day Gaussian rolling baseline calculation (μ, σ),
                  statistical surge anomaly gate (count &gt; μ + 2σ), and automated LLM narrative threat synthesis.
                </p>
                <button className="feature-action" onClick={() => go('#agent')}>
                  Explore Agent ↳
                </button>
                <div className="agent-node">
                  <span /> LIVE 30-MIN CYCLE
                </div>
              </article>
            </div>
          </section>

          {/* 03 / WHAT MAKES ARGUS POWERFUL (PALANTIR-STYLE PILLARS) */}
          <section id="capabilities" className="pillars section-light">
            <div className="section-head">
              <div className="kicker reveal">03 / CAPABILITIES &amp; ARCHITECTURE</div>
              <p className="section-intro reveal">
                What Makes Argus Platforms Powerful
              </p>
            </div>
            <div className="pillars-grid">
              <div className="pillar-card reveal">
                <div className="pillar-index">—— A</div>
                <h3>Day 1 Value</h3>
                <div className="pillar-sub">Our feeds deliver value out of the box. Days, not years.</div>
                <p>
                  Over 45+ keyless API endpoints immediately operational on first launch. Zero proprietary sales cycles,
                  zero waiting for vendor credentials or custom pipeline plumbing.
                </p>
                <button className="pillar-link" onClick={() => go('/docs')}>
                  Explore 45+ Feeds <ArrowUpRight size={13} />
                </button>
              </div>

              <div className="pillar-card reveal">
                <div className="pillar-index">—— B</div>
                <h3>AI Decision Advantage</h3>
                <div className="pillar-sub">Bring autonomous intelligence to the core of decisions that matter most.</div>
                <p>
                  A background agent continuously samples all physical, kinetic, and cyber layers every 30 minutes,
                  detecting statistical anomalies across global fronts before they break into headlines.
                </p>
                <button className="pillar-link" onClick={() => go('#agent')}>
                  Explore Agent Engine <ArrowUpRight size={13} />
                </button>
              </div>

              <div className="pillar-card reveal">
                <div className="pillar-index">—— C</div>
                <h3>Full Stack Interoperability</h3>
                <div className="pillar-sub">Argus meets operators where they are, connecting with existing workflows.</div>
                <p>
                  REST API endpoints, WebGL MapLibre GL 60fps GPU acceleration,
                  and standardized GeoJSON schema for seamless pipeline integration.
                </p>
                <button className="pillar-link" onClick={() => go('/docs')}>
                  Explore API Reference <ArrowUpRight size={13} />
                </button>
              </div>

              <div className="pillar-card reveal">
                <div className="pillar-index">—— D</div>
                <h3>Sovereign Privacy &amp; Integrity</h3>
                <div className="pillar-sub">Built with founding roots in sovereign OSINT and defense transparency.</div>
                <p>
                  100% open source under MIT. Zero corporate tracking, zero remote telemetry phone-home, fully
                  self-hostable in air-gapped or private cloud environments via Docker.
                </p>
                <a
                  href="https://github.com/sifaq00/argus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pillar-link"
                >
                  Inspect Source Code <ArrowUpRight size={13} />
                </a>
              </div>
            </div>
          </section>

          {/* 04 / CATEGORY-DEFINING ARCHITECTURE (PALANTIR BENCHMARK STYLE) */}
          <section className="category-defining">
            <div className="section-head">
              <div className="kicker reveal">04 / CATEGORY-DEFINING ARCHITECTURE</div>
              <p className="section-intro reveal">
                Independent Benchmarks &amp; Sovereign Standards
              </p>
            </div>
            <div className="category-grid">
              <div className="category-card reveal">
                <div>
                  <h3>45+ Sovereign Feeds Out of the Box</h3>
                  <p>
                    Direct keyless ingestion across OpenSky aviation, AIS naval chokepoints, 2,000+ SGP4 TLE satellites,
                    USGS seismic telemetry, and NIST CVE threat vectors without third-party API keys or subscription lock-in.
                  </p>
                  <div className="category-citation">— Argus Sovereign Ingestion Layer</div>
                </div>
                <button className="category-link" onClick={() => go('/docs')}>
                  ↳ View All 45+ Feeds
                </button>
              </div>

              <div className="category-card reveal">
                <div>
                  <h3>Autonomous 30-Min Gaussian Anomaly Engine</h3>
                  <p>
                    Autonomous background workers snapshot all global telemetry layers into Supabase every 30 minutes,
                    computing rolling Gaussian baselines (μ, σ) over 7-day windows to trigger automated threat sitreps.
                  </p>
                  <div className="category-citation">— Argus Statistical Baseline Engine</div>
                </div>
                <button className="category-link" onClick={() => go('#agent')}>
                  ↳ View Agent Architecture
                </button>
              </div>

              <div className="category-card reveal">
                <div>
                  <h3>60 FPS GPU Vector Map Engine</h3>
                  <p>
                    Full-stack WebGL acceleration built on open-source foundation (MIT License). Renders tens
                    of thousands of real-time kinetic tracks simultaneously with zero CPU thermal throttling.
                  </p>
                  <div className="category-citation">— ARGUS WebGL Core</div>
                </div>
                <button className="category-link" onClick={() => go('/app')}>
                  ↳ Launch Tactical Map
                </button>
              </div>
            </div>
          </section>

          {/* 05 / THE AGENT ENGINE */}
          <section id="agent" className="systems section-dark">
            <div className="system-grid-layout">
              <div className="system-content">
                <div className="kicker reveal">05 / AUTONOMOUS ANALYST</div>
                <h2 className="display reveal">
                  <span className="agent-line">From raw blips</span>
                  <span className="agent-line muted">to anomaly intel.</span>
                </h2>
                <p className="systems-copy reveal">
                  Argus doesn&apos;t just render points on a map. Every 30 minutes, an autonomous background worker samples
                  every live layer into Supabase, computes 7-day Gaussian moving baselines, and flags statistical
                  anomalies (count &gt; μ + 2σ). An LLM OSINT analyst writes concise threat narratives automatically.
                </p>
                <div className="system-stats reveal">
                  <div>
                    <strong>01 / BASELINE</strong>
                    <span>7-Day Rolling Window (Gaussian mean &amp; stddev)</span>
                  </div>
                  <div>
                    <strong>02 / ANOMALY GATE</strong>
                    <span>Z-Score Filter (Surges &gt; 2σ above mean)</span>
                  </div>
                  <div>
                    <strong>03 / NARRATIVE</strong>
                    <span>LLM Synthesis (CRITICAL, HIGH, ELEVATED, LOW)</span>
                  </div>
                </div>
              </div>

              <div className="system-map-col reveal">
                {agentReady ? <Landing2DMap /> : <div className="landing-2d-map-card" aria-hidden="true" style={{ minHeight: 520 }} />}
              </div>
            </div>
          </section>

          {/* 06 / BUILT FOR OPERATORS */}
          <section id="threats" className="editorial section-light">
            <div className="editorial-top">
              <div className="kicker reveal">06 / SOVEREIGN INTELLIGENCE</div>
              <div className="editorial-tag reveal">ARGUS ARCHITECTURE / MIT</div>
            </div>
            <div className="editorial-layout">
              <h2 className="massive reveal">
                Make global complexity<br />
                <em>actionable.</em>
              </h2>
              <div className="editorial-side reveal">
                <p>
                  Whether tracing sanctioned crypto movements, correlating flight diversions with conflict frontlines,
                  or auditing infrastructure vulnerabilities — Argus preserves deep operational context without vendor
                  lock-in.
                </p>
                <p>
                  Over 45+ keyless API endpoints with graceful offline degradation, built with
                  GPU-rendered MapLibre GL at 60fps.
                </p>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '16px' }}>
                  <button className="text-link dark-link" onClick={() => go('/docs')}>
                    API Reference (45+ Feeds) <ArrowUpRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 07 / GET STARTED */}
          <section id="access" className="contact section-dark">
            <div className="contact-inner">
              <div className="kicker reveal">07 / DEPLOY &amp; EXPLORE</div>
              <h2 className="display reveal">
                Start watching with<br />
                <span className="accent-text">total clarity.</span>
              </h2>
              <p className="contact-copy reveal">
                Explore the live tactical map in your browser, or deploy your own sovereign Argus intelligence node with
                Docker, Next.js, and Supabase.
              </p>
              <div className="contact-actions reveal">
                <button className="button button-accent" onClick={() => go('/app')}>
                  Open Tactical Map <ArrowUpRight size={16} />
                </button>
                <button className="button button-light" onClick={() => go('/docs')}>
                  Read Documentation <ArrowUpRight size={16} />
                </button>
              </div>
            </div>
            <div className="footer-grid">
              <span>ARGUS © 2026 · SOVEREIGN INTELLIGENCE</span>
              <span>OPEN SOURCE · MIT LICENSE</span>
              <span className="footer-links">
                <a href="https://github.com/sifaq00/argus.git" target="_blank" rel="noopener noreferrer">
                  GITHUB
                </a>
                <a href="/app">LIVE MAP</a>
                <a href="/docs">DOCS</a>
              </span>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
