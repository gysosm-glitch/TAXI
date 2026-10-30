# 데이터 목록 (팀 공유용)

> 최종 정리 2026-10-31. 표시: ✅ 앱에서 사용 · 📊 분석·발표 근거 · 🗄️ 보관(향후 기능용)

## 1. 원본 데이터 `data/raw/`

| 파일 | 내용 | 출처 | 기준 | 상태 |
|---|---|---|---|---|
| `청주시_주수단OD_2024_평일.csv` | 43존×43존 수단별 평일 통행(택시 19.3만/일) | 팀 제공 (KTDB 가공 추정, **원 출처 확인 필요**) | 2024 | 📊 |
| `청주시_목적OD_2024_평일.csv` | 같은 존, 목적별(출근·등교·업무·귀가·기타) | 위와 같음 | 2024 | 📊 |
| `청주시_읍면별_시내연결_요약_2024.csv` | 13개 읍·면 요약 (위 OD에서 파생) | 팀 가공 | 2024 | 📊 |
| `청주시_노드링크별_평균택시통행량_읍면동_2025.csv` | 도로 링크 11,032개 일평균 택시통행량 | 국토부, 공공데이터포털 15069016 | 2025 | 📊 |
| `청주시_읍면동_경계_2025.geojson` / `_shp.zip` | 43개 존 경계 | 팀 제공 (SGIS 계열 추정) | 2025 | ✅ (가공 후) |
| `청주택시_시민설문_문항.pdf` | 설문 12문항 | 팀 작성 | 2026-10 | 연령·성별 문항 추가 필요 |
| `충청북도_청주시_버스정보시스템_20261002.csv` | 청주 버스 정류장 2,952개 좌표 | 청주시, 공공데이터포털 15041896 | 2026-10 | ✅ (가공 후) |
| `국토교통부_..._격자별 영업통계_20251231.zip` (25MB) | 전국 500m 격자 월별 승차·매출·거리 | 국토부 TIMS, 15160181 | 2025 | **GitHub 미포함** (용량). 공공데이터포털에서 직접 받기 |
| `국토교통부_..._영업통계_20251231.zip` | 지자체별 월별 운행·공차 통계 | 국토부 TIMS, 15065131 | 2022~2025 | **GitHub 미포함**. 직접 받기 |

## 2. 가공 데이터 `data/web/`

| 폴더 | 파일 | 내용 | 상태 |
|---|---|---|---|
| `01_zones` | `zones.json`, `zones.csv`, `zones.geojson` | 존 번호·이름·동/읍/면·중심 좌표·경계 | ✅ |
| `02_fare_rules` | `fare_rules.json` | 동·읍면 요율, 9/28 개편 할증 적용 규칙 (보도 기준) | ✅ |
| `03_demand` | `taxi_od_pairs.csv` / `.min.json` | 존 쌍별 택시 통행·할증 여부·추정 거리·요금 | ✅ |
| | `surcharge_demand_summary.csv`, `taxi_link_volume_by_zone.csv`, `top50_taxi_links.csv`, `eupmyeon_city_link_summary.csv` | 할증 구분별 통행, 링크 통행 요약 | 📊 |
| `05_matching` | `matching_rules.json` | 매칭 조건(반경·시간·동성·분담) | ✅ |
| | `synthetic_ride_requests.csv/.json` | 합성 합승 요청 240건 (Supabase 시드) | 🗄️ |
| `10_tims` | `tims_app.json` | 청주 승차 요약·격자 422곳·보정계수 (앱용 묶음) | ✅ |
| | `tims_pickups_by_zone_2025.csv` | 43개 존별 2025 승차·매출·평균요금·평균거리 | 📊 |
| | `tims_pickups_by_cell_2025.csv` | 청주 500m 격자 2,739곳 연간 승차 | 📊 |
| | `tims_landmarks_2025.csv`, `tims_pickups_monthly_2025.csv` | 주요 지점·월별 승차 | 📊 |
| | `tims_region_compare_2025.csv`, `tims_cheongju_yearly.csv` | 160개 지자체 공차율 비교, 청주 연도별 | 📊 |
| | `bus_stops_by_zone.csv` | 존별 정류장 수 | 📊 |
| `11_solutions` | `solutions.json` | 복합할증 해결 방안 사례·연구 19건 (출처 포함) | 📊 |
| `12_simulation` | `agent_results.json` | 택시·승객 행위자 시뮬레이션 6개 시나리오 결과 | 📊 |
| `13_spots` | `spots.json` | 매칭 스팟 8곳 점수·순위 | ✅ |
| | `bus_stops.json` | 정류장 좌표·이름 (위치 표시용) | ✅ |
| `14_risk` | `empty_risk.json` | 13개 읍·면 공차 위험 지수 | 📊 |

## 3. 다시 만드는 방법

```bash
python scripts/build_web_data.py data/raw data/web
python scripts/build_app_data_and_seed.py .
python scripts/select_spots.py .
python scripts/empty_risk_index.py .
node scripts/precompute_agents.mjs
```

TIMS 분석(`10_tims`)을 다시 하려면 TIMS 압축 2개를 풀어서 폴더를 지정한다.

```bash
python scripts/analyze_tims.py <격자CSV폴더> <영업통계CSV폴더> data/raw/충청북도_청주시_버스정보시스템_20261002.csv data/raw/청주시_읍면동_경계_2025.geojson data/web/10_tims
python scripts/build_tims_app_data.py .
```

격자 ID는 국가지점번호 체계다. 한글 2자는 100km 블록(UTM-K), 숫자 6자리는 블록 안 500m 셀 번호(X 3자리·Y 3자리, 0~199)다.

## 4. 주요 가정

| 항목 | 값 | 비고 |
|---|---|---|
| 존 간 거리 | 중심점 직선거리 × 1.35 | Kakao 길찾기로 교체하면 정확해짐 |
| OD → 실측 보정계수 | 0.2994 | TIMS 하루 승차 57,932 ÷ OD 택시 193,466 |
| 시간대별 택시 비중 | 일반적 분포(가정) | TIMS는 시간대 정보 없음 |
| 공차 위험 가중치 | 귀로 균형 0.35, 승차 밀도 0.35, 정류장 0.15, 거리 0.15 | 민감도 확인 필요 |
| 스팟 점수 | 할증 구간 통행 0.6, 승차 0.3, 평균요금 0.1 | |

## 5. 검증이 필요한 수치

| 수치 | 문제 | 해결 |
|---|---|---|
| 할증 총액(OD 기반 연 200억대) | 존 중심 거리로 추정해 과대 가능성 큼. 시 보전 언급액 33~40억과 차이 | 정보공개청구 회신(할증 운행 건수)으로 교체 |
| 스팟별 할증 구간 비중 | 2024 평일 OD 비율을 2025 TIMS 승차에 곱한 추정 | 현장 관측·설문으로 보완 |
| OD의 원 출처 | 팀 제공 파일에 출처 기록 없음 | 받은 경로를 확인해 `data/raw/README.md`에 기재 |
