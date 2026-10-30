"""매칭 스팟 선정: TIMS 500m 격자 승차량 + OD 할증 통행 비중 + 버스정류장 밀도로 후보 지점을 점수화한다.

Usage: python select_spots.py <repo_root>
출력: data/web/13_spots/spots.json, bus_stops.json
"""
import json, sys, math
from pathlib import Path
import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(sys.argv[1])
W = ROOT / "data/web"
cells = pd.read_csv(W / "10_tims/tims_pickups_by_cell_2025.csv", encoding="utf-8-sig")
pairs = pd.read_csv(W / "03_demand/taxi_od_pairs.csv", encoding="utf-8-sig")
bus = pd.read_csv(W / "충청북도_청주시_버스정보시스템_20261002.csv", encoding="cp949")
bus.columns = ["stop_id", "name", "lon", "lat"]

def km(lat1, lon1, lat2, lon2):
    return math.hypot((lat1 - lat2) * 111.0, (lon1 - lon2) * 89.0)

# 존별 '할증 통행 비중' (출발 기준, OD)
sur = pairs.groupby("origin_name").apply(
    lambda g: g[g.surcharged_now].taxi_trips_per_weekday.sum() / max(g.taxi_trips_per_weekday.sum(), 1), include_groups=False)
# 존별 '할증 구간으로 가는 통행 비중' (동에서 출발해 읍·면으로 가는 통행)
to_em = pairs.groupby("origin_name").apply(
    lambda g: g[g.category == "dong_to_eupmyeon"].taxi_trips_per_weekday.sum() / max(g.taxi_trips_per_weekday.sum(), 1), include_groups=False)

# 후보 지점: 이름 있는 랜드마크 + 승차 상위 격자
NAMED = [
    ("osong_stn", "오송역", 36.6203, 127.3270, "KTX 분기역 · 하루 택시 승차 약 1,800건"),
    ("cbnu", "충북대 정문", 36.6283, 127.4560, "대학가 심야 수요 · 오송역행 할증 구간 출발지"),
    ("bus_terminal", "청주시외버스터미널", 36.6260, 127.4310, "청주 최대 승차 지점 · 오창·오송 연결"),
    ("ochang_lake", "오창 호수공원", 36.7160, 127.4310, "오창 생활 중심 · 시내 출퇴근"),
    ("ochang_tech", "오창과학산업단지", 36.7300, 127.4440, "산단 출퇴근 · 동↔읍 할증 구간"),
    ("airport", "청주국제공항", 36.7220, 127.4990, "평균 요금 2.3만 원 · 내수읍 할증 구간"),
    ("osong_bio", "오송생명과학단지", 36.6370, 127.3270, "식약처·질병청 출퇴근"),
    ("downtown", "성안길", 36.6350, 127.4880, "도심 번화가 · 심야 귀가"),
]
spots = []
for sid, name, lat, lon, why in NAMED:
    near = cells.assign(d=[km(lat, lon, a, b) for a, b in zip(cells.lat, cells.lon)])
    c = near[near.d <= 0.6]
    zone = near.nsmallest(1, "d").iloc[0].zone
    rides = c.rides.sum() / 365
    fare = c.revenue.sum() / max(c.rides.sum(), 1)
    s_ratio = float(sur.get(zone, 0)) if zone in ("오송읍", "오창읍", "내수읍", "옥산면", "강내면") else float(to_em.get(zone, 0))
    stops = int(sum(km(lat, lon, a, b) <= 0.5 for a, b in zip(bus.lat, bus.lon)))
    spots.append({"id": sid, "name": name, "lat": lat, "lon": lon, "zone": zone, "why": why,
                  "pickups_per_day": round(rides), "avg_fare": round(fare), "surcharge_trip_ratio": round(s_ratio, 3),
                  "surcharge_trips_per_day": round(rides * s_ratio), "bus_stops_500m": stops})
df = pd.DataFrame(spots)
# 점수: 할증 통행량(매칭으로 줄일 대상) 60% + 승차 밀도(매칭 성사) 30% + 평균요금(1인 절감액) 10%
norm = lambda s: (s - s.min()) / (s.max() - s.min() or 1)
df["score"] = (0.6 * norm(df.surcharge_trips_per_day) + 0.3 * norm(df.pickups_per_day) + 0.1 * norm(df.avg_fare)).round(3)
df = df.sort_values("score", ascending=False)
df["rank"] = range(1, len(df) + 1)
df["tier"] = ["1차 거점" if r <= 3 else "2차 확장" if r <= 6 else "후보" for r in df["rank"]]
out = W / "13_spots"; out.mkdir(exist_ok=True)
(out / "spots.json").write_text(df.to_json(orient="records", force_ascii=False), encoding="utf-8")
bus_out = bus.assign(lat=bus.lat.round(5), lon=bus.lon.round(5))[["stop_id", "name", "lat", "lon"]]
(out / "bus_stops.json").write_text(bus_out.to_json(orient="values", force_ascii=False), encoding="utf-8")
print(df[["rank", "tier", "name", "zone", "pickups_per_day", "avg_fare", "surcharge_trip_ratio", "surcharge_trips_per_day", "bus_stops_500m", "score"]].to_string(index=False))
