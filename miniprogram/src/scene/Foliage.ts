import * as THREE from 'three-platformize';
import { generateParticlesData, CHAOS_REDUCTION_RATIO } from '../utils';

const vertexShader = `
  uniform float uTime;
  uniform float uProgress;
  uniform float uPixelRatio;
  
  attribute vec3 aChaos;
  attribute vec3 aTarget;
  attribute float aVisibility;
  
  varying float vAlpha;
  varying vec3 vColor;

  // Function to rotate a vector around Y axis
  vec3 rotateY(vec3 v, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec3(v.x * c - v.z * s, v.y, v.x * s + v.z * c);
  }

  void main() {
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

export class Foliage {
  mesh: THREE.Points;
  material: THREE.ShaderMaterial;
  geometry: THREE.BufferGeometry;
  progress = 0;
  uniforms: {
    uTime: { value: number };
    uProgress: { value: number };
    uPixelRatio: { value: number };
  };
  
  constructor(pixelRatio: number = 2) {
    const count = 3000; // Mobile optimized count
    const { chaosPositions, targetPositions } = generateParticlesData(count, 'surface');
    
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(targetPositions, 3)); 
    this.geometry.setAttribute('aChaos', new THREE.BufferAttribute(chaosPositions, 3));
    this.geometry.setAttribute('aTarget', new THREE.BufferAttribute(targetPositions, 3));
    
    const visibility = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        if (i % Math.floor(1 / CHAOS_REDUCTION_RATIO) === 0) {
            visibility[i] = 1.0;
        } else {
            visibility[i] = 0.0;
        }
    }
    this.geometry.setAttribute('aVisibility', new THREE.BufferAttribute(visibility, 1));
    
    this.uniforms = {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uPixelRatio: { value: pixelRatio }
    };

    this.material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: this.uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    // this.mesh.frustumCulled = false; // Ensure visibility
  }

  update(delta: number, isFormed: boolean, time: number) {
    this.uniforms.uTime.value = time;
    
    const targetProgress = isFormed ? 1.0 : 0.0;
    // Smooth transition
    this.progress = THREE.MathUtils.lerp(this.progress, targetProgress, delta * 1.5);
    this.uniforms.uProgress.value = this.progress;
  }
}
