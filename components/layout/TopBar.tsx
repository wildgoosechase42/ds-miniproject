"use client"

import { useRef, useState } from "react"
import { Menu, X } from "lucide-react"

import { Wordmark } from "@/components/brand/Brand"
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap"
import { scrollToId } from "@/lib/lenis"
import { DASHBOARD_URL } from "@/lib/config"

const NAV = [
  { id: "hero", label: "Overview" },
  { id: "mission", label: "Mission" },
  { id: "challenge", label: "Challenge" },
  { id: "build", label: "The Build" },
]

export function TopBar() {
  const bar = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)

  useGSAP(
    () => {
      const el = bar.current
      if (!el) return

      gsap.set(el, { yPercent: 0 })
      const show = gsap.quickTo(el, "yPercent", { duration: 0.4, ease: "power3.out" })

      let last = 0
      const st = ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          const y = self.scroll()
          if (y < 80) {
            show(0)
            el.dataset.solid = "false"
          } else {
            el.dataset.solid = "true"
            show(y > last ? -140 : 0)
          }
          last = y
        },
      })
      return () => st.kill()
    },
    { scope: bar }
  )

  const go = (id: string) => {
    setOpen(false)
    scrollToId(id)
  }

  return (
    <header
      ref={bar}
      data-solid="false"
      className="fixed inset-x-0 top-0 z-50 transition-colors duration-300 data-[solid=true]:border-b data-[solid=true]:border-white/[0.12] data-[solid=true]:bg-black/70 data-[solid=true]:backdrop-blur-xl"
    >
      <div className="shell flex h-16 items-center justify-between gap-6 md:h-[72px]">
        <button
          onClick={() => scrollToId("hero")}
          className="group flex items-center gap-2 text-[17px] tracking-[-0.02em] text-white"
          aria-label="SomaiyaSat — back to top"
        >
          <Wordmark glyphClassName="text-white transition-transform duration-500 group-hover:rotate-180" />
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => go(n.id)}
              className="mono-label rounded-lg px-3 py-2 text-[#8a8f98] transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {n.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={DASHBOARD_URL}
            target="_blank"
            rel="noreferrer"
            className="mono-label hidden rounded-md border border-white/[0.15] bg-white/[0.05] px-4 py-2 text-xs text-white transition-colors hover:bg-white/[0.1] sm:inline-flex"
          >
            Mission Control →
          </a>

          <button
            onClick={() => setOpen(!open)}
            className="p-2 text-white md:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-b border-white/[0.12] bg-black/95 px-6 py-6 md:hidden">
          <nav className="flex flex-col gap-3">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => go(n.id)}
                className="py-2 text-left font-mono text-sm text-[#8a8f98] hover:text-white"
              >
                {n.label}
              </button>
            ))}
            <a
              href={DASHBOARD_URL}
              target="_blank"
              rel="noreferrer"
              className="mono-label mt-2 inline-flex items-center justify-center rounded-md border border-white/[0.15] bg-white/[0.05] py-2 text-xs text-white"
            >
              Mission Control →
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
