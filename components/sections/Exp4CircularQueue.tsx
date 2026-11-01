"use client"

import { useState, useEffect, useSyncExternalStore, useCallback, useId } from "react"
import { cn } from "@/lib/utils"
import {
  RotateCcw,
  Send,
  Plus,
  Play,
  Pause,
  Radio,
  Cpu,
  Globe,
  AlertTriangle,
} from "lucide-react"

import { fetchSatnogsTelemetry } from "@/lib/satnogsClient"
import {
  Badge,
  ExperimentHeader,
  GlassPanel,
  GlassTile,
  KeyValue,
  Label,
  Metric,
  PanelHeader,
  ProgressBar,
  StatusLine,
  ToolButton,
  TONE,
  type Tone,
} from "@/components/sections/flight/ui"

const emptySubscribe = () => () => {}
const MAX_PACKETS = 10
const SLOT_ANGLES = Array.from({ length: MAX_PACKETS }, (_, i) => i * (360 / MAX_PACKETS))

interface QueuePacket {
  id: number
  timestamp: number
  voltage: number
  temperature: number
  payload_data: string
}

const SAMPLE_PAYLOADS = [
  "IMU_ATTITUDE_QUAT",
  "GPS_EPHEMERIS_VEC",
  "SOLAR_MAX_TRACK",
  "EPS_BUS_TELEMETRY",
  "STAR_TRACKER_SYNC",
  "UHF_BEACON_MORSE",
  "REACTION_WHEEL_RPM",
  "BATTERY_CELL_BAL",
]

const INITIAL_BUFFER: Array<QueuePacket | null> = [
  { id: 201, timestamp: 1690000000, voltage: 3.7, temperature: 25.5, payload_data: "IMU_ATTITUDE_QUAT" },
  { id: 202, timestamp: 1690000010, voltage: 3.72, temperature: 25.4, payload_data: "GPS_EPHEMERIS_VEC" },
  { id: 203, timestamp: 1690000020, voltage: 3.69, temperature: 25.6, payload_data: "SOLAR_MAX_TRACK" },
  null,
  null,
  null,
  null,
  null,
  null,
  null,
]

export function Exp4CircularQueue() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const statusId = useId()

  const [buffer, setBuffer] = useState<Array<QueuePacket | null>>(INITIAL_BUFFER)
  const [front, setFront] = useState<number>(0)
  const [rear, setRear] = useState<number>(3)
  const [count, setCount] = useState<number>(3)
  const [nextPktId, setNextPktId] = useState<number>(204)
  const [transmittingPkt, setTransmittingPkt] = useState<QueuePacket | null>(null)
  const [wrapMessage, setWrapMessage] = useState<string | null>(null)
  const [autoSimulate, setAutoSimulate] = useState<boolean>(false)
  const [activeSlotPulse, setActiveSlotPulse] = useState<number | null>(null)
  const [wraps, setWraps] = useState<number>(0)
  const [statusMsg, setStatusMsg] = useState<string>("Ring operating · 3/10 slots occupied")
  const [satnogsLoading, setSatnogsLoading] = useState<boolean>(false)

  const enqueue = useCallback(() => {
    if (count >= MAX_PACKETS) {
      setStatusMsg("Queue full · packet rejected (count = 10)")
      return
    }

    const payloadName = SAMPLE_PAYLOADS[nextPktId % SAMPLE_PAYLOADS.length]
    const volt = parseFloat((3.65 + ((nextPktId * 3) % 25) * 0.01).toFixed(2))
    const temp = parseFloat((24.0 + ((nextPktId * 7) % 30) * 0.1).toFixed(1))
    const newPacket: QueuePacket = {
      id: nextPktId,
      timestamp: 1690000000 + nextPktId * 10,
      voltage: volt,
      temperature: temp,
      payload_data: payloadName,
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
      setWraps((w) => w + 1)
      setWrapMessage("REAR WRAPPED → SLOT 0")
      setTimeout(() => setWrapMessage(null), 3200)
    }

    setRear(nextRear)
    setCount((c) => c + 1)
    setNextPktId((id) => id + 1)
    setStatusMsg(
      count + 1 >= MAX_PACKETS
        ? `Ring saturated · ${MAX_PACKETS}/${MAX_PACKETS} slots · enqueue blocked`
        : `Packet ${newPacket.id} written to slot ${targetSlot} · rear → ${nextRear}`
    )

    setTimeout(() => setActiveSlotPulse(null), 700)
  }, [count, rear, nextPktId])

  const fetchSatnogsPacket = async () => {
    if (count >= MAX_PACKETS) {
      setStatusMsg("Queue full · all 10 slots occupied")
      return
    }
    setSatnogsLoading(true)
    setStatusMsg("Querying SatNOGS downlink…")
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
          payload_data: `${sample.ground_station.slice(0, 14)}_${sample.transmitter_mode}`,
        }

        setActiveSlotPulse(targetSlot)
        setBuffer((prev) => {
          const copy = [...prev]
          copy[targetSlot] = newPacket
          return copy
        })

        const nextRear = (rear + 1) % MAX_PACKETS
        if (nextRear === 0 && rear === MAX_PACKETS - 1) {
          setWraps((w) => w + 1)
          setWrapMessage("REAR WRAPPED → SLOT 0")
          setTimeout(() => setWrapMessage(null), 3200)
        }

        setRear(nextRear)
        setCount((c) => c + 1)
        setStatusMsg(
          count + 1 >= MAX_PACKETS
            ? `Ring saturated · ${MAX_PACKETS}/${MAX_PACKETS} slots · enqueue blocked`
            : `SatNOGS packet ${newPacket.id} ingested at slot ${targetSlot}`
        )
        setTimeout(() => setActiveSlotPulse(null), 700)
      }
    } catch {
      setStatusMsg("SatNOGS downlink unavailable · retry")
    } finally {
      setSatnogsLoading(false)
    }
  }

  const dequeue = useCallback(() => {
    if (count === 0) {
      setStatusMsg("Buffer empty · nothing to dequeue")
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
        setWraps((w) => w + 1)
        setWrapMessage("FRONT WRAPPED → SLOT 0")
        setTimeout(() => setWrapMessage(null), 3200)
      }

      setFront(nextFront)
      setCount((c) => Math.max(0, c - 1))
      setStatusMsg(`Packet ${pkt.id} transmitted · front → ${nextFront}`)
      setTransmittingPkt(null)
      setActiveSlotPulse(null)
    }, 520)
  }, [count, front, buffer])

  const handleReset = useCallback(() => {
    setBuffer(INITIAL_BUFFER)
    setFront(0)
    setRear(3)
    setCount(3)
    setNextPktId(204)
    setAutoSimulate(false)
    setWrapMessage(null)
    setWraps(0)
    setTransmittingPkt(null)
    setActiveSlotPulse(null)
    setStatusMsg("Ring restored · 3/10 slots occupied")
  }, [])

  useEffect(() => {
    if (!autoSimulate) return
    const timer = setInterval(() => {
      if (Math.random() > 0.4) enqueue()
      else dequeue()
    }, 1200)
    return () => clearInterval(timer)
  }, [autoSimulate, enqueue, dequeue])

  const isFull = count >= MAX_PACKETS
  const isEmpty = count === 0

  const statusTone: Tone = /full|saturat|empty|unavailable/i.test(statusMsg)
    ? "fair"
    : transmittingPkt
      ? "accent"
      : "good"

  return (
    <div className="flex flex-col gap-4">
      <ExperimentHeader
        code="04"
        tag="ring buffer · FIFO · 10 slots"
        title="Circular Telemetry Queue"
        state={isFull ? "BUFFER FULL" : isEmpty ? "BUFFER EMPTY" : "RING ACTIVE"}
        stateTone={isFull ? "fair" : isEmpty ? "muted" : "good"}
        actions={
          <>
            <ToolButton
              icon={autoSimulate ? Pause : Play}
              variant={autoSimulate ? "danger" : "live"}
              onClick={() => setAutoSimulate(!autoSimulate)}
              active={autoSimulate}
            >
              {autoSimulate ? "Pause sim" : "Auto sim"}
            </ToolButton>
            <ToolButton icon={RotateCcw} onClick={handleReset}>
              Reset
            </ToolButton>
          </>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:items-center sm:gap-7">
            <Metric
              label="Occupancy"
              value={`${count}/${MAX_PACKETS}`}
              tone={isFull ? "fair" : "good"}
            />
            <Metric label="Front" value={`S${front}`} tone="good" sub="dequeue" />
            <Metric label="Rear" value={`S${rear}`} tone="accent" sub="next write" />
            <Metric label="Wraps" value={wraps} tone="fair" sub="recycled cycles" />
          </div>

          <div className="w-full max-w-[220px]">
            <div className="flex items-center justify-between">
              <Label>Ring fill</Label>
              <span
                className={cn(
                  "font-mono text-[9px] tabular-nums transition-colors",
                  isFull ? "text-[#ffb547]" : "text-white/45"
                )}
              >
                {isFull ? "SATURATED" : `${Math.round((count / MAX_PACKETS) * 100)}%`}
              </span>
            </div>
            <ProgressBar
              value={(count / MAX_PACKETS) * 100}
              tone={isFull ? "fair" : "accent"}
              className="mt-1.5"
            />
          </div>
        </div>
      </ExperimentHeader>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <GlassPanel className="p-4 md:p-5 lg:col-span-8">
          <PanelHeader
            icon={Radio}
            title="Ring buffer"
            meta="slots [0..9]"
            right={
              isFull ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ffb547]/45 bg-[#ffb547]/12 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[#ffb547]">
                  <AlertTriangle className="size-2.5" />
                  10/10 · enqueue blocked
                </span>
              ) : wrapMessage ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ffb547]/35 bg-[#ffb547]/10 px-2 py-0.5 font-mono text-[8px] text-[#ffb547]">
                  <AlertTriangle className="size-2.5" />
                  {wrapMessage}
                </span>
              ) : (
                <span className="mono-label text-[8px] text-white/25">
                  rear = (rear + 1) % 10
                </span>
              )
            }
          />

          <div className="relative mx-auto mt-4 aspect-square w-full max-w-[400px]">
            <div
              aria-hidden
              className={cn(
                "absolute inset-0 rounded-full blur-3xl transition-colors duration-700",
                isFull ? "bg-[#ffb547]/[0.12]" : "bg-[#3d6bff]/[0.05]"
              )}
            />

            <svg viewBox="0 0 200 200" className="absolute inset-0 size-full">
              <circle cx="100" cy="100" r="72" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
              <circle
                cx="100"
                cy="100"
                r="72"
                fill="none"
                stroke={isFull ? "rgba(255,181,71,0.45)" : "rgba(61,107,255,0.22)"}
                strokeWidth={isFull ? 0.9 : 0.6}
                strokeDasharray="1.5 5"
                style={{ transition: "stroke 0.5s ease, stroke-width 0.5s ease" }}
              />
              <circle cx="100" cy="100" r="46" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

              {/* rear write head */}
              <g
                style={{
                  transformBox: "view-box",
                  transformOrigin: "100px 100px",
                  transform: `rotate(${SLOT_ANGLES[rear]}deg)`,
                  transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <line x1="100" y1="2" x2="100" y2="9" stroke="#3d6bff" strokeWidth="1.2" />
                <path d="M100 14 L97 8 L103 8 Z" fill="#3d6bff" />
              </g>

              {/* front read head */}
              {count > 0 && (
                <g
                  style={{
                    transformBox: "view-box",
                    transformOrigin: "100px 100px",
                    transform: `rotate(${SLOT_ANGLES[front] + 180}deg)`,
                    transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  <line x1="100" y1="198" x2="100" y2="191" stroke="#3ddc97" strokeWidth="1.2" />
                  <path d="M100 186 L97 192 L103 192 Z" fill="#3ddc97" />
                </g>
              )}
            </svg>

            <div
              className={cn(
                "absolute inset-[26%] flex flex-col items-center justify-center rounded-full border text-center backdrop-blur-xl transition-colors duration-500",
                isFull
                  ? "border-[#ffb547]/45 bg-[#ffb547]/[0.07] shadow-[0_0_44px_-14px_rgba(255,181,71,0.85)]"
                  : "border-white/[0.07] bg-black/50"
              )}
            >
              {isFull && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-full border border-[#ffb547]/50 animate-pulse-ring"
                />
              )}
              <span className="mono-label relative text-[7px] text-white/30">occupancy</span>
              <div
                className={cn(
                  "relative mt-1 font-mono text-2xl font-semibold leading-none tabular-nums transition-colors duration-300",
                  isFull ? "text-[#ffb547]" : "text-white"
                )}
              >
                {count}
                <span className="text-[11px] font-normal text-white/30">/{MAX_PACKETS}</span>
              </div>
              <div className="relative mt-1.5 flex items-center gap-2 font-mono text-[8px]">
                <span className="text-[#3ddc97]">F{front}</span>
                <span className="text-white/15">|</span>
                <span className="text-[#3d6bff]">R{rear}</span>
              </div>
              <div
                className={cn(
                  "relative mt-1 font-mono text-[7px] uppercase tracking-[0.12em] transition-colors",
                  isFull ? "font-bold text-[#ffb547]" : "text-white/20"
                )}
              >
                {isFull ? "saturated" : isEmpty ? "idle" : "streaming"}
              </div>
            </div>

            {Array.from({ length: MAX_PACKETS }).map((_, i) => {
              const angle = (SLOT_ANGLES[i] - 90) * (Math.PI / 180)
              const x = 50 + 36 * Math.cos(angle)
              const y = 50 + 36 * Math.sin(angle)

              const isOccupied = buffer[i] !== null
              const isFront = i === front && count > 0
              const isRear = i === rear
              const isPulsing = activeSlotPulse === i
              const pkt = buffer[i]

              return (
                <div
                  key={i}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  className={cn(
                    "absolute w-[62px] -translate-x-1/2 -translate-y-1/2 rounded-lg border px-1.5 py-1.5 font-mono backdrop-blur-md transition-all duration-300",
                    isOccupied
                      ? isFull
                        ? "border-[#ffb547]/50 bg-gradient-to-br from-[#ffb547]/[0.16] to-black/70"
                        : "border-[#3d6bff]/45 bg-gradient-to-br from-[#3d6bff]/[0.18] to-black/70"
                      : "border-white/[0.07] bg-black/55",
                    isFront && "border-[#3ddc97]/70 shadow-[0_0_22px_-8px_rgba(61,220,151,0.9)]",
                    isRear && !isFront && "border-[#3d6bff]/80 shadow-[0_0_22px_-8px_rgba(61,107,255,1)]",
                    isPulsing && "animate-slot-pop"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] text-white/30">{i}</span>
                    {isFront ? (
                      <span className="rounded bg-[#3ddc97] px-1 text-[6px] font-black text-black">
                        F
                      </span>
                    ) : isRear ? (
                      <span className="rounded bg-[#3d6bff] px-1 text-[6px] font-black text-white">
                        R
                      </span>
                    ) : null}
                  </div>

                  {pkt ? (
                    <div className="mt-1">
                      <div className="truncate text-[9px] font-bold leading-none text-white">
                        P{pkt.id}
                      </div>
                      <div className="mt-1 text-[7px] leading-none text-[#3ddc97]">
                        {pkt.voltage}V
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 text-[7px] leading-none text-white/15">empty</div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <ToolButton
                icon={Plus}
                variant="primary"
                onClick={enqueue}
                disabled={mounted ? count >= MAX_PACKETS : false}
                suppressHydrationWarning
              >
                Enqueue
              </ToolButton>
              <ToolButton
                icon={Globe}
                variant="live"
                onClick={fetchSatnogsPacket}
                disabled={mounted ? satnogsLoading || count >= MAX_PACKETS : false}
                suppressHydrationWarning
              >
                {satnogsLoading ? "Ingesting" : "SatNOGS"}
              </ToolButton>
              <ToolButton
                icon={Send}
                onClick={dequeue}
                disabled={mounted ? count === 0 : false}
                suppressHydrationWarning
              >
                Dequeue (Transmit)
              </ToolButton>
            </div>

            {transmittingPkt && (
              <span className="inline-flex items-center gap-1.5 font-mono text-[9px] text-[#3ddc97]">
                <Radio className="size-3 animate-pulse" />
                downlinking P#{transmittingPkt.id}
              </span>
            )}
          </div>

          <div
            id={statusId}
            className={cn(
              "mt-2 rounded-lg transition-all duration-300",
              isFull && "border border-[#ffb547]/30 bg-[#ffb547]/[0.07] px-2.5 py-1.5"
            )}
          >
            <StatusLine tone={statusTone}>{statusMsg}</StatusLine>
          </div>
        </GlassPanel>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <GlassPanel className="p-4">
            <PanelHeader
              icon={Cpu}
              title="Front slot"
              right={<Badge tone="good">next out</Badge>}
            />

            {buffer[front] ? (
              <div className="mt-3 space-y-2">
                <div className="flex items-end justify-between">
                  <div className="font-mono text-[20px] font-semibold leading-none text-white">
                    P#{buffer[front]?.id}
                  </div>
                  <span className="font-mono text-[9px] text-white/30">
                    slot {front}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <GlassTile className="p-2.5">
                    <Label>Voltage</Label>
                    <div className="mt-1 font-mono text-[12px] text-[#3ddc97]">
                      {buffer[front]?.voltage} V
                    </div>
                  </GlassTile>
                  <GlassTile className="p-2.5">
                    <Label>Temp</Label>
                    <div className="mt-1 font-mono text-[12px] text-[#ffb547]">
                      {buffer[front]?.temperature} °C
                    </div>
                  </GlassTile>
                </div>

                <GlassTile className="p-2.5">
                  <KeyValue k="Payload" v={buffer[front]?.payload_data ?? "—"} tone="accent" />
                  <KeyValue
                    k="Timestamp"
                    v={buffer[front]?.timestamp ?? "—"}
                    tone="muted"
                    className="mt-1.5"
                  />
                </GlassTile>
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center justify-center py-5 text-center">
                <Radio className="size-7 text-white/12" />
                <div className="mt-2 font-mono text-[10px] text-white/40">BUFFER EMPTY</div>
                <div className="mt-1 font-mono text-[9px] text-white/20">
                  enqueue to start the ring
                </div>
              </div>
            )}
          </GlassPanel>

          <GlassPanel soft className="p-4">
            <div className="flex items-center justify-between">
              <span className="mono-label text-[8px] text-[#8a8f98]">Ring anatomy</span>
              <span className="font-mono text-[8px] text-[#3d6bff]">fixed · no malloc</span>
            </div>

            <div className="mt-3 space-y-2 font-mono text-[9px]">
              <div className="flex items-center justify-between rounded-md border border-white/[0.06] bg-black/25 px-2 py-1.5">
                <span className="text-white/35">front</span>
                <span className="text-[#3ddc97]">(front + 1) % 10</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-white/[0.06] bg-black/25 px-2 py-1.5">
                <span className="text-white/35">rear</span>
                <span className="text-[#3d6bff]">(rear + 1) % 10</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-white/[0.06] bg-black/25 px-2 py-1.5">
                <span className="text-white/35">wrap cycles</span>
                <span className={cn(TONE.fair.text)}>{wraps}</span>
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  )
}
