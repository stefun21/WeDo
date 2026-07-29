"use client";

import { useEffect, useRef } from "react";

export default function AmbientEffects() {
  const frame = useRef<number | null>(null);
  const pulseTimer = useRef<number | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const updatePointer = (x: number, y: number) => {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        root.style.setProperty("--pointer-x", `${x}px`);
        root.style.setProperty("--pointer-y", `${y}px`);
      });
    };
    const onPointerMove = (event: PointerEvent) => updatePointer(event.clientX, event.clientY);
    const onPointerDown = (event: PointerEvent) => {
      updatePointer(event.clientX, event.clientY);
      root.classList.remove("ambient-pulse");
      void root.offsetWidth;
      root.classList.add("ambient-pulse");
      if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
      pulseTimer.current = window.setTimeout(() => root.classList.remove("ambient-pulse"), 650);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      if (frame.current) cancelAnimationFrame(frame.current);
      if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
      root.classList.remove("ambient-pulse");
    };
  }, []);

  return <div className="ambient-effects" aria-hidden="true"><i /><i /><i /></div>;
}
