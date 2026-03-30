'use client'

import { useCallback } from 'react'
import type { WallFormFields, WallType, NumField } from '@/types/wall'
import { getDefaultFormFields } from '@/types/wall'
import { SOIL_PRESETS, REBAR_DIAS } from '@/lib/presets'
import SectionDiagram from './section-diagram'

interface WallFormProps {
  fields: WallFormFields
  onChange: (fields: WallFormFields) => void
}

const WALL_TYPES: WallType[] = ['L형', '역L형', '역T형', '중력식']

export default function WallForm({ fields, onChange }: WallFormProps) {
  const f = fields
  const isGravity = f.wall_type === '중력식'
  const isRevL = f.wall_type === '역L형'

  const set = useCallback(
    (patch: Partial<WallFormFields>) => {
      onChange({ ...f, ...patch })
    },
    [f, onChange],
  )

  const handleWallType = (wt: WallType) => {
    const next = getDefaultFormFields(wt)
    onChange(next)
  }

  // computed display values
  const t_stem = f.stem_top ?? 0
  const H = (f.H_stem ?? 0) + (f.D_slab ?? 0)
  const B = (f.C6_toe ?? 0) + t_stem + (f.batter ?? 0) + (f.batter_back ?? 0) + (f.C8_heel ?? 0)
  const Hs_soil = (f.H_stem ?? 0) - (f.Hs_gap ?? 0)

  return (
    <div className="space-y-1 text-sm">
      {/* 옹벽 형식 */}
      <Section title="옹벽 형식" defaultOpen>
        <div className="flex flex-wrap gap-2">
          {WALL_TYPES.map((wt) => (
            <label key={wt} className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="wall_type"
                checked={f.wall_type === wt}
                onChange={() => handleWallType(wt)}
                className="accent-blue-600"
              />
              <span className={f.wall_type === wt ? 'font-bold text-blue-700' : ''}>{wt}</span>
            </label>
          ))}
        </div>
        {isGravity && (
          <label className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={f.semi_gravity}
              onChange={(e) => set({ semi_gravity: e.target.checked })}
              className="accent-blue-600"
            />
            <span>반중력식 (철근 배근)</span>
          </label>
        )}
      </Section>

      {/* 단면 치수 */}
      <Section title="단면 치수" defaultOpen>
        {/* 표준 단면도 */}
        <SectionDiagram
          wallType={f.wall_type}
          stemTop={f.stem_top}
          hStem={f.H_stem}
          batter={f.batter}
          batterBack={f.batter_back}
          c6Toe={f.C6_toe}
          c8Heel={f.C8_heel}
          dSlab={f.D_slab}
          hsGap={f.Hs_gap}
          gwlHeight={f.gwl_height}
          slopeType={f.slope_type}
          slopeN={f.slope_n}
          slopeBerm={f.slope_berm}
          keyEnabled={f.key_enabled}
          keyDepth={f.key_depth}
          keyWidth={f.key_width}
          keyPos={f.key_pos}
          keyX={f.key_x}
        />

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
          <Num label="t₁ 벽체 상단폭 (m)" value={f.stem_top} step={0.01}
            onChange={(v) => set({ stem_top: v })} />
          <Num label="Hₛ 벽체 높이 (m)" value={f.H_stem} step={0.1}
            onChange={(v) => set({ H_stem: v })} />
          <Num label="C₁ 전면 경사 (m)" value={f.batter} step={0.01}
            onChange={(v) => set({ batter: v })} />
          <Num label="C₃ 배면 경사 (m)" value={f.batter_back} step={0.01}
            onChange={(v) => set({ batter_back: v })} />

          {!isGravity && (
            <>
              <Num label="C₆ Toe 길이 (m)" value={f.C6_toe} step={0.1}
                onChange={(v) => set({ C6_toe: v })} />
              {!isRevL && (
                <Num label="C₈ Heel 길이 (m)" value={f.C8_heel} step={0.1}
                  onChange={(v) => set({ C8_heel: v })} />
              )}
              <Num label="D 저판 두께 (m)" value={f.D_slab} step={0.05}
                onChange={(v) => set({ D_slab: v })} />
              <Num label="D' 저판 끝 두께 (m)" value={f.D_slab_end} step={0.05}
                onChange={(v) => set({ D_slab_end: v })} />
              <Num label="접합부 높이 (m)" value={f.conn_h} step={0.05}
                onChange={(v) => set({ conn_h: v })} />
            </>
          )}

          <Num label="여유고 (m)" value={f.Hs_gap} step={0.05}
            onChange={(v) => set({ Hs_gap: v })} />
        </div>

        <div className="mt-2 rounded bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs text-blue-800 space-y-0.5">
          <div><strong>H</strong>(총높이) = {H.toFixed(3)} m &nbsp;|&nbsp; <strong>B</strong>(총폭) = {B.toFixed(3)} m</div>
          <div><strong>t₁</strong>(상단) = {t_stem.toFixed(3)} m &nbsp;|&nbsp; <strong>Hs</strong>(뒤채움) = {Hs_soil.toFixed(3)} m</div>
        </div>
      </Section>

      {/* 지반 조건 */}
      <Section title="지반 조건" defaultOpen>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <label className="flex flex-col gap-0.5 col-span-2">
            <span className="text-xs text-gray-500">지반 프리셋</span>
            <select onChange={e => {
              const p = SOIL_PRESETS[parseInt(e.target.value)]
              if (p && p.gamma_t > 0) set({ gamma_t: p.gamma_t, phi_deg: p.phi_deg, c_soil: p.c_soil, gamma_sat: p.gamma_sat })
            }} className="w-full rounded border border-gray-300 px-2 py-1 text-sm bg-white" defaultValue="0">
              {SOIL_PRESETS.map((p, i) => <option key={i} value={i}>{p.label}{p.desc ? ` (${p.desc})` : ''}</option>)}
            </select>
          </label>
          <Num label="단위중량 gamma_t (kN/m3)" value={f.gamma_t} step={0.5}
            onChange={(v) => set({ gamma_t: v })} />
          <Num label="내부마찰각 phi (deg)" value={f.phi_deg} step={1}
            onChange={(v) => set({ phi_deg: v })} />
          <Num label="점착력 c (kPa)" value={f.c_soil} step={1}
            onChange={(v) => set({ c_soil: v })} />
          <Num label="토피고 Df (m)" value={f.Df} step={0.1}
            onChange={(v) => set({ Df: v })} />

          {/* 배면 비탈면 */}
          <label className="flex flex-col gap-0.5 col-span-2 mt-1">
            <span className="text-xs text-gray-500">배면 비탈면</span>
            <select value={f.slope_type} onChange={e => {
              const v = e.target.value as 'flat' | 'berm'
              set({ slope_type: v, alpha_deg: v === 'flat' ? 0 : null })
            }} className="w-full rounded border border-gray-300 px-2 py-1 text-sm bg-white">
              <option value="flat">수평 (비탈면 없음)</option>
              <option value="berm">소단 + 구배 (1:n)</option>
            </select>
          </label>
          {f.slope_type === 'berm' && (
            <>
              <Num label="소단 폭 (m)" value={f.slope_berm} step={0.5}
                onChange={(v) => set({ slope_berm: v })} />
              <Num label="구배 1:n (n값)" value={f.slope_n} step={0.1}
                onChange={(v) => set({ slope_n: v })} />
              <p className="col-span-2 text-xs text-blue-600">
                α = {f.slope_n && f.slope_n > 0 ? (Math.atan(1 / f.slope_n) * 180 / Math.PI).toFixed(1) : '0'}° (1:{f.slope_n ?? '?'} → atan(1/{f.slope_n ?? '?'}))
              </p>
            </>
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
          <Num label="내진계수 Kh" value={f.Kh} step={0.001} onChange={v => set({ Kh: v })} />
          {(!isGravity || f.semi_gravity) && (
            <>
              <Num label="벽체 피복 (mm)" value={f.Dc_wall} step={10} onChange={v => set({ Dc_wall: v })} />
              <Num label="저판 피복 (mm)" value={f.Dc_slab} step={10} onChange={v => set({ Dc_slab: v })} />
            </>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">KDS 기준 기본값이 적용됩니다. 필요 시 수정 가능</p>
      </Section>

      {/* 철근 배근 */}
      {(!isGravity || f.semi_gravity) && (
        <Section title="철근 배근">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <p className="col-span-2 text-xs font-semibold text-gray-600">B-B 저판 Heel (상부)</p>
            <RebarSelect label="직경" value={f.rebar1_dia} onChange={v => set({ rebar1_dia: v })} />
            <Num label="간격 (mm)" value={f.rebar1_spacing} step={25} onChange={v => set({ rebar1_spacing: v })} />

            <p className="col-span-2 text-xs font-semibold text-gray-600 mt-1">C-C 벽체 배면 (인장측)</p>
            <RebarSelect label="직경" value={f.rebar2_dia} onChange={v => set({ rebar2_dia: v })} />
            <Num label="간격 (mm)" value={f.rebar2_spacing} step={25} onChange={v => set({ rebar2_spacing: v })} />

            <p className="col-span-2 text-xs font-semibold text-gray-600 mt-1">D-D 벽체 상부</p>
            <RebarSelect label="직경" value={f.rebar3_dia ?? 16} onChange={v => set({ rebar3_dia: v })} />
            <Num label="간격 (mm)" value={f.rebar3_spacing} step={25} onChange={v => set({ rebar3_spacing: v })} />

            <p className="col-span-2 text-xs font-semibold text-gray-600 mt-1">A-A 저판 Toe (하부)</p>
            <RebarSelect label="직경" value={f.rebar_toe_dia ?? 16} onChange={v => set({ rebar_toe_dia: v })} />
            <Num label="간격 (mm)" value={f.rebar_toe_spacing} step={25} onChange={v => set({ rebar_toe_spacing: v })} />
          </div>
        </Section>
      )}

      {/* 지하수위 */}
      <Section title="지하수위">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <Num label="지하수위 높이 (m)" value={f.gwl_height} step={0.1}
            onChange={(v) => set({ gwl_height: v })} />
          <Num label="포화단위중량 (kN/m3)" value={f.gamma_sat} step={0.5}
            onChange={(v) => set({ gamma_sat: v })} />
        </div>
        <p className="text-xs text-gray-400 mt-1">입력 시 단면도에 수위 바 표시</p>
      </Section>

      {/* 지지력 */}
      <Section title="지지력 옵션">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <Num label="고정 허용지지력 qa (kN/m2)" value={f.qa_fixed} step={10}
            onChange={(v) => set({ qa_fixed: v })} />
          <Num label="지진시 지지력 qae (kN/m2)" value={f.qae_fixed} step={10}
            onChange={(v) => set({ qae_fixed: v })} />
        </div>
        <p className="text-xs text-gray-400 mt-1">0이면 Terzaghi 공식 자동 계산</p>
      </Section>

      {/* 활동방지키 */}
      {!isGravity && (
        <Section title="활동방지키 (Key)">
          <label className="flex items-center gap-2 mb-2">
            <input type="checkbox" checked={f.key_enabled}
              onChange={e => set({ key_enabled: e.target.checked })}
              className="accent-blue-600" />
            <span className="text-sm">활동방지키 적용</span>
          </label>
          {f.key_enabled && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <Num label="키 깊이 (m)" value={f.key_depth} step={0.05}
                onChange={v => set({ key_depth: v })} />
              <Num label="키 폭 (m)" value={f.key_width} step={0.05}
                onChange={v => set({ key_width: v })} />
              <label className="flex flex-col gap-0.5 col-span-2">
                <span className="text-xs text-gray-500">키 위치</span>
                <select value={f.key_pos} onChange={e => set({ key_pos: e.target.value as any })}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm bg-white">
                  <option value="toe">Toe (전면)</option>
                  <option value="wall">벽체 하부</option>
                  <option value="heel">Heel (배면)</option>
                  <option value="custom">직접 입력</option>
                </select>
              </label>
              {f.key_pos === 'custom' && (
                <Num label="저판 좌단에서 거리 (m)" value={f.key_x} step={0.05}
                  onChange={v => set({ key_x: v })} />
              )}
            </div>
          )}
          <label className="flex items-center gap-2 mt-2">
            <input type="checkbox" checked={f.passive_enabled}
              onChange={e => set({ passive_enabled: e.target.checked })}
              className="accent-blue-600" />
            <span className="text-sm">수동토압 적용</span>
          </label>
          {f.passive_enabled && (
            <div className="mt-1">
              <Num label="수동토압 적용비율 (%)" value={f.passive_ratio} step={10}
                onChange={v => set({ passive_ratio: v })} />
            </div>
          )}
        </Section>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <details open={defaultOpen || undefined} className="group border border-gray-200 rounded-lg">
      <summary className="cursor-pointer select-none px-3 py-2 bg-gray-100 rounded-t-lg font-semibold text-gray-700 text-sm hover:bg-gray-200">
        {title}
      </summary>
      <div className="px-3 py-2">{children}</div>
    </details>
  )
}

function Num({
  label,
  value,
  step = 1,
  onChange,
}: {
  label: string
  value: NumField
  step?: number
  onChange: (v: NumField) => void
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 truncate">{label}</span>
      <input
        type="number"
        value={value ?? ''}
        step={step}
        onChange={(e) => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
      />
    </label>
  )
}

function RebarSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 truncate">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
      >
        {REBAR_DIAS.map((d) => (
          <option key={d} value={d}>D{d}</option>
        ))}
      </select>
    </label>
  )
}
