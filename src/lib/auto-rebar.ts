/**
 * 철근 자동 배근 설계 (KDS 14 20 기준)
 * 소요철근량 → 최적 (직경, 간격) 자동 선정
 * 배력근, 스터럽, 정착/이음길이 자동 결정
 */

// ===== 철근 면적 테이블 =====
const REBAR_AREA: Record<number, number> = {
  10: 71.3, 13: 126.7, 16: 198.6, 19: 286.5,
  22: 387.1, 25: 506.7, 29: 642.4, 32: 794.2,
}

function rebarArea(dia: number): number {
  return REBAR_AREA[dia] ?? (Math.PI / 4 * dia ** 2)
}

// ===== 자동 배근 결과 =====
export interface AutoRebarResult {
  main_dia: number
  main_spacing: number
  main_As: number

  dist_dia: number
  dist_spacing: number
  dist_As: number

  stirrup_required: boolean
  stirrup_dia: number | null
  stirrup_spacing: number | null
  stirrup_reason: string

  ld: number
  ls: number

  all_ok: boolean
  note: string
}

// ===== 단일 조합 검증 =====
function checkCombo(
  dia: number, spacing: number,
  Mu: number, Vu: number,
  H_sec_mm: number, Dc_mm: number,
  fck: number, fy: number,
): { flexure: boolean; shear: boolean; crack: boolean; rho: boolean; phiMn: number; phiVc: number } {
  const D_sec = H_sec_mm - Dc_mm
  if (D_sec <= 0) return { flexure: false, shear: false, crack: false, rho: false, phiMn: 0, phiVc: 0 }

  const As = rebarArea(dia) * 1000 / spacing
  const rho = As / (1000 * D_sec)
  const Es = 200000

  // beta1
  let beta1: number
  if (fck <= 28) beta1 = 0.85
  else beta1 = Math.max(0.85 - 0.007 * (fck - 28), 0.65)

  const pmin = Math.max(0.25 * Math.sqrt(fck) / fy, 1.4 / fy)

  // Bending capacity
  const a = (As * fy) / (0.85 * fck * 1000)
  const c_val = beta1 > 0 ? a / beta1 : 0
  const eps_t = c_val > 0 ? 0.003 * (D_sec - c_val) / c_val : 999

  let phi_f: number
  if (eps_t >= 0.005) phi_f = 0.85
  else if (eps_t <= 0.002) phi_f = 0.65
  else phi_f = 0.65 + (eps_t - 0.002) * (0.85 - 0.65) / (0.005 - 0.002)

  const phiMn = phi_f * fy * As * (D_sec - a / 2) / 1e6
  const flexure = phiMn >= Math.abs(Mu)

  // Shear capacity
  const phi_v = 0.75
  const phiVc = phi_v * (1 / 6) * Math.sqrt(fck) * 1000 * D_sec / 1000
  const shear = phiVc >= Math.abs(Vu)

  // Required As (iteration)
  let a_req = a, As_req = As
  for (let i = 0; i < 20; i++) {
    const denom = phi_f * fy * (D_sec - a_req / 2)
    if (denom <= 0) break
    As_req = Math.abs(Mu) * 1e6 / denom
    const a_new = (As_req * fy) / (0.85 * fck * 1000)
    if (Math.abs(a_new - a_req) < 0.001) break
    a_req = a_new
  }
  const rho_req = D_sec > 0 ? As_req / (1000 * D_sec) : 0
  const rhoOk = rho >= pmin || rho >= (4 / 3) * rho_req

  // Crack control — 균열모멘트 = fr × S (단면계수)
  // fr = 0.63√fck (MPa), S = bh²/6
  const fr = 0.63 * Math.sqrt(fck)  // MPa
  const Mcr = fr * 1000 * H_sec_mm * H_sec_mm / 6 / 1e6  // kN·m
  const Mcr_check = Math.min(Math.abs(Mu), Mcr)  // 균열검토용 모멘트

  const Ec = 8500 * Math.pow(fck, 1 / 3)
  const n_ratio = Math.round(Es / Ec)
  let np = n_ratio * rho
  if (np <= 0) np = 1e-10
  const k = -np + Math.sqrt(np ** 2 + 2 * np)
  const x_na = k * D_sec

  const Mcr_Nmm = Mcr_check * 1e6
  const denom_fs = As * (D_sec - x_na / 3)
  const fs = denom_fs > 0 ? Mcr_Nmm / denom_fs : 0
  const h_tens = H_sec_mm - Dc_mm - x_na
  const d_tens = D_sec - x_na
  const fst = d_tens > 0 ? fs * h_tens / d_tens : fs

  let Cc = Dc_mm - dia / 2
  if (Cc < 0) Cc = 0
  const crack_limit = 210.0
  let s_max = 999
  if (fst > 0) {
    const s1 = 375 * (crack_limit / fst) - 2.5 * Cc
    const s2 = 300 * (crack_limit / fst)
    s_max = Math.max(Math.min(s1, s2), 0)
  }
  const crack = spacing <= s_max

  return { flexure, shear, crack, rho: rhoOk, phiMn, phiVc }
}

// ===== 주철근 자동 선정 =====
const DIA_CANDIDATES = [13, 16, 19, 22, 25, 29, 32]
const SPACING_CANDIDATES = [100, 125, 150, 175, 200, 250, 300]

export function autoSelectRebar(
  Mu: number,
  Vu: number,
  H_sec_mm: number,
  Dc_mm: number,
  fck: number,
  fy: number,
): AutoRebarResult {
  const D_sec = H_sec_mm - Dc_mm
  if (D_sec <= 0) {
    return emptyResult('유효깊이 ≤ 0: 단면 두께를 확인하세요')
  }

  // 최소 철근비
  const pmin = Math.max(0.25 * Math.sqrt(fck) / fy, 1.4 / fy)
  const As_min = pmin * 1000 * D_sec

  // 소요 As 계산 (iteration)
  const phi_f = 0.85
  let a_req = 0, As_req = As_min
  for (let i = 0; i < 20; i++) {
    const denom = phi_f * fy * (D_sec - a_req / 2)
    if (denom <= 0) break
    As_req = Math.abs(Mu) * 1e6 / denom
    const a_new = fck > 0 ? (As_req * fy) / (0.85 * fck * 1000) : 0
    if (Math.abs(a_new - a_req) < 0.001) break
    a_req = a_new
  }
  As_req = Math.max(As_req, As_min)

  // 모든 (dia, spacing) 조합 검색 — 모든 조건 통과하는 최경제 배근
  let bestDia = 0, bestSpacing = 0, bestAs = Infinity
  let found = false

  // 작은 직경 + 넓은 간격부터 검색 (경제적 순서)
  for (const dia of DIA_CANDIDATES) {
    for (const sp of [...SPACING_CANDIDATES].reverse()) {
      const As = rebarArea(dia) * 1000 / sp
      if (As < As_req * 0.95) continue  // 소요의 95% 미만이면 스킵

      const result = checkCombo(dia, sp, Mu, Vu, H_sec_mm, Dc_mm, fck, fy)
      if (result.flexure && result.crack && result.rho) {
        if (As < bestAs) {
          bestDia = dia
          bestSpacing = sp
          bestAs = As
          found = true
        }
      }
    }
    if (found) break  // 작은 직경에서 OK면 경제적이므로 중단
  }

  // 작은 직경에서 못 찾으면 큰 직경까지 전수 검색
  if (!found) {
    for (const dia of DIA_CANDIDATES) {
      for (const sp of SPACING_CANDIDATES) {  // 좁은 간격부터
        const As = rebarArea(dia) * 1000 / sp
        const result = checkCombo(dia, sp, Mu, Vu, H_sec_mm, Dc_mm, fck, fy)
        if (result.flexure && result.crack && result.rho) {
          bestDia = dia
          bestSpacing = sp
          bestAs = As
          found = true
          break
        }
      }
      if (found) break
    }
  }

  // 여전히 못 찾으면 — 최대 배근 (D32@100) + 경고
  let note = ''
  if (!found) {
    bestDia = 32
    bestSpacing = 100
    bestAs = rebarArea(32) * 1000 / 100
    note = '단면 부족: 단면 두께 증가 또는 2단 배근 필요'
  }

  // ===== 배력근 (KDS 14 20 54) =====
  const As_dist_min = Math.max(bestAs / 3, 0.002 * 1000 * H_sec_mm)
  let distDia = 13, distSpacing = 300, distFound = false
  for (const dia of [13, 16, 19, 22]) {
    for (const sp of [300, 250, 200, 150, 125]) {
      if (rebarArea(dia) * 1000 / sp >= As_dist_min) {
        distDia = dia
        distSpacing = sp
        distFound = true
        break
      }
    }
    if (distFound) break
  }

  // ===== 스터럽 판정 =====
  const phi_v = 0.75
  const phiVc = phi_v * (1 / 6) * Math.sqrt(fck) * 1000 * D_sec / 1000
  let stirrup_required = false
  let stirrup_dia: number | null = null
  let stirrup_spacing: number | null = null
  let stirrup_reason = ''

  if (Math.abs(Vu) > phiVc) {
    stirrup_required = true
    const Vs = (Math.abs(Vu) - phiVc) / phi_v
    const Av_s = Vs * 1000 / (fy * D_sec)
    stirrup_dia = 10
    const s_calc = 142.6 / Math.max(Av_s, 0.001)
    stirrup_spacing = Math.min(Math.floor(s_calc / 25) * 25, Math.floor(D_sec / 2), 600)
    stirrup_spacing = Math.max(stirrup_spacing, 75)
    stirrup_reason = `Vu(${Math.abs(Vu).toFixed(1)}) > φVc(${phiVc.toFixed(1)}) → D${stirrup_dia}@${stirrup_spacing}`
  } else if (Math.abs(Vu) > phiVc / 2) {
    stirrup_required = true
    stirrup_dia = 10
    stirrup_spacing = Math.min(Math.floor(D_sec / 2), 600)
    stirrup_reason = `φVc/2 < Vu → 최소보강 D${stirrup_dia}@${stirrup_spacing}`
  } else {
    stirrup_reason = `Vu(${Math.abs(Vu).toFixed(1)}) ≤ φVc/2(${(phiVc / 2).toFixed(1)}) → 불필요`
  }

  // ===== 정착·이음길이 =====
  const ld = Math.ceil((fy * bestDia) / (4 * 0.9 * Math.sqrt(fck)))
  const ls = Math.ceil(1.3 * ld)

  // ===== 최종 검증 =====
  const finalCheck = checkCombo(bestDia, bestSpacing, Mu, Vu, H_sec_mm, Dc_mm, fck, fy)
  const all_ok = finalCheck.flexure && finalCheck.shear && finalCheck.crack && finalCheck.rho

  return {
    main_dia: bestDia,
    main_spacing: bestSpacing,
    main_As: bestAs,
    dist_dia: distDia,
    dist_spacing: distSpacing,
    dist_As: rebarArea(distDia) * 1000 / distSpacing,
    stirrup_required,
    stirrup_dia,
    stirrup_spacing,
    stirrup_reason,
    ld,
    ls,
    all_ok,
    note,
  }
}

function emptyResult(note: string): AutoRebarResult {
  return {
    main_dia: 13, main_spacing: 200, main_As: 0,
    dist_dia: 13, dist_spacing: 300, dist_As: 0,
    stirrup_required: false, stirrup_dia: null, stirrup_spacing: null,
    stirrup_reason: '', ld: 0, ls: 0,
    all_ok: false, note,
  }
}
