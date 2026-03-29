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
  const addSeg = () => {
    const newSeg = createDefaultSegment(nextId)
    onChange([...segments, newSeg], nextId + 1)
  }
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
    const newSegs = segments.map((s, i) => i === idx ? { ...s, ...patch } : s)
    onChange(newSegs, nextId)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-600">구간 수: {segments.length}</span>
        <button onClick={addSeg} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white font-medium hover:bg-blue-700">
          + 구간 추가
        </button>
      </div>

      {segments.map((seg, idx) => (
        <div key={seg.id} className="bg-white rounded-lg border p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-gray-700">구간 {idx + 1}</h4>
            <div className="flex gap-1">
              <button onClick={() => dupSeg(idx)} className="text-xs px-2 py-1 rounded border hover:bg-gray-50">복제</button>
              <button onClick={() => removeSeg(idx)} className="text-xs px-2 py-1 rounded border text-red-600 hover:bg-red-50">삭제</button>
            </div>
          </div>

          {/* 기본정보 */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <Input label="구간명" value={seg.name} onChange={v => updateSeg(idx, { name: v })} />
            <Input label="유역명" value={seg.watershed} onChange={v => updateSeg(idx, { watershed: v })} />
            <Input label="기점 맨홀" value={seg.manholeFrom} onChange={v => updateSeg(idx, { manholeFrom: v })} />
            <Input label="종점 맨홀" value={seg.manholeTo} onChange={v => updateSeg(idx, { manholeTo: v })} />
          </div>

          {/* 유역조건 */}
          <details className="mb-2">
            <summary className="cursor-pointer text-sm font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded">유역 조건</summary>
            <div className="grid grid-cols-4 gap-2 mt-2">
              <Input label="유역면적 (ha)" value={seg.area} onChange={v => updateSeg(idx, { area: v })} type="number" />
              <Input label="누가면적 (ha)" value={seg.cumulArea} onChange={v => updateSeg(idx, { cumulArea: v })} type="number" />
              <label className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-500">유출계수</span>
                <select value={seg.runoffCoeffType} onChange={e => {
                  const rc = RUNOFF_COEFFICIENTS.find(r => r.type === e.target.value)
                  updateSeg(idx, { runoffCoeffType: e.target.value, runoffCoeff: rc?.value || seg.runoffCoeff })
                }} className="rounded border border-gray-300 px-2 py-1 text-sm bg-white">
                  {RUNOFF_COEFFICIENTS.map(rc => <option key={rc.type} value={rc.type}>{rc.label}</option>)}
                </select>
              </label>
              {seg.runoffCoeffType === 'custom' && (
                <NumInput label="직접입력 C" value={seg.runoffCoeff} step={0.01}
                  onChange={v => updateSeg(idx, { runoffCoeff: v })} />
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Input label="상부표고 (m)" value={seg.elevUpper} onChange={v => updateSeg(idx, { elevUpper: v })} type="number" />
              <Input label="하부표고 (m)" value={seg.elevLower} onChange={v => updateSeg(idx, { elevLower: v })} type="number" />
              <Input label="유로연장 (m)" value={seg.channelLength} onChange={v => updateSeg(idx, { channelLength: v })} type="number" />
            </div>
          </details>

          {/* 유입시간 */}
          <details className="mb-2">
            <summary className="cursor-pointer text-sm font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded">유입시간 (Kerby)</summary>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Input label="지표면 거리 L (m)" value={seg.kerbyL} onChange={v => updateSeg(idx, { kerbyL: v })} type="number" />
              <label className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-500">지체계수 n</span>
                <select value={seg.kerbyN} onChange={e => updateSeg(idx, { kerbyN: parseFloat(e.target.value) })}
                  className="rounded border border-gray-300 px-2 py-1 text-sm bg-white">
                  {KERBY_N_VALUES.map(k => <option key={k.n} value={k.n}>{k.surface} (n={k.n})</option>)}
                </select>
              </label>
              <NumInput label="보정계수 a" value={seg.travelCorrFactor} step={0.05}
                onChange={v => updateSeg(idx, { travelCorrFactor: v })} />
            </div>
          </details>

          {/* 관로 제원 */}
          <details className="mb-2" open>
            <summary className="cursor-pointer text-sm font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded">관로 제원</summary>
            <div className="grid grid-cols-4 gap-2 mt-2">
              <label className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-500">관종</span>
                <select value={seg.pipeType} onChange={e => updateSeg(idx, { pipeType: e.target.value as PipeType })}
                  className="rounded border border-gray-300 px-2 py-1 text-sm bg-white">
                  {PIPE_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                </select>
              </label>

              {seg.pipeType === 'circular' && (
                <>
                  <Input label="관경 D (mm)" value={seg.pipeDiameter} onChange={v => updateSeg(idx, { pipeDiameter: v })} type="number" />
                  <label className="flex flex-col gap-0.5">
                    <span className="text-xs text-gray-500">재질</span>
                    <select value={seg.pipeMaterial} onChange={e => {
                      const mat = PIPE_MATERIALS.circular.find(m => m.name === e.target.value)
                      updateSeg(idx, { pipeMaterial: e.target.value, pipeRoughness: mat?.n || seg.pipeRoughness })
                    }} className="rounded border border-gray-300 px-2 py-1 text-sm bg-white">
                      <option value="">선택</option>
                      {PIPE_MATERIALS.circular.map(m => <option key={m.name} value={m.name}>{m.name} (n={m.n || '직접'})</option>)}
                    </select>
                  </label>
                  <NumInput label="조도계수 n" value={seg.pipeRoughness} step={0.001}
                    onChange={v => updateSeg(idx, { pipeRoughness: v })} />
                </>
              )}
              {seg.pipeType === 'box' && (
                <>
                  <Input label="폭 B (m)" value={seg.boxWidth} onChange={v => updateSeg(idx, { boxWidth: v })} type="number" />
                  <Input label="높이 H (m)" value={seg.boxHeight} onChange={v => updateSeg(idx, { boxHeight: v })} type="number" />
                  <NumInput label="조도계수 n" value={seg.boxRoughness} step={0.001}
                    onChange={v => updateSeg(idx, { boxRoughness: v })} />
                </>
              )}
              {seg.pipeType === 'trapezoidal' && (
                <>
                  <Input label="상폭 (m)" value={seg.ditchTopWidth} onChange={v => updateSeg(idx, { ditchTopWidth: v })} type="number" />
                  <Input label="하폭 (m)" value={seg.ditchBotWidth} onChange={v => updateSeg(idx, { ditchBotWidth: v })} type="number" />
                  <Input label="깊이 (m)" value={seg.ditchDepth} onChange={v => updateSeg(idx, { ditchDepth: v })} type="number" />
                </>
              )}
              {seg.pipeType === 'uditch' && (
                <>
                  <Input label="내폭 (m)" value={seg.uWidth} onChange={v => updateSeg(idx, { uWidth: v })} type="number" />
                  <Input label="높이 (m)" value={seg.uHeight} onChange={v => updateSeg(idx, { uHeight: v })} type="number" />
                </>
              )}
              {seg.pipeType === 'jehyung' && (
                <>
                  <Input label="상폭 (m)" value={seg.jhTopWidth} onChange={v => updateSeg(idx, { jhTopWidth: v })} type="number" />
                  <Input label="하폭 (m)" value={seg.jhBotWidth} onChange={v => updateSeg(idx, { jhBotWidth: v })} type="number" />
                  <Input label="깊이 (m)" value={seg.jhDepth} onChange={v => updateSeg(idx, { jhDepth: v })} type="number" />
                </>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              <Input label="기점 관저고 (m)" value={seg.invertFrom} onChange={v => updateSeg(idx, { invertFrom: v })} type="number" />
              <Input label="종점 관저고 (m)" value={seg.invertTo} onChange={v => updateSeg(idx, { invertTo: v })} type="number" />
              <Input label="관거 연장 (m)" value={seg.commonLength} onChange={v => updateSeg(idx, { commonLength: v })} type="number" />
              <label className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-500">경사 산정</span>
                <select value={seg.slopeMode} onChange={e => updateSeg(idx, { slopeMode: e.target.value as 'auto' | 'manual' })}
                  className="rounded border border-gray-300 px-2 py-1 text-sm bg-white">
                  <option value="auto">자동 (관저고)</option>
                  <option value="manual">직접 입력</option>
                </select>
              </label>
            </div>
            {seg.slopeMode === 'manual' && (
              <div className="mt-2">
                <Input label="경사 I (%)" value={seg.appliedSlope} onChange={v => updateSeg(idx, { appliedSlope: v })} type="number" />
              </div>
            )}
          </details>

          {/* 비고 */}
          <Input label="비고" value={seg.remark} onChange={v => updateSeg(idx, { remark: v })} />
        </div>
      ))}

      {segments.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          구간이 없습니다. &ldquo;+ 구간 추가&rdquo; 버튼을 클릭하세요.
        </div>
      )}
    </div>
  )
}

// Helper components
function Input({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 truncate">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
    </label>
  )
}

function NumInput({ label, value, step = 1, onChange }: {
  label: string; value: number; step?: number; onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 truncate">{label}</span>
      <input type="number" value={value} step={step} onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
    </label>
  )
}
