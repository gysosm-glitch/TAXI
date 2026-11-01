"""analyze_tims.py 결과를 앱에서 쓰는 단일 JSON(data/web/10_tims/tims_app.json)으로 묶는다.

Usage: python build_tims_app_data.py <repo_root>
"""
import json, sys
from pathlib import Path
import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(sys.argv[1])
D = ROOT / "data/web/10_tims"
read = lambda n: pd.read_csv(D / n, encoding="utf-8-sig")

zones = read("tims_pickups_by_zone_2025.csv")
cells = read("tims_pickups_by_cell_2025.csv")
land = read("tims_landmarks_2025.csv")
comp = read("tims_region_compare_2025.csv")
yearly = read("tims_cheongju_yearly.csv")
bus = read("bus_stops_by_zone.csv")

tims_daily = zones.rides_2025.sum() / 365
cj = comp[comp.region.str.contains("청주")].iloc[0]
y25 = yearly[yearly.year == 2025].iloc[0]

out = {
    "source": "국토교통부 TIMS 택시운영현황 격자별 영업통계(2025, 500m) · 영업통계(2022~2025) · 청주시 BIS 정류장(2026-10)",
    "calibration": {
        "tims_pickups_per_day": round(tims_daily),
        "note": "TIMS 2025 청주 하루 평균 승차",
    },
    "cheongju_per_vehicle_day_2025": {
        "trips": cj.trips, "drive_km": cj.drive_km, "busy_km": cj.busy_km, "empty_km": cj.empty_km,
        "empty_km_ratio": cj.empty_km_ratio, "empty_time_ratio": cj.empty_time_ratio,
        "rank_of_160": int(cj.rank_empty_km_ratio),
    },
    "cheongju_vehicles_per_day_2025": round(y25.vehicles / 365),
    "avg_fare_2025": round(zones.revenue_2025.sum() / zones.rides_2025.sum()),
    "zones": [
        {"zone_id": int(r.zone_id), "name": r.zone, "type": r.type, "rides_per_day": r.rides_per_day,
         "avg_fare": int(r.avg_fare), "avg_km": r.avg_km, "share_pct": r.share_pct}
        for r in zones.itertuples()
    ],
    "landmarks": land.to_dict(orient="records"),
    "cells": [[round(r.lat, 4), round(r.lon, 4), int(r.rides)] for r in cells[cells.rides >= 2000].itertuples()],
    "bus_stops_by_zone": dict(zip(bus.zone, bus.bus_stops.astype(int))),
    "peers": comp[comp.region.str.contains("청주|천안|세종|대전|창원|전주|원주|김해|충주")][
        ["region", "trips", "empty_km_ratio"]].to_dict(orient="records"),
}
(D / "tims_app.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
print(json.dumps({k: out[k] for k in ("calibration", "cheongju_per_vehicle_day_2025", "cheongju_vehicles_per_day_2025", "avg_fare_2025")}, ensure_ascii=False, indent=1))
print("cells", len(out["cells"]))
