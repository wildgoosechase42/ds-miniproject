"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { SectionLabel } from "@/components/brand/Brand"
import { Exp1TelemetryArray } from "@/components/sections/Exp1TelemetryArray"
import { Exp2DynamicBuffer } from "@/components/sections/Exp2DynamicBuffer"
import { Exp3TaskStack } from "@/components/sections/Exp3TaskStack"
import { Exp4CircularQueue } from "@/components/sections/Exp4CircularQueue"
import { Exp5TimelineBST } from "@/components/sections/Exp5TimelineBST"
import { Exp6GraphRouting } from "@/components/sections/Exp6GraphRouting"
import { Exp7QuickSortSearch } from "@/components/sections/Exp7QuickSortSearch"
import { Exp8HashIndexer } from "@/components/sections/Exp8HashIndexer"
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap"
import { cn } from "@/lib/utils"
import {
  Cpu,
  Layers,
  RotateCcw,
  GitBranch,
  Network,
  ArrowUpDown,
  Hash,
  Activity,
} from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

const EXPERIMENT_TABS = [
  { id: 1, code: "01", tag: "ARRAY", title: "Structure of Array", icon: Cpu },
  { id: 2, code: "02", tag: "LINKED LIST", title: "Node Chain", icon: Layers },
  { id: 3, code: "03", tag: "STACK", title: "Task Stack", icon: Activity },
  { id: 4, code: "04", tag: "QUEUE", title: "Circular Ring", icon: RotateCcw },
  { id: 5, code: "05", tag: "BST", title: "Timeline BST", icon: GitBranch },
  { id: 6, code: "06", tag: "GRAPH", title: "Route BFS", icon: Network },
  { id: 7, code: "07", tag: "QUICKSORT", title: "Search Engine", icon: ArrowUpDown },
  { id: 8, code: "08", tag: "HASH TABLE", title: "Direct Indexer", icon: Hash },
]

type EngineMode = "c_core" | "cloud" | "offline"

const ENGINE_META: Record<
  EngineMode,
  { label: string; text: string; dot: string; ring: string }
> = {
  c_core: {
    label: "C CORE ONLINE",
    text: "text-[#3ddc97]",
    dot: "bg-[#3ddc97]",
    ring: "border-[#3ddc97]/35 bg-[#3ddc97]/10 shadow-[0_0_30px_-12px_rgba(61,220,151,0.9)]",
  },
  cloud: {
    label: "CLOUD RUNTIME",
    text: "text-[#3d6bff]",
    dot: "bg-[#3d6bff]",
    ring: "border-[#3d6bff]/35 bg-[#3d6bff]/10 shadow-[0_0_30px_-12px_rgba(61,107,255,0.9)]",
  },
  offline: {
    label: "SYNCING",
    text: "text-[#ffb547]",
    dot: "bg-[#ffb547]",
    ring: "border-[#ffb547]/35 bg-[#ffb547]/10",
  },
}

export function FlightEngine() {
  const root = useRef<HTMLElement>(null)
  const [activeTab, setActiveTab] = useState<number>(1)
  const [engineMode, setEngineMode] = useState<EngineMode>("offline")

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/exp4/status`)
      if (res.ok) {
        const data = await res.json()
        setEngineMode(data.engine === "cloud_runtime" ? "cloud" : "c_core")
        return
      }
    } catch {
      // Backend offline — try the local route below.
    }

    try {
      const fallbackRes = await fetch(`/api/exp4/status`)
      if (fallbackRes.ok) {
        setEngineMode("cloud")
        return
      }
    } catch {
      // Both endpoints unavailable.
    }

    setEngineMode("offline")
  }, [])

  useEffect(() => {
    const kickoff = setTimeout(checkHealth, 0)
    const timer = setInterval(checkHealth, 5000)
    return () => {
      clearTimeout(kickoff)
      clearInterval(timer)
    }
  }, [checkHealth])

  // Section entry
  useGSAP(
    () => {
      if (prefersReducedMotion()) return

      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top 85%", once: true },
      })

      tl.from(".flight-fade", {
        opacity: 0,
        y: 34,
        duration: 1.1,
        stagger: 0.1,
        ease: "power2.out",
        clearProps: "opacity,transform",
      }).from(
        ".flight-tab",
        {
          opacity: 0,
          y: 16,
          duration: 0.6,
          stagger: 0.04,
          ease: "power2.out",
          clearProps: "opacity,transform",
        },
        0.25
      )
    },
    { scope: root }
  )

  // Stage transition on module switch
  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.fromTo(
        ".flight-stage",
        { opacity: 0, y: 16, filter: "blur(6px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.55, ease: "power3.out" }
      )
    },
    { scope: root, dependencies: [activeTab] }
  )

  const active = EXPERIMENT_TABS.find((t) => t.id === activeTab) ?? EXPERIMENT_TABS[0]
  const engine = ENGINE_META[engineMode]

  return (
    <section
      ref={root}
      id="flight-engine"
      className="relative overflow-hidden border-t border-white/[0.12] bg-black py-24 md:py-32"
    >
      {/* Ambient light field */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 size-[720px] -translate-x-1/2 rounded-full bg-[#3d6bff]/[0.09] blur-[130px]" />
        <div className="absolute bottom-0 left-0 size-[420px] rounded-full bg-[#3ddc97]/[0.04] blur-[120px]" />
        <div className="absolute inset-0 grid-lines opacity-[0.55] [mask-image:radial-gradient(ellipse_at_50%_20%,#000_20%,transparent_72%)]" />
      </div>

      <div className="shell relative">
        <div className="flight-fade flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <SectionLabel accent>Flight Computing Engine</SectionLabel>
            <h2 className="mt-5 max-w-xl text-balance text-3xl font-semibold leading-[1.05] tracking-[-0.03em] text-white md:text-5xl">
              In-Memory C
              <br className="hidden sm:block" /> Telemetry Core
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#8a8f98]">
              Eight flight-critical algorithms, one shared C core — running live
              against real SatNOGS passes.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 md:items-end">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] backdrop-blur-xl transition-colors duration-500",
                engine.ring,
                engine.text
              )}
            >
              <span className="relative flex size-1.5">
                <span
                  className={cn(
                    "absolute inset-0 rounded-full opacity-70",
                    engine.dot,
                    engineMode !== "offline" && "animate-ping"
                  )}
                />
                <span className={cn("relative size-1.5 rounded-full", engine.dot)} />
              </span>
              {engine.label}
            </span>
            <span className="mono-label text-[8px] text-white/25">
              libmissionsuite.so · 8 modules
            </span>
          </div>
        </div>

        {/* Module rail */}
        <div className="flight-fade flight-rail mt-10 md:mt-14">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.09] pb-3">
            <div className="flex items-center gap-2">
              <span className="mono-label text-[9px] text-[#8a8f98]">Mission suite</span>
              <span className="h-3 w-px bg-white/15" />
              <span className="mono-label text-[9px] text-white/40">08 modules</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em]">
              <span className="text-white/25">Active</span>
              <span className="text-[#3d6bff]">
                [{active.code}] {active.title}
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {EXPERIMENT_TABS.map((tab) => {
              const Icon = tab.icon
              const isSelected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flight-tab group relative overflow-hidden rounded-xl border p-3 text-left backdrop-blur-xl transition-all duration-300",
                    isSelected
                      ? "border-[#3d6bff]/60 bg-[#3d6bff]/[0.12] shadow-[0_18px_44px_-26px_rgba(61,107,255,1)]"
                      : "border-white/[0.07] bg-white/[0.022] hover:-translate-y-0.5 hover:border-white/[0.18] hover:bg-white/[0.05]"
                  )}
                >
                  {isSelected && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-6 -top-8 size-20 rounded-full bg-[#3d6bff]/25 blur-2xl"
                    />
                  )}

                  <div className="relative flex items-center justify-between">
                    <span
                      className={cn(
                        "font-mono text-[9px] font-bold tracking-[0.16em] transition-colors",
                        isSelected ? "text-[#3d6bff]" : "text-white/30 group-hover:text-white/60"
                      )}
                    >
                      {tab.code}
                    </span>
                    <Icon
                      className={cn(
                        "size-3.5 transition-all duration-300",
                        isSelected
                          ? "text-[#3d6bff] drop-shadow-[0_0_8px_rgba(61,107,255,0.8)]"
                          : "text-white/25 group-hover:text-white/60"
                      )}
                    />
                  </div>

                  <div className="relative mt-4">
                    <div className="mono-label text-[8px] text-white/30">{tab.tag}</div>
                    <div
                      className={cn(
                        "mt-1 truncate font-mono text-[11px] font-semibold tracking-tight transition-colors",
                        isSelected ? "text-white" : "text-white/65 group-hover:text-white"
                      )}
                    >
                      {tab.title}
                    </div>
                  </div>

                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-2.5 bottom-0 h-px origin-left bg-gradient-to-r from-[#3d6bff] via-[#3d6bff]/70 to-transparent transition-transform duration-500",
                      isSelected ? "scale-x-100" : "scale-x-0"
                    )}
                  />
                </button>
              )
            })}
          </div>
        </div>

        {/* Stage */}
        <div className="flight-stage mt-6 md:mt-8">
          {activeTab === 1 && <Exp1TelemetryArray />}
          {activeTab === 2 && <Exp2DynamicBuffer />}
          {activeTab === 3 && <Exp3TaskStack />}
          {activeTab === 4 && <Exp4CircularQueue />}
          {activeTab === 5 && <Exp5TimelineBST />}
          {activeTab === 6 && <Exp6GraphRouting />}
          {activeTab === 7 && <Exp7QuickSortSearch />}
          {activeTab === 8 && <Exp8HashIndexer />}
        </div>
      </div>
    </section>
  )
}
