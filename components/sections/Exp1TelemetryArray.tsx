"use client"

import { useState, useEffect, useCallback, useId, useSyncExternalStore, useRef } from "react"
import { useGSAP, gsap, prefersReducedMotion } from "@/lib/gsap"
import { cn } from "@/lib/utils"
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  Database,
  Layers,
  Globe,
  ArrowRight,
} from "lucide-react"

import { fetchSatnogsExp1 } from "@/lib/satnogsClient"
import {
  Badge,
  ExperimentHeader,
  Field,
  GlassPanel,
  GlassTile,
  IconButton,
  KeyValue,
  Label,
  Metric,
  PanelHeader,
  ProgressBar,
  StatusLine,
  ToolButton,
  type Tone,
} from "@/components/sections/flight/ui"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
const TOTAL_CAPACITY = 1024
const SLOTS_PER_PAGE = 32

type PayloadType = "IMAGE" | "SENSOR" | "COMMAND" | "TELEMETRY"

interface TelemetryPacket {
  packet_id: number
  timestamp: number
  battery_status: number
  payload_type: PayloadType
  payload_type_id: number
  ground_station?: string
  norad_cat_id?: number
  transmitter_mode?: string
}

const INITIAL_PACKETS: Record<number, TelemetryPacket> = {
  0: { packet_id: 1042, timestamp: 1719749358, battery_status: 87.5, payload_type: "IMAGE", payload_type_id: 2, ground_station: "Somaiya Ground Station", norad_cat_id: 98330, transmitter_mode: "GFSK 9k6" },
  1: { packet_id: 1043, timestamp: 1719749372, battery_status: 87.4, payload_type: "SENSOR", payload_type_id: 3, ground_station: "dm43 (SatNOGS)", norad_cat_id: 68635, transmitter_mode: "GMSK" },
  2: { packet_id: 1044, timestamp: 1719749386, battery_status: 87.2, payload_type: "TELEMETRY", payload_type_id: 1, ground_station: "Sofia SAT Club", norad_cat_id: 68635, transmitter_mode: "GFSK" },
  3: { packet_id: 1045, timestamp: 1719749401, battery_status: 87.1, payload_type: "COMMAND", payload_type_id: 4, ground_station: "GAO UHF", norad_cat_id: 25544, transmitter_mode: "AX.25" },
  4: { packet_id: 1046, timestamp: 1719749415, battery_status: 87.0, payload_type: "IMAGE", payload_type_id: 2, ground_station: "MEGANISI_1", norad_cat_id: 60083, transmitter_mode: "SSTV" },
  5: { packet_id: 1047, timestamp: 1719749429, battery_status: 86.8, payload_type: "SENSOR", payload_type_id: 3, ground_station: "LU3ARN", norad_cat_id: 98492, transmitter_mode: "GMSK" },
}

const PAYLOAD_BADGE: Record<PayloadType, { text: string; dot: string }> = {
  IMAGE: { text: "text-[#3d6bff]", dot: "bg-[#3d6bff]" },
  SENSOR: { text: "text-[#3ddc97]", dot: "bg-[#3ddc97]" },
  COMMAND: { text: "text-[#ffb547]", dot: "bg-[#ffb547]" },
  TELEMETRY: { text: "text-white/70", dot: "bg-white/60" },
}

const emptySubscribe = () => () => {}

export function Exp1TelemetryArray() {
  const root = useRef<HTMLDivElement>(null)
  const jumpInputId = useId()
  const inspectInputId = useId()
  const freshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [packets, setPackets] = useState<Record<number, TelemetryPacket>>(INITIAL_PACKETS)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(2)
  const [page, setPage] = useState<number>(0)
  const [transmitting, setTransmitting] = useState<boolean>(false)
  const [satnogsLoading, setSatnogsLoading] = useState<boolean>(false)
  const [satnogsCursor, setSatnogsCursor] = useState<string | null>(null)
  const [inspectIndexInput, setInspectIndexInput] = useState<string>("2")
  const [jumpInput, setJumpInput] = useState<string>("")
  const [statusMsg, setStatusMsg] = useState<string>("6 packets resident in contiguous RAM")
  const [freshSlots, setFreshSlots] = useState<Set<number>>(new Set())
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)

  const count = Object.keys(packets).length
  const usage = (count / TOTAL_CAPACITY) * 100
  const totalPages = Math.ceil(TOTAL_CAPACITY / SLOTS_PER_PAGE)

  const syncToBackend = useCallback(async (idx: number, pkt: TelemetryPacket) => {
    try {
      await fetch(`${API_BASE}/api/exp1/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          index: idx,
          packet_id: pkt.packet_id,
          timestamp: pkt.timestamp,
          battery_status: pkt.battery_status,
          payload_type: pkt.payload_type_id,
        }),
      })
    } catch {}
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      Object.entries(INITIAL_PACKETS).forEach(([idxStr, pkt]) => {
        syncToBackend(parseInt(idxStr, 10), pkt)
      })
    }, 0)
    return () => clearTimeout(t)
  }, [syncToBackend])

  useEffect(() => {
    return () => {
      if (freshTimer.current) clearTimeout(freshTimer.current)
    }
  }, [])

  const flashSlots = (indices: number[]) => {
    setFreshSlots(new Set(indices))
    if (freshTimer.current) clearTimeout(freshTimer.current)
    freshTimer.current = setTimeout(() => setFreshSlots(new Set()), 1700)
  }

  const handleReset = () => {
    setPackets({})
    setSelectedSlot(null)
    setSatnogsCursor(null)
    setPage(0)
    setFreshSlots(new Set())
    setStatusMsg("Buffer flushed · 0/1024 slots resident")
  }

  const handleInspectIndex = () => {
    const parsed = parseInt(inspectIndexInput, 10)
    if (isNaN(parsed) || parsed < 0 || parsed >= TOTAL_CAPACITY) {
      setStatusMsg("Index out of range · use 0–1023")
      return
    }
    setSelectedSlot(parsed)
    setPage(Math.floor(parsed / SLOTS_PER_PAGE))
    setStatusMsg(`Probing telemetry_buffer[${String(parsed).padStart(4, "0")}]`)
  }

  const handleJump = () => {
    const parsed = parseInt(jumpInput, 10)
    if (isNaN(parsed) || parsed < 0 || parsed >= TOTAL_CAPACITY) {
      setStatusMsg("Slot out of range · use 0–1023")
      return
    }
    setPage(Math.floor(parsed / SLOTS_PER_PAGE))
    setSelectedSlot(parsed)
    setJumpInput("")
  }

  const fetchSatnogsLive = async () => {
    setSatnogsLoading(true)
    setTransmitting(true)

    let startIndex = -1
    for (let i = 0; i < TOTAL_CAPACITY; i++) {
      if (!packets[i]) {
        startIndex = i
        break
      }
    }

    if (startIndex === -1) {
      setStatusMsg("Buffer saturated · 1024/1024 slots occupied")
      setSatnogsLoading(false)
      setTransmitting(false)
      return
    }

    setStatusMsg(`Opening downlink window · writing at slot ${startIndex}`)
    try {
      const data = await fetchSatnogsExp1(startIndex, 25, satnogsCursor)
      const incoming: Record<number, TelemetryPacket> = {}
      data.packets.forEach((p) => {
        incoming[p.index] = {
          packet_id: p.packet_id,
          timestamp: p.timestamp,
          battery_status: p.battery_status,
          payload_type: p.payload_type as PayloadType,
          payload_type_id: p.payload_type_id,
          ground_station: p.ground_station,
          norad_cat_id: p.norad_cat_id,
          transmitter_mode: p.transmitter_mode,
        }
      })
      setPackets((prev) => ({ ...prev, ...incoming }))
      setSelectedSlot(startIndex)
      setPage(Math.floor(startIndex / SLOTS_PER_PAGE))
      if (data.next_cursor) setSatnogsCursor(data.next_cursor)
      flashSlots(data.packets.map((p) => p.index))

      const updatedCount = Object.keys(packets).length + data.count
      setStatusMsg(
        `${data.count} passes committed · ${updatedCount}/1024 slots resident`
      )
    } catch {
      setStatusMsg("SatNOGS uplink unavailable · retry")
    } finally {
      setSatnogsLoading(false)
      setTransmitting(false)
    }
  }

  // Slot grid re-entry on page change
  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.fromTo(
        ".slot-cell",
        { opacity: 0, y: 10, scale: 0.94 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.45,
          stagger: 0.012,
          ease: "power2.out",
        }
      )
    },
    { scope: root, dependencies: [page] }
  )

  const selectedPacket = selectedSlot !== null ? packets[selectedSlot] : null
  const batteryLevel = selectedPacket
    ? selectedPacket.battery_status
    : packets[0]?.battery_status ?? 87.5

  const pageStart = page * SLOTS_PER_PAGE
  const pageEnd = Math.min(pageStart + SLOTS_PER_PAGE, TOTAL_CAPACITY)
  const pageIndices = Array.from({ length: pageEnd - pageStart }, (_, i) => pageStart + i)

  const statusTone: Tone =
    /unavailable|out of range|saturated|flushed/i.test(statusMsg)
      ? "poor"
      : transmitting
        ? "accent"
        : "good"

  return (
    <div ref={root} className="flex flex-col gap-4">
      <ExperimentHeader
        code="01"
        tag="array[1024] · O(1) index"
        title="Structure of Array"
        state={transmitting ? "INGESTING DOWNLINK" : "SATNOGS LINK"}
        stateTone={transmitting ? "accent" : "good"}
        actions={
          <>
            <ToolButton
              icon={Globe}
              variant="live"
              onClick={fetchSatnogsLive}
              disabled={mounted ? satnogsLoading : false}
              suppressHydrationWarning
            >
              {satnogsLoading ? "Querying" : "Pull SatNOGS"}
            </ToolButton>
            <ToolButton icon={RotateCcw} onClick={handleReset}>
              Reset
            </ToolButton>
          </>
        }
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:items-center sm:gap-7">
            <Metric label="Resident" value={count} unit="/1024" />
            <Metric label="Utilization" value={usage.toFixed(2)} unit="%" tone="accent" />
            <Metric label="Bus battery" value={batteryLevel.toFixed(1)} unit="%" tone="good" />
            <Metric label="Downlink RF" value="437.525" unit="MHz" />
          </div>

          <div className="w-full max-w-[240px]">
            <div className="flex items-center justify-between">
              <Label>Capacity</Label>
              <span className="font-mono text-[9px] tabular-nums text-white/45">
                {count}/1024 pkt
              </span>
            </div>
            <ProgressBar value={usage} className="mt-1.5" />
          </div>
        </div>
      </ExperimentHeader>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <GlassPanel className="scanline p-4 md:p-5 lg:col-span-8">
          <PanelHeader
            icon={Database}
            title="Telemetry buffer"
            meta={`[${String(pageStart).padStart(4, "0")} – ${String(pageEnd - 1).padStart(4, "0")}]`}
            right={
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.08] bg-black/40 p-0.5">
                  <IconButton
                    icon={ChevronLeft}
                    aria-label="Previous page"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={mounted ? page === 0 : false}
                    suppressHydrationWarning
                    className="size-6 border-0 bg-transparent"
                  />
                  <span
                    className="px-1.5 font-mono text-[10px] tabular-nums text-white/70"
                    suppressHydrationWarning
                  >
                    {page + 1}/{totalPages}
                  </span>
                  <IconButton
                    icon={ChevronRight}
                    aria-label="Next page"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={mounted ? page >= totalPages - 1 : false}
                    suppressHydrationWarning
                    className="size-6 border-0 bg-transparent"
                  />
                </div>

                <label htmlFor={jumpInputId} className="sr-only">
                  Jump to slot
                </label>
                <Field
                  id={jumpInputId}
                  type="number"
                  min={0}
                  max={1023}
                  placeholder="Slot"
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJump()}
                  className="h-7 w-16 text-center"
                />
                <ToolButton variant="quiet" onClick={handleJump} className="h-7 px-2">
                  Go
                </ToolButton>
              </div>
            }
          />

          <div className="relative mt-4 grid grid-cols-4 gap-1.5 sm:grid-cols-8">
            {pageIndices.map((slotIdx) => {
              const pkt = packets[slotIdx]
              const isSelected = selectedSlot === slotIdx
              const isFresh = freshSlots.has(slotIdx)
              const badge = pkt ? PAYLOAD_BADGE[pkt.payload_type] : null

              return (
                <button
                  key={slotIdx}
                  onClick={() => {
                    setSelectedSlot(slotIdx)
                    setStatusMsg(`Selected telemetry_buffer[${slotIdx}]`)
                  }}
                  className={cn(
                    "slot-cell group relative flex flex-col justify-between overflow-hidden rounded-lg border p-2 text-left transition-all duration-200",
                    isSelected
                      ? "border-[#3d6bff]/70 bg-[#3d6bff]/[0.16] shadow-[0_0_26px_-8px_rgba(61,107,255,0.95)]"
                      : pkt
                        ? "border-white/[0.1] bg-white/[0.03] hover:border-white/[0.22] hover:bg-white/[0.06]"
                        : "border-white/[0.045] bg-black/25 hover:border-white/[0.12] hover:bg-white/[0.03]",
                    isFresh && "animate-slot-pop"
                  )}
                >
                  {isSelected && (
                    <span className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-[#3d6bff]/60" />
                  )}

                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[8px] tabular-nums text-white/30">
                      {String(slotIdx).padStart(4, "0")}
                    </span>
                    {pkt ? (
                      <span className={cn("size-1 rounded-full", badge?.dot)} />
                    ) : (
                      <span className="size-1 rounded-full border border-white/15" />
                    )}
                  </div>

                  <div className="my-1.5 min-w-0 font-mono">
                    {pkt ? (
                      <>
                        <div className="truncate text-[11px] font-bold leading-none text-white">
                          P{pkt.packet_id}
                        </div>
                        <div className="mt-1 text-[9px] leading-none text-white/35">
                          {pkt.battery_status.toFixed(1)}%
                        </div>
                      </>
                    ) : (
                      <div className="text-[9px] leading-none text-white/15">—</div>
                    )}
                  </div>

                  <div className="font-mono text-[7px] font-semibold tracking-[0.12em]">
                    {pkt ? (
                      <span className={badge?.text}>{pkt.payload_type.slice(0, 3)}</span>
                    ) : (
                      <span className="text-white/12">FREE</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
            <div className="flex items-center gap-3 font-mono text-[9px] text-white/35">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[#3d6bff]" /> occupied
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full border border-white/25" /> free
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[#3ddc97]" /> selected
              </span>
            </div>
            <StatusLine tone={statusTone} pulse={transmitting} className="max-w-[60%]">
              {statusMsg}
            </StatusLine>
          </div>
        </GlassPanel>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <GlassPanel className="p-4">
            <PanelHeader
              icon={Layers}
              title="Slot inspector"
              right={
                selectedPacket ? (
                  <Badge tone="good">allocated</Badge>
                ) : selectedSlot !== null ? (
                  <Badge tone="muted">empty</Badge>
                ) : null
              }
            />

            <div className="mt-2 truncate font-mono text-[12px] font-semibold text-white">
              {selectedSlot !== null
                ? `telemetry_buffer[${selectedSlot}]`
                : "no selection"}
            </div>

            {selectedPacket ? (
              <div className="mt-3 space-y-2.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <GlassTile className="p-2.5">
                    <Label>Packet</Label>
                    <div className="mt-1 font-mono text-[13px] font-semibold text-white">
                      {selectedPacket.packet_id}
                    </div>
                  </GlassTile>
                  <GlassTile className="p-2.5">
                    <Label>Battery</Label>
                    <div className="mt-1 font-mono text-[13px] font-semibold text-[#3ddc97]">
                      {selectedPacket.battery_status.toFixed(1)}%
                    </div>
                  </GlassTile>
                  <GlassTile className="p-2.5">
                    <Label>Timestamp</Label>
                    <div className="mt-1 font-mono text-[11px] font-semibold text-white">
                      {new Date(selectedPacket.timestamp * 1000)
                        .toISOString()
                        .substring(11, 19)}{" "}
                      <span className="text-[8px] font-normal text-white/35">UTC</span>
                    </div>
                  </GlassTile>
                  <GlassTile className="p-2.5">
                    <Label>Payload</Label>
                    <div
                      className={cn(
                        "mt-1 font-mono text-[11px] font-semibold",
                        PAYLOAD_BADGE[selectedPacket.payload_type].text
                      )}
                    >
                      {selectedPacket.payload_type}
                    </div>
                  </GlassTile>
                </div>

                {selectedPacket.ground_station && (
                  <GlassTile className="space-y-1.5 border-[#3ddc97]/20 bg-[#3ddc97]/[0.05] p-2.5">
                    <KeyValue k="Ground station" v={selectedPacket.ground_station} />
                    {selectedPacket.norad_cat_id && (
                      <KeyValue k="NORAD" v={`#${selectedPacket.norad_cat_id}`} tone="good" />
                    )}
                    {selectedPacket.transmitter_mode && (
                      <KeyValue k="Radio mode" v={selectedPacket.transmitter_mode} />
                    )}
                  </GlassTile>
                )}

                <div className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-black/30 px-2.5 py-2">
                  <span className="flex items-center gap-1.5 font-mono text-[9px] text-[#3d6bff]">
                    <ArrowRight className="size-3" />
                    base + {selectedSlot} × 24B
                  </span>
                  <span className="font-mono text-[9px] tabular-nums text-white/50">
                    0x{(selectedSlot! * 24).toString(16).toUpperCase().padStart(4, "0")}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.08] p-6 text-center">
                <Layers className="size-5 text-white/15" />
                <div className="mt-2 font-mono text-[10px] text-white/30">
                  slot is unwritten
                </div>
              </div>
            )}

            <div className="mt-3 border-t border-white/[0.07] pt-3">
              <Label>Direct index probe</Label>
              <div className="mt-1.5 flex gap-1.5">
                <label htmlFor={inspectInputId} className="sr-only">
                  Index
                </label>
                <Field
                  id={inspectInputId}
                  type="number"
                  min={0}
                  max={1023}
                  value={inspectIndexInput}
                  onChange={(e) => setInspectIndexInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInspectIndex()}
                  placeholder="0 – 1023"
                />
                <ToolButton icon={Search} variant="primary" onClick={handleInspectIndex}>
                  Probe
                </ToolButton>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel soft className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="mono-label text-[8px] text-[#8a8f98]">RAM footprint</span>
              <span className="font-mono text-[9px] text-[#3d6bff]">24 KB BSS</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {[
                { k: "struct", v: "24 B" },
                { k: "slots", v: "1024" },
                { k: "lookup", v: "O(1)" },
              ].map((x) => (
                <div key={x.k} className="rounded-md border border-white/[0.06] bg-black/25 px-2 py-1.5">
                  <div className="mono-label text-[7px] text-white/25">{x.k}</div>
                  <div className="mt-0.5 font-mono text-[10px] text-white/70">{x.v}</div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  )
}
