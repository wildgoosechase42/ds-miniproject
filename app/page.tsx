"use client"

import { useEffect } from "react"
import { TopBar } from "@/components/layout/TopBar"
import { Hero } from "@/components/Hero"
import { Mission } from "@/sections/Mission"
import { Challenge } from "@/sections/Challenge"
import { Build } from "@/sections/Build"
import { Footer } from "@/components/layout/Footer"
import { initLenis, destroyLenis } from "@/lib/lenis"

export default function Home() {
  useEffect(() => {
    initLenis()
    return () => {
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
      </main>
      <Footer />
    </div>
  )
}
