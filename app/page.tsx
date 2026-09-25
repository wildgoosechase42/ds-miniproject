"use client"

import { useEffect } from "react"
import { TopBar } from "@/components/layout/TopBar"
import { Hero } from "@/components/Hero"
import { Mission } from "@/sections/Mission"
import { Challenge } from "@/sections/Challenge"
import { Build } from "@/sections/Build"
import { FlightEngine } from "@/components/sections/FlightEngine"
import { Footer } from "@/components/layout/Footer"
import { initLenis, destroyLenis } from "@/lib/lenis"

export default function Home() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual"
      }
      window.scrollTo(0, 0)
    }

    const lenis = initLenis()
    if (lenis) {
      lenis.scrollTo(0, { immediate: true })
    }

    const onBeforeUnload = () => {
      window.scrollTo(0, 0)
    }
    window.addEventListener("beforeunload", onBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      destroyLenis()
    }
  }, [])

  return (
    <div className="relative min-h-screen bg-black text-white">
      <TopBar />
      <main>
        <Hero ready={true} />
        <Mission />
        <Challenge />
        <Build />
        <FlightEngine />
      </main>
      <Footer />
    </div>
  )
}
