import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SplitText } from "gsap/SplitText"
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin"
import { MotionPathPlugin } from "gsap/MotionPathPlugin"
import { useGSAP } from "@gsap/react"

if (typeof window !== "undefined") {
  gsap.registerPlugin(
    ScrollTrigger,
    SplitText,
    DrawSVGPlugin,
    MotionPathPlugin,
    useGSAP
  )
}

gsap.defaults({ ease: "power3.out", duration: 0.8 })

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false
  return window.innerWidth < 768
}

export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(hover: none), (pointer: coarse)").matches
}

export { gsap, ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin, useGSAP }
