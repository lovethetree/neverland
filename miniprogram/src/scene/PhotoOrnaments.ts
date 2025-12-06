import * as THREE from 'three-platformize';
import { randomPointInSphere, SPHERE_RADIUS, TREE_HEIGHT, TREE_RADIUS, isMobileDevice } from '../utils';
import images from '../assets/images';

export class PhotoOrnaments {
  group: THREE.Group;
  meshes: THREE.Mesh[] = [];
  
  // Animation data
  chaosPositions: THREE.Vector3[] = [];
  targetPositions: THREE.Vector3[] = [];
  galleryPositions: THREE.Vector3[] = [];
  
  // Orientation data (Quaternions)
  treeQuats: THREE.Quaternion[] = [];
  galleryQuats: THREE.Quaternion[] = [];
  
  currentPositions: THREE.Vector3[] = [];
  
  constructor() {
    this.group = new THREE.Group();
    this.init();
  }

  init() {
    const total = images.length;
    const loader = new THREE.TextureLoader();
    const isMobile = isMobileDevice();
    
    images.forEach((url, index) => {
      // 1. Load Texture
      const texture = loader.load(url, (tex) => {
         // Update aspect ratio once loaded
         if (tex.image) {
             const aspect = tex.image.width / tex.image.height;
             // Keep area roughly constant or fix width
             // Let's fix height to 1.5 and adjust width
             // Base height 2.0 from original
             const baseHeight = 2.0;
             const h = baseHeight;
             const w = baseHeight * aspect;
             
             this.meshes[index].scale.set(w, h, 1);
         }
      });
      texture.colorSpace = THREE.SRGBColorSpace; // Ensure correct color
      
      // 2. Create Mesh
      const geometry = new THREE.PlaneGeometry(1, 1); 
      const material = new THREE.MeshBasicMaterial({ 
        map: texture, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1.0,
        toneMapped: false
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // 3. Calculate Positions
      
      // Chaos Position
      const chaos = randomPointInSphere(SPHERE_RADIUS * 1.2);
      this.chaosPositions.push(chaos);
      
      // --- Target Position (Tree Mode) ---
      // Matches original: src/components/PhotoOrnaments.tsx
      const minY = -TREE_HEIGHT / 2 + 1.5; 
      const maxY = TREE_HEIGHT / 2 - 1.0;  
      const y = minY + (index / total) * (maxY - minY);
      
      const heightFromBase = y + TREE_HEIGHT / 2;
      const rBase = TREE_RADIUS * (1 - heightFromBase / TREE_HEIGHT);
      const r = rBase + 0.5; 
      
      const goldenAngle = Math.PI * (3 - Math.sqrt(5)); 
      const angleOffset = 1.0; 
      const theta = index * goldenAngle + angleOffset + (Math.random() - 0.5) * 0.5; 
      
      const jitterY = (Math.random() - 0.5) * 0.6; 
      const finalY = y + jitterY;

      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      
      const target = new THREE.Vector3(x, finalY, z);
      this.targetPositions.push(target);
      
      // --- Gallery Position (Gallery Mode) ---
      const radius = isMobile ? 22 : 18;
      const itemsPerRow = 12;
      const totalRows = Math.ceil(total / itemsPerRow);
      const row = Math.floor(index / itemsPerRow);
      const indexInRow = index % itemsPerRow;
      
      const angleStep = (Math.PI * 2) / itemsPerRow;
      const rowOffset = (row % 2) * (angleStep / 2);
      const thetaCarousel = indexInRow * angleStep + rowOffset;
      
      const rowHeight = 3.5;
      const gy = (row - (totalRows - 1) / 2) * rowHeight + 4;
      const gx = radius * Math.sin(thetaCarousel);
      const gz = radius * Math.cos(thetaCarousel);
      
      const gallery = new THREE.Vector3(gx, gy, gz);
      this.galleryPositions.push(gallery);
      
      // --- Calculate Orientations (Quaternions) ---
      
      // 1. Tree Orientation
      const dummy = new THREE.Object3D();
      dummy.position.copy(target);
      dummy.lookAt(0, target.y, 0); 
      dummy.rotateY(Math.PI); // Face outward
      
      const slopeAngle = Math.atan2(TREE_RADIUS, TREE_HEIGHT);
      const consistentTilt = -slopeAngle * 1.8; 
      dummy.rotateX(consistentTilt);
      
      const tQuat = new THREE.Quaternion().setFromEuler(dummy.rotation);
      this.treeQuats.push(tQuat);

      // 2. Gallery Orientation
      const dummy2 = new THREE.Object3D();
      dummy2.position.copy(gallery);
      dummy2.lookAt(0, gallery.y, 0);
      dummy2.rotateY(Math.PI); // Face outward
      
      const gQuat = new THREE.Quaternion().setFromEuler(dummy2.rotation);
      this.galleryQuats.push(gQuat);

      // Init Position
      mesh.position.copy(chaos);
      this.currentPositions.push(chaos.clone());
      
      this.group.add(mesh);
      this.meshes.push(mesh);
    });
  }
  
  update(delta: number, isFormed: boolean, time: number) {
    const baseSpeed = 2.0; // Matches original speed = 2.0 * delta
    const lerpFactor = THREE.MathUtils.clamp(baseSpeed * delta, 0, 1);
    
    this.meshes.forEach((mesh, i) => {
        const currentPos = this.currentPositions[i];
        const targetPos = isFormed ? this.targetPositions[i] : this.galleryPositions[i];
        const targetQuat = isFormed ? this.treeQuats[i] : this.galleryQuats[i];

        // Lerp Position
        currentPos.lerp(targetPos, lerpFactor);
        mesh.position.copy(currentPos);

        // Slerp Quaternion
        mesh.quaternion.slerp(targetQuat, lerpFactor);
    });
  }
}
