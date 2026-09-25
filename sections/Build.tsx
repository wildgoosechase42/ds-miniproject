"use client"

import { useRef } from "react"
import Image from "next/image"

import { SectionLabel } from "@/components/brand/Brand"
import {
  ArtFlightHardware,
  ArtFormFactor,
} from "@/components/brand/BuildArtwork"
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap"

function GroundStationShot() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black flex items-center justify-center">
      <Image
        src="/assets/img/ground-station.jpg"
        alt="Ground Station Operations and Telemetry Terminal Blueprint"
        width={640}
        height={400}
        className="h-full w-full object-cover object-center"
      />
    </div>
  )
}

const CARDS = [
  {
    caption: "SomaiyaPod + SomaiyaSat · flight hardware",
    note: "Spring-loaded pusher plate, separation switches, one spacecraft per pod.",
    art: <ArtFlightHardware className="h-full w-full text-white/85" />,
  },
  {
    caption: "127.4 × 57.9 × 57.2 mm",
    note: "The flight envelope from Fig. 2 of the use case — an elongated PCB stack, not a 50 mm cube.",
    art: <ArtFormFactor className="h-full w-full text-white/85" />,
  },
  {
    caption: "Ground Station Operations Terminal",
    note: "Automated multi-mode reception, orbital pass telemetry tracking, and telemetry demodulation.",
    art: <GroundStationShot />,
  },
]

export function Build() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.from(".build-card", {
        opacity: 0,
        y: 64,
        duration: 1.5,
        stagger: 0.16,
        ease: "power2.out",
        scrollTrigger: { trigger: ".build-grid", start: "top 86%" },
      })
    },
    { scope: root }
  )

  return (
    <section
      ref={root}
      id="build"
      className="border-t border-white/[0.12] py-24 md:py-32"
    >
      <div className="shell">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <SectionLabel>The build</SectionLabel>
            <h2
              className="mt-8 max-w-[20ch] font-semibold leading-[1.06] tracking-[-0.03em]"
              style={{ fontSize: "clamp(34px, 5vw, 72px)" }}
            >
              Hardware the size of a fist. Software that has to be sure.
            </h2>
          </div>
          <p className="max-w-[40ch] text-sm leading-[1.8] text-[#8a8f98]">
            Original engineering schematics derived from the flight specification in Fig. 2.
            Paired with the automated ground telemetry terminal for real-time orbital pass ingestion.
          </p>
        </div>

        <div className="build-grid mt-16 grid gap-6 md:grid-cols-3">
          {CARDS.map((c) => (
            <div key={c.caption} className="h-full">
              <div className="build-card group h-full overflow-hidden rounded-xl border border-white/[0.12] bg-white/[0.03] transition-colors duration-500 hover:border-[#3d6bff]/60">
                <div className="aspect-[8/5] w-full overflow-hidden bg-white/[0.02]">
                  <div className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]">
                    {c.art}
                  </div>
                </div>
                <div className="flex flex-col items-start gap-2 border-t border-white/[0.12] px-6 py-5">
                  <span className="mono-label text-white">{c.caption}</span>
                  <span className="text-[13px] leading-relaxed text-[#8a8f98]">
                    {c.note}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
