/**
 * TopographicBackground — WebGL shader background
 *
 * Renders an animated topographic contour-line pattern using a full-screen
 * Three.js quad with a custom ShaderMaterial. The contour lines are generated
 * from simplex noise and slowly drift over time, creating a "trust terrain"
 * that evokes the landscape of cooperation vs defection.
 *
 * Inspired by MatthewGreenberg/shoe-finder's topography.frag shader.
 *
 * The canvas is fixed-position, behind all content (z-index: -1), and
 * pointer-events: none so it never interferes with interaction.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Simplex noise GLSL — Ashima/webgl-noise (public domain)
const NOISE_GLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
        dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`;

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColorDeep;
uniform vec3 uColorMid;
uniform vec3 uColorLine;
uniform float uLineOpacity;
uniform float uScale;
uniform float uLineThickness;
uniform float uDriftSpeed;
varying vec2 vUv;

${NOISE_GLSL}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 noiseUv = uv;
  noiseUv.x *= aspect;

  // Two layers of noise at different scales for richer terrain
  float n1 = snoise(noiseUv * uScale + uTime * uDriftSpeed);
  float n2 = snoise(noiseUv * uScale * 2.3 + uTime * uDriftSpeed * 0.7);
  float n = n1 * 0.65 + n2 * 0.35;

  // Isolines — contour lines at regular intervals
  float lines = fract(n * 6.0);
  float pattern = smoothstep(0.5 - uLineThickness, 0.5, lines)
                - smoothstep(0.5, 0.5 + uLineThickness, lines);

  // Secondary finer lines (subtle)
  float fineLines = fract(n * 18.0);
  float finePattern = smoothstep(0.5 - 0.008, 0.5, fineLines)
                    - smoothstep(0.5, 0.5 + 0.008, fineLines);

  // Radial vignette — darker at edges
  vec2 centeredUv = uv - 0.5;
  centeredUv.x *= aspect;
  float dist = length(centeredUv);
  float vignette = 1.0 - smoothstep(0.3, 0.85, dist) * 0.6;

  // Vertical gradient — deep at top, slightly warmer at bottom
  float gradient = mix(0.7, 1.0, uv.y);

  // Base color: blend deep and mid based on noise value
  float colorMix = (n + 1.0) * 0.5;
  vec3 baseColor = mix(uColorDeep, uColorMid, colorMix * 0.4);

  // Grain
  float grain = (fract(sin(dot(vUv, vec2(12.9898, 78.233) * 2.0)) * 43758.5453) - 0.5) * 0.06;

  // Composite
  vec3 finalColor = baseColor * gradient * vignette + grain;
  finalColor += uColorLine * pattern * uLineOpacity;
  finalColor += uColorLine * finePattern * uLineOpacity * 0.25;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

export const TopographicBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check for WebGL support
    try {
      const testCanvas = document.createElement("canvas");
      const gl =
        testCanvas.getContext("webgl2") || testCanvas.getContext("webgl");
      if (!gl) {
        console.warn("WebGL not supported — falling back to CSS gradient");
        return;
      }
    } catch {
      return;
    }

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
    });
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      uTime: { value: 0 },
      uResolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
      // Deep midnight navy
      uColorDeep: { value: new THREE.Color(0x0a0e1a) },
      // Slightly lighter blue-purple
      uColorMid: { value: new THREE.Color(0x1a1f3a) },
      // Contour line color — soft blue-violet
      uColorLine: { value: new THREE.Color(0x667eea) },
      uLineOpacity: { value: 0.18 },
      uScale: { value: 3.0 },
      uLineThickness: { value: 0.012 },
      uDriftSpeed: { value: 0.015 },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      uniforms.uResolution.value.set(w, h);
    };
    resize();
    window.addEventListener("resize", resize);

    const clock = new THREE.Clock();
    const animate = () => {
      uniforms.uTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    />
  );
};
