import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import Foliage from './Foliage';
import { OrnamentsSystem } from './Ornaments';
import { PhotoOrnaments } from './PhotoOrnaments';
import MusicPlayer from './MusicPlayer';
import Star from './Star';
import Snow from './Snow';
import { useStore } from '../store';
import { Suspense, useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { isMobileDevice } from '../utils';

const ResponsiveCamera = () => {
  const { camera, size } = useThree();
  
  useEffect(() => {
    const isMobile = isMobileDevice();
    
    // Adjust camera position based on screen size
    if (isMobile) {
      camera.position.set(0, 4, 45); // Move further back on mobile
      camera.fov = 50; // Slightly increase FOV for mobile
    } else {
      camera.position.set(0, 4, 30);
      camera.fov = 45;
    }
    
    // Update camera projection matrix
    camera.updateProjectionMatrix();
  }, [camera, size]);

  return null;
};

const TreeContent = () => {
  const groupRef = useRef<THREE.Group>(null);
  const isMobile = useMemo(() => isMobileDevice(), []);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // 移动端降低旋转速度，减少性能消耗
      const rotationSpeed = isMobile ? 0.07 : 0.1;
      groupRef.current.rotation.y += delta * rotationSpeed;
    }
  });

  return (
    <group ref={groupRef} position={[0, -2, 0]}>
      <Foliage />
      <OrnamentsSystem />
      <Suspense fallback={null}>
        <PhotoOrnaments />
      </Suspense>
      <Star />
    </group>
  );
};

// WebGL检测组件
const WebGLChecker = () => {
  const [webGLAvailable, setWebGLAvailable] = useState(true);
  
  useEffect(() => {
    // 检查WebGL支持
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        const isSupported = !!gl;
        setWebGLAvailable(isSupported);
        
        if (!isSupported) {
          console.warn('WebGL is not supported on this device');
        }
      } catch (error) {
        console.error('WebGL check failed:', error);
        setWebGLAvailable(false);
      }
    };
    
    checkWebGL();
  }, []);
  
  if (!webGLAvailable) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-luxury-dark text-white">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold mb-4">🎄 圣诞树无法显示</h2>
          <p className="mb-4">您的设备或浏览器不支持WebGL，无法显示3D圣诞树。</p>
          <p className="text-sm opacity-80">
            请尝试：<br/>
            • 更新浏览器到最新版本<br/>
            • 启用硬件加速<br/>
            • 使用Chrome、Firefox或Safari浏览器
          </p>
        </div>
      </div>
    );
  }
  
  return null;
};

const Scene = () => {
  const { toggleFormed } = useStore();
  const isMobile = useMemo(() => isMobileDevice(), []);
  // Only consider it low-end if it's mobile AND screen height is very small (old phones)
  // But we still want Environment for lighting.
  const isLowEndDevice = isMobile && (typeof window !== 'undefined' && window.innerHeight < 600);

  // Handle multi-touch gestures globally
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // 3 fingers: Toggle Formed (Tree/Chaos)
      if (e.touches.length === 3) {
        e.preventDefault();
        e.stopPropagation(); // Prevent other handlers
        toggleFormed();
      }
      // 4 fingers: Toggle Fullscreen
      if (e.touches.length === 4) {
        e.preventDefault();
        e.stopPropagation();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch((err) => {
              console.warn(`Error attempting to enable fullscreen: ${err.message}`);
          });
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          }
        }
      }
    };

    // Use passive: false to allow preventDefault
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [toggleFormed]);

  return (
    <div 
        className="w-full h-full bg-luxury-dark"
        onContextMenu={(e) => {
            e.preventDefault();
            toggleFormed();
        }}
    >
      <WebGLChecker />
      <MusicPlayer />
      <Canvas
        camera={{ position: [0, 4, 30], fov: 45 }}
        gl={{
          antialias: !isMobile, // Mobile disable AA for performance
          toneMappingExposure: isMobile ? 2.0 : 1.0, // Boost exposure for mobile, normal for desktop
          powerPreference: isMobile ? 'low-power' : 'high-performance',
          // 移动设备WebGL兼容性设置
          alpha: true,
          premultipliedAlpha: false,
          stencil: false,
          depth: true,
          failIfMajorPerformanceCaveat: false // 允许在性能较差的设备上运行
        }}
        dpr={isMobile ? [1, 1.5] : [1, 2]} 
        shadows={!isMobile} // Disable shadows globally on mobile
        // 优化渲染设置
        renderer={{
          preserveDrawingBuffer: false, // 减少内存使用
          autoClear: true,
        }}
        // 添加WebGL错误处理
        onCreated={({ gl }) => {
          // 检查WebGL支持
          const canvas = gl.domElement;
          const isWebGLAvailable = !!window.WebGLRenderingContext;
          const isWebGL2Available = !!window.WebGL2RenderingContext;
          
          if (!isWebGLAvailable && !isWebGL2Available) {
            console.warn('WebGL not supported on this device');
          }
          
          // 设置WebGL上下文丢失处理
          canvas.addEventListener('webglcontextlost', (event) => {
            console.warn('WebGL context lost', event);
            event.preventDefault();
          }, false);
          
          canvas.addEventListener('webglcontextrestored', () => {
            console.log('WebGL context restored');
          }, false);
        }}
      >
        <ResponsiveCamera />
        <color attach="background" args={['#001a0f']} />
        
        {/* Lighting - Significantly boosted for mobile */}
        <ambientLight intensity={isMobile ? 1.5 : 0.3} />
        <spotLight 
          position={[10, 20, 10]} 
          angle={0.3} 
          penumbra={1} 
          intensity={isMobile ? 4.0 : 1.5} 
          castShadow={!isMobile} 
          shadow-mapSize={isMobile ? [512, 512] : [1024, 1024]} 
          color="#FFD700"
          // 移动端使用更远的阴影距离
          shadow-camera-near={1}
          shadow-camera-far={30}
        />
        {/* 移动端使用更强的绿色灯光，增强视觉效果 */}
        <pointLight position={[-10, 10, -10]} intensity={isMobile ? 2.0 : 1} color="#00ff00" />
        
        {/* Environment Reflection - Always enable for material reflections */}
        <Environment preset={isMobile ? "warehouse" : "lobby"} blur={isMobile ? 0.8 : 0.6} background={false} />

        {/* Content */}
        <TreeContent />
        <Snow />

        {/* Ground Shadows - 已关闭 */}
        {/* <ContactShadows 
          opacity={isMobile ? 0.4 : 0.6} 
          scale={50} 
          blur={2} 
          far={10} 
          resolution={isMobile ? 256 : 512} 
          color="#000000" 
        /> */}

        {/* Controls */}
        <OrbitControls 
          enablePan={false} 
          minPolarAngle={Math.PI / 4} 
          maxPolarAngle={Math.PI / 1.9}
          minDistance={10}
          maxDistance={50}
          enableDamping
          dampingFactor={0.05}
        />

        {/* Post Processing */}
        <EffectComposer enabled={!isMobile}>
          <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} radius={0.4} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default Scene;
