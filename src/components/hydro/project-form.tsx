'use client'
import type { HydroProject, RegionName } from '@/types/hydro'
import { REGION_LIST, RUNOFF_COEFFICIENTS, KERBY_N_VALUES, REGIONAL_IDF } from '@/lib/hydro/constants'

interface Props {
  project: HydroProject
  region: RegionName
  onChange: (project: HydroProject) => void
  onRegionChange: (region: RegionName) => void
}

export default function ProjectForm({ project, region, onChange, onRegionChange }: Props) {
  const set = (patch: Partial<HydroProject>) => onChange({ ...project, ...patch })
  const p = project
  const idfTable = REGIONAL_IDF[region]
  const durations = Object.keys(idfTable).map(Number).sort((a, b) => a - b)

  return (
    <div className="space-y-6">
      {/* 프로젝트 정보 */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-gray-700 mb-3">프로젝트 정보</h3>
        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">프로젝트명</span>
            <input value={p.name} onChange={e => set({ name: e.target.value })}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">위치</span>
            <input value={p.location} onChange={e => set({ location: e.target.value })}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">업체명</span>
            <input value={p.company} onChange={e => set({ company: e.target.value })}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">작성자</span>
            <input value={p.designer} onChange={e => set({ designer: e.target.value })}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">작성일</span>
            <input type="date" value={p.date} onChange={e => set({ date: e.target.value })}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">설계빈도 (년)</span>
            <select value={p.designFrequency} onChange={e => set({ designFrequency: parseInt(e.target.value) as 10 | 20 | 30 | 50 })}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm bg-white">
              {[10, 20, 30, 50].map(v => <option key={v} value={v}>{v}년</option>)}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1 mt-2">
          <span className="text-xs text-gray-500">비고</span>
          <input value={p.remarks} onChange={e => set({ remarks: e.target.value })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
      </div>

      {/* 강우강도식 */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-gray-700 mb-3">강우강도식 ({region})</h3>
        <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm text-blue-700 mb-3">
          {region} 확률강우강도(하수도시설기준) 기준 확률강우강도식을 적용합니다.
        </div>
        <div className="text-sm font-medium mb-2">빈도별 강우강도 참조표 (mm/hr)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">지속시간(분)</th>
                <th className="border px-2 py-1">10년</th>
                <th className="border px-2 py-1">20년</th>
                <th className="border px-2 py-1">30년</th>
                <th className="border px-2 py-1">50년</th>
              </tr>
            </thead>
            <tbody>
              {durations.map(d => (
                <tr key={d}>
                  <td className="border px-2 py-1 text-center font-medium">{d}</td>
                  {[10, 20, 30, 50].map(rp => (
                    <td key={rp} className="border px-2 py-1 text-right">{idfTable[d]?.[rp]?.toFixed(1) ?? '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
