import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { randomPointInSphere, TREE_HEIGHT, SPHERE_RADIUS } from '../utils';

const Star = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowMeshRef = useRef<THREE.Mesh>(null);
  const isFormed = useStore((state) => state.isFormed);
  
  // 五角星的尺寸和位置
  const starSize = 1.0; // 减小五角星大小
  // const treeHeight = 12; // REMOVED: Use imported TREE_HEIGHT
  // const sphereRadius = 25; // REMOVED: Use imported SPHERE_RADIUS
  
  // 生成随机位置用于散开状态
  const chaosPos = useMemo(() => randomPointInSphere(SPHERE_RADIUS * 0.8), []);
  const targetPos = useMemo(() => new THREE.Vector3(0, TREE_HEIGHT / 2 + 0.3, 0), []);
  
  // 当前位置和缩放
  const currentPos = useRef(chaosPos.clone());
  const currentScale = useRef(new THREE.Vector3(0.3, 0.3, 0.3)); // 初始小尺寸
  
  // 创建五角星形状
  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const spikes = 5;
    const outerRadius = starSize;
    const innerRadius = starSize * 0.5;
    
    let rot = Math.PI / 2 * 3;
    let x = 0;
    let y = 0;
    const step = Math.PI / spikes;
    
    // 绘制五角星轮廓
    for (let i = 0; i < spikes; i++) {
      x = outerRadius * Math.cos(rot);
      y = outerRadius * Math.sin(rot);
      
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
      
      rot += step;
      
      x = innerRadius * Math.cos(rot);
      y = innerRadius * Math.sin(rot);
      shape.lineTo(x, y);
      
      rot += step;
    }
    
    // 闭合路径
    shape.lineTo(outerRadius * Math.cos(Math.PI / 2 * 3), outerRadius * Math.sin(Math.PI / 2 * 3));
    
    return shape;
  }, [starSize]);
  
  // 创建3D几何体
  const geometry = useMemo(() => {
    const extrudeSettings = {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelOffset: 0,
      bevelSegments: 4
    };
    
    return new THREE.ExtrudeGeometry(starShape, extrudeSettings);
  }, [starShape]);
  
  // 创建发光材质
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0xFFFF00, // 金色
      emissive: 0xFFFF88, // 发光颜色
      emissiveIntensity: 0.8,
      metalness: 0.8,
      roughness: 0.2,
      toneMapped: false
    });
  }, []);
  
  // 动画效果
  useFrame((_, delta) => {
    if (meshRef.current && glowMeshRef.current) {
      // 设置与树相同的旋转速度（0.1弧度/秒）
      meshRef.current.rotation.y += delta * 0.1;
      glowMeshRef.current.rotation.y += delta * 0.1;
      
      if (isFormed) {
        // 当树形成时，移动到树顶并放大
        currentPos.current.lerp(targetPos, delta * 2.0);
        currentScale.current.lerp(new THREE.Vector3(1, 1, 1), delta * 2.0);
        
        // 添加轻微的上下浮动效果
        const yOffset = Math.sin(Date.now() * 0.002) * 0.1;
        currentPos.current.y = targetPos.y + yOffset;
      } else {
        // 当树散开时，移动到随机位置并缩小
        currentPos.current.lerp(chaosPos, delta * 2.0);
        currentScale.current.lerp(new THREE.Vector3(0.3, 0.3, 0.3), delta * 2.0);
        
        // 添加随机飘动效果
        currentPos.current.x += Math.sin(Date.now() * 0.003) * 0.01;
        currentPos.current.z += Math.cos(Date.now() * 0.003) * 0.01;
      }
      
      // 更新位置和缩放
      meshRef.current.position.copy(currentPos.current);
      meshRef.current.scale.copy(currentScale.current);
      glowMeshRef.current.position.copy(currentPos.current);
      glowMeshRef.current.scale.copy(currentScale.current);
    }
  });
  
  return (
    <>
      <mesh 
        ref={meshRef} 
        geometry={geometry} 
        material={material}
        position={chaosPos}
        scale={0.3}
        castShadow
      />
      {/* 添加额外的发光效果 */}
      <mesh 
        ref={glowMeshRef}
        geometry={geometry} 
        position={chaosPos}
        scale={0.3}
      >
        <meshBasicMaterial 
          color={0xFFFFFF} 
          transparent 
          opacity={0.3}
          toneMapped={false}
        />
      </mesh>
    </>
  );
};

export default Star;