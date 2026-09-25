"use client"

import { useState, useId, useSyncExternalStore, useCallback } from "react"
import { SectionLabel } from "@/components/brand/Brand"
import {
  Hash,
  Search,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  Cpu,
  ChevronDown,
  ChevronUp,
  Globe
} from "lucide-react"

const emptySubscribe = () => () => {}
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

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
  { slot: 9, packet_id: null, payload_data: null, status: "EMPTY" }
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
    "INITIAL LOAD: Slots 1 (P101), 2 (P201), 4 (P104) occupied",
    "HASH FORMULA: hash(key) = key % 10"
  ])
  const [statusMsg, setStatusMsg] = useState<string>("Hash table ready: 3/10 slots occupied (30% load factor)")
  const [codeOpen, setCodeOpen] = useState<boolean>(false)
  const [isDemoRunning, setIsDemoRunning] = useState<boolean>(false)
  const [satnogsLoading, setSatnogsLoading] = useState<boolean>(false)

  const occupiedCount = table.filter((s) => s.status === "OCCUPIED").length
  const loadFactor = ((occupiedCount / HASH_SIZE) * 100).toFixed(0)

  const addLog = (msg: string) => {
    setOpLog((prev) => [msg, ...prev].slice(0, 10))
  }

  const handleInsert = useCallback(() => {
    const id = parseInt(newPktId, 10)
    if (isNaN(id) || !newPayload.trim()) return

    if (occupiedCount >= HASH_SIZE) {
      setStatusMsg("TABLE OVERFLOW: Hash table completely full (100% load)")
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
      setStatusMsg("INSERT FAILED: No available slots found during probing")
      return
    }

    setProbedSlots(probes)
    setHighlightSlot(insertedSlot)

    setTable((prev) => {
      const copy = [...prev]
      copy[insertedSlot] = {
        slot: insertedSlot,
        packet_id: id,
        payload_data: newPayload.trim(),
        status: "OCCUPIED"
      }
      return copy
    })

    if (insertedSlot === initialHash) {
      addLog(`INSERT ${id} → SLOT ${insertedSlot} (Direct hash ${id} % 10 = ${initialHash})`)
      setStatusMsg(`INSERT: Packet #${id} placed at Slot [${insertedSlot}] directly`)
    } else {
      addLog(`INSERT ${id} → COLLISION at ${initialHash} → PROBED TO SLOT ${insertedSlot}`)
      setStatusMsg(`COLLISION DETECTED: Hash ${initialHash} was occupied. Linear probed to Slot [${insertedSlot}].`)
    }
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
      if (table[curr].status === "EMPTY") {
        break
      }
      curr = (curr + 1) % HASH_SIZE
    }

    setProbedSlots(probes)
    setHighlightSlot(foundSlot)

    if (foundSlot !== null) {
      addLog(`SEARCH ${id} → FOUND AT SLOT ${foundSlot} (${probes.length} probes)`)
      setStatusMsg(`SEARCH SUCCESS: Packet #${id} located at Slot [${foundSlot}]. Data: ${table[foundSlot].payload_data}`)
    } else {
      addLog(`SEARCH ${id} → NOT FOUND (Checked slots: ${probes.join(", ")})`)
      setStatusMsg(`SEARCH FAILED: Packet #${id} not present in hash table.`)
    }
  }, [searchKey, table])

  const handleDelete = useCallback(() => {
    const id = parseInt(searchKey, 10)
    if (isNaN(id)) return

    const initialHash = id % HASH_SIZE
    let curr = initialHash
    let deletedSlot: number | null = null

    for (let i = 0; i < HASH_SIZE; i++) {
      if (table[curr].status === "OCCUPIED" && table[curr].packet_id === id) {
        deletedSlot = curr
        break
      }
      if (table[curr].status === "EMPTY") break
      curr = (curr + 1) % HASH_SIZE
    }

    if (deletedSlot !== null) {
      setTable((prev) => {
        const copy = [...prev]
        copy[deletedSlot!] = {
          slot: deletedSlot!,
          packet_id: null,
          payload_data: null,
          status: "DELETED"
        }
        return copy
      })
      setHighlightSlot(deletedSlot)
      addLog(`DELETE ${id} → SLOT ${deletedSlot} MARKED AS DELETED (DUMMY MARKER)`)
      setStatusMsg(`DELETE: Slot [${deletedSlot}] marked DELETED. Preserves linear probing chain for future lookups.`)
    } else {
      setStatusMsg(`DELETE FAILED: Packet #${id} not found in table`)
    }
  }, [searchKey, table])

  const runCollisionDemo = useCallback(() => {
    setIsDemoRunning(true)
    setStatusMsg("DEMO: Running automated collision & probe chain verification...")

    const demoPackets = [
      { id: 101, payload: "COMM_PING" },
      { id: 201, payload: "ATTITUDE_QUAT" },
      { id: 111, payload: "IMAGE_CHUNK_3" },
      { id: 104, payload: "SOLAR_TRACK" },
      { id: 114, payload: "BATTERY_BAL" }
    ]

    const freshTable: HashSlot[] = Array.from({ length: HASH_SIZE }, (_, i) => ({
      slot: i,
      packet_id: null,
      payload_data: null,
      status: "EMPTY"
    }))

    demoPackets.forEach((p) => {
      const h = p.id % HASH_SIZE
      let s = h
      while (freshTable[s].status === "OCCUPIED") {
        s = (s + 1) % HASH_SIZE
      }
      freshTable[s] = {
        slot: s,
        packet_id: p.id,
        payload_data: p.payload,
        status: "OCCUPIED"
      }
    })

    setTable(freshTable)
    setSearchKey("111")
    addLog("DEMO: Inserted 101, 201, 111 (all hash to 1) and 104, 114 (hash to 4)")

    setTimeout(() => {
      freshTable[2] = { slot: 2, packet_id: null, payload_data: null, status: "DELETED" }
      setTable([...freshTable])
      addLog("DEMO: Deleted Packet 201 at Slot 2 → Marked DELETED (DUMMY)")

      setTimeout(() => {
        setProbedSlots([1, 2, 3])
        setHighlightSlot(3)
        addLog("DEMO: Searching 111 → Passed through Slot 2 (DELETED) → Found at Slot 3!")
        setStatusMsg("DEMO COMPLETE: Probing chained successfully past DELETED dummy marker to find 111")
        setIsDemoRunning(false)
      }, 1000)
    }, 1200)
  }, [])

  const handleReset = useCallback(() => {
    setTable(INITIAL_TABLE)
    setProbedSlots([])
    setHighlightSlot(null)
    setNewPktId("111")
    setSearchKey("111")
    setIsDemoRunning(false)
    setOpLog(["RESET: Restored default hash table state"])
    setStatusMsg("Hash table restored to initial state")
  }, [])

  const indexSatnogsPackets = async () => {
    setSatnogsLoading(true)
    setStatusMsg("Querying SatNOGS database to index live telemetry packets...")
    try {
      const res = await fetch(`${API_BASE}/api/satnogs/telemetry?limit=5`)
      if (res.ok) {
        const data = await res.json()
        if (data.packets && data.packets.length > 0) {
          const freshTable: HashSlot[] = Array.from({ length: HASH_SIZE }, (_, i) => ({
            slot: i,
            packet_id: null,
            payload_data: null,
            status: "EMPTY"
          }))

          data.packets.slice(0, 5).forEach((p: { packet_id: number; ground_station: string; transmitter_mode: string }) => {
            const id = p.packet_id % 10000
            const payload = `${p.ground_station.slice(0, 10)}_${p.transmitter_mode}`
            const h = id % HASH_SIZE
            let s = h
            while (freshTable[s].status === "OCCUPIED") {
              s = (s + 1) % HASH_SIZE
            }
            freshTable[s] = {
              slot: s,
              packet_id: id,
              payload_data: payload,
              status: "OCCUPIED"
            }
          })

          setTable(freshTable)
          setSearchKey(String(data.packets[0].packet_id % 10000))
          addLog(`SATNOGS: Ingested & hashed ${Math.min(5, data.packets.length)} live satellite packets`)
          setStatusMsg(`Indexed SatNOGS packets with linear probing collision resolution`)
        }
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
              <SectionLabel accent>EXPERIMENT 08</SectionLabel>
              <span className="rounded border border-white/[0.12] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#8a8f98]">
                DATA STRUCTURE / HASH TABLE / LINEAR PROBING
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#3ddc97]">
                <span className={`size-1.5 rounded-full ${occupiedCount > 7 ? "bg-[#ff5c7a]" : "bg-[#3ddc97]"}`} />
                {occupiedCount > 7 ? "⚠ HIGH LOAD FACTOR" : "OPTIMAL LOAD"}
              </span>
            </div>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-white md:text-2xl">
              INSTANT TELEMETRY LOOKUP
            </h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#8a8f98]">
              Explore how hashing provides fast packet indexing and retrieval for onboard telemetry processing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={indexSatnogsPackets}
              disabled={satnogsLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#3ddc97]/40 bg-[#3ddc97]/10 px-3.5 py-2 font-mono text-xs font-semibold text-[#3ddc97] transition hover:bg-[#3ddc97]/20 active:scale-95 disabled:opacity-40"
            >
              <Globe className={`size-3.5 ${satnogsLoading ? "animate-spin" : ""}`} />
              <span>{satnogsLoading ? "INDEXING..." : "INDEX SATNOGS DB"}</span>
            </button>

            <button
              onClick={runCollisionDemo}
              disabled={mounted ? isDemoRunning : false}
              suppressHydrationWarning
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3d6bff] px-3.5 py-2 font-mono text-xs font-semibold text-white shadow-md shadow-[#3d6bff]/20 transition hover:bg-[#3d6bff]/90 active:scale-95 disabled:opacity-40"
            >
              <Play className="size-3.5 fill-current" />
              <span>{isDemoRunning ? "RUNNING DEMO..." : "[ RUN COLLISION DEMO ]"}</span>
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

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-3 font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="text-[#8a8f98]">HASH FUNCTION:</span>
            <span className="text-[#3d6bff] font-bold">hash(key) = key % 10</span>
            <span className="text-white/30">|</span>
            <span className="text-[#8a8f98]">PROBING:</span>
            <span className="text-[#3ddc97] font-semibold">(index + 1) % 10</span>
          </div>

          <span className="text-[11px] text-[#8a8f98]">{statusMsg}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs">
        <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4">
          <div className="text-[10px] text-[#8a8f98]">TABLE CAPACITY</div>
          <div className="mt-1 text-xl font-bold text-white">{HASH_SIZE} SLOTS</div>
          <div className="text-[10px] text-[#8a8f98]">Index [0..9]</div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4">
          <div className="text-[10px] text-[#8a8f98]">OCCUPIED SLOTS</div>
          <div className="mt-1 text-xl font-bold text-[#3ddc97]">{occupiedCount} / {HASH_SIZE}</div>
          <div className="text-[10px] text-[#8a8f98]">{HASH_SIZE - occupiedCount} Empty</div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4">
          <div className="text-[10px] text-[#8a8f98]">LOAD FACTOR (α)</div>
          <div className="mt-1 text-xl font-bold text-[#3d6bff]">{loadFactor}%</div>
          <div className="text-[10px] text-[#8a8f98]">{occupiedCount > 7 ? "High Collision Risk" : "Normal"}</div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4">
          <div className="text-[10px] text-[#8a8f98]">AVERAGE LOOKUP</div>
          <div className="mt-1 text-xl font-bold text-[#3ddc97]">O(1)</div>
          <div className="text-[10px] text-[#8a8f98]">Direct array access</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Hash className="size-4 text-[#3d6bff]" />
                <span className="font-mono text-xs font-semibold tracking-wider text-white uppercase">
                  HASH TABLE SLOTS (SIZE = 10)
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[10px] text-[#8a8f98]">
                <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-[#3ddc97]" /> OCCUPIED</span>
                <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-[#ffb547]" /> DELETED (DUMMY)</span>
                <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-white/20" /> EMPTY</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5 font-mono text-xs">
              {table.map((slot) => {
                const isProbed = probedSlots.includes(slot.slot)
                const isHighlighted = highlightSlot === slot.slot

                return (
                  <div
                    key={slot.slot}
                    className={`relative rounded-lg border p-3 transition-all duration-300 ${
                      isHighlighted
                        ? "border-[#3ddc97] bg-[#3ddc97]/20 shadow-lg shadow-[#3ddc97]/20"
                        : isProbed
                        ? "border-[#3d6bff] bg-[#3d6bff]/20"
                        : slot.status === "OCCUPIED"
                        ? "border-[#3d6bff]/50 bg-black/60"
                        : slot.status === "DELETED"
                        ? "border-[#ffb547]/40 bg-[#ffb547]/10"
                        : "border-white/[0.06] bg-black/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#8a8f98]">SLOT {slot.slot}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${
                          slot.status === "OCCUPIED"
                            ? "bg-[#3ddc97]/20 text-[#3ddc97]"
                            : slot.status === "DELETED"
                            ? "bg-[#ffb547]/20 text-[#ffb547]"
                            : "bg-white/[0.06] text-white/40"
                        }`}
                      >
                        {slot.status}
                      </span>
                    </div>

                    <div className="mt-2 min-h-[38px]">
                      {slot.status === "OCCUPIED" ? (
                        <>
                          <div className="font-bold text-white text-[11px]">PKT #{slot.packet_id}</div>
                          <div className="text-[9px] text-[#8a8f98] truncate">{slot.payload_data}</div>
                        </>
                      ) : slot.status === "DELETED" ? (
                        <div className="text-[9px] text-[#ffb547] font-mono leading-tight">
                          DUMMY MARKER (Chain Preserved)
                        </div>
                      ) : (
                        <div className="text-[10px] text-white/20 font-mono">NULL / EMPTY</div>
                      )}
                    </div>

                    {isProbed && (
                      <div className="absolute -top-2 left-2 rounded bg-[#3d6bff] px-1 text-[8px] font-bold text-white">
                        PROBED
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-white/[0.08] bg-black/40 p-3.5">
                <span className="font-mono text-xs font-semibold text-white">INSERT PACKET</span>
                <div className="mt-2.5 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor={inputPktId} className="w-16 font-mono text-[10px] text-[#8a8f98]">ID (Key):</label>
                    <input
                      id={inputPktId}
                      type="number"
                      value={newPktId}
                      onChange={(e) => setNewPktId(e.target.value)}
                      className="w-full rounded border border-white/[0.15] bg-black/60 px-2.5 py-1 font-mono text-xs text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor={inputPayloadId} className="w-16 font-mono text-[10px] text-[#8a8f98]">Payload:</label>
                    <input
                      id={inputPayloadId}
                      type="text"
                      value={newPayload}
                      onChange={(e) => setNewPayload(e.target.value)}
                      className="w-full rounded border border-white/[0.15] bg-black/60 px-2.5 py-1 font-mono text-xs text-white"
                    />
                  </div>
                  <button
                    onClick={handleInsert}
                    className="mt-1 inline-flex items-center justify-center gap-1.5 rounded bg-[#3d6bff] py-1.5 font-mono text-xs font-semibold text-white transition hover:bg-[#3d6bff]/90"
                  >
                    <Plus className="size-3.5" />
                    <span>[ INSERT PACKET ]</span>
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-white/[0.08] bg-black/40 p-3.5">
                <span className="font-mono text-xs font-semibold text-white">SEARCH / DELETE PACKET</span>
                <div className="mt-2.5 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor={searchInputId} className="w-16 font-mono text-[10px] text-[#8a8f98]">Packet ID:</label>
                    <input
                      id={searchInputId}
                      type="number"
                      value={searchKey}
                      onChange={(e) => setSearchKey(e.target.value)}
                      placeholder="e.g. 111"
                      className="w-full rounded border border-white/[0.15] bg-black/60 px-2.5 py-1 font-mono text-xs text-white"
                    />
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      onClick={handleSearch}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded bg-[#3d6bff] py-1.5 font-mono text-xs font-semibold text-white transition hover:bg-[#3d6bff]/90 active:scale-95"
                    >
                      <Search className="size-3.5" />
                      <span>[ SEARCH ]</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      className="inline-flex items-center gap-1.5 rounded border border-[#ff5c7a]/40 bg-[#ff5c7a]/15 px-3 py-1.5 font-mono text-xs font-semibold text-[#ff5c7a] transition hover:bg-[#ff5c7a]/25"
                    >
                      <Trash2 className="size-3.5" />
                      <span>DELETE</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <span className="font-mono text-xs font-semibold tracking-wider text-white uppercase">
                WHY USE DELETED / DUMMY MARKERS?
              </span>
            </div>

            <div className="mt-3 space-y-2.5 font-mono text-[11px] text-[#8a8f98]">
              <p>
                In open addressing (linear probing), searching stops when an <span className="text-white font-bold">EMPTY</span> slot is encountered.
              </p>
              <div className="rounded border border-white/[0.08] bg-black/40 p-2.5 text-white/90">
                If a deleted slot became completely EMPTY, search for colliding keys inserted further down the probe chain would terminate prematurely and report &quot;NOT FOUND&quot;.
              </div>
              <p className="text-[#ffb547]">
                Marking it <span className="font-bold">DELETED</span> allows search to continue through the chain while allowing new insertions to reuse the slot.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <span className="font-mono text-xs font-semibold text-white uppercase">
                OPERATION LOG
              </span>
            </div>

            <div className="mt-3 max-h-[160px] space-y-1.5 overflow-y-auto font-mono text-[11px]">
              {opLog.map((log, idx) => (
                <div key={idx} className="rounded border border-white/[0.04] bg-black/40 p-1.5 text-[#8a8f98]">
                  <span className={log.includes("FOUND") ? "text-[#3ddc97]" : log.includes("COLLISION") ? "text-[#ffb547]" : log.includes("DELETE") ? "text-[#ff5c7a]" : "text-white/80"}>
                    {log}
                  </span>
                </div>
              ))}
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
            <span>VIEW C IMPLEMENTATION (HashIndexer.c)</span>
          </div>
          {codeOpen ? <ChevronUp className="size-4 text-[#8a8f98]" /> : <ChevronDown className="size-4 text-[#8a8f98]" />}
        </button>

        {codeOpen && (
          <div className="mt-4 rounded-lg border border-white/[0.08] bg-black/80 p-4 font-mono text-xs leading-relaxed text-[#8a8f98]">
            <pre className="overflow-x-auto text-[11px]">
              <code>{`#define SIZE 10

typedef enum { EMPTY, OCCUPIED, DELETED } SlotStatus;

typedef struct {
    int packet_id;
    char payload_data[32];
    SlotStatus status;
} HashItem;

HashItem hashTable[SIZE];

int hashCode(int key) {
    return key % SIZE;
}

void insertPacket(int key, const char* data) {
    int index = hashCode(key);
    int start = index;
    while (hashTable[index].status == OCCUPIED) {
        index = (index + 1) % SIZE;
        if (index == start) return; // Table full
    }
    hashTable[index].packet_id = key;
    strncpy(hashTable[index].payload_data, data, 31);
    hashTable[index].status = OCCUPIED;
}

int searchPacket(int key) {
    int index = hashCode(key);
    int start = index;
    while (hashTable[index].status != EMPTY) {
        if (hashTable[index].status == OCCUPIED && hashTable[index].packet_id == key) {
            return index;
        }
        index = (index + 1) % SIZE;
        if (index == start) break;
    }
    return -1;
}

void deletePacket(int key) {
    int slot = searchPacket(key);
    if (slot != -1) {
        hashTable[slot].status = DELETED; // Dummy marker
    }
}`}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
