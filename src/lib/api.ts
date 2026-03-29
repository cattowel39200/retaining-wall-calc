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

export async function getSectionImage(params: WallInput): Promise<string | null> {
  try {
    const res = await postJSON('/api/section-image', params)
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  } catch {
    return null // matplotlib not available on Vercel
  }
}

export async function getRebarImage(params: WallInput): Promise<string | null> {
  try {
    const res = await postJSON('/api/rebar-image', params)
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

/** SVG 요소를 PNG base64 문자열로 변환 */
export async function svgToPngBase64(svgElement: SVGSVGElement, scale = 3): Promise<string> {
  const svgData = new XMLSerializer().serializeToString(svgElement)
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })

  const canvas = document.createElement('canvas')
  canvas.width = img.width * scale
  canvas.height = img.height * scale
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(url)

  return canvas.toDataURL('image/png').split(',')[1] // base64 only
}

export async function downloadReport(params: WallInput, sectionImageBase64?: string): Promise<void> {
  const body = { ...stripNulls(params), sectionImage: sectionImageBase64 || null }
  const res = await fetch(`${API_BASE}/api/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || '서버 오류')
  }
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
