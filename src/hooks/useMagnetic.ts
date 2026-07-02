/**
 * useMagnetic — hook that makes any element attract toward the cursor.
 *
 * Based on codrops MagneticButtons pattern. Uses lerp for smooth
 * interpolation and requestAnimationFrame for the render loop.
 *
 * Usage:
 *   const ref = useMagnetic<HTMLButtonElement>({ strength: 0.3, radius: 120 });
 *   <button ref={ref}>Hover me</button>
 */

import { useRef, useEffect, useCallback } from "react";

interface MagneticOptions {
  /** How strongly the element follows the cursor (0-1) */
  strength?: number;
  /** Radius in px from center within which the element is attracted */
  radius?: number;
  /** Lerp interpolation factor (0-1, higher = snappier) */
  lerpFactor?: number;
}

export function useMagnetic<T extends HTMLElement>(
  options: MagneticOptions = {},
) {
  const { strength = 0.3, radius = 120, lerpFactor = 0.8 } = options;
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mouse = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    let rafId: number;
    let rect = el.getBoundingClientRect();

    const updateRect = () => {
      rect = el.getBoundingClientRect();
    };

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const render = () => {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = mouse.x - centerX;
      const dy = mouse.y - centerY;
      const distance = Math.hypot(dx, dy);

      if (distance < radius) {
        target.x = dx * strength;
        target.y = dy * strength;
      } else {
        target.x = 0;
        target.y = 0;
      }

      // Lerp
      current.x += (target.x - current.x) * lerpFactor;
      current.y += (target.y - current.y) * lerpFactor;

      el.style.transform = `translate(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px)`;

      rafId = requestAnimationFrame(render);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", updateRect);
    rafId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", updateRect);
      cancelAnimationFrame(rafId);
    };
  }, [strength, radius, lerpFactor]);

  return ref;
}

/**
 * useMagneticCallback — returns a ref callback + event handlers for
 * components that need more control over the magnetic effect.
 */
export function useMagneticHandlers(options: MagneticOptions = {}) {
  const { strength = 0.3, radius = 120 } = options;
  const stateRef = useRef({
    mouse: { x: 0, y: 0 },
    current: { x: 0, y: 0 },
    target: { x: 0, y: 0 },
    rect: null as DOMRect | null,
    rafId: 0,
  });

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      stateRef.current.mouse.x = e.clientX;
      stateRef.current.mouse.y = e.clientY;
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  const attach = useCallback(
    (el: HTMLElement | null) => {
      const state = stateRef.current;
      if (el) {
        state.rect = el.getBoundingClientRect();
        const render = () => {
          if (!state.rect) return;
          const centerX = state.rect.left + state.rect.width / 2;
          const centerY = state.rect.top + state.rect.height / 2;
          const dx = state.mouse.x - centerX;
          const dy = state.mouse.y - centerY;
          const distance = Math.hypot(dx, dy);

          if (distance < radius) {
            state.target.x = dx * strength;
            state.target.y = dy * strength;
          } else {
            state.target.x = 0;
            state.target.y = 0;
          }

          state.current.x += (state.target.x - state.current.x) * 0.8;
          state.current.y += (state.target.y - state.current.y) * 0.8;

          el.style.transform = `translate(${state.current.x.toFixed(2)}px, ${state.current.y.toFixed(2)}px)`;
          state.rafId = requestAnimationFrame(render);
        };
        state.rafId = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(state.rafId);
      }
    },
    [strength, radius],
  );

  return attach;
}
