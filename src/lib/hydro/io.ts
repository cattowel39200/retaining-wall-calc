import type { HydroState, HydroProject, ComputedResult } from '@/types/hydro'
import { createDefaultState } from '@/types/hydro'
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  WidthType, TextRun, AlignmentType, BorderStyle, HeadingLevel,
} from 'docx'

// === JSON Export/Import ===
export function exportJSON(state: HydroState): void {
  const json = JSON.stringify(state, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `수리계산_${state.project.name || '미정'}_${state.project.date || new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importJSON(file: File): Promise<HydroState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string)
        const base = createDefaultState()
        resolve({ ...base, ...imported })
      } catch {
        reject(new Error('JSON 파일 파싱 오류'))
      }
    }
    reader.onerror = () => reject(new Error('파일 읽기 오류'))
    reader.readAsText(file)
  })
}

// === Word Report Download ===
export async function downloadHydroReport(
  project: HydroProject,
  computed: ComputedResult[],
  region: string,
): Promise<void> {
  const f2 = (v: number) => v.toFixed(2)
  const f3 = (v: number) => v.toFixed(3)
  const f1 = (v: number) => v.toFixed(1)

  const thinBorder = {
    top: { style: BorderStyle.SINGLE, size: 1 },
    bottom: { style: BorderStyle.SINGLE, size: 1 },
    left: { style: BorderStyle.SINGLE, size: 1 },
    right: { style: BorderStyle.SINGLE, size: 1 },
  }

  function cell(text: string, bold = false, align: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.LEFT) {
    return new TableCell({
      borders: thinBorder,
      width: { size: 0, type: WidthType.AUTO },
      children: [new Paragraph({
        alignment: align,
        children: [new TextRun({ text, bold, size: 18 })],
      })],
    })
  }

  // Cover section
  const coverSection = [
    new Paragraph({ spacing: { before: 400 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, after: 200 },
      children: [new TextRun({ text: '우수 수리계산서', bold: true, size: 40 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `설계빈도: ${project.designFrequency}년`, size: 22 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [new TextRun({ text: `지역: ${region}`, size: 22 })],
    }),
    new Paragraph({ spacing: { before: 400 }, children: [] }),
    new Table({
      width: { size: 5000, type: WidthType.DXA },
      rows: [
        new TableRow({ children: [cell('프로젝트명', true), cell(project.name)] }),
        new TableRow({ children: [cell('위치', true), cell(project.location)] }),
        new TableRow({ children: [cell('업체명', true), cell(project.company)] }),
        new TableRow({ children: [cell('작성자', true), cell(project.designer)] }),
        new TableRow({ children: [cell('작성일', true), cell(project.date)] }),
      ],
    }),
  ]

  // Results table
  const headerRow = new TableRow({
    children: [
      'No', '구간명', '유역면적\n(ha)', '누가면적\n(ha)', 'C', 'tc\n(min)',
      'I\n(mm/hr)', 'Q\n(m³/s)', '관종', '규격', 'I(%)', 'V\n(m/s)',
      'Q통수\n(m³/s)', '판정',
    ].map(h => cell(h, true, AlignmentType.CENTER)),
  })

  const dataRows = computed.map((cr, i) => {
    const s = cr.segment
    const r = cr.result
    const sec = r.section

    let spec = '-'
    if (s.pipeType === 'circular') spec = `D${s.pipeDiameter}`
    else if (s.pipeType === 'box') spec = `${s.boxWidth}×${s.boxHeight}`
    else if (s.pipeType === 'uditch') spec = `${s.uWidth}×${s.uHeight}`

    return new TableRow({
      children: [
        cell(String(i + 1), false, AlignmentType.CENTER),
        cell(s.name || '-', false, AlignmentType.CENTER),
        cell(f2(r.area), false, AlignmentType.CENTER),
        cell(f2(r.cumulArea), false, AlignmentType.CENTER),
        cell(f2(r.appliedC), false, AlignmentType.CENTER),
        cell(f1(r.tc), false, AlignmentType.CENTER),
        cell(f1(r.intensity), false, AlignmentType.CENTER),
        cell(f3(r.discharge), false, AlignmentType.CENTER),
        cell(sec?.type || '-', false, AlignmentType.CENTER),
        cell(spec, false, AlignmentType.CENTER),
        cell(f3(r.appliedSlope), false, AlignmentType.CENTER),
        cell(sec ? f2(sec.V) : '-', false, AlignmentType.CENTER),
        cell(sec ? f3(sec.Q) : '-', false, AlignmentType.CENTER),
        cell(r.capacityOK ? 'OK' : 'NG', r.capacityOK === false, AlignmentType.CENTER),
      ],
    })
  })

  const resultsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  })

  const doc = new Document({
    sections: [{
      children: [
        ...coverSection,
        new Paragraph({ spacing: { before: 400 }, children: [] }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({
            text: `우수관로 제원검토표 (${project.designFrequency}년 빈도)`,
            bold: true,
          })],
        }),
        new Paragraph({ spacing: { before: 100 }, children: [] }),
        resultsTable,
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({
            text: '적용기준: 하수도시설기준 · 하천설계기준 · 도로배수시설지침',
            size: 16,
            italics: true,
          })],
        }),
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `수리계산서_${project.name || '미정'}_${project.designFrequency}년.docx`
  a.click()
  URL.revokeObjectURL(url)
}
