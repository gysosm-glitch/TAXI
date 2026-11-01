"""읍·면별 '공차 위험 지수' — 할증의 존재 이유(빈 차 귀로 손실)를 공개 데이터로 비교한다.

지표 (0~1, 높을수록 빈 차로 돌아올 위험이 큼)
- 승차 밀도 부족: 하루 TIMS 승차의 로그 정규화를 뒤집은 값 (손님을 다시 태울 가능성)
- 대중교통 대체 부족: 정류장 수 정규화를 뒤집은 값 (도시화 정도)
- 이동 거리: 평균 승차 거리 정규화 (멀수록 귀로 손실이 큼)

※ 이전 버전의 'OD 귀로 수요 균형'은 OD가 귀가 통행을 포함해 대칭에 가까워(13곳 모두 0.9 이상) 변별력이 없어 뺐다.
※ 가중치는 근거가 약하므로 여러 조합으로 민감도를 보고, 조합에 상관없이 같은 결론인지 확인한다.

Usage: python empty_risk_index.py <repo_root>  →  data/web/14_risk/empty_risk.json, empty_risk_sensitivity.json
"""
import json, sys, math
from pathlib import Path
import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(sys.argv[1]); W = ROOT / "data/web"
tz = pd.read_csv(W / "10_tims/tims_pickups_by_zone_2025.csv", encoding="utf-8-sig")
bus = pd.read_csv(W / "10_tims/bus_stops_by_zone.csv", encoding="utf-8-sig")
zones = pd.read_csv(W / "01_zones/zones.csv", encoding="utf-8-sig")

em = zones[zones.type != "dong"]
rows = []
for z in em.itertuples():
    t = tz[tz.zone == z.name]
    rows.append({"zone_id": z.zone_id, "name": z.name, "type": z.type_ko,
                 "rides_per_day": float(t.rides_per_day.iloc[0]) if len(t) else 0.0,
                 "avg_trip_km": float(t.avg_km.iloc[0]) if len(t) else 10.0,
                 "bus_stops": int(bus[bus.zone == z.name].bus_stops.iloc[0]) if (bus.zone == z.name).any() else 0})
df = pd.DataFrame(rows)
norm = lambda s: (s - s.min()) / (s.max() - s.min())
df["r_density"] = (1 - norm(df.rides_per_day.map(math.log1p))).round(3)
df["r_transit"] = (1 - norm(df.bus_stops)).round(3)
df["r_distance"] = norm(df.avg_trip_km).round(3)

WEIGHTS = {
    "기준 (밀도 0.5·대중교통 0.25·거리 0.25)": (0.5, 0.25, 0.25),
    "균등 (1/3씩)": (1 / 3, 1 / 3, 1 / 3),
    "밀도 중심 (0.7·0.15·0.15)": (0.7, 0.15, 0.15),
    "대중교통 중심 (0.25·0.5·0.25)": (0.25, 0.5, 0.25),
    "거리 중심 (0.25·0.25·0.5)": (0.25, 0.25, 0.5),
    "밀도만 (1·0·0)": (1, 0, 0),
}
scores = {k: (w[0] * df.r_density + w[1] * df.r_transit + w[2] * df.r_distance) for k, w in WEIGHTS.items()}
base_key = next(iter(WEIGHTS))
df["risk"] = scores[base_key].round(3)
ranks = pd.DataFrame({k: v.rank() for k, v in scores.items()})
spearman = {k: round(ranks[base_key].corr(ranks[k], method="spearman"), 3) for k in WEIGHTS}
# 조합마다 위험이 가장 낮은 5곳에 들어간 횟수
low5 = {n: int(sum((ranks[k] <= 5)[i] for k in WEIGHTS)) for i, n in enumerate(df.name)}
df["low_risk_votes"] = df.name.map(low5)
df = df.sort_values("risk")
df["rank"] = range(1, len(df) + 1)
df["group"] = ["저위험" if r <= 5 else "고위험" if r > len(df) - 5 else "중간" for r in df["rank"]]

out = W / "14_risk"; out.mkdir(exist_ok=True)
(out / "empty_risk.json").write_text(df.to_json(orient="records", force_ascii=False), encoding="utf-8")
(out / "empty_risk_sensitivity.json").write_text(json.dumps({
    "weights": {k: list(v) for k, v in WEIGHTS.items()},
    "spearman_vs_base": spearman,
    "low_risk_votes_of_6": low5,
    "note": "가중치 6가지 조합 모두에서 저위험 5곳에 든 횟수. 6/6이면 가중치와 상관없이 저위험.",
}, ensure_ascii=False, indent=1), encoding="utf-8")
print(df[["rank", "name", "rides_per_day", "bus_stops", "avg_trip_km", "risk", "group", "low_risk_votes"]].to_string(index=False))
print("스피어만 상관(기준 대비):", spearman)
