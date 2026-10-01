export interface SatnogsPacket {
  index: number
  packet_id: number
  timestamp: number
  battery_status: number
  payload_type: "TELEMETRY" | "IMAGE" | "SENSOR" | "COMMAND"
  payload_type_id: number
  ground_station: string
  norad_cat_id: number
  transmitter_mode: string
}

export interface SatnogsResponse {
  source: string
  count: number
  next_cursor: string | null
  next_index: number
  packets: SatnogsPacket[]
}

const DEFAULT_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

export async function fetchSatnogsTelemetry(limit: number = 10, cursor?: string | null): Promise<SatnogsResponse> {
  const query = new URLSearchParams({ limit: String(limit) })
  if (cursor) query.set("cursor", cursor)
  const qs = `?${query.toString()}`

  // 1. Try FastAPI backend first (to populate C data structures)
  try {
    const res = await fetch(`${DEFAULT_API_BASE}/api/satnogs/telemetry${qs}`)
    if (res.ok) {
      return await res.json()
    }
  } catch {
    // Backend offline or unreachable, fall back to Next.js route
  }

  // 2. Query Next.js internal route handler
  try {
    const res = await fetch(`/api/satnogs/telemetry${qs}`)
    if (res.ok) {
      return await res.json()
    }
  } catch {
    // Both failed
  }

  throw new Error("Unable to fetch SatNOGS telemetry packets")
}

export async function fetchSatnogsExp1(startIndex: number, limit: number = 25, cursor?: string | null): Promise<SatnogsResponse> {
  const query = new URLSearchParams({
    start_index: String(startIndex),
    limit: String(limit)
  })
  if (cursor) query.set("cursor", cursor)
  const qs = `?${query.toString()}`

  // 1. Try FastAPI backend first
  try {
    const res = await fetch(`${DEFAULT_API_BASE}/api/exp1/satnogs/fetch${qs}`)
    if (res.ok) {
      return await res.json()
    }
  } catch {
    // Backend offline or unreachable, fall back to Next.js route
  }

  // 2. Query Next.js internal route handler
  try {
    const res = await fetch(`/api/exp1/satnogs/fetch${qs}`)
    if (res.ok) {
      return await res.json()
    }
  } catch {
    // Both failed
  }

  throw new Error("Unable to fetch SatNOGS Exp1 passes")
}
