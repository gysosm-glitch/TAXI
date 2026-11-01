"""TIMS 택시 영업통계(격자·지자체)와 청주 버스정류장을 청주 읍면동에 붙여 분석한다.

Usage: python analyze_tims.py <grid_csv_dir> <stats_csv_dir> <bus_csv> <zones_geojson> <out_dir>
격자 ID는 국가지점번호 체계(UTM-K, EPSG:5179): 한글 2자 = 100km 블록(X, Y), 숫자 6자리 = 블록 내 500m 셀 번호 X(3)·Y(3), 0~199.
"""
import json, sys, glob, os
from pathlib import Path
import pandas as pd
from pyproj import Transformer

sys.stdout.reconfigure(encoding="utf-8")
GRID_DIR, STATS_DIR, BUS_CSV, ZONES, OUT = sys.argv[1:6]
OUT = Path(OUT); OUT.mkdir(parents=True, exist_ok=True)

LETTERS = "가나다라마바사아"
X0, Y0 = 700000, 1300000          # '가' 블록 원점 (국가지점번호)
to_wgs = Transformer.from_crs(5179, 4326, always_xy=True)

def read_csv(path):
    for enc in ("utf-8-sig", "cp949"):
        try:
            return pd.read_csv(path, encoding=enc)
        except UnicodeDecodeError:
            continue
    raise ValueError(path)

# ---------------------------------------------------------------- 읍면동 폴리곤
geo = json.loads(Path(ZONES).read_text(encoding="utf-8"))
polys = []
for f in geo["features"]:
    g = f["geometry"]
    parts = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    polys.append((f["properties"], parts))
lon_min = min(c[0] for _, ps in polys for p in ps for c in p[0]); lon_max = max(c[0] for _, ps in polys for p in ps for c in p[0])
lat_min = min(c[1] for _, ps in polys for p in ps for c in p[0]); lat_max = max(c[1] for _, ps in polys for p in ps for c in p[0])

def in_ring(x, y, ring):
    inside = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside

def zone_of(lon, lat):
    if not (lon_min <= lon <= lon_max and lat_min <= lat <= lat_max):
        return None
    for props, parts in polys:
        for p in parts:
            if in_ring(lon, lat, p[0]) and not any(in_ring(lon, lat, h) for h in p[1:]):
                return props
    return None

def grid_center(gid):
    bx, by = LETTERS.index(gid[0]), LETTERS.index(gid[1])
    x = X0 + bx * 100000 + int(gid[2:5]) * 500 + 250
    y = Y0 + by * 100000 + int(gid[5:8]) * 500 + 250
    return to_wgs.transform(x, y)

# ---------------------------------------------------------------- 1) 격자별 영업통계
frames = []
for path in sorted(glob.glob(os.path.join(GRID_DIR, "*.csv"))):
    df = read_csv(path)
    df.columns = ["grid", "ym", "rides", "revenue", "dist_m", "time_s"]
    frames.append(df[df.grid.str[:2].isin(["다바", "라바", "다사", "라사"])])
grid = pd.concat(frames)
cells = grid.grid.unique()
meta = {}
for gid in cells:
    lon, lat = grid_center(gid)
    z = zone_of(lon, lat)
    if z:
        meta[gid] = {"lon": round(lon, 5), "lat": round(lat, 5), "zone_id": z["존번호"], "zone": z["읍면동"], "type": z["구분"], "gu": z["구"]}
cj = grid[grid.grid.isin(meta)].copy()
for k in ("zone_id", "zone", "type", "gu", "lon", "lat"):
    cj[k] = cj.grid.map(lambda g: meta[g][k])
cj["month"] = cj.ym.str[-2:].astype(int)
print("청주 격자 수:", len(meta), "/ 행:", len(cj), "/ 연간 승차:", int(cj.rides.sum()))

by_zone = (cj.groupby(["zone_id", "zone", "type", "gu"])
           .agg(rides_2025=("rides", "sum"), revenue_2025=("revenue", "sum"), dist_km=("dist_m", lambda s: s.sum() / 1000),
                time_h=("time_s", lambda s: s.sum() / 3600), cells=("grid", "nunique"))
           .reset_index())
by_zone["avg_fare"] = (by_zone.revenue_2025 / by_zone.rides_2025).round(0)
by_zone["avg_km"] = (by_zone.dist_km / by_zone.rides_2025).round(2)
by_zone["rides_per_day"] = (by_zone.rides_2025 / 365).round(1)
by_zone["share_pct"] = (100 * by_zone.rides_2025 / by_zone.rides_2025.sum()).round(2)
by_zone = by_zone.sort_values("rides_2025", ascending=False)
by_zone.round(1).to_csv(OUT / "tims_pickups_by_zone_2025.csv", index=False, encoding="utf-8-sig")


cell_tot = (cj.groupby(["grid", "zone", "type", "lon", "lat"]).agg(rides=("rides", "sum"), revenue=("revenue", "sum"))
            .reset_index().sort_values("rides", ascending=False))
cell_tot.to_csv(OUT / "tims_pickups_by_cell_2025.csv", index=False, encoding="utf-8-sig")

# ---------------------------------------------------------------- 2) 지자체별 영업통계 (공차율)
# 파일 두 종류: "1대당 1일평균"(10열), "합계"(영업대수 포함 11열). 연월 표기가 Jan-22 / 22-Jan으로 섞여 있어 파일명 연도 + 영문 월로 정규화
MONTHS = {m: i for i, m in enumerate(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}
srows = []
for path in sorted(glob.glob(os.path.join(STATS_DIR, "*.csv"))):
    df = read_csv(path)
    year = int(Path(path).stem.split("_")[1])
    kind = "total" if df.shape[1] == 11 else "per_vehicle_day"
    if kind == "total":
        df.columns = ["region", "ym", "vehicles", "trips", "drive_km", "busy_km", "empty_km", "drive_s", "busy_s", "empty_s", "kind"]
    else:
        df.columns = ["region", "ym", "trips", "drive_km", "busy_km", "empty_km", "drive_s", "busy_s", "empty_s", "kind"]
    df["kind"] = kind
    df["year"] = year
    df["month"] = df.ym.astype(str).map(lambda s: next(v for k, v in MONTHS.items() if k in s))
    srows.append(df.drop(columns="ym"))
stats = pd.concat(srows)
stats["empty_km_ratio"] = (stats.empty_km / stats.drive_km).round(4)
stats["empty_time_ratio"] = (stats.empty_s / stats.drive_s).round(4)

pv = stats[(stats.kind == "per_vehicle_day") & (stats.year == 2025)]
comp = (pv.groupby("region")[["trips", "drive_km", "busy_km", "empty_km", "empty_km_ratio", "empty_time_ratio"]].mean().round(3)
        .sort_values("empty_km_ratio", ascending=False))
comp["rank_empty_km_ratio"] = range(1, len(comp) + 1)
comp.to_csv(OUT / "tims_region_compare_2025.csv", encoding="utf-8-sig")
cj_rows = comp[comp.index.str.contains("청주")]
peers = comp[comp.index.str.contains("청주|천안|세종|대전|창원|전주|원주|김해|충주")]
print("지자체 수:", len(comp))
print(peers.to_string())
tot = stats[(stats.kind == "total") & stats.region.str.contains("청주")].groupby("year")[["vehicles", "trips", "drive_km", "busy_km", "empty_km"]].sum()
tot["empty_km_ratio"] = (tot.empty_km / tot.drive_km).round(4)
tot.to_csv(OUT / "tims_cheongju_yearly.csv", encoding="utf-8-sig")
print(tot.to_string())

# ---------------------------------------------------------------- 3) 버스정류장
bus = read_csv(BUS_CSV)
bus.columns = ["stop_id", "name", "lon", "lat"]
bus["zone"] = [(zone_of(a, b) or {}).get("읍면동") for a, b in zip(bus.lon, bus.lat)]
bz = bus.groupby("zone").size().rename("bus_stops").reset_index()
bz.to_csv(OUT / "bus_stops_by_zone.csv", index=False, encoding="utf-8-sig")
print("정류장:", len(bus), "청주 내 매칭:", bus.zone.notna().sum())

print(by_zone.head(15).to_string())
