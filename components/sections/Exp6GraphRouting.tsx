"use client"

import { useState, useSyncExternalStore, useCallback, useRef, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import {
  Network,
  Radio,
  Play,
  RotateCcw,
  Globe,
  Satellite,
  Antenna,
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
  Select,
  StatusLine,
  ToolButton,
  type Tone,
} from "@/components/sections/flight/ui"

const emptySubscribe = () => () => {}

interface GraphNode {
  id: number
  label: string
  type: "GROUND_STATION" | "LEO_SATELLITE"
  name: string
  x: number
  y: number
  neighbors: number[]
}

const GRAPH_NODES: GraphNode[] = [
  { id: 0, label: "GS 0", type: "GROUND_STATION", name: "Somaiya Ground Station (Alpha)", x: 80, y: 160, neighbors: [1, 2] },
  { id: 1, label: "SAT 1", type: "LEO_SATELLITE", name: "SomaiyaSat-1 (LEO Relay)", x: 260, y: 70, neighbors: [0, 4] },
  { id: 2, label: "SAT 2", type: "LEO_SATELLITE", name: "SomaiyaSat-2 (Polar Mesh)", x: 260, y: 250, neighbors: [0, 3] },
  { id: 3, label: "SAT 3", type: "LEO_SATELLITE", name: "SomaiyaSat-3 (Equatorial)", x: 440, y: 250, neighbors: [2, 4] },
  { id: 4, label: "GS 4", type: "GROUND_STATION", name: "European GS Partner (Omega)", x: 620, y: 160, neighbors: [1, 3] },
]

const EDGES: Array<[number, number]> = [
  [0, 1],
  [0, 2],
  [1, 4],
  [2, 3],
  [3, 4],
]

const edgeKey = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`

export function Exp6GraphRouting() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)

  const [sourceId, setSourceId] = useState<number>(0)
  const [targetId, setTargetId] = useState<number>(4)
  const [activeNodes, setActiveNodes] = useState<GraphNode[]>(GRAPH_NODES)
  const [selectedNode, setSelectedNode] = useState<GraphNode>(GRAPH_NODES[1])
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const [satnogsLoading, setSatnogsLoading] = useState<boolean>(false)
  const [bfsQueueLog, setBfsQueueLog] = useState<string[]>([])
  const [visitedNodes, setVisitedNodes] = useState<number[]>([])
  const [activeEdge, setActiveEdge] = useState<string | null>(null)
  const [discoveredPath, setDiscoveredPath] = useState<number[] | null>([0, 1, 4])
  const [packetPos, setPacketPos] = useState<number | null>(null)
  const [statusMsg, setStatusMsg] = useState<string>("5 nodes · 5 duplex links ready")

  const searchTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const packetTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimers = useCallback(() => {
    if (searchTimer.current) clearInterval(searchTimer.current)
    if (packetTimer.current) clearInterval(packetTimer.current)
    searchTimer.current = null
    packetTimer.current = null
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  const pathEdgeSet = useMemo(() => {
    const set = new Set<string>()
    if (!discoveredPath) return set
    for (let i = 0; i < discoveredPath.length - 1; i++) {
      set.add(edgeKey(discoveredPath[i], discoveredPath[i + 1]))
    }
    return set
  }, [discoveredPath])

  const runBFS = useCallback(() => {
    clearTimers()
    setIsSearching(true)
    setVisitedNodes([])
    setDiscoveredPath(null)
    setPacketPos(null)
    setActiveEdge(null)
    setStatusMsg(
      `BFS · exploring ${GRAPH_NODES[sourceId].label} → ${GRAPH_NODES[targetId].label}`
    )

    const queue: number[] = [sourceId]
    const visited = new Set<number>([sourceId])
    const parent: Record<number, number | null> = { [sourceId]: null }
    const log: string[] = [`INIT · queue [ ${GRAPH_NODES[sourceId].label} ]`]

    setBfsQueueLog([...log])

    let step = 0
    searchTimer.current = setInterval(() => {
      if (queue.length === 0) {
        if (searchTimer.current) clearInterval(searchTimer.current)
        searchTimer.current = null
        setIsSearching(false)
        setStatusMsg("Search concluded · no reachable path")
        return
      }

      const curr = queue.shift()!
      setVisitedNodes((prev) => [...prev, curr])

      if (curr === targetId) {
        if (searchTimer.current) clearInterval(searchTimer.current)
        searchTimer.current = null
        setIsSearching(false)

        const path: number[] = []
        let p: number | null = targetId
        while (p !== null) {
          path.unshift(p)
          p = parent[p]
        }

        setDiscoveredPath(path)
        setStatusMsg(
          `Route locked · ${path.map((n) => GRAPH_NODES[n].label).join(" → ")} · ${path.length - 1} hops`
        )

        log.push(`REACHED ${GRAPH_NODES[targetId].label} · ${path.length - 1} hops`)
        setBfsQueueLog([...log])

        let hop = 0
        packetTimer.current = setInterval(() => {
          if (hop < path.length) {
            setPacketPos(path[hop])
            hop++
          } else {
            if (packetTimer.current) clearInterval(packetTimer.current)
            packetTimer.current = null
          }
        }, 620)
        return
      }

      const neighbors = GRAPH_NODES[curr].neighbors
      for (const n of neighbors) {
        if (!visited.has(n)) {
          visited.add(n)
          parent[n] = curr
          queue.push(n)
          setActiveEdge(edgeKey(curr, n))
        }
      }

      log.push(
        `VISIT ${GRAPH_NODES[curr].label} · queue [ ${queue.map((q) => GRAPH_NODES[q].label).join(" , ")} ]`
      )
      setBfsQueueLog([...log])
      step++
      if (step > 15 && searchTimer.current) clearInterval(searchTimer.current)
    }, 560)
  }, [sourceId, targetId, clearTimers])

  const handleReset = useCallback(() => {
    clearTimers()
    setActiveNodes(GRAPH_NODES)
    setSelectedNode(GRAPH_NODES[1])
    setVisitedNodes([])
    setDiscoveredPath([0, 1, 4])
    setPacketPos(null)
    setActiveEdge(null)
    setBfsQueueLog([])
    setIsSearching(false)
    setStatusMsg("Topology reset · 5 nodes · 5 links")
  }, [clearTimers])

  const syncSatnogsTopology = async () => {
    setSatnogsLoading(true)
    setStatusMsg("Querying SatNOGS for active stations…")
    try {
      const data = await fetchSatnogsTelemetry(5)
      if (data.packets && data.packets.length >= 2) {
        const gs0Name = data.packets[0]?.ground_station || "Somaiya GS"
        const gs4Name = data.packets[1]?.ground_station || "SatNOGS Partner"
        const sat1Name = `NORAD #${data.packets[0]?.norad_cat_id || 68635}`
        const sat2Name = `NORAD #${data.packets[1]?.norad_cat_id || 60083}`

        const updated: GraphNode[] = [
          { id: 0, label: "GS 0", type: "GROUND_STATION", name: `SatNOGS ${gs0Name}`, x: 80, y: 160, neighbors: [1, 2] },
          { id: 1, label: "SAT 1", type: "LEO_SATELLITE", name: `Active satellite ${sat1Name}`, x: 260, y: 70, neighbors: [0, 4] },
          { id: 2, label: "SAT 2", type: "LEO_SATELLITE", name: `Active satellite ${sat2Name}`, x: 260, y: 250, neighbors: [0, 3] },
          { id: 3, label: "SAT 3", type: "LEO_SATELLITE", name: "SomaiyaSat-3 mesh", x: 440, y: 250, neighbors: [2, 4] },
          { id: 4, label: "GS 4", type: "GROUND_STATION", name: `SatNOGS ${gs4Name}`, x: 620, y: 160, neighbors: [1, 3] },
        ]
        setActiveNodes(updated)
        setSelectedNode(updated[0])
        setStatusMsg(`Topology synced · ${gs0Name} ↔ ${gs4Name}`)
      }
    } catch {
      setStatusMsg("SatNOGS topology unavailable · retry")
    } finally {
      setSatnogsLoading(false)
    }
  }

  const statusTone: Tone = /unavailable|no reachable/i.test(statusMsg)
    ? "fair"
    : discoveredPath
      ? "good"
      : isSearching
        ? "accent"
        : "muted"

  const hops = discoveredPath ? discoveredPath.length - 1 : 0

  return (
    <div className="flex flex-col gap-4">
      <ExperimentHeader
        code="06"
        tag="graph · BFS · min hops"
        title="Satellite Network Routing"
        state={isSearching ? "BFS EXPLORING" : discoveredPath ? "ROUTE LOCKED" : "IDLE"}
        stateTone={isSearching ? "accent" : discoveredPath ? "good" : "muted"}
        actions={
          <>
            <ToolButton
              icon={Globe}
              variant="live"
              onClick={syncSatnogsTopology}
              disabled={satnogsLoading}
            >
              {satnogsLoading ? "Syncing" : "Sync SatNOGS"}
            </ToolButton>
            <ToolButton
              icon={Play}
              variant="primary"
              onClick={runBFS}
              disabled={mounted ? isSearching : false}
              suppressHydrationWarning
            >
              {isSearching ? "Searching" : "Find route"}
            </ToolButton>
            <ToolButton icon={RotateCcw} onClick={handleReset}>
              Reset
            </ToolButton>
          </>
        }
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>Source</Label>
              <div className="mt-1 flex items-center gap-1.5">
                <Antenna className="size-3 text-[#3ddc97]" />
                <Select value={sourceId} onChange={(e) => setSourceId(parseInt(e.target.value, 10))}>
                  {GRAPH_NODES.map((n) => (
                    <option key={n.id} value={n.id} className="bg-neutral-900 text-white">
                      {n.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <Label>Destination</Label>
              <div className="mt-1 flex items-center gap-1.5">
                <Satellite className="size-3 text-[#3d6bff]" />
                <Select value={targetId} onChange={(e) => setTargetId(parseInt(e.target.value, 10))}>
                  {GRAPH_NODES.map((n) => (
                    <option key={n.id} value={n.id} className="bg-neutral-900 text-white">
                      {n.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex items-end gap-6">
              <Metric label="Hops" value={discoveredPath ? hops : "—"} tone="good" />
              <Metric label="Visited" value={visitedNodes.length} tone="accent" />
            </div>
          </div>

          <StatusLine tone={statusTone} pulse={isSearching} className="max-w-full lg:max-w-[46%]">
            {statusMsg}
          </StatusLine>
        </div>
      </ExperimentHeader>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <GlassPanel className="p-4 md:p-5 lg:col-span-8">
          <PanelHeader
            icon={Network}
            title="Constellation topology"
            meta="click node to inspect"
            right={
              <div className="flex items-center gap-2 font-mono text-[8px] text-white/30">
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-[#3ddc97]" /> ground
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-[#3d6bff]" /> orbit
                </span>
              </div>
            }
          />

          <div className="relative mt-4 overflow-x-auto rounded-xl border border-white/[0.06] bg-black/45">
            <div aria-hidden className="pointer-events-none absolute inset-0 grid-dots opacity-[0.18]" />

            <svg viewBox="0 0 700 320" className="relative mx-auto block h-[300px] w-full min-w-[560px] select-none">
              <defs>
                <filter id="graph-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="graph-node-fill" cx="50%" cy="35%" r="70%">
                  <stop offset="0%" stopColor="rgba(61,107,255,0.22)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.85)" />
                </radialGradient>
              </defs>

              {/* orbit guides */}
              <ellipse cx="350" cy="160" rx="290" ry="118" fill="none" stroke="rgba(255,255,255,0.04)" strokeDasharray="2 8" />
              <ellipse cx="350" cy="160" rx="190" ry="150" fill="none" stroke="rgba(255,255,255,0.03)" strokeDasharray="2 8" />

              {EDGES.map(([a, b]) => {
                const nodeA = activeNodes[a]
                const nodeB = activeNodes[b]
                const key = edgeKey(a, b)
                const onPath = pathEdgeSet.has(key)
                const isActive = activeEdge === key

                return (
                  <g key={key}>
                    <line
                      x1={nodeA.x}
                      y1={nodeA.y}
                      x2={nodeB.x}
                      y2={nodeB.y}
                      stroke={onPath ? "rgba(61,220,151,0.75)" : isActive ? "rgba(61,107,255,0.8)" : "rgba(255,255,255,0.12)"}
                      strokeWidth={onPath ? 2 : isActive ? 1.8 : 1}
                      strokeDasharray={onPath ? undefined : "4 4"}
                    />
                    {(onPath || isActive) && (
                      <line
                        x1={nodeA.x}
                        y1={nodeA.y}
                        x2={nodeB.x}
                        y2={nodeB.y}
                        stroke={onPath ? "#3ddc97" : "#3d6bff"}
                        strokeWidth={onPath ? 2.4 : 1.8}
                        className="flow-line"
                        filter="url(#graph-glow)"
                      />
                    )}
                  </g>
                )
              })}

              {activeNodes.map((node) => {
                const isSelected = selectedNode.id === node.id
                const isSource = sourceId === node.id
                const isTarget = targetId === node.id
                const isVisited = visitedNodes.includes(node.id)
                const onPath = discoveredPath?.includes(node.id)
                const hasPacket = packetPos === node.id

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className="cursor-pointer"
                  >
                    {(onPath || isSelected) && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="33"
                        fill="none"
                        stroke={onPath ? "rgba(61,220,151,0.35)" : "rgba(61,107,255,0.35)"}
                        strokeWidth="1"
                        className="animate-breathe"
                        style={{ transformBox: "fill-box", transformOrigin: "center" }}
                      />
                    )}

                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="26"
                      className="transition-all duration-300"
                      fill={isSelected ? "rgba(61,107,255,0.22)" : "url(#graph-node-fill)"}
                      stroke={
                        onPath
                          ? "#3ddc97"
                          : isSelected
                            ? "#3d6bff"
                            : isVisited
                              ? "rgba(255,181,71,0.8)"
                              : "rgba(255,255,255,0.18)"
                      }
                      strokeWidth={onPath || isSelected ? 2 : 1}
                      filter={onPath ? "url(#graph-glow)" : undefined}
                    />

                    {hasPacket && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="34"
                        fill="none"
                        stroke="#3ddc97"
                        strokeWidth="1.5"
                        className="animate-pulse-ring"
                        style={{ transformBox: "fill-box", transformOrigin: "center" }}
                      />
                    )}

                    <text
                      x={node.x}
                      y={node.y - 3}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {node.label}
                    </text>
                    <text
                      x={node.x}
                      y={node.y + 9}
                      textAnchor="middle"
                      fill={node.type === "GROUND_STATION" ? "#3ddc97" : "#3d6bff"}
                      fontSize="7"
                      fontFamily="monospace"
                    >
                      {node.type === "GROUND_STATION" ? "EARTH" : "ORBIT"}
                    </text>

                    {isSource && (
                      <text x={node.x} y={node.y - 34} textAnchor="middle" fill="#3ddc97" fontSize="8" fontFamily="monospace" fontWeight="bold">
                        SOURCE
                      </text>
                    )}
                    {isTarget && (
                      <text x={node.x} y={node.y - 34} textAnchor="middle" fill="#3d6bff" fontSize="8" fontFamily="monospace" fontWeight="bold">
                        DEST
                      </text>
                    )}
                  </g>
                )
              })}

              {/* travelling packet */}
              {packetPos !== null && activeNodes[packetPos] && (
                <g
                  style={{
                    transform: `translate(${activeNodes[packetPos].x}px, ${activeNodes[packetPos].y}px)`,
                    transition: "transform 0.55s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  <circle r="5" fill="#3ddc97" filter="url(#graph-glow)" />
                  <circle r="10" fill="none" stroke="#3ddc97" strokeWidth="1" opacity="0.4" />
                </g>
              )}
            </svg>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <GlassTile className="flex items-center justify-between gap-2 border-[#3ddc97]/25 bg-[#3ddc97]/[0.06] px-3 py-2">
              <div className="min-w-0">
                <div className="mono-label text-[7px] text-[#3ddc97]/70">shortest route</div>
                <div className="mt-1 truncate font-mono text-[10px] text-white">
                  {discoveredPath
                    ? discoveredPath.map((n) => GRAPH_NODES[n].label).join(" → ")
                    : "run BFS to compute"}
                </div>
              </div>
              <Badge tone="good">{hops} hops</Badge>
            </GlassTile>

            <GlassTile className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <div className="mono-label text-[7px] text-white/30">rejected alternative</div>
                <div className="mt-1 truncate font-mono text-[10px] text-white/45">
                  GS 0 → SAT 2 → SAT 3 → GS 4
                </div>
              </div>
              <Badge tone="muted">3 hops</Badge>
            </GlassTile>
          </div>
        </GlassPanel>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <GlassPanel className="p-4">
            <PanelHeader
              icon={Radio}
              title="Node metadata"
              right={<span className="mono-label text-[8px] text-white/25">id {selectedNode.id}</span>}
            />

            <div className="mt-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg border",
                    selectedNode.type === "GROUND_STATION"
                      ? "border-[#3ddc97]/30 bg-[#3ddc97]/[0.08] text-[#3ddc97]"
                      : "border-[#3d6bff]/30 bg-[#3d6bff]/[0.08] text-[#3d6bff]"
                  )}
                >
                  {selectedNode.type === "GROUND_STATION" ? (
                    <Antenna className="size-4" />
                  ) : (
                    <Satellite className="size-4" />
                  )}
                </span>
                <div>
                  <div className="font-mono text-[12px] font-semibold text-white">
                    {selectedNode.label}
                  </div>
                  <div className="mono-label text-[8px] text-white/30">
                    {selectedNode.type === "GROUND_STATION" ? "ground station" : "leo satellite"}
                  </div>
                </div>
              </div>

              <GlassTile className="mt-3 p-2.5">
                <KeyValue k="Designation" v={selectedNode.name} />
                <KeyValue
                  k="Links"
                  v={selectedNode.neighbors.map((n) => GRAPH_NODES[n].label).join(" · ")}
                  tone="accent"
                  className="mt-1.5"
                />
                <KeyValue
                  k="Status"
                  v={visitedNodes.includes(selectedNode.id) ? "visited" : "unvisited"}
                  tone={visitedNodes.includes(selectedNode.id) ? "good" : "muted"}
                  className="mt-1.5"
                />
              </GlassTile>
            </div>
          </GlassPanel>

          <GlassPanel className="p-4">
            <PanelHeader
              icon={Network}
              title="BFS queue"
              right={<Badge tone={isSearching ? "accent" : "muted"}>{isSearching ? "live" : "idle"}</Badge>}
            />

            <div className="mt-3 max-h-[200px] space-y-1 overflow-y-auto pr-1">
              {bfsQueueLog.length > 0 ? (
                bfsQueueLog.map((log, idx) => (
                  <div
                    key={`${log}-${idx}`}
                    className="rounded-md border border-white/[0.04] bg-black/25 px-2 py-1 font-mono text-[9px]"
                  >
                    <span
                      className={cn(
                        log.includes("REACHED")
                          ? "font-semibold text-[#3ddc97]"
                          : log.includes("INIT")
                            ? "text-[#3d6bff]"
                            : "text-white/50"
                      )}
                    >
                      {log}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-white/[0.06] py-6 text-center font-mono text-[9px] text-white/20">
                  run BFS to trace the queue
                </div>
              )}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  )
}
