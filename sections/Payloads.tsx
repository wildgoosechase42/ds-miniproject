"use client"

import { useMemo, useRef, useState } from "react"

import { SectionLabel } from "@/components/brand/Brand"
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/lib/gsap"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/* Payload illustrations — line art on a 200 × 200 canvas              */
/* ------------------------------------------------------------------ */

function IconFrame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className="h-full w-full text-white"
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function TtcIcon() {
  return (
    <IconFrame>
      <path d="M100 196 V132" strokeWidth="2" />
      <path d="M78 196 H122" strokeWidth="2" />
      <ellipse cx="100" cy="106" rx="46" ry="22" transform="rotate(-24 100 106)" strokeWidth="2" />
      <path d="M100 106 L112 78" strokeWidth="2" />
      <circle cx="113" cy="74" r="6" strokeWidth="2" />
      <path d="M128 52 A 40 40 0 0 1 150 74" strokeWidth="1.6" opacity="0.8" />
      <path d="M140 38 A 60 60 0 0 1 168 68" strokeWidth="1.6" opacity="0.55" />
      <path d="M152 24 A 80 80 0 0 1 184 62" strokeWidth="1.6" opacity="0.3" />
      <circle cx="40" cy="44" r="3" fill="#3d6bff" stroke="none" />
      <circle cx="40" cy="62" r="3" fill="#3d6bff" stroke="none" />
      <circle cx="40" cy="80" r="3" fill="#3d6bff" stroke="none" />
      <path d="M50 44 H74 M50 62 H86 M50 80 H68" strokeWidth="1.6" opacity="0.7" />
    </IconFrame>
  )
}

function SstvIcon() {
  return (
    <IconFrame>
      <rect x="28" y="36" width="144" height="112" rx="4" strokeWidth="2" />
      <path d="M38 50 H162" strokeWidth="2.4" opacity="0.9" />
      <path d="M38 58 H162" strokeWidth="2.4" opacity="0.85" />
      <path d="M38 66 H162" strokeWidth="2.4" opacity="0.8" />
      <path d="M38 74 H162" strokeWidth="2.4" opacity="0.75" />
      <path d="M38 82 H162" strokeWidth="2.4" opacity="0.7" />
      <path d="M38 92 H162" strokeWidth="3" stroke="#3d6bff" />
      <circle cx="166" cy="92" r="4" fill="#3d6bff" stroke="none" />
      <path d="M38 102 H100" strokeWidth="1.4" opacity="0.3" />
      <path d="M38 110 H112" strokeWidth="1.4" opacity="0.26" />
      <path d="M38 118 H124" strokeWidth="1.4" opacity="0.22" />
      <path d="M38 126 H136" strokeWidth="1.4" opacity="0.18" />
      <path d="M38 134 H148" strokeWidth="1.4" opacity="0.14" />
      <path d="M72 148 V166 M128 148 V166 M56 166 H144" strokeWidth="2" />
    </IconFrame>
  )
}

function M17Icon() {
  return (
    <IconFrame>
      <path d="M20 100 H180" strokeWidth="1.2" opacity="0.35" />
      <path
        d="M24 100 V72 H44 V128 H64 V86 H84 V114 H104 V58 H124 V100 H144 V80 H164 V100 H180"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M44 46 V154" strokeWidth="1" opacity="0.18" />
      <path d="M64 46 V154" strokeWidth="1" opacity="0.18" />
      <path d="M84 46 V154" strokeWidth="1" opacity="0.18" />
      <path d="M104 46 V154" strokeWidth="1" opacity="0.18" />
      <path d="M124 46 V154" strokeWidth="1" opacity="0.18" />
      <path d="M144 46 V154" strokeWidth="1" opacity="0.18" />
      <path d="M164 46 V154" strokeWidth="1" opacity="0.18" />
      <rect x="20" y="40" width="24" height="10" rx="2" strokeWidth="1.6" stroke="#3d6bff" />
      <rect x="156" y="150" width="24" height="10" rx="2" strokeWidth="1.6" stroke="#3d6bff" />
    </IconFrame>
  )
}

function Codec2Icon() {
  return (
    <IconFrame>
      <path
        d="M16 100 Q26 62 34 100 T52 100 T70 100 T88 100"
        strokeWidth="1.6"
        opacity="0.28"
      />
      <path d="M20 90 V110" strokeWidth="2" opacity="0.5" />
      <path d="M28 49.53 V150.47" strokeWidth="2" opacity="0.465" />
      <path d="M36 68.35 V131.65" strokeWidth="2" opacity="0.43" />
      <path d="M44 61.11 V138.89" strokeWidth="2" opacity="0.395" />
      <path d="M52 52.89 V147.11" strokeWidth="2" opacity="0.36" />
      <path d="M60 80.96 V119.04" strokeWidth="2" opacity="0.325" />
      <path d="M68 48.06 V151.94" strokeWidth="2" opacity="0.29" />
      <path d="M76 76.6 V123.4" strokeWidth="2" opacity="0.255" />
      <path d="M84 55.23 V144.77" strokeWidth="2" opacity="0.22" />
      <path d="M96 58 L116 92 L116 108 L96 142" strokeWidth="1.6" opacity="0.6" />
      <path d="M122 100 H136" strokeWidth="2" stroke="#3d6bff" />
      <path d="M144 84 V116" strokeWidth="2.6" />
      <path d="M156 71 V129" strokeWidth="2.6" />
      <path d="M168 58 V142" strokeWidth="2.6" />
      <path d="M180 79 V121" strokeWidth="2.6" />
      <rect x="138" y="44" width="48" height="112" rx="4" strokeWidth="1.4" opacity="0.4" />
    </IconFrame>
  )
}

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const PAYLOADS = [
  {
    name: "TT&C",
    priority: "01",
    body: "Telemetry, Tracking & Command — the spacecraft's health and status. Always highest priority; never dropped, never deferred.",
    recorded: "2,490",
    queued: "501",
    icon: <TtcIcon />,
  },
  {
    name: "SSTV",
    priority: "02",
    body: "Slow-scan TV image transmission. Bandwidth-heavy frames, and the first thing a thin power budget gives up.",
    recorded: "737",
    queued: "150",
    icon: <SstvIcon />,
  },
  {
    name: "M17",
    priority: "03",
    body: "M17 digital voice and data transmission, carried whenever the link will hold it.",
    recorded: "1,014",
    queued: "201",
    icon: <M17Icon />,
  },
  {
    name: "Codec2",
    priority: "04",
    body: "Codec2 low-bitrate digital voice. Cheap to send, and last in the priority queue.",
    recorded: "757",
    queued: "152",
    icon: <Codec2Icon />,
  },
]

const COUNT = PAYLOADS.length

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export function Payloads() {
  const root = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const copy = useRef<HTMLDivElement>(null)
  const icons = useRef<Array<HTMLDivElement | null>>([])

  const [active, setActive] = useState(0)
  const reduced = useMemo(() => prefersReducedMotion(), [])

  // Pin the stage and map scroll progress to the active payload.
  useGSAP(
    () => {
      if (!root.current || !stage.current) return

      const trigger = ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: "+=280%",
        pin: stage.current,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const next = Math.min(COUNT - 1, Math.floor(self.progress * COUNT))
          setActive((prev) => (prev === next ? prev : next))
        },
      })

      return () => trigger.kill()
    },
    { scope: root }
  )

  // Crossfade the illustration and re-enter the copy whenever the payload changes.
  useGSAP(
    () => {
      icons.current.forEach((el, i) => {
        if (!el) return
        if (reduced) {
          gsap.set(el, { opacity: i === active ? 1 : 0 })
          return
        }
        if (i === active) {
          gsap.fromTo(
            el,
            { opacity: 0, y: 14, scale: 0.97 },
            { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power2.out", overwrite: true }
          )
        } else {
          gsap.to(el, { opacity: 0, duration: 0.2, ease: "power1.out", overwrite: true })
        }
      })

      if (!copy.current) return
      const parts = copy.current.querySelectorAll<HTMLElement>("[data-payload-copy]")
      if (reduced) {
        gsap.set(parts, { opacity: 1, y: 0 })
        return
      }
      gsap.fromTo(
        parts,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.07, ease: "power2.out", overwrite: true }
      )
    },
    { dependencies: [active, reduced], revertOnUpdate: true }
  )

  const payload = PAYLOADS[active]
  const progress = (active + 1) / COUNT

  return (
    <section ref={root} id="payloads" className="relative border-t border-white/[0.12]">
      <div
        ref={stage}
        className="payload-stage relative flex h-screen items-center overflow-hidden"
      >
        <div className="shell w-full">
          <SectionLabel>Payloads</SectionLabel>

          <div className="mt-6 grid items-center gap-8 sm:mt-8 md:mt-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] md:gap-16">
            {/* illustration */}
            <div className="relative flex h-[220px] items-center justify-center sm:h-[280px] md:h-[400px]">
              {PAYLOADS.map((p, i) => (
                <div
                  key={p.name}
                  ref={(el) => {
                    icons.current[i] = el
                  }}
                  className="pointer-events-none absolute h-[180px] w-[180px] sm:h-[230px] sm:w-[230px] md:h-[330px] md:w-[330px]"
                  style={{ opacity: 0 }}
                  aria-hidden="true"
                >
                  {p.icon}
                </div>
              ))}
              <div className="pointer-events-none absolute -z-10 h-[220px] w-[220px] rounded-full border border-white/[0.08] sm:h-[280px] sm:w-[280px] md:h-[380px] md:w-[380px]" />
            </div>

            {/* copy */}
            <div>
              <div ref={copy} className="payload-copy">
                <div data-payload-copy className="flex flex-wrap items-center gap-4">
                  <h3
                    className="font-semibold leading-none tracking-[-0.03em] text-white"
                    style={{ fontSize: "clamp(38px, 5vw, 68px)" }}
                  >
                    {payload.name}
                  </h3>
                  <span className="inline-flex w-fit shrink-0 items-center justify-center rounded-[6px] border border-[#3d6bff]/45 bg-[#3d6bff]/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8aa6ff]">
                    Priority {payload.priority}
                  </span>
                </div>

                <p
                  data-payload-copy
                  className="mt-6 max-w-[46ch] text-[16px] leading-[1.8] text-[#8a8f98]"
                >
                  {payload.body}
                </p>

                <div data-payload-copy className="mt-8 flex flex-wrap items-end gap-8 md:mt-10 md:gap-10">
                  <div>
                    <p className="mono-label text-[#8a8f98]">Packets on record</p>
                    <p className="mt-2 font-mono text-[34px] leading-none tabular-nums text-white md:text-[44px]">
                      {payload.recorded}
                    </p>
                  </div>
                  <div>
                    <p className="mono-label text-[#8a8f98]">Still queued</p>
                    <p className="mt-2 font-mono text-[34px] leading-none tabular-nums text-[#3d6bff] md:text-[44px]">
                      {payload.queued}
                    </p>
                  </div>
                </div>
              </div>

              {/* progress + tabs */}
              <div className="mt-8 md:mt-14">
                <div className="mb-3 flex items-center justify-between">
                  <span className="mono-label text-[#8a8f98]">
                    {String(active + 1).padStart(2, "0")} / {String(COUNT).padStart(2, "0")}
                  </span>
                  <div className="flex gap-4">
                    {PAYLOADS.map((p, i) => (
                      <span
                        key={p.name}
                        className={cn(
                          "mono-label transition-colors duration-300",
                          i === active ? "text-white" : "text-white/25"
                        )}
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress * 100)}
                  aria-label="Payload position"
                  className="relative h-[3px] w-full overflow-hidden rounded-full bg-white/[0.10]"
                >
                  <div
                    className="h-full w-full flex-1 bg-[#3d6bff] transition-transform duration-700 ease-out"
                    style={{ transform: `translateX(${-(1 - progress) * 100}%)` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
