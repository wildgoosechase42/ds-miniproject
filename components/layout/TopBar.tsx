"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { ArrowUp, Menu, X } from "lucide-react"
import { Wordmark } from "@/components/brand/Brand"
import { getLenis } from "@/lib/lenis"

interface NavSection {
  id: string
  label: string
}

const SECTIONS: NavSection[] = [
  { id: "hero", label: "Overview" },
  { id: "mission", label: "Mission" },
  { id: "challenge", label: "Challenge" },
  { id: "build", label: "The Build" },
  { id: "flight-engine", label: "Flight Core" },
]

export function TopBar() {
  const [visible, setVisible] = useState(false)
  const [activeId, setActiveId] = useState("mission")
  const [open, setOpen] = useState(false)

  const updateScrollState = useCallback(() => {
    const y = window.scrollY
    const firstSectionEl = document.getElementById("mission")
    const heroEl = document.getElementById("hero")
    const threshold = firstSectionEl
      ? firstSectionEl.offsetTop - 80
      : heroEl
        ? heroEl.offsetHeight - 80
        : window.innerHeight * 2.5

    setVisible(y >= threshold)

    const probe = y + 160
    for (let i = SECTIONS.length - 1; i >= 0; i--) {
      const el = document.getElementById(SECTIONS[i].id)
      if (el) {
        const top = el.offsetTop
        if (probe >= top) {
          setActiveId(SECTIONS[i].id)
          break
        }
      }
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      updateScrollState()
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    const lenis = getLenis()
    if (lenis) {
      lenis.on("scroll", handleScroll)
    }
    const rafId = requestAnimationFrame(updateScrollState)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("scroll", handleScroll)
      if (lenis) {
        lenis.off("scroll", handleScroll)
      }
    }
  }, [updateScrollState])

  const scrollToTop = () => {
    setOpen(false)
    const lenis = getLenis()
    if (lenis) {
      lenis.scrollTo(0, { duration: 1.2 })
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const scrollToSection = (id: string) => {
    setOpen(false)
    if (id === "hero") {
      scrollToTop()
      return
    }
    const el = document.getElementById(id)
    if (!el) return
    const lenis = getLenis()
    if (lenis) {
      lenis.scrollTo(el, { offset: -64, duration: 1.2 })
    } else {
      const top = el.getBoundingClientRect().top + window.scrollY - 64
      window.scrollTo({ top, behavior: "smooth" })
    }
  }

  const currentSection = SECTIONS.find((s) => s.id === activeId) || SECTIONS[1]

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ease-out border-b border-white/[0.1] bg-black/90 backdrop-blur-md ${
        visible ? "translate-y-0 opacity-100 pointer-events-auto" : "-translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="shell flex h-16 items-center justify-between gap-4">
        <button
          onClick={scrollToTop}
          className="group flex items-center gap-3 text-left transition-opacity hover:opacity-90"
          aria-label="SomaiyaSat — back to top"
        >
          <div className="relative size-8 sm:size-9 shrink-0 overflow-hidden rounded-full bg-white p-0.5 shadow-md border border-white/20">
            <Image
              src="/somaiya-logo.png"
              alt="Somaiya Vidyavihar Logo"
              width={36}
              height={36}
              className="size-full object-contain"
            />
          </div>
          <Wordmark
            glyphClassName="text-white transition-transform duration-500 group-hover:rotate-180"
            className="text-[17px] text-white"
          />
        </button>

        <nav className="hidden items-center gap-1.5 md:flex">
          <button
            onClick={scrollToTop}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium text-[#8a8f98] transition-colors hover:text-white hover:bg-white/[0.04]"
          >
            <ArrowUp className="size-3.5" />
            <span>Top</span>
          </button>

          {SECTIONS.map((s) => {
            const isActive = activeId === s.id
            return (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className={`transition-all duration-200 ${
                  isActive
                    ? "rounded-full bg-white px-4 py-1.5 text-xs sm:text-sm font-semibold text-black shadow-sm"
                    : "rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium text-[#8a8f98] hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {s.label}
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => scrollToSection(activeId)}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black shadow-sm"
          >
            {currentSection.label}
          </button>

          <button
            onClick={() => setOpen(!open)}
            className="rounded-lg p-2 text-white hover:bg-white/10"
            aria-label="Toggle menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-b border-white/[0.12] bg-black/95 px-6 py-6 md:hidden">
          <nav className="flex flex-col gap-2">
            <button
              onClick={scrollToTop}
              className="flex items-center gap-2 py-2 text-left font-mono text-sm text-[#8a8f98] hover:text-white"
            >
              <ArrowUp className="size-4" />
              <span>Top</span>
            </button>
            {SECTIONS.map((s) => {
              const isActive = activeId === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-left font-mono text-sm transition-colors ${
                    isActive ? "bg-white text-black font-semibold" : "text-[#8a8f98] hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <span>{s.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
