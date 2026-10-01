"use client"

import { useState, useEffect, useCallback, useId, useSyncExternalStore } from "react"
import { SectionLabel } from "@/components/brand/Brand"

const emptySubscribe = () => () => {}
import {
  Layers,
  Send,
  Plus,
  RotateCcw,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Cpu,
  Radio,
  Sliders,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle2,
  Share2,
  Globe
} from "lucide-react"

import { fetchSatnogsTelemetry } from "@/lib/satnogsClient"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

interface DynamicNode {
  packet_id: number
  timestamp: number
  sensor_id: number
  measurement_value: number
  mem_address: string
  next_address: string
}

const INITIAL_NODES: DynamicNode[] = [
  { packet_id: 101, timestamp: 1690000000, sensor_id: 4, measurement_value: 98.6, mem_address: "0x7FA1", next_address: "0x7FA2" },
  { packet_id: 102, timestamp: 1690000015, sensor_id: 7, measurement_value: 22.1, mem_address: "0x7FA2", next_address: "0x7FA3" },
  { packet_id: 103, timestamp: 1690000030, sensor_id: 2, measurement_value: 0.0, mem_address: "0x7FA3", next_address: "NULL" }
]

export function Exp2DynamicBuffer() {
  const genSliderId = useId()
  const txSliderId = useId()
  const [nodes, setNodes] = useState<DynamicNode[]>(INITIAL_NODES)
  const [nextPktId, setNextPktId] = useState<number>(104)
  const [lastTs, setLastTs] = useState<number>(1690000045)
  const [showPointers, setShowPointers] = useState<boolean>(true)
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [genRate, setGenRate] = useState<number>(2)
  const [txRate, setTxRate] = useState<number>(1)
  const [transmittingPkt, setTransmittingPkt] = useState<DynamicNode | null>(null)
  const [justEnqueuedId, setJustEnqueuedId] = useState<number | null>(null)
  const [codeOpen, setCodeOpen] = useState<boolean>(false)
  const [statusMsg, setStatusMsg] = useState<string>("Dynamic linked buffer active: 3 nodes in heap")
  const [txLog, setTxLog] = useState<DynamicNode[]>([])
  const [satnogsLoading, setSatnogsLoading] = useState<boolean>(false)
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)

  const syncEnqueue = useCallback(async (node: DynamicNode) => {
    try {
      await fetch(`${API_BASE}/api/exp2/enqueue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packet_id: node.packet_id,
          timestamp: node.timestamp,
          sensor_id: node.sensor_id,
          measurement_value: node.measurement_value
        })
      })
    } catch {}
  }, [])

  const syncDequeue = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/exp2/dequeue`, { method: "POST" })
    } catch {}
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      INITIAL_NODES.forEach((node) => {
        syncEnqueue(node)
      })
    }, 0)
    return () => clearTimeout(t)
  }, [syncEnqueue])

  const enqueuePacket = useCallback(() => {
    const sensor = ((nextPktId % 8) + 1)
    const val = parseFloat(((nextPktId * 7.3) % 100).toFixed(1))
    const ts = lastTs + Math.floor(Math.random() * 12 + 8)
    const newAddr = `0x7F${(nextPktId * 7).toString(16).toUpperCase().padStart(2, "0")}`

    const newNode: DynamicNode = {
      packet_id: nextPktId,
      timestamp: ts,
      sensor_id: sensor,
      measurement_value: val,
      mem_address: newAddr,
      next_address: "NULL"
    }

    setJustEnqueuedId(nextPktId)
    setNextPktId((p) => p + 1)
    setLastTs(ts)

    setNodes((prev) => {
      if (prev.length === 0) {
        return [newNode]
      }
      const updated = prev.map((item, idx) => {
        if (idx === prev.length - 1) {
          return { ...item, next_address: newAddr }
        }
        return item
      })
      return [...updated, newNode]
    })

    setStatusMsg(`malloc() allocated node ${newAddr} for Packet #${nextPktId} → tail updated`)
    syncEnqueue(newNode)

    setTimeout(() => {
      setJustEnqueuedId(null)
    }, 450)
  }, [nextPktId, lastTs, syncEnqueue])

  const fetchFromSatnogs = async () => {
    setSatnogsLoading(true)
    setStatusMsg("Querying SatNOGS Open Telemetry Network for live orbital packets...")
    try {
      const data = await fetchSatnogsTelemetry(5)
      if (data.packets && data.packets.length > 0) {
        const sample = data.packets[Math.floor(Math.random() * data.packets.length)]
        const newAddr = `0x7F${(sample.packet_id % 255).toString(16).toUpperCase().padStart(2, "0")}`
        const newNode: DynamicNode = {
          packet_id: sample.packet_id,
          timestamp: sample.timestamp,
          sensor_id: sample.payload_type_id || 3,
          measurement_value: sample.battery_status,
          mem_address: newAddr,
          next_address: "NULL"
        }

        setNodes((prev) => {
          if (prev.length === 0) return [newNode]
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            next_address: newAddr
          }
          return [...updated, newNode]
        })

        setJustEnqueuedId(sample.packet_id)
        setTimeout(() => setJustEnqueuedId(null), 1000)
        syncEnqueue(newNode)
        setStatusMsg(`SatNOGS live packet #${sample.packet_id} (${sample.ground_station}) enqueued to linked list TAIL`)
      }
    } catch {
      setStatusMsg("Failed to connect to SatNOGS DB endpoint")
    } finally {
      setSatnogsLoading(false)
    }
  }

  const dequeuePacket = useCallback(() => {
    if (nodes.length === 0) {
      setStatusMsg("Underflow: Buffer is empty (head == NULL)")
      return
    }

    const headPkt = nodes[0]
    setTransmittingPkt(headPkt)
    setTxLog((prev) => [headPkt, ...prev].slice(0, 4))
    syncDequeue()

    setNodes((prev) => prev.slice(1))
    setStatusMsg(`Transmitted Packet #${headPkt.packet_id} to Ground Station → free(${headPkt.mem_address}) called`)

    setTimeout(() => {
      setTransmittingPkt(null)
    }, 600)
  }, [nodes, syncDequeue])

  useEffect(() => {
    if (!isSimulating) return

    const genIntervalMs = Math.max(400, Math.floor(2500 / genRate))
    const txIntervalMs = Math.max(400, Math.floor(2500 / txRate))

    const genTimer = setInterval(() => {
      enqueuePacket()
    }, genIntervalMs)

    const txTimer = setInterval(() => {
      dequeuePacket()
    }, txIntervalMs)

    return () => {
      clearInterval(genTimer)
      clearInterval(txTimer)
    }
  }, [isSimulating, genRate, txRate, enqueuePacket, dequeuePacket])

  const handleReset = () => {
    setIsSimulating(false)
    setNodes([])
    setNextPktId(101)
    setLastTs(1690000000)
    setTxLog([])
    setStatusMsg("Buffer cleared. Head → NULL, Tail → NULL.")
  }

  const headNode = nodes.length > 0 ? nodes[0] : null
  const tailNode = nodes.length > 0 ? nodes[nodes.length - 1] : null
  const currentSize = nodes.length

  const simState =
    currentSize === 0
      ? "EMPTY"
      : genRate > txRate
      ? "BACKLOG"
      : txRate > genRate
      ? "DRAINING"
      : "EQUILIBRIUM"

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <SectionLabel accent>EXPERIMENT 02</SectionLabel>
              <span className="rounded border border-white/[0.12] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#8a8f98]">
                DATA STRUCTURE / LINKED LIST
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#3ddc97]">
                <span className={`size-1.5 rounded-full ${currentSize > 0 ? "bg-[#3ddc97]" : "bg-[#ff5c7a]"}`} />
                {currentSize > 0 ? "HEAP ALLOCATED" : "BUFFER EMPTY"}
              </span>
            </div>
            <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-white md:text-2xl">
              DYNAMIC TELEMETRY BUFFER
            </h3>
            <p className="mt-0.5 text-xs text-[#8a8f98]">
              Visualize how a linked list dynamically buffers incoming satellite telemetry packets when generation is unpredictable.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={enqueuePacket}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3d6bff] px-3.5 py-2 font-mono text-xs font-semibold text-white shadow-md shadow-[#3d6bff]/20 transition hover:bg-[#3d6bff]/90 active:scale-95"
            >
              <Plus className="size-3.5" />
              <span>+ GENERATE PACKET</span>
            </button>

            <button
              onClick={fetchFromSatnogs}
              disabled={mounted ? satnogsLoading : false}
              suppressHydrationWarning
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#3ddc97]/40 bg-[#3ddc97]/10 px-3.5 py-2 font-mono text-xs font-semibold text-[#3ddc97] transition hover:bg-[#3ddc97]/20 active:scale-95 disabled:opacity-40"
            >
              <Globe className={`size-3.5 ${satnogsLoading ? "animate-spin" : ""}`} />
              <span>{satnogsLoading ? "PULLING SATNOGS..." : "PULL SATNOGS DB"}</span>
            </button>

            <button
              onClick={dequeuePacket}
              disabled={mounted ? currentSize === 0 : false}
              suppressHydrationWarning
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3.5 py-2 font-mono text-xs font-semibold text-white transition hover:bg-white/[0.08] active:scale-95 disabled:opacity-40"
            >
              <Send className="size-3.5" />
              <span>TRANSMIT NEXT PACKET</span>
            </button>

            <button
              onClick={() => setShowPointers(!showPointers)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-mono text-xs transition ${
                showPointers
                  ? "border-[#3d6bff]/60 bg-[#3d6bff]/15 text-[#3d6bff]"
                  : "border-white/[0.12] bg-white/[0.04] text-[#8a8f98] hover:text-white"
              }`}
            >
              <Share2 className="size-3.5" />
              <span>{showPointers ? "POINTERS: ON" : "POINTERS: OFF"}</span>
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

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs">
          <div className="rounded-lg border border-white/[0.08] bg-black/40 p-3">
            <span className="text-[10px] text-[#8a8f98]">PACKETS IN BUFFER</span>
            <div className="mt-0.5 text-base font-bold text-white">
              {currentSize} <span className="text-xs font-normal text-[#8a8f98]">nodes</span>
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-black/40 p-3">
            <span className="text-[10px] text-[#8a8f98]">HEAD POINTER</span>
            <div className="mt-0.5 text-base font-bold text-[#3d6bff]">
              {headNode ? `P${headNode.packet_id}` : "NULL"}
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-black/40 p-3">
            <span className="text-[10px] text-[#8a8f98]">TAIL POINTER</span>
            <div className="mt-0.5 text-base font-bold text-[#3ddc97]">
              {tailNode ? `P${tailNode.packet_id}` : "NULL"}
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-black/40 p-3">
            <span className="text-[10px] text-[#8a8f98]">BUFFER STATUS</span>
            <div className={`mt-0.5 text-base font-bold ${
              currentSize === 0 ? "text-[#ff5c7a]" : currentSize > 8 ? "text-[#ffb547]" : "text-[#3ddc97]"
            }`}>
              {currentSize === 0 ? "BUFFER EMPTY" : currentSize > 8 ? "BACKLOG HIGH" : "ACTIVE"}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-[#3d6bff]" />
            <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
              DYNAMIC HEAP LINKED LIST
            </h4>
            <span className="font-mono text-[11px] text-[#8a8f98]">
              (HEAD ───→ TAIL ───→ NULL)
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            {headNode && (
              <span className="flex items-center gap-1 rounded bg-[#3d6bff]/15 px-2 py-0.5 text-[#3d6bff] border border-[#3d6bff]/30">
                HEAD = {headNode.mem_address}
              </span>
            )}
            {tailNode && (
              <span className="flex items-center gap-1 rounded bg-[#3ddc97]/15 px-2 py-0.5 text-[#3ddc97] border border-[#3ddc97]/30">
                TAIL = {tailNode.mem_address}
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 min-h-[220px] overflow-x-auto pb-4 pt-8">
          {nodes.length > 0 ? (
            <div className="flex items-center gap-3 min-w-max px-2">
              {nodes.map((node, index) => {
                const isHead = index === 0
                const isTail = index === nodes.length - 1
                const isNew = justEnqueuedId === node.packet_id

                return (
                  <div key={node.packet_id} className="relative flex items-center">
                    {isHead && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <span className="rounded bg-[#3d6bff] px-1.5 py-0.2 font-mono text-[9px] font-bold text-white shadow-sm shadow-[#3d6bff]/40">
                          HEAD
                        </span>
                        <div className="h-2 w-px bg-[#3d6bff]" />
                      </div>
                    )}

                    {isTail && (
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <div className="h-2 w-px bg-[#3ddc97]" />
                        <span className="rounded bg-[#3ddc97] px-1.5 py-0.2 font-mono text-[9px] font-bold text-black shadow-sm shadow-[#3ddc97]/40">
                          TAIL
                        </span>
                      </div>
                    )}

                    <div
                      className={`relative flex w-48 flex-col justify-between rounded-xl border p-3 font-mono transition-all duration-300 ${
                        isNew
                          ? "border-[#3ddc97] bg-[#3ddc97]/15 ring-2 ring-[#3ddc97] scale-105"
                          : isHead
                          ? "border-[#3d6bff] bg-[#3d6bff]/10 shadow-lg shadow-[#3d6bff]/15"
                          : "border-white/[0.14] bg-black/60 hover:border-white/[0.3] hover:bg-black/80"
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                        <span className="text-xs font-bold text-white">
                          Packet #{node.packet_id}
                        </span>
                        {showPointers && (
                          <span className="text-[10px] text-[#3d6bff]">
                            {node.mem_address}
                          </span>
                        )}
                      </div>

                      <div className="my-2 space-y-1 text-[11px]">
                        <div className="flex justify-between text-[#8a8f98]">
                          <span>Sensor:</span>
                          <span className="text-white font-medium">#{node.sensor_id}</span>
                        </div>
                        <div className="flex justify-between text-[#8a8f98]">
                          <span>Value:</span>
                          <span className="text-[#3ddc97] font-semibold">{node.measurement_value}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-[#8a8f98]">
                          <span>Time:</span>
                          <span className="text-white/80">{node.timestamp}</span>
                        </div>
                      </div>

                      {showPointers && (
                        <div className="rounded border border-white/[0.08] bg-black/80 px-2 py-1 text-[10px]">
                          <span className="text-[#8a8f98]">next: </span>
                          <span className={node.next_address === "NULL" ? "text-[#ff5c7a] font-bold" : "text-[#3d6bff] font-semibold"}>
                            {node.next_address}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center px-1.5">
                      <div className="h-0.5 w-5 bg-gradient-to-r from-white/30 to-[#3d6bff]" />
                      <ArrowRight className="size-3.5 -ml-1 text-[#3d6bff]" />
                    </div>
                  </div>
                )
              })}

              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.15] bg-black/30 px-4 py-3 font-mono text-xs text-[#ff5c7a]">
                <span className="font-bold">NULL</span>
                <span className="text-[9px] text-[#8a8f98]">(End of List)</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center font-mono">
              <Layers className="size-8 text-[#8a8f98] opacity-40" />
              <div className="mt-3 text-sm font-semibold text-white">
                No telemetry packets are currently buffered.
              </div>
              <p className="mt-1 max-w-sm text-xs text-[#8a8f98]">
                Head → NULL and Tail → NULL. Dynamic memory has zero heap footprint until a packet arrives.
              </p>
              <button
                onClick={enqueuePacket}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#3d6bff] px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-[#3d6bff]/20 transition hover:bg-[#3d6bff]/90"
              >
                <Plus className="size-3.5" />
                <span>Allocate First Node</span>
              </button>
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-white/[0.06] pt-3 font-mono text-[11px] text-[#8a8f98]">
          <span className="truncate text-[#3ddc97]">
            {statusMsg}
          </span>
          <span className="hidden sm:inline text-white/40">
            Enqueue O(1) · Dequeue O(1)
          </span>
        </div>
      </div>

      {transmittingPkt && (
        <div className="flex items-center justify-between rounded-xl border border-[#3ddc97]/40 bg-[#3ddc97]/10 p-3.5 font-mono text-xs animate-pulse">
          <div className="flex items-center gap-2">
            <Radio className="size-4 text-[#3ddc97] animate-spin" />
            <span className="text-white font-medium">
              DOWNLINK TRANSMITTING: Packet #{transmittingPkt.packet_id} (Sensor #{transmittingPkt.sensor_id}: {transmittingPkt.measurement_value})
            </span>
          </div>
          <div className="flex items-center gap-2 text-[#3ddc97]">
            <span>───→</span>
            <span>🌍 GROUND STATION (RECEIVED)</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md lg:col-span-7">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold text-white uppercase tracking-wider">
              <Sliders className="size-4 text-[#3d6bff]" />
              <span>VARIABLE TELEMETRY FLOW SIMULATION</span>
            </div>

            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 font-mono text-xs font-semibold transition ${
                isSimulating
                  ? "bg-[#ff5c7a]/20 text-[#ff5c7a] border border-[#ff5c7a]/40"
                  : "bg-[#3ddc97]/20 text-[#3ddc97] border border-[#3ddc97]/40"
              }`}
            >
              {isSimulating ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              <span>{isSimulating ? "STOP FLOW" : "RUN FLOW SIM"}</span>
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 font-mono text-xs">
            <div className="rounded-lg border border-white/[0.08] bg-black/40 p-3">
              <div className="flex justify-between text-[#8a8f98]">
                <label htmlFor={genSliderId} className="cursor-pointer">PACKET GENERATION RATE</label>
                <span className="text-white font-bold">{genRate} pkt/s</span>
              </div>
              <input
                id={genSliderId}
                type="range"
                min={1}
                max={5}
                value={genRate}
                onChange={(e) => setGenRate(parseInt(e.target.value, 10))}
                className="mt-2 w-full accent-[#3d6bff]"
              />
              <div className="mt-1 flex justify-between text-[10px] text-[#8a8f98]">
                <span>Slow (1)</span>
                <span>Fast (5)</span>
              </div>
            </div>

            <div className="rounded-lg border border-white/[0.08] bg-black/40 p-3">
              <div className="flex justify-between text-[#8a8f98]">
                <label htmlFor={txSliderId} className="cursor-pointer">DOWNLINK TX RATE</label>
                <span className="text-white font-bold">{txRate} pkt/s</span>
              </div>
              <input
                id={txSliderId}
                type="range"
                min={1}
                max={5}
                value={txRate}
                onChange={(e) => setTxRate(parseInt(e.target.value, 10))}
                className="mt-2 w-full accent-[#3ddc97]"
              />
              <div className="mt-1 flex justify-between text-[10px] text-[#8a8f98]">
                <span>Slow (1)</span>
                <span>Fast (5)</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            {simState === "BACKLOG" ? (
              <div className="flex items-center gap-2 rounded-lg border border-[#ffb547]/40 bg-[#ffb547]/10 p-2.5 font-mono text-xs text-[#ffb547]">
                <AlertTriangle className="size-4 shrink-0" />
                <span>⚠ TELEMETRY BACKLOG INCREASING — Packets generating faster than ground transmission. Heap dynamically expands.</span>
              </div>
            ) : simState === "DRAINING" ? (
              <div className="flex items-center gap-2 rounded-lg border border-[#3ddc97]/40 bg-[#3ddc97]/10 p-2.5 font-mono text-xs text-[#3ddc97]">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>✓ BUFFER DRAINING — Downlink window open. Ground station transmitting faster than sensor generation.</span>
              </div>
            ) : simState === "EQUILIBRIUM" ? (
              <div className="flex items-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.04] p-2.5 font-mono text-xs text-[#8a8f98]">
                <Cpu className="size-4 shrink-0 text-[#3d6bff]" />
                <span>EQUILIBRIUM — Generation rate matches transmission throughput. Stable linked queue depth.</span>
              </div>
            ) : (
              <div className="rounded-lg border border-white/[0.08] bg-black/30 p-2.5 font-mono text-xs text-[#8a8f98]">
                Buffer Empty — Adjust sliders and click Run Flow Sim to observe dynamic heap allocation.
              </div>
            )}
          </div>

          {txLog.length > 0 && (
            <div className="mt-4 border-t border-white/[0.08] pt-3">
              <span className="font-mono text-[10px] uppercase text-[#8a8f98]">
                RECENT TRANSMISSION DOWNLINKS (GROUND STATION LOG)
              </span>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 font-mono text-[11px]">
                {txLog.map((log) => (
                  <div key={log.packet_id} className="rounded border border-white/[0.08] bg-black/60 p-2">
                    <div className="font-bold text-white">PKT #{log.packet_id}</div>
                    <div className="text-[10px] text-[#3ddc97]">{log.measurement_value} units</div>
                    <div className="text-[9px] text-[#8a8f98]">Sensor #{log.sensor_id}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 lg:col-span-5">
          <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-4 backdrop-blur-md">
            <div className="border-b border-white/[0.08] pb-2.5">
              <span className="mono-label text-[10px] text-[#3d6bff]">DATA STRUCTURE ADVANTAGE</span>
              <h4 className="font-mono text-sm font-bold text-white uppercase mt-0.5">
                WHY A LINKED LIST?
              </h4>
            </div>

            <p className="mt-2.5 font-mono text-xs leading-relaxed text-[#8a8f98]">
              A linked list can grow and shrink dynamically. This makes it suitable when the number of incoming telemetry packets is not known in advance.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="rounded-lg border border-white/[0.08] bg-black/40 p-2.5">
                <span className="text-[9px] text-[#8a8f98]">ENQUEUE TIME</span>
                <div className="mt-0.5 font-bold text-[#3d6bff]">O(1)</div>
                <span className="text-[9px] text-[#8a8f98]">tail-&gt;next = new_node</span>
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-black/40 p-2.5">
                <span className="text-[9px] text-[#8a8f98]">DEQUEUE TIME</span>
                <div className="mt-0.5 font-bold text-[#3ddc97]">O(1)</div>
                <span className="text-[9px] text-[#8a8f98]">head = head-&gt;next</span>
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
                <span className="font-semibold text-white">VIEW C IMPLEMENTATION</span>
              </div>
              <div className="flex items-center gap-1 text-[#8a8f98]">
                <span className="text-[10px]">{codeOpen ? "HIDE" : "EXPAND"}</span>
                {codeOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </div>
            </button>

            {codeOpen && (
              <div className="mt-3 border-t border-white/[0.08] pt-3 font-mono text-[11px] leading-relaxed text-[#8a8f98]">
                <div className="rounded border border-white/[0.08] bg-black/70 p-3 text-white">
                  <div><span className="text-[#3d6bff]">struct</span> <span className="text-white font-semibold">TelemetryPacket</span> {"{"}</div>
                  <div className="pl-3"><span className="text-[#3d6bff]">unsigned int</span> packet_id;</div>
                  <div className="pl-3"><span className="text-[#3d6bff]">unsigned long</span> timestamp;</div>
                  <div className="pl-3"><span className="text-[#3d6bff]">int</span> sensor_id;</div>
                  <div className="pl-3"><span className="text-[#3d6bff]">float</span> measurement_value;</div>
                  <div className="pl-3 text-white"><span className="text-[#3d6bff]">struct</span> TelemetryPacket* next;</div>
                  <div>{"};"}</div>

                  <div className="mt-2"><span className="text-[#3d6bff]">struct</span> <span className="text-white font-semibold">TelemetryBuffer</span> {"{"}</div>
                  <div className="pl-3"><span className="text-[#3d6bff]">struct</span> TelemetryPacket* head;</div>
                  <div className="pl-3"><span className="text-[#3d6bff]">struct</span> TelemetryPacket* tail;</div>
                  <div className="pl-3"><span className="text-[#3d6bff]">uint32_t</span> current_size;</div>
                  <div>{"};"}</div>
                </div>

                <div className="mt-2 space-y-1 text-[10px] text-[#8a8f98]">
                  <div>• <span className="text-white">head</span>: Points to oldest buffered packet for transmission.</div>
                  <div>• <span className="text-white">tail</span>: Points to newest packet; allows O(1) append.</div>
                  <div>• <span className="text-white">free()</span>: Called on dequeue to reclaim dynamic heap RAM.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
