import type { HydroSegment, PipeResult, SegmentResult, LandUse, RegionName } from '@/types/hydro'
import { REGIONAL_IDF, PIPE_MATERIALS } from '@/lib/hydro/constants'

// === Rainfall ===
function getIdfTable(region: RegionName) {
  return REGIONAL_IDF[region] || REGIONAL_IDF['서울']
}

function interpolateDuration(t_min: number, rp: number, region: RegionName): number {
  const table = getIdfTable(region)
  const durations = Object.keys(table).map(Number).sort((a, b) => a - b)

  // if t_min < min: power law extrapolation
  if (t_min < durations[0]) {
    const t1 = durations[0], t2 = durations[1]
    const I1 = table[t1]?.[rp], I2 = table[t2]?.[rp]
    if (!I1 || !I2) return 0
    const n = Math.log(I1 / I2) / Math.log(t2 / t1)
    return I2 * Math.pow(t2 / t_min, n)
  }

  // if t_min > max: conservative extrapolation
  if (t_min > durations[durations.length - 1]) {
    const lastDur = durations[durations.length - 1]
    const lastI = table[lastDur]?.[rp]
    return lastI ? lastI * Math.pow(lastDur / t_min, 0.5) : 0
  }

  // interpolation (log-log)
  for (let i = 0; i < durations.length - 1; i++) {
    if (t_min >= durations[i] && t_min <= durations[i + 1]) {
      const t1 = durations[i], t2 = durations[i + 1]
      const I1 = table[t1]?.[rp], I2 = table[t2]?.[rp]
      if (!I1 || !I2) return 0
      const logRatio = Math.log(t_min / t1) / Math.log(t2 / t1)
      return Math.exp(Math.log(I1) + (Math.log(I2) - Math.log(I1)) * logRatio)
    }
  }

  return 0
}

export function calcRainfallIntensity(t_min: number, returnPeriod: number, region: RegionName): number {
  // Handle interpolation between return periods (10,20,30,50)
  const rps = [10, 20, 30, 50]
  if (rps.includes(returnPeriod)) return interpolateDuration(t_min, returnPeriod, region)

  // interpolate between return periods
  let rp1 = 10, rp2 = 50
  for (let i = 0; i < rps.length - 1; i++) {
    if (returnPeriod >= rps[i] && returnPeriod <= rps[i + 1]) {
      rp1 = rps[i]
      rp2 = rps[i + 1]
      break
    }
  }
  const I1 = interpolateDuration(t_min, rp1, region)
  const I2 = interpolateDuration(t_min, rp2, region)
  if (I1 === 0 || I2 === 0) return 0
  const ratio = (returnPeriod - rp1) / (rp2 - rp1)
  return I1 + (I2 - I1) * ratio
}

// === Time of Concentration ===
export function calcKerbyTime(L: number, S: number, n: number): number {
  if (S <= 0 || L <= 0) return 7
  return 1.44 * Math.pow((L * n / Math.sqrt(S)), 0.467)
}

export function calcTravelTime(L: number, V: number, a: number): number {
  if (V <= 0 || a <= 0 || L <= 0) return 0
  return L / (a * V * 60)
}

// === Manning ===
export function calcManningVelocity(n: number, R: number, slope: number): number {
  if (n <= 0 || R <= 0 || slope <= 0) return 0
  return (1 / n) * Math.pow(R, 2 / 3) * Math.pow(slope / 100, 0.5)
}

// === Pipe Hydraulics ===
export function calcCircularPipe(D_mm: number, n: number, slope_pct: number, fillRatio?: number): PipeResult {
  const D = D_mm / 1000
  const fr = fillRatio || 1.0

  if (fr >= 1.0) {
    const A = Math.PI * D * D / 4
    const P = Math.PI * D
    const R = D / 4
    const V = calcManningVelocity(n, R, slope_pct)
    return { A, P, R, V, Q: A * V, type: '원형관', fillRatio: 1.0, fillDesc: '만수' }
  }

  const h = fr * D
  const r = D / 2
  const cosArg = Math.max(-1, Math.min(1, (r - h) / r))
  const theta = 2 * Math.acos(cosArg)
  const A = (r * r / 2) * (theta - Math.sin(theta))
  const P = r * theta
  const R = P > 0 ? A / P : 0
  const V = calcManningVelocity(n, R, slope_pct)
  return { A, P, R, V, Q: A * V, type: '원형관', fillRatio: fr, fillDesc: `${(fr * 100).toFixed(0)}%충수` }
}

export function calcBoxCulvert(B_m: number, H_m: number, n: number, slope_pct: number, fillRatio?: number): PipeResult {
  const fr = fillRatio || 1.0
  const h = H_m * fr
  const A = B_m * h
  const P = fr >= 1.0 ? 2 * (B_m + H_m) : B_m + 2 * h
  const R = P > 0 ? A / P : 0
  const V = calcManningVelocity(n, R, slope_pct)
  return { A, P, R, V, Q: A * V, type: 'BOX', fillRatio: fr }
}

export function calcTrapezoidalDitch(B_top: number, B_bot: number, H: number, n: number, slope_pct: number, fillRatio?: number): PipeResult {
  const fr = fillRatio || 0.8
  const h = H * fr
  const m = (B_top - B_bot) / (2 * H)
  const b_eff = B_bot + 2 * m * h
  const A = (b_eff + B_bot) * h / 2
  const sideLength = Math.sqrt(h * h + Math.pow(m * h, 2))
  const P = B_bot + 2 * sideLength
  const R = P > 0 ? A / P : 0
  const V = calcManningVelocity(n, R, slope_pct)
  return { A, P, R, V, Q: A * V, type: '토사측구', fillRatio: fr }
}

export function calcUDitch(B_m: number, H_m: number, n: number, slope_pct: number, fillRatio?: number): PipeResult {
  const fr = fillRatio || 0.8
  const h = H_m * fr
  const r = B_m / 2
  let A: number, P: number

  if (h <= r) {
    const cosArg = Math.max(-1, Math.min(1, (r - h) / r))
    const theta = 2 * Math.acos(cosArg)
    A = (r * r / 2) * (theta - Math.sin(theta))
    P = r * theta
  } else {
    const A_semi = Math.PI * r * r / 2
    const h_rect = h - r
    A = A_semi + B_m * h_rect
    P = Math.PI * r + 2 * h_rect
  }

  const R = P > 0 ? A / P : 0
  const V = calcManningVelocity(n, R, slope_pct)
  return { A, P, R, V, Q: A * V, type: 'U형측구', fillRatio: fr }
}

export function calcJehyungDitch(B_top: number, B_bot: number, H: number, slopeLeft: number, slopeRight: number, n: number, slope_pct: number, fillRatio?: number): PipeResult {
  const fr = fillRatio || 0.8
  const h = H * fr
  const mL = slopeLeft, mR = slopeRight
  const b_eff = B_bot + mL * h + mR * h
  const A = (b_eff + B_bot) * h / 2
  const sL = Math.sqrt(h * h + (mL * h) * (mL * h))
  const sR = Math.sqrt(h * h + (mR * h) * (mR * h))
  const P = B_bot + sL + sR
  const R = P > 0 ? A / P : 0
  const V = calcManningVelocity(n, R, slope_pct)
  return { A, P, R, V, Q: A * V, type: '제형측구', fillRatio: fr }
}

// === Runoff ===
export function calcRationalDischarge(C: number, I: number, A_ha: number): number {
  return (1 / 360) * C * I * A_ha
}

export function calcWeightedRunoffCoeff(landuses: LandUse[]): number {
  if (!landuses.length) return 0
  let sumCA = 0, sumA = 0
  for (const lu of landuses) {
    sumCA += lu.coeff * lu.area
    sumA += lu.area
  }
  return sumA > 0 ? sumCA / sumA : 0
}

// === Helpers ===
export function getSegNval(seg: HydroSegment): number {
  // check material lookup
  const materials = PIPE_MATERIALS[seg.pipeType]
  if (materials && seg.pipeMaterial) {
    const mat = materials.find(m => m.name === seg.pipeMaterial)
    if (mat && mat.n > 0) return mat.n
    if (seg.pipeRoughnessManual) return parseFloat(seg.pipeRoughnessManual) || seg.pipeRoughness
  }

  // fallback to type-specific roughness
  switch (seg.pipeType) {
    case 'circular': return seg.pipeRoughness
    case 'box': return seg.boxRoughness
    case 'trapezoidal': return seg.ditchRoughness
    case 'uditch': return seg.uRoughness
    case 'jehyung': return seg.jhRoughness
    default: return 0.013
  }
}

export function getSegLength(seg: HydroSegment): number {
  return parseFloat(seg.commonLength) || 0
}

export function calcNaturalSlope(seg: HydroSegment): number {
  const from = parseFloat(seg.invertFrom) || 0
  const to = parseFloat(seg.invertTo) || 0
  const len = getSegLength(seg)
  if (len <= 0) return 0
  return ((from - to) / len) * 100 // %
}

export function getSegSlope(seg: HydroSegment): number {
  if (seg.slopeMode === 'manual') return parseFloat(seg.appliedSlope) || 0
  return calcNaturalSlope(seg)
}

function getDefaultFlowRatio(pipeType: string): number {
  switch (pipeType) {
    case 'circular': return 1.0
    case 'box': return 0.9
    default: return 0.8
  }
}

export function getFlowRatio(seg: HydroSegment): number {
  if (seg.flowRatio === 'manual') return parseFloat(seg.flowRatioValue) || getDefaultFlowRatio(seg.pipeType)
  return getDefaultFlowRatio(seg.pipeType)
}

// === Main Computation ===
export function computeSegment(seg: HydroSegment, designFreq: number, region: RegionName): SegmentResult {
  const result: SegmentResult = {
    t1: 0, t2: 0, tc: 0, intensity: 0, intensities: {},
    discharge: 0, area: 0, cumulArea: 0, appliedC: 0, runoffMethod: 'simple',
    pipeLength: 0, appliedSlope: 0, naturalSlope: 0, flowRatio: 0,
  }

  // effective design frequency
  const effectiveFreq = seg.segDesignFreq === 'project' ? designFreq : parseInt(seg.segDesignFreq) || designFreq

  // 1. Inflow time
  if (seg.inflowTimeMethod === 'kerby' && seg.kerbyL) {
    const rawL = parseFloat(seg.kerbyL) || 0
    const eU = parseFloat(seg.elevUpper) || 0
    const eL = parseFloat(seg.elevLower) || 0
    const kerbyH = eU - eL
    let S: number
    if (seg.kerbyLMethod === 'slope') {
      const cLen = parseFloat(seg.channelLength) || rawL
      S = cLen > 0 ? kerbyH / cLen : 0
    } else {
      S = rawL > 0 ? kerbyH / rawL : 0
    }
    result.t1 = calcKerbyTime(rawL, S, seg.kerbyN)
  } else {
    result.t1 = 7
  }

  // 2. Section characteristics
  const _comLen = getSegLength(seg)
  const _comSlope = getSegSlope(seg)
  const _natSlope = calcNaturalSlope(seg)
  const _fr = getFlowRatio(seg)
  result.pipeLength = _comLen
  result.appliedSlope = _comSlope
  result.naturalSlope = _natSlope
  result.flowRatio = _fr

  let pipeResult: PipeResult | undefined
  if (_comSlope > 0) {
    const nVal = getSegNval(seg)
    switch (seg.pipeType) {
      case 'circular':
        if (seg.pipeDiameter)
          pipeResult = calcCircularPipe(parseFloat(seg.pipeDiameter), nVal, _comSlope, _fr)
        break
      case 'box':
        if (seg.boxWidth && seg.boxHeight)
          pipeResult = calcBoxCulvert(parseFloat(seg.boxWidth), parseFloat(seg.boxHeight), nVal, _comSlope, _fr)
        break
      case 'trapezoidal':
        if (seg.ditchTopWidth && seg.ditchBotWidth && seg.ditchDepth)
          pipeResult = calcTrapezoidalDitch(parseFloat(seg.ditchTopWidth), parseFloat(seg.ditchBotWidth), parseFloat(seg.ditchDepth), nVal, _comSlope, _fr)
        break
      case 'uditch':
        if (seg.uWidth && seg.uHeight)
          pipeResult = calcUDitch(parseFloat(seg.uWidth), parseFloat(seg.uHeight), nVal, _comSlope, _fr)
        break
      case 'jehyung':
        if (seg.jhTopWidth && seg.jhBotWidth && seg.jhDepth)
          pipeResult = calcJehyungDitch(parseFloat(seg.jhTopWidth), parseFloat(seg.jhBotWidth), parseFloat(seg.jhDepth), seg.jhSlopeLeft, seg.jhSlopeRight, nVal, _comSlope, _fr)
        break
    }
  }

  if (pipeResult) {
    result.section = pipeResult
  } else if (_comSlope <= 0) {
    result.warning = '경사(I)가 0 이하입니다. 관거 표고를 확인하세요.'
  }

  // 3. Travel time
  if (seg.hasTravelTime && pipeResult && result.pipeLength > 0) {
    result.t2 = calcTravelTime(result.pipeLength, pipeResult.V, seg.travelCorrFactor)
  }

  // 4. Time of concentration
  result.tc = result.t1 + result.t2

  // 5. Rainfall intensity
  result.intensity = calcRainfallIntensity(result.tc, effectiveFreq, region)
  result.intensities = {}
  for (const rp of [10, 20, 30, 50]) {
    result.intensities[rp] = calcRainfallIntensity(result.tc, rp, region)
  }

  // 6. Discharge
  const A = parseFloat(seg.area) || 0
  const cA = parseFloat(seg.cumulArea) || A
  result.area = A
  result.cumulArea = cA
  let _C = seg.runoffCoeff
  result.runoffMethod = seg.runoffCoeffMethod || 'simple'
  if (seg.runoffCoeffMethod === 'weighted' && seg.runoffLanduses?.length) {
    _C = calcWeightedRunoffCoeff(seg.runoffLanduses)
    result.weightedC = _C
    result.landuses = seg.runoffLanduses
  }
  result.appliedC = _C
  result.discharge = calcRationalDischarge(_C, result.intensity, cA)

  // 7. Capacity check
  if (pipeResult) {
    const isPipe = seg.pipeType === 'circular' || seg.pipeType === 'box'
    const minV = isPipe ? 0.8 : 0.6
    const maxV = 3.0
    result.minV = minV
    result.maxV = maxV
    result.velocityOK = pipeResult.V >= minV && pipeResult.V <= maxV
    result.capacityOK = pipeResult.Q >= result.discharge
    if (pipeResult.V < minV) result.velocityCheck = 'NG(저속)'
    else if (pipeResult.V > maxV) result.velocityCheck = 'NG(고속)'
    else result.velocityCheck = 'OK'
  }

  // 8. Existing section review
  if (seg.hasExistingSection) {
    const exSlope = seg.existSlopeMode === 'manual'
      ? (parseFloat(seg.existAppliedSlope) || 0)
      : (() => {
          const f = parseFloat(seg.existInvertFrom) || 0
          const t = parseFloat(seg.existInvertTo) || 0
          const l = parseFloat(seg.existLength) || 0
          return l > 0 ? ((f - t) / l) * 100 : 0
        })()

    if (exSlope > 0) {
      let exResult: PipeResult | undefined
      switch (seg.existPipeType) {
        case 'circular':
          if (seg.existDiameter)
            exResult = calcCircularPipe(parseFloat(seg.existDiameter), seg.existRoughness, exSlope, seg.existFlowRatio)
          break
        case 'box':
          if (seg.existBoxW && seg.existBoxH)
            exResult = calcBoxCulvert(parseFloat(seg.existBoxW), parseFloat(seg.existBoxH), seg.existRoughness, exSlope, seg.existFlowRatio)
          break
        case 'uditch':
          if (seg.existUWidth && seg.existUHeight)
            exResult = calcUDitch(parseFloat(seg.existUWidth), parseFloat(seg.existUHeight), seg.existRoughness, exSlope, seg.existFlowRatio)
          break
      }
      if (exResult) {
        result.existSection = exResult
        result.existCapacityOK = exResult.Q >= result.discharge
        const isPipe = seg.existPipeType === 'circular' || seg.existPipeType === 'box'
        result.existVelocityOK = exResult.V >= (isPipe ? 0.8 : 0.6) && exResult.V <= 3.0
      }
    }
  }

  return result
}

export function computeAll(segments: HydroSegment[], designFreq: number, region: RegionName) {
  return segments.map(seg => ({ segment: seg, result: computeSegment(seg, designFreq, region) }))
}
