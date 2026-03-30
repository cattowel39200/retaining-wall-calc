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
  main_dia: number         // 주철근 직경 (mm)
  main_spacing: number     // 주철근 간격 (mm)
  main_As: number          // 실제 배근 면적 (mm²/m)

  dist_dia: number         // 배력근 직경 (mm)
  dist_spacing: number     // 배력근 간격 (mm)
  dist_As: number          // 배력근 면적 (mm²/m)

  stirrup_required: boolean
  stirrup_dia: number | null
  stirrup_spacing: number | null
  stirrup_reason: string

  ld: number               // 정착길이 (mm)
  ls: number               // 이음길이 (mm) — B급
}

// ===== sectionCheck 간이 버전 (통과 여부만 판정) =====
function checkPass(
  As: number, dia: number, spacing: number,
  Mu: number, Vu: number,
  H_sec_mm: number, Dc_mm: number,
  fck: number, fy: number,
): { flexure: boolean; shear: boolean; crack: boolean; rho: boolean; phiVc: number } {
  const Es = 200000
  const D_sec = H_sec_mm - Dc_mm
  if (D_sec <= 0) return { flexure: false, shear: false, crack: false, rho: false, phiVc: 0 }

  const rho = As / (1000 * D_sec)

  let beta1: number
  if (fck <= 28) beta1 = 0.85
  else beta1 = Math.max(0.85 - 0.007 * (fck - 28), 0.65)

  const pmin = Math.max(0.25 * Math.sqrt(fck) / fy, 1.4 / fy)

  // Bending
  const a = fck > 0 ? (As * fy) / (0.85 * fck * 1000) : 0
  const c_val = beta1 > 0 ? a / beta1 : 0
  const eps_t = c_val > 0 ? 0.003 * (D_sec - c_val) / c_val : 999

  let phi_f: number
  if (eps_t >= 0.005) phi_f = 0.85
  else if (eps_t <= 0.002) phi_f = 0.65
  else phi_f = 0.65 + (eps_t - 0.002) * (0.85 - 0.65) / (0.005 - 0.002)

  const phiMn = phi_f * fy * As * (D_sec - a / 2) / 1e6
  const flexure = phiMn >= Math.abs(Mu)

  // Shear
  const phi_v = 0.75
  const phiVc = phi_v * (1 / 6) * Math.sqrt(fck) * 1000 * D_sec / 1000
  const shear = phiVc >= Math.abs(Vu)

  // Required As (iteration)
  let a_req = a, As_req = As
  for (let i = 0; i < 20; i++) {
    const denom = phi_f * fy * (D_sec - a_req / 2)
    if (denom <= 0) break
    As_req = Math.abs(Mu) * 1e6 / denom
    const a_new = fck > 0 ? (As_req * fy) / (0.85 * fck * 1000) : 0
    if (Math.abs(a_new - a_req) < 0.001) break
    a_req = a_new
  }
  const rho_req = D_sec > 0 ? As_req / (1000 * D_sec) : 0
  const rhoOk = rho >= pmin || rho >= (4 / 3) * rho_req

  // Crack
  const Ec = 8500 * Math.pow(fck, 1 / 3)
  const n_ratio = Math.round(Es / Ec)
  let np = n_ratio * rho
  if (np <= 0) np = 1e-10
  const k = -np + Math.sqrt(np ** 2 + 2 * np)
  const x_na = k * D_sec

  // Approximate fst
  const Mcr_Nmm = Math.abs(Mu) * 1e6
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
    s_max = Math.min(s1, s2)
  }
  const crack = spacing <= s_max

  return { flexure, shear, crack, rho: rhoOk, phiVc }
}

// ===== 주철근 자동 선정 =====
const DIA_CANDIDATES = [13, 16, 19, 22, 25, 29, 32]
const SPACING_CANDIDATES = [100, 125, 150, 175, 200, 250, 300]

export function autoSelectRebar(
  Mu: number,           // 설계 휨모멘트 (kN·m)
  Vu: number,           // 설계 전단력 (kN)
  H_sec_mm: number,     // 부재 두께 (mm)
  Dc_mm: number,        // 피복두께 (mm)
  fck: number,          // MPa
  fy: number,           // MPa
): AutoRebarResult {
  const D_sec = H_sec_mm - Dc_mm

  // 최소 철근비에 의한 최소 As
  const pmin = Math.max(0.25 * Math.sqrt(fck) / fy, 1.4 / fy)
  const As_min = pmin * 1000 * D_sec

  // 소요 As 계산 (iteration)
  let phi_f = 0.85
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

  // 최적 (dia, spacing) 선정 — 경제적 배근 (작은 직경 우선, 넓은 간격 우선)
  let bestDia = 16, bestSpacing = 200, bestAs = rebarArea(16) * 1000 / 200
  let found = false

  for (const dia of DIA_CANDIDATES) {
    for (const sp of [...SPACING_CANDIDATES].reverse()) { // 넓은 간격부터
      const As = rebarArea(dia) * 1000 / sp
      if (As < As_req) continue

      const result = checkPass(As, dia, sp, Mu, Vu, H_sec_mm, Dc_mm, fck, fy)
      if (result.flexure && result.crack && result.rho) {
        if (!found || As < bestAs) {
          bestDia = dia
          bestSpacing = sp
          bestAs = As
          found = true
        }
      }
    }
    if (found) break // 작은 직경에서 찾으면 중단 (경제적)
  }

  // 찾지 못한 경우 최대 배근
  if (!found) {
    bestDia = 32
    bestSpacing = 100
    bestAs = rebarArea(32) * 1000 / 100
  }

  // 배력근 (KDS 14 20 54: 주철근의 1/3 이상, 최소 0.002bh)
  const As_dist_min = Math.max(bestAs / 3, 0.002 * 1000 * H_sec_mm)
  let distDia = 13, distSpacing = 300
  for (const dia of [13, 16, 19]) {
    for (const sp of [300, 250, 200, 150]) {
      const As_d = rebarArea(dia) * 1000 / sp
      if (As_d >= As_dist_min) {
        distDia = dia
        distSpacing = sp
        break
      }
    }
    if (rebarArea(distDia) * 1000 / distSpacing >= As_dist_min) break
  }

  // 스터럽 판정
  const phi_v = 0.75
  const phiVc = phi_v * (1 / 6) * Math.sqrt(fck) * 1000 * D_sec / 1000
  let stirrup_required = false
  let stirrup_dia: number | null = null
  let stirrup_spacing: number | null = null
  let stirrup_reason = ''

  if (Math.abs(Vu) > phiVc) {
    // Vs 필요
    stirrup_required = true
    const Vs = (Math.abs(Vu) - phiVc) / phi_v
    const Av_s = Vs * 1000 / (fy * D_sec) // mm²/mm
    // D10 2-leg: Av = 2 × 71.3 = 142.6 mm²
    stirrup_dia = 10
    const s_calc = 142.6 / Av_s
    stirrup_spacing = Math.min(Math.floor(s_calc / 25) * 25, Math.floor(D_sec / 2), 600)
    stirrup_spacing = Math.max(stirrup_spacing, 75)
    stirrup_reason = `Vu(${Math.abs(Vu).toFixed(1)}) > φVc(${phiVc.toFixed(1)}) → D${stirrup_dia}@${stirrup_spacing}`
  } else if (Math.abs(Vu) > phiVc / 2) {
    // 최소 전단보강
    stirrup_required = true
    stirrup_dia = 10
    stirrup_spacing = Math.min(Math.floor(D_sec / 2), 600)
    stirrup_reason = `φVc/2 < Vu ≤ φVc → 최소보강 D${stirrup_dia}@${stirrup_spacing}`
  } else {
    stirrup_reason = `Vu(${Math.abs(Vu).toFixed(1)}) ≤ φVc/2(${(phiVc / 2).toFixed(1)}) → 불필요`
  }

  // 정착·이음길이 (KDS 14 20 52 간략식)
  const ld = Math.ceil((fy * bestDia) / (4 * 0.9 * Math.sqrt(fck)))
  const ls = Math.ceil(1.3 * ld) // B급 이음

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
  }
}
