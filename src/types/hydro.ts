export type PipeType = 'circular' | 'box' | 'trapezoidal' | 'uditch' | 'jehyung'
export type RegionName = '서울' | '부산' | '대구' | '인천' | '광주' | '대전' | '울산' | '세종' | '수원' | '춘천' | '청주' | '전주' | '목포' | '포항' | '창원' | '김해' | '제주'
export type DesignFrequency = 10 | 20 | 30 | 50
export type HydroTab = 'project' | 'segments' | 'results' | 'summary' | 'report'

export interface HydroProject {
  name: string
  location: string
  company: string
  designer: string
  date: string
  designFrequency: DesignFrequency
  remarks: string
}

export interface LandUse {
  baseIdx: number
  coeff: number
  area: number
  landuse: string
}

export interface HydroSegment {
  id: number
  name: string
  watershed: string
  manholeFrom: string
  manholeTo: string
  area: string
  cumulArea: string
  runoffCoeff: number
  runoffCoeffType: string
  runoffCoeffMethod: 'simple' | 'weighted'
  runoffLanduses: LandUse[]
  elevUpper: string
  elevLower: string
  channelLength: string
  kerbyL: string
  kerbyN: number
  kerbyLMethod: 'horizontal' | 'slope'
  inflowTimeMethod: 'default' | 'kerby'
  hasTravelTime: boolean
  travelPipeLength: string
  travelCorrFactor: number
  segDesignFreq: 'project' | string
  pipeType: PipeType
  invertFrom: string
  invertTo: string
  commonLength: string
  slopeMode: 'auto' | 'manual'
  appliedSlope: string
  flowRatio: 'auto' | 'manual'
  flowRatioValue: string
  pipeDiameter: string
  pipeMaterial: string
  pipeRoughness: number
  pipeRoughnessManual: string
  boxWidth: string
  boxHeight: string
  boxRoughness: number
  ditchTopWidth: string
  ditchBotWidth: string
  ditchDepth: string
  ditchRoughness: number
  uWidth: string
  uHeight: string
  uRoughness: number
  jhTopWidth: string
  jhBotWidth: string
  jhDepth: string
  jhSlopeLeft: number
  jhSlopeRight: number
  jhRoughness: number
  hasExistingSection: boolean
  existPipeType: string
  existDiameter: string
  existBoxW: string
  existBoxH: string
  existUWidth: string
  existUHeight: string
  existRoughness: number
  existLength: string
  existInvertFrom: string
  existInvertTo: string
  existSlopeMode: 'auto' | 'manual'
  existAppliedSlope: string
  existFlowRatio: number
  remark: string
}

export interface PipeResult {
  A: number
  P: number
  R: number
  V: number
  Q: number
  type: string
  fillRatio: number
  fillDesc?: string
}

export interface SegmentResult {
  t1: number
  t2: number
  tc: number
  intensity: number
  intensities: Record<number, number>
  discharge: number
  area: number
  cumulArea: number
  appliedC: number
  runoffMethod: string
  weightedC?: number
  landuses?: LandUse[]
  pipeLength: number
  appliedSlope: number
  naturalSlope: number
  flowRatio: number
  section?: PipeResult
  velocityOK?: boolean
  capacityOK?: boolean
  velocityCheck?: string
  minV?: number
  maxV?: number
  warning?: string
  // existing section
  existSection?: PipeResult
  existCapacityOK?: boolean
  existVelocityOK?: boolean
}

export interface HydroState {
  project: HydroProject
  segments: HydroSegment[]
  nextId: number
}

export interface ComputedResult {
  segment: HydroSegment
  result: SegmentResult
}

export function createDefaultProject(): HydroProject {
  return {
    name: '', location: '', company: '', designer: '', date: '',
    designFrequency: 50, remarks: ''
  }
}

export function createDefaultSegment(nextId: number): HydroSegment {
  return {
    id: nextId, name: '', watershed: '', manholeFrom: '', manholeTo: '',
    area: '', cumulArea: '', runoffCoeff: 0.85, runoffCoeffType: 'rc_2_0.85',
    runoffCoeffMethod: 'simple', runoffLanduses: [],
    elevUpper: '', elevLower: '', channelLength: '',
    kerbyL: '', kerbyN: 0.50, kerbyLMethod: 'horizontal',
    inflowTimeMethod: 'kerby', hasTravelTime: true,
    travelPipeLength: '', travelCorrFactor: 1.25,
    segDesignFreq: 'project',
    pipeType: 'circular', invertFrom: '', invertTo: '', commonLength: '',
    slopeMode: 'auto', appliedSlope: '', flowRatio: 'auto', flowRatioValue: '',
    pipeDiameter: '', pipeMaterial: '', pipeRoughness: 0.013, pipeRoughnessManual: '',
    boxWidth: '', boxHeight: '', boxRoughness: 0.015,
    ditchTopWidth: '', ditchBotWidth: '', ditchDepth: '', ditchRoughness: 0.020,
    uWidth: '', uHeight: '', uRoughness: 0.015,
    jhTopWidth: '', jhBotWidth: '', jhDepth: '',
    jhSlopeLeft: 1.0, jhSlopeRight: 1.0, jhRoughness: 0.015,
    hasExistingSection: false, existPipeType: 'circular',
    existDiameter: '', existBoxW: '', existBoxH: '',
    existUWidth: '', existUHeight: '', existRoughness: 0.013,
    existLength: '', existInvertFrom: '', existInvertTo: '',
    existSlopeMode: 'auto', existAppliedSlope: '', existFlowRatio: 1.0,
    remark: ''
  }
}

export function createDefaultState(): HydroState {
  return { project: createDefaultProject(), segments: [], nextId: 1 }
}
