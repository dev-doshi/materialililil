"use client";

import React, { useMemo, useRef, useEffect, useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { useAppStore } from "@/store/appStore";
import { MapType } from "@/types/maps";
import * as THREE from "three";

function useDataUrlTexture(dataUrl: string | null, fallbackColor: [number, number, number] = [255, 255, 255]) {
  const [texture, setTexture] = useState<THREE.Texture>(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = `rgb(${fallbackColor[0]},${fallbackColor[1]},${fallbackColor[2]})`;
    ctx.fillRect(0, 0, 1, 1);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  });

  // Track the current texture for proper disposal on unmount
  const textureRef = useRef(texture);
  textureRef.current = texture;

  useEffect(() => {
    if (!dataUrl) return;

    const img = new Image();
    img.onload = () => {
      const tex = new THREE.Texture(img);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.needsUpdate = true;
      setTexture((prev) => {
        prev.dispose();
        return tex;
      });
    };
    img.src = dataUrl;

    return () => {
      img.onload = null;
    };
  }, [dataUrl]);

  // Dispose latest texture on unmount
  useEffect(() => {
    return () => {
      textureRef.current.dispose();
    };
  }, []);

  return texture;
}

function PBRMesh({ meshType, displacementScale, normalIntensity, tileRepeat }: {
  meshType: string;
  displacementScale: number;
  normalIntensity: number;
  tileRepeat: number;
}) {
  const maps = useAppStore((s) => s.maps);
  const meshRef = useRef<THREE.Mesh>(null);

  const diffuseTex = useDataUrlTexture(maps[MapType.Diffuse]?.dataUrl ?? null);
  const normalTex = useDataUrlTexture(maps[MapType.Normal]?.dataUrl ?? null, [128, 128, 255]);
  const heightTex = useDataUrlTexture(maps[MapType.Height]?.dataUrl ?? null, [128, 128, 128]);
  const roughnessTex = useDataUrlTexture(maps[MapType.Roughness]?.dataUrl ?? null, [200, 200, 200]);
  const metallicTex = useDataUrlTexture(maps[MapType.Metallic]?.dataUrl ?? null, [0, 0, 0]);
  const aoTex = useDataUrlTexture(maps[MapType.AO]?.dataUrl ?? null);

  // Tag diffuse texture as sRGB so Three.js handles gamma correctly
  useEffect(() => {
    if (diffuseTex) diffuseTex.colorSpace = THREE.SRGBColorSpace;
  }, [diffuseTex]);

  // Apply tiling repeat
  useEffect(() => {
    [diffuseTex, normalTex, heightTex, roughnessTex, metallicTex, aoTex].forEach((tex) => {
      if (tex) {
        tex.repeat.set(tileRepeat, tileRepeat);
        tex.needsUpdate = true;
      }
    });
  }, [tileRepeat, diffuseTex, normalTex, heightTex, roughnessTex, metallicTex, aoTex]);

  // No auto-rotation — user controls camera via OrbitControls

  const geometry = useMemo(() => {
    switch (meshType) {
      case "sphere":
        return <sphereGeometry args={[1.5, 128, 128]} />;
      case "cube":
        return <boxGeometry args={[2, 2, 2, 64, 64, 64]} />;
      case "cylinder":
        return <cylinderGeometry args={[1, 1, 2.5, 64, 64]} />;
      default:
        return <planeGeometry args={[3, 3, 128, 128]} />;
    }
  }, [meshType]);

  const normalScaleVec = useMemo(() => new THREE.Vector2(normalIntensity, normalIntensity), [normalIntensity]);

  return (
    <mesh ref={meshRef}>
      {geometry}
      <meshStandardMaterial
        map={diffuseTex}
        normalMap={normalTex}
        displacementMap={heightTex}
        roughnessMap={roughnessTex}
        roughness={1.0}
        metalnessMap={metallicTex}
        metalness={1.0}
        aoMap={aoTex}
        aoMapIntensity={1.0}
        displacementScale={displacementScale}
        normalScale={normalScaleVec}
        side={THREE.DoubleSide}
        envMapIntensity={1.0}
        flatShading={false}
      />
    </mesh>
  );
}

function Scene({ meshType, envPreset, displacementScale, normalIntensity, tileRepeat }: {
  meshType: string;
  envPreset: string;
  displacementScale: number;
  normalIntensity: number;
  tileRepeat: number;
}) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} castShadow />
      <directionalLight position={[-3, 3, -3]} intensity={0.5} />
      <pointLight position={[0, 5, 0]} intensity={0.4} />
      <PBRMesh
        meshType={meshType}
        displacementScale={displacementScale}
        normalIntensity={normalIntensity}
        tileRepeat={tileRepeat}
      />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={20}
        enablePan
      />
      <Environment preset={envPreset as "studio" | "city" | "sunset" | "dawn" | "night" | "warehouse" | "forest" | "apartment" | "lobby" | "park"} background={false} />
    </>
  );
}

const ENV_PRESETS = [
  { id: "studio", label: "Studio" },
  { id: "city", label: "City" },
  { id: "sunset", label: "Sunset" },
  { id: "dawn", label: "Dawn" },
  { id: "night", label: "Night" },
  { id: "warehouse", label: "Warehouse" },
  { id: "forest", label: "Forest" },
  { id: "apartment", label: "Apartment" },
  { id: "lobby", label: "Lobby" },
  { id: "park", label: "Park" },
];

export default function Viewport3D() {
  const [meshType, setMeshType] = useState("plane");
  const [envPreset, setEnvPreset] = useState("warehouse");
  const [displacementScale, setDisplacementScale] = useState(0.08);
  const [normalIntensity, setNormalIntensity] = useState(1.5);
  const [tileRepeat, setTileRepeat] = useState(2);
  const [showControls, setShowControls] = useState(true);

  return (
    <div className="relative w-full h-full bg-zinc-950">
      <Canvas
        camera={{ position: [0, 2, 4], fov: 40 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        className="w-full h-full"
        shadows
      >
        <Suspense fallback={null}>
          <Scene
            meshType={meshType}
            envPreset={envPreset}
            displacementScale={displacementScale}
            normalIntensity={normalIntensity}
            tileRepeat={tileRepeat}
          />
        </Suspense>
      </Canvas>

      {/* Mesh type selector */}
      <div className="absolute top-3 left-3 flex items-center gap-1 bg-zinc-900/90 backdrop-blur-md rounded-lg border border-zinc-700/60 p-1 shadow-xl">
        {[
          { type: "plane", label: "Plane" },
          { type: "sphere", label: "Sphere" },
          { type: "cube", label: "Cube" },
          { type: "cylinder", label: "Cylinder" },
        ].map(({ type, label }) => (
          <button
            key={type}
            onClick={() => setMeshType(type)}
            className={`px-3 py-1.5 text-[11px] rounded-md transition-colors font-medium ${
              meshType === type
                ? "bg-amber-500 text-black shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Right side controls panel */}
      <div className="absolute top-3 right-3 flex flex-col gap-2">
        <button
          onClick={() => setShowControls(!showControls)}
          className="self-end px-2.5 py-1 text-[10px] rounded-md bg-zinc-900/90 backdrop-blur-md border border-zinc-700/60 text-zinc-400 hover:text-zinc-200 shadow-xl font-medium"
        >
          {showControls ? "Hide Controls" : "Show Controls"}
        </button>

        {showControls && (
          <div className="bg-zinc-900/90 backdrop-blur-md rounded-lg border border-zinc-700/60 p-3 shadow-xl w-52 space-y-3">
            {/* Environment */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Environment</label>
              <p className="text-[9px] text-zinc-600 -mt-0.5">Changes the lighting around your material</p>
              <select
                value={envPreset}
                onChange={(e) => setEnvPreset(e.target.value)}
                className="w-full text-[11px] bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300"
              >
                {ENV_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Displacement */}
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <label className="text-[10px] text-zinc-500">Displacement</label>
                <span className="text-[10px] text-zinc-600 font-mono" title="How much the surface pushes outward based on the height map">{displacementScale.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={displacementScale}
                onChange={(e) => setDisplacementScale(parseFloat(e.target.value))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer bg-zinc-700/60"
              />
            </div>

            {/* Normal Intensity */}
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <label className="text-[10px] text-zinc-500">Normal Strength</label>
                <span className="text-[10px] text-zinc-600 font-mono" title="How pronounced the surface details appear in lighting">{normalIntensity.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={5}
                step={0.1}
                value={normalIntensity}
                onChange={(e) => setNormalIntensity(parseFloat(e.target.value))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer bg-zinc-700/60"
              />
            </div>

            {/* Tile Repeat */}
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <label className="text-[10px] text-zinc-500">Tile Repeat</label>
                <span className="text-[10px] text-zinc-600 font-mono" title="How many times the texture tiles across the surface">{tileRepeat}x</span>
              </div>
              <input
                type="range"
                min={1}
                max={8}
                step={1}
                value={tileRepeat}
                onChange={(e) => setTileRepeat(parseInt(e.target.value))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer bg-zinc-700/60"
              />
            </div>
          </div>
        )}
      </div>

      {/* Label */}
      <div className="absolute bottom-3 left-3 bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-700/60 shadow-xl">
        <span className="text-[11px] text-zinc-400">3D Material Preview — Drag to rotate • Scroll to zoom • Shift+drag to pan</span>
        <p className="text-[10px] text-zinc-600 mt-0.5">Shows how your texture maps look on a real 3D surface</p>
      </div>
    </div>
  );
}
