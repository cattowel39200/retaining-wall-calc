/**
 * 옹벽 구조계산 엔진 (TypeScript 포팅)
 * 원본: calc_engine.py (Python)
 * 적용기준: KDS 11 80 05, KDS 11 80 15, KDS 14 20 20
 */

// 철근 단면적 (mm²)
const REBAR_AREA: Record<number, number> = {
  10: 71.33, 13: 126.7, 16: 198.6, 19: 286.5,
  22: 387.1, 25: 506.7, 29: 642.4, 32: 794.2,
}

// ================================================================
// Terzaghi 지지력 계수 테이블 (phi 단위: 도)
// ================================================================
const TERZAGHI_TABLE: Record<number, [number, number, number]> = {
  0:  [5.700, 1.000, 0.000],
  5:  [7.300, 1.600, 0.500],
  10: [9.600, 2.700, 1.200],
  15: [12.900, 4.400, 2.500],
  20: [17.700, 7.400, 5.000],
  25: [25.100, 12.700, 9.700],
  26: [27.100, 14.210, 11.250],
  27: [29.240, 15.900, 13.200],
  28: [31.610, 17.810, 15.700],
  29: [34.240, 19.980, 18.600],
  30: [37.200, 22.500, 19.700],
  31: [40.410, 25.280, 22.700],
  32: [44.040, 28.520, 27.900],
  33: [48.090, 32.230, 31.100],
  34: [52.640, 36.500, 36.000],
  35: [57.800, 41.400, 42.400],
  40: [95.700, 81.300, 100.400],
  45: [172.300, 173.300, 297.500],
};

function _interpTerzaghi(phi_deg: number): [number, number, number] {
  const keys = Object.keys(TERZAGHI_TABLE).map(Number).sort((a, b) => a - b);
  if (phi_deg <= keys[0]) {
    return TERZAGHI_TABLE[keys[0]];
  }
  if (phi_deg >= keys[keys.length - 1]) {
    return TERZAGHI_TABLE[keys[keys.length - 1]];
  }
  for (let i = 0; i < keys.length - 1; i++) {
    if (keys[i] <= phi_deg && phi_deg <= keys[i + 1]) {
      const lo = keys[i];
      const hi = keys[i + 1];
      const t = (phi_deg - lo) / (hi - lo);
      const Nc = TERZAGHI_TABLE[lo][0] + t * (TERZAGHI_TABLE[hi][0] - TERZAGHI_TABLE[lo][0]);
      const Nq = TERZAGHI_TABLE[lo][1] + t * (TERZAGHI_TABLE[hi][1] - TERZAGHI_TABLE[lo][1]);
      const Nr = TERZAGHI_TABLE[lo][2] + t * (TERZAGHI_TABLE[hi][2] - TERZAGHI_TABLE[lo][2]);
      return [Nc, Nq, Nr];
    }
  }
  return TERZAGHI_TABLE[keys[keys.length - 1]];
}

function _rebarArea(dia: number): number {
  const table: Record<number, number> = {
    10: 71.3, 13: 126.7, 16: 198.6, 19: 286.5,
    22: 387.1, 25: 506.7, 29: 642.4, 32: 794.2,
  };
  return table[dia] ?? (Math.PI / 4 * dia ** 2);
}

export function calculateWall(params: Record<string, any>): Record<string, any> {
  // --- 입력값 사전 검증 ---
  const _H = params['H'];
  const _B = params['B'];
  const _phi = params['phi_deg'];
  if (!_H || _H <= 0) throw new Error(`옹벽 총 높이(H)는 0보다 커야 합니다. (입력값: ${_H})`);
  if (!_B || _B <= 0) throw new Error(`기초 총 폭(B)은 0보다 커야 합니다. (입력값: ${_B})`);
  if (!_phi || _phi <= 0 || _phi >= 90) throw new Error(`내부마찰각(phi)은 0~90° 사이여야 합니다. (입력값: ${_phi})`);

  // --- 옹벽 형식 ---
  const wall_type = params['wall_type'] ?? 'L형';
  const is_gravity = (wall_type === '중력식');
  const is_semi_gravity = (params['semi_gravity'] ?? false) && is_gravity;

  // --- 입력값 추출 ---
  const H = params['H'] || 0;
  const B = params['B'] || 0;

  // 치수 미입력 시 조기 반환
  if (H <= 0 || B <= 0) {
    return { error: '옹벽 치수(H, B)를 입력해 주세요.' };
  }
  const t_stem = params['t_stem'];
  const batter = params['batter'] ?? 0.0;
  const batter_back = params['batter_back'] ?? 0.0;
  const conn_h = params['conn_h'] ?? 0.0;
  const t_stem_bot = t_stem + batter + batter_back;
  const H_stem = params['H_stem'];
  const D_slab = params['D_slab'];
  const C6_toe = params['C6_toe'];
  let C8_heel = params['C8_heel'];

  // 역L형: Heel 강제 0
  if (wall_type === '역L형') {
    C8_heel = 0.0;
  }
  const Hs_soil = params['Hs_soil'];
  const Df = params['Df'];
  const gamma_c = params['gamma_c'];
  const gamma_t = params['gamma_t'];
  const gamma_sat = params['gamma_sat'] ?? 20.0;
  const phi_deg = params['phi_deg'];
  const c_soil = params['c_soil'];
  const alpha_deg = params['alpha_deg'];
  const q = params['q'];
  const Kh = params['Kh'];
  const fck = params['fck'];
  const fy = params['fy'];
  const gwl_height = params['gwl_height'] ?? 0.0;

  const rebar1_dia = params['rebar1_dia'] ?? 13;
  const rebar1_spacing = params['rebar1_spacing'] || 125;
  const rebar2_dia = params['rebar2_dia'] ?? 13;
  const rebar2_spacing = params['rebar2_spacing'] || 250;
  const rebar3_dia = params['rebar3_dia'] ?? rebar1_dia;
  const rebar3_spacing = params['rebar3_spacing'] || rebar1_spacing;

  const rebar_toe_dia = params['rebar_toe_dia'] ?? rebar1_dia;
  const rebar_toe_spacing = params['rebar_toe_spacing'] || rebar1_spacing;

  const rebar1_area = _rebarArea(rebar1_dia);
  const rebar2_area = _rebarArea(rebar2_dia);
  const rebar3_area = _rebarArea(rebar3_dia);
  const rebar_toe_area = _rebarArea(rebar_toe_dia);

  // Toe 유효길이 및 has_toe/has_heel 판별
  const L_toe_eff = Math.max(C6_toe - t_stem - batter, 0.0);
  let has_toe: boolean;
  let has_heel: boolean;
  if (is_gravity) {
    has_toe = false;
    has_heel = false;
  } else {
    has_toe = (wall_type === '역L형' || wall_type === '역T형') || (L_toe_eff >= 0.2 - 1e-9);
    has_heel = (wall_type !== '역L형') && (C8_heel > 0.01);
  }

  const He = D_slab + Hs_soil;

  const phi = phi_deg * Math.PI / 180;
  const alpha = alpha_deg * Math.PI / 180;
  const sin_a = Math.sin(alpha);

  const [Nc, Nq, Nr] = _interpTerzaghi(phi_deg);

  // 피복두께
  const Dc_slab = params['Dc_slab'] ?? 80.0;
  const Dc_wall = params['Dc_wall'] ?? 80.0;
  const Dc_toe = params['Dc_toe'] ?? Dc_slab;
  const Es = 200000.0;

  const gamma_w = 9.81;
  const gamma_sub = gwl_height > 0 ? gamma_sat - gamma_w : 0.0;

  // ================================================================
  // 3.1 자중 블록
  // ================================================================
  let h_dry: number;
  let h_wet: number;
  if (gwl_height > 0) {
    h_dry = Math.max(Hs_soil - gwl_height, 0);
    h_wet = Math.min(gwl_height, Hs_soil);
  } else {
    h_dry = Hs_soil;
    h_wet = 0.0;
  }

  const D_slab_end = params['D_slab_end'] ?? D_slab;
  const taper = D_slab - D_slab_end;

  let c_blocks: [string, number, number, number, number][];
  let s_blocks: [string, number, number, number, number][];

  let A_C1: number;
  let A_C2: number;
  let A_C3: number;
  let A_C5: number;
  let A_C6: number;
  let A_C7: number;
  let A_C8: number;

  if (is_gravity) {
    const A_grav = (t_stem + B) / 2 * H;
    const A_rect = t_stem * H;
    const A_tri_f = batter > 0 ? 0.5 * batter * H : 0.0;
    const A_tri_b = batter_back > 0 ? 0.5 * batter_back * H : 0.0;
    const x_rect = batter + t_stem / 2;
    const x_tri_f = batter > 0 ? batter * 2 / 3 : 0.0;
    const x_tri_b = batter_back > 0 ? (batter + t_stem + batter_back / 3) : 0.0;
    let x_grav: number;
    if (A_grav > 0) {
      x_grav = (A_rect * x_rect + A_tri_f * x_tri_f + A_tri_b * x_tri_b) / A_grav;
    } else {
      x_grav = B / 2;
    }
    let y_grav = H / 3;
    if (A_grav > 0) {
      y_grav = (A_rect * (H / 2) + A_tri_f * (H / 3) + A_tri_b * (H / 3)) / A_grav;
    }
    c_blocks = [
      ["벽체", A_grav, gamma_c, x_grav, y_grav],
    ];
    s_blocks = [
      ["S1", 0.0, gamma_t, 0.0, 0.0],
    ];
    A_C1 = A_tri_f;
    A_C2 = A_rect;
    A_C3 = A_tri_b;
    A_C5 = 0.0;
    A_C6 = 0.0;
    A_C7 = 0.0;
    A_C8 = 0.0;
  } else {
    // ---- L형/역L형/역T형 공통 ----
    A_C1 = batter > 0 ? 0.5 * batter * H_stem : 0.0;
    const x_C1 = batter > 0 ? (C6_toe - t_stem - batter / 3) : 0.0;
    const y_C1 = batter > 0 ? (D_slab + H_stem / 3) : 0.0;

    A_C2 = t_stem * H_stem;
    const x_C2 = C6_toe - t_stem / 2;
    const y_C2 = D_slab + conn_h + H_stem / 2;

    A_C3 = batter_back > 0 ? 0.5 * batter_back * H_stem : 0.0;
    const x_C3 = batter_back > 0 ? (C6_toe + batter_back / 3) : 0.0;
    const y_C3 = batter_back > 0 ? (D_slab + conn_h + H_stem / 3) : 0.0;

    A_C5 = conn_h > 0 ? t_stem_bot * conn_h : 0.0;
    const x_C5 = conn_h > 0 ? (C6_toe - t_stem / 2 - batter / 2 + batter_back / 2) : 0.0;
    const y_C5 = conn_h > 0 ? D_slab + conn_h / 2 : 0.0;

    A_C6 = C6_toe * D_slab;
    const x_C6 = C6_toe / 2;
    const y_C6 = D_slab / 2;

    let x_C7: number;
    let y_C7: number;
    if (taper > 0 && C8_heel > 0) {
      A_C7 = 0.5 * taper * C8_heel;
      x_C7 = C6_toe + C8_heel / 3;
      y_C7 = D_slab_end + taper * 2 / 3;
    } else {
      A_C7 = 0.0; x_C7 = 0.0; y_C7 = 0.0;
    }

    A_C8 = C8_heel * D_slab_end;
    const x_C8 = C6_toe + C8_heel / 2;
    const y_C8 = D_slab_end / 2;

    c_blocks = [
      ["C1", A_C1, gamma_c, x_C1, y_C1],
      ["C2", A_C2, gamma_c, x_C2, y_C2],
      ["C3", A_C3, gamma_c, x_C3, y_C3],
      ["C4", 0.0, gamma_c, 0.0, 0.0],
      ["C5", A_C5, gamma_c, x_C5, y_C5],
      ["C6", A_C6, gamma_c, x_C6, y_C6],
      ["C7", A_C7, gamma_c, x_C7, y_C7],
      ["C8", A_C8, gamma_c, x_C8, y_C8],
    ];

    // 토사 블록
    if (gwl_height > 0 && h_wet > 0) {
      const A_S1a = C8_heel * h_dry;
      const x_S1a = C6_toe + C8_heel / 2;
      const y_S1a = h_dry > 0 ? D_slab + h_wet + h_dry / 2 : 0.0;

      const A_S1b = C8_heel * h_wet;
      const x_S1b = C6_toe + C8_heel / 2;
      const y_S1b = D_slab + h_wet / 2;

      let A_S2: number, x_S2: number, y_S2: number;
      if (batter_back > 0 && H_stem > 0) {
        A_S2 = 0.5 * batter_back * H_stem;
        x_S2 = C6_toe + batter_back * 2 / 3;
        y_S2 = D_slab + conn_h + H_stem * 2 / 3;
      } else {
        A_S2 = 0.0; x_S2 = 0.0; y_S2 = 0.0;
      }

      let A_S5: number, x_S5: number, y_S5: number;
      if (taper > 0 && C8_heel > 0) {
        A_S5 = 0.5 * taper * C8_heel;
        x_S5 = C6_toe + C8_heel * 2 / 3;
        y_S5 = (D_slab + D_slab_end) > 0 ? D_slab_end + (D_slab - D_slab_end) / 3 * (D_slab + 2 * D_slab_end) / (D_slab + D_slab_end) : D_slab / 3;
      } else {
        A_S5 = 0.0; x_S5 = 0.0; y_S5 = 0.0;
      }

      s_blocks = [
        ["S1a", A_S1a, gamma_t, x_S1a, y_S1a],
        ["S1b", A_S1b, gamma_sub, x_S1b, y_S1b],
        ["S2", A_S2, gamma_t, x_S2, y_S2],
        ["S3", 0.0, gamma_t, 0.0, 0.0],
        ["S4", 0.0, gamma_t, 0.0, 0.0],
        ["S5", A_S5, gamma_t, x_S5, y_S5],
      ];
    } else {
      const A_S1 = C8_heel * Hs_soil;
      const x_S1 = C6_toe + C8_heel / 2;
      const y_S1 = D_slab + Hs_soil / 2;

      let A_S2: number, x_S2: number, y_S2: number;
      if (batter_back > 0 && H_stem > 0) {
        A_S2 = 0.5 * batter_back * H_stem;
        x_S2 = C6_toe + batter_back * 2 / 3;
        y_S2 = D_slab + conn_h + H_stem * 2 / 3;
      } else {
        A_S2 = 0.0; x_S2 = 0.0; y_S2 = 0.0;
      }

      let A_S5: number, x_S5: number, y_S5: number;
      if (taper > 0 && C8_heel > 0) {
        A_S5 = 0.5 * taper * C8_heel;
        x_S5 = C6_toe + C8_heel * 2 / 3;
        y_S5 = (D_slab + D_slab_end) > 0 ? D_slab_end + (D_slab - D_slab_end) / 3 * (D_slab + 2 * D_slab_end) / (D_slab + D_slab_end) : D_slab / 3;
      } else {
        A_S5 = 0.0; x_S5 = 0.0; y_S5 = 0.0;
      }

      s_blocks = [
        ["S1", A_S1, gamma_t, x_S1, y_S1],
        ["S2", A_S2, gamma_t, x_S2, y_S2],
        ["S3", 0.0, gamma_t, 0.0, 0.0],
        ["S4", 0.0, gamma_t, 0.0, 0.0],
        ["S5", A_S5, gamma_t, x_S5, y_S5],
      ];
    }
  }

  function calcBlock(name: string, A: number, gamma: number, x: number, y: number) {
    const W = A * gamma;
    const KhW = W * Kh;
    const Mr = W * x;
    const Mo = KhW * y;
    return { name, A, gamma, W, Kh, KhW, x, y, Mr, Mo };
  }

  const c_results = c_blocks.map(b => calcBlock(...b));
  const s_results = s_blocks.map(b => calcBlock(...b));

  const Wc = c_results.reduce((s, r) => s + r.W, 0);
  const KhWc = c_results.reduce((s, r) => s + r.KhW, 0);
  const Mrc = c_results.reduce((s, r) => s + r.Mr, 0);
  const Moc = c_results.reduce((s, r) => s + r.Mo, 0);

  const Ws = s_results.reduce((s, r) => s + r.W, 0);
  const KhWs = s_results.reduce((s, r) => s + r.KhW, 0);
  const Mrs = s_results.reduce((s, r) => s + r.Mr, 0);
  const Mos = s_results.reduce((s, r) => s + r.Mo, 0);

  const Wt = Wc + Ws;
  const KhWt = KhWc + KhWs;
  const Mrt = Mrc + Mrs;
  const Mot = Moc + Mos;

  // ================================================================
  // 토압 계산
  // ================================================================
  const cos_a = Math.cos(alpha);
  const cos2_a = cos_a ** 2;
  const cos2_phi = Math.cos(phi) ** 2;
  const Ka = cos_a * (cos_a - Math.sqrt(Math.max(cos2_a - cos2_phi, 0))) /
       (cos_a + Math.sqrt(Math.max(cos2_a - cos2_phi, 0)));

  let Pa_total: number;
  let Pa_h: number;
  let Pa_v: number;
  let ya: number;
  let Pw: number;
  let U: number;

  if (gwl_height > 0) {
    const h_dry_ep = Math.max(He - gwl_height, 0);
    const h_wet_ep = Math.min(gwl_height, He);
    const sigma_dry = gamma_t * h_dry_ep;
    const Pa_dry_total = 0.5 * Ka * gamma_t * h_dry_ep ** 2;
    const sigma_top_wet = Ka * sigma_dry;
    const sigma_bot_wet = Ka * (sigma_dry + gamma_sub * h_wet_ep);
    const Pa_wet_total = (sigma_top_wet + sigma_bot_wet) / 2 * h_wet_ep;
    Pa_total = Pa_dry_total + Pa_wet_total;
    Pa_h = Pa_total * cos_a;
    Pa_v = Pa_total * sin_a;
    Pw = 0.5 * gamma_w * gwl_height ** 2;
    U = gamma_w * gwl_height * B;
    if (Pa_total > 0) {
      const ya_dry = Pa_dry_total > 0 ? h_wet_ep + h_dry_ep / 3 : 0;
      let ya_wet: number;
      if ((sigma_top_wet + sigma_bot_wet) > 0) {
        ya_wet = h_wet_ep / 3 * (sigma_top_wet + 2 * sigma_bot_wet) / (sigma_top_wet + sigma_bot_wet);
      } else {
        ya_wet = h_wet_ep / 3;
      }
      ya = Pa_total > 0 ? (Pa_dry_total * ya_dry + Pa_wet_total * ya_wet) / Pa_total : He / 3;
    } else {
      ya = He / 3;
    }
  } else {
    Pa_total = 0.5 * Ka * gamma_t * He ** 2;
    Pa_h = Pa_total * cos_a;
    Pa_v = Pa_total * sin_a;
    ya = He / 3;
    Pw = 0.0;
    U = 0.0;
  }

  const Mo_pa = Pa_h * ya;
  const Mr_pa_v = Pa_v * C6_toe;

  // M-O 토압계수 (안정검토, delta=0)
  const Kv = 0.0;  // 수직지진가속도계수
  const theta_rad = Math.atan(Kh / ((1 - Kv) || 0.001));
  const beta_rad = 0.0;
  const delta_stab = 0.0;

  const num_KAE = Math.cos(phi - theta_rad - beta_rad) ** 2;
  const sin_pd = Math.sin(phi + delta_stab);
  let sin_pta = Math.sin(phi - theta_rad - alpha);
  const cos_theta = Math.cos(theta_rad);
  const cos2_beta = Math.cos(beta_rad) ** 2;
  const cos_dbt = Math.cos(delta_stab + beta_rad + theta_rad);
  const cos_ab = Math.cos(alpha - beta_rad);

  if (sin_pta < 0) {
    sin_pta = 0;
  }
  let denom_product = cos_dbt * cos_ab;
  if (denom_product <= 0) {
    denom_product = 1e-10;
  }
  const inner_sqrt = Math.sqrt(sin_pd * Math.max(sin_pta, 0)) / Math.sqrt(denom_product);
  let den_KAE = cos_theta * cos2_beta * cos_dbt * (1 + inner_sqrt) ** 2;
  if (den_KAE === 0) {
    den_KAE = 1e-10;
  }
  const KAE = num_KAE / den_KAE;

  const PAE = 0.5 * KAE * gamma_t * He ** 2;
  const yae = He / 2;
  const Mo_pae = PAE * yae;

  // 과재하중
  const Ph_sur = Ka * q * He * cos_a;
  const Pv_sur_ep = Ka * q * He * sin_a;
  const L_sur = C8_heel + batter_back;
  const x_Pv_start = C6_toe - batter_back;
  const Pv_sur = q * L_sur;
  const ya_sur = He / 2;
  const x_Pv = x_Pv_start + L_sur / 2;
  const Mo_ph = Ph_sur * ya_sur;
  const Mr_pv = Pv_sur * x_Pv;

  // ================================================================
  // 3.2 안정검토용 하중집계
  // ================================================================
  const SVn = Wt + Pv_sur + Pa_v - (gwl_height > 0 ? U : 0);
  const SHn = Pa_h + Ph_sur + (gwl_height > 0 ? Pw : 0);
  const SMrn = Mrt + Mr_pv + Mr_pa_v;
  const SMon = Mo_pa + Mo_ph + (gwl_height > 0 ? Pw * gwl_height / 3 : 0);

  const SVe = Wt - (gwl_height > 0 ? U : 0);
  const SHe = PAE + KhWt + (gwl_height > 0 ? Pw : 0);
  const SMre = Mrt;
  const SMe = Mot + Mo_pae + (gwl_height > 0 ? Pw * gwl_height / 3 : 0);

  // ================================================================
  // 3.3 전도
  // ================================================================
  const B6 = B / 6;
  const B3 = B / 3;

  const e_n = SVn !== 0 ? B / 2 - (SMrn - SMon) / SVn : 0;
  const SF_ot_n = SMon !== 0 ? SMrn / SMon : 999.0;

  const e_e = SVe !== 0 ? B / 2 - (SMre - SMe) / SVe : 0;
  const SF_ot_e = SMe !== 0 ? SMre / SMe : 999.0;

  // ================================================================
  // 3.4 지지력
  // ================================================================
  const phi2_deg = params['phi2_deg'] ?? phi_deg;
  const gamma_found = params['gamma_found'] ?? gamma_t;
  const [Nc2, Nq2, Nr2] = _interpTerzaghi(phi2_deg);

  const alpha_T = 1.0;
  const beta_T = 0.5;

  const qa_fixed = params['qa_fixed'] ?? 0.0;
  const qae_fixed = params['qae_fixed'] ?? 0.0;

  let Be_n = B - 2 * e_n;
  if (Be_n < 0) {
    Be_n = 0.01;
  }
  const qu_n = alpha_T * c_soil * Nc2 + gamma_found * Df * Nq2 + beta_T * gamma_found * Be_n * Nr2;
  const qa_n = qa_fixed > 0 ? qa_fixed : qu_n / 3;

  let Q1_n: number;
  let Q2_n: number;
  if (e_n > B6) {
    const denom_n = 3 * (B / 2 - e_n);
    Q1_n = denom_n > 0 ? 2 * SVn / (denom_n * 1) : 0;
    Q2_n = 0.0;
  } else {
    Q1_n = SVn / (B * 1) * (1 + 6 * e_n / B);
    Q2_n = SVn / (B * 1) * (1 - 6 * e_n / B);
  }

  let Be_e = B - 2 * e_e;
  if (Be_e < 0) {
    Be_e = 0.01;
  }
  const qu_e = alpha_T * c_soil * Nc2 + gamma_found * Df * Nq2 + beta_T * gamma_found * Be_e * Nr2;
  const qa_e = qae_fixed > 0 ? qae_fixed : qu_e / 2;

  let Q1_e: number;
  let Q2_e: number;
  if (e_e > B6) {
    const denom_e = 3 * (B / 2 - e_e);
    Q1_e = denom_e > 0 ? 2 * SVe / (denom_e * 1) : 0;
    Q2_e = 0.0;
  } else {
    Q1_e = SVe / (B * 1) * (1 + 6 * e_e / B);
    Q2_e = SVe / (B * 1) * (1 - 6 * e_e / B);
  }

  // ================================================================
  // 3.5 활동
  // ================================================================
  const phi_B = phi2_deg * 2 / 3;
  const mu = Math.tan(phi_B * Math.PI / 180);

  const passive_enabled = params['passive_enabled'] ?? false;
  const passive_ratio_pct = params['passive_ratio'] ?? 0;
  const Kp = Math.tan(Math.PI / 4 + phi / 2) ** 2;
  let Pp = 0.0;
  if (passive_enabled && passive_ratio_pct > 0 && Df > 0) {
    const gamma_front = params['gamma_t'] ?? 19.0;
    const Pp_full = 0.5 * Kp * gamma_front * Df ** 2;
    Pp = Pp_full * passive_ratio_pct / 100.0;
  }

  const key_enabled = params['key_enabled'] ?? false;
  const key_depth = params['key_depth'] ?? 0.0;
  const key_width = params['key_width'] ?? 0.0;
  let Pp_key = 0.0;
  let W_key = 0.0;
  let M_key = 0.0;
  if (key_enabled && key_depth > 0) {
    const gamma_front = params['gamma_t'] ?? 19.0;
    const h_top = Df + D_slab;
    const h_bot = h_top + key_depth;
    Pp_key = 0.5 * Kp * gamma_front * (h_bot ** 2 - h_top ** 2);
    W_key = gamma_c * key_width * key_depth;
    // 전단키 자중 모멘트 (기초 좌단 기준)
    const x_key = params['key_x'] ?? (C6_toe + key_width / 2);
    M_key = W_key * x_key;
  }

  const Hr_n = c_soil * B + SVn * mu + Pp + Pp_key;
  const SF_sl_n = SHn !== 0 ? Hr_n / SHn : 999.0;

  const Hr_e = c_soil * B + SVe * mu + Pp + Pp_key;
  const SF_sl_e = SHe !== 0 ? Hr_e / SHe : 999.0;

  // ================================================================
  // 4. 단면검토
  // ================================================================
  const delta_c_deg = 10.0;
  const delta_c = delta_c_deg * Math.PI / 180;
  const theta_c_deg = (batter_back > 0 && H_stem > 0) ? (Math.atan(batter_back / H_stem) * 180 / Math.PI) : 0.0;
  const theta_c = theta_c_deg * Math.PI / 180;

  const num_Ka_c = Math.cos(phi - theta_c) ** 2;
  const sin_pd_c = Math.sin(phi + delta_c);
  const sin_pa_c = Math.sin(phi - alpha);
  const cos2_theta_c = Math.cos(theta_c) ** 2;
  const cos_td_c = Math.cos(theta_c + delta_c);
  const cos_ta_c = Math.cos(theta_c - alpha);
  let denom_prod_c = cos_td_c * cos_ta_c;
  if (denom_prod_c <= 0) {
    denom_prod_c = 1e-10;
  }
  const inner_c = Math.sqrt(sin_pd_c * Math.max(sin_pa_c, 0)) / Math.sqrt(denom_prod_c);
  const den_Ka_c = cos2_theta_c * cos_td_c * (1 + inner_c) ** 2;
  const Ka_coul = den_Ka_c !== 0 ? num_Ka_c / den_Ka_c : Ka;
  const Kah = Ka_coul * Math.cos(delta_c + theta_c);

  // M-O (단면검토, delta=0, beta=theta=옹벽배면경사각)
  const beta_design = theta_c;
  const delta_design = 0.0;
  const theta_mo_d = Math.atan(Kh / (1 - 0));

  const num_Kae_d = Math.cos(phi - theta_mo_d - beta_design) ** 2;
  const sin_pd_d = Math.sin(phi + delta_design);
  let sin_pta_d = Math.sin(phi - theta_mo_d - alpha);
  if (sin_pta_d < 0) {
    sin_pta_d = 0;
  }
  const cos_theta_d = Math.cos(theta_mo_d);
  const cos2_beta_d = Math.cos(beta_design) ** 2;
  const cos_dbt_d = Math.cos(delta_design + beta_design + theta_mo_d);
  const cos_ab_d = Math.cos(alpha - beta_design);
  let denom_prod_d = cos_dbt_d * cos_ab_d;
  if (denom_prod_d <= 0) {
    denom_prod_d = 1e-10;
  }
  const inner_d = Math.sqrt(sin_pd_d * Math.max(sin_pta_d, 0)) / Math.sqrt(denom_prod_d);
  let den_Kae_d = cos_theta_d * cos2_beta_d * cos_dbt_d * (1 + inner_d) ** 2;
  if (den_Kae_d === 0) {
    den_Kae_d = 1e-10;
  }
  const Kae_design = num_Kae_d / den_Kae_d;
  const Kaeh_design = Kae_design * Math.cos(beta_design);

  // --- LCB 하중조합 ---
  const SV_lcb1 = 1.2 * Wt + 1.6 * Pv_sur - (gwl_height > 0 ? 1.2 * U : 0);
  const SMr_lcb1 = 1.2 * Mrt + 1.6 * Mr_pv;
  const SMo_lcb1 = 1.6 * (Mo_pa + Mo_ph) + (gwl_height > 0 ? 1.6 * Pw * gwl_height / 3 : 0);
  const SH_lcb1 = 1.6 * Pa_h + 1.6 * Ph_sur + (gwl_height > 0 ? 1.6 * Pw : 0);

  const e_lcb1 = SV_lcb1 !== 0 ? B / 2 - (SMr_lcb1 - SMo_lcb1) / SV_lcb1 : 0;
  let Q1_lcb1: number;
  let Q2_lcb1: number;
  if (e_lcb1 > B6) {
    const denom_l1 = 3 * (B / 2 - e_lcb1);
    Q1_lcb1 = denom_l1 > 0 ? 2 * SV_lcb1 / (denom_l1 * 1) : 0;
    Q2_lcb1 = 0.0;
  } else {
    Q1_lcb1 = SV_lcb1 / (B * 1) * (1 + 6 * e_lcb1 / B);
    Q2_lcb1 = SV_lcb1 / (B * 1) * (1 - 6 * e_lcb1 / B);
  }

  const SV_lcb2 = 0.9 * Wt - (gwl_height > 0 ? 0.9 * U : 0);
  const SMr_lcb2 = 0.9 * Mrt;
  const SMo_lcb2 = 1.0 * Mot + 1.0 * Mo_pae + (gwl_height > 0 ? 1.0 * Pw * gwl_height / 3 : 0);
  const SH_lcb2 = 1.0 * PAE + 1.0 * KhWt + (gwl_height > 0 ? 1.0 * Pw : 0);

  const e_lcb2 = SV_lcb2 !== 0 ? B / 2 - (SMr_lcb2 - SMo_lcb2) / SV_lcb2 : 0;
  let Q1_lcb2: number;
  let Q2_lcb2: number;
  if (e_lcb2 > B6) {
    const denom_l2 = 3 * (B / 2 - e_lcb2);
    Q1_lcb2 = denom_l2 > 0 ? 2 * SV_lcb2 / (denom_l2 * 1) : 0;
    Q2_lcb2 = 0.0;
  } else {
    Q1_lcb2 = SV_lcb2 / (B * 1) * (1 + 6 * e_lcb2 / B);
    Q2_lcb2 = SV_lcb2 / (B * 1) * (1 - 6 * e_lcb2 / B);
  }

  const SV_lcb3 = SVn;
  const SMr_lcb3 = SMrn;
  const SMo_lcb3 = SMon;
  const e_lcb3 = e_n;
  const Q1_lcb3 = Q1_n;
  const Q2_lcb3 = Q2_n;

  // ================================================================
  // 뒷굼판 (Heel) 단면력
  // ================================================================
  const L_heel = C8_heel;
  const w_heel_slab = !is_gravity ? D_slab * gamma_c : 0.0;
  const w_heel_soil = !is_gravity ? Hs_soil * gamma_t : 0.0;
  const w_heel_sur_live = q;

  function _qAtPos(Q1v: number, Q2v: number, e_v: number, x_pos: number): number {
    if (e_v > B6) {
      const eff_w = 3 * (B / 2 - e_v);
      if (eff_w <= 0 || x_pos >= eff_w) {
        return 0.0;
      }
      return Q1v * (1 - x_pos / eff_w);
    }
    return B !== 0 ? Q1v - (Q1v - Q2v) * x_pos / B : 0;
  }

  const q_at_stem_lcb1 = _qAtPos(Q1_lcb1, Q2_lcb1, e_lcb1, C6_toe);
  const q_at_end_lcb1 = e_lcb1 <= B6 ? Q2_lcb1 : 0.0;

  const q_at_stem_lcb2 = _qAtPos(Q1_lcb2, Q2_lcb2, e_lcb2, C6_toe);
  let q_at_end_lcb2: number;
  if (e_lcb2 > B6) {
    const eff_w2 = 3 * (B / 2 - e_lcb2);
    q_at_end_lcb2 = B >= eff_w2 ? 0.0 : Q1_lcb2 * (1 - B / eff_w2);
  } else {
    q_at_end_lcb2 = Q2_lcb2;
  }

  const q_at_stem_lcb3 = _qAtPos(Q1_lcb3, Q2_lcb3, e_lcb3, C6_toe);
  const q_at_end_lcb3 = Q2_lcb3;

  function heelForces(
    q_stem_r: number, q_end_r: number,
    f_D: number, f_L: number, f_H: number,
    include_sur: boolean = true,
  ) {
    const V_slab = f_D * w_heel_slab * L_heel;
    const V_soil = f_D * w_heel_soil * L_heel;
    const V_sur = include_sur ? f_L * w_heel_sur_live * L_heel : 0.0;
    const V_react = -(q_stem_r + q_end_r) / 2 * L_heel;
    const V_pv = 0.0;

    const M_slab = f_D * w_heel_slab * L_heel ** 2 / 2;
    const M_soil = f_D * w_heel_soil * L_heel ** 2 / 2;
    const M_sur = include_sur ? f_L * w_heel_sur_live * L_heel ** 2 / 2 : 0.0;
    const M_react = -(L_heel ** 2 / 6 * (q_stem_r + 2 * q_end_r));
    const M_pv = 0.0;

    const V_total = V_slab + V_soil + V_sur + V_react + V_pv;
    const M_total = M_slab + M_soil + M_sur + M_react + M_pv;

    return {
      V_slab, V_soil, V_sur,
      V_react, V_pv, V_total,
      M_slab, M_soil, M_sur,
      M_react, M_pv, M_total,
    };
  }

  let heel_lcb1: Record<string, number>;
  let heel_lcb2: Record<string, number>;
  let heel_lcb3: Record<string, number>;

  if (has_heel) {
    heel_lcb1 = heelForces(q_at_stem_lcb1, q_at_end_lcb1, 1.2, 1.6, 1.6);
    heel_lcb2 = heelForces(q_at_stem_lcb2, q_at_end_lcb2, 0.9, 0.0, 1.0, false);
    heel_lcb3 = heelForces(q_at_stem_lcb3, q_at_end_lcb3, 1.0, 1.0, 1.0);
  } else {
    const _zero_heel = {
      V_slab: 0, V_soil: 0, V_sur: 0, V_react: 0, V_pv: 0, V_total: 0,
      M_slab: 0, M_soil: 0, M_sur: 0, M_react: 0, M_pv: 0, M_total: 0,
    };
    heel_lcb1 = _zero_heel;
    heel_lcb2 = _zero_heel;
    heel_lcb3 = _zero_heel;
  }

  // ================================================================
  // 앞굽판 (Toe) 단면력
  // ================================================================
  const w_toe_slab = D_slab * gamma_c;
  const toe_front_x = C6_toe - t_stem - batter;

  function _qToeAtPos(Q1v: number, Q2v: number, e_v: number, x_global: number): number {
    if (e_v > B6) {
      const eff_w = 3 * (B / 2 - e_v);
      if (eff_w <= 0 || x_global >= eff_w) {
        return 0.0;
      }
      return Q1v * (1 - x_global / eff_w);
    }
    return B !== 0 ? Q1v - (Q1v - Q2v) * x_global / B : 0;
  }

  function toeForces(Q1_r: number, Q2_r: number, e_v: number, f_D: number) {
    const q_at_left = _qToeAtPos(Q1_r, Q2_r, e_v, 0);
    const q_at_face = _qToeAtPos(Q1_r, Q2_r, e_v, toe_front_x);

    const V_slab = f_D * w_toe_slab * L_toe_eff;
    const V_react = -(q_at_left + q_at_face) / 2 * L_toe_eff;
    const V_total = V_slab + V_react;

    const M_slab = f_D * w_toe_slab * L_toe_eff ** 2 / 2;
    const M_react = -(L_toe_eff ** 2 / 6 * (2 * q_at_face + q_at_left));
    const M_total = M_slab + M_react;

    return {
      V_slab, V_react, V_total,
      M_slab, M_react, M_total,
      q_at_left, q_at_face,
    };
  }

  let toe_lcb1: Record<string, number> | null;
  let toe_lcb2: Record<string, number> | null;
  let toe_lcb3: Record<string, number> | null;

  if (has_toe) {
    toe_lcb1 = toeForces(Q1_lcb1, Q2_lcb1, e_lcb1, 1.2);
    toe_lcb2 = toeForces(Q1_lcb2, Q2_lcb2, e_lcb2, 0.9);
    toe_lcb3 = toeForces(Q1_lcb3, Q2_lcb3, e_lcb3, 1.0);
  } else {
    toe_lcb1 = null;
    toe_lcb2 = null;
    toe_lcb3 = null;
  }

  // ================================================================
  // 벽체 단면력
  // ================================================================
  const H_wall_cc = H_stem;
  const H_wall_dd = H_stem / 2;

  const Pa_cc = 0.5 * Kah * gamma_t * H_wall_cc ** 2;
  const Mo_cc_Pa = Pa_cc * H_wall_cc / 3;
  const Pa_dd = 0.5 * Kah * gamma_t * H_wall_dd ** 2;
  const Mo_dd_Pa = Pa_dd * H_wall_dd / 3;

  const Pae_cc = 0.5 * Kaeh_design * gamma_t * H_wall_cc ** 2;
  const Mo_cc_Pae = Pae_cc * H_wall_cc / 2;
  const Pae_dd = 0.5 * Kaeh_design * gamma_t * H_wall_dd ** 2;
  const Mo_dd_Pae = Pae_dd * H_wall_dd / 2;

  const Ph1_cc = Kah * q * H_wall_cc;
  const Mo_ph1_cc = Ph1_cc * H_wall_cc / 2;
  const Ph1_dd = Kah * q * H_wall_dd;
  const Mo_ph1_dd = Ph1_dd * H_wall_dd / 2;

  // [H-05] 관성력 - batter 반영
  const inertia_W_cc = (A_C2 + A_C1 + A_C3 + A_C5) * gamma_c;
  const inertia_H_cc = inertia_W_cc * Kh;
  const total_A_wall = A_C2 + A_C1 + A_C3 + A_C5;
  let inertia_y_cc: number;
  if (total_A_wall > 0) {
    inertia_y_cc = (A_C2 * (H_stem / 2) + A_C1 * (H_stem / 3) +
                    A_C3 * (conn_h + H_stem / 3) + A_C5 * (conn_h / 2)) / total_A_wall;
  } else {
    inertia_y_cc = H_stem / 2;
  }
  const inertia_M_cc = inertia_H_cc * inertia_y_cc;

  const H_half = H_stem / 2;
  const A_C2_half = t_stem * H_half;
  const A_C1_half = (batter > 0 && H_stem > 0) ? 0.5 * batter * H_half * (H_half / H_stem) : 0.0;
  const A_C3_half = (batter_back > 0 && H_stem > 0) ? 0.5 * batter_back * H_half * (H_half / H_stem) : 0.0;
  const inertia_W_dd = (A_C2_half + A_C1_half + A_C3_half) * gamma_c;
  const inertia_H_dd = inertia_W_dd * Kh;
  const inertia_y_dd = H_half / 2;
  const inertia_M_dd = inertia_H_dd * inertia_y_dd;

  // LCB별 벽체 단면력
  const V_wall_cc_lcb1 = 1.6 * Pa_cc + 1.6 * Ph1_cc;
  const M_wall_cc_lcb1 = 1.6 * Mo_cc_Pa + 1.6 * Mo_ph1_cc;
  const V_wall_dd_lcb1 = 1.6 * Pa_dd + 1.6 * Ph1_dd;
  const M_wall_dd_lcb1 = 1.6 * Mo_dd_Pa + 1.6 * Mo_ph1_dd;

  const V_wall_cc_lcb2 = 1.0 * Pae_cc + 1.0 * inertia_H_cc;
  const M_wall_cc_lcb2 = 1.0 * Mo_cc_Pae + 1.0 * inertia_M_cc;
  const V_wall_dd_lcb2 = 1.0 * Pae_dd + 1.0 * inertia_H_dd;
  const M_wall_dd_lcb2 = 1.0 * Mo_dd_Pae + 1.0 * inertia_M_dd;

  const V_wall_cc_lcb3 = 1.0 * Pa_cc + 1.0 * Ph1_cc;
  const M_wall_cc_lcb3 = 1.0 * Mo_cc_Pa + 1.0 * Mo_ph1_cc;
  const V_wall_dd_lcb3 = 1.0 * Pa_dd + 1.0 * Ph1_dd;
  const M_wall_dd_lcb3 = 1.0 * Mo_dd_Pa + 1.0 * Mo_ph1_dd;

  // 설계 단면력
  const Mu_CC = Math.max(Math.abs(M_wall_cc_lcb1), Math.abs(M_wall_cc_lcb2));
  const Mcr_CC = Math.abs(M_wall_cc_lcb3);
  const Vu_CC = Math.max(Math.abs(V_wall_cc_lcb1), Math.abs(V_wall_cc_lcb2));

  const Mu_DD = Math.max(Math.abs(M_wall_dd_lcb1), Math.abs(M_wall_dd_lcb2));
  const Mcr_DD = Math.abs(M_wall_dd_lcb3);
  const Vu_DD = Math.max(Math.abs(V_wall_dd_lcb1), Math.abs(V_wall_dd_lcb2));

  const Mu_heel = Math.max(Math.abs(heel_lcb1['M_total']), Math.abs(heel_lcb2['M_total']));
  const Mu_BB = Math.min(Mu_heel, Mu_CC);
  const Mcr_heel = Math.abs(heel_lcb3['M_total']);
  const Mcr_BB = Math.min(Mcr_heel, Mcr_CC);
  const Vu_BB = Math.max(Math.abs(heel_lcb1['V_total']), Math.abs(heel_lcb2['V_total']));

  let Mu_AA: number;
  let Mcr_AA: number;
  let Vu_AA: number;
  if (has_toe) {
    Mu_AA = Math.max(Math.abs(toe_lcb1!['M_total']), Math.abs(toe_lcb2!['M_total']));
    Mcr_AA = Math.abs(toe_lcb3!['M_total']);
    Vu_AA = Math.max(Math.abs(toe_lcb1!['V_total']), Math.abs(toe_lcb2!['V_total']));
  } else {
    Mu_AA = 0.0;
    Mcr_AA = 0.0;
    Vu_AA = 0.0;
  }

  // ================================================================
  // 4.5 부재설계
  // ================================================================
  let beta1: number;
  if (fck <= 28) {
    beta1 = 0.85;
  } else {
    beta1 = Math.max(0.85 - 0.007 * (fck - 28), 0.65);
  }

  const phi_f = 0.85;
  const phi_v = 0.75;
  const pmin = Math.max(0.25 * Math.sqrt(fck) / fy, 1.4 / fy);
  const Ec = 8500 * fck ** (1 / 3);
  const n_ratio = Math.round(Es / Ec);

  function sectionCheck(
    Mu_val: number, Mcr_val: number, Vu_val: number,
    H_sec_mm: number, Dc_mm: number,
    r_dia: number, r_area: number, r_spacing: number,
    sec_name: string,
  ): Record<string, any> {
    const D_sec = H_sec_mm - Dc_mm;
    const As = r_spacing > 0 ? r_area * 1000 / r_spacing : 0;
    const rho = D_sec > 0 ? As / (1000 * D_sec) : 0;

    const a = fck > 0 ? (As * fy) / (0.85 * fck * 1000) : 0;
    const c_val = beta1 > 0 ? a / beta1 : 0;

    const eps_t = c_val > 0 ? 0.003 * (D_sec - c_val) / c_val : 999;

    let phi_f_used: number;
    if (eps_t >= 0.005) {
      phi_f_used = 0.85;
    } else if (eps_t <= 0.002) {
      phi_f_used = 0.65;
    } else {
      phi_f_used = 0.65 + (eps_t - 0.002) * (0.85 - 0.65) / (0.005 - 0.002);
    }

    const phiMn_Nmm = phi_f_used * fy * As * (D_sec - a / 2);
    const phiMn = phiMn_Nmm / 1e6;

    // 필요철근량 반복
    let a_req = a;
    let As_req = As;
    for (let i = 0; i < 20; i++) {
      const denom_req = phi_f_used * fy * (D_sec - a_req / 2);
      if (denom_req <= 0) {
        break;
      }
      As_req = Mu_val * 1e6 / denom_req;
      const a_req_new = fck > 0 ? (As_req * fy) / (0.85 * fck * 1000) : 0;
      if (Math.abs(a_req_new - a_req) < 0.001) {
        break;
      }
      a_req = a_req_new;
    }
    const rho_req = D_sec > 0 ? As_req / (1000 * D_sec) : 0;

    // 전단
    const phiVc = phi_v * (1 / 6) * Math.sqrt(fck) * 1000 * D_sec / 1000;

    // 사용성
    const n = n_ratio;
    const p = rho;
    let np_val = n * p;
    if (np_val <= 0) {
      np_val = 1e-10;
    }
    const k = -np_val + Math.sqrt(np_val ** 2 + 2 * np_val);
    const j = 1 - k / 3;
    const x_na = k * D_sec;

    const Mcr_Nmm = Mcr_val * 1e6;
    const denom_fc = 1000 * x_na * (D_sec - x_na / 3);
    const fc = denom_fc !== 0 ? 2 * Mcr_Nmm / denom_fc : 0;
    const denom_fs = As * (D_sec - x_na / 3);
    const fs = denom_fs !== 0 ? Mcr_Nmm / denom_fs : 0;

    const h_tens = H_sec_mm - Dc_mm - x_na;
    const d_tens = D_sec - x_na;
    const fst = d_tens > 0 ? fs * h_tens / d_tens : fs;

    let Cc = Dc_mm - r_dia / 2;
    if (Cc < 0) {
      Cc = 0;
    }
    const crack_limit = 210.0;
    let s_max_1: number;
    let s_max_2: number;
    let s_max: number;
    if (fst > 0) {
      s_max_1 = 375 * (crack_limit / fst) - 2.5 * Cc;
      s_max_2 = 300 * (crack_limit / fst);
      s_max = Math.min(s_max_1, s_max_2);
    } else {
      s_max_1 = 999;
      s_max_2 = 999;
      s_max = 999;
    }

    const flexure_ok = phiMn >= Mu_val;
    const shear_ok = phiVc >= Vu_val;
    const crack_ok = r_spacing <= s_max;
    const rho_ok = rho >= pmin || rho >= (4 / 3) * rho_req;

    return {
      sec_name,
      H_sec: H_sec_mm, D_sec, Dc: Dc_mm,
      As, rho, a, c: c_val,
      eps_t, phi_f: phi_f_used,
      phiMn_Nmm, phiMn,
      a_req, As_req, rho_req,
      phiVc,
      n, p, k, j, x_na,
      fc, fs, fst,
      Cc, s_max, s_max_1, s_max_2,
      crack_limit,
      rebar_dia: r_dia, rebar_spacing: r_spacing,
      Mu: Mu_val, Mcr: Mcr_val, Vu: Vu_val,
      pmin,
      flexure_ok, shear_ok,
      crack_ok, rho_ok,
    };
  }

  let sec_BB: Record<string, any> | null;
  let sec_CC: Record<string, any> | null;
  let sec_DD: Record<string, any> | null;
  let sec_AA: Record<string, any> | null;

  if (is_gravity && !is_semi_gravity) {
    sec_BB = null;
    sec_CC = null;
    sec_DD = null;
    sec_AA = null;
  } else if (is_semi_gravity) {
    const H_sec_cc = !is_gravity ? t_stem_bot * 1000 : B * 1000;
    sec_CC = sectionCheck(Mu_CC, Mcr_CC, Vu_CC, H_sec_cc, Dc_wall,
                          rebar2_dia, rebar2_area, rebar2_spacing, "벽체하부 (C-C)");
    sec_BB = null;
    sec_DD = null;
    sec_AA = null;
  } else {
    // L형/역L형/역T형
    if (has_heel) {
      sec_BB = sectionCheck(Mu_BB, Mcr_BB, Vu_BB, D_slab * 1000, Dc_slab,
                            rebar1_dia, rebar1_area, rebar1_spacing, "저판 (B-B)");
    } else {
      sec_BB = null;
    }

    const H_sec_cc = t_stem_bot * 1000;
    sec_CC = sectionCheck(Mu_CC, Mcr_CC, Vu_CC, H_sec_cc, Dc_wall,
                          rebar2_dia, rebar2_area, rebar2_spacing, "벽체하부 (C-C)");

    const t_stem_mid = t_stem + (batter + batter_back) / 2;
    const H_sec_dd = t_stem_mid * 1000;
    sec_DD = sectionCheck(Mu_DD, Mcr_DD, Vu_DD, H_sec_dd, Dc_wall,
                          rebar3_dia, rebar3_area, rebar3_spacing, "벽체중앙 (D-D)");

    if (has_toe) {
      sec_AA = sectionCheck(Mu_AA, Mcr_AA, Vu_AA, D_slab * 1000, Dc_toe,
                            rebar_toe_dia, rebar_toe_area, rebar_toe_spacing, "앞굽판 (A-A)");
    } else {
      sec_AA = null;
    }
  }

  // ================================================================
  // 종합 판정
  // ================================================================
  const j_slide_n = SF_sl_n >= 1.5 ? "OK" : "NG";
  const j_slide_e = SF_sl_e >= 1.2 ? "OK" : "NG";
  const j_over_n = SF_ot_n >= 2.0 ? "OK" : "NG";
  const j_over_e = SF_ot_e >= 1.5 ? "OK" : "NG";
  const j_ecc_n = e_n <= B6 ? "OK" : "NG";
  const j_ecc_e = e_e <= B3 ? "OK" : "NG";
  const j_bear_n = Q1_n <= qa_n ? "OK" : "NG";
  const j_bear_e = Q1_e <= qa_e ? "OK" : "NG";

  const all_ok_list: boolean[] = [
    j_slide_n === "OK", j_slide_e === "OK",
    j_over_n === "OK", j_ecc_n === "OK", j_ecc_e === "OK",
    j_bear_n === "OK", j_bear_e === "OK",
  ];
  if (sec_BB !== null) {
    all_ok_list.push(sec_BB['flexure_ok'], sec_BB['shear_ok'], sec_BB['crack_ok']);
  }
  if (sec_CC !== null) {
    all_ok_list.push(sec_CC['flexure_ok'], sec_CC['shear_ok'], sec_CC['crack_ok']);
  }
  if (sec_DD !== null) {
    all_ok_list.push(sec_DD['flexure_ok'], sec_DD['shear_ok'], sec_DD['crack_ok']);
  }
  if (sec_AA !== null) {
    all_ok_list.push(sec_AA['flexure_ok'], sec_AA['shear_ok'], sec_AA['crack_ok']);
  }
  const all_ok = all_ok_list.every(v => v);

  return {
    params,
    blocks: {
      c_results,
      s_results,
      Wc, Ws, Wt,
      KhWc, KhWs, KhWt,
      Mrc, Mrs, Mrt,
      Moc, Mos, Mot,
    },
    earth_pressure: {
      Ka, Pa: Pa_h, Pa_total, Pa_v,
      ya, Mo_pa,
      KAE, PAE, yae, Mo_pae,
      Kah, Ka_coul, Kaeh_design,
      Kae_design,
      theta_c_deg, delta_c_deg,
      Ph_sur, Pv_sur, Mo_ph, Mr_pv,
      Pw, U,
    },
    stability: {
      normal: {
        SV: SVn, SH: SHn, SMr: SMrn, SMo: SMon,
        e: e_n, B6, B3,
        SF_overturn: SF_ot_n, SF_slide: SF_sl_n,
        Hr: Hr_n, mu, phi_B, Kp,
        Pp, Pp_key,
        passive_enabled, passive_ratio: passive_ratio_pct,
        key_enabled, key_depth,
        Q1: Q1_n, Q2: Q2_n,
        Be: Be_n, qu: qu_n, qa: qa_n,
        Nc: Nc2, Nq: Nq2, Nr: Nr2,
        phi2_deg, gamma_found,
        qa_fixed, qae_fixed,
      },
      seismic: {
        SV: SVe, SH: SHe, SMr: SMre, SMo: SMe,
        e: e_e,
        SF_overturn: SF_ot_e, SF_slide: SF_sl_e,
        Hr: Hr_e,
        Q1: Q1_e, Q2: Q2_e,
        Be: Be_e, qu: qu_e, qa: qa_e,
      },
    },
    section: {
      lcb1: {
        SV: SV_lcb1, SH: SH_lcb1, SMr: SMr_lcb1, SMo: SMo_lcb1,
        e: e_lcb1, Q1: Q1_lcb1, Q2: Q2_lcb1,
      },
      lcb2: {
        SV: SV_lcb2, SH: SH_lcb2, SMr: SMr_lcb2, SMo: SMo_lcb2,
        e: e_lcb2, Q1: Q1_lcb2, Q2: Q2_lcb2,
      },
      lcb3: {
        SV: SV_lcb3, SMr: SMr_lcb3, SMo: SMo_lcb3,
        e: e_lcb3, Q1: Q1_lcb3, Q2: Q2_lcb3,
      },
      heel_lcb1, heel_lcb2, heel_lcb3,
      toe_lcb1, toe_lcb2, toe_lcb3,
      wall: {
        H_wall_cc, H_wall_dd,
        Pa_cc, Mo_cc_Pa,
        Pa_dd, Mo_dd_Pa,
        Pae_cc, Mo_cc_Pae,
        Pae_dd, Mo_dd_Pae,
        Ph1_cc, Mo_ph1_cc,
        Ph1_dd, Mo_ph1_dd,
        inertia_W_cc, inertia_H_cc, inertia_M_cc,
        inertia_W_dd, inertia_H_dd, inertia_M_dd,
        cc_lcb1: { V: V_wall_cc_lcb1, M: M_wall_cc_lcb1 },
        cc_lcb2: { V: V_wall_cc_lcb2, M: M_wall_cc_lcb2 },
        cc_lcb3: { V: V_wall_cc_lcb3, M: M_wall_cc_lcb3 },
        dd_lcb1: { V: V_wall_dd_lcb1, M: M_wall_dd_lcb1 },
        dd_lcb2: { V: V_wall_dd_lcb2, M: M_wall_dd_lcb2 },
        dd_lcb3: { V: V_wall_dd_lcb3, M: M_wall_dd_lcb3 },
      },
      design_forces: {
        BB: { Mu: Mu_BB, Mcr: Mcr_BB, Vu: Vu_BB },
        CC: { Mu: Mu_CC, Mcr: Mcr_CC, Vu: Vu_CC },
        DD: { Mu: Mu_DD, Mcr: Mcr_DD, Vu: Vu_DD },
        AA: { Mu: Mu_AA, Mcr: Mcr_AA, Vu: Vu_AA },
      },
    },
    member: {
      BB: sec_BB ?? null,
      CC: sec_CC ?? null,
      DD: sec_DD ?? null,
      AA: sec_AA ?? null,
    },
    judgment: {
      slide_normal: j_slide_n,
      slide_seismic: j_slide_e,
      overturn_normal: j_over_n,
      overturn_seismic: j_over_e,
      eccentricity_normal: j_ecc_n,
      eccentricity_seismic: j_ecc_e,
      bearing_normal: j_bear_n,
      bearing_seismic: j_bear_e,
      BB_flexure: sec_BB && sec_BB['flexure_ok'] ? "OK" : (sec_BB ? "NG" : "-"),
      BB_shear: sec_BB && sec_BB['shear_ok'] ? "OK" : (sec_BB ? "NG" : "-"),
      BB_crack: sec_BB && sec_BB['crack_ok'] ? "OK" : (sec_BB ? "NG" : "-"),
      CC_flexure: sec_CC && sec_CC['flexure_ok'] ? "OK" : (sec_CC ? "NG" : "-"),
      CC_shear: sec_CC && sec_CC['shear_ok'] ? "OK" : (sec_CC ? "NG" : "-"),
      CC_crack: sec_CC && sec_CC['crack_ok'] ? "OK" : (sec_CC ? "NG" : "-"),
      DD_flexure: sec_DD && sec_DD['flexure_ok'] ? "OK" : (sec_DD ? "NG" : "-"),
      DD_shear: sec_DD && sec_DD['shear_ok'] ? "OK" : (sec_DD ? "NG" : "-"),
      DD_crack: sec_DD && sec_DD['crack_ok'] ? "OK" : (sec_DD ? "NG" : "-"),
      AA_flexure: sec_AA && sec_AA['flexure_ok'] ? "OK" : (sec_AA ? "NG" : "-"),
      AA_shear: sec_AA && sec_AA['shear_ok'] ? "OK" : (sec_AA ? "NG" : "-"),
      AA_crack: sec_AA && sec_AA['crack_ok'] ? "OK" : (sec_AA ? "NG" : "-"),
      has_toe,
      has_heel: !is_gravity ? has_heel : false,
      is_gravity,
      is_semi_gravity,
      L_toe_eff,
      all_ok,
      wall_type,
    },
  };
}
