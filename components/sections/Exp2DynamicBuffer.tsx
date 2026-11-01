"use client"

import { useState, useEffect, useCallback, useId, useSyncExternalStore, useRef, type CSSProperties } from "react"
import { cn } from "@/lib/utils"
import {
  Layers,
  Send,
  Plus,
  RotateCcw,
  Link2,
  Globe,
  Radio,
  Play,
  Pause,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Cpu,
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
  { packet_id: 103, timestamp: 1690000030, sensor_id: 2, measurement_value: 0.0, mem_address: "0x7FA3", next_address: "NULL" },
]

const emptySubscribe = () => () => {}

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
  const [statusMsg, setStatusMsg] = useState<string>("3 nodes linked · head → tail")
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
          measurement_value: node.measurement_value,
        }),
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
      INITIAL_NODES.forEach((node) => syncEnqueue(node))
    }, 0)
    return () => clearTimeout(t)
  }, [syncEnqueue])

  const enqueuePacket = useCallback(() => {
    const sensor = (nextPktId % 8) + 1
    const val = parseFloat(((nextPktId * 7.3) % 100).toFixed(1))
    const ts = lastTs + Math.floor(Math.random() * 12 + 8)
    const newAddr = `0x7F${(nextPktId * 7).toString(16).toUpperCase().padStart(2, "0")}`

    const newNode: DynamicNode = {
      packet_id: nextPktId,
      timestamp: ts,
      sensor_id: sensor,
      measurement_value: val,
      mem_address: newAddr,
      next_address: "NULL",
    }

    setJustEnqueuedId(nextPktId)
    setNextPktId((p) => p + 1)
    setLastTs(ts)

    setNodes((prev) => {
      if (prev.length === 0) return [newNode]
      const updated = prev.map((item, idx) =>
        idx === prev.length - 1 ? { ...item, next_address: newAddr } : item
      )
      return [...updated, newNode]
    })

    setStatusMsg(`node_alloc(${newAddr}) · packet ${nextPktId} appended at tail`)
    syncEnqueue(newNode)

    setTimeout(() => setJustEnqueuedId(null), 700)
  }, [nextPktId, lastTs, syncEnqueue])

  const fetchFromSatnogs = async () => {
    setSatnogsLoading(true)
    setStatusMsg("Opening SatNOGS telemetry downlink…")
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
          next_address: "NULL",
        }

        setNodes((prev) => {
          if (prev.length === 0) return [newNode]
          const updated = [...prev]
          updated[updated.length - 1] = { ...updated[updated.length - 1], next_address: newAddr }
          return [...updated, newNode]
        })

        setJustEnqueuedId(sample.packet_id)
        setTimeout(() => setJustEnqueuedId(null), 1200)
        syncEnqueue(newNode)
        setStatusMsg(`SatNOGS ${sample.ground_station} · packet ${sample.packet_id} enqueued`)
      }
    } catch {
      setStatusMsg("SatNOGS downlink unavailable · retry")
    } finally {
      setSatnogsLoading(false)
    }
  }

  const dequeuePacket = useCallback(() => {
    if (nodes.length === 0) {
      setStatusMsg("Underflow · head == NULL")
      return
    }

    const headPkt = nodes[0]
    setTransmittingPkt(headPkt)
    setTxLog((prev) => [headPkt, ...prev].slice(0, 4))
    syncDequeue()

    setNodes((prev) => prev.slice(1))
    setStatusMsg(`Downlinked packet ${headPkt.packet_id} · free(${headPkt.mem_address})`)

    setTimeout(() => setTransmittingPkt(null), 900)
  }, [nodes, syncDequeue])

  const enqueueRef = useRef(enqueuePacket)
  const dequeueRef = useRef(dequeuePacket)

  useEffect(() => {
    enqueueRef.current = enqueuePacket
    dequeueRef.current = dequeuePacket
  }, [enqueuePacket, dequeuePacket])

  useEffect(() => {
    if (!isSimulating) return

    const genTimer = setInterval(
      () => enqueueRef.current(),
      Math.max(400, Math.floor(2500 / genRate))
    )
    const txTimer = setInterval(
      () => dequeueRef.current(),
      Math.max(400, Math.floor(2500 / txRate))
    )

    return () => {
      clearInterval(genTimer)
      clearInterval(txTimer)
    }
  }, [isSimulating, genRate, txRate])

  const handleReset = () => {
    setIsSimulating(false)
    setNodes([])
    setNextPktId(101)
    setLastTs(1690000000)
    setTxLog([])
    setTransmittingPkt(null)
    setStatusMsg("List released · head → NULL, tail → NULL")
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

  const simTone: Tone =
    simState === "BACKLOG" ? "fair" : simState === "DRAINING" ? "good" : simState === "EQUILIBRIUM" ? "accent" : "muted"

  const statusTone: Tone = /underflow|unavailable|released/i.test(statusMsg) ? "fair" : "good"

  return (
    <div className="flex flex-col gap-4">
      <ExperimentHeader
        code="02"
        tag="linked list · dynamic"
        title="Node Chain"
        state={currentSize > 0 ? "NODES LINKED" : "HEAD → NULL"}
        stateTone={currentSize > 0 ? "good" : "fair"}
        actions={
          <>
            <ToolButton icon={Plus} variant="primary" onClick={enqueuePacket}>
              Generate
            </ToolButton>
            <ToolButton
              icon={Globe}
              variant="live"
              onClick={fetchFromSatnogs}
              disabled={mounted ? satnogsLoading : false}
              suppressHydrationWarning
            >
              {satnogsLoading ? "Pulling" : "SatNOGS"}
            </ToolButton>
            <ToolButton
              icon={Send}
              onClick={dequeuePacket}
              disabled={mounted ? currentSize === 0 : false}
              suppressHydrationWarning
            >
              Transmit
            </ToolButton>
            <ToolButton
              icon={Link2}
              onClick={() => setShowPointers(!showPointers)}
              active={showPointers}
              aria-pressed={showPointers}
            >
              Pointers
            </ToolButton>
            <ToolButton icon={RotateCcw} onClick={handleReset}>
              Reset
            </ToolButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Nodes" value={currentSize} sub="allocated" />
          <Metric label="Head" value={headNode ? `P${headNode.packet_id}` : "NULL"} tone="accent" />
          <Metric label="Tail" value={tailNode ? `P${tailNode.packet_id}` : "NULL"} tone="good" />
          <Metric
            label="State"
            value={simState}
            tone={simTone}
            sub={`${genRate} gen · ${txRate} tx`}
          />
        </div>
      </ExperimentHeader>

      {transmittingPkt && (
        <div className="relative overflow-hidden rounded-xl border border-[#3ddc97]/25 bg-[#3ddc97]/[0.06] px-3.5 py-2.5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 font-mono text-[10px]">
            <span className="flex items-center gap-2 text-[#3ddc97]">
              <Radio className="size-3.5 animate-pulse" />
              DOWNLINK · P#{transmittingPkt.packet_id} · sensor {transmittingPkt.sensor_id} ·{" "}
              {transmittingPkt.measurement_value}
            </span>
            <span className="hidden text-white/35 sm:block">ground station · received</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-white/[0.06]">
            <span className="absolute top-0 size-1.5 -translate-y-1/2 rounded-full bg-[#3ddc97] shadow-[0_0_10px_rgba(61,220,151,0.9)] animate-travel-x" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <GlassPanel className="p-4 md:p-5 lg:col-span-8">
          <PanelHeader
            icon={Layers}
            title="Linked list chain"
            meta="head → tail → null"
            right={
              <div className="flex items-center gap-1.5">
                {headNode && <Badge tone="accent">head {headNode.mem_address}</Badge>}
                {tailNode && <Badge tone="good">tail {tailNode.mem_address}</Badge>}
              </div>
            }
          />

          <div className="mt-4 min-h-[196px] overflow-x-auto pb-7 pt-4">
            {nodes.length > 0 ? (
              <div className="flex min-w-max items-center px-1">
                {nodes.map((node, index) => {
                  const isHead = index === 0
                  const isTail = index === nodes.length - 1
                  const isNew = justEnqueuedId === node.packet_id

                  return (
                    <div key={node.packet_id} className="flex items-center">
                      <div
                        className={cn(
                          "relative w-[168px] shrink-0 rounded-xl border p-3 font-mono transition-all duration-300",
                          isNew
                            ? "animate-node-in border-[#3ddc97]/70 bg-[#3ddc97]/[0.12] shadow-[0_0_30px_-10px_rgba(61,220,151,0.9)]"
                            : isHead
                              ? "border-[#3d6bff]/55 bg-[#3d6bff]/[0.1] shadow-[0_0_28px_-14px_rgba(61,107,255,0.9)]"
                              : "border-white/[0.1] bg-white/[0.025] hover:border-white/[0.22]"
                        )}
                      >
                        {isHead && (
                          <span className="absolute -top-2 left-3 rounded bg-[#3d6bff] px-1.5 py-px text-[8px] font-bold tracking-[0.12em] text-white">
                            HEAD
                          </span>
                        )}
                        {isTail && !isHead && (
                          <span className="absolute -top-2 left-3 rounded bg-[#3ddc97] px-1.5 py-px text-[8px] font-bold tracking-[0.12em] text-black">
                            TAIL
                          </span>
                        )}

                        <div className="flex items-center justify-between border-b border-white/[0.07] pb-1.5">
                          <span className="text-[11px] font-bold text-white">
                            P#{node.packet_id}
                          </span>
                          {showPointers && (
                            <span className="text-[9px] text-[#3d6bff]">{node.mem_address}</span>
                          )}
                        </div>

                        <div className="mt-2 space-y-1 text-[9px]">
                          <KeyValue k="Sensor" v={`#${node.sensor_id}`} />
                          <KeyValue
                            k="Value"
                            v={node.measurement_value.toFixed(1)}
                            tone="good"
                          />
                          <KeyValue k="Time" v={node.timestamp} tone="muted" />
                        </div>

                        {showPointers && (
                          <div className="mt-2 flex items-center justify-between rounded border border-white/[0.06] bg-black/40 px-1.5 py-1 text-[9px]">
                            <span className="text-white/25">next</span>
                            <span
                              className={
                                node.next_address === "NULL"
                                  ? "font-bold text-[#ff5c7a]"
                                  : "text-[#3d6bff]"
                              }
                            >
                              {node.next_address}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex w-9 shrink-0 items-center justify-center">
                        <svg viewBox="0 0 36 10" className="h-2.5 w-9 overflow-visible">
                          <line x1="0" y1="5" x2="27" y2="5" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
                          <line
                            x1="0"
                            y1="5"
                            x2="27"
                            y2="5"
                            stroke="#3d6bff"
                            strokeWidth="1.4"
                            className="flow-line"
                          />
                          <path d="M27 1.5 L34 5 L27 8.5 Z" fill="#3d6bff" opacity="0.9" />
                        </svg>
                      </div>
                    </div>
                  )
                })}

                <div className="flex h-[92px] w-[84px] shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-[#ff5c7a]/30 bg-[#ff5c7a]/[0.04] font-mono">
                  <span className="text-[10px] font-bold text-[#ff5c7a]">NULL</span>
                  <span className="mt-1 text-[7px] uppercase tracking-[0.12em] text-white/25">
                    tail terminator
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[150px] flex-col items-center justify-center text-center font-mono">
                <Layers className="size-7 text-white/10" />
                <div className="mt-3 text-[11px] text-white/40">list is empty</div>
                <div className="mt-1 text-[9px] text-white/20">
                  head → NULL · tail → NULL
                </div>
                <ToolButton icon={Plus} variant="primary" onClick={enqueuePacket} className="mt-4">
                  Allocate first node
                </ToolButton>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
            <div className="flex items-center gap-3 font-mono text-[9px] text-white/30">
              <span>enqueue O(1)</span>
              <span className="text-white/10">·</span>
              <span>dequeue O(1)</span>
            </div>
            <StatusLine tone={statusTone} className="max-w-[65%]">
              {statusMsg}
            </StatusLine>
          </div>
        </GlassPanel>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <GlassPanel className="p-4">
            <PanelHeader
              icon={Sliders}
              title="Flow control"
              right={
                <ToolButton
                  icon={isSimulating ? Pause : Play}
                  variant={isSimulating ? "danger" : "live"}
                  onClick={() => setIsSimulating(!isSimulating)}
                  className="h-6 px-2 text-[9px]"
                >
                  {isSimulating ? "Stop" : "Run"}
                </ToolButton>
              }
            />

            <div className="mt-3 space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <Label>Generation rate</Label>
                  <span className="font-mono text-[9px] tabular-nums text-white/70">
                    {genRate} pkt/s
                  </span>
                </div>
                <label htmlFor={genSliderId} className="sr-only">
                  Packet generation rate
                </label>
                <input
                  id={genSliderId}
                  type="range"
                  min={1}
                  max={5}
                  value={genRate}
                  onChange={(e) => setGenRate(parseInt(e.target.value, 10))}
                  className="range-slider mt-2 w-full"
                  style={
                    {
                      "--range-accent": "#3d6bff",
                      "--range-fill": `${((genRate - 1) / 4) * 100}%`,
                    } as CSSProperties
                  }
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label>Downlink TX rate</Label>
                  <span className="font-mono text-[9px] tabular-nums text-white/70">
                    {txRate} pkt/s
                  </span>
                </div>
                <label htmlFor={txSliderId} className="sr-only">
                  Downlink transmit rate
                </label>
                <input
                  id={txSliderId}
                  type="range"
                  min={1}
                  max={5}
                  value={txRate}
                  onChange={(e) => setTxRate(parseInt(e.target.value, 10))}
                  className="range-slider mt-2 w-full"
                  style={
                    {
                      "--range-accent": "#3ddc97",
                      "--range-fill": `${((txRate - 1) / 4) * 100}%`,
                    } as CSSProperties
                  }
                />
              </div>
            </div>

            <div
              className={cn(
                "mt-3 flex items-start gap-2 rounded-lg border px-2.5 py-2 font-mono text-[9px] leading-relaxed",
                TONE[simTone].border,
                TONE[simTone].bg,
                TONE[simTone].text
              )}
            >
              {simState === "BACKLOG" ? (
                <AlertTriangle className="mt-px size-3 shrink-0" />
              ) : simState === "DRAINING" ? (
                <CheckCircle2 className="mt-px size-3 shrink-0" />
              ) : (
                <Cpu className="mt-px size-3 shrink-0" />
              )}
              <span>
                {simState === "BACKLOG" && "List growing · generation outpaces downlink"}
                {simState === "DRAINING" && "Buffer draining · downlink window open"}
                {simState === "EQUILIBRIUM" && "Rates balanced · queue depth stable"}
                {simState === "EMPTY" && "No buffered traffic · run flow to observe growth"}
              </span>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between">
                <Label>Queue depth</Label>
                <span className="font-mono text-[9px] tabular-nums text-white/45">
                  {currentSize}/12
                </span>
              </div>
              <ProgressBar
                value={(currentSize / 12) * 100}
                tone={currentSize > 8 ? "fair" : "accent"}
                className="mt-1.5"
              />
            </div>
          </GlassPanel>

          <GlassPanel className="p-4">
            <PanelHeader icon={Radio} title="Downlink log" meta="latest first" />

            <div className="mt-3 space-y-1.5">
              {txLog.length > 0 ? (
                txLog.map((log) => (
                  <GlassTile
                    key={log.packet_id}
                    className="flex items-center justify-between px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-2 font-mono text-[9px]">
                      <span className="text-white/80">P#{log.packet_id}</span>
                      <span className="text-[#3ddc97]">{log.measurement_value.toFixed(1)}</span>
                    </div>
                    <span className="font-mono text-[8px] text-white/25">
                      sensor #{log.sensor_id}
                    </span>
                  </GlassTile>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-white/[0.07] py-6 text-center font-mono text-[9px] text-white/20">
                  no downlinks yet
                </div>
              )}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  )
}
