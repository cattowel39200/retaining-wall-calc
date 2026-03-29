'use client'

import { useState, useCallback, useRef } from 'react'
import type { RegionName, ComputedResult } from '@/types/hydro'
import { createDefaultState } from '@/types/hydro'
import { computeAll } from '@/lib/hydro/calc-engine'
import { exportJSON, importJSON, downloadHydroReport } from '@/lib/hydro/io'
import { REGION_LIST } from '@/lib/hydro/constants'
import ProjectForm from '@/components/hydro/project-form'
import SegmentForm from '@/components/hydro/segment-form'
import ResultsTable from '@/components/hydro/results-table'
import SummaryTable from '@/components/hydro/summary-table'
import ReportView from '@/components/hydro/report-view'

type Tab = 'results' | 'summary' | 'report'

export default function HydroPage() {
  const [state, setState] = useState(createDefaultState())
  const [region, setRegion] = useState<RegionName>('김해')
  const [activeTab, setActiveTab] = useState<Tab>('results')
  const [computed, setComputed] = useState<ComputedResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCalculate = useCallback(() => {
    try {
      setLoading(true)
      setError(null)
      const results = computeAll(state.segments, state.project.designFrequency, region)
      setComputed(results)
      setActiveTab('results')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '계산 오류')
    } finally {
      setLoading(false)
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
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '파일 오류')
    }
    e.target.value = ''
  }

  const handleDownload = async () => {
    if (!computed.length) { setError('먼저 계산을 실행하세요.'); return }
    try { await downloadHydroReport(state.project, computed, region) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : '보고서 오류') }
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'results', label: '계산 결과' },
    { key: 'summary', label: '제원검토표' },
    { key: 'report', label: '상세 보고서' },
  ]

  return (
    <div className="flex gap-4 p-4 min-h-[calc(100vh-56px)]">
      {/* ===== 좌측: 입력 패널 ===== */}
      <aside className="w-80 shrink-0 overflow-y-auto max-h-[calc(100vh-72px)] bg-white rounded-xl border border-gray-200 p-4 space-y-1">
        <h2 className="text-lg font-bold text-gray-800 mb-3">우수 수리계산</h2>
        {/* 지역 선택 */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-600">지역</span>
          <select value={region} onChange={e => { setRegion(e.target.value as RegionName); setComputed([]) }}
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm bg-white">
            {REGION_LIST.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* 프로젝트 설정 */}
        <ProjectForm
          project={state.project}
          region={region}
          onChange={p => setState(prev => ({ ...prev, project: p }))}
          onRegionChange={setRegion}
        />

        {/* 구간 입력 */}
        <SegmentForm
          segments={state.segments}
          nextId={state.nextId}
          onChange={(segs, nid) => setState(prev => ({ ...prev, segments: segs, nextId: nid }))}
        />

        {/* 버튼 영역 */}
        <div className="pt-3 space-y-2">
          <button onClick={handleCalculate} disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? '계산 중...' : '계산하기'}
          </button>

          {computed.length > 0 && (
            <button onClick={handleDownload}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors">
              Word 보고서 다운로드
            </button>
          )}

          <div className="flex gap-2">
            <button onClick={handleSave}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors">
              저장
            </button>
            <button onClick={() => fileInputRef.current?.click()}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors">
              불러오기
            </button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleLoad} className="hidden" />
          </div>
        </div>

        {error && (
          <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </aside>

      {/* ===== 우측: 결과 패널 ===== */}
      <section className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
        {!computed.length ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            좌측에서 프로젝트와 구간을 입력하고 &ldquo;계산하기&rdquo;를 클릭하세요.
          </div>
        ) : (
          <>
            {/* 탭 */}
            <div className="flex border-b border-gray-200 px-4">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === t.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* 탭 콘텐츠 */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'results' && <ResultsTable computed={computed} />}
              {activeTab === 'summary' && <SummaryTable computed={computed} freq={state.project.designFrequency} />}
              {activeTab === 'report' && <ReportView project={state.project} computed={computed} region={region} />}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
