'use client'
import type { ChannelFormFields, NumField } from '@/types/channel'
import { SOIL_PRESETS, REBAR_DIAS } from '@/lib/presets'

interface Props {
  fields: ChannelFormFields
  onChange: (fields: ChannelFormFields) => void
}

export default function ChannelForm({ fields, onChange }: Props) {
  const f = fields
  const set = (patch: Partial<ChannelFormFields>) => onChange({ ...f, ...patch })

  return (
    <div className="space-y-1 text-sm">
      {/* 좌측 벽체 */}
      <Section title="좌측 벽체" defaultOpen>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <Num label="H_left 높이 (m)" value={f.H_left} step={0.1} onChange={v => set({ H_left: v })} />
          <Num label="tw_top 상단두께 (m)" value={f.tw_top_left} step={0.05} onChange={v => set({ tw_top_left: v })} />
          <Num label="tw_bot 하단두께 (m)" value={f.tw_bot_left} step={0.05} onChange={v => set({ tw_bot_left: v })} />
        </div>
      </Section>

      {/* 우측 벽체 */}
      <Section title="우측 벽체" defaultOpen>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <Num label="H_right 높이 (m)" value={f.H_right} step={0.1} onChange={v => set({ H_right: v })} />
          <Num label="tw_top 상단두께 (m)" value={f.tw_top_right} step={0.05} onChange={v => set({ tw_top_right: v })} />
          <Num label="tw_bot 하단두께 (m)" value={f.tw_bot_right} step={0.05} onChange={v => set({ tw_bot_right: v })} />
        </div>
      </Section>

      {/* 저판 */}
      <Section title="저판">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <Num label="B 내폭 (m)" value={f.B} step={0.1} onChange={v => set({ B: v })} />
          <Num label="ts 저판 두께 (m)" value={f.ts} step={0.05} onChange={v => set({ ts: v })} />
          <Num label="헌치 크기 (m)" value={f.haunch} step={0.05} onChange={v => set({ haunch: v })} />
        </div>
      </Section>

      {/* 토피 / 지반 */}
      <Section title="토피 / 지반" defaultOpen>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <label className="flex flex-col gap-0.5 col-span-2">
            <span className="text-xs text-gray-500">지반 프리셋</span>
            <select onChange={e => {
              const p = SOIL_PRESETS[parseInt(e.target.value)]
              if (p && p.gamma_t > 0) set({ gamma_t: p.gamma_t, phi_deg: p.phi_deg, c_soil: p.c_soil })
            }} className="w-full rounded border border-gray-300 px-2 py-1 text-sm bg-white" defaultValue="0">
              {SOIL_PRESETS.map((p, i) => <option key={i} value={i}>{p.label}{p.desc ? ` (${p.desc})` : ''}</option>)}
            </select>
          </label>
          <Num label="토피고 Df (m)" value={f.Df} step={0.1} onChange={v => set({ Df: v })} />
          <Num label="단위중량 γt (kN/m³)" value={f.gamma_t} step={0.5} onChange={v => set({ gamma_t: v })} />
          <Num label="내부마찰각 φ (°)" value={f.phi_deg} step={1} onChange={v => set({ phi_deg: v })} />
          <Num label="점착력 c (kPa)" value={f.c_soil} step={1} onChange={v => set({ c_soil: v })} />
          <label className="flex flex-col gap-0.5 col-span-2">
            <span className="text-xs text-gray-500">토압계수 산정</span>
            <select value={f.K0_mode} onChange={e => set({ K0_mode: e.target.value as 'rankine' | 'manual' })}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm bg-white">
              <option value="rankine">Rankine (Ka)</option>
              <option value="manual">직접 입력</option>
            </select>
          </label>
          {f.K0_mode === 'manual' && (
            <Num label="토압계수 K" value={f.K0_manual} step={0.01} onChange={v => set({ K0_manual: v })} />
          )}
        </div>
      </Section>

      {/* 지지력 옵션 */}
      <Section title="지지력 옵션">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <Num label="φ₂ 기초지반 (°)" value={f.phi2_deg} step={1} onChange={v => set({ phi2_deg: v })} />
          <Num label="γ_found (kN/m³)" value={f.gamma_found} step={0.5} onChange={v => set({ gamma_found: v })} />
          <div className="col-span-2">
            <Num label="qa 고정값 (kN/m²)" value={f.qa_fixed} step={10} onChange={v => set({ qa_fixed: v })} />
            <span className="text-xs text-gray-400">0이면 Terzaghi 자동</span>
          </div>
        </div>
      </Section>

      {/* 수압 */}
      <Section title="수압">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <Num label="내수위 (m)" value={f.hw_in} step={0.1} onChange={v => set({ hw_in: v })} />
          <Num label="외수위 (m)" value={f.hw_out} step={0.1} onChange={v => set({ hw_out: v })} />
        </div>
      </Section>

      {/* 하중 */}
      <Section title="하중">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <label className="flex flex-col gap-0.5 col-span-2">
            <span className="text-xs text-gray-500">활하중</span>
            <select value={f.live_load} onChange={e => set({ live_load: e.target.value as any })}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm bg-white">
              <option value="none">없음</option>
              <option value="DB24">DB-24 (1등교)</option>
              <option value="DB18">DB-18 (2등교)</option>
              <option value="manual">직접 입력</option>
            </select>
          </label>
          {f.live_load === 'manual' && (
            <Num label="등분포 활하중 (kN/m²)" value={f.live_load_manual} step={1} onChange={v => set({ live_load_manual: v })} />
          )}
        </div>
      </Section>

      {/* 설계조건 */}
      <Section title="설계조건">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <Num label="fck (MPa)" value={f.fck} step={3} onChange={v => set({ fck: v })} />
          <Num label="fy (MPa)" value={f.fy} step={100} onChange={v => set({ fy: v })} />
          <Num label="콘크리트 γc (kN/m³)" value={f.gamma_c} step={0.5} onChange={v => set({ gamma_c: v })} />
          <Num label="상재하중 q (kN/m²)" value={f.q} step={1} onChange={v => set({ q: v })} />
          <Num label="벽체 피복 (mm)" value={f.Dc_wall} step={10} onChange={v => set({ Dc_wall: v })} />
          <Num label="저판 피복 (mm)" value={f.Dc_slab} step={10} onChange={v => set({ Dc_slab: v })} />
        </div>
        <p className="text-xs text-gray-400 mt-1">KDS 기준 기본값이 적용됩니다. 필요 시 수정 가능</p>
      </Section>

      {/* 철근 배근 (자동) */}
      <Section title="철근 배근 (자동)">
        <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded px-3 py-2">
          철근 배근은 설계기준에 따라 자동 선정됩니다
        </div>
      </Section>
    </div>
  )
}

/* Sub-components */
function Section({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <details open={defaultOpen || undefined} className="group border border-gray-200 rounded-lg">
      <summary className="cursor-pointer select-none px-3 py-2 bg-gray-100 rounded-t-lg font-semibold text-gray-700 text-sm hover:bg-gray-200">{title}</summary>
      <div className="px-3 py-2">{children}</div>
    </details>
  )
}

function Num({ label, value, step = 1, onChange }: { label: string; value: NumField; step?: number; onChange: (v: NumField) => void }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 truncate">{label}</span>
      <input type="number" value={value ?? ''} step={step}
        onChange={e => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
    </label>
  )
}

function RebarSelect({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 truncate">{label}</span>
      <select value={value} onChange={e => onChange(parseInt(e.target.value))}
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm bg-white">
        {REBAR_DIAS.map(d => <option key={d} value={d}>D{d}</option>)}
      </select>
    </label>
  )
}
