"use client"

import { useState, useId, useCallback } from "react"
import { SectionLabel } from "@/components/brand/Brand"
import {
  GitBranch,
  Search,
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Cpu,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ArrowRight,
  Globe
} from "lucide-react"

import { fetchSatnogsTelemetry } from "@/lib/satnogsClient"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

interface BSTNode {
  timestamp: number
  event: string
  anomaly?: boolean
  left?: BSTNode | null
  right?: BSTNode | null
}

const INITIAL_TREE: BSTNode = {
  timestamp: 1700,
  event: "Battery Check",
  left: {
    timestamp: 1500,
    event: "Solar Panel Deploy",
    left: {
      timestamp: 1200,
      event: "Antenna Release",
      left: null,
      right: null
    },
    right: {
      timestamp: 1600,
      event: "Sensor Anomaly Poll",
      anomaly: true,
      left: null,
      right: null
    }
  },
  right: {
    timestamp: 1900,
    event: "Communication Restored",
    left: {
      timestamp: 1800,
      event: "Attitude Detumble Complete",
      left: null,
      right: null
    },
    right: {
      timestamp: 2100,
      event: "Ground Station Pass #4",
      left: null,
      right: null
    }
  }
}

function insertNode(root: BSTNode | null, newNode: BSTNode, steps: string[]): BSTNode {
  if (!root) {
    steps.push(`TARGET POSITION EMPTY → INSERT ${newNode.timestamp} (${newNode.event})`)
    return newNode
  }

  if (newNode.timestamp < root.timestamp) {
    steps.push(`${newNode.timestamp} < ${root.timestamp} → MOVE LEFT`)
    return { ...root, left: insertNode(root.left || null, newNode, steps) }
  } else if (newNode.timestamp > root.timestamp) {
    steps.push(`${newNode.timestamp} > ${root.timestamp} → MOVE RIGHT`)
    return { ...root, right: insertNode(root.right || null, newNode, steps) }
  } else {
    steps.push(`TIMESTAMP ${newNode.timestamp} ALREADY EXISTS → UPDATED EVENT`)
    return { ...root, event: newNode.event }
  }
}

function findMin(node: BSTNode): BSTNode {
  let curr = node
  while (curr.left) {
    curr = curr.left
  }
  return curr
}

function deleteNode(root: BSTNode | null, ts: number): BSTNode | null {
  if (!root) return null

  if (ts < root.timestamp) {
    return { ...root, left: deleteNode(root.left || null, ts) }
  } else if (ts > root.timestamp) {
    return { ...root, right: deleteNode(root.right || null, ts) }
  } else {
    if (!root.left && !root.right) return null
    if (!root.left) return root.right || null
    if (!root.right) return root.left || null

    const minRight = findMin(root.right)
    return {
      ...root,
      timestamp: minRight.timestamp,
      event: minRight.event,
      anomaly: minRight.anomaly,
      right: deleteNode(root.right || null, minRight.timestamp)
    }
  }
}

function inorderCollect(root: BSTNode | null, result: BSTNode[]) {
  if (!root) return
  inorderCollect(root.left || null, result)
  result.push(root)
  inorderCollect(root.right || null, result)
}

interface TreePositionedNode {
  timestamp: number
  event: string
  anomaly?: boolean
  x: number
  y: number
  leftX?: number
  leftY?: number
  rightX?: number
  rightY?: number
}

function flattenTreeForSvg(
  node: BSTNode | null,
  x: number,
  y: number,
  dx: number,
  result: TreePositionedNode[]
) {
  if (!node) return

  const item: TreePositionedNode = {
    timestamp: node.timestamp,
    event: node.event,
    anomaly: node.anomaly,
    x,
    y
  }

  if (node.left) {
    item.leftX = x - dx
    item.leftY = y + 80
    flattenTreeForSvg(node.left, x - dx, y + 80, dx / 2, result)
  }

  if (node.right) {
    item.rightX = x + dx
    item.rightY = y + 80
    flattenTreeForSvg(node.right, x + dx, y + 80, dx / 2, result)
  }

  result.push(item)
}

export function Exp5TimelineBST() {
  const insertTsId = useId()
  const insertEventId = useId()
  const searchTsId = useId()

  const [tree, setTree] = useState<BSTNode | null>(INITIAL_TREE)
  const [insertTs, setInsertTs] = useState<string>("1650")
  const [insertEvent, setInsertEvent] = useState<string>("Gyroscope Recalibration")
  const [searchTs, setSearchTs] = useState<string>("1600")
  const [satnogsLoading, setSatnogsLoading] = useState<boolean>(false)
  const [comparisonSteps, setComparisonSteps] = useState<string[]>([
    "INITIAL BST LOADED WITH 7 CHRONOLOGICAL MISSION EVENTS"
  ])
  const [visitedNodes, setVisitedNodes] = useState<number[]>([])
  const [foundEvent, setFoundEvent] = useState<{ ts: number; event: string; anomaly?: boolean } | null>(null)
  const [timelineReconstructed, setTimelineReconstructed] = useState<BSTNode[] | null>(null)
  const [statusMsg, setStatusMsg] = useState<string>("BST Ready: Mission event telemetry index online")
  const [codeOpen, setCodeOpen] = useState<boolean>(false)

  const handleInsert = useCallback(() => {
    const ts = parseInt(insertTs, 10)
    if (isNaN(ts) || !insertEvent.trim()) return

    const steps: string[] = []
    const newNode: BSTNode = {
      timestamp: ts,
      event: insertEvent.trim(),
      anomaly: insertEvent.toLowerCase().includes("anomaly") || insertEvent.toLowerCase().includes("drop"),
      left: null,
      right: null
    }

    const updated = insertNode(tree, newNode, steps)
    setTree(updated)
    setComparisonSteps(steps)
    setStatusMsg(`INSERT: Event #${ts} added to BST`)
    setTimelineReconstructed(null)
  }, [insertTs, insertEvent, tree])

  const handleSearch = useCallback(() => {
    const target = parseInt(searchTs, 10)
    if (isNaN(target) || !tree) return

    const visited: number[] = []
    const steps: string[] = []
    let curr: BSTNode | null = tree
    let found: BSTNode | null = null

    while (curr) {
      visited.push(curr.timestamp)
      if (target === curr.timestamp) {
        steps.push(`${target} == ${curr.timestamp} → ✓ MATCH FOUND!`)
        found = curr
        break
      } else if (target < curr.timestamp) {
        steps.push(`${target} < ${curr.timestamp} → SEARCH LEFT`)
        curr = curr.left || null
      } else {
        steps.push(`${target} > ${curr.timestamp} → SEARCH RIGHT`)
        curr = curr.right || null
      }
    }

    if (!found) {
      steps.push(`NO EVENT FOUND FOR TIMESTAMP ${target}`)
    }

    setVisitedNodes(visited)
    setComparisonSteps(steps)
    setFoundEvent(found ? { ts: found.timestamp, event: found.event, anomaly: found.anomaly } : null)
    setStatusMsg(found ? `MATCH: Found '${found.event}' at timestamp ${target}` : `SEARCH: No telemetry event at ${target}`)
  }, [searchTs, tree])

  const handleDelete = useCallback(() => {
    const target = parseInt(searchTs, 10)
    if (isNaN(target) || !tree) return

    const updated = deleteNode(tree, target)
    setTree(updated)
    setVisitedNodes([])
    setFoundEvent(null)
    setTimelineReconstructed(null)
    setComparisonSteps([`DELETED EVENT AT TIMESTAMP ${target}`, "BST REORGANIZED"])
    setStatusMsg(`DELETE: Event #${target} removed from BST`)
  }, [searchTs, tree])

  const handleReconstructTimeline = useCallback(() => {
    if (!tree) return
    const ordered: BSTNode[] = []
    inorderCollect(tree, ordered)
    setTimelineReconstructed(ordered)
    setComparisonSteps([
      "INORDER TRAVERSAL: LEFT → ROOT → RIGHT",
      `RECONSTRUCTED ${ordered.length} MISSION EVENTS IN CHRONOLOGICAL ORDER`
    ])
    setStatusMsg("Chronological mission timeline reconstructed via Inorder Traversal")
  }, [tree])

  const handleReset = useCallback(() => {
    setTree(INITIAL_TREE)
    setVisitedNodes([])
    setFoundEvent(null)
    setTimelineReconstructed(null)
    setComparisonSteps(["RESET: Restored default mission telemetry BST"])
    setStatusMsg("Default mission event tree restored")
  }, [])

  const fetchSatnogsTimeline = async () => {
    setSatnogsLoading(true)
    setStatusMsg("Querying SatNOGS global network for orbital passes & timeline...")
    try {
      const data = await fetchSatnogsTelemetry(7)
      if (data.packets && data.packets.length > 0) {
        let newTree = tree
        const steps: string[] = ["INGESTING SATNOGS OBSERVATION TIMELINE INTO BST:"]
        data.packets.forEach((p) => {
          const shortTs = p.timestamp % 10000
          const eventDesc = `SatNOGS Pass (${p.ground_station.slice(0, 10)})`
          const isAnomaly = p.battery_status < 85.0
          const nodeToInsert: BSTNode = {
            timestamp: shortTs,
            event: isAnomaly ? `⚠ Low Batt (${p.battery_status}%)` : eventDesc,
            anomaly: isAnomaly,
            left: null,
            right: null
          }
          newTree = insertNode(newTree, nodeToInsert, steps)
        })
        setTree(newTree)
        setComparisonSteps(steps.slice(0, 8))
        setStatusMsg(`Ingested ${data.packets.length} real SatNOGS pass events into Binary Search Tree`)
      }
    } catch {
      setStatusMsg("Failed to connect to SatNOGS DB endpoint")
    } finally {
      setSatnogsLoading(false)
    }
  }

  const svgNodes: TreePositionedNode[] = []
  flattenTreeForSvg(tree, 340, 45, 150, svgNodes)

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <SectionLabel accent>EXPERIMENT 05</SectionLabel>
              <span className="rounded border border-white/[0.12] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#8a8f98]">
                DATA STRUCTURE / BINARY SEARCH TREE
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#3ddc97]">
                <span className="size-1.5 rounded-full bg-[#3ddc97]" />
                O(log n) SEARCH ACTIVE
              </span>
            </div>
            <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-white md:text-2xl">
              MISSION EVENT EXPLORER
            </h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#8a8f98] md:text-sm">
              Organize telemetry events by timestamp and quickly locate important mission events using a Binary Search Tree.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchSatnogsTimeline}
              disabled={satnogsLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#3ddc97]/40 bg-[#3ddc97]/10 px-3.5 py-2 font-mono text-xs font-semibold text-[#3ddc97] transition hover:bg-[#3ddc97]/20 active:scale-95 disabled:opacity-40"
            >
              <Globe className={`size-3.5 ${satnogsLoading ? "animate-spin" : ""}`} />
              <span>{satnogsLoading ? "INGESTING..." : "INGEST SATNOGS TIMELINE"}</span>
            </button>

            <button
              onClick={handleReconstructTimeline}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3d6bff] px-3.5 py-2 font-mono text-xs font-semibold text-white shadow-md shadow-[#3d6bff]/20 transition hover:bg-[#3d6bff]/90 active:scale-95"
            >
              <Calendar className="size-3.5" />
              <span>[ RECONSTRUCT TIMELINE ]</span>
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
            <span className="text-[#8a8f98]">BST PROPERTY:</span>
            <span className="text-[#3d6bff]">LEFT &lt; ROOT</span>
            <span className="text-white/40">·</span>
            <span className="text-[#3ddc97]">RIGHT &gt; ROOT</span>
          </div>

          <span className="text-[11px] text-[#8a8f98]">{statusMsg}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <GitBranch className="size-4 text-[#3d6bff]" />
                <span className="font-mono text-xs font-semibold tracking-wider text-white uppercase">
                  TELEMETRY EVENT BST VISUALIZATION
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-[#8a8f98]">
                <span className="size-2 rounded-full bg-[#3d6bff]" /> Visited Node
                <span className="size-2 rounded-full bg-[#ff5c7a]" /> Anomaly
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-white/[0.08] bg-black/40 p-4">
              <svg width="680" height="320" className="mx-auto block select-none">
                {svgNodes.map((n) => (
                  <g key={`edges-${n.timestamp}`}>
                    {n.leftX !== undefined && n.leftY !== undefined && (
                      <line
                        x1={n.x}
                        y1={n.y + 12}
                        x2={n.leftX}
                        y2={n.leftY - 12}
                        stroke="#ffffff25"
                        strokeWidth="1.5"
                      />
                    )}
                    {n.rightX !== undefined && n.rightY !== undefined && (
                      <line
                        x1={n.x}
                        y1={n.y + 12}
                        x2={n.rightX}
                        y2={n.rightY - 12}
                        stroke="#ffffff25"
                        strokeWidth="1.5"
                      />
                    )}
                  </g>
                ))}

                {svgNodes.map((n) => {
                  const isVisited = visitedNodes.includes(n.timestamp)
                  const isMatch = foundEvent?.ts === n.timestamp

                  return (
                    <g key={`node-${n.timestamp}`} className="cursor-pointer">
                      <rect
                        x={n.x - 52}
                        y={n.y - 18}
                        width="104"
                        height="36"
                        rx="6"
                        className={`transition-all duration-300 ${
                          isMatch
                            ? "fill-[#3ddc97]/25 stroke-[#3ddc97] stroke-2"
                            : isVisited
                            ? "fill-[#3d6bff]/20 stroke-[#3d6bff] stroke-2"
                            : n.anomaly
                            ? "fill-[#ff5c7a]/15 stroke-[#ff5c7a]/60 stroke-1"
                            : "fill-black/80 stroke-white/20 stroke-1"
                        }`}
                      />
                      <text
                        x={n.x}
                        y={n.y - 2}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="11"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        T: {n.timestamp}
                      </text>
                      <text
                        x={n.x}
                        y={n.y + 11}
                        textAnchor="middle"
                        fill={n.anomaly ? "#ff5c7a" : "#8a8f98"}
                        fontSize="8"
                        fontFamily="monospace"
                      >
                        {n.event.length > 14 ? `${n.event.substring(0, 12)}...` : n.event}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-white/[0.08] bg-black/40 p-3.5">
                <span className="font-mono text-xs font-semibold text-white">SEARCH EVENT BY TIMESTAMP</span>
                <div className="mt-2.5 flex items-center gap-2">
                  <label htmlFor={searchTsId} className="sr-only">Search Timestamp</label>
                  <input
                    id={searchTsId}
                    type="number"
                    value={searchTs}
                    onChange={(e) => setSearchTs(e.target.value)}
                    placeholder="Timestamp (e.g. 1600)"
                    className="w-full rounded border border-white/[0.15] bg-black/60 px-3 py-1.5 font-mono text-xs text-white outline-none focus:border-[#3d6bff]"
                  />
                  <button
                    onClick={handleSearch}
                    className="inline-flex items-center gap-1.5 rounded bg-[#3d6bff] px-3.5 py-1.5 font-mono text-xs font-semibold text-white transition hover:bg-[#3d6bff]/90"
                  >
                    <Search className="size-3.5" />
                    <span>[ SEARCH ]</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    className="inline-flex items-center gap-1.5 rounded border border-[#ff5c7a]/40 bg-[#ff5c7a]/10 px-2.5 py-1.5 font-mono text-xs text-[#ff5c7a] transition hover:bg-[#ff5c7a]/20"
                    title="Delete Event"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-white/[0.08] bg-black/40 p-3.5">
                <span className="font-mono text-xs font-semibold text-white">INSERT TELEMETRY EVENT</span>
                <div className="mt-2.5 flex items-center gap-2">
                  <label htmlFor={insertTsId} className="sr-only">Timestamp</label>
                  <input
                    id={insertTsId}
                    type="number"
                    value={insertTs}
                    onChange={(e) => setInsertTs(e.target.value)}
                    placeholder="Time (e.g. 1650)"
                    className="w-28 rounded border border-white/[0.15] bg-black/60 px-2.5 py-1.5 font-mono text-xs text-white outline-none focus:border-[#3d6bff]"
                  />
                  <label htmlFor={insertEventId} className="sr-only">Event Name</label>
                  <input
                    id={insertEventId}
                    type="text"
                    value={insertEvent}
                    onChange={(e) => setInsertEvent(e.target.value)}
                    placeholder="Event Description"
                    className="w-full rounded border border-white/[0.15] bg-black/60 px-2.5 py-1.5 font-mono text-xs text-white outline-none focus:border-[#3d6bff]"
                  />
                  <button
                    onClick={handleInsert}
                    className="inline-flex items-center gap-1 rounded bg-[#3ddc97] px-3 py-1.5 font-mono text-xs font-semibold text-black transition hover:bg-[#3ddc97]/90"
                  >
                    <Plus className="size-3.5" />
                    <span>INSERT</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <span className="font-mono text-xs font-semibold tracking-wider text-white uppercase">
                ALGORITHM TRAVERSAL STEPS
              </span>
            </div>

            <div className="mt-3 min-h-[140px] space-y-1.5 rounded-lg border border-white/[0.06] bg-black/40 p-3 font-mono text-[11px]">
              {comparisonSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-[#8a8f98]">
                  <ArrowRight className="size-3 mt-0.5 text-[#3d6bff] shrink-0" />
                  <span className={step.includes("FOUND") ? "text-[#3ddc97] font-semibold" : step.includes("LEFT") ? "text-[#3d6bff]" : step.includes("RIGHT") ? "text-[#ffb547]" : "text-white/80"}>
                    {step}
                  </span>
                </div>
              ))}
            </div>

            {foundEvent && (
              <div className="mt-4 rounded-lg border border-[#3ddc97]/40 bg-[#3ddc97]/10 p-3 font-mono text-xs">
                <div className="flex items-center gap-1.5 text-[#3ddc97] font-bold">
                  <CheckCircle2 className="size-4" />
                  <span>EVENT LOCATED IN BST</span>
                </div>
                <div className="mt-2 text-white font-semibold">{foundEvent.event}</div>
                <div className="text-[#8a8f98] text-[11px]">Timestamp: {foundEvent.ts}00Z</div>
                {foundEvent.anomaly && (
                  <div className="mt-2 flex items-center gap-1 text-[#ff5c7a] font-semibold text-[11px]">
                    <AlertTriangle className="size-3.5" />
                    <span>⚠ CRITICAL ANOMALY EVENT FLAG</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <span className="font-mono text-xs font-semibold text-white uppercase">
                BST TIME COMPLEXITY
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-center text-xs">
              <div className="rounded border border-white/[0.08] bg-black/40 p-2">
                <div className="text-[10px] text-[#8a8f98]">SEARCH AVG</div>
                <div className="mt-1 font-bold text-[#3ddc97]">O(log n)</div>
              </div>
              <div className="rounded border border-white/[0.08] bg-black/40 p-2">
                <div className="text-[10px] text-[#8a8f98]">WORST CASE</div>
                <div className="mt-1 font-bold text-[#ffb547]">O(n)</div>
              </div>
              <div className="rounded border border-white/[0.08] bg-black/40 p-2">
                <div className="text-[10px] text-[#8a8f98]">INORDER</div>
                <div className="mt-1 font-bold text-[#3d6bff]">O(n)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {timelineReconstructed && (
        <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-[#3d6bff]" />
              <h4 className="font-mono text-xs font-semibold text-white uppercase">
                CHRONOLOGICAL MISSION TIMELINE (INORDER: LEFT → ROOT → RIGHT)
              </h4>
            </div>
            <span className="font-mono text-[11px] text-[#3ddc97]">
              {timelineReconstructed.length} Events Reconstructed
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-xs">
            {timelineReconstructed.map((node, i) => (
              <div key={node.timestamp} className="flex items-center gap-2">
                <div className="rounded-lg border border-white/[0.12] bg-black/60 p-2.5">
                  <div className="text-[10px] text-[#3d6bff] font-bold">T: {node.timestamp}</div>
                  <div className="text-white text-xs font-medium">{node.event}</div>
                </div>
                {i < timelineReconstructed.length - 1 && (
                  <ArrowRight className="size-3.5 text-[#8a8f98]" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-4 backdrop-blur-md">
        <button
          onClick={() => setCodeOpen(!codeOpen)}
          className="flex w-full items-center justify-between font-mono text-xs font-semibold text-white"
        >
          <div className="flex items-center gap-2">
            <Cpu className="size-4 text-[#3d6bff]" />
            <span>VIEW C IMPLEMENTATION (TimelineBST.c)</span>
          </div>
          {codeOpen ? <ChevronUp className="size-4 text-[#8a8f98]" /> : <ChevronDown className="size-4 text-[#8a8f98]" />}
        </button>

        {codeOpen && (
          <div className="mt-4 rounded-lg border border-white/[0.08] bg-black/80 p-4 font-mono text-xs leading-relaxed text-[#8a8f98]">
            <pre className="overflow-x-auto text-[11px]">
              <code>{`typedef struct BSTNode {
    unsigned long timestamp;
    char event_description[64];
    struct BSTNode* left;
    struct BSTNode* right;
} BSTNode;

BSTNode* insertEvent(BSTNode* root, unsigned long ts, const char* event) {
    if (root == NULL) {
        BSTNode* node = (BSTNode*)malloc(sizeof(BSTNode));
        node->timestamp = ts;
        strncpy(node->event_description, event, 63);
        node->left = node->right = NULL;
        return node;
    }
    if (ts < root->timestamp) {
        root->left = insertEvent(root->left, ts, event);
    } else if (ts > root->timestamp) {
        root->right = insertEvent(root->right, ts, event);
    }
    return root;
}

BSTNode* searchEvent(BSTNode* root, unsigned long ts) {
    if (root == NULL || root->timestamp == ts) return root;
    if (ts < root->timestamp) return searchEvent(root->left, ts);
    return searchEvent(root->right, ts);
}

void inorderReconstruct(BSTNode* root) {
    if (root == NULL) return;
    inorderReconstruct(root->left);
    printf("Time: %lu -> Event: %s\\n", root->timestamp, root->event_description);
    inorderReconstruct(root->right);
}`}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
