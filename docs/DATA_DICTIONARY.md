# 웹 개발용 데이터 — 요소별 정리 (data/web)

`scripts/build_web_data.py`가 `data/raw`에서 생성한다. 원천 데이터를 바꾸면 아래 두 줄로 전부 다시 만든다.

```bash
python scripts/build_web_data.py data/raw data/web
python scripts/build_app_data_and_seed.py .
```

신뢰 등급 표기: **[보도]** 언론 보도 기준 · **[공공]** 공공데이터 가공/추정 · **[가정]** 팀이 둔 가정값 · **[합성]** 데모용 가상 데이터

| # | 요소 (화면 기능) | 파일 | 주요 필드 | 등급 | Supabase 테이블 |
|---|---|---|---|---|---|
| 01 | **지역(존)** — 출발·도착 선택, 할증 판정, 지도 | `01_zones/zones.geojson`, `zones.csv`, `zones.json` | zone_id(107~149), name, gu, type(dong/eup/myeon), is_eupmyeon, adm_code, centroid_lon/lat | [공공] | `zones` |
| 02 | **요금 규칙** — 요금 엔진 상수 | `02_fare_rules/fare_rules.json` | dong_rate / eupmyeon_rate(기본요금·기본거리·단위거리·단위요금), surcharge_applies(9/28 개편), night_surcharge(미확인) | [보도] | `fare_rules` |
| 03 | **수요** — 정책 시뮬레이터, 대시보드 | `03_demand/taxi_od_pairs.csv`(+`.min.json`) | origin/dest, category, surcharged_now, taxi_trips_per_weekday, est_distance_km, est_fare_* | [공공]+[가정] | (앱 번들) |
|  |  | `03_demand/surcharge_demand_summary.csv` | 구분별 택시통행·일 할증액(전체 / 오송·오창 관련) | [공공] |  |
|  |  | `03_demand/taxi_link_volume_by_zone.csv`, `top50_taxi_links.csv` | 읍면동별 링크 택시통행량, 상위 50 링크 | [공공] |  |
|  |  | `03_demand/eupmyeon_city_link_summary.csv` | 13개 읍·면의 시내 연결 통행 | [공공] |  |
| 04 | **시나리오** — 요금 계산 원클릭 칩 | `04_scenarios/places.json`, `scenarios.json` | 장소 좌표, 구분, 추정거리, 현행/동요율 요금, 1~4인 1인 부담 | [가정] 거리 | `scenarios` |
| 05 | **합승 매칭** — 요청 목록, 매칭 규칙 | `05_matching/matching_rules.json` | 반경·시간창·동성 조건·분담 방식·필수 안전 UI·법적 고지 | [보도] | — |
|  |  | `05_matching/synthetic_ride_requests.csv`(+`.json`) | 240건(OD 가중 200 + 피크 클러스터 40), is_synthetic=true | [합성] | `ride_requests` |
| 06 | **정책 옵션·재정 앵커** — 시뮬레이터 | `06_policy/policy_params.json` | P0~P4 옵션, 앵커(4억/40억/33억), 보정계수 | [보도]+[가정] | — |
| 07 | **출처** — 출처 화면, 발표 각주 | `07_sources/sources.json` | id, publisher, date, claim, url | — | — |
| 08 | **세종·대전 확장** — 로드맵 페이지 | `08_expansion/expansion_regions.json` | 사업구역 제약, 회랑(오송–세종, 청주–대전), 제안 | [보도] | — |

## 핵심 가정 (발표 때 반드시 밝힐 것)

- **거리**: 존 중심 간 직선거리 × 1.35(우회계수). 같은 존 내부는 동 2.5km / 읍 3.5km / 면 4.0km. Kakao Mobility 길찾기로 교체 예정.
- **연간 환산**: 평일 OD × 300일.
- **보정계수 0.061**: OD로 계산한 1단계(같은 읍·면 내부) 연간 차액이 약 65.9억 원으로, 시 보전액 4억 원의 약 16배다. OD 택시통행(모형 추정치)이 과대하거나, 시 보전이 차액의 일부만 보전하기 때문으로 보인다. 이 계수를 모든 비용에 곱한다.
- **검증 포인트**: 같은 계수로 전면 해제(P3)를 계산하면 연 약 38.8억 원 → 별도 보도된 "약 40억 원"과 일치. 두 독립 수치가 맞물린다는 점을 발표에서 강조할 수 있다.
- **할증률 슬라이더**: 0~35% 사이는 동 요율과 읍·면 요율을 선형 보간(실제 요율 구조와 다를 수 있음).
- **심야할증**: 고시 원문 미확인으로 계산에서 제외.

## 정보공개청구 회신이 오면 바꿀 곳

| 회신 | 교체 대상 |
|---|---|
| 복합할증 적용 운행·오송역 승차 집계 (#17933363) | `03_demand` 택시통행 → 실측치, 보정계수 재계산 |
| 손실보전 기준 (#17933366) | `06_policy` anchors |
| 개편 연구용역 보고서 (#17933359) | `06_policy` options, `07_sources` |
