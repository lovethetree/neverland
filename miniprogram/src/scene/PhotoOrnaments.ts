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
             const h = 1.5;
             const w = h * aspect;
             mesh.scale.set(w, h, 1);
         }
      });
      texture.colorSpace = THREE.SRGBColorSpace; // Ensure correct color
      
      // 2. Create Mesh
      const geometry = new THREE.PlaneGeometry(1, 1); 
      const material = new THREE.MeshBasicMaterial({ 
        map: texture, 
        side: THREE.DoubleSide,
        transparent: true
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // 3. Calculate Positions
      
      // Chaos Position
      const chaos = randomPointInSphere(SPHERE_RADIUS * 1.2);
      this.chaosPositions.push(chaos);
      
      // Target Position (Tree)
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
      // Look at center (y-axis), but we handle rotation in update
      this.targetPositions.push(target);
      
      // Gallery Position (Carousel)
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
      
      // Init Position
      mesh.position.copy(chaos);
      this.currentPositions.push(chaos.clone());
      
      this.group.add(mesh);
      this.meshes.push(mesh);
    });
  }
  
  update(delta: number, isFormed: boolean, time: number) {
    const baseSpeed = 2.5;
    const lerpFactor = THREE.MathUtils.clamp(baseSpeed * delta, 0, 1);
    
    this.meshes.forEach((mesh, i) => {
        const targetPos = isFormed ? this.targetPositions[i] : this.galleryPositions[i];
        const currentPos = this.currentPositions[i];
        
        // Lerp Position
        currentPos.lerp(targetPos, lerpFactor);
        mesh.position.copy(currentPos);
        
        // Orientation
        if (isFormed) {
            // Face outwards from center Y axis
            mesh.lookAt(0, mesh.position.y, 0);
            // Rotate 180 if needed? Plane usually faces +Z. 
            // If we lookAt(0,y,0), +Z points to center. So back of plane faces out.
            // We need to rotate Y by PI.
            mesh.rotateY(Math.PI);
            
            // Add some gentle floating
            mesh.position.y += Math.sin(time + i) * 0.002;
        } else {
            // Gallery Mode: Face Center
            mesh.lookAt(0, mesh.position.y, 0);
            mesh.rotateY(Math.PI);
            
            // Rotate carousel
            const radius = Math.sqrt(mesh.position.x**2 + mesh.position.z**2);
            const angle = Math.atan2(mesh.position.x, mesh.position.z) + delta * 0.1; // Slow rotation
            
            // Wait, we shouldn't modify position manually for rotation if we want to lerp to galleryPos.
            // Actually, galleryPos is static. If we want the carousel to spin, galleryPos needs to rotate.
            // Or simply rotate the whole group? No, chaos pos is separate.
            
            // Let's just stick to static gallery position for now to match logic, 
            // or rotate the target gallery position.
            const cos = Math.cos(time * 0.1);
            const sin = Math.sin(time * 0.1);
            
            // Rotate galleryPos[i] around Y
            const gPos = this.galleryPositions[i];
            const rx = gPos.x * cos - gPos.z * sin;
            const rz = gPos.x * sin + gPos.z * cos;
            
            // Override target for Lerp
            const rotTarget = new THREE.Vector3(rx, gPos.y, rz);
            
            // Re-lerp with rotating target
            currentPos.lerp(rotTarget, lerpFactor);
            mesh.position.copy(currentPos);
            
            mesh.lookAt(0, mesh.position.y, 0);
            mesh.rotateY(Math.PI);
        }
    });
  }
}
