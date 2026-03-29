# -*- coding: utf-8 -*-
"""
옹벽 구조계산 엔진 모듈 (4종 통합: L형, 역L형, 역T형, 중력식/반중력식)
적용기준: KDS 11 80 05, KDS 11 80 15, KDS 14 20 20
토압: 안정검토 Rankine / 단면검토 Coulomb / 지진 Mononobe-Okabe

수정 이력 (검증보고서 반영):
  [C-01] 저판(B-B) 설계모멘트: heel 실제 모멘트 사용
  [C-02] 자중블록 좌표계: C6_toe 기준 전역좌표 적용
  [C-03] Rankine 토압 cos(alpha) 이중적용 제거, Pa_v 수직성분 추가
  [H-01] 균열제어 Cc = Dc_mm (순피복두께)
  [H-02] LCB2 관성력 하중계수 1.0 통일
  [H-03] 상시 e > B/6 삼각형 분포 처리
  [H-04] 지지력 Meyerhof 유효폭 방법 통일
  [H-05] 벽체 관성력 batter 반영
  [M-01] phi_f 전이구간 선형보간
  [M-02] beta1 fck > 28 MPa 반영
  [M-03] D-D 단면높이 경사벽체 반영
  [M-04] 균열제어 기준응력 280 MPa (현행 KDS)
"""

import math

# ================================================================
# Terzaghi 지지력 계수 테이블 (phi 단위: 도)
# ================================================================
TERZAGHI_TABLE = {
    0:  (5.700, 1.000, 0.000),
    5:  (7.300, 1.600, 0.500),
    10: (9.600, 2.700, 1.200),
    15: (12.900, 4.400, 2.500),
    20: (17.700, 7.400, 5.000),
    25: (25.100, 12.700, 9.700),
    26: (27.100, 14.210, 11.250),
    27: (29.240, 15.900, 13.200),
    28: (31.610, 17.810, 15.700),
    29: (34.240, 19.980, 18.600),
    30: (37.200, 22.500, 19.700),
    31: (40.410, 25.280, 22.700),
    32: (44.040, 28.520, 27.900),
    33: (48.090, 32.230, 31.100),
    34: (52.640, 36.500, 36.000),
    35: (57.800, 41.400, 42.400),
    40: (95.700, 81.300, 100.400),
    45: (172.300, 173.300, 297.500),
}


def _interp_terzaghi(phi_deg):
    """Terzaghi 지지력 계수를 선형 보간"""
    keys = sorted(TERZAGHI_TABLE.keys())
    if phi_deg <= keys[0]:
        return TERZAGHI_TABLE[keys[0]]
    if phi_deg >= keys[-1]:
        return TERZAGHI_TABLE[keys[-1]]
    for i in range(len(keys) - 1):
        if keys[i] <= phi_deg <= keys[i + 1]:
            lo, hi = keys[i], keys[i + 1]
            t = (phi_deg - lo) / (hi - lo)
            Nc = TERZAGHI_TABLE[lo][0] + t * (TERZAGHI_TABLE[hi][0] - TERZAGHI_TABLE[lo][0])
            Nq = TERZAGHI_TABLE[lo][1] + t * (TERZAGHI_TABLE[hi][1] - TERZAGHI_TABLE[lo][1])
            Nr = TERZAGHI_TABLE[lo][2] + t * (TERZAGHI_TABLE[hi][2] - TERZAGHI_TABLE[lo][2])
            return (Nc, Nq, Nr)
    return TERZAGHI_TABLE[keys[-1]]


def _rebar_area(dia):
    """철근 공칭 단면적 (mm2)"""
    table = {
        10: 71.3, 13: 126.7, 16: 198.6, 19: 286.5,
        22: 387.1, 25: 506.7, 29: 642.4, 32: 794.2,
    }
    return table.get(dia, math.pi / 4 * dia ** 2)


def calculate_wall(params: dict) -> dict:
    """
    옹벽 구조계산 수행 (L형, 역L형, 역T형, 중력식/반중력식).
    """
    # --- 옹벽 형식 ---
    wall_type = params.get('wall_type', 'L형')
    is_gravity = (wall_type == '중력식')
    is_semi_gravity = params.get('semi_gravity', False) and is_gravity

    # --- 입력값 추출 ---
    H = params['H']
    B = params['B']
    t_stem = params['t_stem']
    batter = params.get('batter', 0.0)           # C1 전면(노출측) 경사폭
    batter_back = params.get('batter_back', 0.0)  # C3 배면(토사측) 경사폭
    conn_h = params.get('conn_h', 0.0)            # 접합부 높이
    t_stem_bot = t_stem + batter + batter_back     # 벽체 하단 총폭
    H_stem = params['H_stem']
    D_slab = params['D_slab']
    C6_toe = params['C6_toe']
    C8_heel = params['C8_heel']

    # 역L형: Heel 강제 0
    if wall_type == '역L형':
        C8_heel = 0.0
    Hs_soil = params['Hs_soil']
    Df = params['Df']
    gamma_c = params['gamma_c']
    gamma_t = params['gamma_t']
    gamma_sat = params.get('gamma_sat', 20.0)
    phi_deg = params['phi_deg']
    c_soil = params['c_soil']
    alpha_deg = params['alpha_deg']
    q = params['q']
    Kh = params['Kh']
    fck = params['fck']
    fy = params['fy']
    gwl_height = params.get('gwl_height', 0.0)

    rebar1_dia = params.get('rebar1_dia', 13)
    rebar1_spacing = params.get('rebar1_spacing', 125)
    rebar2_dia = params.get('rebar2_dia', 13)
    rebar2_spacing = params.get('rebar2_spacing', 250)
    rebar3_dia = params.get('rebar3_dia', rebar1_dia)
    rebar3_spacing = params.get('rebar3_spacing', rebar1_spacing)

    rebar_toe_dia = params.get('rebar_toe_dia', rebar1_dia)
    rebar_toe_spacing = params.get('rebar_toe_spacing', rebar1_spacing)

    rebar1_area = _rebar_area(rebar1_dia)
    rebar2_area = _rebar_area(rebar2_dia)
    rebar3_area = _rebar_area(rebar3_dia)
    rebar_toe_area = _rebar_area(rebar_toe_dia)

    # Toe 유효길이 및 has_toe/has_heel 판별
    L_toe_eff = max(C6_toe - t_stem - batter, 0.0)
    if is_gravity:
        has_toe = False
        has_heel = False
    else:
        has_toe = (wall_type in ['역L형', '역T형']) or (L_toe_eff >= 0.2 - 1e-9)
        has_heel = (wall_type != '역L형') and (C8_heel > 0.01)

    He = D_slab + Hs_soil  # 토압 산정 높이

    phi = math.radians(phi_deg)
    alpha = math.radians(alpha_deg)
    sin_a = math.sin(alpha)

    Nc, Nq, Nr = _interp_terzaghi(phi_deg)

    # 피복두께 (콘크리트면 ~ 철근 중심까지 거리, mm)
    Dc_slab = params.get('Dc_slab', 80.0)    # mm (저판)
    Dc_wall = params.get('Dc_wall', 80.0)    # mm (벽체)
    Dc_toe = params.get('Dc_toe', Dc_slab)   # mm (앞굽판)
    Es = 200000.0        # MPa

    gamma_w = 9.81
    gamma_sub = gamma_sat - gamma_w if gwl_height > 0 else 0.0

    # ================================================================
    # 3.1 자중 블록
    # ================================================================
    # 지하수위 처리: S1 블록 분할
    if gwl_height > 0:
        h_dry = max(Hs_soil - gwl_height, 0)
        h_wet = min(gwl_height, Hs_soil)
    else:
        h_dry = Hs_soil
        h_wet = 0.0

    # 테이퍼 저판 처리
    D_slab_end = params.get('D_slab_end', D_slab)  # Heel 끝 저판두께
    taper = D_slab - D_slab_end  # 테이퍼량 (>=0)

    if is_gravity:
        # ---- 중력식 옹벽: 사다리꼴 단일 블록, 저판 없음 ----
        # 중력식: 상단폭=t_stem, 하단폭=B (=t_stem+batter+batter_back)
        # 사다리꼴 면적 = (상단폭 + 하단폭) / 2 * H
        A_grav = (t_stem + B) / 2 * H
        # 사다리꼴 도심 x: 좌측하단=0 기준
        # 전면경사 batter, 배면경사 batter_back
        # 상단 좌표: (batter, H) ~ (batter+t_stem, H)
        # 하단 좌표: (0, 0) ~ (B, 0)
        # 직사각형(t_stem*H) 도심x = batter + t_stem/2
        # 전면삼각형(0.5*batter*H) 도심x = batter*2/3
        # 배면삼각형(0.5*batter_back*H) 도심x = batter+t_stem + batter_back/3
        A_rect = t_stem * H
        A_tri_f = 0.5 * batter * H if batter > 0 else 0.0
        A_tri_b = 0.5 * batter_back * H if batter_back > 0 else 0.0
        x_rect = batter + t_stem / 2
        x_tri_f = batter * 2 / 3 if batter > 0 else 0.0
        x_tri_b = (batter + t_stem + batter_back / 3) if batter_back > 0 else 0.0
        if A_grav > 0:
            x_grav = (A_rect * x_rect + A_tri_f * x_tri_f + A_tri_b * x_tri_b) / A_grav
        else:
            x_grav = B / 2
        y_grav = H / 3  # 사다리꼴 간략 도심 (직사각+삼각 복합)
        # 더 정확한 도심 y
        if A_grav > 0:
            y_grav = (A_rect * (H / 2) + A_tri_f * (H / 3) + A_tri_b * (H / 3)) / A_grav
        c_blocks = [
            ("벽체", A_grav, gamma_c, x_grav, y_grav),
        ]
        # 중력식 토사: 배면 토사는 벽체 뒤쪽 (저판 없으므로 Heel 토사 없음)
        # 배면토사 = 벽체 배면에서 수직 상방 경사 토사
        # 역L형과 유사: 저판 위 토사 없음, 배면에 토사 토압만 작용
        s_blocks = [
            ("S1", 0.0, gamma_t, 0.0, 0.0),
        ]
        # 블록 계산에 필요한 변수 초기화
        A_C1 = A_tri_f
        A_C2 = A_rect
        A_C3 = A_tri_b
        A_C5 = 0.0
        A_C6 = 0.0
        A_C7 = 0.0
        A_C8 = 0.0

    else:
        # ---- L형/역L형/역T형 공통 ----
        # 콘크리트 블록
        # [C-02 수정] 좌표계: 저판 좌측 하단 = (0,0), 벽체 배면 상단 x = C6_toe

        # C1: 전면 경사 삼각형 (batter) - 벽체 전면에서 좌측으로 확장
        A_C1 = 0.5 * batter * H_stem if batter > 0 else 0.0
        x_C1 = (C6_toe - t_stem - batter / 3) if batter > 0 else 0.0
        y_C1 = (D_slab + H_stem / 3) if batter > 0 else 0.0

        # C2: 벽체 직사각형 (주 두께) - C6_toe-t_stem ~ C6_toe
        A_C2 = t_stem * H_stem
        x_C2 = C6_toe - t_stem / 2
        y_C2 = D_slab + conn_h + H_stem / 2

        # C3: 배면(토사측) 경사 삼각형 - C6_toe에서 우측으로 확장
        A_C3 = 0.5 * batter_back * H_stem if batter_back > 0 else 0.0
        x_C3 = (C6_toe + batter_back / 3) if batter_back > 0 else 0.0
        y_C3 = (D_slab + conn_h + H_stem / 3) if batter_back > 0 else 0.0

        # C5: 접합부 (conn_h > 0일때) - 전체 하단폭
        A_C5 = t_stem_bot * conn_h if conn_h > 0 else 0.0
        x_C5 = (C6_toe - t_stem / 2 - batter / 2 + batter_back / 2) if conn_h > 0 else 0.0
        y_C5 = D_slab + conn_h / 2 if conn_h > 0 else 0.0

        # C6: Toe 저판
        A_C6 = C6_toe * D_slab
        x_C6 = C6_toe / 2
        y_C6 = D_slab / 2

        # C7: 테이퍼 삼각형
        if taper > 0 and C8_heel > 0:
            A_C7 = 0.5 * taper * C8_heel
            x_C7 = C6_toe + C8_heel / 3
            y_C7 = D_slab_end + taper * 2 / 3
        else:
            A_C7 = 0.0; x_C7 = 0.0; y_C7 = 0.0

        # C8: Heel 저판 (균일부 = D_slab_end 두께)
        A_C8 = C8_heel * D_slab_end
        x_C8 = C6_toe + C8_heel / 2
        y_C8 = D_slab_end / 2

        c_blocks = [
            ("C1", A_C1, gamma_c, x_C1, y_C1),
            ("C2", A_C2, gamma_c, x_C2, y_C2),
            ("C3", A_C3, gamma_c, x_C3, y_C3),
            ("C4", 0.0, gamma_c, 0.0, 0.0),
            ("C5", A_C5, gamma_c, x_C5, y_C5),
            ("C6", A_C6, gamma_c, x_C6, y_C6),
            ("C7", A_C7, gamma_c, x_C7, y_C7),
            ("C8", A_C8, gamma_c, x_C8, y_C8),
        ]

    # 토사 블록 (L형/역L형/역T형)
    if not is_gravity and gwl_height > 0 and h_wet > 0:
        # S1a: 건조부 (상부)
        A_S1a = C8_heel * h_dry
        x_S1a = C6_toe + C8_heel / 2
        y_S1a = D_slab + h_wet + h_dry / 2 if h_dry > 0 else 0.0

        # S1b: 수중부 (하부)
        A_S1b = C8_heel * h_wet
        x_S1b = C6_toe + C8_heel / 2
        y_S1b = D_slab + h_wet / 2

        # S2: 배면 경사 토사 (지하수위 경우에도 동일)
        if batter_back > 0 and H_stem > 0:
            A_S2 = 0.5 * batter_back * H_stem
            x_S2 = C6_toe + batter_back * 2 / 3
            y_S2 = D_slab + conn_h + H_stem * 2 / 3
        else:
            A_S2 = 0.0; x_S2 = 0.0; y_S2 = 0.0

        # S5: 테이퍼 저판 위 토사
        if taper > 0 and C8_heel > 0:
            A_S5 = 0.5 * taper * C8_heel
            x_S5 = C6_toe + C8_heel * 2 / 3
            y_S5 = (D_slab + D_slab + D_slab_end) / 3
        else:
            A_S5 = 0.0; x_S5 = 0.0; y_S5 = 0.0

        s_blocks = [
            ("S1a", A_S1a, gamma_t, x_S1a, y_S1a),
            ("S1b", A_S1b, gamma_sub, x_S1b, y_S1b),
            ("S2", A_S2, gamma_t, x_S2, y_S2),
            ("S3", 0.0, gamma_t, 0.0, 0.0),
            ("S4", 0.0, gamma_t, 0.0, 0.0),
            ("S5", A_S5, gamma_t, x_S5, y_S5),
        ]
    elif not is_gravity:
        A_S1 = C8_heel * Hs_soil
        x_S1 = C6_toe + C8_heel / 2
        y_S1 = D_slab + Hs_soil / 2

        # S2: 배면 경사(batter_back) 토사 삼각형
        # 벽체 배면이 경사지면 삼각형 토사가 채워짐
        if batter_back > 0 and H_stem > 0:
            A_S2 = 0.5 * batter_back * H_stem
            x_S2 = C6_toe + batter_back * 2 / 3
            y_S2 = D_slab + conn_h + H_stem * 2 / 3
        else:
            A_S2 = 0.0; x_S2 = 0.0; y_S2 = 0.0

        # S5: 테이퍼 저판 위 토사 삼각형 (C7 역삼각)
        if taper > 0 and C8_heel > 0:
            A_S5 = 0.5 * taper * C8_heel
            x_S5 = C6_toe + C8_heel * 2 / 3
            y_S5 = (D_slab + D_slab + D_slab_end) / 3  # 삼각형 도심
        else:
            A_S5 = 0.0; x_S5 = 0.0; y_S5 = 0.0

        s_blocks = [
            ("S1", A_S1, gamma_t, x_S1, y_S1),
            ("S2", A_S2, gamma_t, x_S2, y_S2),
            ("S3", 0.0, gamma_t, 0.0, 0.0),
            ("S4", 0.0, gamma_t, 0.0, 0.0),
            ("S5", A_S5, gamma_t, x_S5, y_S5),
        ]

    def calc_block(name, A, gamma, x, y):
        W = A * gamma
        KhW = W * Kh
        Mr = W * x
        Mo = KhW * y
        return {"name": name, "A": A, "gamma": gamma, "W": W, "Kh": Kh,
                "KhW": KhW, "x": x, "y": y, "Mr": Mr, "Mo": Mo}

    c_results = [calc_block(*b) for b in c_blocks]
    s_results = [calc_block(*b) for b in s_blocks]

    Wc = sum(r["W"] for r in c_results)
    KhWc = sum(r["KhW"] for r in c_results)
    Mrc = sum(r["Mr"] for r in c_results)
    Moc = sum(r["Mo"] for r in c_results)

    Ws = sum(r["W"] for r in s_results)
    KhWs = sum(r["KhW"] for r in s_results)
    Mrs = sum(r["Mr"] for r in s_results)
    Mos = sum(r["Mo"] for r in s_results)

    Wt = Wc + Ws
    KhWt = KhWc + KhWs
    Mrt = Mrc + Mrs
    Mot = Moc + Mos

    # ================================================================
    # 토압 계산
    # ================================================================
    cos_a = math.cos(alpha)
    cos2_a = cos_a ** 2
    cos2_phi = math.cos(phi) ** 2
    Ka = cos_a * (cos_a - math.sqrt(max(cos2_a - cos2_phi, 0))) / \
         (cos_a + math.sqrt(max(cos2_a - cos2_phi, 0)))

    # [C-03 수정] 상시 주동토압 - cos_a 이중적용 제거, Pa_v 수직성분 추가
    # Pa_total = 0.5 * Ka * gamma * H^2 (뒤채움면 방향 합력)
    # Pa_h = Pa_total * cos(alpha), Pa_v = Pa_total * sin(alpha)
    if gwl_height > 0:
        # 유효응력법
        h_dry_ep = max(He - gwl_height, 0)
        h_wet_ep = min(gwl_height, He)
        # 건조부 토압
        sigma_dry = gamma_t * h_dry_ep
        Pa_dry_total = 0.5 * Ka * gamma_t * h_dry_ep ** 2
        # 수중부 토압 (유효응력)
        sigma_top_wet = Ka * sigma_dry
        sigma_bot_wet = Ka * (sigma_dry + gamma_sub * h_wet_ep)
        Pa_wet_total = (sigma_top_wet + sigma_bot_wet) / 2 * h_wet_ep
        Pa_total = Pa_dry_total + Pa_wet_total
        Pa_h = Pa_total * cos_a   # 수평성분
        Pa_v = Pa_total * sin_a   # 수직성분 (안정화 방향)
        # 수압
        Pw = 0.5 * gamma_w * gwl_height ** 2
        # 양압력
        U = gamma_w * gwl_height * B
        # 토압 작용점 (가중평균)
        if Pa_total > 0:
            ya_dry = h_wet_ep + h_dry_ep / 3 if Pa_dry_total > 0 else 0
            if (sigma_top_wet + sigma_bot_wet) > 0:
                ya_wet = h_wet_ep / 3 * (sigma_top_wet + 2 * sigma_bot_wet) / (sigma_top_wet + sigma_bot_wet)
            else:
                ya_wet = h_wet_ep / 3
            ya = (Pa_dry_total * ya_dry + Pa_wet_total * ya_wet) / Pa_total if Pa_total > 0 else He / 3
        else:
            ya = He / 3
    else:
        Pa_total = 0.5 * Ka * gamma_t * He ** 2
        Pa_h = Pa_total * cos_a   # 수평성분
        Pa_v = Pa_total * sin_a   # 수직성분
        ya = He / 3
        Pw = 0.0
        U = 0.0

    Mo_pa = Pa_h * ya
    # Pa_v 작용점: 벽체 배면 (x = C6_toe)
    Mr_pa_v = Pa_v * C6_toe

    # M-O 토압계수 (안정검토, delta=0)
    theta_rad = math.atan(Kh / (1 - 0))
    beta_rad = 0.0
    delta_stab = 0.0

    num_KAE = math.cos(phi - theta_rad - beta_rad) ** 2
    sin_pd = math.sin(phi + delta_stab)
    sin_pta = math.sin(phi - theta_rad - alpha)
    cos_theta = math.cos(theta_rad)
    cos2_beta = math.cos(beta_rad) ** 2
    cos_dbt = math.cos(delta_stab + beta_rad + theta_rad)
    cos_ab = math.cos(alpha - beta_rad)

    if sin_pta < 0:
        sin_pta = 0
    denom_product = cos_dbt * cos_ab
    if denom_product <= 0:
        denom_product = 1e-10
    inner_sqrt = math.sqrt(sin_pd * max(sin_pta, 0)) / math.sqrt(denom_product)
    den_KAE = cos_theta * cos2_beta * cos_dbt * (1 + inner_sqrt) ** 2
    if den_KAE == 0:
        den_KAE = 1e-10
    KAE = num_KAE / den_KAE

    PAE = 0.5 * KAE * gamma_t * He ** 2
    yae = He / 2
    Mo_pae = PAE * yae

    # 과재하중
    Ph_sur = Ka * q * He * cos_a   # 수평성분
    Pv_sur_ep = Ka * q * He * sin_a  # 과재 토압 수직성분
    # Pv: Heel + 배면경사(batter_back) 영역까지 상재하중 적용
    L_sur = C8_heel + batter_back
    x_Pv_start = C6_toe - batter_back
    Pv_sur = q * L_sur
    ya_sur = He / 2
    x_Pv = x_Pv_start + L_sur / 2
    Mo_ph = Ph_sur * ya_sur
    Mr_pv = Pv_sur * x_Pv

    # ================================================================
    # 3.2 안정검토용 하중집계
    # ================================================================
    # [C-03 수정] Pa_v를 수직력에 추가, Pa_h를 수평력으로 사용
    SVn = Wt + Pv_sur + Pa_v - (U if gwl_height > 0 else 0)
    SHn = Pa_h + Ph_sur + (Pw if gwl_height > 0 else 0)
    SMrn = Mrt + Mr_pv + Mr_pa_v
    SMon = Mo_pa + Mo_ph + (Pw * gwl_height / 3 if gwl_height > 0 else 0)

    # 지진시 (상재 Pv 제외, 관성력 포함)
    SVe = Wt - (U if gwl_height > 0 else 0)
    SHe = PAE + KhWt + (Pw if gwl_height > 0 else 0)
    SMre = Mrt
    SMe = Mot + Mo_pae + (Pw * gwl_height / 3 if gwl_height > 0 else 0)

    # ================================================================
    # 3.3 전도
    # ================================================================
    B6 = B / 6
    B3 = B / 3

    e_n = B / 2 - (SMrn - SMon) / SVn if SVn != 0 else 0
    SF_ot_n = SMrn / SMon if SMon != 0 else 999.0

    e_e = B / 2 - (SMre - SMe) / SVe if SVe != 0 else 0
    SF_ot_e = SMre / SMe if SMe != 0 else 999.0

    # ================================================================
    # 3.4 지지력
    # ================================================================
    phi2_deg = params.get('phi2_deg', phi_deg)
    gamma_found = params.get('gamma_found', gamma_t)
    Nc2, Nq2, Nr2 = _interp_terzaghi(phi2_deg)

    alpha_T = 1.0
    beta_T = 0.5

    # 허용지지력: 고정값 또는 Terzaghi 계산
    qa_fixed = params.get('qa_fixed', 0.0)
    qae_fixed = params.get('qae_fixed', 0.0)

    # [H-04 수정] Meyerhof 유효폭 방법 통일
    Be_n = B - 2 * e_n
    if Be_n < 0:
        Be_n = 0.01
    qu_n = alpha_T * c_soil * Nc2 + gamma_found * Df * Nq2 + beta_T * gamma_found * Be_n * Nr2
    qa_n = qa_fixed if qa_fixed > 0 else qu_n / 3

    # [H-03 수정] 상시 e > B/6 삼각형 분포 처리
    if e_n > B6:
        denom_n = 3 * (B / 2 - e_n)
        Q1_n = 2 * SVn / (denom_n * 1) if denom_n > 0 else 0
        Q2_n = 0.0
    else:
        Q1_n = SVn / (B * 1) * (1 + 6 * e_n / B)
        Q2_n = SVn / (B * 1) * (1 - 6 * e_n / B)

    Be_e = B - 2 * e_e
    if Be_e < 0:
        Be_e = 0.01
    qu_e = alpha_T * c_soil * Nc2 + gamma_found * Df * Nq2 + beta_T * gamma_found * Be_e * Nr2
    qa_e = qae_fixed if qae_fixed > 0 else qu_e / 2

    if e_e > B6:
        denom_e = 3 * (B / 2 - e_e)
        Q1_e = 2 * SVe / (denom_e * 1) if denom_e > 0 else 0
        Q2_e = 0.0
    else:
        Q1_e = SVe / (B * 1) * (1 + 6 * e_e / B)
        Q2_e = SVe / (B * 1) * (1 - 6 * e_e / B)

    # ================================================================
    # 3.5 활동
    # ================================================================
    phi_B = phi2_deg * 2 / 3
    mu = math.tan(math.radians(phi_B))

    # 수동토압 (옵션)
    passive_enabled = params.get('passive_enabled', False)
    passive_ratio_pct = params.get('passive_ratio', 0)
    Kp = math.tan(math.pi / 4 + phi / 2) ** 2
    Pp = 0.0
    if passive_enabled and passive_ratio_pct > 0 and Df > 0:
        gamma_front = params.get('gamma_t', 19.0)
        Pp_full = 0.5 * Kp * gamma_front * Df ** 2
        Pp = Pp_full * passive_ratio_pct / 100.0

    # 활동방지키 (옵션)
    key_enabled = params.get('key_enabled', False)
    key_depth = params.get('key_depth', 0.0)
    key_width = params.get('key_width', 0.0)
    Pp_key = 0.0
    if key_enabled and key_depth > 0:
        gamma_front = params.get('gamma_t', 19.0)
        h_top = Df + D_slab
        h_bot = h_top + key_depth
        Pp_key = 0.5 * Kp * gamma_front * (h_bot ** 2 - h_top ** 2)
        W_key = gamma_c * key_width * key_depth

    Hr_n = c_soil * B + SVn * mu + Pp + Pp_key
    SF_sl_n = Hr_n / SHn if SHn != 0 else 999.0

    Hr_e = c_soil * B + SVe * mu + Pp + Pp_key
    SF_sl_e = Hr_e / SHe if SHe != 0 else 999.0

    # ================================================================
    # 4. 단면검토
    # ================================================================
    # Coulomb 토압계수 (단면검토, delta=10deg)
    # θ = 옹벽배면의 연직경사각 = atan(batter_back / H_stem)
    delta_c_deg = 10.0
    delta_c = math.radians(delta_c_deg)
    theta_c_deg = math.degrees(math.atan(batter_back / H_stem)) if batter_back > 0 and H_stem > 0 else 0.0
    theta_c = math.radians(theta_c_deg)

    num_Ka_c = math.cos(phi - theta_c) ** 2
    sin_pd_c = math.sin(phi + delta_c)
    sin_pa_c = math.sin(phi - alpha)
    cos2_theta_c = math.cos(theta_c) ** 2
    cos_td_c = math.cos(theta_c + delta_c)
    cos_ta_c = math.cos(theta_c - alpha)
    denom_prod_c = cos_td_c * cos_ta_c
    if denom_prod_c <= 0:
        denom_prod_c = 1e-10
    inner_c = math.sqrt(sin_pd_c * max(sin_pa_c, 0)) / math.sqrt(denom_prod_c)
    den_Ka_c = cos2_theta_c * cos_td_c * (1 + inner_c) ** 2
    Ka_coul = num_Ka_c / den_Ka_c if den_Ka_c != 0 else Ka
    Kah = Ka_coul * math.cos(delta_c + theta_c)

    # M-O (단면검토, delta=0, β=θ=옹벽배면경사각)
    beta_design = theta_c  # β = 옹벽배면의 수직에 대한 각
    delta_design = 0.0     # δ = 0 (단면검토시)
    theta_mo_d = math.atan(Kh / (1 - 0))  # θ = atan(Kh/(1-Kv))

    num_Kae_d = math.cos(phi - theta_mo_d - beta_design) ** 2
    sin_pd_d = math.sin(phi + delta_design)
    sin_pta_d = math.sin(phi - theta_mo_d - alpha)
    if sin_pta_d < 0:
        sin_pta_d = 0
    cos_theta_d = math.cos(theta_mo_d)
    cos2_beta_d = math.cos(beta_design) ** 2
    cos_dbt_d = math.cos(delta_design + beta_design + theta_mo_d)
    cos_ab_d = math.cos(alpha - beta_design)
    denom_prod_d = cos_dbt_d * cos_ab_d
    if denom_prod_d <= 0:
        denom_prod_d = 1e-10
    inner_d = math.sqrt(sin_pd_d * max(sin_pta_d, 0)) / math.sqrt(denom_prod_d)
    den_Kae_d = cos_theta_d * cos2_beta_d * cos_dbt_d * (1 + inner_d) ** 2
    if den_Kae_d == 0:
        den_Kae_d = 1e-10
    Kae_design = num_Kae_d / den_Kae_d
    Kaeh_design = Kae_design * math.cos(beta_design)

    # --- LCB 하중조합 ---
    SV_lcb1 = 1.2 * Wt + 1.6 * Pv_sur - (1.2 * U if gwl_height > 0 else 0)
    SMr_lcb1 = 1.2 * Mrt + 1.6 * Mr_pv
    SMo_lcb1 = 1.6 * (Mo_pa + Mo_ph) + (1.6 * Pw * gwl_height / 3 if gwl_height > 0 else 0)
    SH_lcb1 = 1.6 * Pa_h + 1.6 * Ph_sur + (1.6 * Pw if gwl_height > 0 else 0)

    e_lcb1 = B / 2 - (SMr_lcb1 - SMo_lcb1) / SV_lcb1 if SV_lcb1 != 0 else 0
    # [H-03 수정] LCB1에서도 e > B/6 처리
    if e_lcb1 > B6:
        denom_l1 = 3 * (B / 2 - e_lcb1)
        Q1_lcb1 = 2 * SV_lcb1 / (denom_l1 * 1) if denom_l1 > 0 else 0
        Q2_lcb1 = 0.0
    else:
        Q1_lcb1 = SV_lcb1 / (B * 1) * (1 + 6 * e_lcb1 / B)
        Q2_lcb1 = SV_lcb1 / (B * 1) * (1 - 6 * e_lcb1 / B)

    # [H-02 수정] LCB2 관성력 하중계수 통일 (1.0)
    SV_lcb2 = 0.9 * Wt - (0.9 * U if gwl_height > 0 else 0)
    SMr_lcb2 = 0.9 * Mrt
    SMo_lcb2 = 1.0 * Mot + 1.0 * Mo_pae + (1.0 * Pw * gwl_height / 3 if gwl_height > 0 else 0)
    SH_lcb2 = 1.0 * PAE + 1.0 * KhWt + (1.0 * Pw if gwl_height > 0 else 0)

    e_lcb2 = B / 2 - (SMr_lcb2 - SMo_lcb2) / SV_lcb2 if SV_lcb2 != 0 else 0
    if e_lcb2 > B6:
        denom_l2 = 3 * (B / 2 - e_lcb2)
        Q1_lcb2 = 2 * SV_lcb2 / (denom_l2 * 1) if denom_l2 > 0 else 0
        Q2_lcb2 = 0.0
    else:
        Q1_lcb2 = SV_lcb2 / (B * 1) * (1 + 6 * e_lcb2 / B)
        Q2_lcb2 = SV_lcb2 / (B * 1) * (1 - 6 * e_lcb2 / B)

    SV_lcb3 = SVn
    SMr_lcb3 = SMrn
    SMo_lcb3 = SMon
    e_lcb3 = e_n
    Q1_lcb3 = Q1_n
    Q2_lcb3 = Q2_n

    # ================================================================
    # 뒷굼판 (Heel) 단면력
    # ================================================================
    L_heel = C8_heel
    w_heel_slab = D_slab * gamma_c if not is_gravity else 0.0
    w_heel_soil = Hs_soil * gamma_t if not is_gravity else 0.0
    w_heel_sur_live = q

    def _q_at_pos(Q1v, Q2v, e_v, x_pos):
        """지반 반력 분포에서 x 위치의 반력"""
        if e_v > B6:
            eff_w = 3 * (B / 2 - e_v)
            if eff_w <= 0 or x_pos >= eff_w:
                return 0.0
            return Q1v * (1 - x_pos / eff_w)
        return Q1v - (Q1v - Q2v) * x_pos / B if B != 0 else 0

    q_at_stem_lcb1 = _q_at_pos(Q1_lcb1, Q2_lcb1, e_lcb1, C6_toe)
    q_at_end_lcb1 = Q2_lcb1 if e_lcb1 <= B6 else 0.0

    q_at_stem_lcb2 = _q_at_pos(Q1_lcb2, Q2_lcb2, e_lcb2, C6_toe)
    if e_lcb2 > B6:
        eff_w2 = 3 * (B / 2 - e_lcb2)
        q_at_end_lcb2 = 0.0 if B >= eff_w2 else Q1_lcb2 * (1 - B / eff_w2)
    else:
        q_at_end_lcb2 = Q2_lcb2

    q_at_stem_lcb3 = _q_at_pos(Q1_lcb3, Q2_lcb3, e_lcb3, C6_toe)
    q_at_end_lcb3 = Q2_lcb3

    def heel_forces(q_stem_r, q_end_r, f_D, f_L, f_H, include_sur=True):
        V_slab = f_D * w_heel_slab * L_heel
        V_soil = f_D * w_heel_soil * L_heel
        V_sur = f_L * w_heel_sur_live * L_heel if include_sur else 0.0
        V_react = -(q_stem_r + q_end_r) / 2 * L_heel
        V_pv = 0.0

        M_slab = f_D * w_heel_slab * L_heel ** 2 / 2
        M_soil = f_D * w_heel_soil * L_heel ** 2 / 2
        M_sur = f_L * w_heel_sur_live * L_heel ** 2 / 2 if include_sur else 0.0
        M_react = -(L_heel ** 2 / 6 * (q_stem_r + 2 * q_end_r))
        M_pv = 0.0

        V_total = V_slab + V_soil + V_sur + V_react + V_pv
        M_total = M_slab + M_soil + M_sur + M_react + M_pv

        return {
            "V_slab": V_slab, "V_soil": V_soil, "V_sur": V_sur,
            "V_react": V_react, "V_pv": V_pv, "V_total": V_total,
            "M_slab": M_slab, "M_soil": M_soil, "M_sur": M_sur,
            "M_react": M_react, "M_pv": M_pv, "M_total": M_total,
        }

    if has_heel:
        heel_lcb1 = heel_forces(q_at_stem_lcb1, q_at_end_lcb1, 1.2, 1.6, 1.6)
        heel_lcb2 = heel_forces(q_at_stem_lcb2, q_at_end_lcb2, 0.9, 0.0, 1.0, include_sur=False)
        heel_lcb3 = heel_forces(q_at_stem_lcb3, q_at_end_lcb3, 1.0, 1.0, 1.0)
    else:
        _zero_heel = {"V_slab": 0, "V_soil": 0, "V_sur": 0, "V_react": 0, "V_pv": 0, "V_total": 0,
                       "M_slab": 0, "M_soil": 0, "M_sur": 0, "M_react": 0, "M_pv": 0, "M_total": 0}
        heel_lcb1 = heel_lcb2 = heel_lcb3 = _zero_heel

    # ================================================================
    # 앞굽판 (Toe) 단면력 — has_toe 일 때만 유효
    # ================================================================
    # Toe 캔틸레버: 벽체 전면(C6_toe - t_stem - batter)에서 저판 좌측 끝(0)까지
    # 인장면 = 저판 하면 (지반반력 상향 > 자중 하향)
    w_toe_slab = D_slab * gamma_c  # 저판 자중 등분포 (하향)

    # Toe 구간 지반반력 위치: x=0(좌측끝) ~ x=L_toe_eff(벽체전면)
    # 전역 x좌표: 0 ~ (C6_toe - t_stem - batter)
    toe_front_x = C6_toe - t_stem - batter  # 벽체 전면 전역 x좌표

    def _q_toe_at_pos(Q1v, Q2v, e_v, x_global):
        """지반 반력 분포에서 전역 x 위치의 반력 (Toe 구간용)"""
        if e_v > B6:
            eff_w = 3 * (B / 2 - e_v)
            if eff_w <= 0 or x_global >= eff_w:
                return 0.0
            return Q1v * (1 - x_global / eff_w)
        return Q1v - (Q1v - Q2v) * x_global / B if B != 0 else 0

    def toe_forces(Q1_r, Q2_r, e_v, f_D):
        """
        Toe 캔틸레버 단면력 계산
        - 저판자중: f_D 적용 (하향 = 양)
        - 지반반력: LCB의 Q값 직접 사용 (상향 = 음, 이미 계수됨)
        """
        # 지반반력: Toe 좌측끝(x=0)과 벽체전면(x=toe_front_x) 사이
        q_at_left = _q_toe_at_pos(Q1_r, Q2_r, e_v, 0)         # 저판 좌측끝
        q_at_face = _q_toe_at_pos(Q1_r, Q2_r, e_v, toe_front_x)  # 벽체 전면

        V_slab = f_D * w_toe_slab * L_toe_eff
        V_react = -(q_at_left + q_at_face) / 2 * L_toe_eff
        V_total = V_slab + V_react

        M_slab = f_D * w_toe_slab * L_toe_eff ** 2 / 2
        # 사다리꼴 분포: M = L²/6 * (2*q_face + q_left)
        # (벽체 전면이 고정단, 좌측끝이 자유단)
        M_react = -(L_toe_eff ** 2 / 6 * (2 * q_at_face + q_at_left))
        M_total = M_slab + M_react

        return {
            "V_slab": V_slab, "V_react": V_react, "V_total": V_total,
            "M_slab": M_slab, "M_react": M_react, "M_total": M_total,
            "q_at_left": q_at_left, "q_at_face": q_at_face,
        }

    if has_toe:
        toe_lcb1 = toe_forces(Q1_lcb1, Q2_lcb1, e_lcb1, 1.2)
        toe_lcb2 = toe_forces(Q1_lcb2, Q2_lcb2, e_lcb2, 0.9)
        toe_lcb3 = toe_forces(Q1_lcb3, Q2_lcb3, e_lcb3, 1.0)
    else:
        toe_lcb1 = toe_lcb2 = toe_lcb3 = None

    # ================================================================
    # 벽체 단면력
    # ================================================================
    H_wall_cc = H_stem
    H_wall_dd = H_stem / 2

    # 상시 Coulomb
    Pa_cc = 0.5 * Kah * gamma_t * H_wall_cc ** 2
    Mo_cc_Pa = Pa_cc * H_wall_cc / 3
    Pa_dd = 0.5 * Kah * gamma_t * H_wall_dd ** 2
    Mo_dd_Pa = Pa_dd * H_wall_dd / 3

    # 지진 M-O
    Pae_cc = 0.5 * Kaeh_design * gamma_t * H_wall_cc ** 2
    Mo_cc_Pae = Pae_cc * H_wall_cc / 2
    Pae_dd = 0.5 * Kaeh_design * gamma_t * H_wall_dd ** 2
    Mo_dd_Pae = Pae_dd * H_wall_dd / 2

    # 과재하중 벽체 단면력
    Ph1_cc = Kah * q * H_wall_cc
    Mo_ph1_cc = Ph1_cc * H_wall_cc / 2
    Ph1_dd = Kah * q * H_wall_dd
    Mo_ph1_dd = Ph1_dd * H_wall_dd / 2

    # [H-05 수정] 관성력 - batter 반영
    # C-C (벽체 하부): 전체 벽체 무게 사용
    inertia_W_cc = (A_C2 + A_C1 + A_C3 + A_C5) * gamma_c
    inertia_H_cc = inertia_W_cc * Kh
    # 복합 단면 도심 y
    total_A_wall = A_C2 + A_C1 + A_C3 + A_C5
    if total_A_wall > 0:
        inertia_y_cc = (A_C2 * (H_stem / 2) + A_C1 * (H_stem / 3) +
                        A_C3 * (conn_h + H_stem / 3) + A_C5 * (conn_h / 2)) / total_A_wall
    else:
        inertia_y_cc = H_stem / 2
    inertia_M_cc = inertia_H_cc * inertia_y_cc

    # D-D (벽체 중앙): 상부 절반의 무게
    H_half = H_stem / 2
    # 상부 절반에서 batter 기여분 (삼각형 비례)
    A_C2_half = t_stem * H_half
    A_C1_half = 0.5 * batter * H_half * (H_half / H_stem) if batter > 0 and H_stem > 0 else 0.0
    A_C3_half = 0.5 * batter_back * H_half * (H_half / H_stem) if batter_back > 0 and H_stem > 0 else 0.0
    inertia_W_dd = (A_C2_half + A_C1_half + A_C3_half) * gamma_c
    inertia_H_dd = inertia_W_dd * Kh
    inertia_y_dd = H_half / 2
    inertia_M_dd = inertia_H_dd * inertia_y_dd

    # LCB별 벽체 단면력
    V_wall_cc_lcb1 = 1.6 * Pa_cc + 1.6 * Ph1_cc
    M_wall_cc_lcb1 = 1.6 * Mo_cc_Pa + 1.6 * Mo_ph1_cc
    V_wall_dd_lcb1 = 1.6 * Pa_dd + 1.6 * Ph1_dd
    M_wall_dd_lcb1 = 1.6 * Mo_dd_Pa + 1.6 * Mo_ph1_dd

    V_wall_cc_lcb2 = 1.0 * Pae_cc + 1.0 * inertia_H_cc
    M_wall_cc_lcb2 = 1.0 * Mo_cc_Pae + 1.0 * inertia_M_cc
    V_wall_dd_lcb2 = 1.0 * Pae_dd + 1.0 * inertia_H_dd
    M_wall_dd_lcb2 = 1.0 * Mo_dd_Pae + 1.0 * inertia_M_dd

    V_wall_cc_lcb3 = 1.0 * Pa_cc + 1.0 * Ph1_cc
    M_wall_cc_lcb3 = 1.0 * Mo_cc_Pa + 1.0 * Mo_ph1_cc
    V_wall_dd_lcb3 = 1.0 * Pa_dd + 1.0 * Ph1_dd
    M_wall_dd_lcb3 = 1.0 * Mo_dd_Pa + 1.0 * Mo_ph1_dd

    # 설계 단면력
    Mu_CC = max(abs(M_wall_cc_lcb1), abs(M_wall_cc_lcb2))
    Mcr_CC = abs(M_wall_cc_lcb3)
    Vu_CC = max(abs(V_wall_cc_lcb1), abs(V_wall_cc_lcb2))

    Mu_DD = max(abs(M_wall_dd_lcb1), abs(M_wall_dd_lcb2))
    Mcr_DD = abs(M_wall_dd_lcb3)
    Vu_DD = max(abs(V_wall_dd_lcb1), abs(V_wall_dd_lcb2))

    # 저판(B-B) 설계모멘트 - 벽체CC 모멘트 캡 적용 (옹벽표준도작성연구용역, 1998)
    # "저판에 적용하는 휨모멘트의 크기는 전면벽과 뒷굽판과의 접속점의
    #  모멘트평형조건에 의하여 전면벽에 적용하는 휨모멘트를 초과하지 않는다."
    Mu_heel = max(abs(heel_lcb1["M_total"]), abs(heel_lcb2["M_total"]))
    Mu_BB = min(Mu_heel, Mu_CC)
    Mcr_heel = abs(heel_lcb3["M_total"])
    Mcr_BB = min(Mcr_heel, Mcr_CC)
    Vu_BB = max(abs(heel_lcb1["V_total"]), abs(heel_lcb2["V_total"]))

    # Toe (A-A) 설계단면력
    if has_toe:
        Mu_AA = max(abs(toe_lcb1["M_total"]), abs(toe_lcb2["M_total"]))
        Mcr_AA = abs(toe_lcb3["M_total"])
        Vu_AA = max(abs(toe_lcb1["V_total"]), abs(toe_lcb2["V_total"]))
    else:
        Mu_AA = Mcr_AA = Vu_AA = 0.0

    # ================================================================
    # 4.5 부재설계
    # ================================================================
    # [M-02 수정] beta1을 fck에 따라 산정
    if fck <= 28:
        beta1 = 0.85
    else:
        beta1 = max(0.85 - 0.007 * (fck - 28), 0.65)

    phi_f = 0.85
    phi_v = 0.75
    pmin = max(0.25 * math.sqrt(fck) / fy, 1.4 / fy)
    # Ec = 8500 * fck^(1/3) : 한국 실무 관행 (fck=24 → Ec≈24514, n=8)
    Ec = 8500 * fck ** (1 / 3)
    n_ratio = round(Es / Ec)

    def section_check(Mu_val, Mcr_val, Vu_val, H_sec_mm, Dc_mm,
                      r_dia, r_area, r_spacing, sec_name):
        # Dc_mm = 콘크리트면 ~ 철근 중심 거리
        D_sec = H_sec_mm - Dc_mm
        As = r_area * 1000 / r_spacing
        rho = As / (1000 * D_sec) if D_sec > 0 else 0

        a = (As * fy) / (0.85 * fck * 1000) if fck > 0 else 0
        c_val = a / beta1 if beta1 > 0 else 0

        eps_t = 0.003 * (D_sec - c_val) / c_val if c_val > 0 else 999

        # [M-01 수정] phi_f 전이구간 선형보간
        if eps_t >= 0.005:
            phi_f_used = 0.85
        elif eps_t <= 0.002:
            phi_f_used = 0.65
        else:
            phi_f_used = 0.65 + (eps_t - 0.002) * (0.85 - 0.65) / (0.005 - 0.002)

        phiMn_Nmm = phi_f_used * fy * As * (D_sec - a / 2)
        phiMn = phiMn_Nmm / 1e6

        # 필요철근량 반복
        a_req = a
        As_req = As
        for _ in range(20):
            denom_req = phi_f_used * fy * (D_sec - a_req / 2)
            if denom_req <= 0:
                break
            As_req = Mu_val * 1e6 / denom_req
            a_req_new = (As_req * fy) / (0.85 * fck * 1000) if fck > 0 else 0
            if abs(a_req_new - a_req) < 0.001:
                break
            a_req = a_req_new
        rho_req = As_req / (1000 * D_sec) if D_sec > 0 else 0

        # 전단
        phiVc = phi_v * (1 / 6) * math.sqrt(fck) * 1000 * D_sec / 1000

        # 사용성
        n = n_ratio
        p = rho
        np_val = n * p
        if np_val <= 0:
            np_val = 1e-10
        k = -np_val + math.sqrt(np_val ** 2 + 2 * np_val)
        j = 1 - k / 3
        x_na = k * D_sec

        Mcr_Nmm = Mcr_val * 1e6
        denom_fc = 1000 * x_na * (D_sec - x_na / 3)
        fc = 2 * Mcr_Nmm / denom_fc if denom_fc != 0 else 0
        denom_fs = As * (D_sec - x_na / 3)
        fs = Mcr_Nmm / denom_fs if denom_fs != 0 else 0

        # fst: 인장측 최외단 철근 위치의 응력 (원본 수식)
        # fst = fs · (H - Dc_min - x) / (D - x)
        h_tens = H_sec_mm - Dc_mm - x_na  # = D_sec - x_na
        d_tens = D_sec - x_na
        fst = fs * h_tens / d_tens if d_tens > 0 else fs

        # Cc = 순피복두께 = Dc(철근중심까지) - 철근반경
        Cc = Dc_mm - r_dia / 2
        if Cc < 0:
            Cc = 0
        # 균열제어: 210 MPa (옹벽 = 외부노출 부재, KDS 14 20 20)
        crack_limit = 210.0
        if fst > 0:
            s_max_1 = 375 * (crack_limit / fst) - 2.5 * Cc
            s_max_2 = 300 * (crack_limit / fst)
            s_max = min(s_max_1, s_max_2)
        else:
            s_max_1 = 999
            s_max_2 = 999
            s_max = 999

        flexure_ok = phiMn >= Mu_val
        shear_ok = phiVc >= Vu_val
        crack_ok = r_spacing <= s_max
        rho_ok = rho >= pmin or rho >= (4 / 3) * rho_req

        return {
            "sec_name": sec_name,
            "H_sec": H_sec_mm, "D_sec": D_sec, "Dc": Dc_mm,
            "As": As, "rho": rho, "a": a, "c": c_val,
            "eps_t": eps_t, "phi_f": phi_f_used,
            "phiMn_Nmm": phiMn_Nmm, "phiMn": phiMn,
            "a_req": a_req, "As_req": As_req, "rho_req": rho_req,
            "phiVc": phiVc,
            "n": n, "p": p, "k": k, "j": j, "x_na": x_na,
            "fc": fc, "fs": fs, "fst": fst,
            "Cc": Cc, "s_max": s_max, "s_max_1": s_max_1, "s_max_2": s_max_2,
            "crack_limit": crack_limit,
            "rebar_dia": r_dia, "rebar_spacing": r_spacing,
            "Mu": Mu_val, "Mcr": Mcr_val, "Vu": Vu_val,
            "pmin": pmin,
            "flexure_ok": flexure_ok, "shear_ok": shear_ok,
            "crack_ok": crack_ok, "rho_ok": rho_ok,
        }

    if is_gravity and not is_semi_gravity:
        # 중력식: 단면검토 전체 스킵
        sec_BB = sec_CC = sec_DD = sec_AA = None
    elif is_semi_gravity:
        # 반중력식: C-C만 검토
        H_sec_cc = t_stem_bot * 1000 if not is_gravity else B * 1000
        sec_CC = section_check(Mu_CC, Mcr_CC, Vu_CC, H_sec_cc, Dc_wall,
                               rebar3_dia, rebar3_area, rebar3_spacing, "벽체하부 (C-C)")
        sec_BB = sec_DD = sec_AA = None
    else:
        # L형/역L형/역T형
        if has_heel:
            sec_BB = section_check(Mu_BB, Mcr_BB, Vu_BB, D_slab * 1000, Dc_slab,
                                   rebar1_dia, rebar1_area, rebar1_spacing, "저판 (B-B)")
        else:
            sec_BB = None

        # [M-03 수정] C-C 단면: 벽체 하단폭 사용
        H_sec_cc = t_stem_bot * 1000  # 벽체 하단 총폭
        sec_CC = section_check(Mu_CC, Mcr_CC, Vu_CC, H_sec_cc, Dc_wall,
                               rebar3_dia, rebar3_area, rebar3_spacing, "벽체하부 (C-C)")

        # [M-03 수정] D-D 단면: 중간높이 벽체 두께 사용
        t_stem_mid = t_stem + (batter + batter_back) / 2
        H_sec_dd = t_stem_mid * 1000
        sec_DD = section_check(Mu_DD, Mcr_DD, Vu_DD, H_sec_dd, Dc_wall,
                               rebar2_dia, rebar2_area, rebar2_spacing, "벽체중앙 (D-D)")

        # A-A 단면: 앞굽판 (Toe) — has_toe 일 때만
        if has_toe:
            sec_AA = section_check(Mu_AA, Mcr_AA, Vu_AA, D_slab * 1000, Dc_toe,
                                   rebar_toe_dia, rebar_toe_area, rebar_toe_spacing, "앞굽판 (A-A)")
        else:
            sec_AA = None

    # ================================================================
    # 종합 판정
    # ================================================================
    j_slide_n = "OK" if SF_sl_n >= 1.5 else "NG"
    j_slide_e = "OK" if SF_sl_e >= 1.2 else "NG"
    j_over_n = "OK" if SF_ot_n >= 2.0 else "NG"
    j_over_e = "OK" if SF_ot_e >= 1.5 else "NG"  # 지진시 전도 판정 추가
    j_ecc_n = "OK" if e_n <= B6 else "NG"
    j_ecc_e = "OK" if e_e <= B3 else "NG"
    j_bear_n = "OK" if Q1_n <= qa_n else "NG"
    j_bear_e = "OK" if Q1_e <= qa_e else "NG"

    all_ok_list = [
        j_slide_n == "OK", j_slide_e == "OK",
        j_over_n == "OK", j_ecc_n == "OK", j_ecc_e == "OK",
        j_bear_n == "OK", j_bear_e == "OK",
    ]
    if sec_BB is not None:
        all_ok_list.extend([sec_BB["flexure_ok"], sec_BB["shear_ok"], sec_BB["crack_ok"]])
    if sec_CC is not None:
        all_ok_list.extend([sec_CC["flexure_ok"], sec_CC["shear_ok"], sec_CC["crack_ok"]])
    if sec_DD is not None:
        all_ok_list.extend([sec_DD["flexure_ok"], sec_DD["shear_ok"], sec_DD["crack_ok"]])
    if sec_AA is not None:
        all_ok_list.extend([sec_AA["flexure_ok"], sec_AA["shear_ok"], sec_AA["crack_ok"]])
    all_ok = all(all_ok_list)

    return {
        "params": params,
        "blocks": {
            "c_results": c_results,
            "s_results": s_results,
            "Wc": Wc, "Ws": Ws, "Wt": Wt,
            "KhWc": KhWc, "KhWs": KhWs, "KhWt": KhWt,
            "Mrc": Mrc, "Mrs": Mrs, "Mrt": Mrt,
            "Moc": Moc, "Mos": Mos, "Mot": Mot,
        },
        "earth_pressure": {
            "Ka": Ka, "Pa": Pa_h, "Pa_total": Pa_total, "Pa_v": Pa_v,
            "ya": ya, "Mo_pa": Mo_pa,
            "KAE": KAE, "PAE": PAE, "yae": yae, "Mo_pae": Mo_pae,
            "Kah": Kah, "Ka_coul": Ka_coul, "Kaeh_design": Kaeh_design,
            "Kae_design": Kae_design,
            "theta_c_deg": theta_c_deg, "delta_c_deg": delta_c_deg,
            "Ph_sur": Ph_sur, "Pv_sur": Pv_sur, "Mo_ph": Mo_ph, "Mr_pv": Mr_pv,
            "Pw": Pw, "U": U,
        },
        "stability": {
            "normal": {
                "SV": SVn, "SH": SHn, "SMr": SMrn, "SMo": SMon,
                "e": e_n, "B6": B6, "B3": B3,
                "SF_overturn": SF_ot_n, "SF_slide": SF_sl_n,
                "Hr": Hr_n, "mu": mu, "phi_B": phi_B, "Kp": Kp,
                "Pp": Pp, "Pp_key": Pp_key,
                "passive_enabled": passive_enabled, "passive_ratio": passive_ratio_pct,
                "key_enabled": key_enabled, "key_depth": key_depth,
                "Q1": Q1_n, "Q2": Q2_n,
                "Be": Be_n, "qu": qu_n, "qa": qa_n,
                "Nc": Nc2, "Nq": Nq2, "Nr": Nr2,
                "phi2_deg": phi2_deg, "gamma_found": gamma_found,
                "qa_fixed": qa_fixed, "qae_fixed": qae_fixed,
            },
            "seismic": {
                "SV": SVe, "SH": SHe, "SMr": SMre, "SMo": SMe,
                "e": e_e,
                "SF_overturn": SF_ot_e, "SF_slide": SF_sl_e,
                "Hr": Hr_e,
                "Q1": Q1_e, "Q2": Q2_e,
                "Be": Be_e, "qu": qu_e, "qa": qa_e,
            },
        },
        "section": {
            "lcb1": {
                "SV": SV_lcb1, "SH": SH_lcb1, "SMr": SMr_lcb1, "SMo": SMo_lcb1,
                "e": e_lcb1, "Q1": Q1_lcb1, "Q2": Q2_lcb1,
            },
            "lcb2": {
                "SV": SV_lcb2, "SH": SH_lcb2, "SMr": SMr_lcb2, "SMo": SMo_lcb2,
                "e": e_lcb2, "Q1": Q1_lcb2, "Q2": Q2_lcb2,
            },
            "lcb3": {
                "SV": SV_lcb3, "SMr": SMr_lcb3, "SMo": SMo_lcb3,
                "e": e_lcb3, "Q1": Q1_lcb3, "Q2": Q2_lcb3,
            },
            "heel_lcb1": heel_lcb1, "heel_lcb2": heel_lcb2, "heel_lcb3": heel_lcb3,
            "toe_lcb1": toe_lcb1, "toe_lcb2": toe_lcb2, "toe_lcb3": toe_lcb3,
            "wall": {
                "H_wall_cc": H_wall_cc, "H_wall_dd": H_wall_dd,
                "Pa_cc": Pa_cc, "Mo_cc_Pa": Mo_cc_Pa,
                "Pa_dd": Pa_dd, "Mo_dd_Pa": Mo_dd_Pa,
                "Pae_cc": Pae_cc, "Mo_cc_Pae": Mo_cc_Pae,
                "Pae_dd": Pae_dd, "Mo_dd_Pae": Mo_dd_Pae,
                "Ph1_cc": Ph1_cc, "Mo_ph1_cc": Mo_ph1_cc,
                "Ph1_dd": Ph1_dd, "Mo_ph1_dd": Mo_ph1_dd,
                "inertia_W_cc": inertia_W_cc, "inertia_H_cc": inertia_H_cc, "inertia_M_cc": inertia_M_cc,
                "inertia_W_dd": inertia_W_dd, "inertia_H_dd": inertia_H_dd, "inertia_M_dd": inertia_M_dd,
                "cc_lcb1": {"V": V_wall_cc_lcb1, "M": M_wall_cc_lcb1},
                "cc_lcb2": {"V": V_wall_cc_lcb2, "M": M_wall_cc_lcb2},
                "cc_lcb3": {"V": V_wall_cc_lcb3, "M": M_wall_cc_lcb3},
                "dd_lcb1": {"V": V_wall_dd_lcb1, "M": M_wall_dd_lcb1},
                "dd_lcb2": {"V": V_wall_dd_lcb2, "M": M_wall_dd_lcb2},
                "dd_lcb3": {"V": V_wall_dd_lcb3, "M": M_wall_dd_lcb3},
            },
            "design_forces": {
                "BB": {"Mu": Mu_BB, "Mcr": Mcr_BB, "Vu": Vu_BB},
                "CC": {"Mu": Mu_CC, "Mcr": Mcr_CC, "Vu": Vu_CC},
                "DD": {"Mu": Mu_DD, "Mcr": Mcr_DD, "Vu": Vu_DD},
                "AA": {"Mu": Mu_AA, "Mcr": Mcr_AA, "Vu": Vu_AA},
            },
        },
        "member": {
            "BB": sec_BB, "CC": sec_CC, "DD": sec_DD, "AA": sec_AA,
        },
        "judgment": {
            "slide_normal": j_slide_n,
            "slide_seismic": j_slide_e,
            "overturn_normal": j_over_n,
            "overturn_seismic": j_over_e,
            "eccentricity_normal": j_ecc_n,
            "eccentricity_seismic": j_ecc_e,
            "bearing_normal": j_bear_n,
            "bearing_seismic": j_bear_e,
            "BB_flexure": "OK" if (sec_BB and sec_BB["flexure_ok"]) else ("NG" if sec_BB else "-"),
            "BB_shear": "OK" if (sec_BB and sec_BB["shear_ok"]) else ("NG" if sec_BB else "-"),
            "BB_crack": "OK" if (sec_BB and sec_BB["crack_ok"]) else ("NG" if sec_BB else "-"),
            "CC_flexure": "OK" if (sec_CC and sec_CC["flexure_ok"]) else ("NG" if sec_CC else "-"),
            "CC_shear": "OK" if (sec_CC and sec_CC["shear_ok"]) else ("NG" if sec_CC else "-"),
            "CC_crack": "OK" if (sec_CC and sec_CC["crack_ok"]) else ("NG" if sec_CC else "-"),
            "DD_flexure": "OK" if (sec_DD and sec_DD["flexure_ok"]) else ("NG" if sec_DD else "-"),
            "DD_shear": "OK" if (sec_DD and sec_DD["shear_ok"]) else ("NG" if sec_DD else "-"),
            "DD_crack": "OK" if (sec_DD and sec_DD["crack_ok"]) else ("NG" if sec_DD else "-"),
            "AA_flexure": "OK" if (sec_AA and sec_AA["flexure_ok"]) else ("NG" if sec_AA else "-"),
            "AA_shear": "OK" if (sec_AA and sec_AA["shear_ok"]) else ("NG" if sec_AA else "-"),
            "AA_crack": "OK" if (sec_AA and sec_AA["crack_ok"]) else ("NG" if sec_AA else "-"),
            "has_toe": has_toe,
            "has_heel": has_heel if not is_gravity else False,
            "is_gravity": is_gravity,
            "is_semi_gravity": is_semi_gravity,
            "L_toe_eff": L_toe_eff,
            "all_ok": all_ok,
            "wall_type": wall_type,
        },
    }
