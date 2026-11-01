"""Build element-wise web data for the TAXI repo from the team's raw files.

Usage: python build_web_data.py <raw_dir> <out_dir>
"""
import json, math, random, sys, csv
from pathlib import Path
import pandas as pd

RAW, OUT = Path(sys.argv[1]), Path(sys.argv[2])
# KTDB 여객 OD는 재배포 금지 → 저장소 밖 private/ 에서 읽고, OD 파생 결과도 private/ 에만 쓴다
PRIV = OUT.parent.parent / "private"
(PRIV / "derived").mkdir(parents=True, exist_ok=True)
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
od = pd.read_csv(PRIV / "ktdb/청주시_주수단OD_2024_평일.csv", encoding=ENC)
pur = pd.read_csv(PRIV / "ktdb/청주시_목적OD_2024_평일.csv", encoding=ENC)
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
save_csv(PRIV / "derived/taxi_od_pairs.csv", pairs)
(PRIV / "derived/taxi_od_pairs.min.json").write_text(pairs[["origin_zone", "dest_zone", "origin_name", "dest_name", "category", "taxi_trips_per_weekday", "est_distance_km", "est_fare_dong_rate", "est_fare_eupmyeon_rate"]].set_axis(["o", "d", "on", "dn", "cat", "taxi", "km", "fd", "fe"], axis=1).to_json(orient="records", force_ascii=False), encoding="utf-8")

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
save_csv(PRIV / "derived/surcharge_demand_summary.csv", summary)

link = pd.read_csv(RAW / "청주시_노드링크별_평균택시통행량_읍면동_2025.csv", encoding=ENC)
lz = (link.dropna(subset=["읍면동"]).groupby(["구", "읍면동", "구분"])
      .agg(link_count=("링크아이디", "size"), total_link_km=("링크길이(m)", lambda s: round(s.sum() / 1000, 2)),
           mean_daily_taxi_volume=("일평균택시통행량(대)", "mean"), max_daily_taxi_volume=("일평균택시통행량(대)", "max"))
      .round(1).reset_index().sort_values("mean_daily_taxi_volume", ascending=False))
save_csv(OUT / "03_demand/taxi_link_volume_by_zone.csv", lz)
top = link.sort_values("일평균택시통행량(대)", ascending=False).head(50)[
    ["구", "읍면동", "구분", "링크아이디", "도로명", "링크길이(m)", "일평균택시통행량(대)"]]
save_csv(OUT / "03_demand/top50_taxi_links.csv", top)
emsum = pd.read_csv(PRIV / "ktdb/청주시_읍면별_시내연결_요약_2024.csv", encoding=ENC)
save_csv(PRIV / "derived/eupmyeon_city_link_summary.csv", emsum)

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



print(summary.to_string())
