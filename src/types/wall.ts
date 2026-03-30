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
export type NumField = number | null

export interface WallFormFields {
  wall_type: WallType
  semi_gravity: boolean
  stem_top: NumField
  H_stem: NumField
  batter: NumField
  batter_back: NumField
  C6_toe: NumField
  C8_heel: NumField
  D_slab: NumField
  D_slab_end: NumField
  conn_h: NumField
  Hs_gap: NumField

  gamma_t: NumField
  phi_deg: NumField
  c_soil: NumField
  alpha_deg: NumField
  slope_type: 'flat' | 'berm'  // 수평 or 소단+구배
  slope_n: NumField             // 1:n 구배 (n값)
  slope_berm: NumField          // 소단 폭 (m), 기본 1m
  Df: NumField
  phi2_deg: NumField
  gamma_found: NumField

  q: NumField
  gamma_c: NumField
  Kh: NumField

  fck: NumField
  fy: NumField

  rebar1_dia: number
  rebar1_spacing: NumField
  rebar2_dia: number
  rebar2_spacing: NumField
  rebar3_dia: number | null
  rebar3_spacing: NumField
  rebar_toe_dia: number | null
  rebar_toe_spacing: NumField

  Dc_slab: NumField
  Dc_wall: NumField
  Dc_toe: NumField

  gwl_height: NumField
  gamma_sat: NumField

  qa_fixed: NumField
  qae_fixed: NumField

  passive_enabled: boolean
  passive_ratio: NumField
  key_enabled: boolean
  key_depth: NumField
  key_width: NumField
}

export function getDefaultFormFields(wallType: WallType): WallFormFields {
  const base: WallFormFields = {
    wall_type: wallType,
    semi_gravity: false,
    stem_top: null,
    H_stem: null,
    batter: null,
    batter_back: null,
    C6_toe: null,
    C8_heel: null,
    D_slab: null,
    D_slab_end: null,
    conn_h: null,
    Hs_gap: null,

    // 지반 (프리셋 선택으로 설정)
    gamma_t: null,
    phi_deg: null,
    c_soil: null,
    alpha_deg: null,
    slope_type: 'flat',
    slope_n: 1.5,        // 1:1.5 기본 구배
    slope_berm: 1.0,     // 소단 1m
    Df: null,
    phi2_deg: null,
    gamma_found: null,

    // 설계조건 기본값 (KDS 기준)
    q: 10,           // 상재하중 kN/m²
    gamma_c: 24,     // 콘크리트 단위중량 kN/m³
    Kh: 0.077,       // 내진계수 (I등급)

    fck: 24,         // 콘크리트 설계기준강도 MPa (KDS 일반환경)
    fy: 400,         // 철근 항복강도 MPa (SD400)

    rebar1_dia: 22,
    rebar1_spacing: null,
    rebar2_dia: 22,
    rebar2_spacing: null,
    rebar3_dia: null,
    rebar3_spacing: null,
    rebar_toe_dia: null,
    rebar_toe_spacing: null,

    Dc_slab: 80,     // 피복두께 mm (지중매설 기준)
    Dc_wall: 80,
    Dc_toe: 80,

    gwl_height: null,
    gamma_sat: null,

    qa_fixed: null,
    qae_fixed: null,

    passive_enabled: false,
    passive_ratio: null,
    key_enabled: false,
    key_depth: null,
    key_width: null,
  }

  if (wallType === '역L형') {
    base.C8_heel = null
  }

  return base
}

/** null을 0으로 변환하는 헬퍼 */
function n(v: NumField): number {
  return v ?? 0
}

/** 폼 필드에서 API 전송용 WallInput 생성 (computed 값 계산) */
export function formToInput(f: WallFormFields): WallInput {
  const t_stem = n(f.stem_top)
  const H = n(f.H_stem) + n(f.D_slab)
  const B = n(f.C6_toe) + t_stem + n(f.batter) + n(f.batter_back) + n(f.C8_heel)
  const Hs_soil = n(f.H_stem) - n(f.Hs_gap)

  return {
    wall_type: f.wall_type,
    semi_gravity: f.semi_gravity,
    H,
    B,
    t_stem,
    H_stem: n(f.H_stem),
    D_slab: n(f.D_slab),
    D_slab_end: n(f.D_slab_end),
    C6_toe: n(f.C6_toe),
    C8_heel: n(f.C8_heel),
    batter: n(f.batter),
    batter_back: n(f.batter_back),
    conn_h: n(f.conn_h),
    Hs_soil: Hs_soil,
    Hs_gap: n(f.Hs_gap),

    gamma_t: n(f.gamma_t),
    phi_deg: n(f.phi_deg),
    c_soil: n(f.c_soil),
    // 비탈면 구배 → alpha_deg 자동 변환
    alpha_deg: f.slope_type === 'berm' && n(f.slope_n) > 0
      ? Math.atan(1 / n(f.slope_n)) * (180 / Math.PI)
      : n(f.alpha_deg),
    Df: n(f.Df),
    phi2_deg: f.phi2_deg,
    gamma_found: f.gamma_found,

    q: n(f.q),
    gamma_c: n(f.gamma_c),
    Kh: n(f.Kh),

    fck: n(f.fck),
    fy: n(f.fy),

    rebar1_dia: f.rebar1_dia,
    rebar1_spacing: n(f.rebar1_spacing),
    rebar2_dia: f.rebar2_dia,
    rebar2_spacing: n(f.rebar2_spacing),
    rebar3_dia: f.rebar3_dia,
    rebar3_spacing: f.rebar3_spacing ?? null,
    rebar_toe_dia: f.rebar_toe_dia,
    rebar_toe_spacing: f.rebar_toe_spacing ?? null,

    Dc_slab: n(f.Dc_slab),
    Dc_wall: n(f.Dc_wall),
    Dc_toe: f.Dc_toe,

    gwl_height: n(f.gwl_height),
    gamma_sat: n(f.gamma_sat),

    qa_fixed: n(f.qa_fixed),
    qae_fixed: n(f.qae_fixed),

    passive_enabled: f.passive_enabled,
    passive_ratio: n(f.passive_ratio),
    key_enabled: f.key_enabled,
    key_depth: n(f.key_depth),
    key_width: n(f.key_width),
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
