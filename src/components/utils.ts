import * as THREE from 'three';

// Configuration
export const TREE_HEIGHT = 20;
export const TREE_RADIUS = 4;
export const SPHERE_RADIUS = 25;

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

export const randomPointOnCone = (height: number, radius: number): THREE.Vector3 => {
  // Random height (more density at bottom looks better, but linear is okay)
  // Let's use linear distribution for Y
  const y = Math.random() * height;
  
  // Radius at this height
  const r = radius * (1 - y / height);
  
  // Random angle
  const theta = Math.random() * 2 * Math.PI;
  
  // Convert to Cartesian
  const x = r * Math.cos(theta);
  const z = r * Math.sin(theta);
  
  // Offset y so tree is centered or sitting on ground. 
  // Let's have base at y = -height/2 to center it? 
  // Or base at 0. Let's put base at -height/2.
  return new THREE.Vector3(x, y - height / 2, z);
};

// Generate data for N particles
export const generateParticlesData = (count: number) => {
  const chaosPositions = new Float32Array(count * 3);
  const targetPositions = new Float32Array(count * 3);
  
  for (let i = 0; i < count; i++) {
    const chaos = randomPointInSphere(SPHERE_RADIUS);
    const target = randomPointOnCone(TREE_HEIGHT, TREE_RADIUS);
    
    chaosPositions.set([chaos.x, chaos.y, chaos.z], i * 3);
    targetPositions.set([target.x, target.y, target.z], i * 3);
  }
  
  return { chaosPositions, targetPositions };
};
