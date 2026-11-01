"""지역(존)별 대표 목적지: 택시로 가장 많이 가는 다른 지역의 '순위'만 공개용으로 남긴다 (KTDB 통행량 수치는 담지 않음).

Usage: python build_top_dest.py <repo_root>
입력: private/derived/taxi_od_pairs.csv (KTDB 파생, 비공개)
출력: data/web/03_demand/zone_top_dest.json  {존번호: [1순위, 2순위, 3순위]}  할증 구간(동↔읍·면, 읍·면↔읍·면) 우선
"""
import json, sys
from pathlib import Path
import pandas as pd

ROOT = Path(sys.argv[1])
p = pd.read_csv(ROOT / "private/derived/taxi_od_pairs.csv", encoding="utf-8-sig")
p = p[p.origin_zone != p.dest_zone]
p["surcharged"] = p.category.isin(["dong_to_eupmyeon", "eupmyeon_to_other_eupmyeon"])
out = {}
for z, g in p.groupby("origin_zone"):
    g = g.sort_values(["surcharged", "taxi_trips_per_weekday"], ascending=[False, False])
    out[int(z)] = [int(d) for d in g.dest_zone.head(3)]
(ROOT / "data/web/03_demand/zone_top_dest.json").write_text(json.dumps(out), encoding="utf-8")
print("존", len(out))
