import { createContext, useContext, type RefObject } from "react"

export interface SceneProgress {
  current: number
  visible: boolean
}

export const SceneProgressContext = createContext<{ ref: RefObject<SceneProgress> }>({
  ref: { current: { current: 0, visible: true } },
})

export function useSceneProgress() {
  return useContext(SceneProgressContext)
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0 || 1e-6)))
  return t * t * (3 - 2 * t)
}

export function ramp(edge0: number, edge1: number, x: number): number {
  return Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0 || 1e-6)))
}

export const SCENES = {
  constellation: { in: [-0.05, 0.0], out: [0.2, 0.3] },
  dive: { in: [0.2, 0.3], out: [0.46, 0.55] },
  deployment: { in: [0.46, 0.55], out: [0.7, 0.78] },
  link: { in: [0.7, 0.78], out: [0.99, 1.0] },
} as const

export function sceneOpacity(
  window: { in: readonly [number, number] | number[]; out: readonly [number, number] | number[] },
  p: number
): number {
  const fadeIn = smoothstep(window.in[0], window.in[1], p)
  const fadeOut = 1 - smoothstep(window.out[0], window.out[1], p)
  return Math.min(fadeIn, fadeOut)
}
