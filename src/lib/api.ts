import type { WallInput } from '@/types/wall'
import { stripNulls } from '@/types/wall'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ''

async function postJSON(path: string, params: WallInput) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stripNulls(params)),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || '서버 오류')
  }
  return res
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function calculateWall(params: WallInput): Promise<any> {
  const res = await postJSON('/api/calculate', params)
  const json = await res.json()
  return json.data
}

export async function getSectionImage(params: WallInput): Promise<string> {
  const res = await postJSON('/api/section-image', params)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export async function getRebarImage(params: WallInput): Promise<string> {
  const res = await postJSON('/api/rebar-image', params)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export async function downloadReport(params: WallInput): Promise<void> {
  const res = await postJSON('/api/report', params)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)

  const disposition = res.headers.get('Content-Disposition')
  let filename = '옹벽구조검토.docx'
  if (disposition) {
    const match = disposition.match(/filename="?(.+?)"?$/)
    if (match) filename = decodeURIComponent(match[1])
  }

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
