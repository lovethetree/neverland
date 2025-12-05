import { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { generateParticlesData, isMobileDevice } from '../utils';

interface InstancedOrnamentsProps {
  count: number;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  weight: number; // 0 to 1, where 1 is heavy (slow)
  scale?: number;
  mode?: 'spiral' | 'volume' | 'surface' | 'phyllotaxis';
  angleOffset?: number;
}

const tempObject = new THREE.Object3D();

const InstancedOrnaments = ({ count, geometry, material, weight, scale = 1, mode = 'spiral', angleOffset = 0 }: InstancedOrnamentsProps) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const isFormed = useStore((state) => state.isFormed);
  
  const { chaosPositions, targetPositions } = useMemo(() => generateParticlesData(count, mode, { angleOffset }), [count, mode, angleOffset]);
  
  // Store current positions for lerping in JS
  const currentPositions = useMemo(() => new Float32Array(chaosPositions), [chaosPositions]);
  
  useLayoutEffect(() => {
    if (meshRef.current) {
      for (let i = 0; i < count; i++) {
        tempObject.position.set(chaosPositions[i*3], chaosPositions[i*3+1], chaosPositions[i*3+2]);
        tempObject.scale.setScalar(scale);
        tempObject.updateMatrix();
        meshRef.current.setMatrixAt(i, tempObject.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [count, chaosPositions, scale]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const time = state.clock.elapsedTime;

    // Adjust speed based on weight
    // weight 1 (heavy) -> slow lerp factor
    // weight 0 (light) -> fast lerp factor
    // Increased base speed by 1.5x for faster transitions as requested
    const baseSpeed = 3.0; // 2.0 * 1.5 = 3.0, faster transitions
    const lerpFactor = THREE.MathUtils.clamp(baseSpeed * (1.0 - weight * 0.5) * delta, 0, 1);
    
    let needsUpdate = false;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      
      const targetX = isFormed ? targetPositions[idx] : chaosPositions[idx];
      const targetY = isFormed ? targetPositions[idx + 1] : chaosPositions[idx + 1];
      const targetZ = isFormed ? targetPositions[idx + 2] : chaosPositions[idx + 2];
      
      const currentX = currentPositions[idx];
      const currentY = currentPositions[idx + 1];
      const currentZ = currentPositions[idx + 2];
      
      // Simple Lerp
      const x = THREE.MathUtils.lerp(currentX, targetX, lerpFactor);
      const y = THREE.MathUtils.lerp(currentY, targetY, lerpFactor);
      const z = THREE.MathUtils.lerp(currentZ, targetZ, lerpFactor);
      
      // Update current
      currentPositions[idx] = x;
      currentPositions[idx + 1] = y;
      currentPositions[idx + 2] = z;
      
      // Update Matrix
      tempObject.position.set(x, y, z);
      tempObject.scale.setScalar(scale);
      
      // Rotation: Time-based to avoid accumulation issues
      if (!isFormed) {
         // Calculate distance from center
         const distanceFromCenter = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
         
         // Base radius in formed mode (average of tree radius)
         const baseRadius = 3.5; // Average radius of the tree in formed mode
         
         // Calculate dynamic speed factor: inverse proportional to distance
         // This ensures consistent visual rotation speed regardless of distance from center
         const speedFactor = baseRadius / Math.max(distanceFromCenter, 1); // Avoid division by zero
         
         // Original rotation speeds: X=0.05, Y=0.025
         // Apply speed factor to maintain consistent visual rotation speed
         // Multiply by 0.5 as requested to slow down chaotic mode even further
         tempObject.rotation.set(
            time * 0.05 * speedFactor * 0.5 + i * 0.1,  // X轴旋转速度
            time * 0.025 * speedFactor * 0.5 + i * 0.1, // Y轴旋转速度
            0
         );
      } else {
         tempObject.rotation.set(0, 0, 0);
      }
      
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      castShadow
      receiveShadow
    />
  );
};

export const OrnamentsSystem = () => {
  const isMobile = useMemo(() => isMobileDevice(), []);

  // If on mobile, hide ornaments completely (except maybe the star which is separate)
  // Return null to render nothing
  if (isMobile) {
      return null;
  }
  
  // 调整装饰品数量 - 电脑端进一步减少10%
  const giftCount = isMobile ? 50 : 72;      // 电脑端礼物盒再减少10%
  const sphereCount = isMobile ? 200 : 315;  // 电脑端金色球再减少10%
  const lightCount = isMobile ? 400 : 540;   // 电脑端小灯再减少10%

  // Materials
  const giftMaterial = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#FFD700', 
    roughness: isMobile ? 0.1 : 0.4, // 电脑端增加粗糙度
    metalness: isMobile ? 1.0 : 1.0, // 电脑端降低金属感
    envMapIntensity: isMobile ? 1.0 : 1.0, // 电脑端降低环境反射
    emissive: '#553300', 
    emissiveIntensity: isMobile ? 0.5 : 0.5 // 电脑端降低自发光
  }), [isMobile]);
  
  const sphereMaterial = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#D4AF37', 
    roughness: isMobile ? 0.1 : 0.1, // 电脑端增加粗糙度
    metalness: isMobile ? 1.2 : 1.2,
    emissive: '#553300',
    emissiveIntensity: isMobile ? 1.0 : 1.0, 
    envMapIntensity: isMobile ? 0.5 : 0.5 // 电脑端降低环境反射
  }), [isMobile]); // Red/Gold mixed

  const lightMaterial = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#FFFFE0', 
    emissive: '#FFFFE0', 
    emissiveIntensity: isMobile ? 1.1 : 1.1, // 电脑端降低自发光强度
    toneMapped: false 
  }), [isMobile]);

  // Geometries
  const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 16, 16), []);

  return (
    <group>
      {/* Heavy Gifts - Bottom/Random */}
      <InstancedOrnaments 
        count={giftCount} 
        geometry={boxGeo} 
        material={giftMaterial} 
        weight={0.9} 
        scale={0.6} 
        mode={'phyllotaxis'}
        angleOffset={0}
      />
      
      {/* Gold Spheres */}
      <InstancedOrnaments 
        count={sphereCount} 
        geometry={sphereGeo} 
        material={sphereMaterial} 
        weight={0.5} 
        scale={0.35} 
        mode={'phyllotaxis'}
        angleOffset={2.1} // Offset to interleave
      />
      
      {/* Tiny Lights */}
      <InstancedOrnaments 
        count={lightCount} 
        geometry={sphereGeo} 
        material={lightMaterial} 
        weight={0.1} 
        scale={0.12} 
        mode={'phyllotaxis'}
        angleOffset={4.2} // Offset to interleave
      />
    </group>
  );
};




