'use client'
import type { ComputedResult, HydroProject } from '@/types/hydro'

interface Props { project: HydroProject; computed: ComputedResult[]; region: string }

export default function ReportView({ project, computed, region }: Props) {
  const f1 = (v: number) => v.toFixed(1)
  const f2 = (v: number) => v.toFixed(2)
  const f3 = (v: number) => v.toFixed(3)

  return (
    <div className="max-w-4xl mx-auto space-y-8 print:space-y-4">
      {/* 표지 */}
      <div className="text-center py-12 border-b">
        <h1 className="text-3xl font-bold mb-4">우수 수리계산서</h1>
        <p className="text-lg text-gray-600">설계빈도: {project.designFrequency}년 · 지역: {region}</p>
        <div className="mt-8 inline-block text-left">
          <table className="text-sm">
            <tbody>
              <tr><td className="pr-4 py-1 font-medium">프로젝트명</td><td>{project.name}</td></tr>
              <tr><td className="pr-4 py-1 font-medium">위치</td><td>{project.location}</td></tr>
              <tr><td className="pr-4 py-1 font-medium">업체명</td><td>{project.company}</td></tr>
              <tr><td className="pr-4 py-1 font-medium">작성자</td><td>{project.designer}</td></tr>
              <tr><td className="pr-4 py-1 font-medium">작성일</td><td>{project.date}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 제원검토표 */}
      <div>
        <h2 className="text-xl font-bold mb-4">우수관로 제원검토표 ({project.designFrequency}년 빈도)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                {['No', '구간명', '면적(ha)', '누가(ha)', 'C', 'tc(min)', 'I(mm/hr)', 'Q(m³/s)',
                  '관종', '규격', 'I(%)', 'V(m/s)', 'Q통수', '판정'].map((h, i) => (
                  <th key={i} className="border px-1.5 py-1">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {computed.map((cr, i) => {
                const s = cr.segment, r = cr.result, sec = r.section
                let spec = '-'
                if (s.pipeType === 'circular') spec = `D${s.pipeDiameter}`
                else if (s.pipeType === 'box') spec = `${s.boxWidth}×${s.boxHeight}`
                return (
                  <tr key={s.id}>
                    <td className="border px-1.5 py-0.5 text-center">{i + 1}</td>
                    <td className="border px-1.5 py-0.5">{s.name || '-'}</td>
                    <td className="border px-1.5 py-0.5 text-right">{f2(r.area)}</td>
                    <td className="border px-1.5 py-0.5 text-right">{f2(r.cumulArea)}</td>
                    <td className="border px-1.5 py-0.5 text-center">{f2(r.appliedC)}</td>
                    <td className="border px-1.5 py-0.5 text-right">{f1(r.tc)}</td>
                    <td className="border px-1.5 py-0.5 text-right">{f1(r.intensity)}</td>
                    <td className="border px-1.5 py-0.5 text-right">{f3(r.discharge)}</td>
                    <td className="border px-1.5 py-0.5 text-center">{sec?.type || '-'}</td>
                    <td className="border px-1.5 py-0.5 text-center">{spec}</td>
                    <td className="border px-1.5 py-0.5 text-right">{r.appliedSlope.toFixed(4)}</td>
                    <td className="border px-1.5 py-0.5 text-right">{sec ? f2(sec.V) : '-'}</td>
                    <td className="border px-1.5 py-0.5 text-right">{sec ? f3(sec.Q) : '-'}</td>
                    <td className={`border px-1.5 py-0.5 text-center font-bold ${r.capacityOK ? 'text-green-600' : 'text-red-600'}`}>
                      {r.capacityOK === undefined ? '-' : r.capacityOK ? 'OK' : 'NG'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-500 text-center">적용기준: 하수도시설기준 · 하천설계기준 · 도로배수시설지침</p>
    </div>
  )
}
