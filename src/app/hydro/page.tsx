'use client'

import { useState, useCallback, useRef } from 'react'
import type { HydroSegment, HydroTab, RegionName, ComputedResult } from '@/types/hydro'
import { createDefaultState } from '@/types/hydro'
import { computeAll } from '@/lib/hydro/calc-engine'
import { exportJSON, importJSON, downloadHydroReport } from '@/lib/hydro/io'
import { REGION_LIST } from '@/lib/hydro/constants'
import ProjectForm from '@/components/hydro/project-form'
import SegmentForm from '@/components/hydro/segment-form'
import ResultsTable from '@/components/hydro/results-table'
import SummaryTable from '@/components/hydro/summary-table'
import ReportView from '@/components/hydro/report-view'

const TABS: { key: HydroTab; label: string }[] = [
  { key: 'project', label: '① 프로젝트 설정' },
  { key: 'segments', label: '② 구간 입력' },
  { key: 'results', label: '③ 계산 결과' },
  { key: 'summary', label: '④ 제원검토표' },
  { key: 'report', label: '⑤ 상세 보고서' },
]

export default function HydroPage() {
  const [state, setState] = useState(createDefaultState())
  const [region, setRegion] = useState<RegionName>('김해')
  const [activeTab, setActiveTab] = useState<HydroTab>('project')
  const [computed, setComputed] = useState<ComputedResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCalculate = useCallback(() => {
    try {
      setError(null)
      const results = computeAll(state.segments, state.project.designFrequency, region)
      setComputed(results)
      setActiveTab('results')
    } catch (e: any) {
      setError(e.message || '계산 오류')
    }
  }, [state, region])

  const handleSave = () => exportJSON(state)

  const handleLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const imported = await importJSON(file)
      setState(imported)
      setComputed([])
      setActiveTab('project')
      setError(null)
    } catch (err: any) {
      setError(err.message)
    }
    e.target.value = ''
  }

  const handleDownloadReport = async () => {
    try {
      if (!computed.length) {
        setError('먼저 계산을 실행하세요.')
        return
      }
      await downloadHydroReport(state.project, computed, region)
    } catch (e: any) {
      setError(e.message || '보고서 생성 오류')
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)]">
      {/* 헤더 */}
      <div className="bg-blue-600 text-white px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">우수 수리계산서 프로그램</h1>
            <p className="text-sm text-blue-200">도로배수시설 설계 및 관리지침(국토교통부, 2020) · 하수도시설기준 · 하천설계기준 적용</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm">
              <span>지역</span>
              <select value={region} onChange={e => { setRegion(e.target.value as RegionName); setComputed([]) }}
                className="rounded px-2 py-1 text-sm text-gray-800 bg-white border">
                {REGION_LIST.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <button onClick={handleSave} className="rounded border border-white px-3 py-1 text-sm hover:bg-blue-700">저장</button>
            <button onClick={() => fileInputRef.current?.click()} className="rounded border border-white px-3 py-1 text-sm hover:bg-blue-700">불러오기</button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleLoad} className="hidden" />
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="bg-white border-b px-6">
        <div className="flex gap-0">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 액션바 */}
      <div className="bg-gray-50 border-b px-6 py-2 flex items-center gap-3">
        <button onClick={handleCalculate}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white font-semibold hover:bg-blue-700">
          계산하기
        </button>
        {computed.length > 0 && (
          <button onClick={handleDownloadReport}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100">
            Word 보고서 다운로드
          </button>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="p-6">
        {activeTab === 'project' && (
          <ProjectForm
            project={state.project}
            region={region}
            onChange={p => setState(prev => ({ ...prev, project: p }))}
            onRegionChange={setRegion}
          />
        )}
        {activeTab === 'segments' && (
          <SegmentForm
            segments={state.segments}
            nextId={state.nextId}
            onChange={(segs, nid) => setState(prev => ({ ...prev, segments: segs, nextId: nid }))}
          />
        )}
        {activeTab === 'results' && <ResultsTable computed={computed} />}
        {activeTab === 'summary' && <SummaryTable computed={computed} freq={state.project.designFrequency} />}
        {activeTab === 'report' && <ReportView project={state.project} computed={computed} region={region} />}
      </div>
    </div>
  )
}
