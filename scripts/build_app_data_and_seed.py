"""Emit compact app JSON and Supabase seed.sql from data/web.

Usage: python build_app_data_and_seed.py <repo_root>
"""
import json, sys
from pathlib import Path
import pandas as pd

ROOT = Path(sys.argv[1])
WEB = ROOT / "data/web"

pairs = pd.read_csv(WEB / "03_demand/taxi_od_pairs.csv", encoding="utf-8-sig")
compact = pairs[["origin_zone", "dest_zone", "origin_name", "dest_name", "category", "taxi_trips_per_weekday",
                 "est_distance_km", "est_fare_dong_rate", "est_fare_eupmyeon_rate"]]
compact.columns = ["o", "d", "on", "dn", "cat", "taxi", "km", "fd", "fe"]
(WEB / "03_demand/taxi_od_pairs.min.json").write_text(
    compact.to_json(orient="records", force_ascii=False), encoding="utf-8")

zones_df = pd.read_csv(WEB / "01_zones/zones.csv", encoding="utf-8-sig", dtype={"adm_code": str})
(WEB / "01_zones/zones.json").write_text(zones_df.to_json(orient="records", force_ascii=False), encoding="utf-8")

req = pd.read_csv(WEB / "05_matching/synthetic_ride_requests.csv", encoding="utf-8-sig")
(WEB / "05_matching/synthetic_ride_requests.json").write_text(
    req.to_json(orient="records", force_ascii=False), encoding="utf-8")

def q(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"

out = ["-- 자동 생성: scripts/build_app_data_and_seed.py. schema.sql 실행 후 SQL Editor에서 실행", "begin;"]

zones = pd.read_csv(WEB / "01_zones/zones.csv", encoding="utf-8-sig")
out.append("insert into zones (zone_id, name, gu, type_ko, type, is_eupmyeon, adm_code, centroid_lon, centroid_lat) values")
out.append(",\n".join(
    f"({r.zone_id}, {q(r.name)}, {q(r.gu)}, {q(r.type_ko)}, {q(r.type)}, {q(bool(r.is_eupmyeon))}, {q(str(r.adm_code))}, {r.centroid_lon}, {r.centroid_lat})"
    for r in zones.itertuples()) + "\non conflict (zone_id) do nothing;")

fare = json.loads((WEB / "02_fare_rules/fare_rules.json").read_text(encoding="utf-8"))
out.append("insert into fare_rules (region, version, rules) values")
out.append(",\n".join(f"({q(k)}, {q(fare['version'])}, {q(json.dumps(v, ensure_ascii=False))}::jsonb)"
                      for k, v in fare["regions"].items()) + "\non conflict (region) do update set rules = excluded.rules, version = excluded.version;")

sc = json.loads((WEB / "04_scenarios/scenarios.json").read_text(encoding="utf-8"))
out.append("insert into scenarios (id, description, category, distance_km, fare_now, fare_if_dong_rate, payload) values")
out.append(",\n".join(f"({q(s['id'])}, {q(s['description'])}, {q(s['category'])}, {s['distance_km_estimated']}, {s['fare_now']}, {s['fare_if_dong_rate']}, {q(json.dumps(s, ensure_ascii=False))}::jsonb)"
                      for s in sc) + "\non conflict (id) do update set payload = excluded.payload;")

cols = ["nickname", "gender", "age_group", "origin_zone", "origin_name", "origin_lon", "origin_lat", "dest_zone", "dest_name",
        "dest_lon", "dest_lat", "depart_at", "seats", "same_gender_only", "category", "status", "is_synthetic"]
out.append(f"insert into ride_requests ({', '.join(cols)}) values")
out.append(",\n".join("(" + ", ".join(q(bool(getattr(r, c))) if c in ("same_gender_only", "is_synthetic") else q(getattr(r, c)) for c in cols) + ")"
                      for r in req.itertuples()) + ";")
out.append("commit;")
(ROOT / "supabase/seed.sql").parent.mkdir(exist_ok=True)
(ROOT / "supabase/seed.sql").write_text("\n".join(out) + "\n", encoding="utf-8")
print("ok", len(compact), len(req))
