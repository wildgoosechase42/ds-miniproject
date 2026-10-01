"use client"

import { useState, useEffect, useSyncExternalStore, useCallback } from "react"
import { SectionLabel } from "@/components/brand/Brand"
import {
  RotateCcw,
  Send,
  Plus,
  Play,
  Pause,
  AlertTriangle,
  Radio,
  Cpu,
  ChevronDown,
  ChevronUp,
  Globe
} from "lucide-react"

const emptySubscribe = () => () => {}

interface QueuePacket {
  id: number
  timestamp: number
  voltage: number
  temperature: number
  payload_data: string
}

import { fetchSatnogsTelemetry } from "@/lib/satnogsClient"

const MAX_PACKETS = 10
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

const SAMPLE_PAYLOADS = [
  "IMU_ATTITUDE_QUAT",
  "GPS_EPHEMERIS_VEC",
  "SOLAR_MAX_TRACK",
  "EPS_BUS_TELEMETRY",
  "STAR_TRACKER_SYNC",
  "UHF_BEACON_MORSE",
  "REACTION_WHEEL_RPM",
  "BATTERY_CELL_BAL"
]

export function Exp4CircularQueue() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)

  const [buffer, setBuffer] = useState<Array<QueuePacket | null>>([
    { id: 201, timestamp: 1690000000, voltage: 3.70, temperature: 25.5, payload_data: "IMU_ATTITUDE_QUAT" },
    { id: 202, timestamp: 1690000010, voltage: 3.72, temperature: 25.4, payload_data: "GPS_EPHEMERIS_VEC" },
    { id: 203, timestamp: 1690000020, voltage: 3.69, temperature: 25.6, payload_data: "SOLAR_MAX_TRACK" },
    null, null, null, null, null, null, null
  ])

  const [front, setFront] = useState<number>(0)
  const [rear, setRear] = useState<number>(3)
  const [count, setCount] = useState<number>(3)
  const [nextPktId, setNextPktId] = useState<number>(204)
  const [transmittingPkt, setTransmittingPkt] = useState<QueuePacket | null>(null)
  const [wrapMessage, setWrapMessage] = useState<string | null>(null)
  const [autoSimulate, setAutoSimulate] = useState<boolean>(false)
  const [activeSlotPulse, setActiveSlotPulse] = useState<number | null>(null)
  const [statusMsg, setStatusMsg] = useState<string>("Circular buffer operating: 3 slots occupied")
  const [codeOpen, setCodeOpen] = useState<boolean>(false)
  const [satnogsLoading, setSatnogsLoading] = useState<boolean>(false)

  const enqueue = useCallback(() => {
    if (count >= MAX_PACKETS) {
      setStatusMsg("⚠ QUEUE FULL: Incoming telemetry packet rejected (count = 10)")
      return
    }

    const payloadName = SAMPLE_PAYLOADS[(nextPktId) % SAMPLE_PAYLOADS.length]
    const volt = parseFloat((3.65 + ((nextPktId * 3) % 25) * 0.01).toFixed(2))
    const temp = parseFloat((24.0 + ((nextPktId * 7) % 30) * 0.1).toFixed(1))
    const newPacket: QueuePacket = {
      id: nextPktId,
      timestamp: 1690000000 + nextPktId * 10,
      voltage: volt,
      temperature: temp,
      payload_data: payloadName
    }

    const targetSlot = rear
    setActiveSlotPulse(targetSlot)

    setBuffer((prev) => {
      const copy = [...prev]
      copy[targetSlot] = newPacket
      return copy
    })

    const nextRear = (rear + 1) % MAX_PACKETS
    if (nextRear === 0 && rear === MAX_PACKETS - 1) {
      setWrapMessage("REAR WRAPPED AROUND TO SLOT 0")
      setTimeout(() => setWrapMessage(null), 3500)
    }

    setRear(nextRear)
    setCount((c) => c + 1)
    setNextPktId((id) => id + 1)
    setStatusMsg(`ENQUEUE: Packet #${newPacket.id} stored at Slot [${targetSlot}]. rear = (${rear} + 1) % 10 = ${nextRear}`)

    setTimeout(() => {
      setActiveSlotPulse(null)
    }, 500)
  }, [count, rear, nextPktId])

  const fetchSatnogsPacket = async () => {
    if (count >= MAX_PACKETS) {
      setStatusMsg("⚠ QUEUE FULL: Cannot ingest SatNOGS packet, all 10 slots filled")
      return
    }
    setSatnogsLoading(true)
    setStatusMsg("Querying SatNOGS DB for live telemetry downlink...")
    try {
      const data = await fetchSatnogsTelemetry(5)
      if (data.packets && data.packets.length > 0) {
        const sample = data.packets[Math.floor(Math.random() * data.packets.length)]
        const targetSlot = rear
        const newPacket: QueuePacket = {
          id: sample.packet_id % 10000,
          timestamp: sample.timestamp,
          voltage: parseFloat((sample.battery_status / 24.0).toFixed(2)),
          temperature: parseFloat((20.0 + (sample.packet_id % 150) * 0.1).toFixed(1)),
          payload_data: `${sample.ground_station.slice(0, 14)}_${sample.transmitter_mode}`
        }

        setActiveSlotPulse(targetSlot)
        setBuffer((prev) => {
          const copy = [...prev]
          copy[targetSlot] = newPacket
          return copy
        })

        const nextRear = (rear + 1) % MAX_PACKETS
        if (nextRear === 0 && rear === MAX_PACKETS - 1) {
          setWrapMessage("REAR WRAPPED AROUND TO SLOT 0")
          setTimeout(() => setWrapMessage(null), 3500)
        }

        setRear(nextRear)
        setCount((c) => c + 1)
        setStatusMsg(`SatNOGS packet #${newPacket.id} ingested at circular slot [${targetSlot}]. rear = ${nextRear}`)
        setTimeout(() => setActiveSlotPulse(null), 500)
      }
    } catch {
      setStatusMsg("Failed to connect to SatNOGS endpoint")
    } finally {
      setSatnogsLoading(false)
    }
  }

  const dequeue = useCallback(() => {
    if (count === 0) {
      setStatusMsg("BUFFER EMPTY: Cannot dequeue from empty buffer")
      return
    }

    const targetSlot = front
    const pkt = buffer[targetSlot]
    if (!pkt) return

    setTransmittingPkt(pkt)
    setActiveSlotPulse(targetSlot)

    setTimeout(() => {
      setBuffer((prev) => {
        const copy = [...prev]
        copy[targetSlot] = null
        return copy
      })

      const nextFront = (front + 1) % MAX_PACKETS
      if (nextFront === 0 && front === MAX_PACKETS - 1) {
        setWrapMessage("FRONT WRAPPED AROUND TO SLOT 0")
        setTimeout(() => setWrapMessage(null), 3500)
      }

      setFront(nextFront)
      setCount((c) => Math.max(0, c - 1))
      setStatusMsg(`DEQUEUE: Packet #${pkt.id} transmitted to Ground Station. front = (${front} + 1) % 10 = ${nextFront}`)
      setTransmittingPkt(null)
      setActiveSlotPulse(null)
    }, 450)
  }, [count, front, buffer])

  const handleReset = useCallback(() => {
    setBuffer([
      { id: 201, timestamp: 1690000000, voltage: 3.70, temperature: 25.5, payload_data: "IMU_ATTITUDE_QUAT" },
      { id: 202, timestamp: 1690000010, voltage: 3.72, temperature: 25.4, payload_data: "GPS_EPHEMERIS_VEC" },
      { id: 203, timestamp: 1690000020, voltage: 3.69, temperature: 25.6, payload_data: "SOLAR_MAX_TRACK" },
      null, null, null, null, null, null, null
    ])
    setFront(0)
    setRear(3)
    setCount(3)
    setNextPktId(204)
    setAutoSimulate(false)
    setWrapMessage(null)
    setStatusMsg("Circular queue restored to default 3 packets")
  }, [])

  useEffect(() => {
    if (!autoSimulate) return
    const timer = setInterval(() => {
      if (Math.random() > 0.4) {
        enqueue()
      } else {
        dequeue()
      }
    }, 1200)
    return () => clearInterval(timer)
  }, [autoSimulate, enqueue, dequeue])

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <SectionLabel accent>EXPERIMENT 04</SectionLabel>
              <span className="rounded border border-white/[0.12] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#8a8f98]">
                DATA STRUCTURE / CIRCULAR QUEUE / FIFO
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#3ddc97]">
                <span className={`size-1.5 rounded-full ${count === 10 ? "bg-[#ff5c7a]" : count === 0 ? "bg-[#ffb547]" : "bg-[#3ddc97]"}`} />
                {count === 10 ? "BUFFER FULL" : count === 0 ? "BUFFER EMPTY" : "BUFFER ACTIVE"}
              </span>
            </div>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-white md:text-2xl">
              CIRCULAR TELEMETRY QUEUE
            </h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#8a8f98]">
              Explore how a fixed-size circular queue efficiently buffers telemetry packets using limited onboard memory.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAutoSimulate(!autoSimulate)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 font-mono text-xs font-semibold transition ${
                autoSimulate
                  ? "border-[#ffb547]/60 bg-[#ffb547]/15 text-[#ffb547]"
                  : "border-white/[0.12] bg-white/[0.04] text-[#8a8f98] hover:text-white"
              }`}
            >
              {autoSimulate ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              <span>{autoSimulate ? "PAUSE SIM" : "AUTO SIMULATE"}</span>
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

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] pt-3 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#8a8f98]">FORMULA:</span>
            <span className="text-[#3d6bff]">rear = (rear + 1) % MAX_PACKETS</span>
            <span className="text-white/40">·</span>
            <span className="text-[#3ddc97]">front = (front + 1) % MAX_PACKETS</span>
          </div>

          {wrapMessage && (
            <div className="inline-flex items-center gap-1.5 rounded bg-[#ffb547]/20 px-2 py-0.5 text-[#ffb547] animate-pulse">
              <AlertTriangle className="size-3" />
              <span>{wrapMessage}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4">
          <div className="mono-label text-[10px] text-[#8a8f98]">CAPACITY</div>
          <div className="mt-1 font-mono text-xl font-bold text-white">{MAX_PACKETS}</div>
          <div className="text-[10px] font-mono text-[#8a8f98]">Fixed Ring Size</div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4">
          <div className="mono-label text-[10px] text-[#8a8f98]">CURRENT COUNT</div>
          <div className="mt-1 font-mono text-xl font-bold text-[#3ddc97]">{count} / {MAX_PACKETS}</div>
          <div className="text-[10px] font-mono text-[#8a8f98]">{count === 10 ? "100% Full" : count === 0 ? "Empty" : "Active slots"}</div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4">
          <div className="mono-label text-[10px] text-[#8a8f98]">FRONT POINTER</div>
          <div className="mt-1 font-mono text-xl font-bold text-[#3ddc97]">SLOT {front}</div>
          <div className="text-[10px] font-mono text-[#8a8f98]">Dequeue Position</div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4">
          <div className="mono-label text-[10px] text-[#8a8f98]">REAR POINTER</div>
          <div className="mt-1 font-mono text-xl font-bold text-[#3d6bff]">SLOT {rear}</div>
          <div className="text-[10px] font-mono text-[#8a8f98]">Next Insertion</div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4">
          <div className="mono-label text-[10px] text-[#8a8f98]">MEMORY ALLOC</div>
          <div className="mt-1 font-mono text-xl font-bold text-white">FIXED</div>
          <div className="text-[10px] font-mono text-[#8a8f98]">Zero malloc/free</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Radio className="size-4 text-[#3d6bff]" />
                <span className="font-mono text-xs font-semibold tracking-wider text-white uppercase">
                  CIRCULAR BUFFER SLOTS [0..9]
                </span>
              </div>
              <span className="font-mono text-[11px] text-[#8a8f98]">{statusMsg}</span>
            </div>

            <div className="mt-6 flex flex-col items-center justify-center">
              <div className="relative size-[340px] md:size-[380px] rounded-full border border-white/[0.1] bg-black/50 flex items-center justify-center">
                <div className="absolute inset-8 rounded-full border border-dashed border-white/[0.06]" />

                <div className="absolute z-10 flex flex-col items-center justify-center text-center p-4">
                  <div className="text-[10px] font-mono text-[#8a8f98] uppercase">CIRCULAR QUEUE</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-white">
                    {count} <span className="text-xs text-[#8a8f98]">/ {MAX_PACKETS}</span>
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-[#3ddc97]">
                    {count === 10 ? "10/10 PACKETS (FULL)" : count === 0 ? "BUFFER EMPTY" : "FIFO RING"}
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-[10px] font-mono">
                    <span className="text-[#3ddc97]">F: {front}</span>
                    <span className="text-white/30">|</span>
                    <span className="text-[#3d6bff]">R: {rear}</span>
                  </div>
                </div>

                {Array.from({ length: MAX_PACKETS }).map((_, i) => {
                  const angle = (i * (360 / MAX_PACKETS) - 90) * (Math.PI / 180)
                  const radius = 135
                  const x = Math.round(170 + radius * Math.cos(angle))
                  const y = Math.round(170 + radius * Math.sin(angle))

                  const isOccupied = buffer[i] !== null
                  const isFront = i === front && count > 0
                  const isRear = i === rear
                  const isPulsing = activeSlotPulse === i
                  const pkt = buffer[i]

                  return (
                    <div
                      key={i}
                      style={{ left: `${x}px`, top: `${y}px` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border p-2 transition-all duration-300 w-[68px] ${
                        isOccupied
                          ? "border-[#3d6bff]/60 bg-gradient-to-br from-[#3d6bff]/20 to-black/80 shadow-md shadow-[#3d6bff]/15"
                          : "border-white/[0.08] bg-black/80"
                      } ${isPulsing ? "scale-110 ring-2 ring-[#3ddc97]" : "scale-100"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9px] font-bold text-[#8a8f98]">#{i}</span>
                        {isFront && (
                          <span className="rounded bg-[#3ddc97] px-1 text-[8px] font-black text-black">
                            FRONT
                          </span>
                        )}
                        {isRear && (
                          <span className="rounded bg-[#3d6bff] px-1 text-[8px] font-black text-white">
                            REAR
                          </span>
                        )}
                      </div>

                      {pkt ? (
                        <div className="mt-1 font-mono text-[9px]">
                          <div className="font-bold text-white truncate">P#{pkt.id}</div>
                          <div className="text-[#3ddc97] text-[8px]">{pkt.voltage}V</div>
                        </div>
                      ) : (
                        <div className="mt-1 font-mono text-[8px] text-white/20">EMPTY</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={enqueue}
                  disabled={mounted ? count >= MAX_PACKETS : false}
                  suppressHydrationWarning
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#3d6bff] px-4 py-2 font-mono text-xs font-semibold text-white shadow-md shadow-[#3d6bff]/25 transition hover:bg-[#3d6bff]/90 active:scale-95 disabled:opacity-40"
                >
                  <Plus className="size-3.5" />
                  <span>[ ENQUEUE PACKET ]</span>
                </button>

                <button
                  onClick={fetchSatnogsPacket}
                  disabled={mounted ? satnogsLoading || count >= MAX_PACKETS : false}
                  suppressHydrationWarning
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#3ddc97]/40 bg-[#3ddc97]/10 px-3.5 py-2 font-mono text-xs font-semibold text-[#3ddc97] transition hover:bg-[#3ddc97]/20 active:scale-95 disabled:opacity-40"
                >
                  <Globe className={`size-3.5 ${satnogsLoading ? "animate-spin" : ""}`} />
                  <span>{satnogsLoading ? "INGESTING..." : "PULL SATNOGS DB"}</span>
                </button>

                <button
                  onClick={dequeue}
                  disabled={mounted ? count === 0 : false}
                  suppressHydrationWarning
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] px-4 py-2 font-mono text-xs font-semibold text-white transition hover:bg-white/[0.08] active:scale-95 disabled:opacity-40"
                >
                  <Send className="size-3.5" />
                  <span>[ TRANSMIT / DEQUEUE ]</span>
                </button>
              </div>

              {transmittingPkt && (
                <div className="inline-flex items-center gap-2 rounded bg-black/60 px-3 py-1 font-mono text-xs text-[#3ddc97]">
                  <Globe className="size-3.5 animate-spin" />
                  <span>Downlinking Packet #{transmittingPkt.id} to 🌍 Ground Station...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="size-4 text-[#3ddc97]" />
                <span className="font-mono text-xs font-semibold tracking-wider text-white uppercase">
                  SLOT INSPECTION
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#8a8f98]">SLOT AT FRONT</span>
            </div>

            {buffer[front] ? (
              <div className="mt-4 space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-black/40 p-2.5">
                  <span className="text-[#8a8f98]">PACKET ID:</span>
                  <span className="text-white font-bold">#{buffer[front]?.id}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-black/40 p-2.5">
                  <span className="text-[#8a8f98]">TIMESTAMP:</span>
                  <span className="text-white">{buffer[front]?.timestamp}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-black/40 p-2.5">
                  <span className="text-[#8a8f98]">BATTERY VOLTAGE:</span>
                  <span className="text-[#3ddc97] font-semibold">{buffer[front]?.voltage} V</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-black/40 p-2.5">
                  <span className="text-[#8a8f98]">TEMPERATURE:</span>
                  <span className="text-[#ffb547] font-semibold">{buffer[front]?.temperature} °C</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-black/40 p-2.5">
                  <span className="text-[#8a8f98]">PAYLOAD DATA:</span>
                  <span className="text-[#3d6bff] font-semibold">{buffer[front]?.payload_data}</span>
                </div>
              </div>
            ) : (
              <div className="mt-8 flex flex-col items-center justify-center py-6 text-center font-mono">
                <Radio className="size-8 text-[#8a8f98] opacity-50" />
                <div className="mt-2 text-xs font-semibold text-[#8a8f98]">BUFFER EMPTY</div>
                <div className="text-[11px] text-[#8a8f98]">Queue is empty. Enqueue telemetry packets.</div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <span className="font-mono text-xs font-semibold text-white uppercase">
                MEMORY EFFICIENCY: LINEAR VS CIRCULAR
              </span>
            </div>

            <div className="mt-3 space-y-3 font-mono text-[11px] text-[#8a8f98]">
              <p>
                A circular queue reuses previously freed slots instead of requiring a new memory allocation for every packet.
              </p>

              <div className="rounded-lg border border-white/[0.08] bg-black/40 p-2.5">
                <div className="text-white font-semibold text-[10px]">LINEAR BUFFER (Inefficient):</div>
                <div className="mt-1 text-[#ff5c7a]">[USED] [USED] [EMPTY] [EMPTY]</div>
                <div className="text-[10px] text-white/50">Cannot reuse slot 0-1 without shifting entire array.</div>
              </div>

              <div className="rounded-lg border border-white/[0.08] bg-black/40 p-2.5">
                <div className="text-white font-semibold text-[10px]">CIRCULAR BUFFER (Efficient):</div>
                <div className="mt-1 text-[#3ddc97]">[NEW] [NEW] [EMPTY] [USED] [USED]</div>
                <div className="text-[10px] text-white/50">REAR wraps back to index 0, recycling freed memory.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-4 backdrop-blur-md">
        <button
          onClick={() => setCodeOpen(!codeOpen)}
          className="flex w-full items-center justify-between font-mono text-xs font-semibold text-white"
        >
          <div className="flex items-center gap-2">
            <Cpu className="size-4 text-[#3d6bff]" />
            <span>VIEW C IMPLEMENTATION (CircularQueue.c)</span>
          </div>
          {codeOpen ? <ChevronUp className="size-4 text-[#8a8f98]" /> : <ChevronDown className="size-4 text-[#8a8f98]" />}
        </button>

        {codeOpen && (
          <div className="mt-4 rounded-lg border border-white/[0.08] bg-black/80 p-4 font-mono text-xs leading-relaxed text-[#8a8f98]">
            <pre className="overflow-x-auto text-[11px]">
              <code>{`#define MAX_PACKETS 10

typedef struct TelemetryPacket {
    unsigned long timestamp;
    float battery_voltage;
    float temperature;
    char payload_data[32];
} TelemetryPacket;

typedef struct TelemetryQueue {
    TelemetryPacket buffer[MAX_PACKETS];
    int front;
    int rear;
    int count;
} TelemetryQueue;

void enqueue(TelemetryQueue* q, TelemetryPacket pkt) {
    if (q->count == MAX_PACKETS) return; // Buffer full
    q->buffer[q->rear] = pkt;
    q->rear = (q->rear + 1) % MAX_PACKETS;
    q->count++;
}

TelemetryPacket dequeue(TelemetryQueue* q) {
    TelemetryPacket pkt = q->buffer[q->front];
    q->front = (q->front + 1) % MAX_PACKETS;
    q->count--;
    return pkt;
}`}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
