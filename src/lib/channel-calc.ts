import type { ChannelInput } from '@/types/channel'
import { autoSelectRebar } from '@/lib/auto-rebar'

// ===== Rebar area lookup =====
function _rebarArea(dia: number): number {
  const table: Record<number, number> = {
    10: 71.3, 13: 126.7, 16: 198.6, 19: 286.5,
    22: 387.1, 25: 506.7, 29: 642.4, 32: 794.2,
  }
  return table[dia] ?? (Math.PI / 4 * dia ** 2)
}

// ===== Terzaghi Bearing Capacity Factors =====
const TERZAGHI_TABLE: { phi: number; Nc: number; Nq: number; Nr: number }[] = [
  { phi: 0,  Nc: 5.7,   Nq: 1.0,   Nr: 0.0   },
  { phi: 5,  Nc: 7.3,   Nq: 1.6,   Nr: 0.5   },
  { phi: 10, Nc: 9.6,   Nq: 2.7,   Nr: 1.2   },
  { phi: 15, Nc: 12.9,  Nq: 4.4,   Nr: 2.5   },
  { phi: 20, Nc: 17.7,  Nq: 7.4,   Nr: 5.0   },
  { phi: 25, Nc: 25.1,  Nq: 12.7,  Nr: 9.7   },
  { phi: 28, Nc: 31.6,  Nq: 17.8,  Nr: 14.6  },
  { phi: 30, Nc: 37.2,  Nq: 22.5,  Nr: 19.7  },
  { phi: 32, Nc: 44.0,  Nq: 28.5,  Nr: 27.0  },
  { phi: 34, Nc: 52.6,  Nq: 36.5,  Nr: 36.0  },
  { phi: 36, Nc: 63.5,  Nq: 47.2,  Nr: 51.0  },
  { phi: 38, Nc: 77.5,  Nq: 61.5,  Nr: 73.0  },
  { phi: 40, Nc: 95.7,  Nq: 81.3,  Nr: 100.4 },
  { phi: 45, Nc: 172.3, Nq: 173.3, Nr: 297.5 },
]

function _interpTerzaghi(phi: number): { Nc: number; Nq: number; Nr: number } {
  if (phi <= 0) return { Nc: TERZAGHI_TABLE[0].Nc, Nq: TERZAGHI_TABLE[0].Nq, Nr: TERZAGHI_TABLE[0].Nr }
  if (phi >= 45) {
    const last = TERZAGHI_TABLE[TERZAGHI_TABLE.length - 1]
    return { Nc: last.Nc, Nq: last.Nq, Nr: last.Nr }
  }
  let lo = TERZAGHI_TABLE[0], hi = TERZAGHI_TABLE[1]
  for (let i = 0; i < TERZAGHI_TABLE.length - 1; i++) {
    if (phi >= TERZAGHI_TABLE[i].phi && phi <= TERZAGHI_TABLE[i + 1].phi) {
      lo = TERZAGHI_TABLE[i]
      hi = TERZAGHI_TABLE[i + 1]
      break
    }
  }
  const t = (phi - lo.phi) / (hi.phi - lo.phi)
  return {
    Nc: lo.Nc + t * (hi.Nc - lo.Nc),
    Nq: lo.Nq + t * (hi.Nq - lo.Nq),
    Nr: lo.Nr + t * (hi.Nr - lo.Nr),
  }
}

// ===== Section Check (RC member design) =====
function sectionCheck(
  Mu_val: number, Mcr_val: number, Vu_val: number,
  H_sec_mm: number, Dc_mm: number,
  r_dia: number, r_area: number, r_spacing: number,
  fck: number, fy: number, sec_name: string,
): Record<string, any> {
  const Es = 200000
  const D_sec = H_sec_mm - Dc_mm
  if (D_sec <= 0) return { sec_name, error: '유효깊이 ≤ 0' }

  const As = r_area * 1000 / r_spacing
  const rho = As / (1000 * D_sec)

  let beta1: number
  if (fck <= 28) beta1 = 0.85
  else beta1 = Math.max(0.85 - 0.007 * (fck - 28), 0.65)

  const phi_v = 0.75
  const pmin = Math.max(0.25 * Math.sqrt(fck) / fy, 1.4 / fy)
  const Ec = 8500 * Math.pow(fck, 1 / 3)
  const n_ratio = Math.round(Es / Ec)

  // Bending capacity
  const a = fck > 0 ? (As * fy) / (0.85 * fck * 1000) : 0
  const c_val = beta1 > 0 ? a / beta1 : 0
  const eps_t = c_val > 0 ? 0.003 * (D_sec - c_val) / c_val : 999

  let phi_f_used: number
  if (eps_t >= 0.005) phi_f_used = 0.85
  else if (eps_t <= 0.002) phi_f_used = 0.65
  else phi_f_used = 0.65 + (eps_t - 0.002) * (0.85 - 0.65) / (0.005 - 0.002)

  const phiMn_Nmm = phi_f_used * fy * As * (D_sec - a / 2)
  const phiMn = phiMn_Nmm / 1e6

  // Required steel (iteration)
  let a_req = a, As_req = As
  for (let i = 0; i < 20; i++) {
    const denom_req = phi_f_used * fy * (D_sec - a_req / 2)
    if (denom_req <= 0) break
    As_req = Math.abs(Mu_val) * 1e6 / denom_req
    const a_new = fck > 0 ? (As_req * fy) / (0.85 * fck * 1000) : 0
    if (Math.abs(a_new - a_req) < 0.001) break
    a_req = a_new
  }
  const rho_req = D_sec > 0 ? As_req / (1000 * D_sec) : 0

  // Shear capacity
  const phiVc = phi_v * (1 / 6) * Math.sqrt(fck) * 1000 * D_sec / 1000

  // Crack control
  const p = rho
  let np_val = n_ratio * p
  if (np_val <= 0) np_val = 1e-10
  const k = -np_val + Math.sqrt(np_val ** 2 + 2 * np_val)
  const j = 1 - k / 3
  const x_na = k * D_sec

  const Mcr_Nmm = Math.abs(Mcr_val) * 1e6
  const denom_fc = 1000 * x_na * (D_sec - x_na / 3)
  const fc = denom_fc !== 0 ? 2 * Mcr_Nmm / denom_fc : 0
  const denom_fs = As * (D_sec - x_na / 3)
  const fs = denom_fs !== 0 ? Mcr_Nmm / denom_fs : 0
  const h_tens = H_sec_mm - Dc_mm - x_na
  const d_tens = D_sec - x_na
  const fst = d_tens > 0 ? fs * h_tens / d_tens : fs

  let Cc = Dc_mm - r_dia / 2
  if (Cc < 0) Cc = 0
  const crack_limit = 210.0
  let s_max: number, s_max_1: number, s_max_2: number
  if (fst > 0) {
    s_max_1 = 375 * (crack_limit / fst) - 2.5 * Cc
    s_max_2 = 300 * (crack_limit / fst)
    s_max = Math.min(s_max_1, s_max_2)
  } else {
    s_max_1 = 999; s_max_2 = 999; s_max = 999
  }

  const flexure_ok = phiMn >= Math.abs(Mu_val)
  const shear_ok = phiVc >= Math.abs(Vu_val)
  const crack_ok = r_spacing <= s_max
  const rho_ok = rho >= pmin || rho >= (4 / 3) * rho_req

  return {
    sec_name, H_sec: H_sec_mm, D_sec, Dc: Dc_mm,
    As, rho, a, c: c_val, eps_t, phi_f: phi_f_used,
    phiMn_Nmm, phiMn, a_req, As_req, rho_req,
    phiVc, n: n_ratio, p, k, j, x_na,
    fc, fs, fst, Cc, s_max, s_max_1, s_max_2, crack_limit,
    rebar_dia: r_dia, rebar_spacing: r_spacing,
    Mu: Mu_val, Mcr: Mcr_val, Vu: Vu_val, pmin,
    flexure_ok, shear_ok, crack_ok, rho_ok,
  }
}

// ===== Main Calculation =====
export function calculateChannel(params: ChannelInput): Record<string, any> {
  // --- Validation ---
  if (params.H_left <= 0) throw new Error('좌측 벽체 높이(H_left)는 0보다 커야 합니다.')
  if (params.H_right <= 0) throw new Error('우측 벽체 높이(H_right)는 0보다 커야 합니다.')
  if (params.B <= 0) throw new Error('내폭(B)은 0보다 커야 합니다.')
  if (params.ts <= 0) throw new Error('저판 두께(ts)는 0보다 커야 합니다.')
  if (params.tw_top_left <= 0 || params.tw_bot_left <= 0) throw new Error('좌측 벽체 두께는 0보다 커야 합니다.')
  if (params.tw_top_right <= 0 || params.tw_bot_right <= 0) throw new Error('우측 벽체 두께는 0보다 커야 합니다.')
  if (params.phi_deg < 0 || params.phi_deg > 90) throw new Error('내부마찰각은 0~90° 사이여야 합니다.')

  const {
    H_left, H_right, B, ts, haunch, Df,
    gamma_t, phi_deg, c_soil, q, gamma_c, fck, fy,
    tw_top_left, tw_bot_left, tw_top_right, tw_bot_right,
  } = params
  const gamma_w = 9.81

  // --- Geometry ---
  const H_max = Math.max(H_left, H_right)
  const B_total = B + tw_bot_left + tw_bot_right  // 저판 전체 폭

  // --- Earth pressure coefficient ---
  const phi_rad = phi_deg * Math.PI / 180
  let Ka: number
  if (params.K0_mode === 'manual' && params.K0_manual > 0) {
    Ka = params.K0_manual
  } else {
    Ka = Math.pow(Math.tan(Math.PI / 4 - phi_rad / 2), 2)
  }

  // --- Live load ---
  let q_live = 0
  if (params.live_load === 'DB24') {
    const wheel_load = 96
    const tire_width = 0.5
    const spread_width = tire_width + 2 * Df * 1.0
    const spread_length = 0.2 + 2 * Df * 1.0
    q_live = spread_width > 0 && spread_length > 0
      ? wheel_load / (spread_width * spread_length)
      : 0
    q_live = Math.min(q_live, 64)
  } else if (params.live_load === 'DB18') {
    const wheel_load = 72
    const tire_width = 0.5
    const spread_width = tire_width + 2 * Df * 1.0
    const spread_length = 0.2 + 2 * Df * 1.0
    q_live = spread_width > 0 && spread_length > 0
      ? wheel_load / (spread_width * spread_length)
      : 0
    q_live = Math.min(q_live, 48)
  } else if (params.live_load === 'manual') {
    q_live = params.live_load_manual
  }

  // --- 좌/우 토피고 산정 ---
  // 저판 수평, 벽체 상단이 다른 경우:
  // Df는 높은 쪽 벽체 기준 토피고
  // 낮은 쪽 벽체는 (H_max - H_low) 만큼 토피가 추가됨
  const Df_left = Df + (H_max - H_left)    // 좌측 실제 토피고
  const Df_right = Df + (H_max - H_right)  // 우측 실제 토피고

  // --- Earth pressure per wall ---
  // Left wall (좌측 토피 Df_left 적용)
  const q_top_L = Ka * (gamma_t * Df_left + q + q_live)
  const q_bot_L = Ka * (gamma_t * (Df_left + H_left) + q + q_live)
  // Right wall (우측 토피 Df_right 적용)
  const q_top_R = Ka * (gamma_t * Df_right + q + q_live)
  const q_bot_R = Ka * (gamma_t * (Df_right + H_right) + q + q_live)

  // --- Water pressure ---
  const hw_in_eff = Math.min(params.hw_in, H_max)
  const hw_out_eff = Math.min(params.hw_out, H_max)
  const pw_in_bot = gamma_w * hw_in_eff     // 내수압 하단
  const pw_out_bot = gamma_w * hw_out_eff    // 외수압 하단

  // Net water on left wall (external pushes inward, internal pushes outward)
  const hw_left_out = Math.min(params.hw_out, H_left)
  const hw_left_in = Math.min(params.hw_in, H_left)
  const pw_left_out = gamma_w * hw_left_out
  const pw_left_in = gamma_w * hw_left_in

  const hw_right_out = Math.min(params.hw_out, H_right)
  const hw_right_in = Math.min(params.hw_in, H_right)
  const pw_right_out = gamma_w * hw_right_out
  const pw_right_in = gamma_w * hw_right_in

  // ===== Self-weight (for stability) =====
  // Left wall (trapezoid): average thickness * height * gamma_c
  const W_left = gamma_c * ((tw_top_left + tw_bot_left) / 2) * H_left
  // Right wall (trapezoid)
  const W_right = gamma_c * ((tw_top_right + tw_bot_right) / 2) * H_right
  // Slab
  const W_slab = gamma_c * ts * B_total
  // Soil on top of walls (overburden — 각 벽체별 실제 토피고 적용)
  const W_soil_left = gamma_t * Df_left * tw_top_left
  const W_soil_right = gamma_t * Df_right * tw_top_right
  // Internal water weight on slab
  const W_water = gamma_w * hw_in_eff * B
  // Surcharge on top of walls
  const W_q_left = q * tw_top_left
  const W_q_right = q * tw_top_right

  const W_total = W_left + W_right + W_slab + W_soil_left + W_soil_right + W_water + W_q_left + W_q_right

  // ===== Moment arms about left toe (x from left edge of base slab) =====
  // Left wall centroid: for trapezoid, centroid from left edge
  // Left wall sits on left portion of slab (0 to tw_bot_left)
  const x_left_wall = tw_bot_left / 2  // approximate centroid of left wall
  const x_right_wall = tw_bot_left + B + tw_bot_right / 2
  const x_slab = B_total / 2
  const x_soil_left = tw_top_left / 2  // soil on top of left wall
  const x_soil_right = tw_bot_left + B + tw_top_right / 2  // approximate
  const x_water = tw_bot_left + B / 2  // water inside channel
  const x_q_left = tw_top_left / 2
  const x_q_right = tw_bot_left + B + tw_top_right / 2

  // Stabilizing vertical moment about left toe
  const Mr_v = W_left * x_left_wall + W_right * x_right_wall + W_slab * x_slab
    + W_soil_left * x_soil_left + W_soil_right * x_soil_right
    + W_water * x_water + W_q_left * x_q_left + W_q_right * x_q_right

  // ===== Horizontal forces =====
  // Earth pressure on left wall (pushes rightward = positive)
  const Pa_left = (q_top_L + q_bot_L) * H_left / 2
  // Earth pressure on right wall (pushes leftward = negative)
  const Pa_right = (q_top_R + q_bot_R) * H_right / 2

  // External water on left wall (pushes rightward)
  const Pw_left_ext = pw_left_out * hw_left_out / 2
  // Internal water on left wall (pushes leftward, resisting)
  const Pw_left_int = pw_left_in * hw_left_in / 2
  // External water on right wall (pushes leftward)
  const Pw_right_ext = pw_right_out * hw_right_out / 2
  // Internal water on right wall (pushes rightward, resisting)
  const Pw_right_int = pw_right_in * hw_right_in / 2

  // Net horizontal force (positive = rightward)
  const H_right_force = Pa_left + Pw_left_ext - Pw_left_int + Pw_right_int
  const H_left_force = Pa_right + Pw_right_ext - Pw_right_int + Pw_left_int
  const H_net = H_right_force - H_left_force  // positive = net rightward

  // ===== Overturning moments =====
  // Earth pressure moment arms (measured from base, triangular distribution → H/3 from base)
  // Left wall earth pressure acts at centroid of trapezoid from base
  const ya_left = H_left * (2 * q_bot_L + q_top_L) / (3 * (q_top_L + q_bot_L + 1e-12)) // from base
  const ya_right = H_right * (2 * q_bot_R + q_top_R) / (3 * (q_top_R + q_bot_R + 1e-12))

  // Lever arms from base slab bottom = y + ts
  const arm_Pa_left = ya_left + ts
  const arm_Pa_right = ya_right + ts
  const arm_Pw_left_ext = hw_left_out / 3 + ts
  const arm_Pw_left_int = hw_left_in / 3 + ts
  const arm_Pw_right_ext = hw_right_out / 3 + ts
  const arm_Pw_right_int = hw_right_in / 3 + ts

  // Overturning about right toe (for rightward tipping) and left toe (for leftward tipping)
  // Rightward tipping → overturning about right edge (x = B_total)
  const Mo_right_tip = Pa_left * arm_Pa_left + Pw_left_ext * arm_Pw_left_ext
  const Mr_right_tip = Mr_v  // stabilizing moments about right toe need recalculation
    // Actually we need moments about the RIGHT edge for rightward tipping

  // Recalculate moments about right edge (x_right = B_total)
  const Mr_about_right = W_left * (B_total - x_left_wall) + W_right * (B_total - x_right_wall)
    + W_slab * (B_total - x_slab) + W_soil_left * (B_total - x_soil_left)
    + W_soil_right * (B_total - x_soil_right) + W_water * (B_total - x_water)
    + W_q_left * (B_total - x_q_left) + W_q_right * (B_total - x_q_right)
    + Pa_right * arm_Pa_right + Pw_right_ext * arm_Pw_right_ext  // these resist rightward tipping

  const Mo_about_right = Pa_left * arm_Pa_left + Pw_left_ext * arm_Pw_left_ext
    + Pw_right_int * arm_Pw_right_int  // internal water on right wall pushes rightward

  // Leftward tipping → overturning about left edge (x = 0)
  const Mr_about_left = Mr_v
    + Pa_left * arm_Pa_left + Pw_left_ext * arm_Pw_left_ext  // these resist leftward tipping

  const Mo_about_left = Pa_right * arm_Pa_right + Pw_right_ext * arm_Pw_right_ext
    + Pw_left_int * arm_Pw_left_int

  // Use the WORSE direction
  const SF_overturn_right = Mo_about_right > 0 ? Mr_about_right / Mo_about_right : 999
  const SF_overturn_left = Mo_about_left > 0 ? Mr_about_left / Mo_about_left : 999
  const SF_overturn = Math.min(SF_overturn_right, SF_overturn_left)

  // For reporting, pick the controlling direction
  let Mr: number, Mo: number
  if (SF_overturn_right <= SF_overturn_left) {
    Mr = Mr_about_right; Mo = Mo_about_right
  } else {
    Mr = Mr_about_left; Mo = Mo_about_left
  }

  // ===== Sliding =====
  const V = W_total
  const H_abs = Math.abs(H_net)
  const phi2 = params.phi2_deg > 0 ? params.phi2_deg : phi_deg
  const mu = Math.tan((phi2 * 2 / 3) * Math.PI / 180)
  const Hr = c_soil * B_total + V * mu
  const SF_slide = H_abs > 0 ? Hr / H_abs : 999

  // ===== Eccentricity =====
  // Net moment about center of base
  const M_net = Mr - Mo  // net stabilizing moment about controlling edge
  const e = B_total / 2 - (Mo > 0 ? (Mr - Mo) / V : Mr / V)
  const B6 = B_total / 6

  // ===== Bearing capacity =====
  const phi2_rad = phi2 * Math.PI / 180
  const { Nc, Nq, Nr } = _interpTerzaghi(phi2)
  const Be = B_total - 2 * Math.abs(e)
  const gamma_found = params.gamma_found > 0 ? params.gamma_found : gamma_t

  const qu = c_soil * Nc + gamma_found * Df * Nq + 0.5 * gamma_found * Be * Nr
  const qa = params.qa_fixed > 0 ? params.qa_fixed : qu / 3

  // Contact pressure distribution (trapezoidal or triangular)
  let Q1: number, Q2: number
  if (Math.abs(e) <= B6) {
    // Trapezoidal
    Q1 = V / B_total * (1 + 6 * e / B_total)  // max
    Q2 = V / B_total * (1 - 6 * e / B_total)  // min
  } else {
    // Triangular (e > B/6)
    Q1 = 2 * V / (3 * (B_total / 2 - Math.abs(e)))
    Q2 = 0
  }

  // Stability judgments
  const slide_ok = SF_slide >= 1.5
  const overturn_ok = SF_overturn >= 2.0
  const ecc_ok = Math.abs(e) <= B6
  const bearing_ok = Q1 <= qa

  // ===== Member Forces =====
  // Left wall cantilever (fixed at base, free at top)
  // Net lateral: earth + external water - internal water
  const wL_top = q_top_L + 0 - 0  // top: earth only
  const wL_bot = q_bot_L + pw_left_out - pw_left_in
  const Mu_left = (H_left * H_left / 6) * (2 * wL_bot + wL_top)
  const Vu_left = (wL_top + wL_bot) * H_left / 2

  // Right wall cantilever
  const wR_top = q_top_R + 0 - 0
  const wR_bot = q_bot_R + pw_right_out - pw_right_in
  const Mu_right = (H_right * H_right / 6) * (2 * wR_bot + wR_top)
  const Vu_right = (wR_top + wR_bot) * H_right / 2

  // Bottom slab (fixed-fixed beam, span = B)
  // Vertical loads on slab
  const w_self = gamma_c * ts
  const w_soil_on_slab = 0  // open channel: no soil on slab interior
  const w_water_slab = gamma_w * hw_in_eff
  const w_slab_total = w_self + w_soil_on_slab + q + q_live + w_water_slab

  // Ground reaction (upward, simplified as uniform from bearing)
  const w_net_slab = w_slab_total

  const Mu_slab_end = w_net_slab * B * B / 12
  const Mu_slab_mid = w_net_slab * B * B / 24
  const Vu_slab = w_net_slab * B / 2

  // --- Load Combinations: 1.2D + 1.6L ---
  const lf_d = 1.2
  const lf_l = (q_live > 0) ? 0.6 : 0  // live load factor contribution

  const Mu_left_u = lf_d * Mu_left + lf_l * Mu_left
  const Vu_left_u = lf_d * Vu_left + lf_l * Vu_left

  const Mu_right_u = lf_d * Mu_right + lf_l * Mu_right
  const Vu_right_u = lf_d * Vu_right + lf_l * Vu_right

  const Mu_slab_end_u = lf_d * Mu_slab_end + lf_l * Mu_slab_end
  const Mu_slab_mid_u = lf_d * Mu_slab_mid + lf_l * Mu_slab_mid
  const Vu_slab_u = lf_d * Vu_slab + lf_l * Vu_slab

  // Cracking moments
  const tw_left_mm = ((tw_top_left + tw_bot_left) / 2) * 1000
  const tw_right_mm = ((tw_top_right + tw_bot_right) / 2) * 1000
  const ts_mm = ts * 1000
  const Mcr_left = (1 / 6) * (0.63 * Math.sqrt(fck)) * 1000 * tw_left_mm * tw_left_mm / 1e6
  const Mcr_right = (1 / 6) * (0.63 * Math.sqrt(fck)) * 1000 * tw_right_mm * tw_right_mm / 1e6
  const Mcr_slab = (1 / 6) * (0.63 * Math.sqrt(fck)) * 1000 * ts_mm * ts_mm / 1e6

  // ===== Section Checks =====
  // Left wall inner (토압 인장측)
  const sec_left_in = sectionCheck(
    Mu_left_u, Mcr_left, Vu_left_u,
    tw_left_mm, params.Dc_wall,
    params.wall_left_in_dia, _rebarArea(params.wall_left_in_dia), params.wall_left_in_spacing,
    fck, fy, '좌측벽 내측',
  )
  const auto_left_in = autoSelectRebar(Mu_left_u, Vu_left_u, tw_left_mm, params.Dc_wall, fck, fy)

  // Left wall outer
  const sec_left_out = sectionCheck(
    Mu_left_u * 0.5, Mcr_left, Vu_left_u * 0.5,
    tw_left_mm, params.Dc_wall,
    params.wall_left_out_dia, _rebarArea(params.wall_left_out_dia), params.wall_left_out_spacing,
    fck, fy, '좌측벽 외측',
  )
  const auto_left_out = autoSelectRebar(Mu_left_u * 0.5, Vu_left_u * 0.5, tw_left_mm, params.Dc_wall, fck, fy)

  // Right wall inner
  const sec_right_in = sectionCheck(
    Mu_right_u, Mcr_right, Vu_right_u,
    tw_right_mm, params.Dc_wall,
    params.wall_right_in_dia, _rebarArea(params.wall_right_in_dia), params.wall_right_in_spacing,
    fck, fy, '우측벽 내측',
  )
  const auto_right_in = autoSelectRebar(Mu_right_u, Vu_right_u, tw_right_mm, params.Dc_wall, fck, fy)

  // Right wall outer
  const sec_right_out = sectionCheck(
    Mu_right_u * 0.5, Mcr_right, Vu_right_u * 0.5,
    tw_right_mm, params.Dc_wall,
    params.wall_right_out_dia, _rebarArea(params.wall_right_out_dia), params.wall_right_out_spacing,
    fck, fy, '우측벽 외측',
  )
  const auto_right_out = autoSelectRebar(Mu_right_u * 0.5, Vu_right_u * 0.5, tw_right_mm, params.Dc_wall, fck, fy)

  // Slab end (top face tension)
  const sec_slab_end = sectionCheck(
    Mu_slab_end_u, Mcr_slab, Vu_slab_u,
    ts_mm, params.Dc_slab,
    params.slab_top_dia, _rebarArea(params.slab_top_dia), params.slab_top_spacing,
    fck, fy, '저판 단부 (상면)',
  )
  const auto_slab_end = autoSelectRebar(Mu_slab_end_u, Vu_slab_u, ts_mm, params.Dc_slab, fck, fy)

  // Slab mid (bottom face tension)
  const sec_slab_mid = sectionCheck(
    Mu_slab_mid_u, Mcr_slab, Vu_slab_u * 0.5,
    ts_mm, params.Dc_slab,
    params.slab_bot_dia, _rebarArea(params.slab_bot_dia), params.slab_bot_spacing,
    fck, fy, '저판 중앙 (하면)',
  )
  const auto_slab_mid = autoSelectRebar(Mu_slab_mid_u, Vu_slab_u * 0.5, ts_mm, params.Dc_slab, fck, fy)

  // ===== Judgment =====
  const left_ok = sec_left_in.flexure_ok && sec_left_in.shear_ok && sec_left_in.crack_ok
    && sec_left_out.flexure_ok && sec_left_out.shear_ok && sec_left_out.crack_ok
  const right_ok = sec_right_in.flexure_ok && sec_right_in.shear_ok && sec_right_in.crack_ok
    && sec_right_out.flexure_ok && sec_right_out.shear_ok && sec_right_out.crack_ok
  const slab_end_ok = sec_slab_end.flexure_ok && sec_slab_end.shear_ok && sec_slab_end.crack_ok
  const slab_mid_ok = sec_slab_mid.flexure_ok && sec_slab_mid.shear_ok && sec_slab_mid.crack_ok
  const stability_ok = slide_ok && overturn_ok && ecc_ok && bearing_ok
  const all_ok = left_ok && right_ok && slab_end_ok && slab_mid_ok && stability_ok

  return {
    geometry: {
      H_left, H_right, H_max, B, ts, haunch, Df,
      Df_left, Df_right,
      tw_top_left, tw_bot_left, tw_top_right, tw_bot_right,
      B_total,
    },
    loads: {
      Ka, q_live, Df_left, Df_right,
      q_top_L, q_bot_L, q_top_R, q_bot_R,
      pw_left_out, pw_left_in, pw_right_out, pw_right_in,
      w_net_slab,
      Mu_left, Vu_left, Mu_right, Vu_right,
      Mu_slab_end, Mu_slab_mid, Vu_slab,
      Mu_left_u, Vu_left_u, Mu_right_u, Vu_right_u,
      Mu_slab_end_u, Mu_slab_mid_u, Vu_slab_u,
    },
    stability: {
      V, H_net, Mr, Mo, e, B6,
      SF_slide, SF_overturn,
      Q1, Q2, Be, qu, qa,
      Nc, Nq, Nr,
      slide_ok, overturn_ok, ecc_ok, bearing_ok,
      W_left, W_right, W_slab, W_total,
      W_soil_left, W_soil_right, W_water,
    },
    member: {
      left_in: { ...sec_left_in, auto: auto_left_in },
      left_out: { ...sec_left_out, auto: auto_left_out },
      right_in: { ...sec_right_in, auto: auto_right_in },
      right_out: { ...sec_right_out, auto: auto_right_out },
      slab_end: { ...sec_slab_end, auto: auto_slab_end },
      slab_mid: { ...sec_slab_mid, auto: auto_slab_mid },
    },
    judgment: {
      all_ok,
      stability_ok,
      left_ok, right_ok, slab_end_ok, slab_mid_ok,
    },
  }
}
