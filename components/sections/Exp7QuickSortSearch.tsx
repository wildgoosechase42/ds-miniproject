"use client"

import { useState, useId, useSyncExternalStore, useCallback } from "react"
import { SectionLabel } from "@/components/brand/Brand"
import {
  ArrowUpDown,
  Search,
  RotateCcw,
  CheckCircle2,
  Cpu,
  ChevronDown,
  ChevronUp,
  Layers,
  Globe
} from "lucide-react"

const emptySubscribe = () => () => {}
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

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
  "Ground Downlink Pass"
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
      event: SAMPLE_EVENTS[i % SAMPLE_EVENTS.length]
    })
  }
  return list
}

export function Exp7QuickSortSearch() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const searchInputId = useId()

  const [datasetSize, setDatasetSize] = useState<number>(10)
  const [data, setData] = useState<TelemetryItem[]>(() => generateDataset(10))
  const [isSorted, setIsSorted] = useState<boolean>(false)
  const [sortingActive, setSortingActive] = useState<boolean>(false)
  const [pivotIdx, setPivotIdx] = useState<number | null>(null)
  const [searchTs, setSearchTs] = useState<string>("1719749350")
  const [searchPointers, setSearchPointers] = useState<{ left: number; mid: number; right: number } | null>(null)
  const [matchedItem, setMatchedItem] = useState<TelemetryItem | null>(null)
  const [searchComparisons, setSearchComparisons] = useState<{ linear: number; binary: number } | null>(null)
  const [statusMsg, setStatusMsg] = useState<string>("Raw telemetry buffer ready: Unsorted timestamps")
  const [codeOpen, setCodeOpen] = useState<boolean>(false)
  const [satnogsLoading, setSatnogsLoading] = useState<boolean>(false)

  const handleSizeChange = (sz: number) => {
    setDatasetSize(sz)
    setData(generateDataset(sz))
    setIsSorted(false)
    setPivotIdx(null)
    setSearchPointers(null)
    setMatchedItem(null)
    setSearchComparisons(null)
    setStatusMsg(`Dataset size updated: ${sz} telemetry packets generated`)
  }

  const runQuickSort = useCallback(() => {
    setSortingActive(true)
    setStatusMsg("QUICKSORT: Partitioning around pivot and rearranging subarrays...")

    const arr = [...data]
    let step = 0

    const quicksortHelper = (items: TelemetryItem[]): TelemetryItem[] => {
      if (items.length <= 1) return items
      const pivot = items[Math.floor(items.length / 2)]
      const left = items.filter((x) => x.timestamp < pivot.timestamp)
      const middle = items.filter((x) => x.timestamp === pivot.timestamp)
      const right = items.filter((x) => x.timestamp > pivot.timestamp)
      return [...quicksortHelper(left), ...middle, ...quicksortHelper(right)]
    }

    const interval = setInterval(() => {
      if (step < 3) {
        setPivotIdx(Math.floor(Math.random() * arr.length))
        step++
      } else {
        clearInterval(interval)
        const sorted = quicksortHelper(arr)
        setData(sorted)
        setIsSorted(true)
        setSortingActive(false)
        setPivotIdx(null)
        setStatusMsg("QUICKSORT COMPLETE: Telemetry array sorted in O(n log n) time")
      }
    }, 450)
  }, [data])

  const runBinarySearch = useCallback(() => {
    if (!isSorted) {
      setStatusMsg("ERROR: Binary search requires sorted data! Run QuickSort first.")
      return
    }

    const target = parseInt(searchTs, 10)
    if (isNaN(target)) return

    let l = 0
    let r = data.length - 1
    let binComps = 0
    let found: TelemetryItem | null = null

    const stepInterval = setInterval(() => {
      if (l <= r) {
        const m = Math.floor((l + r) / 2)
        binComps++
        setSearchPointers({ left: l, mid: m, right: r })

        if (data[m].timestamp === target) {
          found = data[m]
          setMatchedItem(found)
          clearInterval(stepInterval)

          let linComps = 0
          for (let i = 0; i < data.length; i++) {
            linComps++
            if (data[i].timestamp === target) break
          }

          setSearchComparisons({ linear: linComps, binary: binComps })
          setStatusMsg(`BINARY SEARCH: Event found at index ${m} (${binComps} comparisons vs Linear ${linComps})`)
        } else if (data[m].timestamp < target) {
          l = m + 1
        } else {
          r = m - 1
        }
      } else {
        clearInterval(stepInterval)
        setMatchedItem(null)
        setSearchComparisons({ linear: data.length, binary: binComps })
        setStatusMsg(`SEARCH: No telemetry packet found for timestamp ${target} (${binComps} comps)`)
      }
    }, 600)
  }, [isSorted, searchTs, data])

  const handleReset = useCallback(() => {
    setData(generateDataset(datasetSize))
    setIsSorted(false)
    setSortingActive(false)
    setPivotIdx(null)
    setSearchPointers(null)
    setMatchedItem(null)
    setSearchComparisons(null)
    setStatusMsg("Telemetry buffer reset to unsorted state")
  }, [datasetSize])

  const fetchSatnogsDataset = async () => {
    setSatnogsLoading(true)
    setStatusMsg("Querying SatNOGS DB for real orbital pass telemetry frames...")
    try {
      const res = await fetch(`${API_BASE}/api/satnogs/telemetry?limit=${datasetSize}`)
      if (res.ok) {
        const data = await res.json()
        if (data.packets && data.packets.length > 0) {
          const liveData: TelemetryItem[] = data.packets.map((p: { packet_id: number; timestamp: number; ground_station: string; transmitter_mode: string }) => ({
            packet_id: `P${p.packet_id % 10000}`,
            timestamp: p.timestamp,
            event: `${p.ground_station.slice(0, 14)} (${p.transmitter_mode})`
          }))
          setData(liveData)
          setIsSorted(false)
          setPivotIdx(null)
          setSearchPointers(null)
          setMatchedItem(null)
          setSearchComparisons(null)
          setSearchTs(String(liveData[Math.floor(liveData.length / 2)].timestamp))
          setStatusMsg(`Loaded ${liveData.length} real SatNOGS telemetry packets in raw timestamp order`)
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
              <SectionLabel accent>EXPERIMENT 07</SectionLabel>
              <span className="rounded border border-white/[0.12] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#8a8f98]">
                ALGORITHM / QUICKSORT / BINARY SEARCH
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#3ddc97]">
                <span className={`size-1.5 rounded-full ${isSorted ? "bg-[#3ddc97]" : "bg-[#ffb547]"}`} />
                {isSorted ? "ARRAY SORTED (BINARY SEARCH READY)" : "UNSORTED DATA"}
              </span>
            </div>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-white md:text-2xl">
              TELEMETRY SEARCH ENGINE
            </h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#8a8f98]">
              Sort telemetry packets by timestamp and rapidly locate mission events using binary search.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchSatnogsDataset}
              disabled={satnogsLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#3ddc97]/40 bg-[#3ddc97]/10 px-3.5 py-2 font-mono text-xs font-semibold text-[#3ddc97] transition hover:bg-[#3ddc97]/20 active:scale-95 disabled:opacity-40"
            >
              <Globe className={`size-3.5 ${satnogsLoading ? "animate-spin" : ""}`} />
              <span>{satnogsLoading ? "LOADING..." : "PULL SATNOGS DATASET"}</span>
            </button>

            <button
              onClick={runQuickSort}
              disabled={mounted ? sortingActive || isSorted : false}
              suppressHydrationWarning
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3d6bff] px-4 py-2 font-mono text-xs font-semibold text-white shadow-md shadow-[#3d6bff]/25 transition hover:bg-[#3d6bff]/90 active:scale-95 disabled:opacity-40"
            >
              <ArrowUpDown className="size-3.5" />
              <span>{sortingActive ? "SORTING..." : "[ RUN QUICKSORT ]"}</span>
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
            <span className="text-[#8a8f98]">DATASET SIZE:</span>
            {[10, 50, 100, 500].map((sz) => (
              <button
                key={sz}
                onClick={() => handleSizeChange(sz)}
                className={`rounded px-2.5 py-1 text-xs transition ${
                  datasetSize === sz ? "bg-[#3d6bff] text-white font-bold" : "bg-white/[0.06] text-[#8a8f98] hover:text-white"
                }`}
              >
                {sz}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-[#8a8f98]">{statusMsg}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-[#3d6bff]" />
                <span className="font-mono text-xs font-semibold tracking-wider text-white uppercase">
                  TELEMETRY PACKET ARRAY ({data.length} PACKETS)
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#8a8f98]">
                {isSorted ? "SORTED ASCENDING" : "UNSORTED RAW"}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 max-h-[300px] overflow-y-auto p-1 font-mono text-xs">
              {data.slice(0, 36).map((item, idx) => {
                const isPivot = pivotIdx === idx
                const isMid = searchPointers?.mid === idx
                const isLeft = searchPointers?.left === idx
                const isRight = searchPointers?.right === idx
                const isMatch = matchedItem?.packet_id === item.packet_id

                return (
                  <div
                    key={item.packet_id}
                    className={`relative rounded-lg border p-2.5 transition-all duration-300 w-[104px] text-center ${
                      isMatch
                        ? "border-[#3ddc97] bg-[#3ddc97]/20 shadow-lg shadow-[#3ddc97]/25"
                        : isMid
                        ? "border-[#3d6bff] bg-[#3d6bff]/20"
                        : isPivot
                        ? "border-[#ffb547] bg-[#ffb547]/20"
                        : "border-white/[0.08] bg-black/50"
                    }`}
                  >
                    <div className="flex justify-between text-[9px] text-[#8a8f98]">
                      <span>#{idx}</span>
                      <span>{item.packet_id}</span>
                    </div>

                    <div className="mt-1 font-bold text-white text-[11px] truncate">
                      {item.timestamp}
                    </div>

                    <div className="mt-0.5 text-[8px] text-[#8a8f98] truncate">
                      {item.event}
                    </div>

                    {isMid && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded bg-[#3d6bff] px-1 text-[8px] font-bold text-white">
                        MID
                      </div>
                    )}
                    {isLeft && (
                      <div className="absolute -bottom-2.5 left-1 rounded bg-[#3d6bff] px-1 text-[7px] font-bold text-white">
                        L
                      </div>
                    )}
                    {isRight && (
                      <div className="absolute -bottom-2.5 right-1 rounded bg-[#ffb547] px-1 text-[7px] font-bold text-black">
                        R
                      </div>
                    )}
                  </div>
                )
              })}
              {data.length > 36 && (
                <div className="flex items-center justify-center p-3 text-xs text-[#8a8f98]">
                  + {data.length - 36} more packets in buffer...
                </div>
              )}
            </div>

            <div className="mt-5 rounded-lg border border-white/[0.08] bg-black/40 p-4">
              <span className="font-mono text-xs font-semibold text-white">BINARY SEARCH IN TELEMETRY</span>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label htmlFor={searchInputId} className="sr-only">Timestamp</label>
                <input
                  id={searchInputId}
                  type="number"
                  value={searchTs}
                  onChange={(e) => setSearchTs(e.target.value)}
                  placeholder="Timestamp (e.g. 1719749350)"
                  className="rounded border border-white/[0.15] bg-black/60 px-3 py-1.5 font-mono text-xs text-white outline-none focus:border-[#3d6bff]"
                />
                <button
                  onClick={runBinarySearch}
                  disabled={mounted ? !isSorted : false}
                  suppressHydrationWarning
                  className="inline-flex items-center gap-1.5 rounded bg-[#3d6bff] px-4 py-1.5 font-mono text-xs font-semibold text-white shadow-md shadow-[#3d6bff]/20 transition hover:bg-[#3d6bff]/90 active:scale-95 disabled:opacity-40"
                >
                  <Search className="size-3.5" />
                  <span>[ SEARCH TIMESTAMP ]</span>
                </button>
              </div>

              {!isSorted && (
                <div className="mt-2 font-mono text-[11px] text-[#ffb547]">
                  ⚠ Run QuickSort first to enable O(log n) Binary Search.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <span className="font-mono text-xs font-semibold tracking-wider text-white uppercase">
                SEARCH RESULT
              </span>
            </div>

            {matchedItem ? (
              <div className="mt-4 space-y-2.5 rounded-lg border border-[#3ddc97]/30 bg-[#3ddc97]/10 p-3.5 font-mono text-xs">
                <div className="flex items-center gap-1.5 text-[#3ddc97] font-bold">
                  <CheckCircle2 className="size-4" />
                  <span>EVENT LOCATED</span>
                </div>
                <div className="flex justify-between text-[#8a8f98]">
                  <span>PACKET ID:</span>
                  <span className="text-white font-bold">{matchedItem.packet_id}</span>
                </div>
                <div className="flex justify-between text-[#8a8f98]">
                  <span>TIMESTAMP:</span>
                  <span className="text-white">{matchedItem.timestamp}</span>
                </div>
                <div className="flex justify-between text-[#8a8f98]">
                  <span>MISSION EVENT:</span>
                  <span className="text-[#3ddc97] font-semibold">{matchedItem.event}</span>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center justify-center py-6 text-center font-mono">
                <Search className="size-8 text-[#8a8f98] opacity-50" />
                <div className="mt-2 text-xs font-semibold text-[#8a8f98]">NO EVENT SELECTED</div>
                <div className="text-[11px] text-[#8a8f98]">Enter a timestamp and run binary search.</div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <span className="font-mono text-xs font-semibold text-white uppercase">
                SEARCH PERFORMANCE COMPARISON
              </span>
            </div>

            <div className="mt-3 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between rounded border border-white/[0.08] bg-black/40 p-2.5">
                <div>
                  <div className="text-white font-bold">LINEAR SEARCH</div>
                  <div className="text-[10px] text-[#8a8f98]">O(n) sequential scan</div>
                </div>
                <div className="text-right">
                  <div className="text-[#ff5c7a] font-bold">
                    {searchComparisons ? `${searchComparisons.linear} comps` : `~${data.length / 2} avg`}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded border border-[#3d6bff]/30 bg-[#3d6bff]/10 p-2.5">
                <div>
                  <div className="text-[#3d6bff] font-bold">BINARY SEARCH</div>
                  <div className="text-[10px] text-[#8a8f98]">O(log n) divide & conquer</div>
                </div>
                <div className="text-right">
                  <div className="text-[#3ddc97] font-bold">
                    {searchComparisons ? `${searchComparisons.binary} comps` : `~${Math.ceil(Math.log2(data.length))} max`}
                  </div>
                </div>
              </div>

              {searchComparisons && (
                <div className="text-[11px] text-[#3ddc97]">
                  ✓ Binary search was {(searchComparisons.linear / Math.max(1, searchComparisons.binary)).toFixed(1)}x faster on this lookup!
                </div>
              )}
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
            <span>VIEW C IMPLEMENTATION (QuickSortSearch.c)</span>
          </div>
          {codeOpen ? <ChevronUp className="size-4 text-[#8a8f98]" /> : <ChevronDown className="size-4 text-[#8a8f98]" />}
        </button>

        {codeOpen && (
          <div className="mt-4 rounded-lg border border-white/[0.08] bg-black/80 p-4 font-mono text-xs leading-relaxed text-[#8a8f98]">
            <pre className="overflow-x-auto text-[11px]">
              <code>{`typedef struct {
    char packet_id[16];
    unsigned long timestamp;
    char mission_event[64];
} TelemetryItem;

int partition(TelemetryItem arr[], int low, int high) {
    unsigned long pivot = arr[high].timestamp;
    int i = (low - 1);
    for (int j = low; j < high; j++) {
        if (arr[j].timestamp < pivot) {
            i++;
            TelemetryItem temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
    }
    TelemetryItem temp = arr[i + 1];
    arr[i + 1] = arr[high];
    arr[high] = temp;
    return (i + 1);
}

void quickSort(TelemetryItem arr[], int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}

int binarySearch(TelemetryItem arr[], int n, unsigned long target) {
    int left = 0, right = n - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid].timestamp == target) return mid;
        if (arr[mid].timestamp < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}`}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
