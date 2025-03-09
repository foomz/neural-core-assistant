import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Torus, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { Mesh, Points as ThreePoints } from 'three';

function generateParticles(count: number) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 2 + Math.random() * 2;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  return positions;
}

export function AIAssistant() {
  const headRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);
  const particlesRef = useRef<ThreePoints>(null);
  const orb1Ref = useRef<Mesh>(null);
  const orb2Ref = useRef<Mesh>(null);
  const orb3Ref = useRef<Mesh>(null);

  const particles = generateParticles(2000);
  
  useFrame((state, delta) => {
    if (!headRef.current || !ringRef.current || !particlesRef.current || 
        !orb1Ref.current || !orb2Ref.current || !orb3Ref.current) return;
    
    // Head animation
    headRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
    const mouseX = (state.mouse.x * Math.PI) / 10;
    const mouseY = (state.mouse.y * Math.PI) / 10;
    headRef.current.rotation.x = mouseY;
    headRef.current.rotation.y = mouseX;
    
    // Ring animations
    ringRef.current.rotation.z += delta * 0.5;
    
    // Particle system rotation
    particlesRef.current.rotation.y += delta * 0.1;
    
    // Orbiting spheres
    const time = state.clock.elapsedTime;
    orb1Ref.current.position.x = Math.cos(time * 0.8) * 2;
    orb1Ref.current.position.z = Math.sin(time * 0.8) * 2;
    
    orb2Ref.current.position.x = Math.cos(time * 0.6 + 2) * 2.5;
    orb2Ref.current.position.z = Math.sin(time * 0.6 + 2) * 2.5;
    
    orb3Ref.current.position.x = Math.cos(time * 0.4 + 4) * 3;
    orb3Ref.current.position.z = Math.sin(time * 0.4 + 4) * 3;
  });

  return (
    <group>
      {/* Main head sphere */}
      <Sphere ref={headRef} args={[1, 64, 64]}>
        <meshStandardMaterial
          color="#4F46E5"
          metalness={0.9}
          roughness={0.1}
          emissive="#2563EB"
          emissiveIntensity={0.4}
        />
      </Sphere>

      {/* Primary ring */}
      <Torus
        ref={ringRef}
        args={[1.5, 0.08, 32, 100]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial
          color="#60A5FA"
          metalness={0.9}
          roughness={0.1}
          emissive="#3B82F6"
          emissiveIntensity={0.6}
        />
      </Torus>

      {/* Particle system */}
      <Points
        ref={particlesRef}
        positions={particles}
        stride={3}
        frustumCulled={false}
      >
        <PointMaterial
          transparent
          color="#60A5FA"
          size={0.02}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>

      {/* Orbiting spheres */}
      <Sphere ref={orb1Ref} args={[0.15, 32, 32]} position={[2, 0, 0]}>
        <meshStandardMaterial
          color="#F472B6"
          emissive="#EC4899"
          emissiveIntensity={0.8}
          metalness={1}
          roughness={0.1}
        />
      </Sphere>

      <Sphere ref={orb2Ref} args={[0.12, 32, 32]} position={[-2, 0.5, 0]}>
        <meshStandardMaterial
          color="#34D399"
          emissive="#10B981"
          emissiveIntensity={0.8}
          metalness={1}
          roughness={0.1}
        />
      </Sphere>

      <Sphere ref={orb3Ref} args={[0.1, 32, 32]} position={[0, -0.5, 2]}>
        <meshStandardMaterial
          color="#A78BFA"
          emissive="#8B5CF6"
          emissiveIntensity={0.8}
          metalness={1}
          roughness={0.1}
        />
      </Sphere>
    </group>
  );
}