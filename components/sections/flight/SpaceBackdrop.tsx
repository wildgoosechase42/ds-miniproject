"use client"

import { cn } from "@/lib/utils"

/**
 * Decorative space banner used behind every experiment header.
 *
 * Pure SVG + CSS so it stays crisp at any width and needs no image assets.
 * All random values come from a seeded generator, so server and client render
 * identical markup (no hydration mismatch).
 */

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const STARS = (() => {
  const rand = seeded(20261101)
  return Array.from({ length: 54 }, () => ({
    x: +(rand() * 1200).toFixed(1),
    y: +(rand() * 168).toFixed(1),
    r: +(0.5 + rand() * 1.2).toFixed(2),
    o: +(0.22 + rand() * 0.62).toFixed(2),
    d: +(rand() * 5).toFixed(2),
  }))
})()

function Satellite({
  x,
  y,
  rotate = 0,
  scale = 1,
  delay = 0,
}: {
  x: number
  y: number
  rotate?: number
  scale?: number
  delay?: number
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <g
        className="animate-float"
        style={{ animationDelay: `${delay}s`, animationDuration: "11s" }}
      >
        <rect x="-23" y="-5" width="13" height="10" rx="1" fill="#3d6bff" opacity="0.9" />
        <rect x="-10.5" y="-5" width="21" height="10" rx="2.4" fill="#d7e0f2" />
        <rect x="10.5" y="-5" width="13" height="10" rx="1" fill="#3d6bff" opacity="0.9" />
        <rect x="-20.5" y="-4" width="7" height="8" rx="0.6" fill="#0d1a3c" opacity="0.55" />
        <rect x="13.5" y="-4" width="7" height="8" rx="0.6" fill="#0d1a3c" opacity="0.55" />
        <path d="M-3 5 L 3 5 L 0 9 Z" fill="#9fb0cc" />
        <circle cx="0" cy="-8.5" r="1.7" fill="#ffb547" className="animate-twinkle" />
      </g>
    </g>
  )
}

function Sparkle({
  x,
  y,
  size = 1,
  color = "#9ff3ff",
  delay = 0,
}: {
  x: number
  y: number
  size?: number
  color?: string
  delay?: number
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <path
        d="M0 -7 L1.7 -1.7 L7 0 L1.7 1.7 L0 7 L-1.7 1.7 L-7 0 L-1.7 -1.7 Z"
        fill={color}
        className="animate-twinkle"
        style={{ animationDelay: `${delay}s` }}
      />
    </g>
  )
}

export function SpaceBackdrop({
  className,
  seed = 0,
}: {
  className?: string
  seed?: number
}) {
  // Rotate the visible face of the planet a little per experiment so every
  // header looks related but not identical.
  const landShift = -(((seed % 8) + 8) % 8) * 6

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-0 h-[152px] overflow-hidden md:h-[168px]",
        "[mask-image:linear-gradient(to_bottom,black_0%,black_66%,transparent_100%)]",
        "[-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_66%,transparent_100%)]",
        className
      )}
    >
      <svg
        viewBox="0 0 1200 168"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="sb-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#060912" />
            <stop offset="0.52" stopColor="#0a1230" />
            <stop offset="1" stopColor="#0b1a3e" />
          </linearGradient>

          <radialGradient id="sb-nebula-violet">
            <stop offset="0" stopColor="#7a5cff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#7a5cff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sb-nebula-teal">
            <stop offset="0" stopColor="#2fd4ff" stopOpacity="0.4" />
            <stop offset="1" stopColor="#2fd4ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sb-nebula-pink">
            <stop offset="0" stopColor="#ff6fd8" stopOpacity="0.38" />
            <stop offset="1" stopColor="#ff6fd8" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="sb-ocean" cx="0.34" cy="0.18" r="0.92">
            <stop offset="0" stopColor="#59a6ff" />
            <stop offset="0.32" stopColor="#2f78e8" />
            <stop offset="0.68" stopColor="#16459f" />
            <stop offset="1" stopColor="#0a2560" />
          </radialGradient>
          <linearGradient id="sb-land" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor="#74e79f" />
            <stop offset="0.55" stopColor="#3fbf72" />
            <stop offset="1" stopColor="#2a8f52" />
          </linearGradient>
          <radialGradient id="sb-shade" cx="0.3" cy="0.12" r="1.02">
            <stop offset="0.28" stopColor="#04091a" stopOpacity="0" />
            <stop offset="0.72" stopColor="#04091a" stopOpacity="0.4" />
            <stop offset="1" stopColor="#04091a" stopOpacity="0.88" />
          </radialGradient>
          <radialGradient id="sb-atmo">
            <stop offset="0.78" stopColor="#4f9dff" stopOpacity="0" />
            <stop offset="0.9" stopColor="#63b4ff" stopOpacity="0.45" />
            <stop offset="1" stopColor="#63b4ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sb-galaxy">
            <stop offset="0" stopColor="#ffe6fb" stopOpacity="0.9" />
            <stop offset="0.35" stopColor="#ff8ee0" stopOpacity="0.5" />
            <stop offset="1" stopColor="#8f6bff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sb-planet">
            <stop offset="0" stopColor="#a8f6ff" />
            <stop offset="0.55" stopColor="#37c4e8" />
            <stop offset="1" stopColor="#0e5c88" />
          </radialGradient>

          <filter id="sb-soft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>

          <clipPath id="sb-earth-clip">
            <circle cx="772" cy="206" r="176" />
          </clipPath>
        </defs>

        {/* sky */}
        <rect width="1200" height="168" fill="url(#sb-sky)" />

        {/* nebulae */}
        <ellipse cx="250" cy="6" rx="330" ry="120" fill="url(#sb-nebula-violet)" />
        <ellipse cx="980" cy="150" rx="300" ry="130" fill="url(#sb-nebula-teal)" />
        <ellipse cx="560" cy="0" rx="240" ry="90" fill="url(#sb-nebula-pink)" />

        {/* stars */}
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="#dbe9ff"
            opacity={s.o}
            className="animate-twinkle"
            style={{ animationDelay: `${s.d}s`, animationDuration: "4.8s" }}
          />
        ))}

        {/* distant galaxies */}
        <g transform="translate(322 34) rotate(-16)" opacity="0.85">
          <ellipse rx="34" ry="11" fill="url(#sb-galaxy)" />
          <ellipse rx="17" ry="5" fill="#ffe9fb" opacity="0.22" />
          <circle r="2.2" fill="#fff4fd" />
        </g>
        <g transform="translate(1046 24) rotate(24) scale(0.72)" opacity="0.8">
          <ellipse rx="34" ry="11" fill="url(#sb-galaxy)" />
          <circle r="2" fill="#fff4fd" />
        </g>

        {/* small ringed planet */}
        <g transform="translate(1128 128)">
          <circle r="7.5" fill="url(#sb-planet)" />
          <ellipse
            rx="13"
            ry="3.6"
            fill="none"
            stroke="#9df0ff"
            strokeOpacity="0.45"
            strokeWidth="1"
            transform="rotate(-16)"
          />
        </g>

        {/* earth */}
        <g>
          <circle cx="772" cy="206" r="188" fill="url(#sb-atmo)" />
          <circle cx="772" cy="206" r="176" fill="url(#sb-ocean)" />

          <g clipPath="url(#sb-earth-clip)">
            <g transform={`translate(${landShift} 0)`}>
              {/* landmasses */}
              <path
                d="M612 140 C 618 118 640 104 664 108 C 676 96 700 98 708 112 C 726 112 738 126 734 142 C 730 158 712 164 696 160 C 682 172 656 174 640 164 C 622 154 608 152 612 140 Z"
                fill="url(#sb-land)"
              />
              <path
                d="M784 84 C 798 72 822 76 830 92 C 844 96 852 110 844 122 C 836 134 818 136 806 130 C 792 140 774 132 770 118 C 762 104 770 90 784 84 Z"
                fill="url(#sb-land)"
              />
              <path
                d="M874 122 C 884 110 906 112 914 126 C 924 140 916 156 900 158 C 882 160 870 146 870 134 Z"
                fill="url(#sb-land)"
              />
              <path
                d="M706 168 C 720 160 742 166 744 180 C 746 192 726 198 714 192 C 702 186 698 174 706 168 Z"
                fill="url(#sb-land)"
              />
              <path
                d="M600 156 C 610 148 626 154 626 166 C 626 178 610 182 602 174 C 596 168 594 162 600 156 Z"
                fill="url(#sb-land)"
                opacity="0.92"
              />

              {/* land highlights */}
              <path
                d="M646 122 C 656 110 676 112 682 124 C 668 120 656 128 646 122 Z"
                fill="#a6f7c4"
                opacity="0.4"
              />
              <path
                d="M796 94 C 808 86 826 94 828 106 C 812 100 802 102 796 94 Z"
                fill="#a6f7c4"
                opacity="0.36"
              />

              {/* clouds */}
              <g filter="url(#sb-soft)" fill="#ffffff">
                <ellipse cx="700" cy="120" rx="34" ry="7" opacity="0.62" />
                <ellipse cx="742" cy="132" rx="20" ry="4.6" opacity="0.46" />
                <ellipse cx="806" cy="108" rx="28" ry="6" opacity="0.56" />
                <ellipse cx="866" cy="136" rx="26" ry="5.4" opacity="0.48" />
                <ellipse cx="640" cy="152" rx="22" ry="4.6" opacity="0.4" />
                <ellipse cx="900" cy="104" rx="16" ry="3.8" opacity="0.36" />
                <ellipse cx="764" cy="150" rx="18" ry="4" opacity="0.34" />
                <ellipse cx="620" cy="112" rx="14" ry="3.4" opacity="0.3" />
              </g>
            </g>

            {/* terminator */}
            <circle cx="772" cy="206" r="176" fill="url(#sb-shade)" />
          </g>

          {/* atmosphere rim */}
          <circle
            cx="772"
            cy="206"
            r="176"
            fill="none"
            stroke="#8ecbff"
            strokeOpacity="0.5"
            strokeWidth="1.2"
          />
        </g>

        {/* satellites */}
        <Satellite x={1012} y={54} rotate={16} scale={0.95} delay={0.4} />

        {/* sparkles */}
        <Sparkle x={1104} y={36} size={1.1} color="#c9f7ff" delay={0.2} />
        <Sparkle x={948} y={96} size={0.72} color="#ffd8f6" delay={1.4} />
        <Sparkle x={604} y={26} size={0.62} color="#9ff3ff" delay={2.1} />
        <Sparkle x={466} y={112} size={0.52} color="#d9c6ff" delay={0.9} />
        <Sparkle x={862} y={62} size={0.44} color="#ffffff" delay={2.8} />

        {/* readability scrim */}
        <defs>
          <linearGradient id="sb-scrim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#06080f" stopOpacity="0.94" />
            <stop offset="0.3" stopColor="#06080f" stopOpacity="0.82" />
            <stop offset="0.58" stopColor="#06080f" stopOpacity="0.34" />
            <stop offset="1" stopColor="#06080f" stopOpacity="0.16" />
          </linearGradient>
        </defs>
        <rect width="1200" height="168" fill="url(#sb-scrim)" />
      </svg>
    </div>
  )
}
