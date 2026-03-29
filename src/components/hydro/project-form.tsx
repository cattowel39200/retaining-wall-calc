'use client'
import type { HydroProject, RegionName } from '@/types/hydro'

interface Props {
  project: HydroProject
  region: RegionName
  onChange: (project: HydroProject) => void
  onRegionChange: (region: RegionName) => void
}

export default function ProjectForm({ project, onChange }: Props) {
  const set = (patch: Partial<HydroProject>) => onChange({ ...project, ...patch })
  const p = project

  return (
    <details className="group border border-gray-200 rounded-lg">
      <summary className="cursor-pointer select-none px-3 py-2 bg-gray-100 rounded-t-lg font-semibold text-gray-700 text-sm hover:bg-gray-200">
        프로젝트 설정
      </summary>
      <div className="px-3 py-2 space-y-1">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <Txt label="프로젝트명" value={p.name} onChange={v => set({ name: v })} />
          <Txt label="위치" value={p.location} onChange={v => set({ location: v })} />
          <Txt label="업체명" value={p.company} onChange={v => set({ company: v })} />
          <Txt label="작성자" value={p.designer} onChange={v => set({ designer: v })} />
          <label className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-500">작성일</span>
            <input type="date" value={p.date} onChange={e => set({ date: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-500">설계빈도 (년)</span>
            <select value={p.designFrequency} onChange={e => set({ designFrequency: parseInt(e.target.value) as 10|20|30|50 })}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
              {[10,20,30,50].map(v => <option key={v} value={v}>{v}년</option>)}
            </select>
          </label>
        </div>
        <Txt label="비고" value={p.remarks} onChange={v => set({ remarks: v })} />
      </div>
    </details>
  )
}

function Txt({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 truncate">{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
    </label>
  )
}
