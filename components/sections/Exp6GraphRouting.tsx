"use client"

import { useState, useSyncExternalStore, useCallback } from "react"
import { SectionLabel } from "@/components/brand/Brand"
import {
  Network,
  Radio,
  Play,
  RotateCcw,
  CheckCircle2,
  Cpu,
  ChevronDown,
  ChevronUp,
  Globe
} from "lucide-react"

import { fetchSatnogsTelemetry } from "@/lib/satnogsClient"

const emptySubscribe = () => () => {}
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

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
  { id: 4, label: "GS 4", type: "GROUND_STATION", name: "European GS Partner (Omega)", x: 620, y: 160, neighbors: [1, 3] }
]

const ADJ_MATRIX = [
  [0, 1, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 1, 0],
  [0, 0, 1, 0, 1],
  [0, 1, 0, 1, 0]
]

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
  const [statusMsg, setStatusMsg] = useState<string>("Network online: 5 nodes, 5 duplex links ready")
  const [codeOpen, setCodeOpen] = useState<boolean>(false)
  const [matrixOpen, setMatrixOpen] = useState<boolean>(false)

  const runBFS = useCallback(() => {
    setIsSearching(true)
    setVisitedNodes([])
    setDiscoveredPath(null)
    setPacketPos(null)
    setStatusMsg(`BFS SEARCHING: Exploring shortest hop path from ${GRAPH_NODES[sourceId].label} to ${GRAPH_NODES[targetId].label}...`)

    const queue: number[] = [sourceId]
    const visited = new Set<number>([sourceId])
    const parent: Record<number, number | null> = { [sourceId]: null }
    const log: string[] = [`INIT QUEUE: [ ${GRAPH_NODES[sourceId].label} ]`]

    let step = 0
    const interval = setInterval(() => {
      if (queue.length === 0) {
        clearInterval(interval)
        setIsSearching(false)
        setStatusMsg("Search concluded: No reachable path")
        return
      }

      const curr = queue.shift()!
      setVisitedNodes((prev) => [...prev, curr])

      if (curr === targetId) {
        clearInterval(interval)
        setIsSearching(false)

        const path: number[] = []
        let p: number | null = targetId
        while (p !== null) {
          path.unshift(p)
          p = parent[p]
        }

        setDiscoveredPath(path)
        log.push(`DESTINATION REACHED! Shortest route: ${path.map((n) => GRAPH_NODES[n].label).join(" → ")}`)
        setBfsQueueLog([...log])
        setStatusMsg(`ROUTE FOUND: ${path.map((n) => GRAPH_NODES[n].label).join(" → ")} (${path.length - 1} hops)`)

        let hop = 0
        const anim = setInterval(() => {
          if (hop < path.length) {
            setPacketPos(path[hop])
            hop++
          } else {
            clearInterval(anim)
          }
        }, 600)
        return
      }

      const neighbors = GRAPH_NODES[curr].neighbors
      for (const n of neighbors) {
        if (!visited.has(n)) {
          visited.add(n)
          parent[n] = curr
          queue.push(n)
          setActiveEdge(`${Math.min(curr, n)}-${Math.max(curr, n)}`)
        }
      }

      log.push(`VISIT ${GRAPH_NODES[curr].label} → QUEUE: [ ${queue.map((q) => GRAPH_NODES[q].label).join(" ][ ")} ]`)
      setBfsQueueLog([...log])
      step++
      if (step > 15) clearInterval(interval)
    }, 550)
  }, [sourceId, targetId])

  const handleReset = useCallback(() => {
    setActiveNodes(GRAPH_NODES)
    setSelectedNode(GRAPH_NODES[1])
    setVisitedNodes([])
    setDiscoveredPath([0, 1, 4])
    setPacketPos(null)
    setActiveEdge(null)
    setBfsQueueLog([])
    setStatusMsg("Network graph reset to default state")
  }, [])

  const syncSatnogsTopology = async () => {
    setSatnogsLoading(true)
    setStatusMsg("Querying SatNOGS global network for active ground stations & satellites...")
    try {
      const data = await fetchSatnogsTelemetry(5)
      if (data.packets && data.packets.length >= 2) {
        const gs0Name = data.packets[0]?.ground_station || "Somaiya GS"
        const gs4Name = data.packets[1]?.ground_station || "SatNOGS Partner"
        const sat1Name = `NORAD #${data.packets[0]?.norad_cat_id || 68635}`
        const sat2Name = `NORAD #${data.packets[1]?.norad_cat_id || 60083}`

        const updated: GraphNode[] = [
          { id: 0, label: "GS 0", type: "GROUND_STATION", name: `SatNOGS ${gs0Name}`, x: 80, y: 160, neighbors: [1, 2] },
          { id: 1, label: "SAT 1", type: "LEO_SATELLITE", name: `Active Satellite ${sat1Name}`, x: 260, y: 70, neighbors: [0, 4] },
          { id: 2, label: "SAT 2", type: "LEO_SATELLITE", name: `Active Satellite ${sat2Name}`, x: 260, y: 250, neighbors: [0, 3] },
          { id: 3, label: "SAT 3", type: "LEO_SATELLITE", name: "SomaiyaSat-3 Mesh", x: 440, y: 250, neighbors: [2, 4] },
          { id: 4, label: "GS 4", type: "GROUND_STATION", name: `SatNOGS ${gs4Name}`, x: 620, y: 160, neighbors: [1, 3] }
        ]
        setActiveNodes(updated)
        setSelectedNode(updated[0])
        setStatusMsg(`Synced topology with SatNOGS DB: Stations '${gs0Name}' and '${gs4Name}' linked`)
      }
    } catch {
      setStatusMsg("Failed to connect to SatNOGS DB endpoint")
    } finally {
      setSatnogsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <SectionLabel accent>EXPERIMENT 06</SectionLabel>
              <span className="rounded border border-white/[0.12] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#8a8f98]">
                DATA STRUCTURE / GRAPH / BFS
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#3ddc97]">
                <span className="size-1.5 rounded-full bg-[#3ddc97]" />
                UNWEIGHTED BFS: MINIMUM HOPS GUARANTEED
              </span>
            </div>
            <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-white md:text-2xl">
              SATELLITE NETWORK ROUTING
            </h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#8a8f98] md:text-sm">
              Model a satellite communication network as a graph and use BFS to discover efficient communication paths.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={syncSatnogsTopology}
              disabled={satnogsLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#3ddc97]/40 bg-[#3ddc97]/10 px-3.5 py-2 font-mono text-xs font-semibold text-[#3ddc97] transition hover:bg-[#3ddc97]/20 active:scale-95 disabled:opacity-40"
            >
              <Globe className={`size-3.5 ${satnogsLoading ? "animate-spin" : ""}`} />
              <span>{satnogsLoading ? "SYNCING..." : "SYNC SATNOGS STATIONS"}</span>
            </button>

            <button
              onClick={runBFS}
              disabled={mounted ? isSearching : false}
              suppressHydrationWarning
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3d6bff] px-4 py-2 font-mono text-xs font-semibold text-white shadow-md shadow-[#3d6bff]/25 transition hover:bg-[#3d6bff]/90 active:scale-95 disabled:opacity-40"
            >
              <Play className="size-3.5 fill-current" />
              <span>{isSearching ? "BFS SEARCHING..." : "[ FIND SHORTEST ROUTE ]"}</span>
            </button>

            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-2 font-mono text-xs text-[#8a8f98] transition hover:bg-white/[0.08] hover:text-white"
            >
              <RotateCcw className="size-3.5" />
              <span>RESET</span>
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-3 font-mono text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[#8a8f98]">SOURCE:</span>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(parseInt(e.target.value, 10))}
                className="rounded border border-white/[0.15] bg-black/60 px-2 py-1 font-mono text-xs text-white"
              >
                {GRAPH_NODES.map((n) => (
                  <option key={n.id} value={n.id} className="bg-neutral-900 text-white">
                    {n.label} ({n.type === "GROUND_STATION" ? "GS" : "SAT"})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[#8a8f98]">DESTINATION:</span>
              <select
                value={targetId}
                onChange={(e) => setTargetId(parseInt(e.target.value, 10))}
                className="rounded border border-white/[0.15] bg-black/60 px-2 py-1 font-mono text-xs text-white"
              >
                {GRAPH_NODES.map((n) => (
                  <option key={n.id} value={n.id} className="bg-neutral-900 text-white">
                    {n.label} ({n.type === "GROUND_STATION" ? "GS" : "SAT"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <span className="text-[11px] text-[#8a8f98]">{statusMsg}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <div className="relative rounded-xl border border-white/[0.12] bg-[#02040a] p-5 backdrop-blur-md overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />

            <div className="relative flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Network className="size-4 text-[#3d6bff]" />
                <span className="font-mono text-xs font-semibold tracking-wider text-white uppercase">
                  CONSTELLATION NETWORK TOPOLOGY
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#8a8f98]">CLICK NODE TO INSPECT</span>
            </div>

            <div className="relative mt-4 overflow-x-auto rounded-lg border border-white/[0.06] bg-black/60 p-4">
              <svg width="700" height="320" className="mx-auto block select-none">
                <defs>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="glow" />
                    <feMerge>
                      <feMergeNode in="glow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {[
                  [0, 1],
                  [0, 2],
                  [1, 4],
                  [2, 3],
                  [3, 4]
                ].map(([a, b]) => {
                  const nodeA = activeNodes[a]
                  const nodeB = activeNodes[b]
                  const edgeKey = `${a}-${b}`
                  const isShortestPathEdge =
                    discoveredPath &&
                    discoveredPath.some((val, idx) => {
                      if (idx === discoveredPath.length - 1) return false
                      const next = discoveredPath[idx + 1]
                      return (val === a && next === b) || (val === b && next === a)
                    })
                  const isActive = activeEdge === edgeKey

                  return (
                    <line
                      key={edgeKey}
                      x1={nodeA.x}
                      y1={nodeA.y}
                      x2={nodeB.x}
                      y2={nodeB.y}
                      stroke={isShortestPathEdge ? "#3ddc97" : isActive ? "#3d6bff" : "#ffffff25"}
                      strokeWidth={isShortestPathEdge ? "3" : isActive ? "2.5" : "1.5"}
                      strokeDasharray={isShortestPathEdge ? "none" : "4 2"}
                      filter={isShortestPathEdge ? "url(#glow)" : undefined}
                    />
                  )
                })}

                {activeNodes.map((node) => {
                  const isSelected = selectedNode.id === node.id
                  const isSource = sourceId === node.id
                  const isTarget = targetId === node.id
                  const isVisited = visitedNodes.includes(node.id)
                  const isPath = discoveredPath?.includes(node.id)
                  const hasPacket = packetPos === node.id

                  return (
                    <g
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className="cursor-pointer transition-all duration-200"
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="28"
                        className={`transition-all duration-300 ${
                          isSelected
                            ? "fill-[#3d6bff]/30 stroke-[#3d6bff] stroke-2"
                            : isPath
                            ? "fill-[#3ddc97]/20 stroke-[#3ddc97] stroke-2"
                            : isVisited
                            ? "fill-[#ffb547]/20 stroke-[#ffb547] stroke-2"
                            : "fill-black/90 stroke-white/20 stroke-1"
                        }`}
                        filter={isPath ? "url(#glow)" : undefined}
                      />

                      {hasPacket && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r="34"
                          className="fill-none stroke-[#3ddc97] stroke-2 animate-ping"
                        />
                      )}

                      <text
                        x={node.x}
                        y={node.y - 2}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="11"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {node.label}
                      </text>
                      <text
                        x={node.x}
                        y={node.y + 11}
                        textAnchor="middle"
                        fill={node.type === "GROUND_STATION" ? "#3ddc97" : "#3d6bff"}
                        fontSize="8"
                        fontFamily="monospace"
                      >
                        {node.type === "GROUND_STATION" ? "EARTH" : "ORBIT"}
                      </text>

                      {isSource && (
                        <text x={node.x} y={node.y - 34} textAnchor="middle" fill="#3ddc97" fontSize="9" fontFamily="monospace" fontWeight="bold">
                          [SOURCE]
                        </text>
                      )}
                      {isTarget && (
                        <text x={node.x} y={node.y - 34} textAnchor="middle" fill="#3d6bff" fontSize="9" fontFamily="monospace" fontWeight="bold">
                          [DEST]
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-[#3ddc97]/30 bg-[#3ddc97]/10 p-3 font-mono text-xs">
                <div className="flex items-center gap-1.5 text-[#3ddc97] font-bold">
                  <CheckCircle2 className="size-4" />
                  <span>BFS SHORTEST ROUTE (FEWEST HOPS)</span>
                </div>
                <div className="mt-1.5 text-white font-semibold text-sm">
                  {discoveredPath ? discoveredPath.map((n) => GRAPH_NODES[n].label).join(" → ") : "Run BFS to compute"}
                </div>
                <div className="mt-1 text-[#8a8f98] text-[11px]">
                  Relay hops: <span className="text-white font-bold">{discoveredPath ? discoveredPath.length - 1 : 0}</span> (Optimal in unweighted network)
                </div>
              </div>

              <div className="rounded-lg border border-white/[0.08] bg-black/40 p-3 font-mono text-xs">
                <div className="text-[#8a8f98] font-bold">AVAILABLE ALTERNATIVE PATH</div>
                <div className="mt-1.5 text-[#8a8f98] font-semibold text-sm">
                  GS 0 → SAT 2 → SAT 3 → GS 4
                </div>
                <div className="mt-1 text-[#8a8f98] text-[11px]">
                  Relay hops: <span className="text-white font-bold">3</span> (Rejected by BFS: higher hop count)
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Radio className="size-4 text-[#3d6bff]" />
                <span className="font-mono text-xs font-semibold tracking-wider text-white uppercase">
                  NODE METADATA
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#8a8f98]">ID: {selectedNode.id}</span>
            </div>

            <div className="mt-3 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between rounded border border-white/[0.08] bg-black/40 p-2">
                <span className="text-[#8a8f98]">NODE:</span>
                <span className="text-white font-bold">{selectedNode.label}</span>
              </div>
              <div className="flex justify-between rounded border border-white/[0.08] bg-black/40 p-2">
                <span className="text-[#8a8f98]">TYPE:</span>
                <span className={selectedNode.type === "GROUND_STATION" ? "text-[#3ddc97]" : "text-[#3d6bff]"}>
                  {selectedNode.type === "GROUND_STATION" ? "GROUND STATION" : "LEO SATELLITE"}
                </span>
              </div>
              <div className="rounded border border-white/[0.08] bg-black/40 p-2">
                <span className="text-[#8a8f98]">DESIGNATION:</span>
                <div className="mt-0.5 text-white font-medium text-[11px]">{selectedNode.name}</div>
              </div>
              <div className="rounded border border-white/[0.08] bg-black/40 p-2">
                <span className="text-[#8a8f98]">CONNECTED TO:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedNode.neighbors.map((nb) => (
                    <span key={nb} className="rounded bg-white/[0.08] px-2 py-0.5 text-[10px] text-white">
                      {GRAPH_NODES[nb].label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <span className="font-mono text-xs font-semibold text-white uppercase">
                BFS QUEUE OPERATIONS LOG
              </span>
            </div>

            <div className="mt-3 max-h-[160px] space-y-1.5 overflow-y-auto font-mono text-[11px]">
              {bfsQueueLog.length > 0 ? (
                bfsQueueLog.map((log, idx) => (
                  <div key={idx} className="rounded border border-white/[0.04] bg-black/40 p-1.5 text-[#8a8f98]">
                    <span className={log.includes("Shortest") ? "text-[#3ddc97] font-semibold" : "text-white/80"}>
                      {log}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-[#8a8f98]">Click [ FIND SHORTEST ROUTE ] to trace BFS queue.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-4 backdrop-blur-md">
        <button
          onClick={() => setMatrixOpen(!matrixOpen)}
          className="flex w-full items-center justify-between font-mono text-xs font-semibold text-white"
        >
          <div className="flex items-center gap-2">
            <Network className="size-4 text-[#3d6bff]" />
            <span>VIEW ADJACENCY MATRIX (5x5 Topo Matrix)</span>
          </div>
          {matrixOpen ? <ChevronUp className="size-4 text-[#8a8f98]" /> : <ChevronDown className="size-4 text-[#8a8f98]" />}
        </button>

        {matrixOpen && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-white/[0.08] bg-black/60 p-4 font-mono text-xs">
            <table className="w-full text-center">
              <thead>
                <tr className="border-b border-white/[0.12] text-[#8a8f98]">
                  <th className="p-2 text-left">Vertex</th>
                  {GRAPH_NODES.map((n) => (
                    <th key={n.id} className={`p-2 ${selectedNode.id === n.id ? "text-[#3d6bff] font-bold" : ""}`}>
                      {n.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ADJ_MATRIX.map((row, r) => (
                  <tr
                    key={r}
                    className={`border-b border-white/[0.04] ${
                      selectedNode.id === r ? "bg-[#3d6bff]/10 font-bold text-white" : "text-[#8a8f98]"
                    }`}
                  >
                    <td className="p-2 text-left font-semibold text-white">{GRAPH_NODES[r].label}</td>
                    {row.map((val, c) => (
                      <td
                        key={c}
                        className={`p-2 ${val === 1 ? "text-[#3ddc97] font-bold" : "text-white/20"} ${
                          selectedNode.id === c ? "bg-[#3d6bff]/10" : ""
                        }`}
                      >
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-4 backdrop-blur-md">
        <button
          onClick={() => setCodeOpen(!codeOpen)}
          className="flex w-full items-center justify-between font-mono text-xs font-semibold text-white"
        >
          <div className="flex items-center gap-2">
            <Cpu className="size-4 text-[#3d6bff]" />
            <span>VIEW C IMPLEMENTATION (GraphBFS.c)</span>
          </div>
          {codeOpen ? <ChevronUp className="size-4 text-[#8a8f98]" /> : <ChevronDown className="size-4 text-[#8a8f98]" />}
        </button>

        {codeOpen && (
          <div className="mt-4 rounded-lg border border-white/[0.08] bg-black/80 p-4 font-mono text-xs leading-relaxed text-[#8a8f98]">
            <pre className="overflow-x-auto text-[11px]">
              <code>{`#define NUM_NODES 5

int adjMatrix[NUM_NODES][NUM_NODES] = {
    {0, 1, 1, 0, 0},
    {1, 0, 0, 0, 1},
    {1, 0, 0, 1, 0},
    {0, 0, 1, 0, 1},
    {0, 1, 0, 1, 0}
};

void bfsShortestRoute(int start, int target) {
    int visited[NUM_NODES] = {0};
    int parent[NUM_NODES];
    for (int i = 0; i < NUM_NODES; i++) parent[i] = -1;

    int queue[NUM_NODES];
    int front = 0, rear = 0;

    visited[start] = 1;
    queue[rear++] = start;

    while (front < rear) {
        int u = queue[front++];
        if (u == target) break;

        for (int v = 0; v < NUM_NODES; v++) {
            if (adjMatrix[u][v] == 1 && !visited[v]) {
                visited[v] = 1;
                parent[v] = u;
                queue[rear++] = v;
            }
        }
    }
}`}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
