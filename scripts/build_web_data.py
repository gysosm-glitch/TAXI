"""Build element-wise web data for the TAXI repo from the team's raw files.

Usage: python build_web_data.py <raw_dir> <out_dir>
"""
import json, math, random, sys, csv
from pathlib import Path
import pandas as pd

RAW, OUT = Path(sys.argv[1]), Path(sys.argv[2])
ENC = "utf-8-sig"

def save_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")

def save_csv(path, df):
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False, encoding="utf-8-sig")

# ---------------------------------------------------------------- 01 zones
geo = json.loads((RAW / "청주시_읍면동_경계_2025.geojson").read_text(encoding="utf-8"))

def rnd(coords):
    if isinstance(coords[0], (int, float)):
        return [round(coords[0], 5), round(coords[1], 5)]
    return [rnd(c) for c in coords]

def ring_centroid(ring):
    # area-weighted centroid of a polygon ring (lon/lat, small area so planar is fine)
    a = cx = cy = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        f = x1 * y2 - x2 * y1
        a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f
    a *= 0.5
    return (cx / (6 * a), cy / (6 * a), abs(a)) if a else (ring[0][0], ring[0][1], 0)

zones, feats = [], []
for f in geo["features"]:
    p = f["properties"]
    polys = f["geometry"]["coordinates"] if f["geometry"]["type"] == "MultiPolygon" else [f["geometry"]["coordinates"]]
    parts = [ring_centroid(poly[0]) for poly in polys]
    tot = sum(w for *_, w in parts) or 1
    lon = sum(x * w for x, _, w in parts) / tot
    lat = sum(y * w for _, y, w in parts) / tot
    ztype = {"동": "dong", "읍": "eup", "면": "myeon"}[p["구분"]]
    z = {
        "zone_id": int(p["존번호"]), "name": p["읍면동"], "gu": p["구"], "type_ko": p["구분"],
        "type": ztype, "is_eupmyeon": ztype != "dong", "adm_code": str(p["행정동코드"]),
        "centroid_lon": round(lon, 5), "centroid_lat": round(lat, 5),
    }
    zones.append(z)
    feats.append({"type": "Feature", "properties": z,
                  "geometry": {"type": f["geometry"]["type"], "coordinates": rnd(f["geometry"]["coordinates"])}})
zones.sort(key=lambda z: z["zone_id"])
zone_by_id = {z["zone_id"]: z for z in zones}
save_json(OUT / "01_zones/zones.geojson", {"type": "FeatureCollection", "features": feats})
save_csv(OUT / "01_zones/zones.csv", pd.DataFrame(zones))

# ---------------------------------------------------------------- 02 fare rules
FARE = {
    "version": "2026-09-28",
    "currency": "KRW",
    "status_note": "동·읍면 요율은 보도 기준. 청주시 운임·요율 고시 원문 확보 후 교체할 것.",
    "regions": {
        "cheongju": {
            "label": "청주시 (중형택시)",
            "dong_rate": {"base_fare": 4000, "base_distance_m": 1800, "unit_distance_m": 127,
                          "unit_time_s": 32, "unit_fare": 100},
            "eupmyeon_rate": {"base_fare": 4000, "base_distance_m": 1120, "unit_distance_m": 127,
                              "unit_time_s": 32, "unit_fare": 135, "nominal_surcharge_pct": 35},
            "surcharge_applies": {
                "dong_to_dong": False,
                "same_eupmyeon_internal": False,
                "dong_to_eupmyeon": True,
                "eupmyeon_to_other_eupmyeon": True,
            },
            "surcharge_applies_note": "2026-09-28 04:00 1단계 개편: 같은 읍·면 내부 운행만 동 요율 적용",
            "night_surcharge": {"verified": False, "windows": [
                {"from": "22:00", "to": "23:00", "pct": 20},
                {"from": "23:00", "to": "02:00", "pct": 40},
                {"from": "02:00", "to": "04:00", "pct": 20}],
                "note": "팀공유자료 p.4 기준(20/40/20 구간제). 고시 원문 미확인 → 설정값으로만 사용"},
            "out_of_area_surcharge_pct": {"value": 20, "verified": False},
            "sources": ["kpinews_20230801", "newspim_20260922", "goodmorningcc_20260922", "ccdn_20260922"],
        },
        "sejong": {"label": "세종시", "verified": False, "note": "현행 요금표·시계외 할증률 미확인. 확장 로드맵 전용"},
        "daejeon": {"label": "대전시", "verified": True, "out_of_area_surcharge_pct": 30,
                    "night_out_of_area_combined_pct": 50, "effective": "2026-03-16",
                    "note": "대전의 '복합할증'은 심야+시계외 중첩 개념으로 청주와 다름",
                    "sources": ["thesegye_20260305"]},
    },
}
save_json(OUT / "02_fare_rules/fare_rules.json", FARE)

R = FARE["regions"]["cheongju"]

def meter_fare(distance_m, rate):
    extra = max(0.0, distance_m - rate["base_distance_m"])
    return rate["base_fare"] + math.ceil(extra / rate["unit_distance_m"]) * rate["unit_fare"]

def category(o, d):
    zo, zd = zone_by_id[o], zone_by_id[d]
    if not zo["is_eupmyeon"] and not zd["is_eupmyeon"]:
        return "dong_to_dong"
    if o == d:
        return "same_eupmyeon_internal"
    if zo["is_eupmyeon"] and zd["is_eupmyeon"]:
        return "eupmyeon_to_other_eupmyeon"
    return "dong_to_eupmyeon"

def haversine_m(lon1, lat1, lon2, lat2):
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))

DETOUR = 1.35          # 직선거리 → 도로거리 보정계수 (가정)
INTRA_KM = {"dong": 2.5, "eup": 3.5, "myeon": 4.0}   # 존 내부 통행 평균거리 (가정)

def est_distance_m(o, d):
    if o == d:
        return INTRA_KM[zone_by_id[o]["type"]] * 1000
    zo, zd = zone_by_id[o], zone_by_id[d]
    return haversine_m(zo["centroid_lon"], zo["centroid_lat"], zd["centroid_lon"], zd["centroid_lat"]) * DETOUR

# ---------------------------------------------------------------- 03 demand
od = pd.read_csv(RAW / "청주시_주수단OD_2024_평일.csv", encoding=ENC)
pur = pd.read_csv(RAW / "청주시_목적OD_2024_평일.csv", encoding=ENC)
od = od.merge(pur[["출발존", "도착존", "출근", "등교", "업무", "귀가", "기타"]], on=["출발존", "도착존"], how="left")
rows = []
for r in od.itertuples(index=False):
    o, d = int(r.출발존), int(r.도착존)
    cat = category(o, d)
    dist = est_distance_m(o, d)
    f_dong, f_em = meter_fare(dist, R["dong_rate"]), meter_fare(dist, R["eupmyeon_rate"])
    surcharged = R["surcharge_applies"][cat]
    rows.append({
        "origin_zone": o, "origin_name": zone_by_id[o]["name"], "origin_type": zone_by_id[o]["type_ko"],
        "dest_zone": d, "dest_name": zone_by_id[d]["name"], "dest_type": zone_by_id[d]["type_ko"],
        "category": cat, "surcharged_now": surcharged,
        "taxi_trips_per_weekday": round(r.택시, 1), "all_trips_per_weekday": round(r.전체, 1),
        "taxi_share_pct": round(100 * r.택시 / r.전체, 2) if r.전체 else 0,
        "commute_trips": round(r.출근, 1), "school_trips": round(r.등교, 1),
        "est_distance_km": round(dist / 1000, 2),
        "est_fare_dong_rate": f_dong, "est_fare_eupmyeon_rate": f_em,
        "est_fare_now": f_em if surcharged else f_dong,
        "est_surcharge_per_trip": (f_em - f_dong) if surcharged else 0,
    })
pairs = pd.DataFrame(rows)
save_csv(OUT / "03_demand/taxi_od_pairs.csv", pairs)

def summarize(df, label):
    g = df.groupby("category").agg(
        pair_count=("category", "size"),
        taxi_trips_per_weekday=("taxi_trips_per_weekday", "sum"),
        all_trips_per_weekday=("all_trips_per_weekday", "sum"))
    g["taxi_share_of_all_taxi_pct"] = (100 * g.taxi_trips_per_weekday / df.taxi_trips_per_weekday.sum()).round(2)
    df = df.assign(surcharge_won=df.taxi_trips_per_weekday * df.est_surcharge_per_trip,
                   dong_rate_diff=df.taxi_trips_per_weekday * (df.est_fare_eupmyeon_rate - df.est_fare_dong_rate))
    g["daily_surcharge_paid_won"] = df.groupby("category").surcharge_won.sum().round(0)
    g["daily_diff_if_eupmyeon_rate_won"] = df.groupby("category").dong_rate_diff.sum().round(0)
    g = g.reset_index().round(1)
    g.insert(0, "scope", label)
    return g

summary = summarize(pairs, "all")
oo = pairs[pairs.origin_name.isin(["오송읍", "오창읍"]) | pairs.dest_name.isin(["오송읍", "오창읍"])]
summary = pd.concat([summary, summarize(oo, "touches_osong_or_ochang")])
save_csv(OUT / "03_demand/surcharge_demand_summary.csv", summary)

link = pd.read_csv(RAW / "청주시_노드링크별_평균택시통행량_읍면동_2025.csv", encoding=ENC)
lz = (link.dropna(subset=["읍면동"]).groupby(["구", "읍면동", "구분"])
      .agg(link_count=("링크아이디", "size"), total_link_km=("링크길이(m)", lambda s: round(s.sum() / 1000, 2)),
           mean_daily_taxi_volume=("일평균택시통행량(대)", "mean"), max_daily_taxi_volume=("일평균택시통행량(대)", "max"))
      .round(1).reset_index().sort_values("mean_daily_taxi_volume", ascending=False))
save_csv(OUT / "03_demand/taxi_link_volume_by_zone.csv", lz)
top = link.sort_values("일평균택시통행량(대)", ascending=False).head(50)[
    ["구", "읍면동", "구분", "링크아이디", "도로명", "링크길이(m)", "일평균택시통행량(대)"]]
save_csv(OUT / "03_demand/top50_taxi_links.csv", top)
emsum = pd.read_csv(RAW / "청주시_읍면별_시내연결_요약_2024.csv", encoding=ENC)
save_csv(OUT / "03_demand/eupmyeon_city_link_summary.csv", emsum)

# ---------------------------------------------------------------- 04 scenarios
PLACES = {
    "cbnu": {"name": "충북대학교 정문", "lon": 127.4560, "lat": 36.6283, "zone": 130},
    "osong_stn": {"name": "오송역", "lon": 127.3270, "lat": 36.6203, "zone": 131},
    "ochang_center": {"name": "오창읍 중심(호수공원)", "lon": 127.4310, "lat": 36.7160, "zone": 143},
    "ochang_tech": {"name": "오창과학산업단지", "lon": 127.4440, "lat": 36.7300, "zone": 143},
    "intercity_bus": {"name": "청주시외버스터미널", "lon": 127.4310, "lat": 36.6260, "zone": 137},
    "airport": {"name": "청주국제공항", "lon": 127.4990, "lat": 36.7220, "zone": 142},
    "downtown": {"name": "성안길(시내 중심)", "lon": 127.4880, "lat": 36.6350, "zone": 113},
}
SCEN = [
    ("cbnu_to_osong", "cbnu", "osong_stn", "충북대→오송역: 9/28 이후에도 할증이 남는 대표 구간"),
    ("ochang_to_bus", "ochang_center", "intercity_bus", "오창→시외버스터미널: 출퇴근·통학 수요"),
    ("airport_to_downtown", "airport", "downtown", "청주공항→시내: 방문객 체감 구간"),
    ("ochang_internal", "ochang_center", "ochang_tech", "오창 내부: 9/28 1단계로 할증 해제된 구간"),
]
scenarios = []
for sid, a, b, desc in SCEN:
    pa, pb = PLACES[a], PLACES[b]
    dist = haversine_m(pa["lon"], pa["lat"], pb["lon"], pb["lat"]) * DETOUR
    cat = category(pa["zone"], pb["zone"])
    f_dong, f_em = meter_fare(dist, R["dong_rate"]), meter_fare(dist, R["eupmyeon_rate"])
    now = f_em if R["surcharge_applies"][cat] else f_dong
    scenarios.append({
        "id": sid, "description": desc, "origin": pa, "dest": pb, "category": cat,
        "distance_km_estimated": round(dist / 1000, 2),
        "distance_note": "직선거리×1.35 추정. Kakao Mobility 길찾기 결과로 교체",
        "fare_now": now, "fare_if_dong_rate": f_dong,
        "per_person_if_shared": {str(n): math.ceil(now / n / 100) * 100 for n in (1, 2, 3, 4)},
    })
save_json(OUT / "04_scenarios/places.json", PLACES)
save_json(OUT / "04_scenarios/scenarios.json", scenarios)

# ---------------------------------------------------------------- 05 matching
MATCH = {
    "basis": "반반택시 운영 규칙(경로 1km 이내 유사, 동승 70%+, 추가시간 15분 이하)을 데모용으로 단순화",
    "origin_radius_m": 500, "dest_radius_m": 1000, "route_buffer_m": 500,
    "depart_window_min": 15, "max_extra_time_min": 15, "min_shared_ratio": 0.7,
    "max_party_size": 4,
    "same_gender_required_for": ["경형", "소형", "중형"],
    "fare_split": {"same_destination": "equal", "sequential_dropoff": "proportional_to_solo_fare"},
    "legal_notice": "본 데모는 합승 중개 서비스가 아닌 정책·서비스 시뮬레이션입니다. 사업화 시 등록 플랫폼 제휴 또는 ICT 규제샌드박스를 거칩니다.",
    "required_safety_ui": ["본인확인(목업)", "동승자 탑승 시각·위치 사전 고지", "좌석 안내", "112 긴급신고 버튼", "신고·차단", "위치·개인정보 동의 모달"],
    "sources": ["seoul_banban_rules", "maeil_20220614", "smarttoday_safety"],
}
save_json(OUT / "05_matching/matching_rules.json", MATCH)

random.seed(20261030)
w = pairs[pairs.taxi_trips_per_weekday > 0]
picks = w.sample(n=200, replace=True, weights=w.taxi_trips_per_weekday, random_state=20261030)
nick_a = ["새벽", "푸른", "늦은", "졸린", "바쁜", "조용한", "느긋한", "부지런한"]
nick_b = ["고래", "여우", "참새", "곰", "토끼", "수달", "부엉이", "판다"]

def jitter(z):
    c = zone_by_id[z]
    return round(c["centroid_lon"] + random.uniform(-0.006, 0.006), 6), round(c["centroid_lat"] + random.uniform(-0.005, 0.005), 6)

req = []
for i, r in enumerate(picks.itertuples(index=False), 1):
    olon, olat = jitter(r.origin_zone); dlon, dlat = jitter(r.dest_zone)
    hour = random.choice([7, 8, 8, 9, 12, 18, 18, 19, 21, 22, 23, 23, 0, 1])
    req.append({
        "id": i, "nickname": f"{random.choice(nick_a)}{random.choice(nick_b)}{random.randint(10, 99)}",
        "gender": random.choice(["F", "M"]), "age_group": random.choice(["20s", "20s", "30s"]),
        "origin_zone": r.origin_zone, "origin_name": r.origin_name, "origin_lon": olon, "origin_lat": olat,
        "dest_zone": r.dest_zone, "dest_name": r.dest_name, "dest_lon": dlon, "dest_lat": dlat,
        "depart_at": f"2026-11-10T{hour:02d}:{random.choice([0, 10, 20, 30, 40, 50]):02d}:00+09:00",
        "seats": random.choice([1, 1, 1, 2]), "same_gender_only": True,
        "category": r.category, "status": "waiting", "is_synthetic": True,
    })
# 수요 밀집 시간·장소 클러스터 (보고서 §1: 합승의 병목은 수요 밀도 → 오송역 KTX 심야 도착, 대학가 심야, 오창 출근)
HOTSPOTS = [
    (130, 131, "23:", 12),   # 충북대(성화·개신·죽림동) → 오송역
    (131, 130, "23:", 10),   # 오송역 → 충북대
    (143, 137, "08:", 10),   # 오창 → 가경동(시외버스터미널)
    (137, 143, "18:", 8),    # 가경동 → 오창
]
for o, d, hh, n in HOTSPOTS:
    for _ in range(n):
        olon, olat = jitter(o); dlon, dlat = jitter(d)
        req.append({
            "id": len(req) + 1, "nickname": f"{random.choice(nick_a)}{random.choice(nick_b)}{random.randint(10, 99)}",
            "gender": random.choice(["F", "M"]), "age_group": random.choice(["20s", "20s", "30s"]),
            "origin_zone": o, "origin_name": zone_by_id[o]["name"], "origin_lon": olon, "origin_lat": olat,
            "dest_zone": d, "dest_name": zone_by_id[d]["name"], "dest_lon": dlon, "dest_lat": dlat,
            "depart_at": f"2026-11-10T{hh}{random.choice([0, 5, 10, 15, 20, 25]):02d}:00+09:00",
            "seats": 1, "same_gender_only": True, "category": category(o, d), "status": "waiting", "is_synthetic": True,
        })
save_csv(OUT / "05_matching/synthetic_ride_requests.csv", pd.DataFrame(req))

# ---------------------------------------------------------------- 06 policy
daily = summary[summary.scope == "all"].set_index("category")
model_phase1 = float(daily.loc["same_eupmyeon_internal", "daily_diff_if_eupmyeon_rate_won"]) if "same_eupmyeon_internal" in daily.index else 0
WEEKDAY_EQ_DAYS = 300  # 연간 환산 (평일 OD × 300일, 가정)
model_phase1_year = model_phase1 * WEEKDAY_EQ_DAYS
anchor = 400_000_000
calib = round(anchor / model_phase1_year, 3) if model_phase1_year else None
POLICY = {
    "annualization_days": WEEKDAY_EQ_DAYS,
    "anchors": [
        {"id": "phase1_compensation", "value_won_per_year": 400_000_000, "scope": "1단계(같은 읍·면 내부) 보전", "source": "dynews_20260920", "reliability": "보도, 복수 매체"},
        {"id": "full_removal_compensation", "value_won": 4_000_000_000, "scope": "전면 해제", "source": "nate_20260826", "reliability": "단일 보도, 부분확인"},
        {"id": "full_removal_wiki", "value_won_per_year": 3_300_000_000, "scope": "전면 해제", "source": "thewiki_gangoe", "reliability": "낮음"},
    ],
    "model_calibration": {
        "model_phase1_won_per_year_uncalibrated": round(model_phase1_year),
        "calibration_factor_to_anchor": calib,
        "note": "OD 택시 통행 × (읍면요율-동요율) × 300일로 계산한 1단계 비용을 시 보전액 4억 원에 맞추는 계수. 시뮬레이터의 모든 비용에 곱해 사용",
    },
    "options": [
        {"id": "P0", "label": "현행(9/28 1단계)", "remove_categories": ["same_eupmyeon_internal"], "rate_pct": 35},
        {"id": "P1", "label": "2단계 조기시행: 동↔오송·오창 해제", "remove_categories": ["same_eupmyeon_internal"], "remove_zone_pairs_with": ["오송읍", "오창읍"], "rate_pct": 35},
        {"id": "P2", "label": "할증률 단계 인하 35→20%", "remove_categories": ["same_eupmyeon_internal"], "rate_pct": 20},
        {"id": "P3", "label": "전면 해제", "remove_categories": ["same_eupmyeon_internal", "dong_to_eupmyeon", "eupmyeon_to_other_eupmyeon"], "rate_pct": 0},
        {"id": "P4", "label": "오송역 특례(2017 세종청사 선례 확장)", "remove_categories": ["same_eupmyeon_internal"], "remove_zone_pairs_with": ["오송읍"], "rate_pct": 35, "note": "존 단위라 오송역만 분리 불가 → 오송읍 전체로 근사"},
    ],
}
save_json(OUT / "06_policy/policy_params.json", POLICY)

# ---------------------------------------------------------------- 07 sources
SOURCES = [
    ("newspim_20260922", "뉴스핌", "2026-09-22", "청주시 9/28 같은 읍·면 내 복합할증 해제", "https://www.newspim.com/news/view/20260922000062"),
    ("ccdn_20260922", "충청매일", "2026-09-22", "할증 연혁(55%→35%), 1단계 해제", "https://www.ccdn.co.kr/news/articleView.html?idxno=1101594"),
    ("goodmorningcc_20260922", "굿모닝충청", "2026-09-22", "읍·면 요율(1.12km, 135원), 심야시간 22~04시", "https://www.goodmorningcc.com/news/articleView.html?idxno=452780"),
    ("dynews_20260920", "동양일보", "2026-09-20", "1단계 보전 연 약 4억 원, 2028 오송·오창 검토", "https://www.dynews.co.kr/news/articleView.html?idxno=866770"),
    ("nate_20260826", "네이트뉴스", "2026-08-26", "전면 해제 약 40억 원 (부분확인)", "https://m.news.nate.com/view/20260826n32740"),
    ("newscj_20251211", "천지일보", "2025-12-11", "시의회 5분발언: 할증 운행 70% 오창·오송", "https://www.newscj.com/news/articleView.html?idxno=3349699"),
    ("cctimes_20260408", "충청타임즈(Daum)", "2026-04-08", "시장-택시업계 단계적 해제 협약", "https://v.daum.net/v/20260408202936076"),
    ("cctimes_20260729", "충청타임즈(Daum)", "2026-07-29", "오송 주민 반발", "https://v.daum.net/v/20260729213024600"),
    ("newsis_20170201", "뉴시스", "2017-02-01", "오송역↔세종청사 35% 할증 폐지, 23.2% 인하", "https://mobile.newsis.com/view/NISX20170201_0014676750"),
    ("kpinews_20230801", "KPI뉴스", "2023-08-01", "충북 택시 기본요금 4,000원/1.8km", "https://kpinews.kr/newsView/179568433586854"),
    ("thesegye_20260305", "더세계일보", "2026-03-05", "대전 심야 시계외 복합할증 40→50%", "https://m.thesegye.com/news/view/1065566638165376"),
    ("thewiki_gangoe", "thewiki", "-", "전면 해제 연 33억 원 (낮은 신뢰도)", "https://thewiki.kr/w/강외면"),
    ("maeil_20220614", "매일신문", "2022-06-14", "택시 합승 허용 조건(플랫폼·동성)", "https://www.imaeil.com/page/view/2022061416594446231"),
    ("seoul_banban_rules", "서울시 교통 누리집", "-", "반반택시 매칭 규칙", "https://news.seoul.go.kr/traffic/archives/502059"),
    ("smarttoday_safety", "스마트투데이", "-", "합승 플랫폼 안전 의무", "https://www.smarttoday.co.kr/ko-kr/articles/23506"),
    ("santi_2014", "PNAS", "2014", "Santi et al. shareability network: 운행거리 40%+ 절감", "https://pmc.ncbi.nlm.nih.gov/articles/PMC4280581"),
    ("alonso_mora_2017", "PNAS", "2017", "Alonso-Mora et al. 3,000대로 NYC 수요 98%", "https://pmc.ncbi.nlm.nih.gov/articles/PMC5255617"),
    ("data_15160181", "공공데이터포털", "2026-07", "TIMS 격자별 영업통계(2025)", "https://www.data.go.kr/data/15160181/fileData.do"),
    ("data_15065131", "공공데이터포털", "2026-06", "TIMS 택시운영현황 영업통계", "https://www.data.go.kr/data/15065131/fileData.do"),
    ("data_15069016", "공공데이터포털", "2026-06", "노드링크별 평균택시통행량(2025)", "https://www.data.go.kr/data/15069016/fileData.do"),
    ("data_15041896", "공공데이터포털", "2026-10", "청주시 버스정보시스템(정류장)", "https://www.data.go.kr/data/15041896/fileData.do"),
]
save_json(OUT / "07_sources/sources.json", [dict(zip(["id", "publisher", "date", "claim", "url"], s)) for s in SOURCES])

# ---------------------------------------------------------------- 08 expansion
EXP = {
    "scope": "로드맵 전용. 사업구역 규제로 도시 간 실시간 매칭은 데모 범위 밖",
    "constraints": [
        {"rule": "사업구역 밖 영업 원칙적 금지(여객자동차법 시행규칙 제10조 제6항 귀로 예외)", "source": "https://news.seoul.go.kr/traffic/archives/34700"},
        {"rule": "귀로 중 승객 하차지가 구역 밖이면 구역 내 영업으로 보지 않음(법제처 해석)", "source": "nepla 법제처 해석 요약"},
        {"rule": "세종 택시업계 사업구역 통합 반대 전례(2018)", "source": "https://m.go.seoul.co.kr/news/2018/02/02/20180202012016"},
    ],
    "corridors": [
        {"id": "osong_sejong", "from": "오송역", "to": "세종정부청사", "precedent": "2017 3자 협약으로 35% 할증 폐지(현재 효력 미확인)", "source": "newsis_20170201"},
        {"id": "cheongju_daejeon", "from": "청주", "to": "대전", "note": "대전 시계외 30%, 심야 복합 50%(2026-03-16~)", "source": "thesegye_20260305"},
    ],
    "proposals": ["오송–세종 공동사업구역(인천공항 사례)", "지역별 fare_rules config로 확장 대비"],
}
save_json(OUT / "08_expansion/expansion_regions.json", EXP)

print(summary.to_string())
print("model phase1 won/yr:", round(model_phase1_year), "calib:", calib)
print(json.dumps([{k: s[k] for k in ("id", "category", "distance_km_estimated", "fare_now", "fare_if_dong_rate")} for s in scenarios], ensure_ascii=False))
