import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { generateParticlesData, isMobileDevice } from '../utils';
import { useStore } from '../store';

const vertexShader = `
  uniform float uTime;
  uniform float uProgress;
  uniform float uPixelRatio;
  
  attribute vec3 aChaos;
  attribute vec3 aTarget;
  attribute float aVisibility; // 1.0 = visible in chaos, 0.0 = hidden in chaos
  
  varying float vAlpha;
  varying vec3 vColor;

  // Function to rotate a vector around Y axis
  vec3 rotateY(vec3 v, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec3(v.x * c - v.z * s, v.y, v.x * s + v.z * c);
  }

  void main() {
    // Spiral interpolation
    // As we move from chaos (0) to target (1), we can add a spiral rotation
    // But direct mix is often cleaner. Let's stick to mix but add noise.
    
    vec3 pos = mix(aChaos, aTarget, uProgress);
    
    // Add spiral twist during formation
    if (uProgress > 0.0 && uProgress < 1.0) {
        float twist = (1.0 - uProgress) * 5.0 * (pos.y * 0.1);
        pos = rotateY(pos, twist);
    }
    
    // Breathing effect when formed
    if (uProgress > 0.95) {
      pos.x += sin(uTime * 1.5 + pos.y) * 0.03;
      pos.z += cos(uTime * 1.2 + pos.x) * 0.03;
    } 
    // Floating effect when chaos
    else if (uProgress < 0.05) {
      pos.y += sin(uTime + pos.x) * 0.2;
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Size attenuation
    // Scale size by pixel ratio for consistent look on mobile/desktop
    float currentVisibility = mix(aVisibility, 1.0, uProgress);
    gl_PointSize = (250.0 * uPixelRatio * currentVisibility) * (1.0 / -mvPosition.z);
    
    // Twinkle alpha
    vAlpha = 0.6 + 0.4 * sin(uTime * 3.0 + pos.x * 0.5 + pos.y * 0.5);
    
    // Color gradient tuned to "deep emerald"
    float h = smoothstep(-10.0, 10.0, pos.y);
    vec3 colorBottom = vec3(0.01, 0.25, 0.08);
    vec3 colorTop = vec3(0.07, 0.50, 0.20);
    vColor = mix(colorBottom, colorTop, h);
    
    // Subtle gold sparkles
    float sparkle = sin(uTime * 5.0 + pos.x * 10.0) > 0.92 ? 1.0 : 0.0;
    vColor += vec3(1.0, 0.8, 0.2) * sparkle * 0.35;
  }
`;

const fragmentShader = `
  varying float vAlpha;
  varying vec3 vColor;
  
  void main() {
    // Circular particle
    float r = distance(gl_PointCoord, vec2(0.5));
    if (r > 0.5) discard;
    
    // Soft glow
    float glow = 1.0 - (r * 2.0);
    glow = pow(glow, 2.0);
    
    gl_FragColor = vec4(vColor, vAlpha * glow);
  }
`;

const Foliage = () => {
  const isMobile = useMemo(() => isMobileDevice(), []);
  const count = isMobile ? 3000 : 8000; // Higher density for rich emerald foliage, throttled on mobile
  const mesh = useRef<THREE.Points>(null);
  const isFormed = useStore((state) => state.isFormed);
  const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
  
  // Progress state for smooth transition
  const progress = useRef(0);
  
  const { chaosPositions, targetPositions } = useMemo(() => generateParticlesData(count, 'surface'), [count]);
  
  // Generate visibility attribute: 1/3 visible in chaos mode
  const visibilityArray = useMemo(() => {
    const arr = new Float32Array(count);
    for(let i = 0; i < count; i++) {
        // Keep 1/3 (if i % 3 == 0)
        arr[i] = (i % 3 === 0) ? 1.0 : 0.0;
    }
    return arr;
  }, [count]);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uPixelRatio: { value: pixelRatio }
  }), [pixelRatio]);

  useFrame((state, delta) => {
    if (mesh.current) {
      // Smooth transition
      const target = isFormed ? 1 : 0;
      // Use damping for smoother start/stop
      progress.current = THREE.MathUtils.damp(progress.current, target, 2.0, delta);
      
      const material = mesh.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;
      material.uniforms.uProgress.value = progress.current;
    }
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={chaosPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aChaos"
          count={count}
          array={chaosPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTarget"
          count={count}
          array={targetPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aVisibility"
          count={count}
          array={visibilityArray}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        depthWrite={false}
        transparent
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        blending={THREE.AdditiveBlending} // Additive blending for "light" effect
      />
    </points>
  );
};

export default Foliage;
