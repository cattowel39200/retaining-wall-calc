'use client'
import type { NumField } from '@/types/channel'

interface Props {
  H_left: NumField
  tw_top_left: NumField
  tw_bot_left: NumField
  H_right: NumField
  tw_top_right: NumField
  tw_bot_right: NumField
  B: NumField
  ts: NumField
  haunch: NumField
}

export default function ChannelDiagram({
  H_left, tw_top_left, tw_bot_left,
  H_right, tw_top_right, tw_bot_right,
  B, ts, haunch,
}: Props) {
  const _HL = H_left ?? 0, _HR = H_right ?? 0
  const _twTL = tw_top_left ?? 0, _twBL = tw_bot_left ?? 0
  const _twTR = tw_top_right ?? 0, _twBR = tw_bot_right ?? 0
  const _B = B ?? 0, _ts = ts ?? 0, _ha = haunch ?? 0

  const B_total = _twBL + _B + _twBR
  const maxH = Math.max(_HL, _HR) + _ts

  const vw = 320, vh = 260, margin = 40
  const drawW = vw - margin * 2, drawH = vh - margin * 2
  const scaleX = drawW / Math.max(B_total, 0.5)
  const scaleY = drawH / Math.max(maxH, 0.5)
  const sc = Math.min(scaleX, scaleY) * 0.82
  const ox = margin + (drawW - B_total * sc) / 2
  const oy = vh - margin

  const px = (m: number) => ox + m * sc
  const py = (m: number) => oy - m * sc

  // Bottom slab: full width rectangle
  const slabPoly = [
    [0, 0], [B_total, 0], [B_total, _ts], [0, _ts],
  ].map(([x, y]) => `${px(x)},${py(y)}`).join(' ')

  // Left wall: trapezoid (bottom wider, top narrower)
  const leftWallPoly = [
    [0, _ts],                      // outer bottom-left
    [_twBL, _ts],                  // inner bottom-left
    [(_twBL - _twTL) / 2 + _twTL, _ts + _HL], // inner top-left (centered narrowing)
    [(_twBL - _twTL) / 2, _ts + _HL],          // outer top-left
  ]
  // Actually: outer face is vertical on the left side, inner face tapers
  // More standard: outer face vertical, inner face slopes
  const lwPoly = [
    [0, _ts],                        // outer bottom
    [_twBL, _ts],                    // inner bottom
    [(_twBL + _twTL) / 2, _ts + _HL], // inner top (centered)
    [(_twBL - _twTL) / 2, _ts + _HL], // outer top (centered)
  ].map(([x, y]) => `${px(x)},${py(y)}`).join(' ')

  // Right wall: trapezoid
  const rwLeft = _twBL + _B  // inner bottom edge
  const rwRight = B_total     // outer bottom edge
  const rwCenterBot = (rwLeft + rwRight) / 2
  const rwPoly = [
    [rwLeft, _ts],                                         // inner bottom
    [rwRight, _ts],                                        // outer bottom
    [rwCenterBot + _twTR / 2, _ts + _HR],                  // outer top
    [rwCenterBot - _twTR / 2, _ts + _HR],                  // inner top
  ].map(([x, y]) => `${px(x)},${py(y)}`).join(' ')

  // Inner top coords for haunch reference
  const lwInnerBot = _twBL
  const rwInnerBot = _twBL + _B

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2">
      <div className="text-xs font-semibold text-center text-gray-600 mb-1">콘크리트 개거 표준단면도</div>
      <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full" style={{ maxHeight: 220 }}>
        <defs>
          <marker id="ch-arr" markerWidth="6" markerHeight="4" refX="3" refY="2" orient="auto">
            <path d="M0,0 L6,2 L0,4" fill="#e53e3e" />
          </marker>
        </defs>

        {/* Bottom slab */}
        <polygon points={slabPoly} fill="#cbd5e0" stroke="#2d3748" strokeWidth={1.2} />

        {/* Left wall */}
        <polygon points={lwPoly} fill="#cbd5e0" stroke="#2d3748" strokeWidth={1.2} />

        {/* Right wall */}
        <polygon points={rwPoly} fill="#cbd5e0" stroke="#2d3748" strokeWidth={1.2} />

        {/* Haunch triangles */}
        {_ha > 0 && (
          <>
            {/* Left inner corner */}
            <polygon
              points={`${px(lwInnerBot)},${py(_ts)} ${px(lwInnerBot + _ha)},${py(_ts)} ${px(lwInnerBot)},${py(_ts + _ha)}`}
              fill="#cbd5e0" stroke="#2d3748" strokeWidth={0.6} />
            {/* Right inner corner */}
            <polygon
              points={`${px(rwInnerBot)},${py(_ts)} ${px(rwInnerBot - _ha)},${py(_ts)} ${px(rwInnerBot)},${py(_ts + _ha)}`}
              fill="#cbd5e0" stroke="#2d3748" strokeWidth={0.6} />
          </>
        )}

        {/* --- Dimension lines --- */}

        {/* Total width (bottom) */}
        <line x1={px(0)} y1={py(-0.12 * maxH)} x2={px(B_total)} y2={py(-0.12 * maxH)}
          stroke="#e53e3e" strokeWidth={0.8} markerStart="url(#ch-arr)" markerEnd="url(#ch-arr)" />
        <text x={px(B_total / 2)} y={py(-0.12 * maxH) + 12} textAnchor="middle" fontSize={7} fill="#e53e3e" fontWeight="bold">
          B총={B_total.toFixed(2)}
        </text>

        {/* Inner width (top) */}
        <line x1={px(_twBL)} y1={py(maxH + 0.06 * maxH)} x2={px(_twBL + _B)} y2={py(maxH + 0.06 * maxH)}
          stroke="#e53e3e" strokeWidth={0.8} markerStart="url(#ch-arr)" markerEnd="url(#ch-arr)" />
        <text x={px(_twBL + _B / 2)} y={py(maxH + 0.06 * maxH) - 3} textAnchor="middle" fontSize={7} fill="#e53e3e" fontWeight="bold">
          B={_B.toFixed(2)}
        </text>

        {/* Left wall height (left side) */}
        <line x1={px(-0.08 * B_total)} y1={py(_ts)} x2={px(-0.08 * B_total)} y2={py(_ts + _HL)}
          stroke="#e53e3e" strokeWidth={0.8} markerStart="url(#ch-arr)" markerEnd="url(#ch-arr)" />
        <text x={px(-0.08 * B_total) - 3} y={py(_ts + _HL / 2)} fontSize={6} fill="#e53e3e" fontWeight="bold"
          textAnchor="end" dominantBaseline="middle">
          H좌={_HL.toFixed(2)}
        </text>

        {/* Right wall height (right side) */}
        <line x1={px(B_total + 0.08 * B_total)} y1={py(_ts)} x2={px(B_total + 0.08 * B_total)} y2={py(_ts + _HR)}
          stroke="#e53e3e" strokeWidth={0.8} markerStart="url(#ch-arr)" markerEnd="url(#ch-arr)" />
        <text x={px(B_total + 0.08 * B_total) + 3} y={py(_ts + _HR / 2)} fontSize={6} fill="#e53e3e" fontWeight="bold"
          dominantBaseline="middle">
          H우={_HR.toFixed(2)}
        </text>

        {/* Slab thickness (right side, lower) */}
        <line x1={px(B_total + 0.08 * B_total)} y1={py(0)} x2={px(B_total + 0.08 * B_total)} y2={py(_ts)}
          stroke="#e53e3e" strokeWidth={0.8} markerStart="url(#ch-arr)" markerEnd="url(#ch-arr)" />
        <text x={px(B_total + 0.12 * B_total)} y={py(_ts / 2) + 3} fontSize={6} fill="#e53e3e">
          ts={_ts.toFixed(2)}
        </text>

        {/* Left wall thickness (top) */}
        {_twBL > 0 && (
          <>
            <line x1={px(0)} y1={py(maxH + 0.02 * maxH)} x2={px(_twBL)} y2={py(maxH + 0.02 * maxH)}
              stroke="#e53e3e" strokeWidth={0.8} markerStart="url(#ch-arr)" markerEnd="url(#ch-arr)" />
            <text x={px(_twBL / 2)} y={py(maxH + 0.02 * maxH) - 2} textAnchor="middle" fontSize={5.5} fill="#e53e3e">
              tw좌={_twBL.toFixed(2)}
            </text>
          </>
        )}

        {/* Right wall thickness (top) */}
        {_twBR > 0 && (
          <>
            <line x1={px(_twBL + _B)} y1={py(maxH + 0.02 * maxH)} x2={px(B_total)} y2={py(maxH + 0.02 * maxH)}
              stroke="#e53e3e" strokeWidth={0.8} markerStart="url(#ch-arr)" markerEnd="url(#ch-arr)" />
            <text x={px(_twBL + _B + _twBR / 2)} y={py(maxH + 0.02 * maxH) - 2} textAnchor="middle" fontSize={5.5} fill="#e53e3e">
              tw우={_twBR.toFixed(2)}
            </text>
          </>
        )}

        {/* Labels */}
        <text x={px(_twBL / 2)} y={py(_ts + _HL / 2)} textAnchor="middle" fontSize={7} fill="#4a5568" dominantBaseline="middle">좌측벽</text>
        <text x={px(_twBL + _B + _twBR / 2)} y={py(_ts + _HR / 2)} textAnchor="middle" fontSize={7} fill="#4a5568" dominantBaseline="middle">우측벽</text>
        <text x={px(B_total / 2)} y={py(_ts / 2)} textAnchor="middle" fontSize={7} fill="#4a5568" dominantBaseline="middle">저판</text>
      </svg>
    </div>
  )
}
