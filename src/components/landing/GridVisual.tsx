'use client';

import { useEffect, useRef } from 'react';

export default function GridVisual() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let t = 0;

    const resize = () => {
      const d = window.devicePixelRatio || 1;
      c.width = window.innerWidth * d;
      c.height = Math.max(window.innerHeight, 800) * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      t += 0.008;
      const w = window.innerWidth;
      const h = Math.max(window.innerHeight, 800);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,.08)';
      ctx.lineWidth = 1;

      for (let x = 0; x < w; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      for (let y = 0; y < h; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const cx = w * 0.5;
      const cy = h * 0.5;

      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, 120 + i * 95 + Math.sin(t + i) * 4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${0.08 - i * 0.012})`;
        ctx.stroke();
      }

      for (let i = 0; i < 22; i++) {
        const a = i * 0.64 + t * 0.2;
        const r = 160 + ((i * 97) % 260);
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r * 0.55;
        ctx.fillStyle = i % 3 === 0 ? 'rgba(0, 230, 118, 0.5)' : 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(x, y, 2, 2);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.strokeStyle = i % 3 === 0 ? 'rgba(0, 230, 118, 0.04)' : 'rgba(255, 255, 255, 0.025)';
        ctx.stroke();
      }

      ctx.fillStyle = '#00E676';
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="visual-canvas" aria-hidden="true" />;
}
