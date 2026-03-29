'use client'

import type { WallType } from '@/types/wall'

interface Props {
  wallType: WallType
  stemTop: number
  hStem: number
  batter: number
  batterBack: number
  c6Toe: number
  c8Heel: number
  dSlab: number
  hsGap: number
}

export default function SectionDiagram({
  wallType, stemTop, hStem, batter, batterBack, c6Toe, c8Heel, dSlab, hsGap,
}: Props) {
  const isGravity = wallType === '중력식'

  // computed
  const tBot = stemTop + batter + batterBack
  const H = isGravity ? hStem : hStem + dSlab
  const B = isGravity ? tBot : c6Toe + tBot + c8Heel

  // SVG coordinate system: draw in a 300x240 viewBox
  const vw = 300, vh = 240
  const margin = 30
  const drawW = vw - margin * 2
  const drawH = vh - margin * 2

  // scale to fit
  const scaleX = drawW / Math.max(B, 0.5)
  const scaleY = drawH / Math.max(H, 0.5)
  const sc = Math.min(scaleX, scaleY) * 0.85

  // origin: bottom-left of footing at (margin + offset, vh - margin)
  const ox = margin + (drawW - B * sc) / 2
  const oy = vh - margin

  const px = (m: number) => ox + m * sc
  const py = (m: number) => oy - m * sc

  // dimension helper
  const dims: JSX.Element[] = []
  const labels: JSX.Element[] = []

  function hDim(x1: number, x2: number, y: number, label: string, side: 'top' | 'bottom' = 'top') {
    const sx1 = px(x1), sx2 = px(x2), sy = py(y)
    const offset = side === 'top' ? -8 : 12
    dims.push(
      <g key={`hd-${label}`}>
        <line x1={sx1} y1={sy} x2={sx2} y2={sy} stroke="#e53e3e" strokeWidth={0.8} markerStart="url(#arr)" markerEnd="url(#arr)" />
        <text x={(sx1 + sx2) / 2} y={sy + offset} textAnchor="middle" fontSize={7} fill="#e53e3e" fontWeight="bold">{label}</text>
      </g>
    )
  }

  function vDim(x: number, y1: number, y2: number, label: string, side: 'left' | 'right' = 'right') {
    const sx = px(x), sy1 = py(y1), sy2 = py(y2)
    const offset = side === 'right' ? 10 : -10
    dims.push(
      <g key={`vd-${label}`}>
        <line x1={sx} y1={sy1} x2={sx} y2={sy2} stroke="#e53e3e" strokeWidth={0.8} markerStart="url(#arr)" markerEnd="url(#arr)" />
        <text x={sx + offset} y={(sy1 + sy2) / 2 + 3} textAnchor="middle" fontSize={7} fill="#e53e3e" fontWeight="bold" transform={`rotate(-90,${sx + offset},${(sy1 + sy2) / 2 + 3})`}>{label}</text>
      </g>
    )
  }

  // Build shapes
  let wallPoly: string
  let slabPoly: string | null = null
  let soilPoly: string | null = null

  if (isGravity) {
    // Gravity: trapezoid wall, no footing
    const x0 = 0, x1 = batter, x2 = batter + stemTop, x3 = tBot
    wallPoly = `${px(x1)},${py(H)} ${px(x2)},${py(H)} ${px(x3)},${py(0)} ${px(x0)},${py(0)}`

    // dims
    hDim(x1, x2, H + 0.1 * H, `t₁=${stemTop.toFixed(2)}`)
    hDim(x0, x3, -0.12 * H, `B=${tBot.toFixed(2)}`)
    vDim(x3 + 0.08 * B, 0, H, `H=${H.toFixed(2)}`)
    if (batter > 0) hDim(x0, x1, H * 0.5, `C₁=${batter.toFixed(2)}`)
    if (batterBack > 0) hDim(x2, x3, H * 0.5, `C₃=${batterBack.toFixed(2)}`)

    // soil
    const soilH = H - hsGap
    if (soilH > 0) {
      soilPoly = `${px(x2)},${py(soilH)} ${px(x3)},${py(soilH)} ${px(x3)},${py(0)} ${px(x2 + (x3 - x2) * (1 - soilH / H))},${py(0)}`
    }
  } else {
    // RC wall (L, 역L, 역T)
    const wallLeft = c6Toe + batter
    const wallRight = c6Toe + batter + stemTop
    const wallLeftBot = c6Toe
    const wallRightBot = c6Toe + tBot

    // wall polygon (trapezoid)
    wallPoly = `${px(wallLeft)},${py(H)} ${px(wallRight)},${py(H)} ${px(wallRightBot)},${py(dSlab)} ${px(wallLeftBot)},${py(dSlab)}`

    // footing slab
    slabPoly = `${px(0)},${py(dSlab)} ${px(B)},${py(dSlab)} ${px(B)},${py(0)} ${px(0)},${py(0)}`

    // dims
    hDim(wallLeft, wallRight, H + 0.08 * H, `t₁=${stemTop.toFixed(2)}`)
    vDim(B + 0.08 * B, 0, H, `H=${H.toFixed(2)}`)
    vDim(B + 0.08 * B, 0, dSlab, `D=${dSlab.toFixed(2)}`)
    hDim(0, B, -0.1 * H, `B=${B.toFixed(2)}`)

    if (c6Toe > 0.01) hDim(0, c6Toe, -0.02 * H, `C₆=${c6Toe.toFixed(2)}`)
    if (c8Heel > 0.01) hDim(c6Toe + tBot, B, -0.02 * H, `C₈=${c8Heel.toFixed(2)}`)

    vDim(wallLeft - 0.06 * B, dSlab, H, `H_s=${hStem.toFixed(2)}`)

    if (batter > 0) hDim(wallLeftBot, wallLeft, dSlab + hStem * 0.3, `C₁=${batter.toFixed(2)}`)
    if (batterBack > 0) hDim(wallRight, wallRightBot, dSlab + hStem * 0.3, `C₃=${batterBack.toFixed(2)}`)

    // soil
    const soilH = hStem - hsGap
    if (soilH > 0) {
      const soilTop = dSlab + soilH
      soilPoly = `${px(wallRightBot)},${py(soilTop)} ${px(B)},${py(soilTop)} ${px(B)},${py(dSlab)} ${px(wallRightBot)},${py(dSlab)}`
    }
  }

  // section labels
  if (!isGravity) {
    const wallCx = px(c6Toe + tBot / 2)
    const wallMidY = py(dSlab + hStem * 0.5)
    labels.push(
      <text key="lbl-wall" x={wallCx} y={wallMidY} textAnchor="middle" fontSize={8} fill="#4a5568">벽체</text>
    )
    labels.push(
      <text key="lbl-slab" x={px(B / 2)} y={py(dSlab / 2)} textAnchor="middle" fontSize={8} fill="#4a5568">저판</text>
    )
    // section cut indicators
    const cutStyle = { stroke: '#3182ce', strokeWidth: 0.7, strokeDasharray: '3,2' }
    // C-C (wall bottom)
    labels.push(
      <g key="cut-cc">
        <line x1={px(c6Toe - 0.15 * B)} y1={py(dSlab)} x2={px(c6Toe + tBot + 0.05 * B)} y2={py(dSlab)} {...cutStyle} />
        <text x={px(c6Toe - 0.18 * B)} y={py(dSlab) + 3} fontSize={6} fill="#3182ce" fontWeight="bold">C-C</text>
      </g>
    )
    // D-D (wall mid)
    const ddY = dSlab + hStem / 2
    labels.push(
      <g key="cut-dd">
        <line x1={px(c6Toe - 0.1 * B)} y1={py(ddY)} x2={px(c6Toe + tBot + 0.03 * B)} y2={py(ddY)} {...cutStyle} />
        <text x={px(c6Toe - 0.14 * B)} y={py(ddY) + 3} fontSize={6} fill="#3182ce" fontWeight="bold">D-D</text>
      </g>
    )
    // B-B (heel)
    if (c8Heel > 0.01) {
      labels.push(
        <g key="cut-bb">
          <line x1={px(c6Toe + tBot)} y1={py(-0.03 * H)} x2={px(c6Toe + tBot)} y2={py(dSlab + 0.05 * H)} {...cutStyle} />
          <text x={px(c6Toe + tBot) + 3} y={py(dSlab + 0.08 * H)} fontSize={6} fill="#3182ce" fontWeight="bold">B-B</text>
        </g>
      )
    }
    // A-A (toe)
    if (c6Toe > 0.15) {
      labels.push(
        <g key="cut-aa">
          <line x1={px(c6Toe)} y1={py(-0.03 * H)} x2={px(c6Toe)} y2={py(dSlab + 0.05 * H)} {...cutStyle} />
          <text x={px(c6Toe) - 12} y={py(dSlab + 0.08 * H)} fontSize={6} fill="#3182ce" fontWeight="bold">A-A</text>
        </g>
      )
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2">
      <div className="text-xs font-semibold text-center text-gray-600 mb-1">{wallType} 표준단면도</div>
      <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full" style={{ maxHeight: 220 }}>
        <defs>
          <marker id="arr" markerWidth="6" markerHeight="4" refX="3" refY="2" orient="auto">
            <path d="M0,0 L6,2 L0,4" fill="#e53e3e" />
          </marker>
        </defs>

        {/* soil fill */}
        {soilPoly && (
          <polygon points={soilPoly} fill="#fefce8" stroke="#d69e2e" strokeWidth={0.5} opacity={0.6} />
        )}

        {/* footing slab */}
        {slabPoly && (
          <polygon points={slabPoly} fill="#e2e8f0" stroke="#2d3748" strokeWidth={1.2} />
        )}

        {/* wall */}
        <polygon points={wallPoly} fill="#cbd5e0" stroke="#2d3748" strokeWidth={1.2} />

        {/* ground line */}
        {!isGravity && (
          <>
            <line x1={px(-0.1 * B)} y1={py(0)} x2={px(0)} y2={py(0)} stroke="#718096" strokeWidth={1} />
            <line x1={px(B)} y1={py(0)} x2={px(B + 0.15 * B)} y2={py(0)} stroke="#718096" strokeWidth={1} />
          </>
        )}

        {/* dims & labels */}
        {dims}
        {labels}
      </svg>
    </div>
  )
}
