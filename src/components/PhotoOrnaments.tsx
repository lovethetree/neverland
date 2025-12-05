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
  const { chaosPos, targetPos, galleryPos } = useMemo(() => {
    // Chaos: Random in sphere (Keep for initial position or other effects if needed, 
    // but we will use galleryPos for !isFormed)
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
    
    // Gallery Position (Carousel/Cylinder Layout) for Chaos Mode
    // Create a multi-tiered cylinder "carousel" effect
    const isMobile = isMobileDevice();
    const radius = isMobile ? 22 : 18; // Radius of the carousel
    
    // Distribute across rows to avoid overcrowding
    // Base rows on total count. ~10-12 items per row is good.
    const itemsPerRow = 12;
    const totalRows = Math.ceil(total / itemsPerRow);
    
    const row = Math.floor(index / itemsPerRow);
    const indexInRow = index % itemsPerRow;
    
    // Calculate angle: distribute evenly around the circle
    // Offset odd rows slightly for a brick-pattern look
    const angleStep = (Math.PI * 2) / itemsPerRow;
    const rowOffset = (row % 2) * (angleStep / 2);
    const thetaCarousel = indexInRow * angleStep + rowOffset;
    
    const rowHeight = 3.5;
    // Center vertically around camera height (approx y=4)
    const gy = (row - (totalRows - 1) / 2) * rowHeight + 4;
    
    const gx = radius * Math.sin(thetaCarousel);
    const gz = radius * Math.cos(thetaCarousel);
    
    const gallery = new THREE.Vector3(gx, gy, gz);

    return { chaosPos: chaos, targetPos: target, galleryPos: gallery };
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

  // Calculate aspect ratio and size
  const { width, height } = useMemo(() => {
      const img = texture.image;
      const aspect = img ? img.width / img.height : 1;
      
      // Fix size logic: 
      // Keep roughly same area but respect aspect ratio
      // Base height 2.0
      const baseHeight = 2.0;
      const w = baseHeight * aspect;
      const h = baseHeight;
      
      return { width: w, height: h };
  }, [texture.image]);

  useFrame((_, delta) => {
    if (mesh.current) {
      // Calculate base speed
      const baseSpeed = 0.5 * delta;
      
      // If formed -> go to tree target. If not formed -> go to gallery grid.
      const target = isFormed ? targetPos : galleryPos;
      
      // Lerp Position
      currentPos.current.lerp(target, baseSpeed);
      mesh.current.position.copy(currentPos.current);
      
      // Rotation: 
      // Formed: leaf-like orientation
      // Chaos (Gallery): Face camera (0,0,0) or look at camera position
      if (isFormed) {
          const qCurrent = mesh.current.quaternion;
          qCurrent.slerp(targetQuat, baseSpeed);
      } else {
          // Smoothly rotate to face OUTWARD from the center
          // Center is (0, y, 0)
          const qCurrent = mesh.current.quaternion;
          
          // Calculate distance from center (0, y, 0)
          const centerY = mesh.current.position.y;
          const distanceFromCenter = Math.sqrt(
              mesh.current.position.x ** 2 + 
              (mesh.current.position.z) ** 2
          );
          
          // Base radius in formed mode (average of tree radius)
          const baseRadius = 3.5; // Average radius of the tree in formed mode
          
          // Calculate adjusted speed: inverse proportional to distance for same visual speed
          const adjustedSpeed = baseSpeed * (baseRadius / distanceFromCenter);
          
          const dummy = new THREE.Object3D();
          dummy.position.copy(mesh.current.position);
          dummy.lookAt(0, centerY, 0); 
          dummy.rotateY(Math.PI); // Face outward (away from center) so camera looking from outside sees front
          
          const targetQ = new THREE.Quaternion().setFromEuler(dummy.rotation);
          qCurrent.slerp(targetQ, adjustedSpeed);
      }
    }
  });

  return (
    <group ref={mesh} scale={isFormed ? 0.8 : 1.0}>
        {/* Photo */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>  {/* Explicitly set no rotation */}
            <planeGeometry args={[width, height]} />
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



