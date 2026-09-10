'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function LandingGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let map: maplibregl.Map | null = null;
    let animId = 0;
    let isDisposed = false;
    // ponytail: jeda render saat hero offscreen / tab hidden — visual sama.
    let heroVisible = true;
    let heroIO: IntersectionObserver | null = null;
    let onVis: (() => void) | null = null;

    const styleUrl = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    try {
      map = new maplibregl.Map({
        container,
        style: styleUrl,
        center: [30, 15],
        zoom: 2.05,
        minZoom: 1.2,
        maxZoom: 6,
        pitch: 20,
        bearing: 0,
        interactive: false,
        attributionControl: false,
        fadeDuration: 0,
        transformRequest: (url: string) => {
          if (url.includes('cartocdn.com')) {
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            return { url: `${origin}/api/proxy-tiles?url=${encodeURIComponent(url)}` };
          }
          return { url };
        },
      });

      mapRef.current = map;

      map.on('load', () => {
        if (isDisposed || !map) return;
        map.resize();
        setLoaded(true);

        try {
          (map as any).setProjection({ type: 'globe' });
        } catch {
          // Fallback if globe projection not supported in environment
        }

        try {
          (map as any).setSky?.({
            'sky-color': '#080808',
            'sky-horizon-blend': 0.6,
            'horizon-color': '#0a0a10',
            'horizon-fog-blend': 0.3,
            'fog-color': '#080808',
            'fog-ground-blend': 0.9,
          });
        } catch {
          // sky optional
        }

        // Add subtle continuous planetary rotation (~30fps, paused offscreen)
        if (!reduceMotion) {
          let lastT = performance.now();
          let acc = 0;
          const spin = (now: number) => {
            animId = 0;
            if (isDisposed || !map) return;
            const dt = (now - lastT) / 1000;
            lastT = now;
            if (heroVisible && !document.hidden) {
              acc += dt;
              if (acc >= 1 / 30) {
                const center = map.getCenter();
                center.lng += 0.8 * acc; // ~0.8 degrees per sec
                if (center.lng > 180) center.lng -= 360;
                map.setCenter(center);
                acc = 0;
              }
              animId = requestAnimationFrame(spin);
            }
            // else: berhenti di sini, IO/visibility handler yang restart
          };
          const kick = () => {
            if (!isDisposed && !animId && heroVisible && !document.hidden) {
              lastT = performance.now();
              animId = requestAnimationFrame(spin);
            }
          };
          const hero = container.closest('.hero');
          if (hero && typeof IntersectionObserver !== 'undefined') {
            heroIO = new IntersectionObserver(
              (es) => {
                heroVisible = es.some((e) => e.isIntersecting);
                kick();
              },
              { threshold: 0 }
            );
            heroIO.observe(hero);
          }
          onVis = kick;
          document.addEventListener('visibilitychange', kick);
          animId = requestAnimationFrame(spin);
        }
      });
    } catch (e) {
      console.warn('[ARGUS Landing] WebGL globe initialization error:', e);
    }

    return () => {
      isDisposed = true;
      heroIO?.disconnect();
      if (onVis) document.removeEventListener('visibilitychange', onVis);
      if (animId) cancelAnimationFrame(animId);
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          // ignore
        }
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="landing-globe-wrapper" aria-hidden="true">
      <div
        ref={containerRef}
        className={`landing-globe-canvas ${loaded ? 'is-ready' : 'is-loading'}`}
      />
      <div className="landing-globe-vignette" />
    </div>
  );
}
