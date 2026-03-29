'use client'
import type { HydroSegment, PipeType } from '@/types/hydro'
import { createDefaultSegment } from '@/types/hydro'
import { PIPE_MATERIALS, RUNOFF_COEFFICIENTS, KERBY_N_VALUES } from '@/lib/hydro/constants'

interface Props {
  segments: HydroSegment[]
  nextId: number
  onChange: (segments: HydroSegment[], nextId: number) => void
}

const PIPE_TYPES: { value: PipeType; label: string }[] = [
  { value: 'circular', label: '원형관' },
  { value: 'box', label: 'BOX' },
  { value: 'trapezoidal', label: '토사측구' },
  { value: 'uditch', label: 'U형측구' },
  { value: 'jehyung', label: '제형측구' },
]

export default function SegmentForm({ segments, nextId, onChange }: Props) {
  const addSeg = () => onChange([...segments, createDefaultSegment(nextId)], nextId + 1)
  const removeSeg = (idx: number) => {
    if (!confirm(`구간 ${idx + 1}을 삭제하시겠습니까?`)) return
    onChange(segments.filter((_, i) => i !== idx), nextId)
  }
  const dupSeg = (idx: number) => {
    const clone = { ...segments[idx], id: nextId, name: segments[idx].name + ' (복사)' }
    const newSegs = [...segments]
    newSegs.splice(idx + 1, 0, clone)
    onChange(newSegs, nextId + 1)
  }
  const updateSeg = (idx: number, patch: Partial<HydroSegment>) => {
    onChange(segments.map((s, i) => i === idx ? { ...s, ...patch } : s), nextId)
  }

  return (
    <div className="space-y-1">
      <details className="group border border-gray-200 rounded-lg" open>
        <summary className="cursor-pointer select-none px-3 py-2 bg-gray-100 rounded-t-lg font-semibold text-gray-700 text-sm hover:bg-gray-200 flex justify-between items-center">
          <span>구간 입력 ({segments.length})</span>
          <button onClick={e => { e.preventDefault(); addSeg() }}
            className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700">
            + 추가
          </button>
        </summary>
        <div className="px-3 py-2 space-y-2">
          {segments.length === 0 && (
            <p className="text-center text-xs text-gray-400 py-4">구간이 없습니다. + 추가를 클릭하세요.</p>
          )}
          {segments.map((seg, idx) => (
            <details key={seg.id} className="border border-gray-100 rounded bg-gray-50">
              <summary className="cursor-pointer px-2 py-1.5 text-xs font-medium text-gray-700 flex justify-between items-center hover:bg-gray-100">
                <span>#{idx + 1} {seg.name || '(미입력)'}</span>
                <span className="flex gap-1">
                  <button onClick={e => { e.preventDefault(); dupSeg(idx) }} className="text-gray-400 hover:text-blue-600">복제</button>
                  <button onClick={e => { e.preventDefault(); removeSeg(idx) }} className="text-gray-400 hover:text-red-600">삭제</button>
                </span>
              </summary>
              <div className="px-2 py-2 space-y-2 text-sm">
                {/* 기본 */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <Txt label="구간명" value={seg.name} onChange={v => updateSeg(idx, { name: v })} />
                  <Txt label="유역명" value={seg.watershed} onChange={v => updateSeg(idx, { watershed: v })} />
                  <Txt label="기점 맨홀" value={seg.manholeFrom} onChange={v => updateSeg(idx, { manholeFrom: v })} />
                  <Txt label="종점 맨홀" value={seg.manholeTo} onChange={v => updateSeg(idx, { manholeTo: v })} />
                </div>

                {/* 유역 */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <Num label="유역면적 (ha)" value={seg.area} onChange={v => updateSeg(idx, { area: v })} />
                  <Num label="누가면적 (ha)" value={seg.cumulArea} onChange={v => updateSeg(idx, { cumulArea: v })} />
                  <label className="flex flex-col gap-0.5">
                    <span className="text-xs text-gray-500">유출계수</span>
                    <select value={seg.runoffCoeffType} onChange={e => {
                      const rc = RUNOFF_COEFFICIENTS.find(r => r.type === e.target.value)
                      updateSeg(idx, { runoffCoeffType: e.target.value, runoffCoeff: rc?.value || seg.runoffCoeff })
                    }} className="w-full rounded border border-gray-300 px-2 py-1 text-xs bg-white">
                      {RUNOFF_COEFFICIENTS.map(rc => <option key={rc.type} value={rc.type}>{rc.label}</option>)}
                    </select>
                  </label>
                  {seg.runoffCoeffType === 'custom' && (
                    <NumVal label="C 직접입력" value={seg.runoffCoeff} step={0.01}
                      onChange={v => updateSeg(idx, { runoffCoeff: v })} />
                  )}
                </div>

                {/* 표고 */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <Num label="상부표고 (m)" value={seg.elevUpper} onChange={v => updateSeg(idx, { elevUpper: v })} />
                  <Num label="하부표고 (m)" value={seg.elevLower} onChange={v => updateSeg(idx, { elevLower: v })} />
                  <Num label="유로연장 (m)" value={seg.channelLength} onChange={v => updateSeg(idx, { channelLength: v })} />
                  <Num label="Kerby L (m)" value={seg.kerbyL} onChange={v => updateSeg(idx, { kerbyL: v })} />
                </div>

                {/* Kerby */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <label className="flex flex-col gap-0.5">
                    <span className="text-xs text-gray-500">지체계수 n</span>
                    <select value={seg.kerbyN} onChange={e => updateSeg(idx, { kerbyN: parseFloat(e.target.value) })}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs bg-white">
                      {KERBY_N_VALUES.map(k => <option key={k.n} value={k.n}>{k.surface.slice(0, 8)}.. (n={k.n})</option>)}
                    </select>
                  </label>
                  <NumVal label="보정계수 a" value={seg.travelCorrFactor} step={0.05}
                    onChange={v => updateSeg(idx, { travelCorrFactor: v })} />
                </div>

                {/* 관로 */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <label className="flex flex-col gap-0.5">
                    <span className="text-xs text-gray-500">관종</span>
                    <select value={seg.pipeType} onChange={e => updateSeg(idx, { pipeType: e.target.value as PipeType })}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs bg-white">
                      {PIPE_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                    </select>
                  </label>

                  {seg.pipeType === 'circular' && (
                    <>
                      <Num label="관경 D (mm)" value={seg.pipeDiameter} onChange={v => updateSeg(idx, { pipeDiameter: v })} />
                      <label className="flex flex-col gap-0.5 col-span-2">
                        <span className="text-xs text-gray-500">재질</span>
                        <select value={seg.pipeMaterial} onChange={e => {
                          const mat = PIPE_MATERIALS.circular.find(m => m.name === e.target.value)
                          updateSeg(idx, { pipeMaterial: e.target.value, pipeRoughness: mat?.n || seg.pipeRoughness })
                        }} className="w-full rounded border border-gray-300 px-2 py-1 text-xs bg-white">
                          <option value="">선택</option>
                          {PIPE_MATERIALS.circular.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                        </select>
                      </label>
                    </>
                  )}
                  {seg.pipeType === 'box' && (
                    <>
                      <Num label="폭 B (m)" value={seg.boxWidth} onChange={v => updateSeg(idx, { boxWidth: v })} />
                      <Num label="높이 H (m)" value={seg.boxHeight} onChange={v => updateSeg(idx, { boxHeight: v })} />
                    </>
                  )}
                  {seg.pipeType === 'trapezoidal' && (
                    <>
                      <Num label="상폭 (m)" value={seg.ditchTopWidth} onChange={v => updateSeg(idx, { ditchTopWidth: v })} />
                      <Num label="하폭 (m)" value={seg.ditchBotWidth} onChange={v => updateSeg(idx, { ditchBotWidth: v })} />
                      <Num label="깊이 (m)" value={seg.ditchDepth} onChange={v => updateSeg(idx, { ditchDepth: v })} />
                    </>
                  )}
                  {seg.pipeType === 'uditch' && (
                    <>
                      <Num label="내폭 (m)" value={seg.uWidth} onChange={v => updateSeg(idx, { uWidth: v })} />
                      <Num label="높이 (m)" value={seg.uHeight} onChange={v => updateSeg(idx, { uHeight: v })} />
                    </>
                  )}
                  {seg.pipeType === 'jehyung' && (
                    <>
                      <Num label="상폭 (m)" value={seg.jhTopWidth} onChange={v => updateSeg(idx, { jhTopWidth: v })} />
                      <Num label="하폭 (m)" value={seg.jhBotWidth} onChange={v => updateSeg(idx, { jhBotWidth: v })} />
                      <Num label="깊이 (m)" value={seg.jhDepth} onChange={v => updateSeg(idx, { jhDepth: v })} />
                    </>
                  )}
                </div>

                {/* 표고/경사 */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <Num label="기점 관저고 (m)" value={seg.invertFrom} onChange={v => updateSeg(idx, { invertFrom: v })} />
                  <Num label="종점 관저고 (m)" value={seg.invertTo} onChange={v => updateSeg(idx, { invertTo: v })} />
                  <Num label="관거 연장 (m)" value={seg.commonLength} onChange={v => updateSeg(idx, { commonLength: v })} />
                  <label className="flex flex-col gap-0.5">
                    <span className="text-xs text-gray-500">경사 산정</span>
                    <select value={seg.slopeMode} onChange={e => updateSeg(idx, { slopeMode: e.target.value as 'auto'|'manual' })}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs bg-white">
                      <option value="auto">자동</option>
                      <option value="manual">직접입력</option>
                    </select>
                  </label>
                  {seg.slopeMode === 'manual' && (
                    <Num label="경사 I (%)" value={seg.appliedSlope} onChange={v => updateSeg(idx, { appliedSlope: v })} />
                  )}
                </div>

                {/* 비고 */}
                <Txt label="비고" value={seg.remark} onChange={v => updateSeg(idx, { remark: v })} />
              </div>
            </details>
          ))}
        </div>
      </details>
    </div>
  )
}

/* Sub-components */
function Txt({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 truncate">{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
    </label>
  )
}

function Num({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 truncate">{label}</span>
      <input type="number" value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
    </label>
  )
}

function NumVal({ label, value, step = 1, onChange }: { label: string; value: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 truncate">{label}</span>
      <input type="number" value={value} step={step} onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
    </label>
  )
}
