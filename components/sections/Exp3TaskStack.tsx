"use client"

import { useState, useId, useSyncExternalStore, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  Layers,
  ArrowUp,
  ArrowDown,
  AlertOctagon,
  CheckCircle2,
  Clock,
  RotateCcw,
  Cpu,
  ShieldAlert,
  Play,
  Pause,
  Globe,
} from "lucide-react"

import { fetchSatnogsTelemetry } from "@/lib/satnogsClient"
import {
  Badge,
  ExperimentHeader,
  GlassPanel,
  GlassTile,
  Label,
  Metric,
  PanelHeader,
  ProgressBar,
  Select,
  StatusLine,
  ToolButton,
  type Tone,
} from "@/components/sections/flight/ui"

const emptySubscribe = () => () => {}

interface TaskItem {
  task_id: number
  task_type: string
  priority: number
  status: "EXECUTING" | "PAUSED" | "QUEUED"
  description: string
  color: string
}

const INITIAL_STACK: TaskItem[] = [
  {
    task_id: 102,
    task_type: "Codec2_Voice",
    priority: 3,
    status: "EXECUTING",
    description: "Compressed digital voice encode & downlink",
    color: "#3d6bff",
  },
  {
    task_id: 101,
    task_type: "SSTV_Transmission",
    priority: 2,
    status: "PAUSED",
    description: "Slow-scan TV image synthesis for ground stations",
    color: "#3d6bff",
  },
]

const TASK_PRESETS = [
  { type: "SSTV_Transmission", priority: 2, desc: "Slow-scan TV image transmission", color: "#3d6bff" },
  { type: "Codec2_Voice", priority: 3, desc: "Digital compressed voice relay", color: "#8a8f98" },
  { type: "MAGNETOMETER_POLL", priority: 2, desc: "B-field 3-axis vector sensor read", color: "#3ddc97" },
  { type: "DETUMBLE_B-DOT", priority: 4, desc: "Magnetorquer angular momentum dampening", color: "#ffb547" },
  { type: "FLASH_CRC_AUDIT", priority: 1, desc: "NOR flash firmware integrity check", color: "#3d6bff" },
]

const MAX_STACK_CAPACITY = 10

export function Exp3TaskStack() {
  const taskSelectId = useId()
  const prioritySelectId = useId()
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)

  const [stack, setStack] = useState<TaskItem[]>(INITIAL_STACK)
  const [nextTaskId, setNextTaskId] = useState<number>(103)
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(2)
  const [selectedPriority, setSelectedPriority] = useState<number>(2)
  const [animatingAction, setAnimatingAction] = useState<string | null>(null)
  const [isInterruptActive, setIsInterruptActive] = useState<boolean>(false)
  const [satnogsLoading, setSatnogsLoading] = useState<boolean>(false)
  const [statusMsg, setStatusMsg] = useState<string>("2 tasks resident · scheduler nominal")
  const [opLog, setOpLog] = useState<string[]>([
    "PUSH 101 · SSTV_Transmission · P2",
    "PUSH 102 · Codec2_Voice · P3",
  ])

  const activeTask = stack.length > 0 ? stack[0] : null

  const logOperation = (msg: string) => {
    setOpLog((prev) => [msg, ...prev].slice(0, 10))
  }

  const handlePush = useCallback(() => {
    if (stack.length >= MAX_STACK_CAPACITY) {
      setStatusMsg("Overflow prevented · stack at capacity 10")
      return
    }
    const preset = TASK_PRESETS[selectedPresetIndex]
    const newTask: TaskItem = {
      task_id: nextTaskId,
      task_type: preset.type,
      priority: selectedPriority,
      status: "EXECUTING",
      description: preset.desc,
      color: preset.color,
    }

    setAnimatingAction(`push-${nextTaskId}`)
    setNextTaskId((id) => id + 1)

    setStack((prev) => {
      const updated = prev.map((item, idx) =>
        idx === 0 ? { ...item, status: "PAUSED" as const } : item
      )
      return [newTask, ...updated]
    })

    logOperation(`PUSH ${newTask.task_id} · ${newTask.task_type} · P${newTask.priority}`)
    setStatusMsg(`Task ${newTask.task_id} pushed to top · SP advanced`)

    setTimeout(() => setAnimatingAction(null), 600)
  }, [stack.length, selectedPresetIndex, selectedPriority, nextTaskId])

  const fetchSatnogsPass = async () => {
    if (stack.length >= MAX_STACK_CAPACITY) {
      setStatusMsg("Overflow prevented · stack at capacity 10")
      return
    }
    setSatnogsLoading(true)
    setStatusMsg("Querying SatNOGS observation schedule…")
    try {
      const data = await fetchSatnogsTelemetry(5)
      if (data.packets && data.packets.length > 0) {
        const p = data.packets[Math.floor(Math.random() * data.packets.length)]
        const satTask: TaskItem = {
          task_id: p.packet_id % 10000,
          task_type: `SATNOGS_${p.ground_station.replace(/[^A-Za-z0-9]/g, "_").slice(0, 16)}`,
          priority: p.payload_type_id || 2,
          status: "EXECUTING",
          description: `Live pass at ${p.ground_station} · NORAD #${p.norad_cat_id} · ${p.transmitter_mode}`,
          color: "#3ddc97",
        }

        setAnimatingAction(`push-${satTask.task_id}`)
        setStack((prev) => {
          const updated = prev.map((item, idx) =>
            idx === 0 ? { ...item, status: "PAUSED" as const } : item
          )
          return [satTask, ...updated]
        })

        logOperation(`PUSH ${satTask.task_id} · SatNOGS pass · P${satTask.priority}`)
        setStatusMsg(`SatNOGS pass ${satTask.task_id} pushed to top`)
        setTimeout(() => setAnimatingAction(null), 600)
      }
    } catch {
      setStatusMsg("SatNOGS schedule unavailable · retry")
    } finally {
      setSatnogsLoading(false)
    }
  }

  const handlePop = useCallback(() => {
    if (stack.length === 0) {
      setStatusMsg("Underflow · no active task to pop")
      return
    }

    const popped = stack[0]
    setAnimatingAction(`pop-${popped.task_id}`)

    setTimeout(() => {
      setStack((prev) => {
        if (prev.length <= 1) return []
        const nextStack = prev.slice(1)
        return nextStack.map((item, idx) =>
          idx === 0 ? { ...item, status: "EXECUTING" as const } : item
        )
      })
      setAnimatingAction(null)
      logOperation(`POP ${popped.task_id} · ${popped.task_type} complete`)
      setStatusMsg(`Task ${popped.task_id} completed · SP restored`)
    }, 420)
  }, [stack])

  const triggerInterrupt = useCallback(() => {
    if (isInterruptActive) return
    if (stack.length >= MAX_STACK_CAPACITY) {
      setStatusMsg("Interrupt aborted · stack at capacity 10")
      return
    }

    const interruptTask: TaskItem = {
      task_id: 999,
      task_type: "TTC_HOUSEKEEPING",
      priority: 1,
      status: "EXECUTING",
      description: "Emergency TTC interrupt vector",
      color: "#ff5c7a",
    }

    setIsInterruptActive(true)
    setAnimatingAction("push-999")

    setStack((prev) => {
      const updated = prev.map((item) => ({ ...item, status: "PAUSED" as const }))
      return [interruptTask, ...updated]
    })

    logOperation("ISR · PUSH 999 · TTC_HOUSEKEEPING · P1")
    setStatusMsg("Interrupt asserted · running task context saved")

    setTimeout(() => setAnimatingAction(null), 600)
  }, [isInterruptActive, stack.length])

  const completeInterrupt = useCallback(() => {
    if (!isInterruptActive || stack.length === 0 || stack[0].task_id !== 999) return

    setAnimatingAction("pop-999")

    setTimeout(() => {
      setStack((prev) => {
        const withoutInterrupt = prev.filter((t) => t.task_id !== 999)
        return withoutInterrupt.map((item, idx) =>
          idx === 0 ? { ...item, status: "EXECUTING" as const } : item
        )
      })
      setIsInterruptActive(false)
      setAnimatingAction(null)
      logOperation("ISR handled · POP 999 · context resumed")
      setStatusMsg("Interrupt handled · previous task resumed")
    }, 420)
  }, [isInterruptActive, stack])

  const handleReset = useCallback(() => {
    setStack(INITIAL_STACK)
    setNextTaskId(103)
    setIsInterruptActive(false)
    setAnimatingAction(null)
    setOpLog(["RESET · stack restored to baseline", "PUSH 101 · SSTV_Transmission · P2"])
    setStatusMsg("Stack restored · 2 tasks resident")
  }, [])

  const statusTone: Tone = isInterruptActive
    ? "poor"
    : /overflow|underflow|aborted|unavailable/i.test(statusMsg)
      ? "fair"
      : "good"

  return (
    <div className="flex flex-col gap-4">
      <ExperimentHeader
        code="03"
        tag="stack · LIFO · depth 10"
        title="Onboard Task Stack"
        state={isInterruptActive ? "ISR ACTIVE" : "SCHEDULER NOMINAL"}
        stateTone={isInterruptActive ? "poor" : "good"}
        actions={
          <>
            <ToolButton
              icon={Globe}
              variant="live"
              onClick={fetchSatnogsPass}
              disabled={mounted ? satnogsLoading || stack.length >= MAX_STACK_CAPACITY : false}
              suppressHydrationWarning
            >
              {satnogsLoading ? "Pulling" : "SatNOGS pass"}
            </ToolButton>
            {!isInterruptActive ? (
              <ToolButton
                icon={AlertOctagon}
                variant="danger"
                onClick={triggerInterrupt}
                disabled={mounted ? stack.length >= MAX_STACK_CAPACITY : false}
                suppressHydrationWarning
              >
                Interrupt
              </ToolButton>
            ) : (
              <ToolButton icon={CheckCircle2} variant="live" onClick={completeInterrupt}>
                Resume
              </ToolButton>
            )}
            <ToolButton icon={RotateCcw} onClick={handleReset}>
              Reset
            </ToolButton>
          </>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:items-center sm:gap-7">
            <Metric label="Depth" value={stack.length} unit={`/ ${MAX_STACK_CAPACITY}`} />
            <Metric
              label="Top task"
              value={activeTask ? `#${activeTask.task_id}` : "—"}
              tone="accent"
            />
            <Metric
              label="Priority"
              value={activeTask ? `P${activeTask.priority}` : "—"}
              tone={activeTask && activeTask.priority === 1 ? "poor" : "fair"}
            />
            <Metric
              label="Mode"
              value={isInterruptActive ? "PREEMPT" : "NORMAL"}
              tone={isInterruptActive ? "poor" : "good"}
            />
          </div>
          <div className="w-full max-w-[200px]">
            <div className="flex items-center justify-between">
              <Label>Stack load</Label>
              <span className="font-mono text-[9px] text-white/45">
                {stack.length}/{MAX_STACK_CAPACITY}
              </span>
            </div>
            <ProgressBar
              value={(stack.length / MAX_STACK_CAPACITY) * 100}
              tone={isInterruptActive ? "poor" : "accent"}
              className="mt-1.5"
            />
          </div>
        </div>
      </ExperimentHeader>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <GlassPanel className="p-4 md:p-5 lg:col-span-7">
          <PanelHeader
            icon={Layers}
            title="LIFO stack"
            meta="push / pop at top"
            right={<Badge tone={isInterruptActive ? "poor" : "accent"}>SP → depth 0</Badge>}
          />

          <div className="glass-well relative mt-4 flex min-h-[240px] flex-col justify-end overflow-hidden p-3">
            <div aria-hidden className="pointer-events-none absolute inset-0 grid-dots opacity-[0.25]" />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#3d6bff]/[0.06] to-transparent" />

            {stack.length === 0 ? (
              <div className="relative my-auto flex flex-col items-center justify-center py-10 text-center">
                <div className="rounded-full border border-white/[0.08] bg-white/[0.03] p-3">
                  <Layers className="size-6 text-white/15" />
                </div>
                <div className="mt-3 font-mono text-[11px] font-semibold text-white/50">
                  STACK UNDERFLOW
                </div>
                <div className="mt-1 font-mono text-[9px] text-white/25">
                  push a task or assert an interrupt
                </div>
              </div>
            ) : (
              <div className="relative flex flex-col gap-2">
                {stack.map((item, index) => {
                  const isTop = index === 0
                  const isPushing = animatingAction === `push-${item.task_id}`
                  const isPopping = animatingAction === `pop-${item.task_id}`

                  return (
                    <div
                      key={item.task_id}
                      className={cn(
                        "relative overflow-hidden rounded-lg border px-3 py-2.5 transition-colors duration-300",
                        isTop
                          ? "border-[#3d6bff]/55 bg-gradient-to-r from-[#3d6bff]/[0.16] via-[#3d6bff]/[0.06] to-transparent"
                          : "border-white/[0.07] bg-white/[0.025]",
                        isPushing && "animate-plate-drop",
                        isPopping && "animate-plate-eject",
                        item.task_id === 999 && "border-[#ff5c7a]/55 from-[#ff5c7a]/[0.16] via-[#ff5c7a]/[0.05]"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center rounded font-mono text-[8px] font-bold",
                              isTop
                                ? "bg-[#3d6bff] text-white shadow-[0_0_16px_-4px_rgba(61,107,255,1)]"
                                : "bg-white/[0.06] text-white/35"
                            )}
                          >
                            {isTop ? "SP" : index}
                          </span>
                          <span className="font-mono text-[11px] font-semibold text-white">
                            #{item.task_id}
                          </span>
                          <span className="truncate font-mono text-[9px] text-white/35">
                            {item.task_type}
                          </span>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[8px] text-white/40">
                            P{item.priority}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[8px]",
                              item.status === "EXECUTING"
                                ? "border-[#3ddc97]/35 bg-[#3ddc97]/10 text-[#3ddc97]"
                                : "border-[#ffb547]/30 bg-[#ffb547]/[0.08] text-[#ffb547]"
                            )}
                          >
                            {item.status === "EXECUTING" ? (
                              <Play className="size-2 fill-current" />
                            ) : (
                              <Pause className="size-2 fill-current" />
                            )}
                            {item.status}
                          </span>
                        </div>
                      </div>

                      {isTop && (
                        <div className="mt-1.5 truncate pl-7 font-mono text-[9px] text-[#3ddc97]/60">
                          {item.description}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="relative mt-3 flex items-center justify-between border-t border-dashed border-white/[0.1] pt-2">
              <span className="mono-label text-[8px] text-white/20">stack base</span>
              <span className="mono-label text-[8px] text-white/20">0x0000</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <label htmlFor={taskSelectId} className="sr-only">
                Task preset
              </label>
              <Select
                id={taskSelectId}
                value={selectedPresetIndex}
                onChange={(e) => {
                  const idx = parseInt(e.target.value, 10)
                  setSelectedPresetIndex(idx)
                  setSelectedPriority(TASK_PRESETS[idx].priority)
                }}
              >
                {TASK_PRESETS.map((p, i) => (
                  <option key={p.type} value={i} className="bg-neutral-900 text-white">
                    {p.type}
                  </option>
                ))}
              </Select>

              <label htmlFor={prioritySelectId} className="sr-only">
                Priority
              </label>
              <Select
                id={prioritySelectId}
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(parseInt(e.target.value, 10))}
                className="w-[70px]"
              >
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <option key={lvl} value={lvl} className="bg-neutral-900 text-white">
                    P{lvl}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <ToolButton
                icon={ArrowDown}
                variant="primary"
                onClick={handlePush}
                disabled={mounted ? stack.length >= MAX_STACK_CAPACITY : false}
                suppressHydrationWarning
              >
                Push
              </ToolButton>
              <ToolButton
                icon={ArrowUp}
                onClick={handlePop}
                disabled={mounted ? stack.length === 0 : false}
                suppressHydrationWarning
              >
                Pop
              </ToolButton>
            </div>
          </div>
        </GlassPanel>

        <div className="flex flex-col gap-4 lg:col-span-5">
          <GlassPanel className="p-4">
            <PanelHeader
              icon={Cpu}
              title="Active task"
              right={<span className="mono-label text-[8px] text-white/25">top of stack</span>}
            />

            {activeTask ? (
              <div className="mt-3">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="font-mono text-[22px] font-semibold leading-none tracking-tight text-white">
                      #{activeTask.task_id}
                    </div>
                    <div className="mt-1.5 font-mono text-[10px] text-[#3d6bff]">
                      {activeTask.task_type}
                    </div>
                  </div>
                  <Badge tone={activeTask.status === "EXECUTING" ? "good" : "fair"}>
                    <span
                      className={cn(
                        "size-1 rounded-full",
                        activeTask.status === "EXECUTING"
                          ? "bg-[#3ddc97] animate-pulse"
                          : "bg-[#ffb547]"
                      )}
                    />
                    {activeTask.status}
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <GlassTile className="p-2.5">
                    <Label>Priority</Label>
                    <div className="mt-1 font-mono text-[12px] text-white">
                      P{activeTask.priority}
                    </div>
                  </GlassTile>
                  <GlassTile className="p-2.5">
                    <Label>Depth</Label>
                    <div className="mt-1 font-mono text-[12px] text-white">
                      {stack.length}
                    </div>
                  </GlassTile>
                </div>

                <div className="mt-2 rounded-lg border border-white/[0.06] bg-black/25 px-2.5 py-2 font-mono text-[9px] leading-relaxed text-white/35">
                  {activeTask.description}
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <Label>Frame state</Label>
                    <span className="font-mono text-[8px] text-[#3ddc97]">
                      {isInterruptActive ? "context saved" : "running"}
                    </span>
                  </div>
                  <div className="mt-1.5 flex gap-1">
                    {Array.from({ length: MAX_STACK_CAPACITY }).map((_, i) => (
                      <span
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors duration-300",
                          i < stack.length
                            ? i === 0
                              ? "bg-[#3d6bff]"
                              : "bg-white/20"
                            : "bg-white/[0.05]"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center justify-center py-5 text-center">
                <ShieldAlert className="size-7 text-white/12" />
                <div className="mt-2 font-mono text-[10px] text-white/40">SYSTEM IDLE</div>
                <div className="mt-1 font-mono text-[9px] text-white/20">
                  no task scheduled
                </div>
              </div>
            )}
          </GlassPanel>

          <GlassPanel className="p-4">
            <PanelHeader
              icon={Clock}
              title="Operations log"
              right={<span className="mono-label text-[8px] text-white/25">latest first</span>}
            />

            <div className="mt-3 max-h-[190px] space-y-1 overflow-y-auto pr-1">
              {opLog.map((log, index) => (
                <div
                  key={`${log}-${index}`}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md border border-white/[0.04] bg-black/25 px-2 py-1 font-mono text-[9px]",
                    log.includes("ISR")
                      ? "text-[#ff5c7a]"
                      : log.includes("POP")
                        ? "text-[#3ddc97]"
                        : "text-white/55"
                  )}
                >
                  <span className="truncate">{log}</span>
                  <span className="shrink-0 text-[7px] text-white/15">T+{index}</span>
                </div>
              ))}
            </div>
          </GlassPanel>

          <StatusLine tone={statusTone} className="px-1">
            {statusMsg}
          </StatusLine>
        </div>
      </div>
    </div>
  )
}
