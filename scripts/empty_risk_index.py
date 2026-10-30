"""읍·면별 '공차 위험 지수' — 할증의 존재 이유(빈 차 귀로 손실)를 데이터로 측정한다.

지표 (모두 0~1, 높을수록 빈 차로 돌아올 위험이 큼)
- 귀로 수요 부족: 1 - min(들어오는 통행, 나가는 통행) / max(...)   (OD 택시, 동↔해당 읍·면)
- 승차 밀도 부족: 1 - (해당 읍·면 하루 TIMS 승차 / 최대 읍·면 승차) 의 로그 정규화
- 대중교통 대체 부족: 1 - 정류장 수 정규화 (정류장이 많으면 생활권이 도시화된 지역)
- 이동 거리: 평균 승차 거리 정규화 (멀수록 귀로 손실이 큼)
가중치: 귀로 수요 0.35, 승차 밀도 0.35, 대중교통 0.15, 거리 0.15

Usage: python empty_risk_index.py <repo_root>  →  data/web/14_risk/empty_risk.json
"""
import json, sys, math
from pathlib import Path
import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(sys.argv[1]); W = ROOT / "data/web"
pairs = pd.read_csv(W / "03_demand/taxi_od_pairs.csv", encoding="utf-8-sig")
tz = pd.read_csv(W / "10_tims/tims_pickups_by_zone_2025.csv", encoding="utf-8-sig")
bus = pd.read_csv(W / "10_tims/bus_stops_by_zone.csv", encoding="utf-8-sig")
zones = pd.read_csv(W / "01_zones/zones.csv", encoding="utf-8-sig")

em = zones[zones.type != "dong"]
rows = []
for z in em.itertuples():
    n = z.name
    inflow = pairs[(pairs.dest_name == n) & (pairs.origin_name != n)].taxi_trips_per_weekday.sum()
    outflow = pairs[(pairs.origin_name == n) & (pairs.dest_name != n)].taxi_trips_per_weekday.sum()
    t = tz[tz.zone == n]
    rides = float(t.rides_per_day.iloc[0]) if len(t) else 0
    km = float(t.avg_km.iloc[0]) if len(t) else 10
    stops = int(bus[bus.zone == n].bus_stops.iloc[0]) if (bus.zone == n).any() else 0
    rows.append({"zone_id": z.zone_id, "name": n, "type": z.type_ko, "od_in": round(inflow), "od_out": round(outflow),
                 "balance": round(min(inflow, outflow) / max(inflow, outflow, 1), 3), "tims_rides_per_day": rides,
                 "avg_trip_km": km, "bus_stops": stops})
df = pd.DataFrame(rows)
lr = df.tims_rides_per_day.map(lambda v: math.log1p(v))
df["r_return"] = (1 - df.balance).round(3)
df["r_density"] = (1 - (lr - lr.min()) / (lr.max() - lr.min())).round(3)
df["r_transit"] = (1 - (df.bus_stops - df.bus_stops.min()) / (df.bus_stops.max() - df.bus_stops.min())).round(3)
df["r_distance"] = ((df.avg_trip_km - df.avg_trip_km.min()) / (df.avg_trip_km.max() - df.avg_trip_km.min())).round(3)
df["risk"] = (0.35 * df.r_return + 0.35 * df.r_density + 0.15 * df.r_transit + 0.15 * df.r_distance).round(3)
df = df.sort_values("risk")
# 위험 구간 → 제안 할증률 (현행 35%)
def band(r):
    if r < 0.3: return ("저위험: 도시화 생활권", 0)
    if r < 0.55: return ("중위험: 연담 지역", 15)
    return ("고위험: 외곽", 35)
df["band"], df["proposed_pct"] = zip(*df.risk.map(band))
out = W / "14_risk"; out.mkdir(exist_ok=True)
(out / "empty_risk.json").write_text(df.to_json(orient="records", force_ascii=False), encoding="utf-8")
print(df[["name", "od_in", "od_out", "balance", "tims_rides_per_day", "bus_stops", "avg_trip_km", "risk", "band", "proposed_pct"]].to_string(index=False))
