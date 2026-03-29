'use client'

import { useState, useCallback } from 'react'
import type { WallFormFields } from '@/types/wall'
import { getDefaultFormFields, formToInput } from '@/types/wall'
import { calculateWall, downloadReport, svgToPngBase64 } from '@/lib/api'
import WallForm from '@/components/wall/wall-form'
import ResultMetric from '@/components/wall/result-metric'

type Tab = 'stability' | 'member' | 'design'

export default function Home() {
  const [fields, setFields] = useState<WallFormFields>(getDefaultFormFields('L형'))
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('stability')

  const handleCalculate = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const input = formToInput(fields)
      const data = await calculateWall(input)
      setResults(data)
      setActiveTab('stability')
    } catch (e: any) {
      setError(e.message || '계산 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [fields])

  const handleDownload = useCallback(async () => {
    try {
      // SVG 단면도를 PNG로 캡처
      let sectionBase64: string | undefined
      const svgEl = document.querySelector('.section-diagram-svg') as SVGSVGElement | null
      if (svgEl) {
        sectionBase64 = await svgToPngBase64(svgEl)
      }
      await downloadReport(formToInput(fields), sectionBase64)
    } catch (e: any) {
      setError(e.message || '보고서 다운로드 오류')
    }
  }, [fields])

  const j = results?.judgment
  const stab = results?.stability
  const sec = results?.section
  const member = results?.member
  const blocks = results?.blocks
  const ep = results?.earth_pressure

  const TABS: { key: Tab; label: string }[] = [
    { key: 'stability', label: '안정검토' },
    { key: 'member', label: '단면검토' },
    { key: 'design', label: '부재설계' },
  ]

  return (
    <div className="flex gap-4 p-4 min-h-[calc(100vh-56px)]">
      {/* ===== 좌측: 입력 패널 ===== */}
      <aside className="w-80 shrink-0 overflow-y-auto max-h-[calc(100vh-72px)] bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-lg font-bold text-gray-800 mb-3">옹벽 구조검토</h2>
        <WallForm fields={fields} onChange={setFields} />

        <div className="mt-4 space-y-2">
          <button
            onClick={handleCalculate}
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '계산 중...' : '계산하기'}
          </button>

          {results && (
            <button
              onClick={handleDownload}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Word 보고서 다운로드
            </button>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </aside>

      {/* ===== 우측: 결과 패널 ===== */}
      <section className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
        {!results ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            좌측에서 옹벽 파라미터를 입력하고 &ldquo;계산하기&rdquo;를 클릭하세요.
          </div>
        ) : (
          <>
            {/* 종합 판정 */}
            {j && (
              <div className="px-4 pt-4 pb-2">
                <div className={`inline-block rounded-lg px-4 py-1.5 text-sm font-bold ${
                  j.all_ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  종합 판정: {j.all_ok ? 'OK' : 'NG'} ({j.wall_type})
                </div>
              </div>
            )}

            {/* 탭 */}
            <div className="flex border-b border-gray-200 px-4">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === t.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* 탭 콘텐츠 */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'stability' && stab && j && (
                <TabStability stab={stab} j={j} blocks={blocks} ep={ep} />
              )}
              {activeTab === 'member' && sec && j && (
                <TabSectionForces sec={sec} j={j} />
              )}
              {activeTab === 'design' && member && j && (
                <TabDesign member={member} j={j} />
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

/* ====================================================================
   Tab Components
   ==================================================================== */

/* eslint-disable @typescript-eslint/no-explicit-any */
function TabStability({ stab, j, blocks, ep }: { stab: any; j: any; blocks?: any; ep?: any }) {
  const n = stab.normal
  const s = stab.seismic

  const f3 = (v: any) => v != null ? Number(v).toFixed(3) : '-'
  const f2 = (v: any) => v != null ? Number(v).toFixed(2) : '-'
  const f1 = (v: any) => v != null ? Number(v).toFixed(1) : '-'
  const f4 = (v: any) => v != null ? Number(v).toFixed(4) : '-'

  const stabRows = [
    {
      label: '활동 안전율',
      normal: f3(n.SF_slide), nOk: j.slide_normal === 'OK', nReq: '1.500',
      seismic: f3(s.SF_slide), sOk: j.slide_seismic === 'OK', sReq: '1.200',
    },
    {
      label: '전도 안전율',
      normal: f3(n.SF_overturn), nOk: j.overturn_normal === 'OK', nReq: '2.000',
      seismic: f3(s.SF_overturn), sOk: j.overturn_seismic === 'OK', sReq: '1.500',
    },
    {
      label: '편심 e (m)',
      normal: f4(n.e), nOk: j.eccentricity_normal === 'OK', nReq: `B/6=${f3(n.B6)}`,
      seismic: f4(s.e), sOk: j.eccentricity_seismic === 'OK', sReq: `B/3=${f3(n.B3)}`,
    },
    {
      label: '지지력 (kN/m2)',
      normal: `${f1(n.Q1)} / ${f1(n.Q2)}`, nOk: j.bearing_normal === 'OK', nReq: `qa=${f1(n.qa)}`,
      seismic: `${f1(s.Q1)} / ${f1(s.Q2)}`, sOk: j.bearing_seismic === 'OK', sReq: `qa=${f1(s.qa)}`,
    },
  ]

  return (
    <div className="space-y-5">
      {/* ── 1. 종합 메트릭 (8개) ── */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">종합 안정성 판정</h3>
        <div className="grid grid-cols-4 gap-2">
          <ResultMetric label="활동(상시)" value={j.slide_normal} ok={j.slide_normal === 'OK'} />
          <ResultMetric label="전도(상시)" value={j.overturn_normal} ok={j.overturn_normal === 'OK'} />
          <ResultMetric label="편심(상시)" value={j.eccentricity_normal} ok={j.eccentricity_normal === 'OK'} />
          <ResultMetric label="지지력(상시)" value={j.bearing_normal} ok={j.bearing_normal === 'OK'} />
          <ResultMetric label="활동(지진)" value={j.slide_seismic} ok={j.slide_seismic === 'OK'} />
          <ResultMetric label="전도(지진)" value={j.overturn_seismic} ok={j.overturn_seismic === 'OK'} />
          <ResultMetric label="편심(지진)" value={j.eccentricity_seismic} ok={j.eccentricity_seismic === 'OK'} />
          <ResultMetric label="지지력(지진)" value={j.bearing_seismic} ok={j.bearing_seismic === 'OK'} />
        </div>
      </div>

      {/* ── 2. 자중 및 재토하중 ── */}
      {blocks && (
        <div>
          <h3 className="font-semibold text-gray-700 mb-2">자중 및 재토하중</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1.5 text-left">블록</th>
                  <th className="border border-gray-300 px-2 py-1.5">면적 (m2)</th>
                  <th className="border border-gray-300 px-2 py-1.5">γ (kN/m3)</th>
                  <th className="border border-gray-300 px-2 py-1.5">W (kN)</th>
                  <th className="border border-gray-300 px-2 py-1.5">x (m)</th>
                  <th className="border border-gray-300 px-2 py-1.5">Mr (kN.m)</th>
                  <th className="border border-gray-300 px-2 py-1.5">Mo (kN.m)</th>
                </tr>
              </thead>
              <tbody>
                {/* 콘크리트 블록 */}
                {blocks.c_results?.map((r: any, i: number) => (
                  <tr key={`c-${i}`}>
                    <td className="border border-gray-300 px-2 py-1">{r[0] || r.name}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{f3(r[1] ?? r.A)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{f1(r[2] ?? r.gamma)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{f2(r[3] ?? r.W)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{f3(r[6] ?? r.x)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{f2(r[8] ?? r.Mr)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{f2(r[9] ?? r.Mo)}</td>
                  </tr>
                ))}
                {/* 소계: 콘크리트 */}
                <tr className="bg-gray-50 font-medium">
                  <td className="border border-gray-300 px-2 py-1" colSpan={3}>콘크리트 소계</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{f2(blocks.Wc)}</td>
                  <td className="border border-gray-300 px-2 py-1"></td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{f2(blocks.Mrc)}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{f2(blocks.Moc)}</td>
                </tr>
                {/* 토사 블록 */}
                {blocks.s_results?.map((r: any, i: number) => (
                  <tr key={`s-${i}`}>
                    <td className="border border-gray-300 px-2 py-1">{r[0] || r.name}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{f3(r[1] ?? r.A)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{f1(r[2] ?? r.gamma)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{f2(r[3] ?? r.W)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{f3(r[6] ?? r.x)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{f2(r[8] ?? r.Mr)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{f2(r[9] ?? r.Mo)}</td>
                  </tr>
                ))}
                {/* 소계: 토사 */}
                <tr className="bg-gray-50 font-medium">
                  <td className="border border-gray-300 px-2 py-1" colSpan={3}>토사 소계</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{f2(blocks.Ws)}</td>
                  <td className="border border-gray-300 px-2 py-1"></td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{f2(blocks.Mrs)}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{f2(blocks.Mos)}</td>
                </tr>
                {/* 합계 */}
                <tr className="bg-blue-50 font-bold">
                  <td className="border border-gray-300 px-2 py-1" colSpan={3}>합계</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{f2(blocks.Wt)}</td>
                  <td className="border border-gray-300 px-2 py-1"></td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{f2(blocks.Mrt)}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{f2(blocks.Mot)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 3. 토압 계산 ── */}
      {ep && (
        <div>
          <h3 className="font-semibold text-gray-700 mb-2">토압 계산</h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="rounded border border-gray-200 p-3 space-y-1">
              <div className="font-semibold text-gray-600 mb-1">상시 (Rankine)</div>
              <div>Ka = {f3(ep.Ka)}</div>
              <div>Pa = {f2(ep.Pa)} kN/m</div>
              <div>Pa_total = {f2(ep.Pa_total)} kN/m</div>
              {ep.Pa_v != null && <div>Pa_v = {f2(ep.Pa_v)} kN/m</div>}
              <div>ya = {f3(ep.ya)} m</div>
              <div>Mo_pa = {f2(ep.Mo_pa)} kN.m</div>
            </div>
            <div className="rounded border border-gray-200 p-3 space-y-1">
              <div className="font-semibold text-gray-600 mb-1">지진시 (Mononobe-Okabe)</div>
              <div>KAE = {f3(ep.KAE)}</div>
              <div>PAE = {f2(ep.PAE)} kN/m</div>
              <div>yae = {f3(ep.yae)} m</div>
              <div>Mo_pae = {f2(ep.Mo_pae)} kN.m</div>
            </div>
          </div>
          {(ep.Ph_sur != null && ep.Ph_sur > 0) && (
            <div className="mt-2 rounded border border-gray-200 p-3 text-xs space-y-1">
              <div className="font-semibold text-gray-600 mb-1">과재하중 토압</div>
              <div>Ph_sur = {f2(ep.Ph_sur)} kN/m &nbsp;|&nbsp; Pv_sur = {f2(ep.Pv_sur)} kN/m</div>
              <div>Mo_ph = {f2(ep.Mo_ph)} kN.m &nbsp;|&nbsp; Mr_pv = {f2(ep.Mr_pv)} kN.m</div>
            </div>
          )}
          {(ep.Pw != null && ep.Pw > 0) && (
            <div className="mt-2 rounded border border-gray-200 p-3 text-xs space-y-1">
              <div className="font-semibold text-gray-600 mb-1">수압</div>
              <div>Pw = {f2(ep.Pw)} kN/m &nbsp;|&nbsp; U = {f2(ep.U)} kN/m</div>
            </div>
          )}
        </div>
      )}

      {/* ── 4. 안정검토 결과표 ── */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">안정검토 결과</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left">검토항목</th>
                <th className="border border-gray-300 px-3 py-2">상시 결과</th>
                <th className="border border-gray-300 px-3 py-2">기준</th>
                <th className="border border-gray-300 px-3 py-2">판정</th>
                <th className="border border-gray-300 px-3 py-2">지진시 결과</th>
                <th className="border border-gray-300 px-3 py-2">기준</th>
                <th className="border border-gray-300 px-3 py-2">판정</th>
              </tr>
            </thead>
            <tbody>
              {stabRows.map((r) => (
                <tr key={r.label}>
                  <td className="border border-gray-300 px-3 py-1.5 font-medium">{r.label}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-center">{r.normal}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-center text-xs text-gray-500">{r.nReq}</td>
                  <td className={`border border-gray-300 px-3 py-1.5 text-center font-bold ${r.nOk ? 'text-green-600' : 'text-red-600'}`}>
                    {r.nOk ? 'OK' : 'NG'}
                  </td>
                  <td className="border border-gray-300 px-3 py-1.5 text-center">{r.seismic}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-center text-xs text-gray-500">{r.sReq}</td>
                  <td className={`border border-gray-300 px-3 py-1.5 text-center font-bold ${r.sOk ? 'text-green-600' : 'text-red-600'}`}>
                    {r.sOk ? 'OK' : 'NG'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. 하중 집계 (상시/지진) ── */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">안정검토용 하중집계</h3>
        <div className="grid grid-cols-2 gap-4">
          <LoadSummaryCard title="상시" data={n} />
          <LoadSummaryCard title="지진시" data={s} />
        </div>
      </div>

      {/* ── 6. 전도 상세 ── */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">전도에 대한 안정검토</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="rounded border border-gray-200 p-3 space-y-1">
            <div className="font-semibold text-gray-600">상시</div>
            <div>SF = SMr / SMo = {f2(n.SMr)} / {f2(n.SMo)} = <strong>{f3(n.SF_overturn)}</strong> &ge; 2.0</div>
            <div>e = B/2 - (SMr-SMo)/SV = {f4(n.e)} m</div>
            <div>B/6 = {f3(n.B6)} m → {j.eccentricity_normal === 'OK' ? 'e ≤ B/6 ✓' : 'e > B/6 ✗'}</div>
          </div>
          <div className="rounded border border-gray-200 p-3 space-y-1">
            <div className="font-semibold text-gray-600">지진시</div>
            <div>SF = SMr / SMo = {f2(s.SMr)} / {f2(s.SMo)} = <strong>{f3(s.SF_overturn)}</strong> &ge; 1.5</div>
            <div>e = {f4(s.e)} m</div>
            <div>B/3 = {f3(n.B3)} m → {j.eccentricity_seismic === 'OK' ? 'e ≤ B/3 ✓' : 'e > B/3 ✗'}</div>
          </div>
        </div>
      </div>

      {/* ── 7. 지지력 상세 ── */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">지지력에 대한 안정검토</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="rounded border border-gray-200 p-3 space-y-1">
            <div className="font-semibold text-gray-600">상시</div>
            <div>Be (유효폭) = {f3(n.Be)} m</div>
            <div>qu (극한지지력) = {f1(n.qu)} kN/m2</div>
            <div>qa (허용지지력) = {f1(n.qa)} kN/m2</div>
            <div>Q1 = {f1(n.Q1)} kN/m2 / Q2 = {f1(n.Q2)} kN/m2</div>
            <div>max(Q) = {f1(Math.max(n.Q1 ?? 0, n.Q2 ?? 0))} ≤ qa = {f1(n.qa)} → <strong>{j.bearing_normal}</strong></div>
          </div>
          <div className="rounded border border-gray-200 p-3 space-y-1">
            <div className="font-semibold text-gray-600">지진시</div>
            <div>Be (유효폭) = {f3(s.Be)} m</div>
            <div>qu (극한지지력) = {f1(s.qu)} kN/m2</div>
            <div>qa (허용지지력) = {f1(s.qa)} kN/m2</div>
            <div>Q1 = {f1(s.Q1)} kN/m2 / Q2 = {f1(s.Q2)} kN/m2</div>
            <div>max(Q) = {f1(Math.max(s.Q1 ?? 0, s.Q2 ?? 0))} ≤ qa = {f1(s.qa)} → <strong>{j.bearing_seismic}</strong></div>
          </div>
        </div>
      </div>

      {/* ── 8. 활동 상세 ── */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">활동에 대한 안정검토</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="rounded border border-gray-200 p-3 space-y-1">
            <div className="font-semibold text-gray-600">상시</div>
            <div>μ = tan(φ_B) = {f3(n.mu)}</div>
            <div>Hr (활동 저항력) = μ·SV = {f2(n.Hr)} kN</div>
            {n.Pp > 0 && <div>Pp (수동토압) = {f2(n.Pp)} kN</div>}
            {n.Pp_key > 0 && <div>Pp_key (전단키) = {f2(n.Pp_key)} kN</div>}
            <div>SF = Hr / SH = {f2(n.Hr)} / {f2(n.SH)} = <strong>{f3(n.SF_slide)}</strong> &ge; 1.5</div>
          </div>
          <div className="rounded border border-gray-200 p-3 space-y-1">
            <div className="font-semibold text-gray-600">지진시</div>
            <div>μ = tan(φ_B) = {f3(s.mu)}</div>
            <div>Hr (활동 저항력) = {f2(s.Hr)} kN</div>
            {s.Pp > 0 && <div>Pp (수동토압) = {f2(s.Pp)} kN</div>}
            <div>SF = Hr / SH = {f2(s.Hr)} / {f2(s.SH)} = <strong>{f3(s.SF_slide)}</strong> &ge; 1.2</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadSummaryCard({ title, data }: { title: string; data: any }) {
  const f2 = (v: any) => v != null ? Number(v).toFixed(2) : '-'
  return (
    <div className="rounded border border-gray-200 p-3 text-xs space-y-1">
      <div className="font-semibold text-gray-600">{title}</div>
      <table className="w-full">
        <tbody>
          <tr><td className="py-0.5">ΣV (수직력)</td><td className="text-right font-medium">{f2(data.SV)} kN</td></tr>
          <tr><td className="py-0.5">ΣH (수평력)</td><td className="text-right font-medium">{f2(data.SH)} kN</td></tr>
          <tr><td className="py-0.5">ΣMr (복원모멘트)</td><td className="text-right font-medium">{f2(data.SMr)} kN.m</td></tr>
          <tr><td className="py-0.5">ΣMo (전도모멘트)</td><td className="text-right font-medium">{f2(data.SMo)} kN.m</td></tr>
          <tr className="border-t border-gray-200"><td className="py-0.5">e (편심)</td><td className="text-right font-medium">{data.e != null ? Number(data.e).toFixed(4) : '-'} m</td></tr>
          <tr><td className="py-0.5">Q1 (최대 기저압)</td><td className="text-right font-medium">{f2(data.Q1)} kN/m2</td></tr>
          <tr><td className="py-0.5">Q2 (최소 기저압)</td><td className="text-right font-medium">{f2(data.Q2)} kN/m2</td></tr>
        </tbody>
      </table>
    </div>
  )
}

function TabSectionForces({ sec, j }: { sec: any; j: any }) {
  const lcbNames = ['lcb1', 'lcb2', 'lcb3'] as const
  const lcbLabels = ['LCB1 (1.2D+1.6L)', 'LCB2 (1.2D+1.0L+1.0E)', 'LCB3 (0.9D+1.0E)']

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-700">하중조합별 저면응력</h3>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-left">하중조합</th>
            <th className="border border-gray-300 px-3 py-2">SV (kN)</th>
            <th className="border border-gray-300 px-3 py-2">편심 e (m)</th>
            <th className="border border-gray-300 px-3 py-2">Q1 (kN/m2)</th>
            <th className="border border-gray-300 px-3 py-2">Q2 (kN/m2)</th>
          </tr>
        </thead>
        <tbody>
          {lcbNames.map((key, i) => {
            const d = sec[key]
            if (!d) return null
            return (
              <tr key={key}>
                <td className="border border-gray-300 px-3 py-1.5 font-medium">{lcbLabels[i]}</td>
                <td className="border border-gray-300 px-3 py-1.5 text-center">{d.SV?.toFixed(2)}</td>
                <td className="border border-gray-300 px-3 py-1.5 text-center">{d.e?.toFixed(4)}</td>
                <td className="border border-gray-300 px-3 py-1.5 text-center">{d.Q1?.toFixed(1)}</td>
                <td className="border border-gray-300 px-3 py-1.5 text-center">{d.Q2?.toFixed(1)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* 설계 단면력 */}
      {sec.design_forces && (
        <>
          <h3 className="font-semibold text-gray-700 mt-4">설계 단면력</h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left">단면</th>
                <th className="border border-gray-300 px-3 py-2">Mu (kN.m)</th>
                <th className="border border-gray-300 px-3 py-2">Mcr (kN.m)</th>
                <th className="border border-gray-300 px-3 py-2">Vu (kN)</th>
              </tr>
            </thead>
            <tbody>
              {(['BB', 'CC', 'DD', 'AA'] as const).map((key) => {
                const d = sec.design_forces[key]
                if (!d || (key === 'BB' && !j.has_heel) || (key === 'AA' && !j.has_toe)) return null
                const labelMap: Record<string, string> = {
                  BB: 'B-B (Heel)',
                  CC: 'C-C (벽체하부)',
                  DD: 'D-D (벽체중간)',
                  AA: 'A-A (Toe)',
                }
                return (
                  <tr key={key}>
                    <td className="border border-gray-300 px-3 py-1.5 font-medium">{labelMap[key]}</td>
                    <td className="border border-gray-300 px-3 py-1.5 text-center">{d.Mu?.toFixed(2)}</td>
                    <td className="border border-gray-300 px-3 py-1.5 text-center">{d.Mcr?.toFixed(2)}</td>
                    <td className="border border-gray-300 px-3 py-1.5 text-center">{d.Vu?.toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

function TabDesign({ member, j }: { member: any; j: any }) {
  const sections = [
    { key: 'BB', label: 'B-B (Heel 저판)', show: j.has_heel },
    { key: 'CC', label: 'C-C (벽체 하부)', show: true },
    { key: 'DD', label: 'D-D (벽체 중간)', show: true },
    { key: 'AA', label: 'A-A (Toe 저판)', show: j.has_toe },
  ]

  return (
    <div className="space-y-6">
      {j.is_gravity && !j.is_semi_gravity && (
        <div className="rounded bg-gray-100 px-4 py-3 text-sm text-gray-600">
          중력식 옹벽은 부재설계를 수행하지 않습니다.
        </div>
      )}

      {sections.map(({ key, label, show }) => {
        if (!show) return null
        const m = member[key]
        if (!m) return null
        return <MemberCard key={key} label={label} m={m} jPrefix={key} j={j} />
      })}
    </div>
  )
}

function MemberCard({ label, m, jPrefix, j }: { label: string; m: any; jPrefix: string; j: any }) {
  const fOk = j[`${jPrefix}_flexure`] === 'OK'
  const sOk = j[`${jPrefix}_shear`] === 'OK'
  const cOk = j[`${jPrefix}_crack`] === 'OK'

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 font-semibold text-gray-700">{label}</div>
      <div className="px-4 py-3 space-y-3">
        {/* 판정 메트릭 */}
        <div className="grid grid-cols-3 gap-2">
          <ResultMetric label="휨" value={fOk ? 'OK' : 'NG'} ok={fOk} />
          <ResultMetric label="전단" value={sOk ? 'OK' : 'NG'} ok={sOk} />
          <ResultMetric label="균열" value={cOk ? 'OK' : 'NG'} ok={cOk} />
        </div>

        {/* 상세 정보 */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
          <div>단면 높이: {m.H_sec?.toFixed(0)} mm</div>
          <div>유효깊이: {m.D_sec?.toFixed(1)} mm</div>
          <div>철근: D{m.rebar_dia}@{m.rebar_spacing} mm</div>
          <div>As = {m.As?.toFixed(1)} mm2/m</div>
          <div>철근비: {(m.rho * 100)?.toFixed(3)}%</div>
          <div>최소철근비: {(m.pmin * 100)?.toFixed(3)}%</div>
        </div>

        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-2 py-1">검토</th>
              <th className="border border-gray-200 px-2 py-1">작용</th>
              <th className="border border-gray-200 px-2 py-1">저항</th>
              <th className="border border-gray-200 px-2 py-1">판정</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-200 px-2 py-1">휨 (kN.m)</td>
              <td className="border border-gray-200 px-2 py-1 text-center">{m.Mu?.toFixed(2)}</td>
              <td className="border border-gray-200 px-2 py-1 text-center">{m.phiMn?.toFixed(2)}</td>
              <td className={`border border-gray-200 px-2 py-1 text-center font-bold ${fOk ? 'text-green-600' : 'text-red-600'}`}>
                {fOk ? 'OK' : 'NG'}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-200 px-2 py-1">전단 (kN)</td>
              <td className="border border-gray-200 px-2 py-1 text-center">{m.Vu?.toFixed(2)}</td>
              <td className="border border-gray-200 px-2 py-1 text-center">{m.phiVc?.toFixed(2)}</td>
              <td className={`border border-gray-200 px-2 py-1 text-center font-bold ${sOk ? 'text-green-600' : 'text-red-600'}`}>
                {sOk ? 'OK' : 'NG'}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-200 px-2 py-1">균열간격 (mm)</td>
              <td className="border border-gray-200 px-2 py-1 text-center">{m.rebar_spacing}</td>
              <td className="border border-gray-200 px-2 py-1 text-center">{m.s_max?.toFixed(0)}</td>
              <td className={`border border-gray-200 px-2 py-1 text-center font-bold ${cOk ? 'text-green-600' : 'text-red-600'}`}>
                {cOk ? 'OK' : 'NG'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
