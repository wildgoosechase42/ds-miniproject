import { useEffect, useMemo, useRef } from "react"
import { useFrame, useLoader } from "@react-three/fiber"
import * as THREE from "three"

import { SCENES, sceneOpacity, ramp, useSceneProgress } from "@/hooks/useScrollScene"

const EARTH_VERT = `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const EARTH_FRAG = `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D cloudMap;
  uniform vec3  sunDirection;
  uniform float opacity;
  uniform float cloudStrength;
  uniform float cloudOffset;
  uniform vec3  rimColor;

  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    vec3 day   = texture2D(dayMap,   vUv).rgb;
    vec3 night = texture2D(nightMap, vUv).rgb;

    float lambert = dot(normalize(vNormalW), normalize(sunDirection));
    float dayMix  = smoothstep(-0.18, 0.28, lambert);

    vec3 lights = night * 1.5;
    vec3 color  = mix(lights, day * 1.02, dayMix);

    color = mix(color, color * vec3(0.82, 0.90, 1.12), 0.35);

    float cloud = texture2D(cloudMap, vec2(vUv.x + cloudOffset, vUv.y)).r;
    color = mix(color, vec3(1.0) * max(dayMix, 0.06), cloud * cloudStrength);

    float fres = 1.0 - max(dot(normalize(vNormalW), normalize(vViewDir)), 0.0);
    fres = pow(fres, 2.6);
    color += rimColor * fres * 1.35;

    gl_FragColor = vec4(color, opacity);
  }
`

export function TexturedEarth() {
  const group = useRef<THREE.Group>(null)
  const mesh = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const { ref: progressRef } = useSceneProgress()

  const [dayMap, nightMap] = useLoader(THREE.TextureLoader, [
    "/assets/textures/earth_day.jpg",
    "/assets/textures/earth_night.jpg",
  ])

  useEffect(() => {
    let alive = true
    new THREE.TextureLoader().load(
      "/assets/textures/earth_clouds.jpg",
      (tex) => {
        if (!alive) return
        tex.wrapS = THREE.RepeatWrapping
        tex.colorSpace = THREE.NoColorSpace
        const u = matRef.current?.uniforms
        if (u) {
          u.cloudMap.value = tex
          u.cloudStrength.value = 0.55
        }
      },
      undefined,
      () => {}
    )
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    for (const t of [dayMap, nightMap]) {
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 4
      t.needsUpdate = true
    }
  }, [dayMap, nightMap])

  const uniforms = useMemo(
    () => ({
      dayMap: { value: dayMap },
      nightMap: { value: nightMap },
      cloudMap: { value: null as THREE.Texture | null },
      sunDirection: { value: new THREE.Vector3(1, 0.25, 0.6).normalize() },
      opacity: { value: 0 },
      cloudStrength: { value: 0 },
      cloudOffset: { value: 0 },
      rimColor: { value: new THREE.Color("#3d6bff") },
    }),
    [dayMap, nightMap]
  )

  useFrame(() => {
    const p = progressRef.current.current
    const o = sceneOpacity(SCENES.dive, p)

    if (matRef.current) {
      matRef.current.uniforms.opacity.value = o
      matRef.current.uniforms.cloudOffset.value += 0.00002
    }
    if (glowRef.current) {
      const m = glowRef.current.material as THREE.MeshBasicMaterial
      m.opacity = o * 0.16
    }

    if (group.current) {
      group.current.visible = o > 0.001
      const t = ramp(SCENES.dive.in[0], SCENES.dive.out[1], p)
      group.current.rotation.y = 2.35 + t * 0.58
      group.current.rotation.x = 0.06 + t * 0.26
      const s = 1.0 + t * 0.24
      group.current.scale.setScalar(s)
      group.current.position.y = -t * 0.3
    }
  })

  return (
    <group ref={group}>
      <mesh ref={mesh}>
        <sphereGeometry args={[1, 96, 96]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={EARTH_VERT}
          fragmentShader={EARTH_FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
        />
      </mesh>

      <mesh ref={glowRef} scale={1.055}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial
          color="#3d6bff"
          transparent
          opacity={0}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
