'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function LandingHero2DMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let map: maplibregl.Map | null = null;
    let animId = 0;
    let isDisposed = false;
    // ponytail: jeda drift saat hero offscreen / tab hidden — visual sama.
    let heroVisible = true;
    let heroIO: IntersectionObserver | null = null;
    let onVis: (() => void) | null = null;

    const styleUrl = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    try {
      map = new maplibregl.Map({
        container,
        style: styleUrl,
        center: [24.5, 37.0],
        zoom: 4.6,
        minZoom: 2.5,
        maxZoom: 8,
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
          (map as any).setProjection({ type: 'mercator' });
        } catch {
          // default
        }

        // Tactical hubs across Aegean & Mediterranean archipelago
        const hubs = {
          type: 'FeatureCollection',
          features: [
            { type: 'Feature', geometry: { type: 'Point', coordinates: [23.6, 37.9] }, properties: { name: 'PIRAEUS' } },
            { type: 'Feature', geometry: { type: 'Point', coordinates: [25.3, 37.0] }, properties: { name: 'CYCLADES' } },
            { type: 'Feature', geometry: { type: 'Point', coordinates: [24.9, 35.2] }, properties: { name: 'CRETE' } },
            { type: 'Feature', geometry: { type: 'Point', coordinates: [29.0, 41.1] }, properties: { name: 'BOSPHORUS' } },
            { type: 'Feature', geometry: { type: 'Point', coordinates: [28.1, 36.3] }, properties: { name: 'RHODES' } },
          ],
        };

        map.addSource('hero-2d-hubs', {
          type: 'geojson',
          data: hubs as any,
        });

        map.addLayer({
          id: 'hero-2d-halo',
          type: 'circle',
          source: 'hero-2d-hubs',
          paint: {
            'circle-radius': 14,
            'circle-color': '#00E676',
            'circle-opacity': 0.18,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#00E676',
            'circle-stroke-opacity': 0.6,
          },
        });

        map.addLayer({
          id: 'hero-2d-dots',
          type: 'circle',
          source: 'hero-2d-hubs',
          paint: {
            'circle-radius': 3.5,
            'circle-color': '#00E676',
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#080808',
          },
        });

        // Very slow subtle drift (~30fps, paused offscreen)
        if (!reduceMotion) {
          let lastT = performance.now();
          let acc = 0;
          const drift = (now: number) => {
            animId = 0;
            if (isDisposed || !map) return;
            const dt = (now - lastT) / 1000;
            lastT = now;
            if (heroVisible && !document.hidden) {
              acc += dt;
              if (acc >= 1 / 30) {
                const c = map.getCenter();
                c.lng += 0.08 * acc;
                if (c.lng > 180) c.lng -= 360;
                map.setCenter(c);
                acc = 0;
              }
              animId = requestAnimationFrame(drift);
            }
            // else: berhenti, IO/visibility handler yang restart
          };
          const kick = () => {
            if (!isDisposed && !animId && heroVisible && !document.hidden) {
              lastT = performance.now();
              animId = requestAnimationFrame(drift);
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
          animId = requestAnimationFrame(drift);
        }
      });
    } catch (e) {
      console.warn('[ARGUS Landing] Hero 2D map initialization error:', e);
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
    <div className="landing-hero-2d-wrapper" aria-hidden="true">
      <div
        ref={containerRef}
        className={`landing-hero-2d-canvas ${loaded ? 'is-ready' : 'is-loading'}`}
      />
    </div>
  );
}
