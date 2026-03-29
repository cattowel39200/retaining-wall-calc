'use client'
import type { ComputedResult } from '@/types/hydro'

interface Props { computed: ComputedResult[]; freq: number }

export default function SummaryTable({ computed, freq }: Props) {
  const f1 = (v: number) => v.toFixed(1)
  const f2 = (v: number) => v.toFixed(2)
  const f3 = (v: number) => v.toFixed(3)
  const f4 = (v: number) => v.toFixed(4)

  if (!computed.length) return <div className="text-center py-8 text-gray-400">계산 결과가 없습니다.</div>

  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-3">우수관로 제원검토표 ({freq}년 빈도)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {['No', '구간명', '유역면적\n(ha)', '누가면적\n(ha)', 'C', 'tc\n(min)', 'I\n(mm/hr)', 'Q설계\n(m³/s)',
                '관종', '규격', 'I(%)', 'V\n(m/s)', 'Q통수\n(m³/s)', '통수능', '유속'].map((h, i) => (
                <th key={i} className="border px-2 py-1.5 whitespace-pre-line">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {computed.map((cr, i) => {
              const s = cr.segment
              const r = cr.result
              const sec = r.section
              let spec = '-'
              if (s.pipeType === 'circular') spec = `D${s.pipeDiameter || '-'}`
              else if (s.pipeType === 'box') spec = `${s.boxWidth}×${s.boxHeight}`
              else if (s.pipeType === 'uditch') spec = `${s.uWidth}×${s.uHeight}`
              else if (s.pipeType === 'trapezoidal') spec = `${s.ditchTopWidth}×${s.ditchDepth}`
              else if (s.pipeType === 'jehyung') spec = `${s.jhTopWidth}×${s.jhDepth}`

              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1 text-center">{i + 1}</td>
                  <td className="border px-2 py-1">{s.name || '-'}</td>
                  <td className="border px-2 py-1 text-right">{f2(r.area)}</td>
                  <td className="border px-2 py-1 text-right">{f2(r.cumulArea)}</td>
                  <td className="border px-2 py-1 text-center">{f2(r.appliedC)}</td>
                  <td className="border px-2 py-1 text-right">{f1(r.tc)}</td>
                  <td className="border px-2 py-1 text-right">{f1(r.intensity)}</td>
                  <td className="border px-2 py-1 text-right">{f3(r.discharge)}</td>
                  <td className="border px-2 py-1 text-center">{sec?.type || '-'}</td>
                  <td className="border px-2 py-1 text-center">{spec}</td>
                  <td className="border px-2 py-1 text-right">{f4(r.appliedSlope)}</td>
                  <td className="border px-2 py-1 text-right">{sec ? f2(sec.V) : '-'}</td>
                  <td className="border px-2 py-1 text-right">{sec ? f3(sec.Q) : '-'}</td>
                  <td className={`border px-2 py-1 text-center font-bold ${r.capacityOK ? 'text-green-600' : 'text-red-600'}`}>
                    {r.capacityOK === undefined ? '-' : r.capacityOK ? 'OK' : 'NG'}
                  </td>
                  <td className={`border px-2 py-1 text-center font-bold ${r.velocityOK ? 'text-green-600' : 'text-red-600'}`}>
                    {r.velocityCheck || '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-2">적용기준: 하수도시설기준 · 하천설계기준 · 도로배수시설지침</p>
    </div>
  )
}
