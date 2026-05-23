import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const RADIUS = 2;

function latLonToVec3(lat: number, lon: number, r = RADIUS) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

function Atmosphere() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          uniform float uTime;
          void main() {
            float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
            vec3 col = mix(vec3(0.3, 0.6, 1.0), vec3(0.5, 0.8, 1.0), 0.5 + 0.5 * sin(uTime));
            gl_FragColor = vec4(col, 1.0) * intensity;
          }
        `,
      }),
    [],
  );
  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime * 0.5;
  });
  return (
    <mesh scale={1.18}>
      <sphereGeometry args={[RADIUS, 64, 64]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function Borders() {
  const [geo, setGeo] = useState<any>(null);
  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson",
    )
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => {});
  }, []);

  const lines = useMemo(() => {
    if (!geo) return [];
    const out: THREE.Vector3[][] = [];
    for (const f of geo.features) {
      const polys =
        f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const poly of polys) {
        for (const ring of poly) {
          const pts: THREE.Vector3[] = [];
          for (const [lon, lat] of ring) pts.push(latLonToVec3(lat, lon, RADIUS * 1.002));
          out.push(pts);
        }
      }
    }
    return out;
  }, [geo]);

  return (
    <group>
      {lines.map((pts, i) => {
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        return (
          <line key={i}>
            <primitive object={geom} attach="geometry" />
            <lineBasicMaterial color="#1e3a8a" transparent opacity={0.7} />
          </line>
        );
      })}
    </group>
  );
}

function Earth({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.0008;
  });
  return (
    <group>
      <mesh
        ref={ref}
        onPointerDown={(e) => {
          e.stopPropagation();
          const p = e.point.clone().normalize();
          const lat = 90 - (Math.acos(p.y) * 180) / Math.PI;
          const lon = ((Math.atan2(p.z, -p.x) * 180) / Math.PI) - 180;
          onPick(lat, ((lon + 540) % 360) - 180);
        }}
      >
        <sphereGeometry args={[RADIUS, 64, 64]} />
        <meshPhongMaterial color="#bfdbfe" emissive="#1e3a8a" emissiveIntensity={0.15} shininess={20} />
      </mesh>
      <Borders />
    </group>
  );
}

export function Globe({
  onPick,
  marker,
}: {
  onPick: (lat: number, lon: number) => void;
  marker?: { lat: number; lon: number } | null;
}) {
  const markerPos = marker ? latLonToVec3(marker.lat, marker.lon, RADIUS * 1.04) : null;
  return (
    <Canvas camera={{ position: [0, 0, 5.5], fov: 45 }} dpr={[1, 2]}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 3, 5]} intensity={1} />
      <Earth onPick={onPick} />
      <Atmosphere />
      {markerPos && (
        <mesh position={markerPos.toArray()}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      )}
      <OrbitControls enablePan={false} minDistance={3.5} maxDistance={10} rotateSpeed={0.5} />
    </Canvas>
  );
}
