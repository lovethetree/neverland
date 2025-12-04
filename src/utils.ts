import * as THREE from 'three';

// Configuration
export const TREE_HEIGHT = 15;
export const TREE_RADIUS = 7;
export const SPHERE_RADIUS = 25;

// Mobile detection
export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  
  // Check User Agent
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
  
  // Check Screen Width (strict mobile width)
  const isSmallScreen = window.innerWidth < 768;
  
  // Check Touch Points (most reliable for tablets/phones)
  const hasTouch = 'maxTouchPoints' in navigator && navigator.maxTouchPoints > 0;
  
  return isMobileUA || (hasTouch && isSmallScreen);
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

export const randomPointOnCone = (height: number, radius: number): THREE.Vector3 => {
  // Area-based distribution for more uniform visual appearance
  const random = Math.random();
  const y = height * (1 - Math.sqrt(random));
  
  const r = radius * (1 - y / height);
  
  // Spiral effect: Angle depends on height
  // Add some randomness to the angle so it's a "thick" spiral or just a filled cone with spiral tendency
  const loops = 8; // Number of turns
  const spiralAngle = (y / height) * loops * Math.PI * 2;
  // Removed unused randomAngleOffset variable
  
  // If we want a "ribbon" tree, we limit the random offset.
  // If we want a volume tree, we use full random.
  // The user asked to imitate st-xue, which is often a spiral ribbon.
  // Let's try a mix: a spiral core with some spread.
  
  const theta = spiralAngle + Math.random() * 0.5; // Small spread for ribbon effect
  
  const x = r * Math.cos(theta);
  const z = r * Math.sin(theta);
  
  return new THREE.Vector3(x, y - height / 2, z);
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
        // Uniform vertical distribution
        // y goes from 0 (bottom relative to tree base) to TREE_HEIGHT
        // To account for cone area tapering (fewer points at top), we can either:
        // 1. Use linear y (denser at top)
        // 2. Use area-based y (uniform density)
        // For a "Tree", denser at top looks better (fuller tip). Let's use linear for phyllotaxis.
        const normalizedIndex = i / count;
        y = normalizedIndex * TREE_HEIGHT; 
        
        const rMax = TREE_RADIUS * (1 - y / TREE_HEIGHT);
        r = rMax; // On surface
        
        // Golden Angle Spiral
        // Add offset to prevent overlap when using multiple generators
        angle = i * goldenAngle + (options?.angleOffset || 0);

        // Add natural randomness (perturbation) to break the perfect mechanical look
        const jitterAngle = (Math.random() - 0.5) * 0.2; // +/- 0.25 radians (~15 degrees)
        const jitterY = (Math.random() - 0.5) * 0.4;     // +/- 0.2 units vertical
        const jitterR = (Math.random() - 0.5) * 0.1;     // +/- 0.2 units radial depth

        angle += jitterAngle;
        y += jitterY;
        r += jitterR;
        
    } else {
        // Standard Random distributions
        // Area-based distribution for more uniform visual appearance
        const random = Math.random();
        y = TREE_HEIGHT * (1 - Math.sqrt(random));
        
        const rMax = TREE_RADIUS * (1 - y / TREE_HEIGHT);

        if (mode === 'volume') {
            // Uniformly fill the cone's cross section (sqrt for area distribution)
            r = rMax * Math.sqrt(Math.random());
            angle = Math.random() * Math.PI * 2 + y * 0.5; // slight swirl accent
        } else if (mode === 'surface') {
            // Strictly on the surface with very minimal depth variance
            r = rMax * (0.95 + 0.05 * Math.random());
            angle = Math.random() * Math.PI * 2;
        } else {
            // Spiral ribbon style
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
