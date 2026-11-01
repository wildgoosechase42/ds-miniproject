"use client"

import { useState, useId, useCallback, useRef, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import {
  GitBranch,
  Search,
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  Globe,
  Maximize2,
} from "lucide-react"

import { fetchSatnogsTelemetry } from "@/lib/satnogsClient"
import {
  Badge,
  ExperimentHeader,
  Field,
  GlassPanel,
  GlassTile,
  Label,
  Metric,
  PanelHeader,
  StatusLine,
  ToolButton,
  type Tone,
} from "@/components/sections/flight/ui"

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
      timestamp: 1300,
      event: "Attitude Detumble",
      left: {
        timestamp: 1200,
        event: "Antenna Release",
        left: null,
        right: null,
      },
      right: null,
    },
    right: {
      timestamp: 1600,
      event: "Sensor Anomaly Poll",
      anomaly: true,
      left: null,
      right: null,
    },
  },
  right: {
    timestamp: 1950,
    event: "Comms Restored",
    left: {
      timestamp: 1850,
      event: "Ground Station Pass",
      left: {
        timestamp: 1800,
        event: "UHF Beacon Sync",
        left: null,
        right: null,
      },
      right: null,
    },
    right: {
      timestamp: 2150,
      event: "Orbit Maneuver Burn",
      left: {
        timestamp: 2050,
        event: "Reaction Wheel Spin",
        left: null,
        right: null,
      },
      right: {
        timestamp: 2300,
        event: "Payload Calibration",
        left: null,
        right: null,
      },
    },
  },
}

const INITIAL_NODE_COUNT = 11

function insertNode(root: BSTNode | null, newNode: BSTNode, steps: string[]): BSTNode {
  if (!root) {
    steps.push(`EMPTY SLOT → INSERT ${newNode.timestamp}`)
    return newNode
  }

  if (newNode.timestamp < root.timestamp) {
    steps.push(`${newNode.timestamp} < ${root.timestamp} → LEFT`)
    return { ...root, left: insertNode(root.left || null, newNode, steps) }
  } else if (newNode.timestamp > root.timestamp) {
    steps.push(`${newNode.timestamp} > ${root.timestamp} → RIGHT`)
    return { ...root, right: insertNode(root.right || null, newNode, steps) }
  } else {
    steps.push(`${newNode.timestamp} EXISTS → EVENT UPDATED`)
    return { ...root, event: newNode.event, anomaly: newNode.anomaly }
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
      right: deleteNode(root.right || null, minRight.timestamp),
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
  leftTs?: number
  rightTs?: number
  depth: number
}

function calculateTreeLayout(root: BSTNode | null) {
  if (!root) {
    return { nodes: [] as TreePositionedNode[], minX: 0, maxX: 0, minY: 0, maxY: 0 }
  }

  let inOrderCounter = 0
  const nodeInfo = new Map<BSTNode, { inOrder: number; depth: number }>()

  function scan(node: BSTNode, depth: number) {
    if (node.left) scan(node.left, depth + 1)
    nodeInfo.set(node, { inOrder: inOrderCounter++, depth })
    if (node.right) scan(node.right, depth + 1)
  }
  scan(root, 0)

  const HORIZONTAL_SPACING = 114
  const VERTICAL_SPACING = 96
  const nodes: TreePositionedNode[] = []
  const posMap = new Map<BSTNode, { x: number; y: number }>()

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const [node, info] of nodeInfo.entries()) {
    const x = info.inOrder * HORIZONTAL_SPACING + 80
    const y = info.depth * VERTICAL_SPACING + 60
    posMap.set(node, { x, y })

    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }

  for (const [node, info] of nodeInfo.entries()) {
    const pos = posMap.get(node)!
    const leftPos = node.left ? posMap.get(node.left) : undefined
    const rightPos = node.right ? posMap.get(node.right) : undefined

    nodes.push({
      timestamp: node.timestamp,
      event: node.event,
      anomaly: node.anomaly,
      x: pos.x,
      y: pos.y,
      depth: info.depth,
      leftX: leftPos ? leftPos.x : undefined,
      leftY: leftPos ? leftPos.y : undefined,
      rightX: rightPos ? rightPos.x : undefined,
      rightY: rightPos ? rightPos.y : undefined,
      leftTs: node.left?.timestamp,
      rightTs: node.right?.timestamp,
    })
  }

  return { nodes, minX, maxX, minY, maxY }
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
    `BST LOADED · ${INITIAL_NODE_COUNT} CHRONOLOGICAL EVENTS`,
  ])
  const [visitedNodes, setVisitedNodes] = useState<number[]>([])
  const [foundEvent, setFoundEvent] = useState<{ ts: number; event: string; anomaly?: boolean } | null>(null)
  const [timelineReconstructed, setTimelineReconstructed] = useState<BSTNode[] | null>(null)
  const [statusMsg, setStatusMsg] = useState<string>("BST online · event index ready")
  const [searching, setSearching] = useState<boolean>(false)
  const [deleting, setDeleting] = useState<boolean>(false)
  const [activeSearchTs, setActiveSearchTs] = useState<number | null>(null)
  const [deletingTs, setDeletingTs] = useState<number | null>(null)
  const [successorTs, setSuccessorTs] = useState<number | null>(null)
  const [layoutVersion, setLayoutVersion] = useState<number>(0)

  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState<number>(1)
  const [isDragging, setIsDragging] = useState<boolean>(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const stepsRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const dragDistRef = useRef<number>(0)
  const panRef = useRef(pan)
  const zoomRef = useRef(zoom)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRunRef = useRef<number>(0)

  useEffect(() => {
    panRef.current = pan
    zoomRef.current = zoom
  }, [pan, zoom])

  useEffect(() => {
    const el = stepsRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [comparisonSteps])

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  const stopSearchAnimation = useCallback(() => {
    searchRunRef.current += 1
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
      searchTimerRef.current = null
    }
    setSearching(false)
    setDeleting(false)
    setActiveSearchTs(null)
    setDeletingTs(null)
    setSuccessorTs(null)
  }, [])

  const { nodes, minX, maxX, minY, maxY } = useMemo(() => calculateTreeLayout(tree), [tree])

  const nodeCount = nodes.length
  const treeHeight = nodes.reduce((max, n) => Math.max(max, n.depth + 1), 0)

  const visitedEdgeKeys = useMemo(() => {
    const keys = new Set<string>()
    for (let i = 0; i < visitedNodes.length - 1; i++) {
      const a = visitedNodes[i]
      const b = visitedNodes[i + 1]
      keys.add(`${Math.min(a, b)}-${Math.max(a, b)}`)
    }
    return keys
  }, [visitedNodes])

  const fitView = useCallback(() => {
    const container = containerRef.current
    if (!container || nodes.length === 0) return

    const cw = container.clientWidth || 680
    const ch = container.clientHeight || 440
    const padding = 34

    const treeW = Math.max(maxX - minX + 132, 240)
    const treeH = Math.max(maxY - minY + 104, 160)

    const scaleX = (cw - padding * 2) / treeW
    const scaleY = (ch - padding * 2) / treeH
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.35), 1.15)

    const treeCenterX = (minX + maxX) / 2
    const treeCenterY = (minY + maxY) / 2

    setZoom(newZoom)
    setPan({ x: cw / 2 - treeCenterX * newZoom, y: ch / 2 - treeCenterY * newZoom })
  }, [nodes, minX, maxX, minY, maxY])

  const initializedRef = useRef(false)
  useEffect(() => {
    const container = containerRef.current
    if (!container || initializedRef.current) return

    const tryFit = () => {
      if (initializedRef.current) return
      if (container.clientWidth < 120 || container.clientHeight < 80) return
      initializedRef.current = true
      fitView()
    }

    tryFit()
    const ro = new ResizeObserver(tryFit)
    ro.observe(container)
    return () => ro.disconnect()
  }, [fitView])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const rect = container.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const factor = e.deltaY < 0 ? 1.1 : 0.9
      const curZoom = zoomRef.current
      const curPan = panRef.current
      const newZoom = Math.min(Math.max(curZoom * factor, 0.3), 2.2)

      setZoom(newZoom)
      setPan({
        x: mouseX - ((mouseX - curPan.x) / curZoom) * newZoom,
        y: mouseY - ((mouseY - curPan.y) / curZoom) * newZoom,
      })
    }

    container.addEventListener("wheel", handleWheel, { passive: false })
    return () => container.removeEventListener("wheel", handleWheel)
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    dragDistRef.current = 0
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    dragDistRef.current += Math.abs(e.movementX) + Math.abs(e.movementY)
    setPan({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y })
  }

  const handleMouseUp = () => setIsDragging(false)

  const handleInsert = useCallback(() => {
    const ts = parseInt(insertTs, 10)
    if (isNaN(ts) || !insertEvent.trim()) return

    stopSearchAnimation()
    const steps: string[] = []
    const newNode: BSTNode = {
      timestamp: ts,
      event: insertEvent.trim(),
      anomaly: insertEvent.toLowerCase().includes("anomaly") || insertEvent.toLowerCase().includes("drop"),
      left: null,
      right: null,
    }

    const updated = insertNode(tree, newNode, steps)
    setTree(updated)
    setLayoutVersion((v) => v + 1)
    setComparisonSteps(steps)
    setVisitedNodes([])
    setFoundEvent(null)
    setStatusMsg(`Event ${ts} inserted`)
    setTimelineReconstructed(null)
    setTimeout(() => fitView(), 40)
  }, [insertTs, insertEvent, tree, fitView, stopSearchAnimation])

  const centerOn = useCallback(
    (ts: number) => {
      const container = containerRef.current
      if (!container) return
      const node = nodes.find((n) => n.timestamp === ts)
      if (!node) return

      const cw = container.clientWidth || 680
      const ch = container.clientHeight || 440
      const z = zoomRef.current
      const p = panRef.current

      // Keep the camera still unless the node is actually off-screen.
      const screenX = node.x * z + p.x
      const screenY = node.y * z + p.y
      const marginX = 88
      const marginY = 54
      if (screenX >= marginX && screenX <= cw - marginX && screenY >= marginY && screenY <= ch - marginY) {
        return
      }

      setPan({ x: cw / 2 - node.x * z, y: ch / 2 - node.y * z })
    },
    [nodes]
  )

  const handleSearch = useCallback(() => {
    const target = parseInt(searchTs, 10)
    if (isNaN(target) || !tree) return

    stopSearchAnimation()
    const runId = searchRunRef.current

    const frames: { ts: number; event: string; anomaly?: boolean; label: string; match: boolean }[] = []
    let curr: BSTNode | null = tree
    let found: BSTNode | null = null

    while (curr) {
      if (target === curr.timestamp) {
        frames.push({
          ts: curr.timestamp,
          event: curr.event,
          anomaly: curr.anomaly,
          label: `${target} == ${curr.timestamp} → MATCH`,
          match: true,
        })
        found = curr
        break
      }
      if (target < curr.timestamp) {
        frames.push({
          ts: curr.timestamp,
          event: curr.event,
          anomaly: curr.anomaly,
          label: `${target} < ${curr.timestamp} → LEFT`,
          match: false,
        })
        curr = curr.left || null
      } else {
        frames.push({
          ts: curr.timestamp,
          event: curr.event,
          anomaly: curr.anomaly,
          label: `${target} > ${curr.timestamp} → RIGHT`,
          match: false,
        })
        curr = curr.right || null
      }
    }

    if (!found) {
      frames.push({ ts: -1, event: "", label: `NO EVENT AT ${target} · NULL REACHED`, match: false })
    }

    const visitedAcc: number[] = []
    const stepsAcc: string[] = []

    setVisitedNodes([])
    setComparisonSteps([])
    setFoundEvent(null)
    setTimelineReconstructed(null)
    setSearching(true)
    setActiveSearchTs(null)
    setStatusMsg(`Searching ${target} · root ${tree.timestamp} first`)

    let i = 0
    const playStep = () => {
      if (runId !== searchRunRef.current) return
      const frame = frames[i]
      if (!frame) {
        setSearching(false)
        setActiveSearchTs(null)
        return
      }

      if (frame.ts >= 0) {
        visitedAcc.push(frame.ts)
        setVisitedNodes([...visitedAcc])
        setActiveSearchTs(frame.ts)
        centerOn(frame.ts)
      }
      stepsAcc.push(frame.label)
      setComparisonSteps([...stepsAcc])

      i += 1

      if (frame.match) {
        setFoundEvent({ ts: frame.ts, event: frame.event, anomaly: frame.anomaly })
        setStatusMsg(`Found '${frame.event}' at ${frame.ts} · ${i} comparisons`)
        setSearching(false)
        setActiveSearchTs(null)
        return
      }

      if (i < frames.length) {
        setStatusMsg(`Searching ${target} · ${i} comparison${i === 1 ? "" : "s"} · step ${i}/${frames.length}`)
        searchTimerRef.current = setTimeout(playStep, 620)
      } else {
        setStatusMsg(`No telemetry event at ${target} · ${frames.length} comparisons`)
        setSearching(false)
        setActiveSearchTs(null)
      }
    }

    playStep()
  }, [searchTs, tree, centerOn, stopSearchAnimation])

  const handleDelete = useCallback(() => {
    const target = parseInt(searchTs, 10)
    if (isNaN(target) || !tree) return

    stopSearchAnimation()
    const runId = searchRunRef.current

    const frames: { ts: number; label: string; kind: "compare" | "target" | "successor" | "remove" | "missing" }[] = []
    let curr: BSTNode | null = tree
    let targetNode: BSTNode | null = null

    while (curr) {
      if (target === curr.timestamp) {
        frames.push({ ts: curr.timestamp, label: `${target} == ${curr.timestamp} → TARGET`, kind: "target" })
        targetNode = curr
        break
      }
      if (target < curr.timestamp) {
        frames.push({ ts: curr.timestamp, label: `${target} < ${curr.timestamp} → LEFT`, kind: "compare" })
        curr = curr.left || null
      } else {
        frames.push({ ts: curr.timestamp, label: `${target} > ${curr.timestamp} → RIGHT`, kind: "compare" })
        curr = curr.right || null
      }
    }

    if (!targetNode) {
      frames.push({ ts: -1, label: `NO EVENT AT ${target} · NOTHING TO DELETE`, kind: "missing" })
    } else if (!targetNode.left && !targetNode.right) {
      frames.push({ ts: target, label: "LEAF NODE · DETACH", kind: "remove" })
    } else if (!targetNode.left || !targetNode.right) {
      frames.push({
        ts: target,
        label: `ONE CHILD · ${targetNode.left ? "LEFT" : "RIGHT"} SUBTREE SPLICES UP`,
        kind: "remove",
      })
    } else {
      let succ: BSTNode = targetNode.right
      frames.push({ ts: succ.timestamp, label: "TWO CHILDREN · SCAN RIGHT SUBTREE", kind: "successor" })
      while (succ.left) {
        succ = succ.left
        frames.push({ ts: succ.timestamp, label: `SUCCESSOR ${succ.timestamp} ← LEFT`, kind: "successor" })
      }
      frames.push({ ts: target, label: `SUCCESSOR ${succ.timestamp} REPLACES ${target}`, kind: "remove" })
    }

    const visitedAcc: number[] = []
    const stepsAcc: string[] = []

    setVisitedNodes([])
    setComparisonSteps([])
    setFoundEvent(null)
    setTimelineReconstructed(null)
    setDeleting(true)
    setDeletingTs(null)
    setSuccessorTs(null)
    setActiveSearchTs(null)
    setStatusMsg(`Deleting ${target} · locating node first`)

    let i = 0

    const finish = () => {
      setDeleting(false)
      setActiveSearchTs(null)
      setDeletingTs(null)
      setSuccessorTs(null)
    }

    const playStep = () => {
      if (runId !== searchRunRef.current) return
      const frame = frames[i]
      if (!frame) {
        finish()
        return
      }

      if (frame.ts >= 0) {
        visitedAcc.push(frame.ts)
        setVisitedNodes([...visitedAcc])
        setActiveSearchTs(frame.ts)
        centerOn(frame.ts)
      }
      setSuccessorTs(frame.kind === "successor" ? frame.ts : null)
      stepsAcc.push(frame.label)
      setComparisonSteps([...stepsAcc])
      i += 1

      if (frame.kind === "missing") {
        setStatusMsg(`No telemetry event at ${target} · nothing deleted`)
        finish()
        return
      }

      if (frame.kind === "remove") {
        setDeletingTs(frame.ts)
        setActiveSearchTs(frame.ts)
        setSuccessorTs(null)
        setStatusMsg(`Removing event ${frame.ts} · restructuring tree…`)
        searchTimerRef.current = setTimeout(() => {
          if (runId !== searchRunRef.current) return
          const updated = deleteNode(tree, target)
          setTree(updated)
          setLayoutVersion((v) => v + 1)
          setFoundEvent(null)
          setTimelineReconstructed(null)
          stepsAcc.push(`DELETE ${target} · BST REBALANCED`)
          setComparisonSteps([...stepsAcc])
          setStatusMsg(`Event ${target} removed · tree rebalanced`)
          finish()
          setTimeout(() => fitView(), 60)
        }, 780)
        return
      }

      if (i < frames.length) {
        setStatusMsg(`Deleting ${target} · step ${i}/${frames.length}`)
        searchTimerRef.current = setTimeout(playStep, 620)
      } else {
        finish()
      }
    }

    playStep()
  }, [searchTs, tree, centerOn, fitView, stopSearchAnimation])

  const handleReconstructTimeline = useCallback(() => {
    if (!tree) return
    stopSearchAnimation()
    const ordered: BSTNode[] = []
    inorderCollect(tree, ordered)
    setTimelineReconstructed(ordered)
    setComparisonSteps([
      "INORDER · LEFT → ROOT → RIGHT",
      `${ordered.length} EVENTS RECONSTRUCTED`,
    ])
    setStatusMsg("Chronological timeline reconstructed")
  }, [tree, stopSearchAnimation])

  const handleReset = useCallback(() => {
    stopSearchAnimation()
    setTree(INITIAL_TREE)
    setLayoutVersion((v) => v + 1)
    setVisitedNodes([])
    setFoundEvent(null)
    setTimelineReconstructed(null)
    setComparisonSteps([`RESET · ${INITIAL_NODE_COUNT} MISSION EVENTS RESTORED`])
    setStatusMsg("Default mission tree restored")
    setTimeout(() => fitView(), 50)
  }, [fitView, stopSearchAnimation])

  const fetchSatnogsTimeline = async () => {
    stopSearchAnimation()
    setSatnogsLoading(true)
    setStatusMsg("Querying SatNOGS observation timeline…")
    try {
      const data = await fetchSatnogsTelemetry(7)
      if (data.packets && data.packets.length > 0) {
        let newTree = tree
        const steps: string[] = ["INGESTING SATNOGS TIMELINE"]
        data.packets.forEach((p) => {
          const shortTs = p.timestamp % 10000
          const isAnomaly = p.battery_status < 85.0
          const nodeToInsert: BSTNode = {
            timestamp: shortTs,
            event: isAnomaly
              ? `Low batt ${p.battery_status}%`
              : `Pass ${p.ground_station.slice(0, 10)}`,
            anomaly: isAnomaly,
            left: null,
            right: null,
          }
          newTree = insertNode(newTree, nodeToInsert, steps)
        })
        setTree(newTree)
        setLayoutVersion((v) => v + 1)
        setComparisonSteps(steps.slice(0, 8))
        setStatusMsg(`${data.packets.length} SatNOGS passes indexed into BST`)
        setTimeout(() => fitView(), 100)
      }
    } catch {
      setStatusMsg("SatNOGS timeline unavailable · retry")
    } finally {
      setSatnogsLoading(false)
    }
  }

  const statusTone: Tone = /unavailable|no telemetry|nothing deleted/i.test(statusMsg) ? "fair" : "good"

  return (
    <div className="flex flex-col gap-4">
      <ExperimentHeader
        code="05"
        tag="BST · timestamp ordered"
        title="Mission Event Explorer"
        state={
          searching ? "SEARCHING…" : deleting ? "DELETING…" : foundEvent ? "MATCH FOUND" : "O(log n) SEARCH"
        }
        stateTone={searching || deleting ? "fair" : foundEvent ? "good" : "accent"}
        actions={
          <>
            <ToolButton
              icon={Globe}
              variant="live"
              onClick={fetchSatnogsTimeline}
              disabled={satnogsLoading}
            >
              {satnogsLoading ? "Ingesting" : "SatNOGS"}
            </ToolButton>
            <ToolButton icon={Calendar} variant="primary" onClick={handleReconstructTimeline}>
              Reconstruct
            </ToolButton>
            <ToolButton icon={RotateCcw} onClick={handleReset}>
              Reset
            </ToolButton>
          </>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:items-center sm:gap-7">
            <Metric label="Events" value={nodeCount} tone="accent" />
            <Metric label="Height" value={treeHeight} sub="levels" />
            <Metric
              label="Comparisons"
              value={visitedNodes.length || "—"}
              tone="fair"
            />
            <Metric
              label="Match"
              value={foundEvent ? `${foundEvent.ts}` : "—"}
              tone={foundEvent ? "good" : "muted"}
            />
          </div>
          <div className="flex items-center gap-2 font-mono text-[9px]">
            <span className="text-[#3d6bff]">left &lt; root</span>
            <span className="text-white/15">·</span>
            <span className="text-[#3ddc97]">right &gt; root</span>
          </div>
        </div>
      </ExperimentHeader>

      <GlassPanel className="p-4 md:p-5">
        <PanelHeader
          icon={GitBranch}
          title="Event tree"
          meta="drag · scroll · double-click fit"
          right={
            <div className="flex items-center gap-2 font-mono text-[8px] text-white/30">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-[#3d6bff]" /> visited
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-[#ff5c7a]" /> anomaly
              </span>
              <button
                onClick={fitView}
                className="ml-1 rounded border border-white/[0.08] p-1 text-white/40 transition hover:text-white"
                aria-label="Fit tree"
              >
                <Maximize2 className="size-2.5" />
              </button>
            </div>
          }
        />

        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={fitView}
          className={cn(
            "relative mt-4 h-[360px] w-full select-none overflow-hidden rounded-xl border border-white/[0.07] bg-black/40 sm:h-[420px] lg:h-[470px]",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 grid-dots opacity-20" />

          <svg width="100%" height="100%" className="relative mx-auto block select-none">
            <defs>
              <filter id="bst-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <pattern
                id="bst-grid-pattern"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
                patternTransform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
              >
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
                <circle cx="0" cy="0" r="1" fill="rgba(61,220,151,0.16)" />
              </pattern>
            </defs>

            <rect width="100%" height="100%" fill="url(#bst-grid-pattern)" />

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {nodes.map((n) => {
                const leftKey = n.leftTs !== undefined ? `${Math.min(n.timestamp, n.leftTs)}-${Math.max(n.timestamp, n.leftTs)}` : ""
                const rightKey = n.rightTs !== undefined ? `${Math.min(n.timestamp, n.rightTs)}-${Math.max(n.timestamp, n.rightTs)}` : ""
                return (
                  <g key={`edges-${n.timestamp}`}>
                    {n.leftX !== undefined && n.leftY !== undefined && (
                      <>
                        <line x1={n.x} y1={n.y + 24} x2={n.leftX} y2={n.leftY - 24} stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
                        {visitedEdgeKeys.has(leftKey) && (
                          <line
                            x1={n.x}
                            y1={n.y + 24}
                            x2={n.leftX}
                            y2={n.leftY - 24}
                            stroke="#3d6bff"
                            strokeWidth="1.8"
                            className="flow-line"
                          />
                        )}
                      </>
                    )}
                    {n.rightX !== undefined && n.rightY !== undefined && (
                      <>
                        <line x1={n.x} y1={n.y + 24} x2={n.rightX} y2={n.rightY - 24} stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
                        {visitedEdgeKeys.has(rightKey) && (
                          <line
                            x1={n.x}
                            y1={n.y + 24}
                            x2={n.rightX}
                            y2={n.rightY - 24}
                            stroke="#3d6bff"
                            strokeWidth="1.8"
                            className="flow-line"
                          />
                        )}
                      </>
                    )}
                  </g>
                )
              })}

              {nodes.map((n, i) => {
                const isVisited = visitedNodes.includes(n.timestamp)
                const isMatch = foundEvent?.ts === n.timestamp
                const isCurrent = (searching || deleting) && activeSearchTs === n.timestamp
                const isDeleting = deletingTs === n.timestamp
                const isSuccessor = successorTs === n.timestamp && !isDeleting

                return (
                  <g
                    key={`node-${n.timestamp}-${layoutVersion}`}
                    onClick={() => {
                      if (dragDistRef.current > 4) return
                      setSearchTs(String(n.timestamp))
                    }}
                    className="animate-node-in cursor-pointer"
                    style={{ animationDelay: `${Math.min(i * 35, 350)}ms` }}
                  >
                    <rect
                      x={n.x - 55}
                      y={n.y - 24}
                      width="110"
                      height="48"
                      rx="10"
                      className={cn(
                        "transition-all duration-300",
                        isDeleting
                          ? "fill-[#ff5c7a]/25 stroke-[#ff5c7a]"
                          : isMatch
                            ? "fill-[#3ddc97]/20 stroke-[#3ddc97]"
                            : isSuccessor
                              ? "fill-[#3ddc97]/12 stroke-[#3ddc97]/70"
                              : isCurrent
                                ? "fill-[#ffb547]/16 stroke-[#ffb547]"
                                : isVisited
                                  ? "fill-[#3d6bff]/18 stroke-[#3d6bff]"
                                  : n.anomaly
                                    ? "fill-[#ff5c7a]/12 stroke-[#ff5c7a]/55"
                                    : "fill-black/70 stroke-white/20"
                      )}
                      strokeWidth={isMatch || isVisited || isCurrent || isDeleting || isSuccessor ? 1.8 : 1}
                      filter={isMatch || isDeleting ? "url(#bst-glow)" : undefined}
                    />
                    {isMatch && (
                      <rect
                        x={n.x - 61}
                        y={n.y - 30}
                        width="122"
                        height="60"
                        rx="13"
                        fill="none"
                        stroke="#3ddc97"
                        strokeWidth="1"
                        className="animate-pulse-ring"
                        style={{ transformBox: "fill-box", transformOrigin: "center" }}
                      />
                    )}
                    {isDeleting && (
                      <rect
                        x={n.x - 61}
                        y={n.y - 30}
                        width="122"
                        height="60"
                        rx="13"
                        fill="none"
                        stroke="#ff5c7a"
                        strokeWidth="1.4"
                        className="animate-pulse-ring"
                        style={{ transformBox: "fill-box", transformOrigin: "center" }}
                      />
                    )}
                    {isCurrent && !isDeleting && (
                      <rect
                        x={n.x - 61}
                        y={n.y - 30}
                        width="122"
                        height="60"
                        rx="13"
                        fill="none"
                        stroke="#ffb547"
                        strokeWidth="1"
                        className="animate-pulse-ring"
                        style={{ transformBox: "fill-box", transformOrigin: "center" }}
                      />
                    )}
                    <text
                      x={n.x}
                      y={n.y - 3}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="14"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      T:{n.timestamp}
                    </text>
                    <text
                      x={n.x}
                      y={n.y + 14}
                      textAnchor="middle"
                      fill={n.anomaly ? "#ff5c7a" : "rgba(255,255,255,0.48)"}
                      fontSize="9.5"
                      fontFamily="monospace"
                    >
                      {n.event.length > 17 ? `${n.event.substring(0, 16)}…` : n.event}
                    </text>
                  </g>
                )
              })}
            </g>
          </svg>

          <div className="pointer-events-none absolute bottom-2 right-2 rounded-md border border-white/[0.06] bg-black/50 px-2 py-1 font-mono text-[8px] text-white/25 backdrop-blur">
            {zoom.toFixed(2)}× · {nodeCount} nodes
          </div>
        </div>
      </GlassPanel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <GlassPanel className="p-4 lg:col-span-8">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <GlassTile className="p-2.5">
              <Label>Find / delete event</Label>
              <div className="mt-1.5 flex items-center gap-1.5">
                <label htmlFor={searchTsId} className="sr-only">
                  Search timestamp
                </label>
                <Field
                  id={searchTsId}
                  type="number"
                  value={searchTs}
                  onChange={(e) => setSearchTs(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="1600"
                />
                <ToolButton
                  icon={Search}
                  variant="primary"
                  onClick={handleSearch}
                  disabled={searching || deleting}
                >
                  {searching ? "Scanning" : "Find"}
                </ToolButton>
                <ToolButton
                  icon={Trash2}
                  variant="danger"
                  onClick={handleDelete}
                  disabled={searching || deleting}
                >
                  {deleting ? "Deleting" : "Delete"}
                </ToolButton>
              </div>
            </GlassTile>

            <GlassTile className="p-2.5">
              <Label>Insert event</Label>
              <div className="mt-1.5 flex items-center gap-1.5">
                <label htmlFor={insertTsId} className="sr-only">
                  Timestamp
                </label>
                <Field
                  id={insertTsId}
                  type="number"
                  value={insertTs}
                  onChange={(e) => setInsertTs(e.target.value)}
                  placeholder="1650"
                  className="w-20 shrink-0"
                />
                <label htmlFor={insertEventId} className="sr-only">
                  Event name
                </label>
                <Field
                  id={insertEventId}
                  type="text"
                  value={insertEvent}
                  onChange={(e) => setInsertEvent(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInsert()}
                  placeholder="Event description"
                />
                <ToolButton icon={Plus} variant="live" onClick={handleInsert} aria-label="Insert event">
                  <span className="sr-only">Insert</span>
                </ToolButton>
              </div>
            </GlassTile>
          </div>

          <StatusLine tone={statusTone} className="mt-2.5">
            {statusMsg}
          </StatusLine>
        </GlassPanel>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <GlassPanel className="p-4">
            <PanelHeader
              icon={ArrowRight}
              title="Traversal steps"
              right={
                <Badge tone={searching || deleting ? "fair" : foundEvent ? "good" : "muted"}>
                  {searching ? "scanning" : deleting ? "deleting" : `${comparisonSteps.length} steps`}
                </Badge>
              }
            />

            <div
              ref={stepsRef}
              className="mt-3 min-h-[84px] max-h-[240px] space-y-1 overflow-y-auto"
            >
              {comparisonSteps.map((step, idx) => (
                <div
                  key={`${step}-${idx}`}
                  className="animate-node-in flex items-start gap-1.5 font-mono text-[9px] leading-relaxed"
                  style={{ animationDelay: `${searching ? 0 : idx * 30}ms` }}
                >
                  <ArrowRight className="mt-0.5 size-2.5 shrink-0 text-[#3d6bff]/70" />
                  <span
                    className={cn(
                      step.includes("MATCH") || step.includes("RECONSTRUCTED")
                        ? "font-semibold text-[#3ddc97]"
                        : step.includes("LEFT")
                          ? "text-[#3d6bff]"
                          : step.includes("RIGHT")
                            ? "text-[#ffb547]"
                            : "text-white/55"
                    )}
                  >
                    {step}
                  </span>
                </div>
              ))}
              {(searching || deleting) && (
                <div
                  className={cn(
                    "flex items-center gap-1.5 font-mono text-[9px]",
                    deleting ? "text-[#ff5c7a]" : "text-[#ffb547]"
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 animate-pulse rounded-full",
                      deleting ? "bg-[#ff5c7a]" : "bg-[#ffb547]"
                    )}
                  />
                  {deleting ? "restructuring tree…" : "comparing node…"}
                </div>
              )}
            </div>

            {foundEvent && (
              <div className="mt-3 rounded-lg border border-[#3ddc97]/30 bg-[#3ddc97]/[0.07] p-2.5">
                <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold text-[#3ddc97]">
                  <CheckCircle2 className="size-3" />
                  EVENT LOCATED
                </div>
                <div className="mt-1.5 font-mono text-[11px] font-semibold text-white">
                  {foundEvent.event}
                </div>
                <div className="mt-0.5 font-mono text-[9px] text-white/35">
                  T:{foundEvent.ts} · anomaly flag {foundEvent.anomaly ? "set" : "clear"}
                </div>
                {foundEvent.anomaly && (
                  <div className="mt-1.5 flex items-center gap-1 font-mono text-[9px] text-[#ff5c7a]">
                    <AlertTriangle className="size-3" />
                    CRITICAL ANOMALY
                  </div>
                )}
              </div>
            )}
          </GlassPanel>

          <GlassPanel soft className="p-4">
            <div className="flex items-center justify-between">
              <span className="mono-label text-[8px] text-[#8a8f98]">Complexity</span>
              <span className="font-mono text-[8px] text-[#3d6bff]">balanced tree</span>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center">
              {[
                { k: "search", v: "O(log n)", t: "text-[#3ddc97]" },
                { k: "worst", v: "O(n)", t: "text-[#ffb547]" },
                { k: "inorder", v: "O(n)", t: "text-[#3d6bff]" },
              ].map((x) => (
                <div key={x.k} className="rounded-md border border-white/[0.06] bg-black/25 py-1.5">
                  <div className="mono-label text-[7px] text-white/25">{x.k}</div>
                  <div className={cn("mt-0.5 font-mono text-[9px]", x.t)}>{x.v}</div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>

      {timelineReconstructed && (
        <GlassPanel className="p-4 md:p-5">
          <PanelHeader
            icon={Calendar}
            title="Chronological timeline"
            meta="inorder · left → root → right"
            right={<Badge tone="good">{timelineReconstructed.length} events</Badge>}
          />

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {timelineReconstructed.map((node, i) => (
              <div key={node.timestamp} className="flex items-center gap-1.5">
                <GlassTile
                  className="animate-node-in px-2.5 py-1.5"
                  style={{ animationDelay: `${Math.min(i * 45, 500)}ms` }}
                >
                  <div className="font-mono text-[8px] font-bold text-[#3d6bff]">
                    T:{node.timestamp}
                  </div>
                  <div className="mt-0.5 max-w-[140px] truncate font-mono text-[9px] text-white/75">
                    {node.event}
                  </div>
                </GlassTile>
                {i < timelineReconstructed.length - 1 && (
                  <ArrowRight className="size-3 text-white/15" />
                )}
              </div>
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  )
}
