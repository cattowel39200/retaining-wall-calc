export type NumField = number | null

export interface ChannelInput {
  // 단면 치수
  H: number          // 벽체 높이 (m)
  B: number          // 내폭 (m)
  tw: number         // 벽체 두께 (m)
  ts: number         // 저판 두께 (m)
  haunch: number     // 헌치 크기 (m), 0이면 없음

  // 토피 / 지반
  Df: number         // 토피고 (m)
  gamma_t: number    // 흙 단위중량 (kN/m³)
  phi_deg: number    // 내부마찰각 (°)
  c_soil: number     // 점착력 (kPa)
  K0_mode: 'rankine' | 'manual'  // 토압계수 산정방식
  K0_manual: number  // 직접입력 토압계수

  // 수압
  hw_in: number      // 내수위 (m, 저판 상면 기준)
  hw_out: number     // 외수위 (m, 저판 하면 기준)

  // 하중
  q: number          // 상재하중 (kN/m²)
  live_load: 'none' | 'DB24' | 'DB18' | 'manual'  // 활하중 종류
  live_load_manual: number  // 직접입력 등분포 활하중 (kN/m²)
  gamma_c: number    // 콘크리트 단위중량 (kN/m³)

  // 재료
  fck: number        // MPa
  fy: number         // MPa

  // 배근 — 측벽
  wall_in_dia: number      // 측벽 내측 철근 직경 (mm)
  wall_in_spacing: number  // 측벽 내측 철근 간격 (mm)
  wall_out_dia: number     // 측벽 외측 철근 직경 (mm)
  wall_out_spacing: number // 측벽 외측 철근 간격 (mm)

  // 배근 — 저판
  slab_top_dia: number      // 저판 상면 철근 직경 (mm)
  slab_top_spacing: number  // 저판 상면 철근 간격 (mm)
  slab_bot_dia: number      // 저판 하면 철근 직경 (mm)
  slab_bot_spacing: number  // 저판 하면 철근 간격 (mm)

  // 피복두께
  Dc_wall: number    // 벽체 피복 (mm)
  Dc_slab: number    // 저판 피복 (mm)
}

export interface ChannelFormFields {
  H: NumField
  B: NumField
  tw: NumField
  ts: NumField
  haunch: NumField

  Df: NumField
  gamma_t: NumField
  phi_deg: NumField
  c_soil: NumField
  K0_mode: 'rankine' | 'manual'
  K0_manual: NumField

  hw_in: NumField
  hw_out: NumField

  q: NumField
  live_load: 'none' | 'DB24' | 'DB18' | 'manual'
  live_load_manual: NumField
  gamma_c: NumField

  fck: NumField
  fy: NumField

  wall_in_dia: number
  wall_in_spacing: NumField
  wall_out_dia: number
  wall_out_spacing: NumField

  slab_top_dia: number
  slab_top_spacing: NumField
  slab_bot_dia: number
  slab_bot_spacing: NumField

  Dc_wall: NumField
  Dc_slab: NumField
}

export function getDefaultChannelFields(): ChannelFormFields {
  return {
    H: null, B: null, tw: null, ts: null, haunch: null,
    Df: null, gamma_t: null, phi_deg: null, c_soil: null,
    K0_mode: 'rankine', K0_manual: null,
    hw_in: null, hw_out: null,
    q: null, live_load: 'none', live_load_manual: null, gamma_c: null,
    fck: null, fy: null,
    wall_in_dia: 16, wall_in_spacing: null,
    wall_out_dia: 16, wall_out_spacing: null,
    slab_top_dia: 16, slab_top_spacing: null,
    slab_bot_dia: 16, slab_bot_spacing: null,
    Dc_wall: null, Dc_slab: null,
  }
}

function n(v: NumField): number { return v ?? 0 }

export function formToChannelInput(f: ChannelFormFields): ChannelInput {
  return {
    H: n(f.H), B: n(f.B), tw: n(f.tw), ts: n(f.ts), haunch: n(f.haunch),
    Df: n(f.Df), gamma_t: n(f.gamma_t), phi_deg: n(f.phi_deg), c_soil: n(f.c_soil),
    K0_mode: f.K0_mode, K0_manual: n(f.K0_manual),
    hw_in: n(f.hw_in), hw_out: n(f.hw_out),
    q: n(f.q), live_load: f.live_load, live_load_manual: n(f.live_load_manual),
    gamma_c: n(f.gamma_c),
    fck: n(f.fck), fy: n(f.fy),
    wall_in_dia: f.wall_in_dia, wall_in_spacing: n(f.wall_in_spacing),
    wall_out_dia: f.wall_out_dia, wall_out_spacing: n(f.wall_out_spacing),
    slab_top_dia: f.slab_top_dia, slab_top_spacing: n(f.slab_top_spacing),
    slab_bot_dia: f.slab_bot_dia, slab_bot_spacing: n(f.slab_bot_spacing),
    Dc_wall: n(f.Dc_wall), Dc_slab: n(f.Dc_slab),
  }
}
