"use client";

import { useEffect, useRef, useState } from "react";
import { Info, ShieldAlert, Cpu } from "lucide-react";

const VERTEX_SHADER_SRC = `
  attribute vec2 position;
  varying vec2 v_uv;
  void main() {
    v_uv = position;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_flare;
  varying vec2 v_uv;

  // Pseudo-random hash for noise
  float hash(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }

  // 3D Value Noise
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(
        mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), u.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), u.x),
        u.y
      ),
      mix(
        mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), u.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), u.x),
        u.y
      ),
      u.z
    );
  }

  // Fractional Brownian Motion (fBm)
  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p * frequency);
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  // Y-axis rotation matrix
  vec3 rotateY(vec3 p, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
  }

  void main() {
    // Normalise coordinates to center, aspect ratio corrected
    vec2 uv = v_uv;
    
    // Scale coords to size the solar sphere inside the viewport
    uv = uv * 2.2;
    float dist = length(uv);

    vec3 color = vec3(0.0);

    if (dist < 1.0) {
      // 3D Sphere projection
      float z = sqrt(1.0 - dist * dist);
      vec3 normal = vec3(uv.x, uv.y, z);

      // Slow rotation on Y axis (1 rotation per ~100s)
      vec3 rotatedP = rotateY(normal * 1.5, u_time * 0.063);

      // Moving surface turbulence
      float n = fbm(rotatedP + vec3(0.0, 0.0, u_time * 0.025));

      // Limb darkening effect
      float limb = pow(z, 0.65);

      // Core Sun surface color mapping
      vec3 baseColor = vec3(0.95, 0.22, 0.0); // Hot red-orange
      vec3 highColor = vec3(1.0, 0.88, 0.15); // Yellow highlight

      color = mix(baseColor, highColor, n) * limb;
      
      // Intense temperature hotspots
      color += vec3(1.0, 0.95, 0.7) * pow(n, 3.8) * limb;

    } else {
      // Atmospheric Corona Glow (Radial falloff)
      float glow = pow(0.075 / (dist - 0.94), 1.8) * 0.48;
      
      // Corona turbulence noise
      float coronaNoise = fbm(vec3(uv * 1.6, u_time * 0.12));
      glow *= (0.72 + 0.28 * coronaNoise);

      // Add limb flare burst at 45 degree angle (top-right)
      vec2 flareDir = vec2(0.707, 0.707);
      float alignment = max(0.0, dot(normalize(uv), flareDir));
      
      // Flare prominence expands outwards when u_flare is active
      float flareProminence = pow(alignment, 14.0) * pow(0.07 / (dist - 0.96), 1.6) * u_flare * 1.8;
      glow += flareProminence * (0.4 + 0.6 * fbm(vec3(uv * 2.8, u_time * 0.7)));

      color = vec3(0.96, 0.38, 0.02) * glow;
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function SolarObservatory() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [time, setTime] = useState(0);
  const [flareActive, setFlareActive] = useState(0); // 0 to 1 value tracking prominence burst
  
  // Satellite orbital coords
  const [satPos, setSatPos] = useState({ x: 0, y: 0, z: 0, visible: true });

  // Update loop for time, flare cycles, and satellite coordinate mapping
  useEffect(() => {
    let animId: number;
    const startTime = Date.now();

    const loop = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      setTime(elapsed);

      // Flare pulse every 18 seconds (lasts 2 seconds)
      const cycleTime = elapsed % 18;
      if (cycleTime > 15 && cycleTime < 17) {
        // Linear fade in/out of the flare prominence
        const phase = cycleTime - 15; // 0 to 2
        const intensity = Math.sin((phase / 2) * Math.PI); // Sine shape: starts 0, peaks 1, decays 0
        setFlareActive(intensity);
      } else {
        setFlareActive(0);
      }

      // 3D Elliptical Orbit Calculations for Satellite
      // Period: 30 seconds
      const orbitDuration = 30;
      const angle = (elapsed * 2 * Math.PI) / orbitDuration;
      
      // Ellipse radiuses
      const rX = 145; // Horizontal width
      const rY = 32;  // Vertical depth tilt
      
      const x = Math.cos(angle) * rX;
      const y = Math.sin(angle) * rY;
      const z = Math.sin(angle); // Z depth factor (-1 = behind, 1 = in front)

      // Occlusion mapping: hide satellite when passing behind the Sun's disk
      // Sun radius matches ~62px in relative logical screen coords
      const distFromCenter = Math.sqrt(x * x + y * y);
      const isBehind = z < 0;
      const isOccluded = isBehind && distFromCenter < 62;

      setSatPos({
        x,
        y,
        z,
        visible: !isOccluded
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // WebGL Shaders context compilation & draw setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    // Helper compile shader
    const compileShader = (src: string, type: number) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compileShader(VERTEX_SHADER_SRC, gl.VERTEX_SHADER);
    const fs = compileShader(FRAGMENT_SHADER_SRC, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    // Program
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }

    // Quad Geometry
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Attribute positions
    const posAttr = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    // Uniform positions
    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uFlare = gl.getUniformLocation(program, "u_flare");

    // Resize Handler
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const size = Math.min(canvas.parentElement?.clientWidth || 320, 480);
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resize();
    window.addEventListener("resize", resize);

    // Render loop binding
    let animId: number;
    const render = () => {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      
      // Read current elapsed time ref
      const currentElapsed = (Date.now() - startTime) / 1000;
      gl.uniform1f(uTime, currentElapsed);

      // Read flare ref
      const cycleTime = currentElapsed % 18;
      let flareVal = 0;
      if (cycleTime > 15 && cycleTime < 17) {
        flareVal = Math.sin(((cycleTime - 15) / 2) * Math.PI);
      }
      gl.uniform1f(uFlare, flareVal);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(render);
    };

    const startTime = Date.now();
    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <div className="relative flex items-center justify-center select-none overflow-visible w-full max-w-[480px] aspect-square mx-auto">
      {/* 3D Sun Shader Canvas */}
      <canvas 
        ref={canvasRef} 
        className="rounded-full shadow-[0_0_80px_rgba(245,158,11,0.12)] z-10 pointer-events-none"
      />

      {/* Orbit path and satellite layer container */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 overflow-visible">
        <svg className="absolute w-full h-full overflow-visible">
          {/* Cyan semi-transparent Orbit path */}
          <ellipse
            cx="50%"
            cy="50%"
            rx="145"
            ry="32"
            fill="none"
            stroke="rgba(6, 182, 212, 0.15)"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            className="z-0"
          />
        </svg>

        {/* Orbiting Satellite Node */}
        {satPos.visible && (
          <div
            className="absolute z-30 transition-transform duration-[16ms] ease-linear"
            style={{
              transform: `translate(${satPos.x}px, ${satPos.y}px) scale(${satPos.z * 0.2 + 0.9})`,
            }}
          >
            <div className="relative flex items-center justify-center">
              {/* Satellite Body SVG */}
              <svg width="28" height="20" viewBox="0 0 28 20" className="drop-shadow-[0_0_4px_rgba(0,112,243,0.4)]">
                {/* Solar Panels (Blue) */}
                <rect x="0" y="7" width="8" height="6" fill="#0070f3" rx="0.5" />
                <rect x="20" y="7" width="8" height="6" fill="#0070f3" rx="0.5" />
                
                {/* Connecting struts */}
                <line x1="8" y1="10" x2="20" y2="10" stroke="#71717a" strokeWidth="1.5" />

                {/* Satellite Body (Silver metallic) */}
                <rect x="10" y="5" width="8" height="10" fill="#d4d4d8" stroke="#a1a1aa" strokeWidth="0.8" rx="1" />
                
                {/* Main instrument antenna */}
                <circle cx="14" cy="4" r="1.5" fill="#71717a" />
                <line x1="14" y1="5" x2="14" y2="2" stroke="#71717a" strokeWidth="0.8" />
              </svg>

              {/* Blinking status led */}
              <span className="absolute top-[8px] left-[13px] flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald"></span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Atmospheric drifting stars backdrop (Faint ambient) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none -z-10 bg-radial-ambient" />
    </div>
  );
}
