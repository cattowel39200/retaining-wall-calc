'use client'

import type { WallType, NumField } from '@/types/wall'

interface Props {
  wallType: WallType
  stemTop: NumField
  hStem: NumField
  batter: NumField
  batterBack: NumField
  c6Toe: NumField
  c8Heel: NumField
  dSlab: NumField
  hsGap: NumField
  gwlHeight?: NumField
  slopeType?: 'flat' | 'berm'
  slopeN?: NumField
  slopeBerm?: NumField
}

export default function SectionDiagram({
  wallType, stemTop, hStem, batter, batterBack, c6Toe, c8Heel, dSlab, hsGap, gwlHeight,
  slopeType, slopeN, slopeBerm,
}: Props) {
  const isGravity = wallType === '중력식'

  // null-safe values
  const _stemTop = stemTop ?? 0
  const _hStem = hStem ?? 0
  const _batter = batter ?? 0
  const _batterBack = batterBack ?? 0
  const _c6Toe = c6Toe ?? 0
  const _c8Heel = c8Heel ?? 0
  const _dSlab = dSlab ?? 0
  const _hsGap = hsGap ?? 0
  const _gwl = gwlHeight ?? 0

  // computed
  const tBot = _stemTop + _batter + _batterBack
  const H = isGravity ? _hStem : _hStem + _dSlab
  const B = isGravity ? tBot : _c6Toe + tBot + _c8Heel

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
  const dims: React.ReactNode[] = []
  const labels: React.ReactNode[] = []

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
    const x0 = 0, x1 = _batter, x2 = _batter + _stemTop, x3 = tBot
    wallPoly = `${px(x1)},${py(H)} ${px(x2)},${py(H)} ${px(x3)},${py(0)} ${px(x0)},${py(0)}`

    // dims
    hDim(x1, x2, H + 0.1 * H, `t₁=${_stemTop.toFixed(2)}`)
    hDim(x0, x3, -0.12 * H, `B=${tBot.toFixed(2)}`)
    vDim(x3 + 0.08 * B, 0, H, `H=${H.toFixed(2)}`)
    if (_batter > 0) hDim(x0, x1, H * 0.5, `C₁=${_batter.toFixed(2)}`)
    if (_batterBack > 0) hDim(x2, x3, H * 0.5, `C₃=${_batterBack.toFixed(2)}`)

    // soil
    const soilH = H - _hsGap
    if (soilH > 0) {
      soilPoly = `${px(x2)},${py(soilH)} ${px(x3)},${py(soilH)} ${px(x3)},${py(0)} ${px(x2 + (x3 - x2) * (1 - soilH / H))},${py(0)}`
    }
  } else {
    // RC wall (L, 역L, 역T)
    // 원본 draw_section.py 좌표계:
    //   벽체 오른쪽 면 = C6_toe 위치 (전면측)
    //   벽체 왼쪽 면 = C6_toe - t_stem
    //   Heel은 벽체 오른쪽(배면측)으로 연장
    // 즉, 저판 좌측이 전면, 우측이 배면
    //
    // L형: Toe 짧고 벽체가 전면 끝 쪽, Heel이 배면으로 김
    // 역L형: Toe 길고 Heel 없음, 벽체가 배면 끝 쪽
    // 역T형: Toe/Heel 모두 있음

    // 벽체 위치 (원본 기준: 벽체 상단 오른쪽 = C6_toe)
    const wallTopLeft = _c6Toe - _stemTop    // 벽체 상단 왼쪽 (전면)
    const wallTopRight = _c6Toe             // 벽체 상단 오른쪽 (배면측 면)
    const wallBotLeft = _c6Toe - _stemTop - _batter  // 벽체 하단 왼쪽 (전면 경사)
    const wallBotRight = _c6Toe + _batterBack       // 벽체 하단 오른쪽 (배면 경사)

    // wall polygon (trapezoid)
    wallPoly = `${px(wallTopLeft)},${py(H)} ${px(wallTopRight)},${py(H)} ${px(wallBotRight)},${py(_dSlab)} ${px(wallBotLeft)},${py(_dSlab)}`

    // footing slab
    slabPoly = `${px(0)},${py(_dSlab)} ${px(B)},${py(_dSlab)} ${px(B)},${py(0)} ${px(0)},${py(0)}`

    // dims
    hDim(wallTopLeft, wallTopRight, H + 0.08 * H, `t₁=${_stemTop.toFixed(2)}`)
    vDim(B + 0.08 * B, 0, H, `H=${H.toFixed(2)}`)
    vDim(B + 0.08 * B, 0, _dSlab, `D=${_dSlab.toFixed(2)}`)
    hDim(0, B, -0.1 * H, `B=${B.toFixed(2)}`)

    if (_c6Toe > 0.01) hDim(0, _c6Toe, -0.02 * H, `C₆=${_c6Toe.toFixed(2)}`)
    if (_c8Heel > 0.01) hDim(_c6Toe + _batterBack, B, -0.02 * H, `C₈=${_c8Heel.toFixed(2)}`)

    vDim(wallBotLeft - 0.06 * B, _dSlab, H, `Hₛ=${_hStem.toFixed(2)}`)

    if (_batter > 0) hDim(wallBotLeft, wallTopLeft, _dSlab + _hStem * 0.3, `C₁=${_batter.toFixed(2)}`)
    if (_batterBack > 0) hDim(wallTopRight, wallBotRight, _dSlab + _hStem * 0.3, `C₃=${_batterBack.toFixed(2)}`)

    // soil (배면측: 벽체 오른쪽 ~ 저판 끝)
    const soilH = _hStem - _hsGap
    if (soilH > 0) {
      const soilTop = _dSlab + soilH
      soilPoly = `${px(wallBotRight)},${py(soilTop)} ${px(B)},${py(soilTop)} ${px(B)},${py(_dSlab)} ${px(wallBotRight)},${py(_dSlab)}`
    }
  }

  // section labels
  if (!isGravity) {
    const wallBotRight = _c6Toe + _batterBack
    const wallBotLeft = _c6Toe - _stemTop - _batter
    const wallCx = px((wallBotLeft + wallBotRight) / 2)
    const wallMidY = py(_dSlab + _hStem * 0.5)
    labels.push(
      <text key="lbl-wall" x={wallCx} y={wallMidY} textAnchor="middle" fontSize={8} fill="#4a5568">벽체</text>
    )
    labels.push(
      <text key="lbl-slab" x={px(B / 2)} y={py(_dSlab / 2)} textAnchor="middle" fontSize={8} fill="#4a5568">저판</text>
    )
    // section cut indicators
    const cutStyle = { stroke: '#3182ce', strokeWidth: 0.7, strokeDasharray: '3,2' }
    // C-C (wall bottom)
    labels.push(
      <g key="cut-cc">
        <line x1={px(wallBotLeft - 0.1 * B)} y1={py(_dSlab)} x2={px(wallBotRight + 0.05 * B)} y2={py(_dSlab)} {...cutStyle} />
        <text x={px(wallBotLeft - 0.14 * B)} y={py(_dSlab) + 3} fontSize={6} fill="#3182ce" fontWeight="bold">C-C</text>
      </g>
    )
    // D-D (wall mid)
    const ddY = _dSlab + _hStem / 2
    labels.push(
      <g key="cut-dd">
        <line x1={px(wallBotLeft - 0.06 * B)} y1={py(ddY)} x2={px(wallBotRight + 0.03 * B)} y2={py(ddY)} {...cutStyle} />
        <text x={px(wallBotLeft - 0.10 * B)} y={py(ddY) + 3} fontSize={6} fill="#3182ce" fontWeight="bold">D-D</text>
      </g>
    )
    // B-B (heel — 벽체 배면측)
    if (_c8Heel > 0.01) {
      labels.push(
        <g key="cut-bb">
          <line x1={px(wallBotRight)} y1={py(-0.03 * H)} x2={px(wallBotRight)} y2={py(_dSlab + 0.05 * H)} {...cutStyle} />
          <text x={px(wallBotRight) + 3} y={py(_dSlab + 0.08 * H)} fontSize={6} fill="#3182ce" fontWeight="bold">B-B</text>
        </g>
      )
    }
    // A-A (toe — 벽체 전면측)
    const toeEff = Math.max(_c6Toe - _stemTop - _batter, 0)
    if (toeEff > 0.15) {
      labels.push(
        <g key="cut-aa">
          <line x1={px(wallBotLeft)} y1={py(-0.03 * H)} x2={px(wallBotLeft)} y2={py(_dSlab + 0.05 * H)} {...cutStyle} />
          <text x={px(wallBotLeft) - 12} y={py(_dSlab + 0.08 * H)} fontSize={6} fill="#3182ce" fontWeight="bold">A-A</text>
        </g>
      )
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2">
      <div className="text-xs font-semibold text-center text-gray-600 mb-1">{wallType} 표준단면도</div>
      <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full section-diagram-svg" style={{ maxHeight: 220 }} xmlns="http://www.w3.org/2000/svg">
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

        {/* 배면 비탈면 */}
        {slopeType === 'berm' && !isGravity && (slopeN ?? 0) > 0 && (() => {
          const _berm = slopeBerm ?? 1
          const _n = slopeN ?? 1.5
          const soilH = _hStem - _hsGap
          if (soilH <= 0) return null
          const soilTop = _dSlab + soilH
          const wallBotRight = _c6Toe + _batterBack
          // 소단 시작점 = 벽체 상단 배면
          const bermStart = wallBotRight
          const bermEnd = bermStart + _berm
          // 비탈면: 소단 끝에서 1:n 구배로 올라감
          const slopeRise = soilH * 0.6  // 비탈면 높이 (표현용)
          const slopeRun = slopeRise * _n
          const slopeTopX = bermEnd + slopeRun
          const slopeTopY = soilTop + slopeRise
          return (
            <g>
              {/* 비탈면 삼각형 */}
              <polygon
                points={`${px(bermEnd)},${py(soilTop)} ${px(slopeTopX)},${py(slopeTopY)} ${px(slopeTopX)},${py(soilTop)}`}
                fill="#fefce8" stroke="#d69e2e" strokeWidth={0.5} opacity={0.5}
              />
              {/* 소단 (수평선) */}
              <line x1={px(bermStart)} y1={py(soilTop)} x2={px(bermEnd)} y2={py(soilTop)}
                stroke="#92400e" strokeWidth={1.2} />
              {/* 비탈면 경사선 */}
              <line x1={px(bermEnd)} y1={py(soilTop)} x2={px(slopeTopX)} y2={py(slopeTopY)}
                stroke="#92400e" strokeWidth={1.2} />
              {/* 라벨 */}
              <text x={px((bermStart + bermEnd) / 2)} y={py(soilTop) - 5}
                textAnchor="middle" fontSize={6} fill="#92400e" fontWeight="bold">
                소단 {_berm}m
              </text>
              <text x={px((bermEnd + slopeTopX) / 2) + 5} y={py((soilTop + slopeTopY) / 2) - 5}
                textAnchor="middle" fontSize={6} fill="#92400e" fontWeight="bold">
                1:{_n}
              </text>
            </g>
          )
        })()}

        {/* 지하수위 바 */}
        {_gwl > 0 && (
          <>
            <rect x={px(0)} y={py(_gwl)} width={px(B) - px(0)} height={py(0) - py(_gwl)}
              fill="#3b82f6" opacity={0.15} />
            <line x1={px(-0.08 * B)} y1={py(_gwl)} x2={px(B + 0.08 * B)} y2={py(_gwl)}
              stroke="#3b82f6" strokeWidth={1.2} strokeDasharray="4,2" />
            <text x={px(B + 0.1 * B)} y={py(_gwl) + 3} fontSize={7} fill="#3b82f6" fontWeight="bold">
              GWL {_gwl.toFixed(1)}m
            </text>
            {/* 수위 바 (우측) */}
            <rect x={px(B + 0.12 * B)} y={py(_gwl)} width={6} height={py(0) - py(_gwl)}
              fill="#3b82f6" opacity={0.4} rx={2} />
          </>
        )}

        {/* dims & labels */}
        {dims}
        {labels}
      </svg>
    </div>
  )
}
