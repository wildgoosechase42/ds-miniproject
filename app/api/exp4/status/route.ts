import { NextResponse } from "next/server"

export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

  try {
    const res = await fetch(`${backendUrl}/api/exp4/status`, {
      signal: AbortSignal.timeout(2000)
    })
    if (res.ok) {
      const data = await res.json()
      return NextResponse.json({ ...data, engine: "c_core" })
    }
  } catch {
    // Backend offline
  }

  // Fallback health status for cloud / serverless deployments
  return NextResponse.json({
    status: "healthy",
    count: 0,
    is_full: false,
    is_empty: true,
    engine: "cloud_runtime"
  })
}
