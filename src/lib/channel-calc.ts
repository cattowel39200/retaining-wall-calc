import type { ChannelInput } from '@/types/channel'

// ===== Rebar area lookup (reused from wall calc) =====
function _rebarArea(dia: number): number {
  const table: Record<number, number> = {
    10: 71.3, 13: 126.7, 16: 198.6, 19: 286.5,
    22: 387.1, 25: 506.7, 29: 642.4, 32: 794.2,
  }
  return table[dia] ?? (Math.PI / 4 * dia ** 2)
}

// ===== Section Check (reused from wall calc-engine) =====
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
  if (params.H <= 0) throw new Error('벽체 높이(H)는 0보다 커야 합니다.')
  if (params.B <= 0) throw new Error('내폭(B)은 0보다 커야 합니다.')
  if (params.tw <= 0) throw new Error('벽체 두께(tw)는 0보다 커야 합니다.')
  if (params.ts <= 0) throw new Error('저판 두께(ts)는 0보다 커야 합니다.')
  if (params.phi_deg <= 0 || params.phi_deg >= 90) throw new Error('내부마찰각은 0~90° 사이여야 합니다.')

  const { H, B, tw, ts, haunch, Df, gamma_t, phi_deg, c_soil, q, gamma_c, fck, fy } = params
  const gamma_w = 9.81

  // --- Total dimensions ---
  const H_total = H + ts                    // 전체 높이 (벽체+저판)
  const B_total = B + 2 * tw               // 전체 폭 (내폭+벽체2개)
  const H_earth = H + ts + Df              // 지표면~저판하면

  // --- Earth pressure coefficient ---
  const phi_rad = phi_deg * Math.PI / 180
  let Ka: number
  if (params.K0_mode === 'manual' && params.K0_manual > 0) {
    Ka = params.K0_manual
  } else {
    Ka = Math.pow(Math.tan(Math.PI / 4 - phi_rad / 2), 2)
  }

  // --- Live load (DB-24 distributed) ---
  let q_live = 0
  if (params.live_load === 'DB24') {
    // DB-24: 후륜하중 96kN, 분포폭에 따른 등분포 환산
    // 토피에 따른 분산: 분산폭 = 바퀴접지폭 + 2×Df×tan(45°)
    const wheel_load = 96  // kN
    const tire_width = 0.5  // m (접지폭)
    const spread_width = tire_width + 2 * Df * 1.0  // tan(45°)=1
    const spread_length = 0.2 + 2 * Df * 1.0
    q_live = spread_width > 0 && spread_length > 0
      ? wheel_load / (spread_width * spread_length)
      : 0
    q_live = Math.min(q_live, 64)  // 상한 (토피 0일때 최대)
  } else if (params.live_load === 'DB18') {
    const wheel_load = 72  // kN
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

  // --- External loads on side wall (per 1m width) ---
  // Earth pressure (trapezoidal on wall height H)
  const q_top = Ka * (gamma_t * Df + q + q_live)      // 벽체 상단 수평토압 (kN/m²)
  const q_bot = Ka * (gamma_t * (Df + H) + q + q_live) // 벽체 하단 수평토압 (kN/m²)

  // Water pressure — external
  const hw_out_eff = Math.min(params.hw_out, H)
  const pw_out_bot = gamma_w * hw_out_eff  // 외수압 하단 (kN/m²)

  // Water pressure — internal
  const hw_in_eff = Math.min(params.hw_in, H)
  const pw_in_bot = gamma_w * hw_in_eff    // 내수압 하단 (kN/m²)

  // --- Side Wall Analysis (Fixed-free cantilever: fixed at bottom, free at top) ---
  // Total lateral pressure = earth + external water - internal water
  // Net pressure at top of wall
  const w_top = q_top + 0 - 0  // 상단: 토압만 (수압은 하부에서 시작)
  // Net pressure at bottom of wall
  const w_bot = q_bot + pw_out_bot - pw_in_bot

  // Cantilever moment at base (trapezoidal load)
  // M = (w_top × H²/2) + ((w_bot - w_top) × H²/3)  (삼각형+직사각형 분해)
  // 더 정확: M = H²/6 × (2×w_bot + w_top) for trapezoidal
  const Mu_wall = (H * H / 6) * (2 * w_bot + w_top)
  const Vu_wall = (w_top + w_bot) * H / 2

  // Cracking moment (approximate)
  const tw_mm = tw * 1000
  const Mcr_wall = (1 / 6) * (0.63 * Math.sqrt(fck)) * 1000 * tw_mm * tw_mm / 1e6

  // --- Bottom Slab Analysis (Fixed-fixed beam, span = B) ---
  // Vertical loads on slab:
  const w_self = gamma_c * ts                                    // 자중 (kN/m²)
  const w_soil = gamma_t * Df                                     // 토피하중 (kN/m²)
  const w_water_in = gamma_w * hw_in_eff                         // 내수중량 (kN/m²)
  const w_slab_total = w_self + w_soil + q + q_live + w_water_in  // 총 등분포 (kN/m²)

  // Upward: ground reaction (simplified as uniform)
  // Net load = downward total
  const w_net_slab = w_slab_total  // kN/m per 1m width

  // Fixed-fixed beam: M_end = wL²/12, M_mid = wL²/24, V = wL/2
  const Mu_slab_end = w_net_slab * B * B / 12    // 단부 모멘트 (음)
  const Mu_slab_mid = w_net_slab * B * B / 24    // 중앙 모멘트 (양)
  const Vu_slab = w_net_slab * B / 2

  const ts_mm = ts * 1000
  const Mcr_slab = (1 / 6) * (0.63 * Math.sqrt(fck)) * 1000 * ts_mm * ts_mm / 1e6

  // --- Load Combinations ---
  // LCB1 (상시): 1.2D + 1.6L
  // LCB2 (극한): 1.4D (토압+수압) — simplified
  const Mu_wall_u = 1.2 * Mu_wall + 0.6 * Mu_wall * (q_live > 0 ? 1 : 0)
  const Vu_wall_u = 1.2 * Vu_wall + 0.6 * Vu_wall * (q_live > 0 ? 1 : 0)
  const Mu_slab_end_u = 1.2 * Mu_slab_end + 0.6 * Mu_slab_end * (q_live > 0 ? 1 : 0)
  const Mu_slab_mid_u = 1.2 * Mu_slab_mid + 0.6 * Mu_slab_mid * (q_live > 0 ? 1 : 0)
  const Vu_slab_u = 1.2 * Vu_slab + 0.6 * Vu_slab * (q_live > 0 ? 1 : 0)

  // --- Section Checks ---
  // Side wall (내측 = 토압 인장측)
  const sec_wall_in = sectionCheck(
    Mu_wall_u, Mcr_wall, Vu_wall_u,
    tw_mm, params.Dc_wall,
    params.wall_in_dia, _rebarArea(params.wall_in_dia), params.wall_in_spacing,
    fck, fy, '측벽 내측'
  )

  // Side wall (외측)
  const sec_wall_out = sectionCheck(
    Mu_wall_u * 0.5, Mcr_wall, Vu_wall_u * 0.5,
    tw_mm, params.Dc_wall,
    params.wall_out_dia, _rebarArea(params.wall_out_dia), params.wall_out_spacing,
    fck, fy, '측벽 외측'
  )

  // Bottom slab — end (top face in tension = 상면)
  const sec_slab_end = sectionCheck(
    Mu_slab_end_u, Mcr_slab, Vu_slab_u,
    ts_mm, params.Dc_slab,
    params.slab_top_dia, _rebarArea(params.slab_top_dia), params.slab_top_spacing,
    fck, fy, '저판 단부 (상면)'
  )

  // Bottom slab — mid (bottom face in tension = 하면)
  const sec_slab_mid = sectionCheck(
    Mu_slab_mid_u, Mcr_slab, Vu_slab_u * 0.5,
    ts_mm, params.Dc_slab,
    params.slab_bot_dia, _rebarArea(params.slab_bot_dia), params.slab_bot_spacing,
    fck, fy, '저판 중앙 (하면)'
  )

  // --- Judgment ---
  const all_flexure = [sec_wall_in, sec_wall_out, sec_slab_end, sec_slab_mid].every(s => s.flexure_ok)
  const all_shear = [sec_wall_in, sec_wall_out, sec_slab_end, sec_slab_mid].every(s => s.shear_ok)
  const all_crack = [sec_wall_in, sec_wall_out, sec_slab_end, sec_slab_mid].every(s => s.crack_ok)
  const all_ok = all_flexure && all_shear && all_crack

  return {
    // Geometry
    geometry: { H, B, tw, ts, haunch, Df, H_total, B_total, H_earth },
    // Loads
    loads: {
      Ka, q_top, q_bot, pw_out_bot, pw_in_bot, q_live,
      w_net_slab, Mu_wall, Vu_wall,
      Mu_slab_end, Mu_slab_mid, Vu_slab,
      Mu_wall_u, Vu_wall_u,
      Mu_slab_end_u, Mu_slab_mid_u, Vu_slab_u,
    },
    // Member design
    member: {
      wall_in: sec_wall_in,
      wall_out: sec_wall_out,
      slab_end: sec_slab_end,
      slab_mid: sec_slab_mid,
    },
    // Judgment
    judgment: {
      all_ok, all_flexure, all_shear, all_crack,
      wall_in_ok: sec_wall_in.flexure_ok && sec_wall_in.shear_ok && sec_wall_in.crack_ok,
      wall_out_ok: sec_wall_out.flexure_ok && sec_wall_out.shear_ok && sec_wall_out.crack_ok,
      slab_end_ok: sec_slab_end.flexure_ok && sec_slab_end.shear_ok && sec_slab_end.crack_ok,
      slab_mid_ok: sec_slab_mid.flexure_ok && sec_slab_mid.shear_ok && sec_slab_mid.crack_ok,
    },
  }
}
