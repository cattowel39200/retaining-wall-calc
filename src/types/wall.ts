export type WallType = 'L형' | '역L형' | '역T형' | '중력식'

export interface WallInput {
  wall_type: WallType
  semi_gravity: boolean

  // 단면 치수
  H: number
  B: number
  t_stem: number
  H_stem: number
  D_slab: number
  D_slab_end: number
  C6_toe: number
  C8_heel: number
  batter: number
  batter_back: number
  conn_h: number
  Hs_soil: number
  Hs_gap: number

  // 지반 조건
  gamma_t: number
  phi_deg: number
  c_soil: number
  alpha_deg: number
  Df: number
  phi2_deg: number | null
  gamma_found: number | null

  // 하중
  q: number
  gamma_c: number

  // 내진
  Kh: number

  // 재료
  fck: number
  fy: number

  // 철근 배근
  rebar1_dia: number
  rebar1_spacing: number
  rebar2_dia: number
  rebar2_spacing: number
  rebar3_dia: number | null
  rebar3_spacing: number | null
  rebar_toe_dia: number | null
  rebar_toe_spacing: number | null

  // 피복두께
  Dc_slab: number
  Dc_wall: number
  Dc_toe: number | null

  // 지하수위
  gwl_height: number
  gamma_sat: number

  // 지지력
  qa_fixed: number
  qae_fixed: number

  // 수동토압 / 활동방지키
  passive_enabled: boolean
  passive_ratio: number
  key_enabled: boolean
  key_depth: number
  key_width: number
}

/** 폼에서 직접 편집하는 필드 (computed 필드 제외) */
export interface WallFormFields {
  wall_type: WallType
  semi_gravity: boolean
  stem_top: number
  H_stem: number
  batter: number
  batter_back: number
  C6_toe: number
  C8_heel: number
  D_slab: number
  D_slab_end: number
  conn_h: number
  Hs_gap: number

  gamma_t: number
  phi_deg: number
  c_soil: number
  alpha_deg: number
  Df: number
  phi2_deg: number | null
  gamma_found: number | null

  q: number
  gamma_c: number
  Kh: number

  fck: number
  fy: number

  rebar1_dia: number
  rebar1_spacing: number
  rebar2_dia: number
  rebar2_spacing: number
  rebar3_dia: number | null
  rebar3_spacing: number | null
  rebar_toe_dia: number | null
  rebar_toe_spacing: number | null

  Dc_slab: number
  Dc_wall: number
  Dc_toe: number | null

  gwl_height: number
  gamma_sat: number

  qa_fixed: number
  qae_fixed: number

  passive_enabled: boolean
  passive_ratio: number
  key_enabled: boolean
  key_depth: number
  key_width: number
}

export function getDefaultFormFields(wallType: WallType): WallFormFields {
  const base: WallFormFields = {
    wall_type: wallType,
    semi_gravity: false,
    stem_top: 0.4,
    H_stem: 2.1,
    batter: 0,
    batter_back: 0,
    C6_toe: 0.4,
    C8_heel: 1.6,
    D_slab: 0.4,
    D_slab_end: 0.4,
    conn_h: 0,
    Hs_gap: 0.25,

    gamma_t: 19,
    phi_deg: 30,
    c_soil: 0,
    alpha_deg: 0,
    Df: 1.0,
    phi2_deg: null,
    gamma_found: null,

    q: 10,
    gamma_c: 24.5,
    Kh: 0.077,

    fck: 24,
    fy: 400,

    rebar1_dia: 22,
    rebar1_spacing: 125,
    rebar2_dia: 22,
    rebar2_spacing: 125,
    rebar3_dia: null,
    rebar3_spacing: null,
    rebar_toe_dia: null,
    rebar_toe_spacing: null,

    Dc_slab: 80,
    Dc_wall: 80,
    Dc_toe: null,

    gwl_height: 0,
    gamma_sat: 20,

    qa_fixed: 0,
    qae_fixed: 0,

    passive_enabled: false,
    passive_ratio: 0,
    key_enabled: false,
    key_depth: 0,
    key_width: 0,
  }

  if (wallType === '중력식') {
    base.stem_top = 0.5
    base.batter = 0.5
    base.batter_back = 0.5
    base.C6_toe = 0
    base.C8_heel = 0
    base.D_slab = 0
    base.D_slab_end = 0
  } else if (wallType === '역L형') {
    base.C8_heel = 0
  }

  return base
}

/** 폼 필드에서 API 전송용 WallInput 생성 (computed 값 계산) */
export function formToInput(f: WallFormFields): WallInput {
  const t_stem = f.stem_top
  const H = f.H_stem + f.D_slab
  const B = f.C6_toe + t_stem + f.batter + f.batter_back + f.C8_heel
  const Hs_soil = f.H_stem - f.Hs_gap

  return {
    wall_type: f.wall_type,
    semi_gravity: f.semi_gravity,
    H,
    B,
    t_stem,
    H_stem: f.H_stem,
    D_slab: f.D_slab,
    D_slab_end: f.D_slab_end,
    C6_toe: f.C6_toe,
    C8_heel: f.C8_heel,
    batter: f.batter,
    batter_back: f.batter_back,
    conn_h: f.conn_h,
    Hs_soil: Hs_soil,
    Hs_gap: f.Hs_gap,

    gamma_t: f.gamma_t,
    phi_deg: f.phi_deg,
    c_soil: f.c_soil,
    alpha_deg: f.alpha_deg,
    Df: f.Df,
    phi2_deg: f.phi2_deg,
    gamma_found: f.gamma_found,

    q: f.q,
    gamma_c: f.gamma_c,
    Kh: f.Kh,

    fck: f.fck,
    fy: f.fy,

    rebar1_dia: f.rebar1_dia,
    rebar1_spacing: f.rebar1_spacing,
    rebar2_dia: f.rebar2_dia,
    rebar2_spacing: f.rebar2_spacing,
    rebar3_dia: f.rebar3_dia,
    rebar3_spacing: f.rebar3_spacing,
    rebar_toe_dia: f.rebar_toe_dia,
    rebar_toe_spacing: f.rebar_toe_spacing,

    Dc_slab: f.Dc_slab,
    Dc_wall: f.Dc_wall,
    Dc_toe: f.Dc_toe,

    gwl_height: f.gwl_height,
    gamma_sat: f.gamma_sat,

    qa_fixed: f.qa_fixed,
    qae_fixed: f.qae_fixed,

    passive_enabled: f.passive_enabled,
    passive_ratio: f.passive_ratio,
    key_enabled: f.key_enabled,
    key_depth: f.key_depth,
    key_width: f.key_width,
  }
}

/** API 전송 시 null 필드 제거 */
export function stripNulls(input: WallInput): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input)) {
    if (v !== null) obj[k] = v
  }
  return obj
}
