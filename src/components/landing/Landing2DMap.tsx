'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface AnomalyPoint {
  id: string;
  name: string;
  shortLabel: string;
  coords: [number, number];
  zScore: string;
  category: string;
  status: string;
}

const ANOMALIES: AnomalyPoint[] = [
  {
    id: 'red-sea',
    name: 'BAB-EL-MANDEB CHOKEPOINT',
    shortLabel: 'BAB-EL-MANDEB',
    coords: [43.3, 12.6],
    zScore: '+3.4σ',
    category: 'MARITIME AIS DISPERSION',
    status: 'SURGE_CONFIRMED',
  },
  {
    id: 'taiwan-strait',
    name: 'TAIWAN STRAIT MEDIAN',
    shortLabel: 'TAIWAN STRAIT',
    coords: [119.8, 24.2],
    zScore: '+2.9σ',
    category: 'AIRSPACE SORTIE DENSITY',
    status: 'ELEVATED_WATCH',
  },
  {
    id: 'hormuz',
    name: 'STRAIT OF HORMUZ',
    shortLabel: 'HORMUZ',
    coords: [56.4, 26.6],
    zScore: '+2.6σ',
    category: 'NAVAL RADAR SHUTOFF',
    status: 'ANOMALY_ACTIVE',
  },
  {
    id: 'baltic',
    name: 'BALTIC SEA INFRASTRUCTURE',
    shortLabel: 'BALTIC SEA',
    coords: [20.5, 57.5],
    zScore: '+2.7σ',
    category: 'UNDERSEA CABLE CLUSTERING',
    status: 'SENSORY_ALERT',
  },
];

export default function Landing2DMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [activeAnomaly, setActiveAnomaly] = useState<AnomalyPoint>(ANOMALIES[0]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let map: maplibregl.Map | null = null;
    let isDisposed = false;

    const styleUrl = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

    try {
      map = new maplibregl.Map({
        container,
        style: styleUrl,
        center: [48.0, 22.0],
        zoom: 3.2,
        minZoom: 1.5,
        maxZoom: 9,
        interactive: true,
        scrollZoom: false,
        attributionControl: false,
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
        setLoaded(true);

        try {
          (map as any).setProjection({ type: 'mercator' });
        } catch {
          // default is mercator
        }

        // Add anomaly GeoJSON source and layer
        const geojson = {
          type: 'FeatureCollection',
          features: ANOMALIES.map((a) => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: a.coords,
            },
            properties: {
              id: a.id,
              name: a.name,
              zScore: a.zScore,
              category: a.category,
            },
          })),
        };

        map.addSource('anomalies-source', {
          type: 'geojson',
          data: geojson as any,
        });

        // Pulsing radar circles
        map.addLayer({
          id: 'anomaly-glow',
          type: 'circle',
          source: 'anomalies-source',
          paint: {
            'circle-radius': 18,
            'circle-color': '#00E676',
            'circle-opacity': 0.15,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#00E676',
            'circle-stroke-opacity': 0.5,
          },
        });

        map.addLayer({
          id: 'anomaly-dots',
          type: 'circle',
          source: 'anomalies-source',
          paint: {
            'circle-radius': 5,
            'circle-color': '#00E676',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#080808',
          },
        });

        map.on('click', 'anomaly-dots', (e) => {
          const feat = e.features?.[0];
          if (!feat) return;
          const target = ANOMALIES.find((a) => a.id === feat.properties?.id);
          if (target) {
            setActiveAnomaly(target);
            map?.flyTo({ center: target.coords, zoom: 4.8, duration: 1200 });
          }
        });
      });
    } catch (e) {
      console.warn('[ARGUS Landing] 2D map initialization error:', e);
    }

    return () => {
      isDisposed = true;
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

  const jumpTo = (anomaly: AnomalyPoint) => {
    setActiveAnomaly(anomaly);
    mapRef.current?.flyTo({
      center: anomaly.coords,
      zoom: 4.5,
      duration: 1500,
    });
  };

  return (
    <div className="landing-2d-map-card">
      <div className="landing-2d-map-header">
        <div className="map-header-left">
          <span className="live-pill">
            <span className="live-dot" /> LIVE 2D TELEMETRY
          </span>
          <span className="map-title">PROJECTION: MERCATOR // 7-DAY BASELINE</span>
        </div>
        <div className="map-header-coords">
          {activeAnomaly.coords[1].toFixed(2)}°N, {activeAnomaly.coords[0].toFixed(2)}°E
        </div>
      </div>

      <div className="landing-2d-map-canvas-wrap">
        <div
          ref={containerRef}
          className={`landing-2d-map-canvas ${loaded ? 'is-ready' : 'is-loading'}`}
        />
        <div className="map-grid-overlay" />
      </div>

      <div className="landing-2d-map-footer">
        <div className="anomaly-selector">
          {ANOMALIES.map((a) => (
            <button
              key={a.id}
              onClick={() => jumpTo(a)}
              className={`anomaly-btn ${activeAnomaly.id === a.id ? 'active' : ''}`}
            >
              <span className="z-badge">{a.zScore}</span>
              <span className="a-name">{a.shortLabel}</span>
            </button>
          ))}
        </div>
        <div className="anomaly-readout">
          <div className="readout-label">{activeAnomaly.name}</div>
          <div className="readout-meta">
            <span className="meta-cat">{activeAnomaly.category}</span>
            <span className="meta-stat">Z-SCORE: <strong>{activeAnomaly.zScore}</strong> (THRESHOLD &gt; 2.0σ)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
