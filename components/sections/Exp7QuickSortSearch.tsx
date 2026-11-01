"use client"

import { useState, useId, useSyncExternalStore, useCallback, useRef, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import {
  ArrowUpDown,
  Search,
  RotateCcw,
  CheckCircle2,
  Layers,
  Globe,
  Gauge,
  Volume2,
  VolumeX,
} from "lucide-react"

import { fetchSatnogsTelemetry } from "@/lib/satnogsClient"
import { SortAudio } from "@/lib/sortAudio"
import {
  Badge,
  ExperimentHeader,
  Field,
  GlassPanel,
  GlassTile,
  IconButton,
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

interface TelemetryItem {
  packet_id: string
  timestamp: number
  event: string
}

const SAMPLE_EVENTS = [
  "UHF Beacon Ping",
  "Solar Array Deploy",
  "Battery Voltage Check",
  "Magnetometer Sync",
  "Star Tracker Fix",
  "Reaction Wheel Spin",
  "Payload SSTV Frame",
  "Flash Memory Audit",
  "Thermal Sensor Read",
  "Ground Downlink Pass",
]

function generateDataset(size: number): TelemetryItem[] {
  const baseTime = 1719749300
  const offsets = [62, 1, 88, 15, 50, 24, 71, 9, 33, 95, 42, 81, 19, 58, 77]
  const list: TelemetryItem[] = []
  for (let i = 0; i < size; i++) {
    const offset = i < offsets.length ? offsets[i] : (i * 37) % 500
    list.push({
      packet_id: `P${101 + i}`,
      timestamp: baseTime + offset,
      event: SAMPLE_EVENTS[i % SAMPLE_EVENTS.length],
    })
  }
  return list
}

interface SortFrame {
  array: TelemetryItem[]
  pivot: number | null
  active: number[]
}

function buildSortFrames(items: TelemetryItem[]): SortFrame[] {
  const arr = [...items]
  const frames: SortFrame[] = []

  const push = (pivot: number | null, active: number[] = []) => {
    frames.push({ array: [...arr], pivot, active })
  }

  const quicksort = (low: number, high: number) => {
    if (low >= high) return
    const pivotValue = arr[high].timestamp
    push(high, [low, high])

    let i = low
    for (let j = low; j < high; j++) {
      if (arr[j].timestamp < pivotValue) {
        if (i !== j) {
          const temp = arr[i]
          arr[i] = arr[j]
          arr[j] = temp
          push(i, [i, j])
        }
        i++
      }
    }

    if (i !== high) {
      const temp = arr[i]
      arr[i] = arr[high]
      arr[high] = temp
      push(i, [i, high])
    }

    quicksort(low, i - 1)
    quicksort(i + 1, high)
  }

  quicksort(0, arr.length - 1)
  push(null, [])
  return frames
}

interface SearchFrame {
  left: number
  mid: number
  right: number
  found: boolean
}

export function Exp7QuickSortSearch() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const searchInputId = useId()

  const [datasetSize, setDatasetSize] = useState<number>(24)
  const [data, setData] = useState<TelemetryItem[]>(() => generateDataset(24))
  const [isSorted, setIsSorted] = useState<boolean>(false)
  const [sortingActive, setSortingActive] = useState<boolean>(false)
  const [sortFrames, setSortFrames] = useState<SortFrame[] | null>(null)
  const [sortIndex, setSortIndex] = useState<number>(0)
  const [searchTs, setSearchTs] = useState<string>("1719749350")
  const [searchPointers, setSearchPointers] = useState<{ left: number; mid: number; right: number } | null>(null)
  const [matchedItem, setMatchedItem] = useState<TelemetryItem | null>(null)
  const [searchComparisons, setSearchComparisons] = useState<{ linear: number; binary: number } | null>(null)
  const [searchingActive, setSearchingActive] = useState<boolean>(false)
  const [statusMsg, setStatusMsg] = useState<string>("Raw telemetry buffer · unsorted timestamps")
  const [satnogsLoading, setSatnogsLoading] = useState<boolean>(false)
  const [soundOn, setSoundOn] = useState<boolean>(true)

  const sortTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const searchTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<SortAudio | null>(null)

  const getAudio = useCallback(() => {
    if (!audioRef.current) audioRef.current = new SortAudio()
    return audioRef.current
  }, [])

  const toggleSound = () => {
    const audio = getAudio()
    const next = !soundOn
    audio.setMuted(!next)
    setSoundOn(next)
    if (next) {
      audio.ensure()
      audio.blip(0.55, { duration: 0.09, gain: 0.35 })
    }
  }

  const clearTimers = useCallback(() => {
    if (sortTimer.current) clearInterval(sortTimer.current)
    if (searchTimer.current) clearInterval(searchTimer.current)
    sortTimer.current = null
    searchTimer.current = null
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  useEffect(() => {
    return () => {
      audioRef.current?.dispose()
      audioRef.current = null
    }
  }, [])

  const resetSearch = () => {
    setSearchPointers(null)
    setMatchedItem(null)
    setSearchComparisons(null)
    setSearchingActive(false)
  }

  const handleSizeChange = (sz: number) => {
    clearTimers()
    setDatasetSize(sz)
    setData(generateDataset(sz))
    setIsSorted(false)
    setSortingActive(false)
    setSortFrames(null)
    setSortIndex(0)
    resetSearch()
    setStatusMsg(`${sz} packets generated · unsorted`)
  }

  const runQuickSort = useCallback(() => {
    if (sortingActive) return
    clearTimers()
    resetSearch()

    const frames = buildSortFrames(data)
    if (frames.length <= 1) {
      setIsSorted(true)
      setStatusMsg("Array already sorted")
      return
    }

    setSortFrames(frames)
    setSortIndex(0)
    setSortingActive(true)
    setIsSorted(false)
    setStatusMsg("QUICKSORT · partitioning around pivot")

    const audio = getAudio()
    audio.ensure()
    audio.start()

    const total = frames.length
    const skip = Math.max(1, Math.ceil(total / 80))
    let cursor = 0

    let lo = Infinity
    let hi = -Infinity
    for (const item of data) {
      if (item.timestamp < lo) lo = item.timestamp
      if (item.timestamp > hi) hi = item.timestamp
    }
    const audioSpan = Math.max(1, hi - lo)

    sortTimer.current = setInterval(() => {
      cursor += skip
      if (cursor >= total - 1) {
        if (sortTimer.current) clearInterval(sortTimer.current)
        sortTimer.current = null
        setSortFrames(null)
        setSortIndex(0)
        setData(frames[total - 1].array)
        setIsSorted(true)
        setSortingActive(false)
        setStatusMsg(`QUICKSORT COMPLETE · ${data.length} packets ordered in O(n log n)`)
        audio.flourish()
      } else {
        setSortIndex(cursor)

        // one note per animation step, pitched by the pivot's timestamp
        const step = frames[cursor]
        const pitchIdx = step.pivot ?? Math.floor(step.array.length / 2)
        const pitchValue = step.array[pitchIdx]?.timestamp ?? lo
        audio.blip((pitchValue - lo) / audioSpan, {
          gain: 0.34 + (cursor % 4) * 0.05,
          duration: 0.07,
        })
      }
    }, 45)
  }, [data, sortingActive, clearTimers, getAudio])

  const runBinarySearch = useCallback(() => {
    if (!isSorted) {
      setStatusMsg("Binary search needs a sorted array · run QuickSort first")
      return
    }

    const target = parseInt(searchTs, 10)
    if (isNaN(target)) {
      setStatusMsg("Enter a numeric timestamp")
      return
    }

    if (searchTimer.current) clearInterval(searchTimer.current)

    const frames: SearchFrame[] = []
    let l = 0
    let r = data.length - 1

    while (l <= r) {
      const m = Math.floor((l + r) / 2)
      const found = data[m].timestamp === target
      frames.push({ left: l, mid: m, right: r, found })
      if (found) break
      if (data[m].timestamp < target) l = m + 1
      else r = m - 1
    }

    if (frames.length === 0) {
      setSearchPointers(null)
      setMatchedItem(null)
      setSearchComparisons({ linear: data.length, binary: 0 })
      setStatusMsg(`No packet at timestamp ${target}`)
      return
    }

    setSearchingActive(true)
    setMatchedItem(null)
    setStatusMsg(`BINARY SEARCH · target ${target}`)

    let i = 0
    searchTimer.current = setInterval(() => {
      const frame = frames[i]
      setSearchPointers({ left: frame.left, mid: frame.mid, right: frame.right })

      if (frame.found) {
        const item = data[frame.mid]
        let linearComparisons = 0
        for (let k = 0; k < data.length; k++) {
          linearComparisons++
          if (data[k].timestamp === target) break
        }
        setMatchedItem(item)
        setSearchComparisons({ linear: linearComparisons, binary: frames.length })
        setStatusMsg(`FOUND at index ${frame.mid} · ${frames.length} comparisons`)
        setSearchingActive(false)
        if (searchTimer.current) clearInterval(searchTimer.current)
        searchTimer.current = null
        return
      }

      if (i === frames.length - 1) {
        setMatchedItem(null)
        setSearchComparisons({ linear: data.length, binary: frames.length })
        setStatusMsg(`No packet at timestamp ${target} · ${frames.length} comparisons`)
        setSearchingActive(false)
        if (searchTimer.current) clearInterval(searchTimer.current)
        searchTimer.current = null
        return
      }

      i++
    }, 520)
  }, [isSorted, searchTs, data])

  const handleReset = useCallback(() => {
    clearTimers()
    setData(generateDataset(datasetSize))
    setIsSorted(false)
    setSortingActive(false)
    setSortFrames(null)
    setSortIndex(0)
    resetSearch()
    setStatusMsg("Telemetry buffer reset · unsorted")
  }, [datasetSize, clearTimers])

  const fetchSatnogsDataset = async () => {
    clearTimers()
    setSatnogsLoading(true)
    setStatusMsg("Querying SatNOGS for orbital pass frames…")
    try {
      const res = await fetchSatnogsTelemetry(Math.min(datasetSize, 20))
      if (res.packets && res.packets.length > 0) {
        const liveData: TelemetryItem[] = res.packets.map((p) => ({
          packet_id: `P${p.packet_id % 10000}`,
          timestamp: p.timestamp,
          event: `${p.ground_station.slice(0, 14)} (${p.transmitter_mode})`,
        }))
        setData(liveData)
        setIsSorted(false)
        setSortingActive(false)
        setSortFrames(null)
        resetSearch()
        setSearchTs(String(liveData[Math.floor(liveData.length / 2)].timestamp))
        setStatusMsg(`${liveData.length} live SatNOGS packets loaded · raw order`)
      }
    } catch {
      setStatusMsg("SatNOGS dataset unavailable · retry")
    } finally {
      setSatnogsLoading(false)
    }
  }

  const displayData = sortFrames ? sortFrames[sortIndex]?.array ?? data : data
  const frame = sortFrames ? sortFrames[sortIndex] : null

  const { minTs, maxTs } = useMemo(() => {
    let lo = Infinity
    let hi = -Infinity
    for (const item of data) {
      lo = Math.min(lo, item.timestamp)
      hi = Math.max(hi, item.timestamp)
    }
    return { minTs: lo, maxTs: hi }
  }, [data])

  const span = Math.max(1, maxTs - minTs)
  const barCount = displayData.length
  const showLabels = barCount <= 24
  const sortProgress = sortFrames ? ((sortIndex + 1) / sortFrames.length) * 100 : isSorted ? 100 : 0

  const statusTone: Tone = /unavailable|needs a sorted|numeric|No packet/i.test(statusMsg)
    ? "fair"
    : matchedItem
      ? "good"
      : sortingActive || searchingActive
        ? "accent"
        : "muted"

  return (
    <div className="flex flex-col gap-4">
      <ExperimentHeader
        code="07"
        tag="quicksort · binary search"
        title="Telemetry Search Engine"
        state={sortingActive ? "SORTING" : searchingActive ? "SEARCHING" : isSorted ? "SORTED · READY" : "UNSORTED"}
        stateTone={sortingActive || searchingActive ? "accent" : isSorted ? "good" : "fair"}
        actions={
          <>
            <ToolButton
              icon={Globe}
              variant="live"
              onClick={fetchSatnogsDataset}
              disabled={satnogsLoading}
            >
              {satnogsLoading ? "Loading" : "SatNOGS"}
            </ToolButton>
            <ToolButton
              icon={ArrowUpDown}
              variant="primary"
              onClick={runQuickSort}
              disabled={mounted ? sortingActive || isSorted : false}
              suppressHydrationWarning
            >
              {sortingActive ? "Sorting" : "Run QuickSort"}
            </ToolButton>
            <ToolButton icon={RotateCcw} onClick={handleReset}>
              Reset
            </ToolButton>
          </>
        }
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-end gap-5">
            <div>
              <Label>Dataset</Label>
              <div className="mt-1 flex items-center gap-1">
                {[12, 24, 48, 96].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => handleSizeChange(sz)}
                    className={cn(
                      "rounded-md px-2 py-1 font-mono text-[9px] tabular-nums transition",
                      datasetSize === sz
                        ? "bg-[#3d6bff] font-semibold text-white shadow-[0_6px_18px_-8px_rgba(61,107,255,1)]"
                        : "bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white"
                    )}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <Metric label="Packets" value={barCount} />
            <Metric label="Pivot" value={frame?.pivot ?? "—"} tone="fair" />
            <Metric
              label="Comparisons"
              value={searchComparisons ? searchComparisons.binary : "—"}
              tone="accent"
            />
          </div>

          <div className="w-full max-w-[260px]">
            <div className="flex items-center justify-between">
              <Label>{sortingActive ? "Partition progress" : isSorted ? "Sorted" : "Raw order"}</Label>
              <span className="font-mono text-[9px] tabular-nums text-white/45">
                {Math.round(sortProgress)}%
              </span>
            </div>
            <ProgressBar
              value={sortProgress}
              tone={isSorted ? "good" : sortingActive ? "accent" : "muted"}
              className="mt-1.5"
            />
          </div>
        </div>
      </ExperimentHeader>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <GlassPanel className="p-4 md:p-5 lg:col-span-8">
          <PanelHeader
            icon={Layers}
            title="Packet array"
            meta={`${barCount} packets`}
            right={
              <div className="flex items-center gap-1.5">
                <IconButton
                  icon={soundOn ? Volume2 : VolumeX}
                  onClick={toggleSound}
                  aria-label={soundOn ? "Mute sort audio" : "Unmute sort audio"}
                  aria-pressed={soundOn}
                  title={soundOn ? "Sort audio on" : "Sort audio muted"}
                  className={cn(!soundOn && "text-white/25")}
                />
                <Badge tone={isSorted ? "good" : "fair"}>
                  {isSorted ? "sorted ascending" : "unsorted raw"}
                </Badge>
              </div>
            }
          />

          <div className="relative mt-4">
            <div className="relative h-[240px] w-full overflow-hidden rounded-xl border border-white/[0.06] bg-black/40">
              <div aria-hidden className="pointer-events-none absolute inset-0 grid-lines opacity-30" />
              <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/10" />

              {displayData.map((item, i) => {
                const height = 12 + 80 * ((item.timestamp - minTs) / span)
                const isPivot = frame?.pivot === i
                const isActive = frame?.active.includes(i) ?? false
                const isMid = searchPointers?.mid === i
                const isMatch = matchedItem?.packet_id === item.packet_id
                const inWindow =
                  searchPointers !== null &&
                  i >= searchPointers.left &&
                  i <= searchPointers.right

                return (
                  <button
                    key={item.packet_id}
                    onClick={() => setSearchTs(String(item.timestamp))}
                    className="group absolute bottom-0 top-0"
                    style={{
                      left: `${(i / barCount) * 100}%`,
                      width: `${100 / barCount}%`,
                      transition: "left 200ms ease, width 200ms ease",
                    }}
                    title={`${item.packet_id} · ${item.timestamp} · ${item.event}`}
                  >
                    <span
                      className={cn(
                        "absolute inset-x-[2px] bottom-0 rounded-t-[2px] transition-all duration-200",
                        isMatch
                          ? "bg-[#3ddc97] shadow-[0_0_16px_rgba(61,220,151,0.8)]"
                          : isPivot
                            ? "bg-[#ffb547] shadow-[0_0_14px_rgba(255,181,71,0.6)]"
                            : isMid
                              ? "bg-[#3d6bff] shadow-[0_0_14px_rgba(61,107,255,0.8)]"
                              : isActive
                                ? "bg-[#3d6bff]/80"
                                : inWindow
                                  ? "bg-gradient-to-t from-[#3d6bff]/45 to-[#3d6bff]/12"
                                  : "bg-gradient-to-t from-white/70 to-white/20 group-hover:from-[#3d6bff]/70 group-hover:to-[#3d6bff]/25"
                      )}
                      style={{ height: `${height}%`, transitionProperty: "height, background-color, box-shadow" }}
                    />
                    {showLabels && (
                      <span className="absolute inset-x-0 top-1 hidden truncate text-center font-mono text-[6px] text-white/30 sm:block">
                        {item.timestamp % 1000}
                      </span>
                    )}
                  </button>
                )
              })}

              {searchPointers && (
                <>
                  {[
                    { key: "L", idx: searchPointers.left, color: "bg-[#3ddc97]", text: "text-black" },
                    { key: "M", idx: searchPointers.mid, color: "bg-[#3d6bff]", text: "text-white" },
                    { key: "R", idx: searchPointers.right, color: "bg-[#ffb547]", text: "text-black" },
                  ].map((marker) => (
                    <span
                      key={marker.key}
                      className={cn(
                        "pointer-events-none absolute -top-0.5 z-10 -translate-x-1/2 rounded px-1 py-px font-mono text-[7px] font-black transition-all duration-500",
                        marker.color,
                        marker.text
                      )}
                      style={{ left: `${((marker.idx + 0.5) / barCount) * 100}%` }}
                    >
                      {marker.key}
                    </span>
                  ))}
                </>
              )}
            </div>

            <div className="mt-1 flex items-center justify-between font-mono text-[8px] text-white/25">
              <span>{minTs}</span>
              <span>timestamp →</span>
              <span>{maxTs}</span>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/30 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 flex-1">
                <Label>Binary search timestamp</Label>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <label htmlFor={searchInputId} className="sr-only">
                    Timestamp
                  </label>
                  <Field
                    id={searchInputId}
                    type="number"
                    value={searchTs}
                    onChange={(e) => setSearchTs(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runBinarySearch()}
                    placeholder="1719749350"
                  />
                  <ToolButton
                    icon={Search}
                    variant="primary"
                    onClick={runBinarySearch}
                    disabled={mounted ? !isSorted : false}
                    suppressHydrationWarning
                  >
                    Search
                  </ToolButton>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 font-mono text-[9px]">
                <span className="text-white/25">window</span>
                <span className="text-[#3ddc97]">
                  {searchPointers ? `${searchPointers.right - searchPointers.left + 1}` : "—"}
                </span>
              </div>
            </div>

            {!isSorted && (
              <div className="mt-2 flex items-center gap-1.5 font-mono text-[9px] text-[#ffb547]">
                <ArrowUpDown className="size-3" />
                Run QuickSort to unlock O(log n) binary search
              </div>
            )}
          </div>

          <StatusLine tone={statusTone} pulse={sortingActive || searchingActive} className="mt-2.5">
            {statusMsg}
          </StatusLine>
        </GlassPanel>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <GlassPanel className="p-4">
            <PanelHeader
              icon={Search}
              title="Search result"
              right={<Badge tone={matchedItem ? "good" : "muted"}>{matchedItem ? "hit" : "idle"}</Badge>}
            />

            {matchedItem ? (
              <div className="mt-3">
                <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold text-[#3ddc97]">
                  <CheckCircle2 className="size-3" />
                  EVENT LOCATED
                </div>
                <div className="mt-2 font-mono text-[16px] font-semibold leading-none text-white">
                  {matchedItem.packet_id}
                </div>
                <div className="mt-1 font-mono text-[10px] text-[#3ddc97]">
                  {matchedItem.event}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <GlassTile className="p-2.5">
                    <Label>Timestamp</Label>
                    <div className="mt-1 font-mono text-[10px] tabular-nums text-white/80">
                      {matchedItem.timestamp}
                    </div>
                  </GlassTile>
                  <GlassTile className="p-2.5">
                    <Label>Comparisons</Label>
                    <div className="mt-1 font-mono text-[10px] tabular-nums text-[#3ddc97]">
                      {searchComparisons?.binary ?? "—"}
                    </div>
                  </GlassTile>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center justify-center py-5 text-center">
                <Search className="size-7 text-white/12" />
                <div className="mt-2 font-mono text-[10px] text-white/40">NO EVENT SELECTED</div>
                <div className="mt-1 font-mono text-[9px] text-white/20">
                  enter a timestamp and search
                </div>
              </div>
            )}
          </GlassPanel>

          <GlassPanel className="p-4">
            <PanelHeader icon={Gauge} title="Search cost" meta="linear vs binary" />

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-black/25 px-2.5 py-2">
                <div>
                  <div className="font-mono text-[10px] font-semibold text-white/70">LINEAR</div>
                  <div className="mono-label text-[7px] text-white/25">O(n) scan</div>
                </div>
                <div className="font-mono text-[13px] tabular-nums text-[#ff5c7a]">
                  {searchComparisons ? searchComparisons.linear : `~${Math.floor(data.length / 2)}`}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[#3d6bff]/30 bg-[#3d6bff]/[0.08] px-2.5 py-2">
                <div>
                  <div className="font-mono text-[10px] font-semibold text-[#3d6bff]">BINARY</div>
                  <div className="mono-label text-[7px] text-white/25">O(log n) divide</div>
                </div>
                <div className="font-mono text-[13px] tabular-nums text-[#3ddc97]">
                  {searchComparisons ? searchComparisons.binary : `~${Math.ceil(Math.log2(data.length))}`}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/[0.06] pt-2">
                <span className="mono-label text-[7px] text-white/25">speed-up</span>
                <span className={cn("font-mono text-[10px]", TONE.good.text)}>
                  {searchComparisons
                    ? `${(searchComparisons.linear / Math.max(1, searchComparisons.binary)).toFixed(1)}×`
                    : "—"}
                </span>
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  )
}
