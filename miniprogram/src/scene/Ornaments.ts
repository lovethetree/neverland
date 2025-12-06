import * as THREE from 'three-platformize';
import { generateParticlesData, isMobileDevice, CHAOS_REDUCTION_RATIO } from '../utils';

interface InstancedOrnamentsConfig {
  count: number;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  weight: number;
  scale?: number;
  mode?: 'spiral' | 'volume' | 'surface' | 'phyllotaxis';
  angleOffset?: number;
  reductionRatio?: number;
}

class InstancedOrnaments {
  mesh: THREE.InstancedMesh;
  config: InstancedOrnamentsConfig;
  chaosPositions: Float32Array;
  targetPositions: Float32Array;
  currentPositions: Float32Array;
  currentScales: Float32Array;
  dummy: THREE.Object3D;

  constructor(config: InstancedOrnamentsConfig) {
    this.config = {
      scale: 1,
      mode: 'spiral',
      angleOffset: 0,
      reductionRatio: 0,
      ...config
    };

    const { count, geometry, material, mode, angleOffset } = this.config;

    this.mesh = new THREE.InstancedMesh(geometry, material, count);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    const { chaosPositions, targetPositions } = generateParticlesData(count, mode, { angleOffset });
    this.chaosPositions = chaosPositions;
    this.targetPositions = targetPositions;

    this.currentPositions = new Float32Array(chaosPositions);
    this.currentScales = new Float32Array(count).fill(this.config.scale!);

    this.dummy = new THREE.Object3D();

    // Initialize positions
    for (let i = 0; i < count; i++) {
      this.dummy.position.set(
        chaosPositions[i * 3],
        chaosPositions[i * 3 + 1],
        chaosPositions[i * 3 + 2]
      );
      this.dummy.scale.setScalar(this.config.scale!);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  update(delta: number, isFormed: boolean, time: number) {
    const { count, weight, scale, reductionRatio } = this.config;
    const baseSpeed = 3.0;
    const lerpFactor = THREE.MathUtils.clamp(baseSpeed * (1.0 - weight * 0.5) * delta, 0, 1);
    
    let needsUpdate = false;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      
      const targetX = isFormed ? this.targetPositions[idx] : this.chaosPositions[idx];
      const targetY = isFormed ? this.targetPositions[idx + 1] : this.chaosPositions[idx + 1];
      const targetZ = isFormed ? this.targetPositions[idx + 2] : this.chaosPositions[idx + 2];
      
      const currentX = this.currentPositions[idx];
      const currentY = this.currentPositions[idx + 1];
      const currentZ = this.currentPositions[idx + 2];
      
      // Simple Lerp
      const x = THREE.MathUtils.lerp(currentX, targetX, lerpFactor);
      const y = THREE.MathUtils.lerp(currentY, targetY, lerpFactor);
      const z = THREE.MathUtils.lerp(currentZ, targetZ, lerpFactor);
      
      this.currentPositions[idx] = x;
      this.currentPositions[idx + 1] = y;
      this.currentPositions[idx + 2] = z;
      
      // Scale Logic
      let targetS = scale!;
      if (!isFormed && reductionRatio! > 0) {
          if (reductionRatio! <= 1.0) {
             if ((i % 100) >= (reductionRatio! * 100)) {
                 targetS = 0;
             }
          } else {
             if (i % Math.floor(reductionRatio!) !== 0) {
                 targetS = 0;
             }
          }
      }
      
      const currentS = this.currentScales[i];
      const newS = THREE.MathUtils.lerp(currentS, targetS, lerpFactor);
      this.currentScales[i] = newS;
      
      // Update Matrix
      this.dummy.position.set(x, y, z);
      this.dummy.scale.setScalar(newS);
      
      // Rotation
      if (!isFormed) {
         const distanceFromCenter = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
         const baseRadius = 3.5;
         const speedFactor = baseRadius / Math.max(distanceFromCenter, 1);
         
         this.dummy.rotation.set(
            time * 0.05 * speedFactor * 0.5 + i * 0.1,
            time * 0.025 * speedFactor * 0.5 + i * 0.1,
            0
         );
      } else {
         this.dummy.rotation.set(0, 0, 0);
      }
      
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      needsUpdate = true;
    }

    if (needsUpdate) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }
}

export class OrnamentsSystem {
  group: THREE.Group;
  ornaments: InstancedOrnaments[] = [];

  constructor() {
    this.group = new THREE.Group();
    const isMobile = isMobileDevice();

    // Adjust counts for mobile/mini program
    const giftCount = isMobile ? 50 : 72;
    const sphereCount = isMobile ? 200 : 315;
    const lightCount = isMobile ? 400 : 540;

    // Materials
    const giftMaterial = new THREE.MeshStandardMaterial({ 
      color: '#FFD700', 
      roughness: isMobile ? 0.1 : 0.4,
      metalness: isMobile ? 1.0 : 1.0,
      envMapIntensity: isMobile ? 1.0 : 1.0,
      emissive: '#553300', 
      emissiveIntensity: isMobile ? 0.5 : 0.5
    });
    
    const sphereMaterial = new THREE.MeshStandardMaterial({ 
      color: '#D4AF37', 
      roughness: isMobile ? 0.1 : 0.1,
      metalness: isMobile ? 1.2 : 1.2,
      emissive: '#553300',
      emissiveIntensity: isMobile ? 1.0 : 1.0, 
      envMapIntensity: isMobile ? 0.5 : 0.5
    });

    const lightMaterial = new THREE.MeshStandardMaterial({ 
      color: '#FFFFE0', 
      emissive: '#FFFFE0', 
      emissiveIntensity: isMobile ? 1.1 : 1.1,
      toneMapped: false 
    });

    // Geometries
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const sphereGeo = new THREE.SphereGeometry(1, 16, 16);

    // Create InstancedOrnaments
    // Heavy Gifts
    this.addOrnament({
      count: giftCount,
      geometry: boxGeo,
      material: giftMaterial,
      weight: 0.9,
      scale: 0.6,
      mode: 'phyllotaxis',
      angleOffset: 0,
      reductionRatio: CHAOS_REDUCTION_RATIO
    });

    // Gold Spheres
    this.addOrnament({
      count: sphereCount,
      geometry: sphereGeo,
      material: sphereMaterial,
      weight: 0.5,
      scale: 0.35,
      mode: 'phyllotaxis',
      angleOffset: 2.1,
      reductionRatio: CHAOS_REDUCTION_RATIO
    });

    // Tiny Lights
    this.addOrnament({
      count: lightCount,
      geometry: sphereGeo,
      material: lightMaterial,
      weight: 0.1,
      scale: 0.12,
      mode: 'phyllotaxis',
      angleOffset: 4.2,
      reductionRatio: CHAOS_REDUCTION_RATIO
    });
  }

  addOrnament(config: InstancedOrnamentsConfig) {
    const ornament = new InstancedOrnaments(config);
    this.ornaments.push(ornament);
    this.group.add(ornament.mesh);
  }

  update(delta: number, isFormed: boolean, time: number) {
    this.ornaments.forEach(ornament => ornament.update(delta, isFormed, time));
  }
}
