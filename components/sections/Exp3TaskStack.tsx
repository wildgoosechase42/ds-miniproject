"use client"

import { useState, useId, useSyncExternalStore, useCallback } from "react"
import { SectionLabel } from "@/components/brand/Brand"
import {
  Layers,
  ArrowUp,
  ArrowDown,
  AlertOctagon,
  CheckCircle2,
  Clock,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Cpu,
  ShieldAlert,
  Play,
  Pause,
  Globe
} from "lucide-react"

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
    description: "Compressed digital voice audio encode & downlink transmission",
    color: "#3d6bff"
  },
  {
    task_id: 101,
    task_type: "SSTV_Transmission",
    priority: 2,
    status: "PAUSED",
    description: "Slow-Scan TV image synthesis for amateur radio ground stations",
    color: "#3d6bff"
  }
]

const TASK_PRESETS = [
  { type: "SSTV_Transmission", priority: 2, desc: "Slow-Scan TV image transmission", color: "#3d6bff" },
  { type: "Codec2_Voice", priority: 3, desc: "Digital compressed voice relay", color: "#8a8f98" },
  { type: "MAGNETOMETER_POLL", priority: 2, desc: "B-field 3-axis vector sensor read", color: "#3ddc97" },
  { type: "DETUMBLE_B-DOT", priority: 4, desc: "Magnetorquer angular momentum dampening", color: "#ffb547" },
  { type: "FLASH_CRC_AUDIT", priority: 1, desc: "NOR flash firmware integrity check", color: "#3d6bff" }
]

const MAX_STACK_CAPACITY = 10
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

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
  const [statusMsg, setStatusMsg] = useState<string>("System active: 2 tasks in LIFO stack")
  const [opLog, setOpLog] = useState<string[]>([
    "PUSH Task 101 [SSTV_Transmission · P2]",
    "PUSH Task 102 [Codec2_Voice · P3]"
  ])
  const [codeOpen, setCodeOpen] = useState<boolean>(false)

  const activeTask = stack.length > 0 ? stack[0] : null

  const logOperation = (msg: string) => {
    setOpLog((prev) => [msg, ...prev].slice(0, 12))
  }

  const handlePush = useCallback(() => {
    if (stack.length >= MAX_STACK_CAPACITY) {
      setStatusMsg("STACK OVERFLOW PREVENTED: Maximum 10 tasks capacity reached")
      return
    }
    const preset = TASK_PRESETS[selectedPresetIndex]
    const newTask: TaskItem = {
      task_id: nextTaskId,
      task_type: preset.type,
      priority: selectedPriority,
      status: "EXECUTING",
      description: preset.desc,
      color: preset.color
    }

    setAnimatingAction(`push-${nextTaskId}`)
    setNextTaskId((id) => id + 1)

    setStack((prev) => {
      const updated = prev.map((item, idx) => (idx === 0 ? { ...item, status: "PAUSED" as const } : item))
      return [newTask, ...updated]
    })

    logOperation(`PUSH Task ${newTask.task_id} [${newTask.task_type} · P${newTask.priority}]`)
    setStatusMsg(`PUSH: Task #${newTask.task_id} added to TOP of stack`)

    setTimeout(() => {
      setAnimatingAction(null)
    }, 600)
  }, [stack.length, selectedPresetIndex, selectedPriority, nextTaskId])

  const fetchSatnogsPass = async () => {
    if (stack.length >= MAX_STACK_CAPACITY) {
      setStatusMsg("STACK OVERFLOW PREVENTED: Cannot push SatNOGS task, stack is full (10 tasks)")
      return
    }
    setSatnogsLoading(true)
    setStatusMsg("Querying SatNOGS for active ground station observation schedule...")
    try {
      const res = await fetch(`${API_BASE}/api/satnogs/telemetry?limit=5`)
      if (res.ok) {
        const data = await res.json()
        if (data.packets && data.packets.length > 0) {
          const p = data.packets[Math.floor(Math.random() * data.packets.length)]
          const satTask: TaskItem = {
            task_id: p.packet_id % 10000,
            task_type: `SATNOGS_${p.ground_station.replace(/[^A-Za-z0-9]/g, "_").slice(0, 16)}`,
            priority: p.payload_type_id || 2,
            status: "EXECUTING",
            description: `SatNOGS live pass at ${p.ground_station} (NORAD #${p.norad_cat_id}, ${p.transmitter_mode})`,
            color: "#3ddc97"
          }

          setAnimatingAction(`push-${satTask.task_id}`)
          setStack((prev) => {
            const updated = prev.map((item, idx) => (idx === 0 ? { ...item, status: "PAUSED" as const } : item))
            return [satTask, ...updated]
          })

          logOperation(`PUSH Task ${satTask.task_id} [${satTask.task_type} · SatNOGS Pass]`)
          setStatusMsg(`SatNOGS ground station pass task #${satTask.task_id} pushed to TOP of stack`)
          setTimeout(() => setAnimatingAction(null), 600)
        }
      }
    } catch {
      setStatusMsg("Failed to connect to SatNOGS endpoint")
    } finally {
      setSatnogsLoading(false)
    }
  }

  const handlePop = useCallback(() => {
    if (stack.length === 0) {
      setStatusMsg("STACK UNDERFLOW: No active tasks on stack to pop")
      return
    }

    const popped = stack[0]
    setAnimatingAction(`pop-${popped.task_id}`)

    setTimeout(() => {
      setStack((prev) => {
        if (prev.length <= 1) return []
        const nextStack = prev.slice(1)
        return nextStack.map((item, idx) => (idx === 0 ? { ...item, status: "EXECUTING" as const } : item))
      })
      setAnimatingAction(null)
      logOperation(`POP Task ${popped.task_id} [${popped.task_type} completed]`)
      setStatusMsg(`POP: Task #${popped.task_id} execution completed and popped`)
    }, 450)
  }, [stack])

  const triggerInterrupt = useCallback(() => {
    if (isInterruptActive) return
    if (stack.length >= MAX_STACK_CAPACITY) {
      setStatusMsg("INTERRUPT ABORTED: Stack capacity full")
      return
    }

    const interruptTask: TaskItem = {
      task_id: 999,
      task_type: "TTC_HOUSEKEEPING",
      priority: 1,
      status: "EXECUTING",
      description: "Emergency high-priority Telemetry, Tracking & Command interrupt vector",
      color: "#ff5c7a"
    }

    setIsInterruptActive(true)
    setAnimatingAction("push-999")

    setStack((prev) => {
      const updated = prev.map((item) => ({ ...item, status: "PAUSED" as const }))
      return [interruptTask, ...updated]
    })

    logOperation("🚨 INTERRUPT: PUSH Task 999 [TTC_HOUSEKEEPING · P1]")
    setStatusMsg("EMERGENCY INTERRUPT: Task 999 preempted stack, previous task PAUSED")

    setTimeout(() => {
      setAnimatingAction(null)
    }, 600)
  }, [isInterruptActive, stack.length])

  const completeInterrupt = useCallback(() => {
    if (!isInterruptActive || stack.length === 0 || stack[0].task_id !== 999) return

    setAnimatingAction("pop-999")

    setTimeout(() => {
      setStack((prev) => {
        const withoutInterrupt = prev.filter((t) => t.task_id !== 999)
        return withoutInterrupt.map((item, idx) => (idx === 0 ? { ...item, status: "EXECUTING" as const } : item))
      })
      setIsInterruptActive(false)
      setAnimatingAction(null)
      logOperation("✓ INTERRUPT HANDLED: POP Task 999 [TTC_HOUSEKEEPING]")
      setStatusMsg("Interrupt routine handled: Resumed previous task context")
    }, 450)
  }, [isInterruptActive, stack])

  const handleReset = useCallback(() => {
    setStack(INITIAL_STACK)
    setNextTaskId(103)
    setIsInterruptActive(false)
    setAnimatingAction(null)
    setOpLog([
      "RESET: Stack restored to baseline",
      "PUSH Task 101 [SSTV_Transmission · P2]",
      "PUSH Task 102 [Codec2_Voice · P3]"
    ])
    setStatusMsg("Stack restored: Default tasks 101 & 102 loaded")
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <SectionLabel accent>EXPERIMENT 03</SectionLabel>
              <span className="rounded border border-white/[0.12] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#8a8f98]">
                DATA STRUCTURE / STACK / LIFO
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#3d6bff]">
                <span className={`size-1.5 rounded-full ${isInterruptActive ? "bg-[#ff5c7a] animate-ping" : "bg-[#3d6bff]"}`} />
                {isInterruptActive ? "HIGH-PRIORITY ISR ACTIVE" : "NORMAL SCHEDULER"}
              </span>
            </div>
            <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-white md:text-2xl">
              ONBOARD TASK STACK
            </h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#8a8f98] md:text-sm">
              See how a satellite can pause an active task, execute an interrupting command, and then resume the previous task using a stack.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchSatnogsPass}
              disabled={mounted ? satnogsLoading || stack.length >= MAX_STACK_CAPACITY : false}
              suppressHydrationWarning
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#3ddc97]/40 bg-[#3ddc97]/10 px-3.5 py-2 font-mono text-xs font-semibold text-[#3ddc97] transition hover:bg-[#3ddc97]/20 active:scale-95 disabled:opacity-40"
            >
              <Globe className={`size-3.5 ${satnogsLoading ? "animate-spin" : ""}`} />
              <span>{satnogsLoading ? "PULLING..." : "PULL SATNOGS PASS"}</span>
            </button>

            {!isInterruptActive ? (
              <button
                onClick={triggerInterrupt}
                disabled={mounted ? stack.length >= MAX_STACK_CAPACITY : false}
                suppressHydrationWarning
                className="inline-flex items-center gap-2 rounded-lg border border-[#ff5c7a]/50 bg-[#ff5c7a]/15 px-3.5 py-2 font-mono text-xs font-semibold text-[#ff5c7a] shadow-lg shadow-[#ff5c7a]/20 transition hover:bg-[#ff5c7a]/25 active:scale-95 disabled:opacity-40"
              >
                <AlertOctagon className="size-3.5 animate-pulse" />
                <span>🚨 SIMULATE HIGH-PRIORITY INTERRUPT</span>
              </button>
            ) : (
              <button
                onClick={completeInterrupt}
                className="inline-flex items-center gap-2 rounded-lg border border-[#3ddc97]/50 bg-[#3ddc97]/15 px-3.5 py-2 font-mono text-xs font-semibold text-[#3ddc97] shadow-lg shadow-[#3ddc97]/20 transition hover:bg-[#3ddc97]/25 active:scale-95"
              >
                <CheckCircle2 className="size-3.5" />
                <span>COMPLETE INTERRUPT & RESUME</span>
              </button>
            )}

            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-2 font-mono text-xs text-[#8a8f98] transition hover:bg-white/[0.08] hover:text-white"
            >
              <RotateCcw className="size-3.5" />
              <span>RESET</span>
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/[0.08] pt-3 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#8a8f98]">SYSTEM STATUS:</span>
            <span className={isInterruptActive ? "text-[#ff5c7a] font-semibold" : "text-[#3ddc97]"}>
              {statusMsg}
            </span>
          </div>
          <div className="text-[11px] text-[#8a8f98]">
            STACK DEPTH: <span className="text-white font-semibold">{stack.length}</span> / {MAX_STACK_CAPACITY}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-7">
          <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-[#3d6bff]" />
                <span className="font-mono text-xs font-semibold tracking-wider text-white uppercase">
                  LIFO MEMORY STACK
                </span>
                <span className="font-mono text-[11px] text-[#8a8f98]">
                  · PUSH/POP AT TOP (O(1))
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-[#8a8f98]">
                  LIFO: LAST IN → FIRST OUT
                </span>
              </div>
            </div>

            <div className="mt-5 min-h-[360px] rounded-lg border border-dashed border-white/[0.12] bg-black/40 p-4 flex flex-col justify-end">
              {stack.length === 0 ? (
                <div className="my-auto flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-white/[0.04] p-3 text-[#8a8f98]">
                    <Layers className="size-6 opacity-40" />
                  </div>
                  <div className="mt-3 font-mono text-xs font-semibold text-white">STACK UNDERFLOW</div>
                  <p className="mt-1 font-mono text-[11px] text-[#8a8f98]">
                    No active tasks currently loaded on the stack. Push a task or trigger an interrupt.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {stack.map((item, index) => {
                    const isTop = index === 0
                    const isPushing = animatingAction === `push-${item.task_id}`
                    const isPopping = animatingAction === `pop-${item.task_id}`
                    return (
                      <div
                        key={item.task_id}
                        className={`relative rounded-lg border transition-all duration-300 ${
                          isTop
                            ? "border-[#3d6bff]/60 bg-gradient-to-r from-[#3d6bff]/15 to-transparent shadow-lg shadow-[#3d6bff]/10"
                            : "border-white/[0.08] bg-white/[0.02]"
                        } ${isPushing ? "scale-95 translate-y-2 opacity-50" : "scale-100 translate-y-0 opacity-100"} ${
                          isPopping ? "scale-90 -translate-y-4 opacity-0" : ""
                        } p-3.5`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            {isTop ? (
                              <span className="flex items-center gap-1 rounded bg-[#3d6bff] px-2 py-0.5 font-mono text-[10px] font-bold text-white shadow-sm">
                                <ArrowDown className="size-2.5" />
                                TOP (active)
                              </span>
                            ) : (
                              <span className="rounded border border-white/[0.1] bg-black/40 px-2 py-0.5 font-mono text-[10px] text-[#8a8f98]">
                                DEPTH {index}
                              </span>
                            )}
                            <span className="font-mono text-xs font-semibold text-white">
                              TASK #{item.task_id}
                            </span>
                            <span className="font-mono text-xs text-[#8a8f98]">
                              · {item.task_type}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-[#8a8f98]">
                              PRIORITY {item.priority}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-medium ${
                                item.status === "EXECUTING"
                                  ? "bg-[#3ddc97]/20 text-[#3ddc97] border border-[#3ddc97]/40"
                                  : "bg-[#ffb547]/20 text-[#ffb547] border border-[#ffb547]/40"
                              }`}
                            >
                              {item.status === "EXECUTING" ? (
                                <Play className="size-2.5 fill-current" />
                              ) : (
                                <Pause className="size-2.5 fill-current" />
                              )}
                              {item.status}
                            </span>
                          </div>
                        </div>

                        <p className="mt-1.5 font-mono text-[11px] text-[#8a8f98]">
                          {item.description}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <label htmlFor={taskSelectId} className="font-mono text-[11px] text-[#8a8f98]">
                    Task:
                  </label>
                  <select
                    id={taskSelectId}
                    value={selectedPresetIndex}
                    onChange={(e) => {
                      const idx = parseInt(e.target.value, 10)
                      setSelectedPresetIndex(idx)
                      setSelectedPriority(TASK_PRESETS[idx].priority)
                    }}
                    className="rounded border border-white/[0.15] bg-black/60 px-2.5 py-1.5 font-mono text-xs text-white outline-none focus:border-[#3d6bff]"
                  >
                    {TASK_PRESETS.map((p, i) => (
                      <option key={p.type} value={i} className="bg-neutral-900 text-white">
                        {p.type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor={prioritySelectId} className="font-mono text-[11px] text-[#8a8f98]">
                    Priority:
                  </label>
                  <select
                    id={prioritySelectId}
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(parseInt(e.target.value, 10))}
                    className="rounded border border-white/[0.15] bg-black/60 px-2 py-1.5 font-mono text-xs text-white outline-none focus:border-[#3d6bff]"
                  >
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <option key={lvl} value={lvl} className="bg-neutral-900 text-white">
                        P{lvl} {lvl === 1 ? "(Emergency)" : lvl === 5 ? "(Lowest)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePush}
                  disabled={mounted ? stack.length >= MAX_STACK_CAPACITY : false}
                  suppressHydrationWarning
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#3d6bff] px-3.5 py-2 font-mono text-xs font-semibold text-white shadow-md shadow-[#3d6bff]/25 transition hover:bg-[#3d6bff]/90 active:scale-95 disabled:opacity-40"
                >
                  <ArrowDown className="size-3.5" />
                  <span>[ PUSH TASK ]</span>
                </button>

                <button
                  onClick={handlePop}
                  disabled={mounted ? stack.length === 0 : false}
                  suppressHydrationWarning
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.2] bg-white/[0.08] px-3.5 py-2 font-mono text-xs font-semibold text-white transition hover:bg-white/[0.15] active:scale-95 disabled:opacity-40"
                >
                  <ArrowUp className="size-3.5" />
                  <span>[ COMPLETE / POP ]</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-5">
          <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="size-4 text-[#3ddc97]" />
                <span className="font-mono text-xs font-semibold tracking-wider text-white uppercase">
                  CURRENT ACTIVE TASK
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#8a8f98]">TOP OF STACK</span>
            </div>

            {activeTask ? (
              <div className="mt-4 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-black/40 p-3">
                  <span className="text-[#8a8f98]">TASK ID:</span>
                  <span className="text-white font-bold text-sm">#{activeTask.task_id}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-black/40 p-3">
                  <span className="text-[#8a8f98]">TASK TYPE:</span>
                  <span className="text-[#3d6bff] font-semibold">{activeTask.task_type}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-black/40 p-3">
                  <span className="text-[#8a8f98]">PRIORITY:</span>
                  <span className="text-white font-semibold">Priority {activeTask.priority}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-black/40 p-3">
                  <span className="text-[#8a8f98]">EXECUTION STATUS:</span>
                  <span
                    className={`inline-flex items-center gap-1.5 font-bold ${
                      activeTask.status === "EXECUTING" ? "text-[#3ddc97]" : "text-[#ffb547]"
                    }`}
                  >
                    <span
                      className={`size-2 rounded-full ${
                        activeTask.status === "EXECUTING" ? "bg-[#3ddc97] animate-pulse" : "bg-[#ffb547]"
                      }`}
                    />
                    {activeTask.status}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-8 flex flex-col items-center justify-center py-6 text-center font-mono">
                <ShieldAlert className="size-8 text-[#8a8f98] opacity-50" />
                <div className="mt-2 text-xs font-semibold text-[#8a8f98]">SYSTEM IDLE</div>
                <div className="text-[11px] text-[#8a8f98]">All tasks completed. Ready for command push.</div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-[#3d6bff]" />
                <span className="font-mono text-xs font-semibold tracking-wider text-white uppercase">
                  STACK OPERATIONS LOG
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#8a8f98]">LATEST FIRST</span>
            </div>

            <div className="mt-3 max-h-[160px] space-y-1.5 overflow-y-auto font-mono text-[11px]">
              {opLog.map((log, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded border border-white/[0.04] bg-black/30 px-2.5 py-1 text-[#8a8f98]"
                >
                  <span className={log.includes("🚨") ? "text-[#ff5c7a] font-semibold" : log.includes("POP") ? "text-[#3ddc97]" : "text-white/90"}>
                    {log}
                  </span>
                  <span className="text-[9px] text-white/30">T+{index}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-[#3d6bff]" />
            <h4 className="font-mono text-xs font-semibold text-white uppercase">
              EDUCATIONAL CONCEPT · WHY A STACK FOR SATELLITE INTERRUPTS?
            </h4>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3 font-mono text-xs">
          <div className="rounded-lg border border-white/[0.08] bg-black/30 p-3.5">
            <span className="text-[#3d6bff] font-semibold">1. LIFO BEHAVIOR</span>
            <p className="mt-1 text-[11px] leading-relaxed text-[#8a8f98]">
              A stack strictly follows Last-In, First-Out (LIFO). The most recently pushed command is always the first one to be executed.
            </p>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-black/30 p-3.5">
            <span className="text-[#3ddc97] font-semibold">2. PREEMPTIVE INTERRUPTS</span>
            <p className="mt-1 text-[11px] leading-relaxed text-[#8a8f98]">
              When ground control sends an emergency commanding signal, the running task is paused and pushed under the emergency ISR.
            </p>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-black/30 p-3.5">
            <span className="text-[#ffb547] font-semibold">3. SEAMLESS RESUMPTION</span>
            <p className="mt-1 text-[11px] leading-relaxed text-[#8a8f98]">
              Upon popping the emergency task, the stack pointer exposes the interrupted task right where it left off without loss of context.
            </p>
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
            <span>VIEW C IMPLEMENTATION (TaskStack.c)</span>
          </div>
          {codeOpen ? <ChevronUp className="size-4 text-[#8a8f98]" /> : <ChevronDown className="size-4 text-[#8a8f98]" />}
        </button>

        {codeOpen && (
          <div className="mt-4 rounded-lg border border-white/[0.08] bg-black/80 p-4 font-mono text-xs leading-relaxed text-[#8a8f98]">
            <pre className="overflow-x-auto text-[11px]">
              <code>{`#define MAX_TASKS 10

typedef struct SatelliteTask {
    int task_id;
    char task_type[32];
    int priority;
    struct SatelliteTask* next;
} SatelliteTask;

typedef struct TaskStack {
    SatelliteTask* top;
    int current_depth;
} TaskStack;

void pushTask(TaskStack* stack, int id, const char* type, int prio) {
    if (stack->current_depth >= MAX_TASKS) return;
    SatelliteTask* newTask = (SatelliteTask*)malloc(sizeof(SatelliteTask));
    newTask->task_id = id;
    strncpy(newTask->task_type, type, 31);
    newTask->priority = prio;
    newTask->next = stack->top;
    stack->top = newTask;
    stack->current_depth++;
}

SatelliteTask* popTask(TaskStack* stack) {
    if (stack->top == NULL) return NULL;
    SatelliteTask* popped = stack->top;
    stack->top = stack->top->next;
    stack->current_depth--;
    return popped;
}

SatelliteTask* displayCurrentTask(TaskStack* stack) {
    return stack->top;
}`}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
