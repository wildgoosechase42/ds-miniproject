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
import { 
  Cpu, 
  Layers, 
  RotateCcw, 
  GitBranch, 
  Network, 
  ArrowUpDown, 
  Hash, 
  Activity
} from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

const EXPERIMENT_TABS = [
  { id: 1, code: "01", tag: "ARRAY", title: "Telemetry Array", icon: Cpu },
  { id: 2, code: "02", tag: "LINKED LIST", title: "Dynamic Buffer", icon: Layers },
  { id: 3, code: "03", tag: "STACK", title: "Task Stack", icon: Activity },
  { id: 4, code: "04", tag: "QUEUE", title: "Circular Ring", icon: RotateCcw },
  { id: 5, code: "05", tag: "BST", title: "Timeline BST", icon: GitBranch },
  { id: 6, code: "06", tag: "GRAPH", title: "Route BFS", icon: Network },
  { id: 7, code: "07", tag: "QUICKSORT", title: "Search Engine", icon: ArrowUpDown },
  { id: 8, code: "08", tag: "HASH TABLE", title: "Direct Indexer", icon: Hash },
]

export function FlightEngine() {
  const root = useRef<HTMLElement>(null)
  const [activeTab, setActiveTab] = useState<number>(1)
  const [apiOnline, setApiOnline] = useState<boolean>(false)

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/exp4/status`)
      if (res.ok) setApiOnline(true)
      else setApiOnline(false)
    } catch {
      setApiOnline(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      checkHealth()
    }, 0)
    const timer = setInterval(checkHealth, 3000)
    return () => {
      clearTimeout(t)
      clearInterval(timer)
    }
  }, [checkHealth])

  useGSAP(
    () => {
      if (prefersReducedMotion()) return

      gsap.from(".flight-fade", {
        opacity: 0,
        y: 36,
        duration: 1.4,
        stagger: 0.15,
        ease: "power2.out",
        scrollTrigger: {
          trigger: root.current,
          start: "top 85%",
        },
      })
    },
    { scope: root }
  )

  return (
    <section ref={root} id="flight-engine" className="relative border-t border-white/[0.12] bg-black py-24 md:py-32">
      <div className="shell">
        <div className="flight-fade flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <SectionLabel accent>Flight Computing Engine</SectionLabel>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight text-white md:text-5xl">
              In-Memory C Telemetry Core
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#8a8f98]">
              Pure C shared library (<code className="rounded bg-white/10 px-1 py-0.5 text-xs text-white">libmissionsuite.so</code>) loaded via Python ctypes and exposed via asynchronous FastAPI endpoints.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="mono-label text-xs">C Core Status:</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono uppercase tracking-wider ${
              apiOnline ? "bg-[#3ddc97]/15 text-[#3ddc97] border border-[#3ddc97]/30" : "bg-[#ff5c7a]/15 text-[#ff5c7a] border border-[#ff5c7a]/30"
            }`}>
              <span className={`size-2 rounded-full ${apiOnline ? "bg-[#3ddc97] animate-pulse" : "bg-[#ff5c7a]"}`} />
              {apiOnline ? "Engine Online (:8000)" : "Connecting..."}
            </span>
          </div>
        </div>

        <div className="flight-fade mt-12">
          <div className="flex items-center justify-between border-b border-white/[0.12] pb-3">
            <span className="mono-label text-xs text-[#8a8f98]">MISSION SUITE · 8 CORE ALGORITHMS</span>
            <span className="mono-label text-xs text-[#3d6bff]">
              ACTIVE EXPERIMENT [0{activeTab}]
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {EXPERIMENT_TABS.map((tab) => {
              const Icon = tab.icon
              const isSelected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex flex-col justify-between rounded-lg border p-3 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-[#3d6bff] bg-[#3d6bff]/10 text-white"
                      : "border-white/[0.08] bg-white/[0.02] text-[#8a8f98] hover:border-white/[0.2] hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className={`font-mono text-[10px] font-semibold tracking-wider ${
                      isSelected ? "text-[#3d6bff]" : "text-[#8a8f98] group-hover:text-white"
                    }`}>
                      [{tab.code}]
                    </span>
                    <Icon className={`size-3.5 ${isSelected ? "text-[#3d6bff]" : "text-[#8a8f98] group-hover:text-white"}`} />
                  </div>

                  <div className="mt-3">
                    <div className="font-mono text-[9px] uppercase tracking-wider text-[#8a8f98] truncate">
                      {tab.tag}
                    </div>
                    <div className={`mt-0.5 font-mono text-xs font-semibold tracking-tight truncate ${
                      isSelected ? "text-white" : "text-white/80 group-hover:text-white"
                    }`}>
                      {tab.title}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-[#3d6bff]" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flight-fade mt-8">
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
