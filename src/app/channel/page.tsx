'use client'

import { useState, useCallback } from 'react'
import type { ChannelFormFields } from '@/types/channel'
import { getDefaultChannelFields, formToChannelInput } from '@/types/channel'
import { calculateChannel } from '@/lib/channel-calc'
import ChannelForm from '@/components/channel/channel-form'
import ChannelDiagram from '@/components/channel/channel-diagram'

type Tab = 'loads' | 'design'

export default function ChannelPage() {
  const [fields, setFields] = useState<ChannelFormFields>(getDefaultChannelFields())
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('loads')

  const handleCalculate = useCallback(() => {
    setLoading(true)
    setError(null)
    try {
      const input = formToChannelInput(fields)
      const data = calculateChannel(input)
      setResults(data)
      setActiveTab('loads')
    } catch (e: any) {
      setError(e.message || '계산 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [fields])

  const j = results?.judgment
  const loads = results?.loads
  const member = results?.member

  const TABS: { key: Tab; label: string }[] = [
    { key: 'loads', label: '하중/부재력' },
    { key: 'design', label: '부재설계' },
  ]

  const f2 = (v: any) => v != null ? Number(v).toFixed(2) : '-'
  const f3 = (v: any) => v != null ? Number(v).toFixed(3) : '-'

  return (
    <div className="flex gap-4 p-4 min-h-[calc(100vh-56px)]">
      {/* Left panel */}
      <aside className="w-80 shrink-0 overflow-y-auto max-h-[calc(100vh-72px)] bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-lg font-bold text-gray-800 mb-3">U형개거 구조검토</h2>

        <ChannelDiagram H={fields.H} B={fields.B} tw={fields.tw} ts={fields.ts} haunch={fields.haunch} />

        <div className="mt-2">
          <ChannelForm fields={fields} onChange={setFields} />
        </div>

        <div className="mt-4 space-y-2">
          <button onClick={handleCalculate} disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? '계산 중...' : '계산하기'}
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
      </aside>

      {/* Right panel */}
      <section className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
        {!results ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            좌측에서 U형개거 제원을 입력하고 "계산하기"를 클릭하세요.
          </div>
        ) : (
          <>
            {/* Overall judgment */}
            {j && (
              <div className="px-4 pt-4 pb-2">
                <div className={`inline-block rounded-lg px-4 py-1.5 text-sm font-bold ${j.all_ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  종합 판정: {j.all_ok ? 'OK' : 'NG'}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-4">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>{t.label}</button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'loads' && loads && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-700">하중 산정</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Metric label="토압계수 Ka" value={f3(loads.Ka)} />
                    <Metric label="벽체 상단 토압" value={`${f2(loads.q_top)} kN/m²`} />
                    <Metric label="벽체 하단 토압" value={`${f2(loads.q_bot)} kN/m²`} />
                    <Metric label="외수압 하단" value={`${f2(loads.pw_out_bot)} kN/m²`} />
                    <Metric label="내수압 하단" value={`${f2(loads.pw_in_bot)} kN/m²`} />
                    <Metric label="활하중 환산" value={`${f2(loads.q_live)} kN/m²`} />
                  </div>
                  <h3 className="font-semibold text-gray-700 mt-4">설계 부재력 (극한)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Metric label="측벽 Mu" value={`${f2(loads.Mu_wall_u)} kN·m`} />
                    <Metric label="측벽 Vu" value={`${f2(loads.Vu_wall_u)} kN`} />
                    <Metric label="저판 단부 Mu" value={`${f2(loads.Mu_slab_end_u)} kN·m`} />
                    <Metric label="저판 중앙 Mu" value={`${f2(loads.Mu_slab_mid_u)} kN·m`} />
                    <Metric label="저판 Vu" value={`${f2(loads.Vu_slab_u)} kN`} />
                  </div>
                </div>
              )}

              {activeTab === 'design' && member && (
                <div className="space-y-6">
                  {[
                    { key: 'wall_in', label: '측벽 내측', ok: j?.wall_in_ok },
                    { key: 'wall_out', label: '측벽 외측', ok: j?.wall_out_ok },
                    { key: 'slab_end', label: '저판 단부 (상면)', ok: j?.slab_end_ok },
                    { key: 'slab_mid', label: '저판 중앙 (하면)', ok: j?.slab_mid_ok },
                  ].map(({ key, label, ok }) => {
                    const m = member[key]
                    if (!m) return null
                    return (
                      <div key={key} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="font-semibold text-gray-700">{label}</h4>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {ok ? 'OK' : 'NG'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <Metric label="휨 φMn" value={`${f2(m.phiMn)} kN·m`}
                            sub={`Mu=${f2(m.Mu)}`} ok={m.flexure_ok} />
                          <Metric label="전단 φVc" value={`${f2(m.phiVc)} kN`}
                            sub={`Vu=${f2(m.Vu)}`} ok={m.shear_ok} />
                          <Metric label="균열 Smax" value={`${f2(m.s_max)} mm`}
                            sub={`간격=${m.rebar_spacing}mm`} ok={m.crack_ok} />
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          As={f2(m.As)} mm²/m · ρ={f3(m.rho)} · D{m.rebar_dia}@{m.rebar_spacing}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function Metric({ label, value, sub, ok }: { label: string; value: string; sub?: string; ok?: boolean }) {
  const bg = ok === undefined ? 'bg-gray-50' : ok ? 'bg-green-50' : 'bg-red-50'
  const color = ok === undefined ? 'text-gray-800' : ok ? 'text-green-700' : 'text-red-700'
  return (
    <div className={`rounded px-3 py-2 ${bg}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`font-semibold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  )
}
