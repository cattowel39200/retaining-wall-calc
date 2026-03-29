import { NextRequest, NextResponse } from 'next/server'
import { calculateWall } from '@/lib/calc-engine'

function sanitize(obj: unknown): unknown {
  if (obj === null || obj === undefined) return null
  if (typeof obj === 'number') {
    if (!isFinite(obj)) return null
    return obj
  }
  if (Array.isArray(obj)) return obj.map(sanitize)
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = sanitize(v)
    }
    return out
  }
  return obj
}

export async function POST(request: NextRequest) {
  try {
    const params = await request.json()
    const results = calculateWall(params)
    return NextResponse.json({ data: sanitize(results) })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { detail: `계산 오류: ${message}` },
      { status: 500 },
    )
  }
}
