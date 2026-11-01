"use client"

import { useState, useId, useSyncExternalStore, useCallback, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  Hash,
  Search,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  Globe,
  Gauge,
  Activity,
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
  ProgressBar,
  StatusLine,
  ToolButton,
  TONE,
  type Tone,
} from "@/components/sections/flight/ui"

const emptySubscribe = () => () => {}
const HASH_SIZE = 10

type SlotStatus = "EMPTY" | "OCCUPIED" | "DELETED"

interface HashSlot {
  slot: number
  packet_id: number | null
  payload_data: string | null
  status: SlotStatus
}

const INITIAL_TABLE: HashSlot[] = [
  { slot: 0, packet_id: null, payload_data: null, status: "EMPTY" },
  { slot: 1, packet_id: 101, payload_data: "BATTERY_HEALTH_98", status: "OCCUPIED" },
  { slot: 2, packet_id: 201, payload_data: "SOLAR_PANEL_VOLT", status: "OCCUPIED" },
  { slot: 3, packet_id: null, payload_data: null, status: "EMPTY" },
  { slot: 4, packet_id: 104, payload_data: "GPS_FIX_TELEMETRY", status: "OCCUPIED" },
  { slot: 5, packet_id: null, payload_data: null, status: "EMPTY" },
  { slot: 6, packet_id: null, payload_data: null, status: "EMPTY" },
  { slot: 7, packet_id: null, payload_data: null, status: "EMPTY" },
  { slot: 8, packet_id: null, payload_data: null, status: "EMPTY" },
  { slot: 9, packet_id: null, payload_data: null, status: "EMPTY" },
]

export function Exp8HashIndexer() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const inputPktId = useId()
  const inputPayloadId = useId()
  const searchInputId = useId()

  const [table, setTable] = useState<HashSlot[]>(INITIAL_TABLE)
  const [newPktId, setNewPktId] = useState<string>("111")
  const [newPayload, setNewPayload] = useState<string>("STAR_TRACKER_ATTITUDE")
  const [searchKey, setSearchKey] = useState<string>("111")
  const [probedSlots, setProbedSlots] = useState<number[]>([])
  const [highlightSlot, setHighlightSlot] = useState<number | null>(null)
  const [opLog, setOpLog] = useState<string[]>([
    "LOAD · slots 1, 2, 4 occupied",
    "hash(key) = key % 10",
  ])
  const [statusMsg, setStatusMsg] = useState<string>("Hash table ready · 3/10 slots occupied")
  const [isDemoRunning, setIsDemoRunning] = useState<boolean>(false)
  const [satnogsLoading, setSatnogsLoading] = useState<boolean>(false)

  const probeTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const demoTimers = useRef<Array<ReturnType<typeof setTimeout>>>([])

  const occupiedCount = table.filter((s) => s.status === "OCCUPIED").length
  const loadFactor = (occupiedCount / HASH_SIZE) * 100

  const addLog = (msg: string) => {
    setOpLog((prev) => [msg, ...prev].slice(0, 9))
  }

  const clearTimers = useCallback(() => {
    if (probeTimer.current) clearInterval(probeTimer.current)
    probeTimer.current = null
    demoTimers.current.forEach(clearTimeout)
    demoTimers.current = []
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  const animateProbes = (
    probes: number[],
    finalSlot: number | null,
    onDone?: () => void
  ) => {
    if (probeTimer.current) clearInterval(probeTimer.current)
    setProbedSlots([])
    setHighlightSlot(null)

    if (probes.length === 0) {
      setHighlightSlot(finalSlot)
      onDone?.()
      return
    }

    let i = 0
    probeTimer.current = setInterval(() => {
      i++
      setProbedSlots(probes.slice(0, i))
      if (i >= probes.length) {
        if (probeTimer.current) clearInterval(probeTimer.current)
        probeTimer.current = null
        setHighlightSlot(finalSlot)
        onDone?.()
      }
    }, 130)
  }

  const handleInsert = useCallback(() => {
    const id = parseInt(newPktId, 10)
    if (isNaN(id) || !newPayload.trim()) return

    if (occupiedCount >= HASH_SIZE) {
      setStatusMsg("Table overflow · all slots occupied")
      return
    }

    const initialHash = id % HASH_SIZE
    let curr = initialHash
    const probes: number[] = []
    let insertedSlot = -1

    for (let i = 0; i < HASH_SIZE; i++) {
      probes.push(curr)
      if (table[curr].status === "EMPTY" || table[curr].status === "DELETED") {
        insertedSlot = curr
        break
      }
      curr = (curr + 1) % HASH_SIZE
    }

    if (insertedSlot === -1) {
      setStatusMsg("Insert failed · no free slot in probe chain")
      return
    }

    const payload = newPayload.trim()
    const collided = insertedSlot !== initialHash

    setStatusMsg(
      collided
        ? `Collision at ${initialHash} · probing to slot ${insertedSlot}`
        : `Direct write · slot ${insertedSlot}`
    )

    animateProbes(probes, insertedSlot, () => {
      setTable((prev) => {
        const copy = [...prev]
        copy[insertedSlot] = {
          slot: insertedSlot,
          packet_id: id,
          payload_data: payload,
          status: "OCCUPIED",
        }
        return copy
      })
      addLog(
        collided
          ? `INSERT ${id} · collision ${initialHash} → probe ${insertedSlot}`
          : `INSERT ${id} → slot ${insertedSlot}`
      )
    })
  }, [newPktId, newPayload, occupiedCount, table])

  const handleSearch = useCallback(() => {
    const id = parseInt(searchKey, 10)
    if (isNaN(id)) return

    const initialHash = id % HASH_SIZE
    let curr = initialHash
    const probes: number[] = []
    let foundSlot: number | null = null

    for (let i = 0; i < HASH_SIZE; i++) {
      probes.push(curr)
      if (table[curr].status === "OCCUPIED" && table[curr].packet_id === id) {
        foundSlot = curr
        break
      }
      if (table[curr].status === "EMPTY") break
      curr = (curr + 1) % HASH_SIZE
    }

    setStatusMsg(
      foundSlot !== null
        ? `Packet ${id} found at slot ${foundSlot} · ${probes.length} probes`
        : `Packet ${id} not present · ${probes.length} probes`
    )

    animateProbes(probes, foundSlot, () => {
      addLog(
        foundSlot !== null
          ? `SEARCH ${id} · found at slot ${foundSlot}`
          : `SEARCH ${id} · not found (${probes.length} probes)`
      )
    })
  }, [searchKey, table])

  const handleDelete = useCallback(() => {
    const id = parseInt(searchKey, 10)
    if (isNaN(id)) return

    let curr = id % HASH_SIZE
    const probes: number[] = []
    let deletedSlot: number | null = null

    for (let i = 0; i < HASH_SIZE; i++) {
      probes.push(curr)
      if (table[curr].status === "OCCUPIED" && table[curr].packet_id === id) {
        deletedSlot = curr
        break
      }
      if (table[curr].status === "EMPTY") break
      curr = (curr + 1) % HASH_SIZE
    }

    if (deletedSlot !== null) {
      setStatusMsg(`Slot ${deletedSlot} marked DELETED · chain preserved`)
      animateProbes(probes, deletedSlot, () => {
        setTable((prev) => {
          const copy = [...prev]
          copy[deletedSlot!] = {
            slot: deletedSlot!,
            packet_id: null,
            payload_data: null,
            status: "DELETED",
          }
          return copy
        })
        addLog(`DELETE ${id} · slot ${deletedSlot} marked DELETED`)
      })
    } else {
      setStatusMsg(`Delete failed · packet ${id} not found`)
    }
  }, [searchKey, table])

  const runCollisionDemo = useCallback(() => {
    clearTimers()
    setIsDemoRunning(true)
    setStatusMsg("Demo · building collision chain…")

    const demoPackets = [
      { id: 101, payload: "COMM_PING" },
      { id: 201, payload: "ATTITUDE_QUAT" },
      { id: 111, payload: "IMAGE_CHUNK_3" },
      { id: 104, payload: "SOLAR_TRACK" },
      { id: 114, payload: "BATTERY_BAL" },
    ]

    const freshTable: HashSlot[] = Array.from({ length: HASH_SIZE }, (_, i) => ({
      slot: i,
      packet_id: null,
      payload_data: null,
      status: "EMPTY" as SlotStatus,
    }))

    demoPackets.forEach((p) => {
      let s = p.id % HASH_SIZE
      while (freshTable[s].status === "OCCUPIED") s = (s + 1) % HASH_SIZE
      freshTable[s] = {
        slot: s,
        packet_id: p.id,
        payload_data: p.payload,
        status: "OCCUPIED",
      }
    })

    setTable(freshTable)
    setProbedSlots([])
    setHighlightSlot(null)
    addLog("DEMO · 101, 201, 111 hash to slot 1 · 104, 114 to slot 4")

    demoTimers.current.push(
      setTimeout(() => {
        const updated = [...freshTable]
        updated[2] = { slot: 2, packet_id: null, payload_data: null, status: "DELETED" }
        setTable(updated)
        setSearchKey("111")
        addLog("DEMO · deleted 201 at slot 2 · dummy marker")
        setStatusMsg("Demo · probing past DELETED marker")

        demoTimers.current.push(
          setTimeout(() => {
            animateProbes([1, 2, 3], 3, () => {
              addLog("DEMO · search 111 passed slot 2 → found slot 3")
              setStatusMsg("Demo complete · probing chained past DELETED")
              setIsDemoRunning(false)
            })
          }, 700)
        )
      }, 1100)
    )
  }, [clearTimers])

  const handleReset = useCallback(() => {
    clearTimers()
    setTable(INITIAL_TABLE)
    setProbedSlots([])
    setHighlightSlot(null)
    setNewPktId("111")
    setSearchKey("111")
    setIsDemoRunning(false)
    setOpLog(["RESET · default hash table restored"])
    setStatusMsg("Hash table restored · 3/10 slots occupied")
  }, [clearTimers])

  const indexSatnogsPackets = async () => {
    clearTimers()
    setSatnogsLoading(true)
    setStatusMsg("Indexing live SatNOGS packets…")
    try {
      const data = await fetchSatnogsTelemetry(5)
      if (data.packets && data.packets.length > 0) {
        const freshTable: HashSlot[] = Array.from({ length: HASH_SIZE }, (_, i) => ({
          slot: i,
          packet_id: null,
          payload_data: null,
          status: "EMPTY" as SlotStatus,
        }))

        data.packets.slice(0, 5).forEach((p) => {
          const id = p.packet_id % 10000
          const payload = `${p.ground_station.slice(0, 10)}_${p.transmitter_mode}`
          let s = id % HASH_SIZE
          while (freshTable[s].status === "OCCUPIED") s = (s + 1) % HASH_SIZE
          freshTable[s] = {
            slot: s,
            packet_id: id,
            payload_data: payload,
            status: "OCCUPIED",
          }
        })

        setTable(freshTable)
        setProbedSlots([])
        setHighlightSlot(null)
        setSearchKey(String(data.packets[0].packet_id % 10000))
        addLog(`SATNOGS · ${Math.min(5, data.packets.length)} packets hashed`)
        setStatusMsg("SatNOGS packets indexed · linear probing active")
      }
    } catch {
      setStatusMsg("SatNOGS index unavailable · retry")
    } finally {
      setSatnogsLoading(false)
    }
  }

  const statusTone: Tone = /overflow|failed|not present|unavailable/i.test(statusMsg)
    ? "fair"
    : highlightSlot !== null
      ? "good"
      : "muted"

  return (
    <div className="flex flex-col gap-4">
      <ExperimentHeader
        code="08"
        tag="hash table · linear probing"
        title="Instant Telemetry Lookup"
        state={occupiedCount > 7 ? "HIGH LOAD" : "OPTIMAL LOAD"}
        stateTone={occupiedCount > 7 ? "poor" : "good"}
        actions={
          <>
            <ToolButton
              icon={Globe}
              variant="live"
              onClick={indexSatnogsPackets}
              disabled={satnogsLoading}
            >
              {satnogsLoading ? "Indexing" : "SatNOGS"}
            </ToolButton>
            <ToolButton
              icon={Play}
              variant="primary"
              onClick={runCollisionDemo}
              disabled={mounted ? isDemoRunning : false}
              suppressHydrationWarning
            >
              {isDemoRunning ? "Running" : "Collision demo"}
            </ToolButton>
            <ToolButton icon={RotateCcw} onClick={handleReset}>
              Reset
            </ToolButton>
          </>
        }
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:items-center sm:gap-7">
            <Metric label="Capacity" value={HASH_SIZE} unit="slots" />
            <Metric label="Occupied" value={`${occupiedCount}/${HASH_SIZE}`} tone="good" />
            <Metric label="Load α" value={loadFactor.toFixed(0)} unit="%" tone="accent" />
            <Metric label="Lookup" value="O(1)" tone="good" />
          </div>

          <div className="flex items-center gap-2 font-mono text-[9px]">
            <span className="text-white/25">hash</span>
            <span className="text-[#3d6bff]">key % 10</span>
            <span className="text-white/15">·</span>
            <span className="text-[#3ddc97]">(i + 1) % 10</span>
          </div>
        </div>
      </ExperimentHeader>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <GlassPanel className="p-4 md:p-5 lg:col-span-8">
          <PanelHeader
            icon={Hash}
            title="Hash table"
            meta="size = 10"
            right={
              <div className="flex items-center gap-2.5 font-mono text-[8px] text-white/30">
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-[#3ddc97]" /> occupied
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-[#ffb547]" /> deleted
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-white/20" /> empty
                </span>
              </div>
            }
          />

          <div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
            {table.map((slot) => {
              const isProbed = probedSlots.includes(slot.slot)
              const isHighlighted = highlightSlot === slot.slot
              const probeIndex = probedSlots.indexOf(slot.slot)

              return (
                <div
                  key={slot.slot}
                  className={cn(
                    "relative overflow-hidden rounded-lg border p-2.5 font-mono transition-all duration-300",
                    isHighlighted
                      ? "border-[#3ddc97]/80 bg-[#3ddc97]/[0.12] shadow-[0_0_26px_-8px_rgba(61,220,151,0.9)]"
                      : isProbed
                        ? "border-[#3d6bff]/70 bg-[#3d6bff]/[0.12]"
                        : slot.status === "OCCUPIED"
                          ? "border-[#3d6bff]/35 bg-white/[0.03]"
                          : slot.status === "DELETED"
                            ? "border-[#ffb547]/35 bg-[#ffb547]/[0.06]"
                            : "border-white/[0.05] bg-black/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] tabular-nums text-white/30">
                      {String(slot.slot).padStart(2, "0")}
                    </span>
                    <span
                      className={cn(
                        "rounded px-1 py-px text-[6px] font-bold tracking-[0.1em]",
                        slot.status === "OCCUPIED"
                          ? "bg-[#3ddc97]/15 text-[#3ddc97]"
                          : slot.status === "DELETED"
                            ? "bg-[#ffb547]/15 text-[#ffb547]"
                            : "bg-white/[0.05] text-white/25"
                      )}
                    >
                      {slot.status === "OCCUPIED" ? "OCC" : slot.status === "DELETED" ? "DEL" : "FREE"}
                    </span>
                  </div>

                  <div className="mt-2 min-h-[34px]">
                    {slot.status === "OCCUPIED" ? (
                      <>
                        <div className="truncate text-[10px] font-bold text-white">
                          P#{slot.packet_id}
                        </div>
                        <div className="mt-0.5 truncate text-[7px] text-white/35">
                          {slot.payload_data}
                        </div>
                      </>
                    ) : slot.status === "DELETED" ? (
                      <div className="text-[7px] leading-tight text-[#ffb547]/80">
                        dummy marker
                        <br />
                        chain preserved
                      </div>
                    ) : (
                      <div className="text-[7px] text-white/15">NULL</div>
                    )}
                  </div>

                  {isProbed && (
                    <span className="absolute -top-px left-2 rounded-b bg-[#3d6bff] px-1 text-[6px] font-bold text-white">
                      {probeIndex + 1}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            <GlassTile className="p-2.5">
              <Label>Insert packet</Label>
              <div className="mt-1.5 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <label htmlFor={inputPktId} className="w-10 shrink-0 font-mono text-[8px] text-white/30">
                    key
                  </label>
                  <Field
                    id={inputPktId}
                    type="number"
                    value={newPktId}
                    onChange={(e) => setNewPktId(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label htmlFor={inputPayloadId} className="w-10 shrink-0 font-mono text-[8px] text-white/30">
                    data
                  </label>
                  <Field
                    id={inputPayloadId}
                    type="text"
                    value={newPayload}
                    onChange={(e) => setNewPayload(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleInsert()}
                  />
                </div>
                <ToolButton icon={Plus} variant="primary" onClick={handleInsert} className="w-full">
                  Insert
                </ToolButton>
              </div>
            </GlassTile>

            <GlassTile className="p-2.5">
              <Label>Search / delete</Label>
              <div className="mt-1.5 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <label htmlFor={searchInputId} className="w-10 shrink-0 font-mono text-[8px] text-white/30">
                    key
                  </label>
                  <Field
                    id={searchInputId}
                    type="number"
                    value={searchKey}
                    onChange={(e) => setSearchKey(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <ToolButton
                    icon={Search}
                    variant="primary"
                    onClick={handleSearch}
                    className="flex-1"
                  >
                    Search
                  </ToolButton>
                  <ToolButton icon={Trash2} variant="danger" onClick={handleDelete}>
                    Delete
                  </ToolButton>
                </div>
                <div className="flex items-center justify-between font-mono text-[8px] text-white/25">
                  <span>probes</span>
                  <span className="text-[#3d6bff]">{probedSlots.length}</span>
                </div>
              </div>
            </GlassTile>
          </div>

          <StatusLine tone={statusTone} pulse={isDemoRunning} className="mt-2.5">
            {statusMsg}
          </StatusLine>
        </GlassPanel>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <GlassPanel className="p-4">
            <PanelHeader icon={Gauge} title="Load factor" meta="α = n / m" />

            <div className="mt-3">
              <div className="flex items-end justify-between">
                <div className="font-mono text-[26px] font-semibold leading-none tabular-nums text-white">
                  {loadFactor.toFixed(0)}
                  <span className="text-[12px] font-normal text-white/30">%</span>
                </div>
                <Badge tone={occupiedCount > 7 ? "poor" : occupiedCount > 4 ? "fair" : "good"}>
                  {occupiedCount > 7 ? "high risk" : occupiedCount > 4 ? "moderate" : "optimal"}
                </Badge>
              </div>

              <ProgressBar
                value={loadFactor}
                tone={occupiedCount > 7 ? "poor" : occupiedCount > 4 ? "fair" : "good"}
                className="mt-3 h-1.5"
              />

              <div className="mt-3 grid grid-cols-2 gap-1.5">
                <GlassTile className="p-2.5">
                  <Label>Occupied</Label>
                  <div className="mt-1 font-mono text-[12px] text-[#3ddc97]">{occupiedCount}</div>
                </GlassTile>
                <GlassTile className="p-2.5">
                  <Label>Free</Label>
                  <div className="mt-1 font-mono text-[12px] text-white/60">
                    {HASH_SIZE - occupiedCount}
                  </div>
                </GlassTile>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-4">
            <PanelHeader
              icon={Activity}
              title="Operation log"
              right={<Badge tone={isDemoRunning ? "accent" : "muted"}>{isDemoRunning ? "demo" : "idle"}</Badge>}
            />

            <div className="mt-3 max-h-[220px] space-y-1 overflow-y-auto pr-1">
              {opLog.map((log, idx) => (
                <div
                  key={`${log}-${idx}`}
                  className="rounded-md border border-white/[0.04] bg-black/25 px-2 py-1 font-mono text-[8px] leading-relaxed"
                >
                  <span
                    className={cn(
                      log.includes("found") || log.includes("FOUND")
                        ? "text-[#3ddc97]"
                        : log.includes("collision") || log.includes("DELETED")
                          ? "text-[#ffb547]"
                          : log.includes("DELETE")
                            ? "text-[#ff5c7a]"
                            : "text-white/50"
                    )}
                  >
                    {log}
                  </span>
                </div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel soft className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="mono-label text-[8px] text-[#8a8f98]">Probe chain</span>
              <span className={cn("font-mono text-[8px]", TONE.accent.text)}>
                {probedSlots.length > 0 ? probedSlots.join(" → ") : "idle"}
              </span>
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  )
}
