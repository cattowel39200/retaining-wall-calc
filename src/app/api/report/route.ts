import { NextRequest, NextResponse } from 'next/server'
import { calculateWall } from '@/lib/calc-engine'
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, HeadingLevel, PageBreak,
} from 'docx'

const f3 = (v: number | null | undefined) => v != null ? v.toFixed(3) : '-'
const f2 = (v: number | null | undefined) => v != null ? v.toFixed(2) : '-'
const f1 = (v: number | null | undefined) => v != null ? v.toFixed(1) : '-'
const f0 = (v: number | null | undefined) => v != null ? v.toFixed(0) : '-'

function cell(text: string, bold = false, align: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.CENTER) {
  return new TableCell({
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, bold, size: 18, font: 'Malgun Gothic' })],
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

function para(text: string, bold = false) {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, font: 'Malgun Gothic', bold })],
    spacing: { after: 60 },
  })
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function buildDocument(p: any, r: any): Document {
  const wallType = p.wall_type || 'L형'
  const jdg = r.judgment
  const stab = r.stability
  const n = stab.normal
  const s = stab.seismic
  const ep = r.earth_pressure
  const blk = r.blocks
  const sec = r.section
  const mbr = r.member
  const isGravity = jdg.is_gravity
  const hasToe = jdg.has_toe
  const hasHeel = jdg.has_heel

  const sections: Paragraph[] = []
  const tables: (Paragraph | Table)[] = []

  // ── 표지 ──
  const children: (Paragraph | Table)[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2000 }, children: [
      new TextRun({ text: `${wallType} 옹벽 구조계산서`, size: 52, bold: true, font: 'Malgun Gothic' }),
    ]}),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [
      new TextRun({ text: `H = ${f1(p.H)} m`, size: 36, font: 'Malgun Gothic' }),
    ]}),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [
      new TextRun({ text: '적용기준: KDS 11 80 05 / KDS 11 80 15 / KDS 14 20 20', size: 22, font: 'Malgun Gothic', color: '666666' }),
    ]}),
    new Paragraph({ children: [new PageBreak()] }),

    // ── 1. 설계 조건 ──
    heading('1. 설계 조건'),
    para(`옹벽 형식: ${wallType}`),
    para(`H(총높이) = ${f3(p.H)} m, B(총폭) = ${f3(p.B)} m`),
    para(`벽체 상단폭 = ${f3(p.t_stem)} m, 벽체 높이 = ${f3(p.H_stem)} m`),
    para(`Toe = ${f3(p.C6_toe)} m, Heel = ${f3(p.C8_heel)} m, 저판두께 = ${f3(p.D_slab)} m`),
    para(`뒤채움 높이 = ${f3(p.Hs_soil)} m, 토피고 Df = ${f3(p.Df)} m`),

    heading('1.1 지반조건', HeadingLevel.HEADING_2),
    para(`뒤채움 단위중량 γt = ${f1(p.gamma_t)} kN/m³`),
    para(`내부마찰각 φ = ${f1(p.phi_deg)}°, 점착력 c = ${f1(p.c_soil)} kPa`),
    para(`경사각 α = ${f1(p.alpha_deg)}°`),
    para(`과재하중 q = ${f1(p.q)} kN/m²`),

    heading('1.2 사용재료', HeadingLevel.HEADING_2),
    para(`콘크리트 fck = ${p.fck} MPa, γc = ${f1(p.gamma_c)} kN/m³`),
    para(`철근 fy = ${p.fy} MPa`),
    para(`수평지진가속도계수 Kh = ${f3(p.Kh)}`),

    new Paragraph({ children: [new PageBreak()] }),

    // ── 2. 자중 및 재토하중 ──
    heading('2. 자중 및 재토하중'),
  ]

  // 자중 테이블
  const blockHeaders = ['블록', '면적(m²)', 'γ(kN/m³)', 'W(kN)', 'x(m)', 'Mr(kN.m)', 'Mo(kN.m)']
  const blockRows: string[][] = []

  for (const cr of (blk.c_results || [])) {
    blockRows.push([cr[0]||'', f3(cr[1]), f1(cr[2]), f2(cr[3]), f3(cr[6]), f2(cr[8]), f2(cr[9])])
  }
  blockRows.push(['콘크리트 소계', '', '', f2(blk.Wc), '', f2(blk.Mrc), f2(blk.Moc)])

  for (const sr of (blk.s_results || [])) {
    blockRows.push([sr[0]||'', f3(sr[1]), f1(sr[2]), f2(sr[3]), f3(sr[6]), f2(sr[8]), f2(sr[9])])
  }
  blockRows.push(['토사 소계', '', '', f2(blk.Ws), '', f2(blk.Mrs), f2(blk.Mos)])
  blockRows.push(['합계', '', '', f2(blk.Wt), '', f2(blk.Mrt), f2(blk.Mot)])

  children.push(makeTable(blockHeaders, blockRows))

  // ── 3. 토압 계산 ──
  children.push(
    heading('3. 토압 계산'),
    para(`상시 (Rankine): Ka = ${f3(ep.Ka)}, Pa = ${f2(ep.Pa)} kN/m, ya = ${f3(ep.ya)} m`),
    para(`지진시 (M-O): KAE = ${f3(ep.KAE)}, PAE = ${f2(ep.PAE)} kN/m, yae = ${f3(ep.yae)} m`),
  )
  if (ep.Ph_sur > 0) {
    children.push(para(`과재토압: Ph = ${f2(ep.Ph_sur)} kN/m, Pv = ${f2(ep.Pv_sur)} kN/m`))
  }

  children.push(new Paragraph({ children: [new PageBreak()] }))

  // ── 4. 안정검토 ──
  children.push(heading('4. 안정검토'))

  const stabHeaders = ['검토항목', '상시 결과', '기준', '판정', '지진시 결과', '기준', '판정']
  const stabRows = [
    ['활동 안전율', f3(n.SF_slide), '1.500', jdg.slide_normal, f3(s.SF_slide), '1.200', jdg.slide_seismic],
    ['전도 안전율', f3(n.SF_overturn), '2.000', jdg.overturn_normal, f3(s.SF_overturn), '1.500', jdg.overturn_seismic],
    ['편심 e(m)', (n.e != null ? n.e.toFixed(4) : '-'), `B/6=${f3(n.B6)}`, jdg.eccentricity_normal,
     (s.e != null ? s.e.toFixed(4) : '-'), `B/3=${f3(n.B3)}`, jdg.eccentricity_seismic],
    ['지지력(kN/m²)', `${f1(n.Q1)}/${f1(n.Q2)}`, `qa=${f1(n.qa)}`, jdg.bearing_normal,
     `${f1(s.Q1)}/${f1(s.Q2)}`, `qa=${f1(s.qa)}`, jdg.bearing_seismic],
  ]
  children.push(makeTable(stabHeaders, stabRows))

  children.push(
    heading('4.1 하중집계', HeadingLevel.HEADING_2),
    para(`상시: ΣV=${f2(n.SV)} kN, ΣH=${f2(n.SH)} kN, ΣMr=${f2(n.SMr)} kN.m, ΣMo=${f2(n.SMo)} kN.m`),
    para(`지진: ΣV=${f2(s.SV)} kN, ΣH=${f2(s.SH)} kN, ΣMr=${f2(s.SMr)} kN.m, ΣMo=${f2(s.SMo)} kN.m`),
  )

  // ── 5. 단면검토 (비중력식) ──
  if (!isGravity && sec?.design_forces) {
    children.push(new Paragraph({ children: [new PageBreak()] }))
    children.push(heading('5. 단면검토'))

    const dfHeaders = ['단면', 'Mu(kN.m)', 'Mcr(kN.m)', 'Vu(kN)']
    const dfRows: string[][] = []
    const secMap: Record<string, string> = { BB: 'B-B(Heel)', CC: 'C-C(벽체하부)', DD: 'D-D(벽체중간)', AA: 'A-A(Toe)' }

    for (const key of ['BB', 'CC', 'DD', 'AA']) {
      const d = sec.design_forces[key]
      if (!d) continue
      if (key === 'BB' && !hasHeel) continue
      if (key === 'AA' && !hasToe) continue
      dfRows.push([secMap[key], f2(d.Mu), f2(d.Mcr), f2(d.Vu)])
    }
    children.push(makeTable(dfHeaders, dfRows))

    // ── 6. 부재설계 ──
    children.push(new Paragraph({ children: [new PageBreak()] }))
    children.push(heading('6. 부재설계'))

    for (const key of ['BB', 'CC', 'DD', 'AA']) {
      const m = mbr?.[key]
      if (!m) continue
      if (key === 'BB' && !hasHeel) continue
      if (key === 'AA' && !hasToe) continue

      children.push(heading(`6.${['BB','CC','DD','AA'].indexOf(key)+1} ${secMap[key]}`, HeadingLevel.HEADING_2))
      children.push(
        para(`단면높이: ${f0(m.H_sec)} mm, 유효깊이: ${f1(m.D_sec)} mm`),
        para(`철근: D${m.rebar_dia}@${m.rebar_spacing} mm, As = ${f1(m.As)} mm²/m, ρ = ${(m.rho*100).toFixed(3)}%`),
      )

      const checkHeaders = ['검토', '작용', '저항', '판정']
      const checkRows = [
        ['휨(kN.m)', f2(m.Mu), f2(m.phiMn), jdg[`${key}_flexure`]],
        ['전단(kN)', f2(m.Vu), f2(m.phiVc), jdg[`${key}_shear`]],
        ['균열간격(mm)', `${m.rebar_spacing}`, f0(m.s_max), jdg[`${key}_crack`]],
      ]
      children.push(makeTable(checkHeaders, checkRows))
    }
  }

  // ── 종합 판정 ──
  children.push(new Paragraph({ children: [new PageBreak()] }))
  children.push(heading('종합 판정'))
  children.push(para(`최종 판정: ${jdg.all_ok ? 'OK — 모든 검토항목 만족' : 'NG — 일부 검토항목 불만족'}`, true))

  const judgHeaders = ['항목', '판정']
  const judgRows: string[][] = [
    ['활동(상시)', jdg.slide_normal],
    ['활동(지진)', jdg.slide_seismic],
    ['전도(상시)', jdg.overturn_normal],
    ['전도(지진)', jdg.overturn_seismic],
    ['편심(상시)', jdg.eccentricity_normal],
    ['편심(지진)', jdg.eccentricity_seismic],
    ['지지력(상시)', jdg.bearing_normal],
    ['지지력(지진)', jdg.bearing_seismic],
  ]
  if (!isGravity) {
    for (const key of ['BB', 'CC', 'DD', 'AA']) {
      if (key === 'BB' && !hasHeel) continue
      if (key === 'AA' && !hasToe) continue
      if (!mbr?.[key]) continue
      judgRows.push(
        [`${key} 휨`, jdg[`${key}_flexure`] || '-'],
        [`${key} 전단`, jdg[`${key}_shear`] || '-'],
        [`${key} 균열`, jdg[`${key}_crack`] || '-'],
      )
    }
  }
  children.push(makeTable(judgHeaders, judgRows))

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
