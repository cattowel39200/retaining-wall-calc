'use client'
import type { NumField } from '@/types/channel'

interface Props {
  H: NumField
  B: NumField
  tw: NumField
  ts: NumField
  haunch: NumField
}

export default function ChannelDiagram({ H, B, tw, ts, haunch }: Props) {
  const _H = H ?? 0, _B = B ?? 0, _tw = tw ?? 0, _ts = ts ?? 0, _ha = haunch ?? 0
  const totalW = _B + 2 * _tw
  const totalH = _H + _ts

  const vw = 300, vh = 240, margin = 35
  const drawW = vw - margin * 2, drawH = vh - margin * 2
  const scaleX = drawW / Math.max(totalW, 0.5)
  const scaleY = drawH / Math.max(totalH, 0.5)
  const sc = Math.min(scaleX, scaleY) * 0.85
  const ox = margin + (drawW - totalW * sc) / 2
  const oy = vh - margin

  const px = (m: number) => ox + m * sc
  const py = (m: number) => oy - m * sc

  // U-shape: outer boundary
  const outerPoly = [
    [0, 0], [totalW, 0], [totalW, totalH], [totalW - _tw, totalH],
    [totalW - _tw, _ts], [_tw, _ts], [_tw, totalH], [0, totalH],
  ].map(([x, y]) => `${px(x)},${py(y)}`).join(' ')

  // Inner cavity
  const innerPoly = [
    [_tw, _ts], [_tw + _B, _ts], [_tw + _B, totalH], [_tw, totalH],
  ].map(([x, y]) => `${px(x)},${py(y)}`).join(' ')

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2">
      <div className="text-xs font-semibold text-center text-gray-600 mb-1">U형개거 표준단면도</div>
      <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full" style={{ maxHeight: 200 }}>
        <defs>
          <marker id="ch-arr" markerWidth="6" markerHeight="4" refX="3" refY="2" orient="auto">
            <path d="M0,0 L6,2 L0,4" fill="#e53e3e" />
          </marker>
        </defs>

        {/* Concrete fill */}
        <polygon points={outerPoly} fill="#cbd5e0" stroke="#2d3748" strokeWidth={1.2} />
        {/* Inner cavity (white) */}
        <polygon points={innerPoly} fill="#ffffff" stroke="#2d3748" strokeWidth={0.8} />

        {/* Haunch corners */}
        {_ha > 0 && (
          <>
            <polygon points={`${px(_tw)},${py(_ts)} ${px(_tw + _ha)},${py(_ts)} ${px(_tw)},${py(_ts + _ha)}`}
              fill="#cbd5e0" stroke="#2d3748" strokeWidth={0.6} />
            <polygon points={`${px(_tw + _B)},${py(_ts)} ${px(_tw + _B - _ha)},${py(_ts)} ${px(_tw + _B)},${py(_ts + _ha)}`}
              fill="#cbd5e0" stroke="#2d3748" strokeWidth={0.6} />
          </>
        )}

        {/* Dimension lines */}
        {/* Total width */}
        <line x1={px(0)} y1={py(-0.12 * totalH)} x2={px(totalW)} y2={py(-0.12 * totalH)}
          stroke="#e53e3e" strokeWidth={0.8} markerStart="url(#ch-arr)" markerEnd="url(#ch-arr)" />
        <text x={px(totalW / 2)} y={py(-0.12 * totalH) + 12} textAnchor="middle" fontSize={7} fill="#e53e3e" fontWeight="bold">
          B총={totalW.toFixed(2)}
        </text>

        {/* Inner width */}
        <line x1={px(_tw)} y1={py(totalH + 0.08 * totalH)} x2={px(_tw + _B)} y2={py(totalH + 0.08 * totalH)}
          stroke="#e53e3e" strokeWidth={0.8} markerStart="url(#ch-arr)" markerEnd="url(#ch-arr)" />
        <text x={px(_tw + _B / 2)} y={py(totalH + 0.08 * totalH) - 3} textAnchor="middle" fontSize={7} fill="#e53e3e" fontWeight="bold">
          B={_B.toFixed(2)}
        </text>

        {/* Wall height */}
        <line x1={px(totalW + 0.08 * totalW)} y1={py(_ts)} x2={px(totalW + 0.08 * totalW)} y2={py(totalH)}
          stroke="#e53e3e" strokeWidth={0.8} markerStart="url(#ch-arr)" markerEnd="url(#ch-arr)" />
        <text x={px(totalW + 0.08 * totalW) + 3} y={py((_ts + totalH) / 2)} fontSize={7} fill="#e53e3e" fontWeight="bold"
          transform={`rotate(-90,${px(totalW + 0.08 * totalW) + 3},${py((_ts + totalH) / 2)})`}>
          H={_H.toFixed(2)}
        </text>

        {/* Slab thickness */}
        <line x1={px(totalW + 0.08 * totalW)} y1={py(0)} x2={px(totalW + 0.08 * totalW)} y2={py(_ts)}
          stroke="#e53e3e" strokeWidth={0.8} markerStart="url(#ch-arr)" markerEnd="url(#ch-arr)" />
        <text x={px(totalW + 0.12 * totalW)} y={py(_ts / 2) + 3} fontSize={6} fill="#e53e3e">
          ts={_ts.toFixed(2)}
        </text>

        {/* Wall thickness */}
        <line x1={px(0)} y1={py(totalH + 0.03 * totalH)} x2={px(_tw)} y2={py(totalH + 0.03 * totalH)}
          stroke="#e53e3e" strokeWidth={0.8} markerStart="url(#ch-arr)" markerEnd="url(#ch-arr)" />
        <text x={px(_tw / 2)} y={py(totalH + 0.03 * totalH) - 3} textAnchor="middle" fontSize={6} fill="#e53e3e">
          tw={_tw.toFixed(2)}
        </text>

        {/* Labels */}
        <text x={px(_tw / 2)} y={py(totalH / 2)} textAnchor="middle" fontSize={7} fill="#4a5568">측벽</text>
        <text x={px(totalW - _tw / 2)} y={py(totalH / 2)} textAnchor="middle" fontSize={7} fill="#4a5568">측벽</text>
        <text x={px(totalW / 2)} y={py(_ts / 2)} textAnchor="middle" fontSize={7} fill="#4a5568">저판</text>
      </svg>
    </div>
  )
}
