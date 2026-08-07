"use client";

import { useEffect, useRef } from "react";
import { MOTION_EVENT, motionEnabled } from "@/lib/motion";

/**
 * Subtle, calm snowfall drawn on a single fixed canvas (no per-flake DOM).
 * Density scales with viewport width; disabled for reduced-motion users and
 * whenever the footer "Reduce motion" toggle is off.
 */
export function Snow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type Flake = { x: number; y: number; r: number; vy: number; drift: number; phase: number; alpha: number };
    let flakes: Flake[] = [];

    function seed() {
      // Sparse: about one flake per 14k px², capped for calm + performance.
      const count = Math.min(90, Math.round((width * height) / 14000));
      flakes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.8 + Math.random() * 2.2,
        vy: 0.25 + Math.random() * 0.75,
        drift: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.35 + Math.random() * 0.45,
      }));
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function frame() {
      ctx!.clearRect(0, 0, width, height);
      for (const f of flakes) {
        f.phase += 0.01;
        f.y += f.vy;
        f.x += Math.sin(f.phase) * f.drift;
        if (f.y - f.r > height) {
          f.y = -f.r;
          f.x = Math.random() * width;
        }
        if (f.x > width + 5) f.x = -5;
        if (f.x < -5) f.x = width + 5;
        ctx!.beginPath();
        ctx!.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255,255,255,${f.alpha})`;
        ctx!.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (raf || !motionEnabled()) return;
      frame();
    }
    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
      ctx!.clearRect(0, 0, width, height);
    }
    function onMotionChange() {
      motionEnabled() ? start() : stop();
    }

    resize();
    start();
    window.addEventListener("resize", resize);
    window.addEventListener(MOTION_EVENT, onMotionChange);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener(MOTION_EVENT, onMotionChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40"
    />
  );
}
