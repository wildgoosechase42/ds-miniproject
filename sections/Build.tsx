"use client"

import { useRef, useState } from "react"
import Image from "next/image"

import { SectionLabel } from "@/components/brand/Brand"
import {
  ArtFlightHardware,
  ArtFormFactor,
  ArtGroundSoftware,
} from "@/components/brand/BuildArtwork"
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap"
import { DASHBOARD_URL } from "@/lib/config"

function DashboardShot() {
  const [failed, setFailed] = useState(false)
  const src = "/assets/img/dashboard.png"

  if (failed) return <ArtGroundSoftware className="h-full w-full text-white/85" />

  return (
    <Image
      src={src}
      alt="The SomaiyaSat Ground Control mission screen"
      width={640}
      height={400}
      unoptimized
      onError={() => setFailed(true)}
      className="h-full w-full object-cover object-top"
    />
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
    caption: "Ground control software",
    note: "Expected output #4 of the use case: ground-station software for multi-mode reception.",
    art: <DashboardShot />,
    href: DASHBOARD_URL,
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
            Drawings are original, built from the dimensions in the use case&apos;s
            Fig. 2. The ground software is the Streamlit dashboard in this
            repository, reading the same PostgreSQL database the router rules
            live in.
          </p>
        </div>

        <div className="build-grid mt-16 grid gap-6 md:grid-cols-3">
          {CARDS.map((c) => {
            const inner = (
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
            )

            return c.href ? (
              <a
                key={c.caption}
                href={c.href}
                target="_blank"
                rel="noreferrer"
                className="block h-full"
              >
                {inner}
              </a>
            ) : (
              <div key={c.caption} className="h-full">
                {inner}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
