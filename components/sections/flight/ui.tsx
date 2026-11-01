"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { SpaceBackdrop } from "./SpaceBackdrop"

export type Tone = "accent" | "good" | "fair" | "poor" | "muted" | "white"

type ToneSet = {
  text: string
  bg: string
  border: string
  dot: string
  glow: string
}

export const TONE: Record<Tone, ToneSet> = {
  accent: {
    text: "text-[#3d6bff]",
    bg: "bg-[#3d6bff]/12",
    border: "border-[#3d6bff]/40",
    dot: "bg-[#3d6bff]",
    glow: "shadow-[0_0_26px_-6px_rgba(61,107,255,0.8)]",
  },
  good: {
    text: "text-[#3ddc97]",
    bg: "bg-[#3ddc97]/12",
    border: "border-[#3ddc97]/40",
    dot: "bg-[#3ddc97]",
    glow: "shadow-[0_0_26px_-6px_rgba(61,220,151,0.75)]",
  },
  fair: {
    text: "text-[#ffb547]",
    bg: "bg-[#ffb547]/12",
    border: "border-[#ffb547]/40",
    dot: "bg-[#ffb547]",
    glow: "shadow-[0_0_26px_-6px_rgba(255,181,71,0.7)]",
  },
  poor: {
    text: "text-[#ff5c7a]",
    bg: "bg-[#ff5c7a]/12",
    border: "border-[#ff5c7a]/40",
    dot: "bg-[#ff5c7a]",
    glow: "shadow-[0_0_26px_-6px_rgba(255,92,122,0.75)]",
  },
  muted: {
    text: "text-[#8a8f98]",
    bg: "bg-white/[0.04]",
    border: "border-white/[0.1]",
    dot: "bg-[#8a8f98]",
    glow: "",
  },
  white: {
    text: "text-white",
    bg: "bg-white/[0.06]",
    border: "border-white/[0.12]",
    dot: "bg-white",
    glow: "",
  },
}

type Icon = React.ComponentType<{ className?: string }>

/* -------------------------------------------------------------------------- */
/*  Surfaces                                                                  */
/* -------------------------------------------------------------------------- */

export function GlassPanel({
  className,
  children,
  soft = false,
  sheen = false,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  soft?: boolean
  sheen?: boolean
}) {
  return (
    <div
      {...rest}
      className={cn(soft ? "glass-panel-soft" : "glass-panel", sheen && "sheen", className)}
    >
      {children}
    </div>
  )
}

export function GlassTile({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cn("glass-tile", className)}>
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Type                                                                      */
/* -------------------------------------------------------------------------- */

export function Label({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn("mono-label text-[9px] text-[#8a8f98]", className)}>
      {children}
    </span>
  )
}

export function Metric({
  label,
  value,
  unit,
  tone = "white",
  sub,
  className,
}: {
  label: string
  value: React.ReactNode
  unit?: string
  tone?: Tone
  sub?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <Label>{label}</Label>
      <div
        className={cn(
          "mt-1 font-mono text-[15px] font-semibold leading-none tracking-tight tabular-nums",
          TONE[tone].text
        )}
      >
        {value}
        {unit && (
          <span className="ml-1 text-[9px] font-normal text-[#8a8f98]">{unit}</span>
        )}
      </div>
      {sub && (
        <div className="mono-label mt-1 truncate text-[8px] text-white/25">{sub}</div>
      )}
    </div>
  )
}

export function StatTile({
  label,
  value,
  tone = "white",
  sub,
  className,
}: {
  label: string
  value: React.ReactNode
  tone?: Tone
  sub?: React.ReactNode
  className?: string
}) {
  return (
    <GlassTile className={cn("px-3 py-2.5", className)}>
      <Label>{label}</Label>
      <div
        className={cn(
          "mt-1 font-mono text-base font-semibold leading-none tracking-tight tabular-nums",
          TONE[tone].text
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-1 truncate font-mono text-[9px] text-white/30">{sub}</div>}
    </GlassTile>
  )
}

export function Badge({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]",
        TONE[tone].border,
        TONE[tone].bg,
        TONE[tone].text,
        className
      )}
    >
      {children}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*  Controls                                                                  */
/* -------------------------------------------------------------------------- */

type ButtonVariant = "primary" | "glass" | "live" | "danger" | "quiet"

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "border border-[#5a82ff]/40 bg-[#3d6bff] text-white shadow-[0_10px_28px_-12px_rgba(61,107,255,0.95)] hover:bg-[#4b76ff] hover:shadow-[0_14px_34px_-12px_rgba(61,107,255,1)]",
  glass:
    "border border-white/[0.12] bg-[#0a0d14]/70 text-white/80 backdrop-blur-md hover:border-white/[0.24] hover:bg-[#0d1220]/85 hover:text-white",
  live:
    "border border-[#3ddc97]/35 bg-[#08170f]/70 text-[#3ddc97] backdrop-blur-md hover:border-[#3ddc97]/55 hover:bg-[#0c2417]/85",
  danger:
    "border border-[#ff5c7a]/35 bg-[#190a0e]/70 text-[#ff5c7a] backdrop-blur-md hover:border-[#ff5c7a]/55 hover:bg-[#261016]/85",
  quiet:
    "border border-transparent bg-transparent text-[#8a8f98] hover:bg-white/[0.06] hover:text-white",
}

export function ToolButton({
  icon: Icon,
  children,
  variant = "glass",
  className,
  active,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: Icon
  variant?: ButtonVariant
  active?: boolean
}) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex select-none items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-30",
        BUTTON_VARIANTS[variant],
        active && "border-[#3d6bff]/55 bg-[#12224a]/85 text-[#7f9cff] backdrop-blur-md",
        className
      )}
    >
      {Icon && <Icon className="size-3.5" />}
      {children}
    </button>
  )
}

export function IconButton({
  icon: Icon,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: Icon }) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-[#8a8f98] transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white disabled:opacity-25",
        className
      )}
    >
      <Icon className="size-3.5" />
    </button>
  )
}

export function Field({
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={cn(
        "w-full min-w-0 rounded-md border border-white/[0.1] bg-[#06070b] px-2.5 py-1.5 font-mono text-[11px] text-white outline-none transition placeholder:text-white/25 focus:border-[#3d6bff]/70 focus:bg-[#0a0d14] focus:ring-2 focus:ring-[#3d6bff]/20",
        className
      )}
    />
  )
}

export function Select({
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={cn(
        "rounded-md border border-white/[0.1] bg-[#06070b] px-2 py-1.5 font-mono text-[11px] text-white outline-none transition focus:border-[#3d6bff]/70",
        className
      )}
    >
      {children}
    </select>
  )
}

/* -------------------------------------------------------------------------- */
/*  Status                                                                    */
/* -------------------------------------------------------------------------- */

export function StatusDot({ tone = "good", pulse = true }: { tone?: Tone; pulse?: boolean }) {
  return (
    <span className="relative flex size-1.5 shrink-0">
      {pulse && (
        <span
          className={cn("absolute inset-0 rounded-full opacity-60 animate-ping", TONE[tone].dot)}
        />
      )}
      <span className={cn("relative size-1.5 rounded-full", TONE[tone].dot)} />
    </span>
  )
}

export function StatusLine({
  tone = "good",
  children,
  pulse = true,
  className,
}: {
  tone?: Tone
  children: React.ReactNode
  pulse?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2 font-mono text-[10px]", className)}>
      <StatusDot tone={tone} pulse={pulse} />
      <span className={cn("truncate", TONE[tone].text)}>{children}</span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Experiment scaffold                                                       */
/* -------------------------------------------------------------------------- */

export function ExperimentHeader({
  code,
  title,
  tag,
  state,
  stateTone = "good",
  actions,
  children,
  className,
}: {
  code: string
  title: string
  tag: string
  state?: React.ReactNode
  stateTone?: Tone
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <GlassPanel sheen className={cn("overflow-hidden p-4 md:p-5", className)}>
      <SpaceBackdrop seed={Number(code) || 0} />
      <div className="relative z-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md border border-[#3d6bff]/35 bg-[#3d6bff]/12 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.16em] text-[#3d6bff]">
              {code}
            </span>
            <span className="mono-label text-[9px] text-[#8a8f98]">{tag}</span>
            {state && (
              <span className="inline-flex items-center gap-1.5 border-l border-white/[0.12] pl-2">
                <StatusDot tone={stateTone} />
                <span className={cn("font-mono text-[9px] uppercase tracking-[0.12em]", TONE[stateTone].text)}>
                  {state}
                </span>
              </span>
            )}
          </div>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)] md:text-2xl">
            {title}
          </h3>
        </div>

        {actions && (
          <div className="relative flex flex-wrap items-center gap-1.5">{actions}</div>
        )}
      </div>

      {children && (
        <div className="relative z-10 mt-4 border-t border-white/[0.07] pt-3">{children}</div>
      )}
    </GlassPanel>
  )
}

export function PanelHeader({
  icon: Icon,
  title,
  meta,
  right,
  className,
}: {
  icon?: Icon
  title: string
  meta?: React.ReactNode
  right?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2", className)}>
      <div className="flex min-w-0 items-center gap-2">
        {Icon && (
          <span className="flex size-6 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.04]">
            <Icon className="size-3 text-[#3d6bff]" />
          </span>
        )}
        <span className="mono-label truncate text-[10px] text-white/75">{title}</span>
        {meta && <span className="mono-label text-[9px] text-[#8a8f98]">{meta}</span>}
      </div>
      {right}
    </div>
  )
}

export function KeyValue({
  k,
  v,
  tone = "white",
  mono = true,
  className,
}: {
  k: string
  v: React.ReactNode
  tone?: Tone
  mono?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 text-[10px]", className)}>
      <span className="mono-label shrink-0 text-[8px] text-[#8a8f98]">{k}</span>
      <span
        className={cn(
          "truncate text-right text-[10px]",
          mono && "font-mono tabular-nums",
          TONE[tone].text
        )}
      >
        {v}
      </span>
    </div>
  )
}

export function ProgressBar({
  value,
  tone = "accent",
  className,
  trackClassName,
}: {
  value: number
  tone?: Tone
  className?: string
  trackClassName?: string
}) {
  return (
    <div
      className={cn(
        "h-1 w-full overflow-hidden rounded-full bg-white/[0.07]",
        trackClassName
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          tone === "accent" && "bg-gradient-to-r from-[#3d6bff] to-[#3ddc97]",
          tone === "good" && "bg-[#3ddc97]",
          tone === "fair" && "bg-[#ffb547]",
          tone === "poor" && "bg-[#ff5c7a]",
          tone === "muted" && "bg-white/30",
          tone === "white" && "bg-white",
          className
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export function FormulaStrip({
  items,
  className,
}: {
  items: { k: string; v: React.ReactNode; tone?: Tone }[]
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5", className)}>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="text-[8px] uppercase tracking-[0.14em] text-[#8a8f98]">{item.k}</span>
          <span className={TONE[item.tone ?? "accent"].text}>{item.v}</span>
        </div>
      ))}
    </div>
  )
}
