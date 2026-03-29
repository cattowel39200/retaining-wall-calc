'use client'
import type { ComputedResult } from '@/types/hydro'

interface Props { computed: ComputedResult[] }

export default function ResultsTable({ computed }: Props) {
  const f1 = (v: number) => v.toFixed(1)
  const f2 = (v: number) => v.toFixed(2)
  const f3 = (v: number) => v.toFixed(3)
  const f4 = (v: number) => v.toFixed(4)

  if (!computed.length) return <div className="text-center py-8 text-gray-400">구간을 추가하고 계산하기를 클릭하세요.</div>

  return (
    <div className="space-y-4">
      {computed.map((cr, idx) => {
        const s = cr.segment
        const r = cr.result
        const sec = r.section
        return (
          <div key={s.id} className="bg-white rounded-lg border p-4">
            <h4 className="font-semibold text-gray-700 mb-2">구간 {idx + 1}: {s.name || '(미입력)'}</h4>
            {r.warning && <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-1.5 text-sm text-yellow-700 mb-2">{r.warning}</div>}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Metric label="유입시간 t₁" value={`${f1(r.t1)} min`} />
              <Metric label="유하시간 t₂" value={`${f2(r.t2)} min`} />
              <Metric label="유달시간 tc" value={`${f1(r.tc)} min`} />
              <Metric label="강우강도 I" value={`${f1(r.intensity)} mm/hr`} />
              <Metric label="유출계수 C" value={f2(r.appliedC)} />
              <Metric label="유역면적" value={`${f2(r.area)} ha`} />
              <Metric label="누가면적" value={`${f2(r.cumulArea)} ha`} />
              <Metric label="설계유량 Q" value={`${f3(r.discharge)} m³/s`} />
              <Metric label="관경사 I" value={`${f4(r.appliedSlope)} %`} />
              {sec && <>
                <Metric label="유속 V" value={`${f2(sec.V)} m/s`} ok={r.velocityOK} />
                <Metric label="통수능 Q" value={`${f3(sec.Q)} m³/s`} ok={r.capacityOK} />
                <Metric label="판정" value={r.capacityOK && r.velocityOK ? 'OK' : 'NG'} ok={r.capacityOK && r.velocityOK} />
              </>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Metric({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  const color = ok === undefined ? 'text-gray-800' : ok ? 'text-green-700' : 'text-red-700'
  const bg = ok === undefined ? 'bg-gray-50' : ok ? 'bg-green-50' : 'bg-red-50'
  return (
    <div className={`rounded px-3 py-2 ${bg}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`font-semibold ${color}`}>{value}</div>
    </div>
  )
}
