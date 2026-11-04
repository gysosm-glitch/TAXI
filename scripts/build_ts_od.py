"""한국교통안전공단 정보공개 자료(청주 행정동 간 시간대별 택시 승하차, 2026.4~9) → 앱용 요약

입력: private/ts_od/ts_od_2026_04_09.csv  (붙임자료.xlsx를 CSV로 바꾼 것, 열: o,d,ym,hour,trips,fare)
출력: data/web/15_ts_od/ts_od_app.json

원자료는 행정동 단위 집계(운행 건별 자료는 비공개)라 재가공·공개에 문제가 없지만,
용량(14MB)이 커서 저장소에는 요약만 올린다.

사용: python scripts/build_ts_od.py
"""
import csv
import collections
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'private' / 'ts_od' / 'ts_od_2026_04_09.csv'
OUT = ROOT / 'data' / 'web' / '15_ts_od' / 'ts_od_app.json'
DAYS = 30 + 31 + 30 + 31 + 31 + 30   # 2026-04-01 ~ 2026-09-30

zones = json.loads((ROOT / 'data' / 'web' / '01_zones' / 'zones.json').read_text(encoding='utf-8'))
em_id = {z['name']: z['zone_id'] for z in zones if z['is_eupmyeon']}


def is_em(name):
    return name.endswith('읍') or name.endswith('면')


def short(name):          # '흥덕구 복대동' → '복대동'
    return name.split()[-1]


hour_all = [0] * 24
cat = collections.Counter()
cat_fare = collections.Counter()
month = collections.defaultdict(collections.Counter)
# 읍·면별: 시간대별 전체 승차, 시내행 승차(귀로 손님), 시내에서 들어온 하차(들어온 택시)
z_pick = collections.defaultdict(lambda: [0] * 24)
z_out = collections.defaultdict(lambda: [0] * 24)
z_in = collections.defaultdict(lambda: [0] * 24)
z_out_fare = collections.Counter()
z_dest = collections.defaultdict(collections.Counter)
total = 0

with SRC.open(encoding='utf-8') as f:
    for r in csv.DictReader(f):
        o, d = r['o'], r['d']
        t, fare, h = int(r['trips']), int(r['fare']), int(r['hour'])
        oe, de = is_em(o), is_em(d)
        k = ('em' if oe else 'dong') + '_' + ('em' if de else 'dong')
        if oe and de and o != d:
            k = 'em_other_em'
        cat[k] += t
        cat_fare[k] += fare
        month[r['ym']][k] += t
        hour_all[h] += t
        total += t
        if oe:
            z_pick[short(o)][h] += t
        if oe and not de:
            z_out[short(o)][h] += t
            z_out_fare[short(o)] += fare
            z_dest[short(o)][short(d)] += t
        if de and not oe:
            z_in[short(d)][h] += t

per_day = lambda arr: [round(x / DAYS, 1) for x in arr]

em_rows = []
for name, zid in em_id.items():
    pick, out, inn = sum(z_pick[name]), sum(z_out[name]), sum(z_in[name])
    em_rows.append({
        'zone_id': zid, 'name': name,
        'pickups_per_day': round(pick / DAYS, 1),
        'to_city_per_day': round(out / DAYS, 1),
        'from_city_per_day': round(inn / DAYS, 1),
        'city_share': round(out / pick, 3) if pick else 0,
        # 시내에서 들어온 택시 100대당 시내로 나가는 손님 수 (100에 가까울수록 귀로가 빈 차가 될 위험이 낮음)
        'return_balance': round(out / inn * 100) if inn else 0,
        'avg_fare_to_city': round(z_out_fare[name] / out) if out else 0,
        'top_city_dest': [n for n, _ in z_dest[name].most_common(3)],
        'pickups_by_hour': per_day(z_pick[name]),
        'to_city_by_hour': per_day(z_out[name]),
        'from_city_by_hour': per_day(z_in[name]),
    })
em_rows.sort(key=lambda r: -r['pickups_per_day'])

em_pick_total = sum(r['pickups_per_day'] for r in em_rows)
oo = [r for r in em_rows if r['name'] in ('오송읍', '오창읍')]
cross = cat['dong_em'] + cat['em_dong']

out = {
    'source': '한국교통안전공단 정보공개(접수번호 17933337) · 청주시 행정동 단위 시간대별 택시 승하차 · 2026.4~9 · 시외 통행 제외',
    'period': {'from': '2026-04', 'to': '2026-09', 'days': DAYS},
    'trips_total': total,
    'trips_per_day': round(total / DAYS),
    'hour_share': [round(x / total, 4) for x in hour_all],
    'categories': {
        k: {'trips_per_day': round(cat[k] / DAYS), 'share': round(cat[k] / total, 4), 'avg_fare': round(cat_fare[k] / cat[k])}
        for k in cat
    },
    'cross_per_day': round(cross / DAYS),                      # 동↔읍·면 (복합할증 구간)
    'cross_share': round(cross / total, 4),
    'into_em_minus_out_per_day': round((cat['dong_em'] - cat['em_dong']) / DAYS),  # 읍·면으로 들어간 만큼 나오지 못한 운행
    'osong_ochang_share_of_em_pickups': round(sum(r['pickups_per_day'] for r in oo) / em_pick_total, 3),
    'monthly': {m: {k: round(v) for k, v in c.items()} for m, c in sorted(month.items())},
    'eupmyeon': em_rows,
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'{OUT.relative_to(ROOT)}  {OUT.stat().st_size // 1024}KB  하루 {out["trips_per_day"]}건, 동↔읍·면 {out["cross_per_day"]}건')
for r in em_rows[:7]:
    print(f"  {r['name']}: 승차 {r['pickups_per_day']}/일, 시내행 {r['to_city_per_day']}, 시내→ {r['from_city_per_day']}, 균형 {r['return_balance']}, {r['top_city_dest']}")
