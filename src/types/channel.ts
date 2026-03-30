export type NumField = number | null

export interface ChannelInput {
  // 좌측 벽체
  H_left: number         // 좌측 벽체 높이 (m)
  tw_top_left: number    // 좌측 벽체 상단 두께 (m)
  tw_bot_left: number    // 좌측 벽체 하단 두께 (m)

  // 우측 벽체
  H_right: number        // 우측 벽체 높이 (m)
  tw_top_right: number   // 우측 벽체 상단 두께 (m)
  tw_bot_right: number   // 우측 벽체 하단 두께 (m)

  // 저판
  B: number              // 내폭 (m)
  ts: number             // 저판 두께 (m)
  haunch: number         // 헌치 크기 (m)

  // 토피 / 지반
  Df: number             // 토피고 (m)
  gamma_t: number        // 뒤채움 단위중량 (kN/m³)
  phi_deg: number        // 뒤채움 내부마찰각 (°)
  c_soil: number         // 점착력 (kPa)
  K0_mode: 'rankine' | 'manual'
  K0_manual: number

  // 지지지반 (안정검토용)
  phi2_deg: number       // 지지지반 마찰각 (°)
  gamma_found: number    // 지지지반 단위중량 (kN/m³)
  qa_fixed: number       // 고정 허용지지력 (kN/m², 0이면 Terzaghi)

  // 수압
  hw_in: number          // 내수위 (m)
  hw_out: number         // 외수위 (m)

  // 하중
  q: number              // 상재하중 (kN/m²)
  live_load: 'none' | 'DB24' | 'DB18' | 'manual'
  live_load_manual: number
  gamma_c: number        // 콘크리트 단위중량 (kN/m³)

  // 재료
  fck: number
  fy: number

  // 배근 — 좌측벽
  wall_left_in_dia: number
  wall_left_in_spacing: number
  wall_left_out_dia: number
  wall_left_out_spacing: number

  // 배근 — 우측벽
  wall_right_in_dia: number
  wall_right_in_spacing: number
  wall_right_out_dia: number
  wall_right_out_spacing: number

  // 배근 — 저판
  slab_top_dia: number
  slab_top_spacing: number
  slab_bot_dia: number
  slab_bot_spacing: number

  // 피복두께
  Dc_wall: number
  Dc_slab: number
}

export interface ChannelFormFields {
  H_left: NumField
  tw_top_left: NumField
  tw_bot_left: NumField
  H_right: NumField
  tw_top_right: NumField
  tw_bot_right: NumField
  B: NumField
  ts: NumField
  haunch: NumField

  Df: NumField
  gamma_t: NumField
  phi_deg: NumField
  c_soil: NumField
  K0_mode: 'rankine' | 'manual'
  K0_manual: NumField

  phi2_deg: NumField
  gamma_found: NumField
  qa_fixed: NumField

  hw_in: NumField
  hw_out: NumField

  q: NumField
  live_load: 'none' | 'DB24' | 'DB18' | 'manual'
  live_load_manual: NumField
  gamma_c: NumField

  fck: NumField
  fy: NumField

  wall_left_in_dia: number
  wall_left_in_spacing: NumField
  wall_left_out_dia: number
  wall_left_out_spacing: NumField

  wall_right_in_dia: number
  wall_right_in_spacing: NumField
  wall_right_out_dia: number
  wall_right_out_spacing: NumField

  slab_top_dia: number
  slab_top_spacing: NumField
  slab_bot_dia: number
  slab_bot_spacing: NumField

  Dc_wall: NumField
  Dc_slab: NumField
}

export function getDefaultChannelFields(): ChannelFormFields {
  return {
    H_left: null, tw_top_left: null, tw_bot_left: null,
    H_right: null, tw_top_right: null, tw_bot_right: null,
    B: null, ts: null, haunch: null,
    // 지반 (프리셋 선택으로 설정)
    Df: null, gamma_t: null, phi_deg: null, c_soil: null,
    K0_mode: 'rankine', K0_manual: null,
    phi2_deg: null, gamma_found: null, qa_fixed: null,
    hw_in: null, hw_out: null,
    // 설계조건 기본값 (KDS 기준)
    q: 10, live_load: 'DB24', live_load_manual: null, gamma_c: 24,
    fck: 24, fy: 400,
    wall_left_in_dia: 16, wall_left_in_spacing: null,
    wall_left_out_dia: 16, wall_left_out_spacing: null,
    wall_right_in_dia: 16, wall_right_in_spacing: null,
    wall_right_out_dia: 16, wall_right_out_spacing: null,
    slab_top_dia: 16, slab_top_spacing: null,
    slab_bot_dia: 16, slab_bot_spacing: null,
    Dc_wall: 80, Dc_slab: 80, // 피복두께 mm (지중매설 기준)
  }
}

function n(v: NumField): number { return v ?? 0 }

export function formToChannelInput(f: ChannelFormFields): ChannelInput {
  return {
    H_left: n(f.H_left), tw_top_left: n(f.tw_top_left), tw_bot_left: n(f.tw_bot_left),
    H_right: n(f.H_right), tw_top_right: n(f.tw_top_right), tw_bot_right: n(f.tw_bot_right),
    B: n(f.B), ts: n(f.ts), haunch: n(f.haunch),
    Df: n(f.Df), gamma_t: n(f.gamma_t), phi_deg: n(f.phi_deg), c_soil: n(f.c_soil),
    K0_mode: f.K0_mode, K0_manual: n(f.K0_manual),
    phi2_deg: n(f.phi2_deg), gamma_found: n(f.gamma_found), qa_fixed: n(f.qa_fixed),
    hw_in: n(f.hw_in), hw_out: n(f.hw_out),
    q: n(f.q), live_load: f.live_load, live_load_manual: n(f.live_load_manual), gamma_c: n(f.gamma_c),
    fck: n(f.fck), fy: n(f.fy),
    wall_left_in_dia: f.wall_left_in_dia, wall_left_in_spacing: n(f.wall_left_in_spacing),
    wall_left_out_dia: f.wall_left_out_dia, wall_left_out_spacing: n(f.wall_left_out_spacing),
    wall_right_in_dia: f.wall_right_in_dia, wall_right_in_spacing: n(f.wall_right_in_spacing),
    wall_right_out_dia: f.wall_right_out_dia, wall_right_out_spacing: n(f.wall_right_out_spacing),
    slab_top_dia: f.slab_top_dia, slab_top_spacing: n(f.slab_top_spacing),
    slab_bot_dia: f.slab_bot_dia, slab_bot_spacing: n(f.slab_bot_spacing),
    Dc_wall: n(f.Dc_wall), Dc_slab: n(f.Dc_slab),
  }
}
