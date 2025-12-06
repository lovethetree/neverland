import * as THREE from 'three-platformize';
import { OrbitControls } from 'three-platformize/examples/jsm/controls/OrbitControls';
import { Foliage } from './Foliage';
import { OrnamentsSystem } from './Ornaments';
import { Star } from './Star';
import { Snow } from './Snow';
import { useStore } from '../store';

export class ChristmasTreeScene {
  canvas: any;
  width: number;
  height: number;
  
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  
  foliage: Foliage;
  ornaments: OrnamentsSystem;
  star: Star;
  snow: Snow;
  
  clock: THREE.Clock;
  treeGroup: THREE.Group;
  
  animationId: number;
  disposed = false;
  unsubscribeStore: () => void;

  constructor(canvas: any, width: number, height: number) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    
    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: false, // Mobile optimization
      alpha: true,
      logarithmicDepthBuffer: false // Mobile optimization
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(2, canvas._pixelRatio || 1.5)); 
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5; // Boost for mobile

    // 2. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x001a0f, 0.02); // Match background
    this.scene.background = new THREE.Color(0x001a0f);

    // 3. Camera
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    this.camera.position.set(0, 4, 45); 
    
    // 4. Controls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 60;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.2;

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    this.scene.add(ambientLight);
    
    const spotLight = new THREE.SpotLight(0xffd700, 4.0);
    spotLight.position.set(10, 20, 10);
    spotLight.angle = 0.3;
    spotLight.penumbra = 1;
    spotLight.castShadow = false; // Mobile optimization
    this.scene.add(spotLight);

    const greenLight = new THREE.PointLight(0x00ff00, 2.0);
    greenLight.position.set(-10, 10, -10);
    this.scene.add(greenLight);

    // 6. Components
    this.treeGroup = new THREE.Group();
    this.treeGroup.position.y = -2;
    this.scene.add(this.treeGroup);

    // Foliage
    this.foliage = new Foliage(this.renderer.getPixelRatio());
    this.treeGroup.add(this.foliage.mesh);
    
    // Ornaments
    this.ornaments = new OrnamentsSystem();
    this.treeGroup.add(this.ornaments.group);
    
    // Star
    this.star = new Star();
    this.treeGroup.add(this.star.group);
    
    // Snow
    this.snow = new Snow();
    this.scene.add(this.snow.mesh);
    
    // 7. Clock
    this.clock = new THREE.Clock();

    // 8. Subscribe to Store
    this.unsubscribeStore = useStore.subscribe((state) => {
      // React to state changes if needed outside of loop
      // But we mostly pull state in loop
    });

    // Start loop
    this.tick = this.tick.bind(this);
    this.tick();
  }

  tick() {
    if (this.disposed) return;

    this.canvas.requestAnimationFrame(this.tick);

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();
    const isFormed = useStore.getState().isFormed;

    // Update Controls
    this.controls.update();

    // Update Components
    this.foliage.update(delta, isFormed, time);
    this.ornaments.update(delta, isFormed, time);
    this.star.update(delta, isFormed);
    this.snow.update(time);

    // Rotate Tree Group
    let rotationSpeed = 0.07;
    if (!isFormed) {
        rotationSpeed = rotationSpeed * 0.3;
    }
    this.treeGroup.rotation.y += delta * rotationSpeed;

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this.unsubscribeStore();
    this.renderer.dispose();
    this.controls.dispose();
    // Dispose geometries/materials...
  }
}
