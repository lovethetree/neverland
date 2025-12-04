import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { randomPointInSphere, SPHERE_RADIUS, TREE_HEIGHT, TREE_RADIUS, isMobileDevice } from '../utils';

// Dynamically import all images from the ../images directory
const images = import.meta.glob('../images/*', { eager: true, query: '?url', import: 'default' });
const imageUrls = Object.values(images) as string[];

const PhotoFrame = ({ url, index, total }: { url: string, index: number, total: number }) => {
  const mesh = useRef<THREE.Group>(null);
  const isFormed = useStore((state) => state.isFormed);
  const texture = useLoader(THREE.TextureLoader, url);
  
  // Handle EXIF rotation for photos
  useEffect(() => {
    if (texture.image) {
      // Create an Image object to check and fix EXIF rotation
      const img = texture.image as HTMLImageElement;
      
      // Force reset any rotation that might be applied by the browser
      // This ensures photos display in their original orientation
      img.style.transform = 'none';
      img.style.imageOrientation = 'none';
      
      // Log texture dimensions and original image for debugging
      console.log(`Photo loaded: ${url}`);
      console.log(`Texture dimensions: ${texture.image.width}x${texture.image.height}`);
    }
  }, [texture, url]);

  // Generate unique positions
  const { chaosPos, targetPos } = useMemo(() => {
    // Chaos: Random in sphere
    const chaos = randomPointInSphere(SPHERE_RADIUS * 1.2);
    
    // Target: Distributed on cone using Golden Angle Spiral (Phyllotaxis)
    // This matches the uniform distribution of ornaments
    
    // Clamp y range to avoid bottom clipping and very top tip (where radius is 0)
    const minY = -TREE_HEIGHT / 2 + 1.5; 
    const maxY = TREE_HEIGHT / 2 - 1.0;  
    const y = minY + (index / total) * (maxY - minY);
    
    // Cone radius at this height
    // y is from -7.5 to 7.5 approx
    // heightFromBase is 0 to 15
    const heightFromBase = y + TREE_HEIGHT / 2;
    const rBase = TREE_RADIUS * (1 - heightFromBase / TREE_HEIGHT);
    
    const r = rBase + 0.5; // Slight offset to float ON TOP of foliage
    
    // Precise Golden Angle
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); 
    const angleOffset = 1.0; // Interleave with ornaments (which use 0, 2.1, 4.2)
    const theta = index * goldenAngle + angleOffset + (Math.random() - 0.5) * 0.5; // Add angle jitter
    
    const jitterY = (Math.random() - 0.5) * 0.6; // Vertical jitter
    const finalY = y + jitterY;

    const x = r * Math.cos(theta);
    const z = r * Math.sin(theta);
    
    const target = new THREE.Vector3(x, finalY, z);
    
    return { chaosPos: chaos, targetPos: target };
  }, [index, total]);

  // Current position for lerping
  const currentPos = useRef(chaosPos.clone());
  
  // Calculate target orientation quaternion so photos are aligned consistently with the tree
  const targetQuat = useMemo(() => {
      // 1. Base orientation: Look outward from center
      const dummy = new THREE.Object3D();
      dummy.position.copy(targetPos);
      dummy.lookAt(0, targetPos.y, 0); 
      dummy.rotateY(Math.PI); // Now facing outward
      
      // 2. Ensure consistent upright orientation
      // Set pitch based on tree slope but ensure photos are always facing outward properly
      const slopeAngle = Math.atan2(TREE_RADIUS, TREE_HEIGHT);
      
      // Keep photos flat against the tree surface with minimal tilt
      // Use a small negative tilt to ensure photos face outward consistently
      const consistentTilt = -slopeAngle * 1.8; // Small outward tilt
      
      // Calculate rotation to align with tree surface
      dummy.rotateX(consistentTilt);
      
      // Create final quaternion with consistent orientation
      return new THREE.Quaternion().setFromEuler(dummy.rotation);
  }, [targetPos]);

  useFrame((_, delta) => {
    if (mesh.current) {
      const speed = 2.0 * delta;
      const target = isFormed ? targetPos : chaosPos;
      
      // Lerp Position
      currentPos.current.lerp(target, speed);
      mesh.current.position.copy(currentPos.current);
      
      // Rotation: random in chaos, leaf-like orientation in formed
      if (isFormed) {
          const qCurrent = mesh.current.quaternion;
          qCurrent.slerp(targetQuat, speed);
      } else {
          mesh.current.rotation.x += delta * 0.5;
          mesh.current.rotation.y += delta * 0.2;
      }
    }
  });

  return (
    <group ref={mesh} scale={isFormed ? 0.8 : 0.4}>
        {/* Photo */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>  {/* Explicitly set no rotation */}
            <planeGeometry args={[1.4, 1.9]} />
            <meshBasicMaterial 
              map={texture} 
              side={THREE.DoubleSide} 
              transparent 
              opacity={1.0} 
              toneMapped={false}
            />
        </mesh>
    </group>
  );
};

export const PhotoOrnaments = () => {
  // If no images, return null
  if (imageUrls.length === 0) return null;

  return (
    <group>
      {imageUrls.map((url, i) => (
        <PhotoFrame 
            key={url} 
            url={url} 
            index={i} 
            total={imageUrls.length} 
        />
      ))}
    </group>
  );
};
