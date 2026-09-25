import { Suspense, useMemo, useRef, type RefObject } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

import { PointsEarth } from "./PointsEarth"
import { TexturedEarth } from "./TexturedEarth"
import { PodAndSat } from "./PodAndSat"
import { LineArtLink } from "./LineArtLink"
import { SceneErrorBoundary } from "./SceneErrorBoundary"
import {
  SceneProgressContext,
  type SceneProgress,
  ramp,
  SCENES,
} from "@/hooks/useScrollScene"
import { isMobileViewport, prefersReducedMotion } from "@/lib/gsap"
import { vec3ToLatLng } from "@/lib/landmask"

function Rig({ progressRef }: { progressRef: RefObject<SceneProgress> }) {
  const { camera, invalidate } = useThree()
  const target = useRef(new THREE.Vector3(0, 0, 0))

  useFrame(() => {
    if (!progressRef.current.visible) return
    const p = progressRef.current.current

    const dive = ramp(SCENES.dive.in[0], SCENES.dive.out[1], p)
    const deploy = ramp(SCENES.deployment.in[0], SCENES.deployment.out[1], p)

    const z = 4.0 - dive * 1.35 + deploy * 1.75
    const y = 0 + dive * 0.1 + deploy * 0.2
    const x = 0 + deploy * 0.3

    camera.position.lerp(new THREE.Vector3(x, y, z), 0.12)
    camera.lookAt(target.current)
    invalidate()
  })

  return null
}

function GlobeProbe({ progressRef }: { progressRef: RefObject<SceneProgress> }) {
  const { camera, raycaster, pointer } = useThree()
  const sphere = useMemo(() => new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1), [])
  const hit = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    if (!progressRef.current.visible) return
    if (progressRef.current.current > SCENES.deployment.in[0]) {
      if (typeof window !== "undefined") {
        window.__ssGlobeHit = null
      }
      return
    }
    raycaster.setFromCamera(pointer, camera)
    const p = raycaster.ray.intersectSphere(sphere, hit)
    if (typeof window !== "undefined") {
      window.__ssGlobeHit = p ? vec3ToLatLng(p.x, p.y, p.z) : null
    }
  })

  return null
}

export function HeroScene({
  progressRef,
  ready,
}: {
  progressRef: RefObject<SceneProgress>
  ready: boolean
}) {
  const reduced = useMemo(() => prefersReducedMotion(), [])
  const mobile = useMemo(() => isMobileViewport(), [])
  const pointCount = mobile ? 15000 : 40000

  const ctx = useMemo(() => ({ ref: progressRef }), [progressRef])

  return (
    <SceneProgressContext.Provider value={ctx}>
      <div className="absolute inset-0">
        <Canvas
          frameloop={ready ? "always" : "never"}
          dpr={[1, 2]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
          camera={{ position: [0, 0, 4], fov: 42, near: 0.1, far: 100 }}
          style={{ background: "transparent" }}
        >
          <Suspense fallback={null}>
            <Rig progressRef={progressRef} />
            <GlobeProbe progressRef={progressRef} />
            <PointsEarth pointCount={pointCount} />
            <SceneErrorBoundary label="TexturedEarth">
              <TexturedEarth />
            </SceneErrorBoundary>
            {!reduced && <PodAndSat />}
          </Suspense>
        </Canvas>

        <LineArtLink progressRef={progressRef} />
      </div>
    </SceneProgressContext.Provider>
  )
}

declare global {
  interface Window {
    __ssGlobeHit: { lat: number; lng: number } | null
  }
}
