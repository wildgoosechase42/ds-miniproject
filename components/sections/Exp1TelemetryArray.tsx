"use client"

import { useState, useEffect, useCallback, useId, useSyncExternalStore } from "react"
import { SectionLabel } from "@/components/brand/Brand"

const emptySubscribe = () => () => {}
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Search,
  Database,
  Layers,
  ArrowRight,
  Globe
} from "lucide-react"

import { fetchSatnogsExp1 } from "@/lib/satnogsClient"

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
  5: { packet_id: 1047, timestamp: 1719749429, battery_status: 86.8, payload_type: "SENSOR", payload_type_id: 3, ground_station: "LU3ARN", norad_cat_id: 98492, transmitter_mode: "GMSK" }
}

export function Exp1TelemetryArray() {
  const jumpInputId = useId()
  const inspectInputId = useId()
  const [packets, setPackets] = useState<Record<number, TelemetryPacket>>(INITIAL_PACKETS)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(2)
  const [page, setPage] = useState<number>(0)
  const [transmitting, setTransmitting] = useState<boolean>(false)
  const [satnogsLoading, setSatnogsLoading] = useState<boolean>(false)
  const [satnogsCursor, setSatnogsCursor] = useState<string | null>(null)
  const [inspectIndexInput, setInspectIndexInput] = useState<string>("2")
  const [jumpInput, setJumpInput] = useState<string>("")
  const [codeOpen, setCodeOpen] = useState<boolean>(false)
  const [statusMsg, setStatusMsg] = useState<string>("Ready: 6 telemetry packets in contiguous RAM")
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)

  const count = Object.keys(packets).length
  const usagePercentage = ((count / TOTAL_CAPACITY) * 100).toFixed(2)
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
          payload_type: pkt.payload_type_id
        })
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

  const handleReset = () => {
    setPackets({})
    setSelectedSlot(null)
    setSatnogsCursor(null)
    setPage(0)
    setStatusMsg("Telemetry buffer flushed. Array reset to 0/1024 slots.")
  }

  const handleInspectIndex = () => {
    const parsed = parseInt(inspectIndexInput, 10)
    if (isNaN(parsed) || parsed < 0 || parsed >= TOTAL_CAPACITY) {
      setStatusMsg("Invalid index: Must be 0–1023")
      return
    }
    setSelectedSlot(parsed)
    setPage(Math.floor(parsed / SLOTS_PER_PAGE))
    setStatusMsg(`Inspecting slot [${String(parsed).padStart(4, "0")}]`)
  }

  const handleJump = () => {
    const parsed = parseInt(jumpInput, 10)
    if (isNaN(parsed) || parsed < 0 || parsed >= TOTAL_CAPACITY) {
      setStatusMsg("Invalid slot for jump")
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
      setStatusMsg("Buffer completely full (1024/1024 slots occupied).")
      setSatnogsLoading(false)
      setTransmitting(false)
      return
    }

    setStatusMsg(`Querying SatNOGS global network for orbital passes (Slot ${startIndex}+)...`)
    try {
      const data = await fetchSatnogsExp1(startIndex, 25, satnogsCursor)
      const incomingPackets: Record<number, TelemetryPacket> = {}
      data.packets.forEach((p) => {
        incomingPackets[p.index] = {
          packet_id: p.packet_id,
          timestamp: p.timestamp,
          battery_status: p.battery_status,
          payload_type: p.payload_type as PayloadType,
          payload_type_id: p.payload_type_id,
          ground_station: p.ground_station,
          norad_cat_id: p.norad_cat_id,
          transmitter_mode: p.transmitter_mode
        }
      })
      setPackets((prev) => ({ ...prev, ...incomingPackets }))
      setSelectedSlot(startIndex)
      setPage(Math.floor(startIndex / SLOTS_PER_PAGE))
      if (data.next_cursor) {
        setSatnogsCursor(data.next_cursor)
      }
      const updatedCount = Object.keys(packets).length + data.count
      setStatusMsg(`Received ${data.count} passes from ${data.source.includes("Live") ? "live SatNOGS DB" : "SatNOGS network"} · Total: ${updatedCount}/1024 slots`)
    } catch {
      setStatusMsg("Error connecting to SatNOGS network")
    } finally {
      setSatnogsLoading(false)
      setTransmitting(false)
    }
  }

  const selectedPacket = selectedSlot !== null ? packets[selectedSlot] : null
  const batteryLevel = selectedPacket ? selectedPacket.battery_status : (packets[0]?.battery_status ?? 87.5)

  const getPayloadBadge = (type: PayloadType) => {
    switch (type) {
      case "IMAGE":
        return { bg: "bg-[#3d6bff]/20", text: "text-[#3d6bff]", border: "border-[#3d6bff]/40", dot: "bg-[#3d6bff]" }
      case "SENSOR":
        return { bg: "bg-[#3ddc97]/20", text: "text-[#3ddc97]", border: "border-[#3ddc97]/40", dot: "bg-[#3ddc97]" }
      case "COMMAND":
        return { bg: "bg-[#ffb547]/20", text: "text-[#ffb547]", border: "border-[#ffb547]/40", dot: "bg-[#ffb547]" }
      case "TELEMETRY":
        return { bg: "bg-[#3d6bff]/15", text: "text-white", border: "border-white/20", dot: "bg-white" }
    }
  }

  const pageStart = page * SLOTS_PER_PAGE
  const pageEnd = Math.min(pageStart + SLOTS_PER_PAGE, TOTAL_CAPACITY)
  const pageIndices = Array.from({ length: pageEnd - pageStart }, (_, i) => pageStart + i)

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <SectionLabel accent>EXPERIMENT 01</SectionLabel>
              <span className="rounded border border-white/[0.12] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#8a8f98]">
                ARRAY OF STRUCTURES · 1024 SLOTS
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#3ddc97]">
                <span className={`size-1.5 rounded-full ${transmitting ? "bg-[#3d6bff] animate-ping" : "bg-[#3ddc97]"}`} />
                {transmitting ? "INGESTING SATNOGS DOWNLINK..." : "SATNOGS DB CONNECTED"}
              </span>
            </div>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-white md:text-2xl">
              SATELLITE TELEMETRY ARRAY
            </h3>
            <p className="mt-1 text-xs text-[#8a8f98]">
              Contiguous memory allocation (<code className="text-[#3d6bff]">telemetry_buffer[1024]</code>) with instant O(1) indexed lookup.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchSatnogsLive}
              disabled={mounted ? satnogsLoading : false}
              suppressHydrationWarning
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#3ddc97]/40 bg-[#3ddc97]/10 px-3.5 py-2 font-mono text-xs font-semibold text-[#3ddc97] shadow-sm shadow-[#3ddc97]/10 transition hover:bg-[#3ddc97]/20 active:scale-95 disabled:opacity-40"
            >
              <Globe className={`size-3.5 ${satnogsLoading ? "animate-spin" : ""}`} />
              <span>{satnogsLoading ? "QUERYING SATNOGS DB..." : "PULL SATNOGS DB"}</span>
            </button>

            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-2 font-mono text-xs text-[#8a8f98] transition hover:border-white/30 hover:bg-white/[0.08] hover:text-white active:scale-95"
            >
              <RotateCcw className="size-3.5" />
              <span>RESET</span>
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-white/[0.08] bg-black/50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-4 sm:flex sm:items-center sm:gap-6 font-mono text-xs">
            <div>
              <span className="text-[10px] text-[#8a8f98]">BUFFER STORED</span>
              <div className="font-bold text-white">{count} <span className="text-[#8a8f98] font-normal">/ 1024</span></div>
            </div>
            <div>
              <span className="text-[10px] text-[#8a8f98]">UTILIZATION</span>
              <div className="font-bold text-[#3d6bff]">{usagePercentage}%</div>
            </div>
            <div>
              <span className="text-[10px] text-[#8a8f98]">BUS BATTERY</span>
              <div className="font-bold text-[#3ddc97]">{batteryLevel.toFixed(1)}%</div>
            </div>
            <div>
              <span className="text-[10px] text-[#8a8f98]">DOWNLINK RF</span>
              <div className="font-bold text-white">437.525 MHz</div>
            </div>
          </div>

          <div className="flex flex-1 max-w-xs flex-col gap-1 sm:ml-auto">
            <div className="flex justify-between font-mono text-[10px] text-[#8a8f98]">
              <span>CAPACITY USAGE</span>
              <span className="text-white">{count}/1024 PKTS</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#3d6bff] to-[#3ddc97] transition-all duration-300"
                style={{ width: `${Math.max(parseFloat(usagePercentage), 0.6)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Database className="size-4 text-[#3d6bff]" />
                <span className="font-mono text-xs font-semibold tracking-wider text-white uppercase">
                  TELEMETRY BUFFER [1024]
                </span>
                <span className="font-mono text-[11px] text-[#8a8f98]">
                  · SLOTS [{String(pageStart).padStart(4, "0")} – {String(pageEnd - 1).padStart(4, "0")}]
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <div className="flex items-center rounded-lg border border-white/[0.12] bg-black/60 p-0.5">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={mounted ? page === 0 : false}
                    suppressHydrationWarning
                    className="rounded p-1 text-[#8a8f98] transition hover:bg-white/[0.1] hover:text-white disabled:opacity-20"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>

                  <span className="px-2 text-[11px] font-medium text-white" suppressHydrationWarning>
                    {page + 1}/{totalPages}
                  </span>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={mounted ? page >= totalPages - 1 : false}
                    suppressHydrationWarning
                    className="rounded p-1 text-[#8a8f98] transition hover:bg-white/[0.1] hover:text-white disabled:opacity-20"
                    aria-label="Next Page"
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <label htmlFor={jumpInputId} className="sr-only">Jump</label>
                  <input
                    id={jumpInputId}
                    type="number"
                    min={0}
                    max={1023}
                    placeholder="Slot"
                    value={jumpInput}
                    onChange={(e) => setJumpInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJump()}
                    className="w-16 rounded border border-white/[0.12] bg-black/60 px-2 py-1 text-center font-mono text-xs text-white placeholder:text-white/30 focus:border-[#3d6bff] focus:outline-none"
                  />
                  <button
                    onClick={handleJump}
                    className="rounded border border-white/[0.15] bg-white/[0.06] px-2 py-1 font-mono text-[11px] text-white transition hover:bg-white/[0.12]"
                  >
                    GO
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
              {pageIndices.map((slotIdx) => {
                const pkt = packets[slotIdx]
                const isSelected = selectedSlot === slotIdx
                const badge = pkt ? getPayloadBadge(pkt.payload_type) : null

                return (
                  <button
                    key={slotIdx}
                    onClick={() => {
                      setSelectedSlot(slotIdx)
                      setStatusMsg(`Selected telemetry_buffer[${slotIdx}]`)
                    }}
                    className={`group relative flex flex-col justify-between rounded-lg border p-2 text-left transition-all duration-150 ${
                      isSelected
                        ? "border-[#3d6bff] bg-[#3d6bff]/20 ring-2 ring-[#3d6bff]/50 shadow-md shadow-[#3d6bff]/20"
                        : pkt
                        ? "border-white/[0.14] bg-white/[0.03] hover:border-white/[0.3] hover:bg-white/[0.06]"
                        : "border-white/[0.05] bg-black/30 opacity-50 hover:border-white/[0.12] hover:opacity-90"
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-[9px] text-[#8a8f98]">
                      <span>{String(slotIdx).padStart(4, "0")}</span>
                      {pkt && <span className={`size-1.5 rounded-full ${badge?.dot}`} />}
                    </div>

                    <div className="my-1 font-mono">
                      {pkt ? (
                        <div>
                          <div className="truncate text-xs font-bold text-white group-hover:text-[#3d6bff]">
                            P{pkt.packet_id}
                          </div>
                          <div className="text-[10px] text-[#8a8f98]">
                            {pkt.battery_status.toFixed(1)}%
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-white/20">
                          ---
                        </div>
                      )}
                    </div>

                    <div className="font-mono">
                      {pkt ? (
                        <span className={`inline-block rounded px-1 py-0.2 text-[8px] font-semibold ${badge?.bg} ${badge?.text}`}>
                          {pkt.payload_type.substring(0, 3)}
                        </span>
                      ) : (
                        <span className="text-[8px] text-white/10">EMPTY</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3 font-mono text-[11px] text-[#8a8f98]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-[#3d6bff]" /> Occupied
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full border border-white/30" /> Empty
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full border border-[#3d6bff] bg-[#3d6bff]" /> Selected
                </span>
              </div>
              <div className="truncate text-[10px] text-[#3ddc97]">
                {statusMsg}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-white">
                <Layers className="size-3.5 text-[#3d6bff]" />
                <span>CONTIGUOUS RAM MAPPING (WHY AN ARRAY?)</span>
              </div>
              <span className="font-mono text-[10px] text-[#8a8f98]">
                sizeof(TelemetryPacket) = 24B
              </span>
            </div>

            <div className="mt-3 overflow-x-auto pb-1">
              <div className="flex min-w-[620px] items-center gap-1.5 font-mono text-xs">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedSlot(idx)}
                    className={`rounded border px-2.5 py-1.5 text-left transition ${
                      selectedSlot === idx
                        ? "border-[#3d6bff] bg-[#3d6bff]/20 text-white"
                        : "border-white/[0.1] bg-black/40 text-[#8a8f98] hover:text-white"
                    }`}
                  >
                    <div className="text-[9px] text-[#3d6bff]">buf[{idx}]</div>
                    <div className="text-[11px] font-bold text-white">
                      {packets[idx] ? `P${packets[idx].packet_id}` : "EMPTY"}
                    </div>
                    <div className="text-[8px] text-[#8a8f98]">+{idx * 24}B</div>
                  </button>
                ))}
                <div className="px-1 text-white/30">...</div>
                <button
                  onClick={() => setSelectedSlot(1023)}
                  className={`rounded border px-2.5 py-1.5 text-left transition ${
                    selectedSlot === 1023
                      ? "border-[#3d6bff] bg-[#3d6bff]/20 text-white"
                      : "border-white/[0.1] bg-black/40 text-[#8a8f98] hover:text-white"
                  }`}
                >
                  <div className="text-[9px] text-[#3d6bff]">buf[1023]</div>
                  <div className="text-[11px] font-bold text-white">
                    {packets[1023] ? `P${packets[1023].packet_id}` : "EMPTY"}
                  </div>
                  <div className="text-[8px] text-[#8a8f98]">+24552B</div>
                </button>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between font-mono text-[11px] text-[#8a8f98]">
              <span className="flex items-center gap-1">
                <ArrowRight className="size-3 text-[#3d6bff]" />
                <span>Target: <span className="font-semibold text-white">telemetry_buffer[{selectedSlot ?? 0}]</span></span>
              </span>
              <span className="text-[10px] text-[#3d6bff]">
                Address = base_ptr + ({selectedSlot ?? 0} × 24B)
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-4 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <span className="mono-label text-[10px] text-[#3d6bff]">SLOT INSPECTOR</span>
                <h4 className="font-mono text-base font-bold text-white">
                  {selectedSlot !== null ? `telemetry_buffer[${selectedSlot}]` : "No Selection"}
                </h4>
              </div>

              {selectedPacket ? (
                <span className="rounded border border-[#3ddc97]/30 bg-[#3ddc97]/10 px-2 py-0.5 font-mono text-[10px] text-[#3ddc97]">
                  ALLOCATED
                </span>
              ) : selectedSlot !== null ? (
                <span className="rounded border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-[#8a8f98]">
                  EMPTY
                </span>
              ) : null}
            </div>

            {selectedPacket ? (
              <div className="mt-3.5 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-white/[0.08] bg-black/40 p-2.5">
                    <span className="mono-label text-[9px] text-[#8a8f98]">PACKET ID</span>
                    <div className="font-mono text-sm font-bold text-white">
                      {selectedPacket.packet_id}
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/[0.08] bg-black/40 p-2.5">
                    <span className="mono-label text-[9px] text-[#8a8f98]">BATTERY</span>
                    <div className="font-mono text-sm font-bold text-[#3ddc97]">
                      {selectedPacket.battery_status.toFixed(1)}%
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/[0.08] bg-black/40 p-2.5">
                    <span className="mono-label text-[9px] text-[#8a8f98]">TIMESTAMP</span>
                    <div className="font-mono text-xs font-bold text-white">
                      {selectedPacket.timestamp}
                    </div>
                    <div className="truncate text-[9px] text-[#8a8f98]">
                      {new Date(selectedPacket.timestamp * 1000).toISOString().substring(11, 19)} UTC
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/[0.08] bg-black/40 p-2.5">
                    <span className="mono-label text-[9px] text-[#8a8f98]">PAYLOAD</span>
                    <div className="font-mono text-xs font-bold text-[#3d6bff]">
                      {selectedPacket.payload_type}
                    </div>
                    <div className="text-[9px] text-[#8a8f98]">
                      Type 0x0{selectedPacket.payload_type_id}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-white/[0.08] bg-black/30 p-2.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-[#8a8f98]">
                    <span>RAM OFFSET</span>
                    <span className="text-white font-medium">
                      0x{(selectedSlot! * 24).toString(16).toUpperCase().padStart(4, "0")} ({selectedSlot! * 24} bytes)
                    </span>
                  </div>
                </div>

                {selectedPacket.ground_station && (
                  <div className="rounded-lg border border-[#3ddc97]/30 bg-[#3ddc97]/5 p-2.5 font-mono text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#8a8f98]">GROUND STATION</span>
                      <span className="truncate text-white font-medium max-w-[140px]">{selectedPacket.ground_station}</span>
                    </div>
                    {selectedPacket.norad_cat_id && (
                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span className="text-[#8a8f98]">NORAD ID</span>
                        <span className="text-[#3ddc97]">#{selectedPacket.norad_cat_id}</span>
                      </div>
                    )}
                    {selectedPacket.transmitter_mode && (
                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span className="text-[#8a8f98]">RADIO MODE</span>
                        <span className="text-white">{selectedPacket.transmitter_mode}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : selectedSlot !== null ? (
              <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.08] p-6 text-center">
                <Layers className="size-6 text-[#8a8f98] opacity-40" />
                <div className="mt-2 font-mono text-xs text-[#8a8f98]">
                  Slot [{String(selectedSlot).padStart(4, "0")}] is unwritten
                </div>
              </div>
            ) : null}

            <div className="mt-4 border-t border-white/[0.08] pt-3">
              <label htmlFor={inspectInputId} className="mono-label text-[10px] text-[#8a8f98]">
                DIRECT INDEX SEARCH (0–1023)
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id={inspectInputId}
                  type="number"
                  min={0}
                  max={1023}
                  value={inspectIndexInput}
                  onChange={(e) => setInspectIndexInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInspectIndex()}
                  placeholder="Index (0-1023)"
                  className="w-full rounded border border-white/[0.12] bg-black/60 px-3 py-1.5 font-mono text-xs text-white placeholder:text-white/30 focus:border-[#3d6bff] focus:outline-none"
                />
                <button
                  onClick={handleInspectIndex}
                  className="flex shrink-0 items-center gap-1.5 rounded bg-white/[0.08] px-3 py-1.5 font-mono text-xs font-semibold text-white transition hover:bg-white/[0.15]"
                >
                  <Search className="size-3" />
                  <span>INSPECT</span>
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-4 backdrop-blur-md">
            <button
              onClick={() => setCodeOpen(!codeOpen)}
              className="flex w-full items-center justify-between font-mono text-xs text-left"
            >
              <div className="flex items-center gap-2">
                <span className="rounded bg-[#3d6bff]/20 px-1.5 py-0.5 font-bold text-[#3d6bff]">C</span>
                <span className="font-semibold text-white">C STRUCT SPEC</span>
              </div>
              <div className="flex items-center gap-1 text-[#8a8f98]">
                <span className="text-[10px]">{codeOpen ? "HIDE" : "SHOW"}</span>
                {codeOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </div>
            </button>

            {codeOpen && (
              <div className="mt-3 border-t border-white/[0.08] pt-3 font-mono text-[11px] leading-relaxed text-[#8a8f98]">
                <div className="rounded border border-white/[0.08] bg-black/70 p-3 text-white">
                  <div><span className="text-[#3d6bff]">struct</span> <span className="text-white font-semibold">TelemetryPacket</span> {"{"}</div>
                  <div className="pl-3"><span className="text-[#3d6bff]">long</span> packet_id;</div>
                  <div className="pl-3"><span className="text-[#3d6bff]">long long</span> timestamp;</div>
                  <div className="pl-3"><span className="text-[#3d6bff]">float</span> battery_status;</div>
                  <div className="pl-3"><span className="text-[#3d6bff]">int</span> payload_type;</div>
                  <div>{"};"}</div>
                  <div className="mt-2 text-white">
                    <span className="text-[#3d6bff]">struct</span> <span className="text-white font-semibold">TelemetryPacket</span> telemetry_buffer[<span className="text-[#ffb547]">1024</span>];
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-[#8a8f98]">
                  Fixed 24-byte struct × 1024 slots = 24 KB preallocated BSS flight RAM.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
