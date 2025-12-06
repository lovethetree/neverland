import * as THREE from 'three/src/Three';
import Taro from '@tarojs/taro';

// Configuration
export const TREE_HEIGHT = 15;
export const TREE_RADIUS = 7;
export const SPHERE_RADIUS = 25;
export const CHAOS_REDUCTION_RATIO = 0.5; // Reduce chaos density for mobile performance

// Mobile detection - Always true for Mini Program
export const isMobileDevice = () => {
  return true;
};

export const randomPointInSphere = (radius: number): THREE.Vector3 => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;
  
  const sinPhi = Math.sin(phi);
  return new THREE.Vector3(
    r * sinPhi * Math.cos(theta),
    r * sinPhi * Math.sin(theta),
    r * Math.cos(phi)
  );
};

export const generateParticlesData = (count: number, mode: 'spiral' | 'volume' | 'surface' | 'phyllotaxis' = 'surface', options?: { angleOffset?: number }) => {
  const chaosPositions = new Float32Array(count * 3);
  const targetPositions = new Float32Array(count * 3);
  
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // Precise Golden Angle

  for (let i = 0; i < count; i++) {
    const chaos = randomPointInSphere(SPHERE_RADIUS);
    let y: number;
    let r: number;
    let angle: number;
    
    if (mode === 'phyllotaxis') {
        const normalizedIndex = i / count;
        y = normalizedIndex * TREE_HEIGHT; 
        
        const rMax = TREE_RADIUS * (1 - y / TREE_HEIGHT);
        r = rMax; // On surface
        
        angle = i * goldenAngle + (options?.angleOffset || 0);

        const jitterAngle = (Math.random() - 0.5) * 0.2;
        const jitterY = (Math.random() - 0.5) * 0.4;
        const jitterR = (Math.random() - 0.5) * 0.1;

        angle += jitterAngle;
        y += jitterY;
        r += jitterR;
        
    } else {
        const random = Math.random();
        y = TREE_HEIGHT * (1 - Math.sqrt(random));
        
        const rMax = TREE_RADIUS * (1 - y / TREE_HEIGHT);

        if (mode === 'volume') {
            r = rMax * Math.sqrt(Math.random());
            angle = Math.random() * Math.PI * 2 + y * 0.5;
        } else if (mode === 'surface') {
            r = rMax * (0.95 + 0.05 * Math.random());
            angle = Math.random() * Math.PI * 2;
        } else {
            r = rMax;
            angle = y * 1.5 + Math.random() * 0.2;
        }
    }

    const x = r * Math.cos(angle);
    const z = r * Math.sin(angle);

    const target = new THREE.Vector3(x, y - TREE_HEIGHT / 2, z);
    
    chaosPositions.set([chaos.x, chaos.y, chaos.z], i * 3);
    targetPositions.set([target.x, target.y, target.z], i * 3);
  }
  
  return { chaosPositions, targetPositions };
};
