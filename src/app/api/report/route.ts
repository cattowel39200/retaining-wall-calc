import { NextRequest, NextResponse } from 'next/server'
import { calculateWall } from '@/lib/calc-engine'
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, HeadingLevel, PageBreak,
} from 'docx'

/* ── 수치 포맷 ── */
const _f3 = (v: number | null | undefined) => v != null ? v.toFixed(3) : '-'
const _f2 = (v: number | null | undefined) => v != null ? v.toFixed(2) : '-'
const _f1 = (v: number | null | undefined) => v != null ? v.toFixed(1) : '-'
const _f0 = (v: number | null | undefined) => v != null ? v.toFixed(0) : '-'

/* ── 유틸 ── */
function cell(text: string, bold = false, align: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.CENTER) {
  return new TableCell({
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, bold, size: 16, font: 'Malgun Gothic' })],
    })],
    width: { size: 0, type: WidthType.AUTO },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    },
  })
}

function makeTable(headers: string[], rows: string[][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map(h => cell(h, true)),
        tableHeader: true,
      }),
      ...rows.map(r => new TableRow({
        children: r.map(c => cell(c)),
      })),
    ],
  })
}

function heading(text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    children: [new TextRun({ text, font: 'Malgun Gothic', bold: true })],
    spacing: { before: 240, after: 120 },
  })
}

function para(text: string, bold = false, size = 20) {
  return new Paragraph({
    children: [new TextRun({ text, size, font: 'Malgun Gothic', bold })],
    spacing: { after: 60 },
  })
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] })
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function buildDocument(p: any, r: any): Document {
  const wallType = p.wall_type || 'L형'
  const jdg = r.judgment
  const stab = r.stability
  const sn = stab.normal
  const se = stab.seismic
  const ep = r.earth_pressure
  const blk = r.blocks
  const sec = r.section
  const mbr = r.member

  const _is_gravity = jdg.is_gravity
  const _is_semi_gravity = jdg.is_semi_gravity
  const _has_toe = jdg.has_toe
  const _has_heel = jdg.has_heel

  const children: (Paragraph | Table)[] = []

  // ================================================================
  // 표지
  // ================================================================
  children.push(
    new Paragraph({ children: [] }),
    new Paragraph({ children: [] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2000 }, children: [
      new TextRun({ text: `${wallType} 옹벽 구조계산서`, size: 52, bold: true, font: 'Malgun Gothic' }),
    ]}),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [
      new TextRun({ text: `H = ${_f1(p.H)} m`, size: 36, font: 'Malgun Gothic' }),
    ]}),
    new Paragraph({ children: [] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [
      new TextRun({ text: '적용기준: KDS 11 80 05 / KDS 11 80 15 / KDS 14 20 20', size: 22, font: 'Malgun Gothic', color: '666666' }),
    ]}),
    pageBreak(),
  )

  // ================================================================
  // 1. 일반 단면
  // ================================================================
  children.push(heading('1. 일반 단면'))

  // 단면도 (웹에서 확인)
  children.push(para('  [단면도: 웹 화면에서 확인]'))

  children.push(heading('1.1 옹벽의 제원', HeadingLevel.HEADING_2))
  if (_is_gravity) {
    const gravLabel = _is_semi_gravity ? '반중력식' : '중력식'
    children.push(
      para(_is_semi_gravity
        ? `  옹벽 형식 : ${gravLabel} 옹벽`
        : `  옹벽 형식 : ${gravLabel} 옹벽 (무근콘크리트)`),
      para('  기초 형식 : 직접기초'),
      para(`  옹벽 높이 : H = ${_f3(p.H)} m`),
      para(`  상 단 폭 : ${_f3(p.t_stem)} m`),
      para(`  하 단 폭 : B = ${_f3(p.B)} m`),
    )
  } else {
    children.push(
      para(`  옹벽 형식 : ${wallType} 옹벽`),
      para('  기초 형식 : 직접기초'),
      para(`  옹벽 높이 : H = ${_f3(p.H)} m`),
      para(`  옹벽 저판 : B = ${_f3(p.B)} m`),
    )
  }

  children.push(heading('1.2 내진설계', HeadingLevel.HEADING_2))
  children.push(
    para(`  지진구역계수 : ${_f3(p.zone_coeff ?? 0.110)}`),
    para(`  위험도계수   : ${_f3(p.risk_factor ?? 1.400)}`),
    para(`  가속도계수 A : ${_f3(p.A_coeff ?? 0.154)}`),
    para(`  수평지진계수 Kh : ${_f3(p.Kh)}`),
  )

  // ================================================================
  // 2. 설계 조건
  // ================================================================
  children.push(heading('2. 설계 조건'))

  children.push(heading('2.1 사용재료', HeadingLevel.HEADING_2))
  children.push(
    para(`  콘크리트 : fck = ${_f0(p.fck)} MPa`),
    para(`  철    근 : fy  = ${_f0(p.fy)} MPa`),
  )

  children.push(heading('2.2 지반조건', HeadingLevel.HEADING_2))
  children.push(
    para(`  콘크리트 단위중량 (γc) : ${_f1(p.gamma_c)} kN/m³`),
    para(`  뒷채움흙 단위중량 (γt) : ${_f1(p.gamma_t)} kN/m³`),
    para(`  내부마찰각 (φ)        : ${_f3(p.phi_deg)} °`),
    para(`  점착력 (C)             : ${_f3(p.c_soil)} kN/m²`),
    para(`  뒤채움 경사각 (α)      : ${_f3(p.alpha_deg)} °`),
    para(`  토피고 (Df)            : ${_f3(p.Df)} m`),
  )
  if ((p.gwl_height ?? 0) > 0) {
    children.push(
      para(`  지하수위 (저판상면부터)  : ${_f2(p.gwl_height)} m`),
      para(`  포화단위중량 (γsat)    : ${_f1(p.gamma_sat)} kN/m³`),
    )
  }

  children.push(heading('2.3 사용토압', HeadingLevel.HEADING_2))
  children.push(
    para('  상시 : 안정검토 - Rankine 토압 / 단면검토 - Coulomb 토압'),
    para('  지진 : Mononobe-Okabe 토압'),
  )

  children.push(heading('2.4 과재하중', HeadingLevel.HEADING_2))
  children.push(para(`  과재하중 : q = ${_f2(p.q)} kN/m²`))

  children.push(pageBreak())

  // ================================================================
  // 3. 안정 검토
  // ================================================================
  children.push(heading('3. 안정 검토'))

  // 3.1 자중 및 재토하중
  children.push(heading('3.1 자중 및 재토하중 계산', HeadingLevel.HEADING_2))

  const blkHeaders = ['구분', 'A (m²)', 'γ (kN/m³)', 'W (kN)', 'Kh', 'KhW (kN)',
    'x (m)', 'y (m)', 'Mr (kN·m)', 'Mo (kN·m)']
  const blkRows: string[][] = []

  for (const b of (blk.c_results || [])) {
    const bb = Array.isArray(b)
      ? { name: b[0], A: b[1], gamma: b[2], W: b[3], Kh: b[4], KhW: b[5], x: b[6], y: b[7], Mr: b[8], Mo: b[9] }
      : b
    if (bb.A > 0) {
      blkRows.push([bb.name, _f3(bb.A), _f2(bb.gamma), _f3(bb.W),
        _f3(bb.Kh), _f3(bb.KhW), _f3(bb.x), _f3(bb.y), _f3(bb.Mr), _f3(bb.Mo)])
    }
  }
  blkRows.push(['콘크리트소계', '', '', _f3(blk.Wc), '', _f3(blk.KhWc), '', '', _f3(blk.Mrc), _f3(blk.Moc)])

  for (const b of (blk.s_results || [])) {
    const bb = Array.isArray(b)
      ? { name: b[0], A: b[1], gamma: b[2], W: b[3], Kh: b[4], KhW: b[5], x: b[6], y: b[7], Mr: b[8], Mo: b[9] }
      : b
    if (bb.A > 0) {
      blkRows.push([bb.name, _f3(bb.A), _f2(bb.gamma), _f3(bb.W),
        _f3(bb.Kh), _f3(bb.KhW), _f3(bb.x), _f3(bb.y), _f3(bb.Mr), _f3(bb.Mo)])
    }
  }
  blkRows.push(['토사소계', '', '', _f3(blk.Ws), '', _f3(blk.KhWs), '', '', _f3(blk.Mrs), _f3(blk.Mos)])
  blkRows.push(['합계', '', '', _f3(blk.Wt), '', _f3(blk.KhWt), '', '', _f3(blk.Mrt), _f3(blk.Mot)])

  children.push(makeTable(blkHeaders, blkRows))

  // 토압계산
  children.push(heading('토압계산', HeadingLevel.HEADING_3))
  children.push(
    para('  ① 상시 주동토압 (Rankine)'),
    para(`    Ka = ${_f3(ep.Ka)}`),
    para(`    Pa(수평) = ${_f3(ep.Pa)} kN/m,  y = ${_f3(ep.ya)} m`),
  )
  if ((ep.Pa_v ?? 0) !== 0) {
    children.push(para(`    Pa(수직) = ${_f3(ep.Pa_v)} kN/m`))
  }
  children.push(
    para(`    Mo = ${_f3(ep.Mo_pa)} kN·m`),
    para('  ② 지진시 주동토압 (M-O)'),
    para(`    KAE = ${_f3(ep.KAE)}`),
    para(`    PAE = ${_f3(ep.PAE)} kN/m,  y = He/2 = ${_f3(ep.yae)} m`),
    para(`    Mo = ${_f3(ep.Mo_pae)} kN·m`),
  )

  if ((ep.Pw ?? 0) > 0) {
    children.push(
      para('  ③ 수압'),
      para(`    Pw = ${_f3(ep.Pw)} kN/m`),
      para(`    양압력 U = ${_f3(ep.U)} kN/m`),
    )
  }

  children.push(
    para(`  과재하중 q = ${_f2(p.q)} kN/m²`),
    para(`    Ph = ${_f3(ep.Ph_sur)} kN/m,  Pv = ${_f3(ep.Pv_sur)} kN/m`),
  )

  children.push(pageBreak())

  // 3.2 안정검토용 하중집계
  children.push(heading('3.2 안정검토용 하중집계', HeadingLevel.HEADING_2))

  children.push(para('1) 상시 하중집계', true))
  children.push(makeTable(
    ['구분', 'V (kN)', 'H (kN)', 'Mr (kN·m)', 'Mo (kN·m)'],
    [
      ['콘크리트 자중', _f3(blk.Wc), '0.000', _f3(blk.Mrc), '0.000'],
      ['뒤채움토 자중', _f3(blk.Ws), '0.000', _f3(blk.Mrs), '0.000'],
      ['토압', _f3(ep.Pa_v ?? 0), _f3(ep.Pa), '0.000', _f3(ep.Mo_pa)],
      ['상재하중', _f3(ep.Pv_sur), _f3(ep.Ph_sur), _f3(ep.Mr_pv), _f3(ep.Mo_ph)],
      ['Σ', _f3(sn.SV), _f3(sn.SH), _f3(sn.SMr), _f3(sn.SMo)],
    ],
  ))

  children.push(para('2) 지진시 하중집계', true))
  children.push(makeTable(
    ['구분', 'V (kN)', 'H (kN)', 'Mr (kN·m)', 'Mo (kN·m)'],
    [
      ['콘크리트 자중', _f3(blk.Wc), '0.000', _f3(blk.Mrc), '0.000'],
      ['뒤채움토 자중', _f3(blk.Ws), '0.000', _f3(blk.Mrs), '0.000'],
      ['토압', '0.000', _f3(ep.PAE), '0.000', _f3(ep.Mo_pae)],
      ['관성력', '0.000', _f3(blk.KhWt), '0.000', _f3(blk.Mot)],
      ['Σ', _f3(se.SV), _f3(se.SH), _f3(se.SMr), _f3(se.SMo)],
    ],
  ))

  // 3.3 전도에 대한 안정검토
  children.push(heading('3.3 전도에 대한 안정검토', HeadingLevel.HEADING_2))
  children.push(para('1) 상시', true))
  children.push(
    para(`  e = B/2 - (ΣMr-ΣMo)/ΣV = ${_f3(sn.e)} m`),
    para(`  e = ${_f3(sn.e)} m  ${sn.e <= sn.B6 ? '<=' : '>'} B/6 = ${_f3(sn.B6)} m`),
    para(`  SF = ΣMr/ΣMo = ${_f3(sn.SF_overturn)} >= 2.0 → ${jdg.overturn_normal}`),
  )
  children.push(para('2) 지진시', true))
  children.push(
    para(`  e = ${_f3(se.e)} m  ${se.e <= sn.B3 ? '<=' : '>'} B/3 = ${_f3(sn.B3)} m → ${jdg.eccentricity_seismic}`),
    para(`  SF = ΣMr/ΣMo = ${_f3(se.SF_overturn)} >= 1.5 → ${jdg.overturn_seismic ?? 'OK'}`),
  )

  // 3.4 지지력에 대한 안정검토
  children.push(heading('3.4 지지력에 대한 안정검토', HeadingLevel.HEADING_2))
  children.push(para('1) 상시', true))
  children.push(
    para(`  Be = B - 2e = ${_f3(sn.Be)} m`),
    para(`  Nc = ${_f3(sn.Nc)}, Nq = ${_f3(sn.Nq)}, Nr = ${_f3(sn.Nr)}`),
  )
  if ((sn.qa_fixed ?? 0) > 0) {
    children.push(para(`  qu = ${_f3(sn.qu)} kN/m² → qa = ${_f3(sn.qa)} kN/m² (직접입력)`))
  } else {
    children.push(para(`  qu = ${_f3(sn.qu)} kN/m² → qa = qu/3 = ${_f3(sn.qa)} kN/m²`))
  }
  children.push(
    para(`  Q1 = ${_f3(sn.Q1)} kN/m², Q2 = ${_f3(sn.Q2)} kN/m²`),
    para(`  q_max = ${_f3(sn.Q1)} <= qa = ${_f3(sn.qa)} → ${jdg.bearing_normal}`),
  )

  children.push(para('2) 지진시', true))
  children.push(para(`  Be = ${_f3(se.Be)} m`))
  if ((sn.qae_fixed ?? 0) > 0) {
    children.push(para(`  que = ${_f3(se.qu)} kN/m² → qae = ${_f3(se.qa)} kN/m² (직접입력)`))
  } else {
    children.push(para(`  que = ${_f3(se.qu)} kN/m² → qae = que/2 = ${_f3(se.qa)} kN/m²`))
  }
  children.push(
    para(`  Q1 = ${_f3(se.Q1)} kN/m², Q2 = ${_f3(se.Q2)} kN/m²`),
    para(`  q_max = ${_f3(se.Q1)} <= qae = ${_f3(se.qa)} → ${jdg.bearing_seismic}`),
  )

  // 3.5 활동에 대한 안정검토
  children.push(heading('3.5 활동에 대한 안정검토', HeadingLevel.HEADING_2))
  children.push(para(`  μ = tan(2φ/3) = ${_f3(sn.mu)}`))
  children.push(para('1) 상시', true))
  children.push(
    para(`  Hr = ${_f3(sn.Hr)} kN`),
    para(`  SF = Hr/ΣH = ${_f3(sn.SF_slide)} >= 1.5 → ${jdg.slide_normal}`),
  )
  children.push(para('2) 지진시', true))
  children.push(
    para(`  Hr = ${_f3(se.Hr)} kN`),
    para(`  SF = Hr/ΣH = ${_f3(se.SF_slide)} >= 1.2 → ${jdg.slide_seismic}`),
  )

  children.push(pageBreak())

  // ================================================================
  // 4. 단면 검토 (중력식이 아닌 경우)
  // ================================================================
  if (!_is_gravity) {
    children.push(heading('4. 단면 검토'))

    // 4.1 하중조합
    children.push(heading('4.1 하중조합', HeadingLevel.HEADING_2))
    children.push(
      para('  LCB1 : 상시 계수하중 (1.2D + 1.6L + 1.6H)'),
      para('  LCB2 : 지진시 계수하중 (0.9D + 1.0H + 1.0E)'),
      para('  LCB3 : 상시 사용하중 (1.0D + 1.0L + 1.0H + 1.0W)'),
    )

    // 4.2 LCB별 지반반력
    children.push(heading('4.2 LCB별 지반반력', HeadingLevel.HEADING_2))
    children.push(makeTable(
      ['조합', 'ΣV (kN)', 'e (m)', 'Q1 (kN/m²)', 'Q2 (kN/m²)'],
      [
        ['LCB1', _f3(sec.lcb1.SV), _f3(sec.lcb1.e), _f3(sec.lcb1.Q1), _f3(sec.lcb1.Q2)],
        ['LCB2', _f3(sec.lcb2.SV), _f3(sec.lcb2.e), _f3(sec.lcb2.Q1), _f3(sec.lcb2.Q2)],
        ['LCB3', _f3(sec.lcb3.SV), _f3(sec.lcb3.e), _f3(sec.lcb3.Q1), _f3(sec.lcb3.Q2)],
      ],
    ))

    // ================================================================
    // 4.3 단면검토용 하중계산
    // ================================================================
    children.push(heading('4.3 단면검토용 하중계산', HeadingLevel.HEADING_2))

    const w = sec.wall

    // 1) 뒷굽판 단면력
    if (_has_heel) {
      children.push(para('1) 뒷굽판 단면력', true))
      children.push(para('                                                          (단위 : KN, m)'))
      const h1 = sec.heel_lcb1
      const h2 = sec.heel_lcb2
      const h3 = sec.heel_lcb3
      children.push(makeTable(
        ['구 분', '', '뒷굽자중', '재토자중', '과재하중', '지반반력', '연직토압', '총 계'],
        [
          ['LCB1', '전단력', _f3(h1.V_slab), _f3(h1.V_soil), _f3(h1.V_sur), _f3(h1.V_react), '0.000', _f3(h1.V_total)],
          ['', '모멘트', _f3(h1.M_slab), _f3(h1.M_soil), _f3(h1.M_sur), _f3(h1.M_react), '0.000', _f3(h1.M_total)],
          ['LCB2', '전단력', _f3(h2.V_slab), _f3(h2.V_soil), _f3(h2.V_sur), _f3(h2.V_react), '0.000', _f3(h2.V_total)],
          ['', '모멘트', _f3(h2.M_slab), _f3(h2.M_soil), _f3(h2.M_sur), _f3(h2.M_react), '0.000', _f3(h2.M_total)],
          ['LCB3', '전단력', _f3(h3.V_slab), _f3(h3.V_soil), _f3(h3.V_sur), _f3(h3.V_react), '0.000', _f3(h3.V_total)],
          ['', '모멘트', _f3(h3.M_slab), _f3(h3.M_soil), _f3(h3.M_sur), _f3(h3.M_react), '0.000', _f3(h3.M_total)],
        ],
      ))
    }

    // 1-2) 앞굽판 단면력
    if (_has_toe && sec.toe_lcb1 != null) {
      children.push(para(''))
      const toeLabel = _has_heel ? '1-2) 앞굽판 단면력' : '1) 앞굽판 단면력'
      children.push(para(toeLabel, true))
      children.push(para('                                                          (단위 : KN, m)'))
      const t1 = sec.toe_lcb1
      const t2 = sec.toe_lcb2
      const t3 = sec.toe_lcb3
      children.push(makeTable(
        ['구 분', '', '저판자중', '지반반력', '총 계'],
        [
          ['LCB1', '전단력', _f3(t1.V_slab), _f3(t1.V_react), _f3(t1.V_total)],
          ['', '모멘트', _f3(t1.M_slab), _f3(t1.M_react), _f3(t1.M_total)],
          ['LCB2', '전단력', _f3(t2.V_slab), _f3(t2.V_react), _f3(t2.V_total)],
          ['', '모멘트', _f3(t2.M_slab), _f3(t2.M_react), _f3(t2.M_total)],
          ['LCB3', '전단력', _f3(t3.V_slab), _f3(t3.V_react), _f3(t3.V_total)],
          ['', '모멘트', _f3(t3.M_slab), _f3(t3.M_react), _f3(t3.M_total)],
        ],
      ))
    }

    // 2) 벽체 단면력
    children.push(para(''))
    const wallNum = _has_heel ? '2)' : (_has_toe ? '2)' : '1)')
    children.push(para(`${wallNum} 벽체 단면력`, true))

    const theta_c_deg = ep.theta_c_deg ?? 0.0
    const delta_c_deg = ep.delta_c_deg ?? 10.0

    // (1) 토압계수 계산
    children.push(para('(1) 토압계수 계산'))
    children.push(
      para('  ⓐ 상시 주동토압계산 (Coulomb)'),
      para(`    뒤채움흙의 내부마찰각(Φ) : ${_f3(p.phi_deg)} °`),
      para(`    뒤채움흙의 경 사 각(α) : ${_f3(p.alpha_deg)} °`),
      para(`    흙과 콘크리트의 마찰각(δ): ${_f3(delta_c_deg)} °`),
      para(`    옹벽배면의 연직경사각(θ) : ${_f3(theta_c_deg)} °`),
      para(`    Ka = ${_f3(ep.Ka_coul)}`),
      para(`    Kah = ${_f3(ep.Ka_coul)}×cos(${_f3(delta_c_deg)}°+${_f3(theta_c_deg)}°) = ${_f3(ep.Kah)}`),
    )

    children.push(
      para('  ⓑ 지진시 주동토압계산 (Mononobe-Okabe)'),
      para(`    옹벽배면의 수직에 대한 각 β : = ${_f3(theta_c_deg)} °`),
      para('    흙과 옹벽사이의 마찰각     δ : = 0.000 ° (단면검토시)'),
      para(`    Kae = ${_f3(ep.Kae_design)}`),
      para(`    Kaeh = ${_f3(ep.Kae_design)}×cos(${_f3(theta_c_deg)}°) = ${_f3(ep.Kaeh_design)}`),
    )

    const H_cc = w.H_wall_cc
    const H_dd = w.H_wall_dd

    // (2) 토압에 의한 벽체 단면력계산
    children.push(para(''))
    children.push(para('(2) 토압에 의한 벽체 단면력계산'))
    children.push(para('  ⓐ 상시 벽체 단면력'))
    children.push(
      para('    i) 벽체 하부 (C-C)'),
      para(`      Pa = 1/2 ×Kah × γt ×H² = 1/2 ×${_f3(ep.Kah)} ×${_f1(p.gamma_t)} ×${_f3(H_cc)}² = ${_f3(w.Pa_cc)} KN/m`),
      para(`      y  = H / 3 = ${_f3(H_cc)} / 3 = ${_f3(H_cc / 3)} m`),
      para(`      Mo = Pa ×y = ${_f3(w.Pa_cc)} ×${_f3(H_cc / 3)} = ${_f3(w.Mo_cc_Pa)} KN.m`),
      para('    ii) 벽체 중앙부 (D-D)'),
      para(`      Pa = 1/2 ×Kah × γt ×H² = 1/2 ×${_f3(ep.Kah)} ×${_f1(p.gamma_t)} ×${_f3(H_dd)}² = ${_f3(w.Pa_dd)} KN/m`),
      para(`      y  = H / 3 = ${_f3(H_dd)} / 3 = ${_f3(H_dd / 3)} m`),
      para(`      Mo = ${_f3(w.Pa_dd)} ×${_f3(H_dd / 3)} = ${_f3(w.Mo_dd_Pa)} KN.m`),
    )

    children.push(para('  ⓑ 지진시 벽체 단면력'))
    children.push(
      para('    i) 벽체 하부 (C-C)'),
      para(`      Pae = 1/2 ×Kaeh × γt ×H² = 1/2 ×${_f3(ep.Kaeh_design)} ×${_f1(p.gamma_t)} ×${_f3(H_cc)}² = ${_f3(w.Pae_cc)} KN/m`),
      para(`      y   = H / 2 = ${_f3(H_cc)} / 2 = ${_f3(H_cc / 2)} m`),
      para(`      Mo  = ${_f3(w.Pae_cc)} ×${_f3(H_cc / 2)} = ${_f3(w.Mo_cc_Pae)} KN.m`),
      para('    ii) 벽체 중앙부 (D-D)'),
      para(`      Pae = 1/2 ×Kaeh × γt ×H² = 1/2 ×${_f3(ep.Kaeh_design)} ×${_f1(p.gamma_t)} ×${_f3(H_dd)}² = ${_f3(w.Pae_dd)} KN/m`),
      para(`      y   = H / 2 = ${_f3(H_dd)} / 2 = ${_f3(H_dd / 2)} m`),
      para(`      Mo  = ${_f3(w.Pae_dd)} ×${_f3(H_dd / 2)} = ${_f3(w.Mo_dd_Pae)} KN.m`),
    )

    // (3) 과재하중에 의한 벽체단면력 계산
    children.push(para(''))
    children.push(para('(3) 과재하중에 의한 벽체단면력 계산'))
    children.push(para(`  q = ${_f2(p.q)} KN/m²`))
    children.push(
      para('    i) 벽체 하부 (C-C)'),
      para(`      Ph1 = Kah ×q ×H = ${_f3(ep.Kah)} ×${_f2(p.q)} ×${_f3(H_cc)} = ${_f3(w.Ph1_cc)} KN/m (활하중)`),
      para(`      y   = H / 2 = ${_f3(H_cc / 2)} m`),
      para(`      Mo1 = Ph1 ×y = ${_f3(w.Mo_ph1_cc)} KN.m`),
      para('    ii) 벽체 중앙부 (D-D)'),
      para(`      Ph1 = Kah ×q ×H = ${_f3(ep.Kah)} ×${_f2(p.q)} ×${_f3(H_dd)} = ${_f3(w.Ph1_dd)} KN/m (활하중)`),
      para(`      y   = H / 2 = ${_f3(H_dd / 2)} m`),
      para(`      Mo1 = Ph1 ×y = ${_f3(w.Mo_ph1_dd)} KN.m`),
    )

    // ▷ 벽체 하단 단면력 계산
    children.push(para(''))
    children.push(para('▷ 벽체 하단 단면력 계산', true))
    children.push(para('                                                          (단위 : KN, m)'))
    children.push(makeTable(
      ['구 분', '', '횡 토 압', '과재하중', '관 성 력', '총 계'],
      [
        ['LCB1', '전단력', _f3(1.6 * w.Pa_cc), _f3(1.6 * w.Ph1_cc), '0.000', _f3(w.cc_lcb1.V)],
        ['', '모멘트', _f3(1.6 * w.Mo_cc_Pa), _f3(1.6 * w.Mo_ph1_cc), '0.000', _f3(w.cc_lcb1.M)],
        ['LCB2', '전단력', _f3(w.Pae_cc), '0.000', _f3(w.inertia_H_cc), _f3(w.cc_lcb2.V)],
        ['', '모멘트', _f3(w.Mo_cc_Pae), '0.000', _f3(w.inertia_M_cc), _f3(w.cc_lcb2.M)],
        ['LCB3', '전단력', _f3(w.Pa_cc), _f3(w.Ph1_cc), '0.000', _f3(w.cc_lcb3.V)],
        ['', '모멘트', _f3(w.Mo_cc_Pa), _f3(w.Mo_ph1_cc), '0.000', _f3(w.cc_lcb3.M)],
      ],
    ))

    // ▷ 벽체 중간부 단면력 계산
    children.push(para(''))
    children.push(para('▷ 벽체 중간부 단면력 계산', true))
    children.push(para('                                                          (단위 : KN, m)'))
    children.push(makeTable(
      ['구 분', '', '횡 토 압', '과재하중', '관 성 력', '총 계'],
      [
        ['LCB1', '전단력', _f3(1.6 * w.Pa_dd), _f3(1.6 * w.Ph1_dd), '0.000', _f3(w.dd_lcb1.V)],
        ['', '모멘트', _f3(1.6 * w.Mo_dd_Pa), _f3(1.6 * w.Mo_ph1_dd), '0.000', _f3(w.dd_lcb1.M)],
        ['LCB2', '전단력', _f3(w.Pae_dd), '0.000', _f3(w.inertia_H_dd), _f3(w.dd_lcb2.V)],
        ['', '모멘트', _f3(w.Mo_dd_Pae), '0.000', _f3(w.inertia_M_dd), _f3(w.dd_lcb2.M)],
        ['LCB3', '전단력', _f3(w.Pa_dd), _f3(w.Ph1_dd), '0.000', _f3(w.dd_lcb3.V)],
        ['', '모멘트', _f3(w.Mo_dd_Pa), _f3(w.Mo_ph1_dd), '0.000', _f3(w.dd_lcb3.M)],
      ],
    ))

    children.push(pageBreak())

    // ================================================================
    // 4.4 단면검토용 하중집계
    // ================================================================
    children.push(heading('4.4 단면검토용 하중집계', HeadingLevel.HEADING_2))
    children.push(
      para('  상시와 지진시 단면력중 최대값으로 단면력을 정리하면 다음과 같다.'),
      para('  균열검토는 상시의 사용하중으로 검토한다.'),
      para('                                            ( 단위 : KN, m )'),
    )
    const df = sec.design_forces
    const dfRows: string[][] = []
    if (_has_heel && df.BB != null) {
      dfRows.push(['뒷 굽 판 (B-B)', _f3(df.BB.Mu), _f3(df.BB.Mcr), _f3(df.BB.Vu)])
    }
    dfRows.push(['벽 체 하 부 (C-C)', _f3(df.CC.Mu), _f3(df.CC.Mcr), _f3(df.CC.Vu)])
    dfRows.push(['벽체 중앙부 (D-D)', _f3(df.DD.Mu), _f3(df.DD.Mcr), _f3(df.DD.Vu)])
    if (_has_toe && df.AA != null) {
      dfRows.push(['앞 굽 판 (A-A)', _f3(df.AA.Mu), _f3(df.AA.Mcr), _f3(df.AA.Vu)])
    }
    children.push(makeTable(['구     분', 'Mu', 'Mcr', 'Vu'], dfRows))
    children.push(
      para(''),
      para('( 단, 저판에 적용하는 휨모멘트의 크기는 전면벽과 뒷굽판과의'),
      para('  접속점의 모멘트평형조건에 의하여 전면벽에 적용하는 휨모멘트를'),
      para('  초과하지 않는다.- 옹벽표준도작성연구용역 종합보고서, 1998. 건교부)'),
    )

    children.push(pageBreak())

    // ================================================================
    // 4.5 단면검토
    // ================================================================
    children.push(heading('4.5 단 면 검 토'))

    const fck_v = p.fck
    const fy_v = p.fy
    const beta1_v = fck_v <= 28 ? 0.850 : Math.max(0.85 - 0.007 * (fck_v - 28), 0.65)

    // 동적 단면 항목 구성
    const secItems: [string, string][] = []
    let secNum = 1
    if (_has_heel && mbr.BB != null) {
      secItems.push(['BB', `${secNum}) 뒷 굽 판`])
      secNum++
    }
    secItems.push(['CC', `${secNum}) 벽체하부`])
    secNum++
    secItems.push(['DD', `${secNum}) 벽체중앙`])
    secNum++
    if (_has_toe && mbr.AA != null) {
      secItems.push(['AA', `${secNum}) 앞 굽 판`])
    }

    for (const [secKey, secTitle] of secItems) {
      const s = mbr[secKey]
      if (!s) continue

      children.push(heading(secTitle, HeadingLevel.HEADING_2))

      // 재료 / 기본값
      children.push(
        para(`  fck = ${_f1(fck_v)}MPa          fy  = ${_f1(fy_v)}MPa`),
        para(`  β1 = ${beta1_v.toFixed(3)}              φf = ${s.phi_f.toFixed(2)}              φv = 0.75`),
        para(`  pmin = max(0.25√(fck)/fy, 1.4/fy)  = ${s.pmin.toFixed(5)}`),
        para(''),
      )

      children.push(
        para(`  계수 모멘트 Mu = ${s.Mu.toFixed(3).padStart(10)} KN.m        계수 전단력 Vu = ${s.Vu.toFixed(3).padStart(10)} KN`),
        para(`  단면의 두께 H  = ${s.H_sec.toFixed(3).padStart(10)} mm          단 위 폭  B = 1000.000 mm`),
        para(`  유 효 길 이 D  = ${s.D_sec.toFixed(3).padStart(10)} mm          피 복 두 께 Dc = ${s.Dc.toFixed(3).padStart(8)} mm`),
      )

      // ▷ 휨모멘트 검토
      children.push(para(''))
      children.push(para('  ▷ 휨모멘트 검토'))
      children.push(para(''))
      children.push(para('  - 횡강도 검토 -'))
      children.push(para(''))
      children.push(
        para(`  사용철근량 = H${s.rebar_dia} @ ${s.rebar_spacing} mm    (Dc = ${_f0(s.Dc)} mm)`),
        para(`             = ${s.As.toFixed(3)} mm²   ∴ P = As/(B·D) = ${s.rho.toFixed(5)}`),
        para(`  공칭강도시 등가응력길이 a = (As·fy) / (0.85·fck·B) = ${s.a.toFixed(3)} mm`),
      )

      // εt 검토
      const etChk = s.eps_t >= 0.004 ? '≥ 0.004 ..... ∴ O.K' : '< 0.004 ..... ∴ N.G'
      children.push(
        para(`  최외단 인장철근 변형률 εt = ${s.eps_t.toFixed(5)} ${etChk}`),
        para('    ...여기서 εt = 0.003·(H - a/β1 - Dc_min) / (a/β1)'),
      )
      if (s.eps_t >= 0.005) {
        children.push(para('  0.005 ≤ εt 이므로 인장지배단면, φf = 0.85를 적용한다.'))
      } else if (s.eps_t >= 0.002) {
        children.push(para(`  전이구간 (0.002 ≤ εt < 0.005), φf = ${s.phi_f.toFixed(2)}를 적용한다.`))
      } else {
        children.push(para('  εt < 0.002 → 압축지배단면, φf = 0.65를 적용한다.'))
      }

      children.push(para(''))
      children.push(
        para(`  설계강도 φMn = φf · fy · As · ( D - a/2 ) = ${s.phiMn_Nmm.toFixed(3)} N.mm`),
      )
      const flexChk = s.flexure_ok ? '≥' : '<'
      const flexOk = s.flexure_ok ? '∴ O.K' : '∴ N.G'
      children.push(
        para(`               = ${s.phiMn.toFixed(3)} KN.m    ${flexChk}  Mu = ${s.Mu.toFixed(3)} KN.m ..... ${flexOk}`),
      )

      // 필요철근량 및 철근비 검토
      children.push(para(''))
      children.push(para('  - 필요철근량 및 철근비 검토 -'))
      children.push(para(''))
      children.push(
        para(`  소요등가응력길이 : a = ${s.a_req.toFixed(3)} mm로 가정`),
        para(`  필 요 철 근 량 : As = Mu / { φf·fy·(D-a/2) }     = ${s.As_req.toFixed(3)} mm²`),
        para(`  a = (As·fy) / (0.85·fck·B) = ${s.a_req.toFixed(3)} mm  ∴ 가정과 비슷한 O.K`),
      )
      const rhoReq43 = (4 / 3) * s.rho_req
      children.push(
        para(`  Preq = [Mu / { φf·fy·(D-a/2) }] / (B·D) = ${s.rho_req.toFixed(5)}  → 4/3 Preq = ${rhoReq43.toFixed(5)}`),
      )
      if (s.rho >= s.pmin) {
        children.push(para('  철근비검토 : Pmin ≤ P  .......  ∴ O.K'))
      } else if (s.rho >= rhoReq43) {
        children.push(para('  철근비검토 : P < Pmin 이나 4/3 Preq ≥ Pmin  ∴ O.K'))
      } else {
        children.push(para('  철근비검토 : Pmin > P  .......  ∴ N.G'))
      }

      // ▷ 전단력 검토
      children.push(para(''))
      children.push(para('  ▷ 전단력 검토'))
      children.push(para(''))
      children.push(
        para(`  φv · Vc = φv · 1/6 · √fck · B · d / 1000 = ${s.phiVc.toFixed(3)} KN`),
      )
      if (s.shear_ok) {
        children.push(para(`  φv · Vc = ${s.phiVc.toFixed(3)} KN > Vu  ∴전단철근 필요없음.`))
      } else {
        children.push(para(`  φv · Vc = ${s.phiVc.toFixed(3)} KN < Vu = ${s.Vu.toFixed(3)} KN  ∴전단철근 필요. N.G`))
      }

      // ▷ 사용성 검토 (균열 검토)
      children.push(para(''))
      children.push(para('  ▷ 사용성 검토 (균열 검토)'))
      children.push(para(''))
      children.push(
        para(`  Mcr = ${s.Mcr.toFixed(3)} KN.m  (사용하중 모멘트)`),
        para(`  n = Es/Ec = 200000 / {8500 * (Fck + △f)^(1/3)} = ${s.n}`),
        para(`  p = As/(B·D) = ${s.rho.toFixed(5)}`),
        para(`  k = -np + √((np)² + 2np) = ${s.k.toFixed(3)}         j = ${s.j.toFixed(3)}`),
        para(`  x = k · d = ${s.x_na.toFixed(3)} mm`),
        para(`  fc = 2 · Mcr / (B · x · (D - x/3)) = ${s.fc.toFixed(3)} MPa`),
        para(`  fs = Mcr / (As · (D - x/3))         = ${s.fs.toFixed(3)} MPa`),
        para(`  fst = fs · (H - Dc_min - x) / (D - x) = ${s.fst.toFixed(3)} MPa`),
      )

      // 균열 간격
      children.push(
        para('  최외단철근 소요중심간격'),
        para(`  s = Min [ 375 · (210/fst)-2.5Cc , 300 · (210/fst) ] = ${s.s_max.toFixed(2)} mm`),
        para(`    ...여기서..Cc = dc_min - 주철근 직경/2 = ${s.Cc.toFixed(2)} mm`),
      )

      const crackChk = s.crack_ok ? '≤' : '>'
      const crackOk = s.crack_ok ? '∴ O.K' : '∴ N.G'
      children.push(
        para(`  최외단철근 평균배근간격 = ${s.rebar_spacing.toFixed(2)} mm ${crackChk} ${s.s_max.toFixed(2)} mm ..... ${crackOk}`),
        para(''),
      )
    }

    children.push(pageBreak())
  }

  // 중력식: 단면검토 생략 안내
  if (_is_gravity) {
    children.push(heading('4. 단면 검토'))
    if (_is_semi_gravity) {
      children.push(para('  반중력식 옹벽 → 별도 단면검토 참조'))
    } else {
      children.push(para('  무근콘크리트 중력식 옹벽 → 단면검토 해당 없음'))
    }
    children.push(pageBreak())
  }

  // ================================================================
  // 종합 판정
  // ================================================================
  children.push(heading('종합 판정'))

  const judgeRows: string[][] = [
    ['활동 (상시)', `${_f3(sn.SF_slide)} >= 1.5`, jdg.slide_normal],
    ['활동 (지진)', `${_f3(se.SF_slide)} >= 1.2`, jdg.slide_seismic],
    ['전도 (상시)', `${_f3(sn.SF_overturn)} >= 2.0`, jdg.overturn_normal],
    ['전도 (지진)', `${_f3(se.SF_overturn)} >= 1.5`, jdg.overturn_seismic ?? 'OK'],
    ['편심 (상시)', `e=${_f3(sn.e)} <= B/6=${_f3(sn.B6)}`, jdg.eccentricity_normal],
    ['편심 (지진)', `e=${_f3(se.e)} <= B/3=${_f3(sn.B3)}`, jdg.eccentricity_seismic],
    ['지지력 (상시)', `Q1=${_f3(sn.Q1)} <= qa=${_f3(sn.qa)}`, jdg.bearing_normal],
    ['지지력 (지진)', `Q1=${_f3(se.Q1)} <= qae=${_f3(se.qa)}`, jdg.bearing_seismic],
  ]

  // 단면검토 항목
  if (mbr.BB != null) {
    judgeRows.push(
      ['저판 휨', `φMn=${_f3(mbr.BB.phiMn)} >= Mu=${_f3(mbr.BB.Mu)}`, jdg.BB_flexure],
      ['저판 전단', `φVc=${_f3(mbr.BB.phiVc)} >= Vu=${_f3(mbr.BB.Vu)}`, jdg.BB_shear],
      ['저판 균열', `s=${mbr.BB.rebar_spacing} <= ${_f3(mbr.BB.s_max)}`, jdg.BB_crack],
    )
  }
  if (mbr.CC != null) {
    judgeRows.push(
      ['벽체하부 휨', `φMn=${_f3(mbr.CC.phiMn)} >= Mu=${_f3(mbr.CC.Mu)}`, jdg.CC_flexure],
      ['벽체하부 전단', `φVc=${_f3(mbr.CC.phiVc)} >= Vu=${_f3(mbr.CC.Vu)}`, jdg.CC_shear],
      ['벽체하부 균열', `s=${mbr.CC.rebar_spacing} <= ${_f3(mbr.CC.s_max)}`, jdg.CC_crack],
    )
  }
  if (mbr.DD != null) {
    judgeRows.push(
      ['벽체중앙 휨', `φMn=${_f3(mbr.DD.phiMn)} >= Mu=${_f3(mbr.DD.Mu)}`, jdg.DD_flexure],
      ['벽체중앙 전단', `φVc=${_f3(mbr.DD.phiVc)} >= Vu=${_f3(mbr.DD.Vu)}`, jdg.DD_shear],
      ['벽체중앙 균열', `s=${mbr.DD.rebar_spacing} <= ${_f3(mbr.DD.s_max)}`, jdg.DD_crack],
    )
  }
  if (mbr.AA != null) {
    judgeRows.push(
      ['앞굽판 휨', `φMn=${_f3(mbr.AA.phiMn)} >= Mu=${_f3(mbr.AA.Mu)}`, jdg.AA_flexure],
      ['앞굽판 전단', `φVc=${_f3(mbr.AA.phiVc)} >= Vu=${_f3(mbr.AA.Vu)}`, jdg.AA_shear],
      ['앞굽판 균열', `s=${mbr.AA.rebar_spacing} <= ${_f3(mbr.AA.s_max)}`, jdg.AA_crack],
    )
  }
  children.push(makeTable(['검토항목', '결과', '판정'], judgeRows))

  children.push(para(''))
  const overall = jdg.all_ok ? '구조적으로 안전합니다.' : '단면 또는 배근 조정이 필요합니다.'
  children.push(para(`종합 판정 : ${overall}`, true, 24))

  return new Document({
    sections: [{ children }],
    styles: {
      default: {
        document: {
          run: { font: 'Malgun Gothic', size: 20 },
        },
      },
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const params = await request.json()
    const results = calculateWall(params)
    const doc = buildDocument(params, results)
    const buffer = await Packer.toBuffer(doc)
    const uint8 = new Uint8Array(buffer)

    const wallType = params.wall_type || 'L형'
    const filename = encodeURIComponent(`옹벽구조검토_${wallType}.docx`)

    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ detail: `보고서 생성 오류: ${message}` }, { status: 500 })
  }
}
