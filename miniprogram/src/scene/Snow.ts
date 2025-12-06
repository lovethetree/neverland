import * as THREE from 'three-platformize';
import { isMobileDevice } from '../utils';

const vertexShader = `
  uniform float uTime;
  uniform float uHeight;
  uniform float uSpeed;
  
  attribute float aSize;
  attribute float aSpeed;
  attribute vec3 aRandom;
  
  varying float vAlpha;
  
  void main() {
    vec3 pos = position;
    
    // Fall down simulation
    // y = initialY - (time * speed * particleSpeed)
    float fallOffset = uTime * uSpeed * aSpeed;
    
    // Wrap around logic
    // We map y to be within [-uHeight/2, uHeight/2]
    // pos.y is initial position.
    float height = uHeight;
    float currentY = mod(pos.y - fallOffset + height/2.0, height) - height/2.0;
    pos.y = currentY;
    
    // Sway motion (x and z axis)
    pos.x += sin(uTime * 0.5 + aRandom.x) * 0.5;
    pos.z += cos(uTime * 0.3 + aRandom.z) * 0.5;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Size attenuation
    gl_PointSize = aSize * (20.0 / -mvPosition.z);
    
    // Fade out at edges (top and bottom)
    float edge = 5.0;
    float alpha = 1.0;
    // Top fade
    if (pos.y > height/2.0 - edge) {
       alpha = (height/2.0 - pos.y) / edge;
    } 
    // Bottom fade
    else if (pos.y < -height/2.0 + edge) {
       alpha = (pos.y - (-height/2.0)) / edge;
    }
    vAlpha = alpha * 0.6; // Base opacity
  }
`;

const fragmentShader = `
  varying float vAlpha;
  
  void main() {
    // Soft circular particle
    float r = distance(gl_PointCoord, vec2(0.5));
    if (r > 0.5) discard;
    
    // Soft glow/blur from center
    float glow = 1.0 - (r * 2.0);
    glow = pow(glow, 1.5);
    
    gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha * glow);
  }
`;

export class Snow {
  mesh: THREE.Points;
  uniforms: {
    uTime: { value: number };
    uHeight: { value: number };
    uSpeed: { value: number };
  };

  constructor() {
    const isMobile = isMobileDevice();
    const count = isMobile ? 1000 : 2000;
    
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const speeds = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // Spread particles in a large volume
      positions[i * 3] = (Math.random() - 0.5) * 60; // x
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50; // y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60; // z
      
      randoms[i * 3] = Math.random() * Math.PI * 2;
      randoms[i * 3 + 1] = Math.random() * Math.PI * 2;
      randoms[i * 3 + 2] = Math.random() * Math.PI * 2;
      
      sizes[i] = Math.random() * 12.0 + 4.0; // Size variation - larger
      speeds[i] = Math.random() * 0.5 + 0.3; // Speed variation
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));

    this.uniforms = {
      uTime: { value: 0 },
      uHeight: { value: 50 }, // Match vertical range
      uSpeed: { value: 1.0 }
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.mesh = new THREE.Points(geometry, material);
  }

  update(time: number) {
    this.uniforms.uTime.value = time;
  }
}
