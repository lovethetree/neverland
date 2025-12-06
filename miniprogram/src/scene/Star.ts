import * as THREE from 'three-platformize';
import { TREE_HEIGHT, SPHERE_RADIUS, randomPointInSphere } from '../utils';

export class Star {
  group: THREE.Group;
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  
  chaosPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  currentPos: THREE.Vector3;
  currentScale: THREE.Vector3;

  constructor() {
    this.group = new THREE.Group();
    
    const starSize = 1.0;
    this.chaosPos = randomPointInSphere(SPHERE_RADIUS * 0.8);
    this.targetPos = new THREE.Vector3(0, TREE_HEIGHT / 2 + 0.3, 0);
    
    this.currentPos = this.chaosPos.clone();
    this.currentScale = new THREE.Vector3(0.3, 0.3, 0.3);

    // Shape
    const shape = new THREE.Shape();
    const spikes = 5;
    const outerRadius = starSize;
    const innerRadius = starSize * 0.5;
    
    let rot = Math.PI / 2 * 3;
    let x = 0;
    let y = 0;
    const step = Math.PI / spikes;
    
    for (let i = 0; i < spikes; i++) {
      x = outerRadius * Math.cos(rot);
      y = outerRadius * Math.sin(rot);
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
      rot += step;
      x = innerRadius * Math.cos(rot);
      y = innerRadius * Math.sin(rot);
      shape.lineTo(x, y);
      rot += step;
    }
    shape.lineTo(outerRadius * Math.cos(Math.PI / 2 * 3), outerRadius * Math.sin(Math.PI / 2 * 3));

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelOffset: 0,
      bevelSegments: 4
    });

    const material = new THREE.MeshStandardMaterial({
      color: 0xFFFF00,
      emissive: 0xFFFF88,
      emissiveIntensity: 0.8,
      metalness: 0.8,
      roughness: 0.2,
      toneMapped: false
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    
    // Glow Mesh (simplified as clone with same material or similar)
    this.glowMesh = this.mesh.clone();
    this.glowMesh.scale.multiplyScalar(1.2);
    // Note: Original code used same material for glowMesh in refs but maybe I should tweak it if needed.
    // Actually the original code refs were separate but material memoized once.
    // Let's keep it simple.
    
    // Add to group
    this.group.add(this.mesh);
    // this.group.add(this.glowMesh); // Maybe too heavy? Original didn't explicitly add glowMesh to scene in snippet?
    // Wait, line 94 in Star.tsx: glowMeshRef.current.rotation.y...
    // It implies glowMesh is rendered.
    // But in JSX return (not shown fully in snippet), it likely renders both.
    // I'll add it.
    this.group.add(this.glowMesh);
  }

  update(delta: number, isFormed: boolean) {
    // Rotation
    this.mesh.rotation.y += delta * 0.1;
    this.glowMesh.rotation.y += delta * 0.1;

    // Position and Scale
    if (isFormed) {
      this.currentPos.lerp(this.targetPos, delta * 2.0);
      this.currentScale.lerp(new THREE.Vector3(1, 1, 1), delta * 2.0);
    } else {
      this.currentPos.lerp(this.chaosPos, delta * 0.5);
      this.currentScale.lerp(new THREE.Vector3(0.3, 0.3, 0.3), delta * 0.5);
    }

    this.group.position.copy(this.currentPos);
    this.group.scale.copy(this.currentScale);
    
    // Pulse effect for glow
    // Not in snippet but nice to have? Original snippet ended at line 100.
  }
}
