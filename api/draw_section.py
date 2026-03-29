# -*- coding: utf-8 -*-
"""
옹벽 단면도 및 배근도 그리기 (4종 통합: L형, 역L형, 역T형, 중력식/반중력식)
matplotlib — m 단위 통일
"""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches

# 한글 폰트 설정
try:
    plt.rcParams['font.family'] = 'Malgun Gothic'
except Exception:
    plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['axes.unicode_minus'] = False


def _dim_h(ax, x1, x2, y, text, off=0.1):
    """수평 치수선 (m 단위)"""
    yo = y - off
    ax.annotate('', xy=(x1, yo), xytext=(x2, yo),
                arrowprops=dict(arrowstyle='<->', color='red', lw=1))
    ax.text((x1 + x2) / 2, yo - off * 0.4, text,
            fontsize=8, ha='center', color='red')


def _dim_v(ax, x, y1, y2, text, off=0.15):
    """수직 치수선 (m 단위)"""
    xo = x + off
    ax.annotate('', xy=(xo, y1), xytext=(xo, y2),
                arrowprops=dict(arrowstyle='<->', color='red', lw=1))
    ax.text(xo + off * 0.3, (y1 + y2) / 2, text,
            fontsize=8, ha='left', va='center', color='red', rotation=90)


def _draw_gravity_section(params: dict, show_gwl=True):
    """중력식 옹벽 단면도 (사다리꼴 단일 블록, 저판 없음)"""
    H = params['H']
    B = params['B']              # 하단폭
    t_stem = params['t_stem']    # 상단폭
    Hs_soil = params['Hs_soil']
    Df = params.get('Df', 1.0)
    gwl_height = params.get('gwl_height', 0.0)
    batter = params.get('batter', 0.0)
    batter_back = params.get('batter_back', 0.0)

    fig, ax = plt.subplots(1, 1, figsize=(10, 7), dpi=100)

    # 좌표계: 벽체 하단 좌측 = (0, 0)
    # 사다리꼴: 하단 0~B, 상단 batter ~ (batter + t_stem)
    pts = [
        (0, 0), (B, 0),
        (batter + t_stem, H), (batter, H),
    ]
    wall_poly = plt.Polygon(pts, closed=True, lw=2, ec='black', fc='#BBBBBB')
    ax.add_patch(wall_poly)

    # 블록 라벨
    cx = B / 2
    cy = H / 2
    ax.text(cx, cy, 'C(벽체)', fontsize=10, ha='center', va='center',
            fontweight='bold', color='#333')

    # 뒤채움토 (배면)
    soil_x = [B, batter + t_stem, batter + t_stem, B + 0.8, B + 0.8, B]
    soil_y = [0, H, Hs_soil, Hs_soil, 0, 0]
    ax.fill(soil_x, soil_y, color='#E8D4A0', alpha=0.4, ec='brown', lw=0.5)
    ax.text(B + 0.2, Hs_soil / 2, 'S1',
            fontsize=9, ha='center', va='center', color='brown', fontweight='bold')

    # 지반면 (전면)
    gl_y = Df
    front_x = -0.1
    ax.plot([front_x - 0.3, front_x], [gl_y, gl_y], 'k-', lw=1.5)
    for i in range(6):
        xi = front_x - 0.3 + i * 0.05
        ax.plot([xi, xi + 0.03], [gl_y, gl_y - 0.03], 'k-', lw=0.5, alpha=0.5)

    # 지반면 (배면)
    top_soil = Hs_soil
    ax.plot([B + 0.8, B + 1.2], [top_soil, top_soil], 'k-', lw=1.0)
    for i in range(8):
        xi = B + 0.8 + i * 0.05
        ax.plot([xi, xi + 0.03], [top_soil, top_soil - 0.03], 'k-', lw=0.5, alpha=0.3)

    # 지하수위
    if show_gwl and gwl_height > 0:
        gwl_y = gwl_height
        wy_top = min(gwl_y, Hs_soil)
        water_x = [batter + t_stem, batter + t_stem, B + 0.8, B + 0.8]
        water_y = [0, wy_top, wy_top, 0]
        ax.fill(water_x, water_y, color='#4488CC', alpha=0.15)
        ax.plot([batter + t_stem - 0.05, B + 1.0], [gwl_y, gwl_y], 'b--', lw=1.5)
        ax.text(batter + t_stem - 0.2, gwl_y, f'GWL\n{gwl_height:.2f}m',
                fontsize=7, color='blue', ha='center', va='center')

    # 토압 화살표
    for i in range(1, 6):
        y_arr = Hs_soil * i / 6
        arrow_len = (Hs_soil - y_arr) * 0.06 + 0.03
        ratio = y_arr / H if H > 0 else 0
        wall_back_x = B + (batter + t_stem - B) * ratio  # 배면 경사
        ax.annotate('', xy=(wall_back_x, y_arr),
                    xytext=(wall_back_x + arrow_len, y_arr),
                    arrowprops=dict(arrowstyle='->', color='green', lw=1.2))

    # 활동방지키
    key_enabled = params.get('key_enabled', False)
    key_depth = params.get('key_depth', 0.0)
    key_width = params.get('key_width', 0.0)
    if key_enabled and key_depth > 0:
        kx = B / 2 - key_width / 2
        kx = max(0, min(kx, B - key_width))
        key_rect = patches.Rectangle((kx, -key_depth), key_width, key_depth,
                                      lw=2, ec='black', fc='#A0A0A0', hatch='///')
        ax.add_patch(key_rect)
        ax.annotate('', xy=(kx - 0.02, -key_depth), xytext=(kx - 0.02, 0),
                     arrowprops=dict(arrowstyle='<->', color='blue', lw=1))
        ax.text(kx - 0.1, -key_depth / 2, f'{key_depth*1000:.0f}',
                fontsize=7, color='blue', ha='right', va='center')

    # 치수선
    _dim_h(ax, 0, B, 0, f'B = {B*1000:.0f}', off=0.18)
    _dim_h(ax, batter, batter + t_stem, H, f'{t_stem*1000:.0f}', off=-0.04)
    if batter > 0:
        _dim_h(ax, 0, batter, H, f'{batter*1000:.0f}', off=-0.15)
    if batter_back > 0:
        _dim_h(ax, batter + t_stem, B, H, f'{batter_back*1000:.0f}', off=-0.15)

    left_x = -0.15
    _dim_v(ax, left_x, 0, H, f'H={H*1000:.0f}', off=-0.2)

    if Df > 0:
        ax.text(front_x - 0.2, gl_y - Df / 2, f'Df={Df:.1f}m',
                fontsize=8, ha='center', color='green')

    margin = 0.3
    key_ext = key_depth + 0.15 if key_enabled and key_depth > 0 else 0
    ax.set_xlim(-0.5, B + 1.4)
    ax.set_ylim(-key_ext - margin, H + margin)
    ax.set_aspect('equal')
    ax.axis('off')
    semi = params.get('semi_gravity', False)
    title = '반중력식 옹벽 단면도' if semi else '중력식 옹벽 단면도'
    ax.set_title(title, fontsize=14, fontweight='bold', pad=10)
    plt.tight_layout()
    return fig


def draw_cross_section(params: dict, show_gwl=True):
    """옹벽 단면도 (m 단위, 치수선+지하수위 포함) - 4종 통합"""
    wall_type = params.get('wall_type', 'L형')

    # 중력식: 별도 함수
    if wall_type == '중력식':
        return _draw_gravity_section(params, show_gwl)

    H = params['H']
    B = params['B']
    t_stem = params['t_stem']
    H_stem = params['H_stem']
    D_slab = params['D_slab']
    C6_toe = params['C6_toe']
    C8_heel = params['C8_heel']
    Hs_soil = params['Hs_soil']
    Df = params.get('Df', 1.0)
    gwl_height = params.get('gwl_height', 0.0)
    batter = params.get('batter', 0.0)          # 전면(노출) 경사
    batter_back = params.get('batter_back', 0.0)  # 배면(토사) 경사
    conn_h = params.get('conn_h', 0.0)
    t_bot = t_stem + batter + batter_back  # 벽체 하단 총폭

    D_slab_wall = params.get('D_slab_wall', D_slab)
    D_slab_end = params.get('D_slab_end', D_slab)

    fig, ax = plt.subplots(1, 1, figsize=(10, 7), dpi=100)

    # 좌표계: 저판 좌측 하단 = (0, 0)
    slab_top_left = D_slab_wall
    slab_top_right = D_slab_end

    # 벽체 좌표
    base_y_wall = slab_top_left
    wx_tl = C6_toe - t_stem
    wx_tr = C6_toe
    wx_fl = C6_toe - t_stem - batter
    wx_fr = C6_toe + batter_back

    # 저판
    slab_pts = [
        (0, 0), (B, 0), (B, slab_top_right),
        (C6_toe, slab_top_left), (0, slab_top_left),
    ]
    slab_poly = plt.Polygon(slab_pts, closed=True, lw=2, ec='black', fc='#D4D4D4')
    ax.add_patch(slab_poly)
    if abs(D_slab_wall - D_slab_end) > 0.001:
        ax.plot([C6_toe, B], [slab_top_left, slab_top_right], 'k--', lw=0.5, alpha=0.3)

    # 접합부
    base_y = base_y_wall
    if conn_h > 0:
        conn_x = [wx_fl, wx_fr, wx_fr, wx_fl]
        conn_y = [base_y, base_y, base_y + conn_h, base_y + conn_h]
        conn_poly = plt.Polygon(list(zip(conn_x, conn_y)), closed=True,
                                 lw=1.5, ec='black', fc='#C8C8C8')
        ax.add_patch(conn_poly)
        base_y = base_y_wall + conn_h

    # 벽체 사다리꼴
    wall_pts = [
        (wx_fl, base_y), (wx_fr, base_y),
        (wx_tr, base_y + H_stem), (wx_tl, base_y + H_stem),
    ]
    wall_poly = plt.Polygon(wall_pts, closed=True, lw=2, ec='black', fc='#BBBBBB')
    ax.add_patch(wall_poly)

    # 블록 라벨
    if batter > 0:
        ax.text((wx_fl + wx_tl) / 2, base_y + H_stem * 0.4, 'C1',
                fontsize=7, color='blue', ha='center', alpha=0.8)
    ax.text((wx_tl + wx_tr) / 2, base_y + H_stem / 2, 'C2',
            fontsize=9, ha='center', va='center', fontweight='bold', color='#333')
    if batter_back > 0:
        ax.text((wx_tr + wx_fr) / 2, base_y + H_stem * 0.4, 'C3',
                fontsize=7, color='blue', ha='center', alpha=0.8)

    # 뒤채움토
    if wall_type == '역L형':
        # 역L형: 토사는 벽체 뒤에만 (저판 위 아님, Heel=0)
        soil_x2 = [wx_fr, wx_tr, wx_tr, B + 0.8, B + 0.8, wx_fr]
        soil_y2 = [base_y, base_y + Hs_soil, base_y + Hs_soil,
                   base_y + Hs_soil, 0, 0]
        ax.fill(soil_x2, soil_y2, color='#E8D4A0', alpha=0.4, ec='brown', lw=0.5)
    else:
        # L형/역T형: Heel 위에 토사
        soil_y_base_l = base_y
        soil_y_base_r = slab_top_right
        soil_x2 = [wx_fr, wx_tr, wx_tr, B, B, wx_fr]
        soil_y2 = [soil_y_base_l, base_y + Hs_soil, base_y + Hs_soil,
                   base_y + Hs_soil, soil_y_base_r, soil_y_base_l]
        ax.fill(soil_x2, soil_y2, color='#E8D4A0', alpha=0.4, ec='brown', lw=0.5)

    # 활동방지키
    key_enabled = params.get('key_enabled', False)
    key_depth = params.get('key_depth', 0.0)
    key_width = params.get('key_width', 0.0)
    key_pos = params.get('key_pos', '벽체 하부 (Toe측)')
    if key_enabled and key_depth > 0:
        if 'Toe' in key_pos:
            kx = C6_toe - key_width / 2
        elif 'Heel' in key_pos:
            kx = B - key_width
        else:
            kx = B / 2 - key_width / 2
        kx = max(0, min(kx, B - key_width))
        key_rect = patches.Rectangle((kx, -key_depth), key_width, key_depth,
                                      lw=2, ec='black', fc='#A0A0A0', hatch='///')
        ax.add_patch(key_rect)
        ax.annotate('', xy=(kx - 0.02, -key_depth), xytext=(kx - 0.02, 0),
                     arrowprops=dict(arrowstyle='<->', color='blue', lw=1))
        ax.text(kx - 0.1, -key_depth / 2, f'{key_depth*1000:.0f}',
                fontsize=7, color='blue', ha='right', va='center')
        ax.annotate('', xy=(kx, -key_depth - 0.05), xytext=(kx + key_width, -key_depth - 0.05),
                     arrowprops=dict(arrowstyle='<->', color='blue', lw=1))
        ax.text(kx + key_width / 2, -key_depth - 0.1, f'{key_width*1000:.0f}',
                fontsize=7, color='blue', ha='center')

    # 지반면 (전면)
    gl_y = D_slab + Df if Df > 0 else D_slab
    front_x = min(wx_fl, 0) - 0.1
    ax.plot([front_x - 0.3, front_x], [gl_y, gl_y], 'k-', lw=1.5)
    for i in range(6):
        xi = front_x - 0.3 + i * 0.05
        ax.plot([xi, xi + 0.03], [gl_y, gl_y - 0.03], 'k-', lw=0.5, alpha=0.5)

    # 지반면 (배면)
    top_soil = base_y + Hs_soil
    if wall_type == '역L형':
        ax.plot([B + 0.8, B + 1.2], [top_soil, top_soil], 'k-', lw=1.0)
        for i in range(8):
            xi = B + 0.8 + i * 0.05
            ax.plot([xi, xi + 0.03], [top_soil, top_soil - 0.03], 'k-', lw=0.5, alpha=0.3)
    else:
        ax.plot([B, B + 0.4], [top_soil, top_soil], 'k-', lw=1.0)
        for i in range(8):
            xi = B + i * 0.05
            ax.plot([xi, xi + 0.03], [top_soil, top_soil - 0.03], 'k-', lw=0.5, alpha=0.3)

    # 지하수위
    if show_gwl and gwl_height > 0:
        gwl_y = D_slab + gwl_height
        wy_top = min(gwl_y, base_y + Hs_soil)
        water_x = [wx_tr, wx_tr, B, B]
        water_y = [base_y, wy_top, wy_top, base_y]
        ax.fill(water_x, water_y, color='#4488CC', alpha=0.15)
        ax.plot([wx_tr - 0.05, B + 0.2], [gwl_y, gwl_y], 'b--', lw=1.5)
        ax.plot(wx_tr - 0.05, gwl_y, 'bv', ms=8)
        ax.text(wx_tr - 0.2, gwl_y, f'GWL\n{gwl_height:.2f}m',
                fontsize=7, color='blue', ha='center', va='center')

    # 토압 화살표
    for i in range(1, 6):
        y_arr = base_y + Hs_soil * i / 6
        arrow_len = (base_y + Hs_soil - y_arr + D_slab) * 0.06 + 0.03
        ratio = (y_arr - base_y) / H_stem if H_stem > 0 else 0
        wall_back_x = wx_fr + (wx_tr - wx_fr) * ratio
        ax.annotate('', xy=(wall_back_x, y_arr),
                    xytext=(wall_back_x + arrow_len, y_arr),
                    arrowprops=dict(arrowstyle='->', color='green', lw=1.2))

    # 치수선
    top_y = base_y + H_stem
    _dim_h(ax, 0, B, 0, f'B = {B*1000:.0f}', off=0.18)
    if C6_toe > 0.01:
        _dim_h(ax, 0, C6_toe, 0, f'{C6_toe*1000:.0f}', off=0.06)
    if C8_heel > 0.01:
        _dim_h(ax, C6_toe, B, 0, f'{C8_heel*1000:.0f}', off=0.06)

    dim_top = top_y + 0.08
    if batter > 0:
        _dim_h(ax, wx_fl, wx_tl, dim_top + 0.12, f'{batter*1000:.0f}', off=-0.04)
    _dim_h(ax, wx_tl, wx_tr, dim_top, f'{t_stem*1000:.0f}', off=-0.04)
    if batter_back > 0:
        _dim_h(ax, wx_tr, wx_fr, dim_top + 0.12, f'{batter_back*1000:.0f}', off=-0.04)

    left_x = min(wx_fl, 0) - 0.15
    _dim_v(ax, left_x, 0, slab_top_left, f'{D_slab_wall*1000:.0f}', off=-0.2)
    if abs(D_slab_wall - D_slab_end) > 0.001:
        _dim_v(ax, B + 0.05, 0, slab_top_right, f'{D_slab_end*1000:.0f}', off=0.05)
    if conn_h > 0:
        _dim_v(ax, left_x, slab_top_left, base_y, f'{conn_h*1000:.0f}', off=-0.35)
    _dim_v(ax, left_x, base_y, top_y, f'{H_stem*1000:.0f}', off=-0.2)
    _dim_v(ax, B + 0.2, 0, top_y, f'H={H*1000:.0f}', off=0.1)

    if C6_toe > 0.05:
        ax.text(C6_toe / 2, D_slab / 2, 'C6',
                fontsize=8, ha='center', va='center', color='gray')
    if C8_heel > 0.05:
        ax.text(C6_toe + C8_heel / 2, D_slab / 2, 'C8',
                fontsize=8, ha='center', va='center', color='gray')
    if C8_heel > 0.01:
        ax.text(C6_toe + C8_heel / 2, base_y + Hs_soil / 2, 'S1',
                fontsize=9, ha='center', va='center', color='brown', fontweight='bold')

    if Df > 0:
        ax.text(front_x - 0.2, gl_y - Df / 2, f'Df={Df:.1f}m',
                fontsize=8, ha='center', color='green')

    margin = 0.3
    key_ext = key_depth + 0.15 if key_enabled and key_depth > 0 else 0
    x_min = min(wx_fl, 0) - 0.5
    x_max = B + 0.5
    if wall_type == '역L형':
        x_max = B + 1.4  # 역L형: 배면 토사 영역 확장
    ax.set_xlim(x_min, x_max)
    ax.set_ylim(-key_ext - margin, base_y + H_stem + margin)
    ax.set_aspect('equal')
    ax.axis('off')
    ax.set_title(f'{wall_type} 옹벽 단면도', fontsize=14, fontweight='bold', pad=10)
    plt.tight_layout()
    return fig


def draw_rebar(params: dict, rebar_info: dict = None):
    """철근 배근도 (m 단위) - 전역좌표계 사용, 4종 통합"""
    wall_type = params.get('wall_type', 'L형')

    # 중력식: 철근 없음 → 빈 그림 반환
    if wall_type == '중력식' and not params.get('semi_gravity', False):
        fig, ax = plt.subplots(1, 1, figsize=(10, 7), dpi=100)
        ax.text(0.5, 0.5, '무근콘크리트 중력식 옹벽\n철근 배근 해당 없음',
                transform=ax.transAxes, fontsize=16, ha='center', va='center',
                color='gray')
        ax.axis('off')
        plt.tight_layout()
        return fig

    H = params['H']
    B = params['B']
    t_stem = params['t_stem']
    H_stem = params['H_stem']
    D_slab = params['D_slab']
    C6_toe = params['C6_toe']
    C8_heel = params['C8_heel']

    r1_dia = params.get('rebar1_dia', 13)
    r1_sp = params.get('rebar1_spacing', 125)
    r2_dia = params.get('rebar2_dia', 13)
    r2_sp = params.get('rebar2_spacing', 250)

    Dc_slab = 0.075  # m
    Dc_wall = 0.060  # m

    # 반중력식: 사다리꼴 벽체 + C-C 철근만
    if wall_type == '중력식' and params.get('semi_gravity', False):
        batter = params.get('batter', 0.0)
        batter_back = params.get('batter_back', 0.0)
        fig, ax = plt.subplots(1, 1, figsize=(10, 7), dpi=100)
        # 사다리꼴 벽체
        pts = [(0, 0), (B, 0), (batter + t_stem, H), (batter, H)]
        wall_poly = plt.Polygon(pts, closed=True, lw=2, ec='black', fc='#E0E0E0')
        ax.add_patch(wall_poly)
        # C-C 벽체 철근 (배면 인장측)
        x_rb = batter + t_stem - Dc_wall
        n_bars = max(1, int(H * 1000 / r1_sp))
        for i in range(min(n_bars, 30)):
            yi = (i + 0.5) * r1_sp / 1000
            if yi > H:
                break
            ax.plot(x_rb, yi, 'ro', ms=3)
        ax.plot([x_rb, x_rb], [0, H], 'r-', lw=1.5, alpha=0.5)
        ax.text(x_rb + 0.05, H * 0.7, f'H{r1_dia}@{r1_sp}',
                fontsize=7, color='red', rotation=90, va='center')
        ax.set_xlim(-0.3, B + 0.4)
        ax.set_ylim(-0.2, H + 0.2)
        ax.set_aspect('equal')
        ax.axis('off')
        ax.set_title('반중력식 옹벽 철근 배근도', fontsize=14, fontweight='bold', pad=10)
        plt.tight_layout()
        return fig

    fig, ax = plt.subplots(1, 1, figsize=(10, 7), dpi=100)

    # 저판
    slab = patches.Rectangle((0, 0), B, D_slab, lw=2, ec='black', fc='#E8E8E8')
    ax.add_patch(slab)

    # 벽체: C6_toe 기준 전역좌표 사용
    wall_x = C6_toe - t_stem
    wall = patches.Rectangle((wall_x, D_slab), t_stem, H_stem, lw=2, ec='black', fc='#E0E0E0')
    ax.add_patch(wall)

    # Heel 철근 (상부 - 인장측) — L형/역T형 only
    has_heel = (wall_type != '역L형') and (C8_heel > 0.01)
    if has_heel:
        y_rb_slab = Dc_slab
        n_bars_slab = max(1, int(C8_heel * 1000 / r1_sp))
        for i in range(n_bars_slab):
            xi = C6_toe + (i + 0.5) * r1_sp / 1000
            if xi > B:
                break
            ax.plot(xi, y_rb_slab, 'ro', ms=4)
        ax.plot([C6_toe, B], [y_rb_slab, y_rb_slab], 'r-', lw=1.5, alpha=0.5)
        ax.text(B + 0.05, y_rb_slab, f'H{r1_dia}@{r1_sp}',
                fontsize=7, color='red', va='center')

    # 벽체 주철근 (배면 - 인장측)
    x_rb_wall = C6_toe - Dc_wall  # 배면에서 피복두께만큼 안쪽
    n_bars_wall = max(1, int(H_stem * 1000 / r1_sp))
    for i in range(min(n_bars_wall, 30)):
        yi = D_slab + (i + 0.5) * r1_sp / 1000
        if yi > D_slab + H_stem:
            break
        ax.plot(x_rb_wall, yi, 'ro', ms=3)
    ax.plot([x_rb_wall, x_rb_wall], [D_slab, D_slab + H_stem], 'r-', lw=1.5, alpha=0.5)
    ax.text(x_rb_wall + 0.05, D_slab + H_stem * 0.7, f'H{r1_dia}@{r1_sp}',
            fontsize=7, color='red', rotation=90, va='center')

    # 벽체 배력근 (전면)
    x_dist = wall_x + Dc_wall
    ax.plot([x_dist, x_dist], [D_slab, D_slab + H_stem], 'b-', lw=1, alpha=0.5)
    ax.text(x_dist - 0.05, D_slab + H_stem * 0.5, f'H{r2_dia}@{r2_sp}',
            fontsize=7, color='blue', rotation=90, va='center', ha='right')

    # Toe 철근 (하면 배치) — 역L형/역T형 또는 L_toe_eff >= 0.2
    batter = params.get('batter', 0.0)
    L_toe_eff = max(C6_toe - t_stem - batter, 0.0)
    has_toe = (wall_type in ['역L형', '역T형']) or (L_toe_eff >= 0.2 - 1e-9)
    if has_toe and L_toe_eff > 0.01:
        r_toe_dia = params.get('rebar_toe_dia', r1_dia)
        r_toe_sp = params.get('rebar_toe_spacing', r1_sp)
        Dc_toe_m = params.get('Dc_toe', 80.0) / 1000  # mm -> m
        y_rb_toe = Dc_toe_m  # 하면에서 피복두께만큼 올라간 위치
        toe_end_x = C6_toe - t_stem - batter  # 벽체 전면 x좌표
        n_bars_toe = max(1, int(toe_end_x * 1000 / r_toe_sp))
        for i in range(n_bars_toe):
            xi = (i + 0.5) * r_toe_sp / 1000
            if xi > toe_end_x:
                break
            ax.plot(xi, y_rb_toe, 'gs', ms=4)
        ax.plot([0, toe_end_x], [y_rb_toe, y_rb_toe], 'g-', lw=1.5, alpha=0.5)
        ax.text(-0.05, y_rb_toe, f'H{r_toe_dia}@{r_toe_sp}',
                fontsize=7, color='green', va='center', ha='right')

    # 피복두께 표시
    ax.annotate('', xy=(wall_x, D_slab), xytext=(wall_x + Dc_wall, D_slab),
                arrowprops=dict(arrowstyle='<->', color='purple', lw=0.8))
    ax.text(wall_x + Dc_wall / 2, D_slab + 0.03, f'Dc={Dc_wall*1000:.0f}',
            fontsize=6, color='purple', ha='center')

    ax.set_xlim(-0.3, B + 0.4)
    ax.set_ylim(-0.2, D_slab + H_stem + 0.2)
    ax.set_aspect('equal')
    ax.axis('off')
    ax.set_title(f'{wall_type} 옹벽 철근 배근도', fontsize=14, fontweight='bold', pad=10)
    plt.tight_layout()
    return fig
