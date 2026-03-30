/**
 * 구조설계 기본값 프리셋 (KDS 기준)
 * 옹벽, 콘크리트 개거 등 공통 사용
 */

// ===== 지반 프리셋 =====
export interface SoilPreset {
  label: string
  gamma_t: number    // 단위중량 (kN/m³)
  phi_deg: number    // 내부마찰각 (°)
  c_soil: number     // 점착력 (kPa)
  gamma_sat: number  // 포화단위중량 (kN/m³)
  desc: string       // 설명
}

export const SOIL_PRESETS: SoilPreset[] = [
  { label: '직접 입력', gamma_t: 0, phi_deg: 0, c_soil: 0, gamma_sat: 0, desc: '' },
  { label: '일반 뒤채움 (사질)', gamma_t: 18, phi_deg: 34, c_soil: 0, gamma_sat: 20, desc: 'γ=18, φ=34°, c=0' },
  { label: '사질토 (보통)', gamma_t: 18.5, phi_deg: 30, c_soil: 0, gamma_sat: 20.5, desc: 'γ=18.5, φ=30°, c=0' },
  { label: '사질토 (조밀)', gamma_t: 19.5, phi_deg: 36, c_soil: 0, gamma_sat: 21, desc: 'γ=19.5, φ=36°, c=0' },
  { label: '점성토 (연약)', gamma_t: 17, phi_deg: 25, c_soil: 20, gamma_sat: 19, desc: 'γ=17, φ=25°, c=20' },
  { label: '점성토 (보통)', gamma_t: 18, phi_deg: 27, c_soil: 50, gamma_sat: 20, desc: 'γ=18, φ=27°, c=50' },
  { label: '점성토 (견고)', gamma_t: 19, phi_deg: 30, c_soil: 100, gamma_sat: 21, desc: 'γ=19, φ=30°, c=100' },
  { label: '풍화토', gamma_t: 18, phi_deg: 32, c_soil: 15, gamma_sat: 20, desc: 'γ=18, φ=32°, c=15' },
  { label: '풍화암', gamma_t: 22, phi_deg: 40, c_soil: 100, gamma_sat: 23, desc: 'γ=22, φ=40°, c=100' },
  { label: '암반', gamma_t: 25.5, phi_deg: 45, c_soil: 300, gamma_sat: 26, desc: 'γ=25.5, φ=45°, c=300' },
]

// ===== 콘크리트 프리셋 (KDS 14 20 00) =====
export interface ConcretePreset {
  label: string
  fck: number       // 설계기준강도 (MPa)
  gamma_c: number   // 단위중량 (kN/m³)
  desc: string
}

export const CONCRETE_PRESETS: ConcretePreset[] = [
  { label: '직접 입력', fck: 0, gamma_c: 0, desc: '' },
  { label: 'fck=21 MPa (일반)', fck: 21, gamma_c: 24.5, desc: '일반 구조물' },
  { label: 'fck=24 MPa (표준)', fck: 24, gamma_c: 24.5, desc: '옹벽, 일반건축' },
  { label: 'fck=27 MPa', fck: 27, gamma_c: 24.5, desc: '중간 노출' },
  { label: 'fck=30 MPa (수밀)', fck: 30, gamma_c: 24.5, desc: '수밀구조, 지하' },
  { label: 'fck=35 MPa (내구성)', fck: 35, gamma_c: 24.5, desc: '해양, 고내구' },
  { label: 'fck=40 MPa (고강도)', fck: 40, gamma_c: 24.5, desc: '프리캐스트' },
]

// ===== 철근 프리셋 (KDS 14 20 00) =====
export interface RebarGradePreset {
  label: string
  fy: number        // 항복강도 (MPa)
  desc: string
}

export const REBAR_GRADE_PRESETS: RebarGradePreset[] = [
  { label: 'SD400 (표준)', fy: 400, desc: '가장 일반적' },
  { label: 'SD300', fy: 300, desc: '일반용' },
  { label: 'SD500 (고강도)', fy: 500, desc: '고응력 부재' },
]

// ===== 피복두께 프리셋 (KDS 14 20 00) =====
export interface CoverPreset {
  label: string
  Dc_wall: number   // 벽체 피복 (mm)
  Dc_slab: number   // 저판 피복 (mm)
  desc: string
}

export const COVER_PRESETS: CoverPreset[] = [
  { label: '직접 입력', Dc_wall: 0, Dc_slab: 0, desc: '' },
  { label: '지중 매설 (표준)', Dc_wall: 80, Dc_slab: 80, desc: '흙에 접하는 부재' },
  { label: '지상 노출', Dc_wall: 40, Dc_slab: 40, desc: '외기 직접 노출' },
  { label: '수밀구조', Dc_wall: 50, Dc_slab: 50, desc: '수중/수밀 구조물' },
]

// ===== 상재하중 프리셋 =====
export interface SurchargePreset {
  label: string
  q: number          // kN/m²
  desc: string
}

export const SURCHARGE_PRESETS: SurchargePreset[] = [
  { label: '직접 입력', q: 0, desc: '' },
  { label: '일반 (10 kN/m²)', q: 10, desc: '주거/사무' },
  { label: '차량통행 (15 kN/m²)', q: 15, desc: '교대/도로' },
  { label: '중차량 (20 kN/m²)', q: 20, desc: '중량물' },
]

// ===== 내진계수 프리셋 (KDS 41 10 00) =====
export interface SeismicPreset {
  label: string
  Kh: number
  desc: string
}

export const SEISMIC_PRESETS: SeismicPreset[] = [
  { label: '직접 입력', Kh: 0, desc: '' },
  { label: '내진 I등급 (0.154g)', Kh: 0.154, desc: '특급교량' },
  { label: '내진 II등급 (0.11g)', Kh: 0.11, desc: '1등급교량' },
  { label: '내진특등급 (0.22g)', Kh: 0.22, desc: '내진특' },
  { label: '서울/경기 (0.077g)', Kh: 0.077, desc: '수도권' },
  { label: '영남/호남 (0.05g)', Kh: 0.05, desc: '저위험' },
]

// ===== 표준 철근 직경 =====
export const REBAR_DIAS = [10, 13, 16, 19, 22, 25, 29, 32]
