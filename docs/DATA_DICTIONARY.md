# 데이터 목록 (팀 공유용)

> 최종 정리 2026-11-01. 표시: ✅ 앱에서 사용 · 📊 분석·발표 근거 · 🔒 비공개(로컬만)
> 귀로 매칭으로 방향을 바꾸면서 쓰지 않는 데이터(도로 링크 통행량, 월별·랜드마크 승차, 합성 합승 요청, 매칭 규칙, 사례 모음 JSON, 정류장 좌표)는 지웠다.

## 1. 원본 데이터 `data/raw/`

| 파일 | 내용 | 출처 | 기준 | 상태 |
|---|---|---|---|---|
| `청주시_읍면동_경계_2025.geojson` | 43개 존 경계 | [admdongkor](https://github.com/vuski/admdongkor) (vuski, 2025년 4월판) | 2025-04 | ✅ (가공 후) |
| `충청북도_청주시_버스정보시스템_20261002.csv` | 청주 버스 정류장 2,952개 좌표 | 청주시, 공공데이터포털 15041896 | 2026-10 | 📊 (정류장 수 집계) |
| `청주택시_시민설문_문항.pdf` | 설문 12문항 | 팀 작성 | 2026-10 | 귀로 매칭 문항 추가 필요 |
| `국토교통부_..._격자별 영업통계_20251231.zip` (25MB) | 전국 500m 격자 월별 승차·매출·거리 | 국토부 TIMS, 15160181 | 2025 | **GitHub 미포함**(용량). 직접 받기 |
| `국토교통부_..._영업통계_20251231.zip` | 지자체별 월별 운행·공차 통계 | 국토부 TIMS, 15065131 | 2022~2025 | **GitHub 미포함**. 직접 받기 |

출처 상세: [data/raw/README.md](../data/raw/README.md)

## 2. 비공개 자료 `private/` 🔒

KTDB 여객 OD는 이용 조건상 재배포할 수 없어 저장소에 올리지 않는다(`.gitignore`). 분석 결과(비율·순위·시뮬레이션 합계)만 공개한다.

| 파일 | 내용 | 출처 |
|---|---|---|
| `ktdb/청주시_주수단OD_2024_평일.csv` | 43존×43존 수단별 평일 통행 | KTDB `2025-OD-PSN-MOD-14` (2024 평일) |
| `ktdb/청주시_목적OD_2024_평일.csv` | 같은 존, 목적별 통행 | KTDB `2025-OD-PSN-OBJ-04` (2024 평일) |
| `ktdb/청주시_읍면별_시내연결_요약_2024.csv` | 13개 읍·면 요약 | 위 OD에서 팀 집계 |
| `derived/taxi_od_pairs.csv` / `.min.json` | 존 쌍별 택시 통행·할증 여부·거리·요금 | 위 OD 가공 (시뮬레이션 입력) |
| `derived/surcharge_demand_summary.csv`, `eupmyeon_city_link_summary.csv` | 할증 구분별 통행 요약 | 위 OD 가공 |

팀원이 분석을 다시 돌리려면 이 폴더를 따로 받아야 한다(카톡·드라이브, GitHub 아님).

## 3. 가공 데이터 `data/web/`

| 폴더 | 파일 | 내용 | 상태 |
|---|---|---|---|
| `01_zones` | `zones.json`, `zones.csv`, `zones.geojson` | 존 번호·이름·동/읍/면·중심 좌표·경계 | ✅ |
| `02_fare_rules` | `fare_rules.json` | 동·읍면 요율, 9/28 개편 할증 규칙 (보도 기준) | ✅ |
| `03_demand` | `zone_top_dest.json` | 존별 자주 가는 목적지 상위 3곳 (OD 순위만) | ✅ |
| `10_tims` | `tims_app.json` | 청주 승차 요약·격자·시간대 보정 (앱용 묶음) | ✅ |
| | `tims_pickups_by_zone_2025.csv`, `tims_pickups_by_cell_2025.csv` | 존별·500m 격자별 2025 승차 | 📊 |
| | `tims_region_compare_2025.csv`, `tims_region_stats_2022_2025.csv`, `tims_cheongju_yearly.csv` | 지자체 공차율 비교, 청주 연도별(공차 46.5%) | 📊 |
| | `bus_stops_by_zone.csv` | 존별 정류장 수 (공차 위험 지수 입력) | 📊 |
| `12_simulation` | `agent_results.json` | 행위자 시뮬레이션: 현행·합승·귀로·면제 시나리오 비교 | ✅ |
| | `return_matching.json` | **귀로 매칭 손익분기**: 앱 이용률 × 면제율, 최대 면제율, 수요 증가 가정 | ✅ |
| `13_spots` | `spots.json` | 추천 스팟 8곳 점수·순위 | ✅ |
| `14_risk` | `empty_risk.json` | 13개 읍·면 빈 차 귀로 위험 지수 | 📊 |
| | `empty_risk_sensitivity.json` | 가중치 6조합 민감도(순위 상관, 저위험 득표) | 📊 |

## 4. 다시 만드는 방법

`private/`가 있어야 하는 단계는 🔒로 표시.

```bash
python scripts/build_web_data.py data/raw data/web      # 🔒 존·요율·OD 가공
python scripts/build_top_dest.py .                       # 🔒 존별 상위 목적지
python scripts/select_spots.py .                         # 추천 스팟
python scripts/empty_risk_index.py .                     # 공차 위험 지수 + 민감도
node scripts/precompute_agents.mjs                       # 🔒 시나리오 시뮬레이션
node scripts/return_matching_analysis.mjs                # 🔒 손익분기 (약 6분)
```

TIMS 분석(`10_tims`)은 TIMS 압축 2개를 풀어서 폴더를 지정한다.

```bash
python scripts/analyze_tims.py <격자CSV폴더> <영업통계CSV폴더> data/raw/충청북도_청주시_버스정보시스템_20261002.csv data/raw/청주시_읍면동_경계_2025.geojson data/web/10_tims
python scripts/build_tims_app_data.py .
```

격자 ID는 국가지점번호 체계다. 한글 2자는 100km 블록(UTM-K), 숫자 6자리는 블록 안 500m 셀 번호(X 3자리·Y 3자리, 0~199)다.

## 5. 주요 가정

| 항목 | 값 | 비고 |
|---|---|---|
| 존 간 거리 | 중심점 직선거리 × 1.35 | 같은 존 안은 동 2.5·읍 3.5·면 4.0km |
| OD → 실측 보정 | 0.2994 | TIMS 하루 승차 57,932 ÷ OD 택시 193,466 |
| 시간대별 택시 비중 | 일반적 분포(가정) | TIMS는 시간대 정보 없음 |
| 귀로 매칭 성립 | 기사·승객 모두 앱 이용, 읍·면 하차 직후 같은 존에서 시내행 | 대기 추천은 앱 이용 기사만 25분, 그 외 8분 |
| 할증 면제 | 귀로 매칭 운행에만 적용 | 시 고시 변경 전제 |
| 수요 증가 | 기본 0% | 10·20%는 별도 가정 |
| 공차 위험 가중치 | 승차 밀도 0.5, 정류장 부족 0.25, 시내 거리 0.25 | 6조합 민감도로 확인 |
| 스팟 점수 | 할증 구간 통행 0.6, 승차 0.3, 평균요금 0.1 | |
| 연료비 (기사 화면) | km당 130원 | LPG 기준 가정 |

## 6. 검증이 필요한 수치

| 수치 | 문제 | 해결 |
|---|---|---|
| 요율·35%·9/28 개편 | 보도 기준으로만 확인 | 청주시 요금 고시 원문 확인 |
| 연간 할증 총액 | OD 규모 보정이 불확실 (시 보전 언급액 33~40억과 차이) | **발표에서 쓰지 않음**. 1건당·%만 사용 |
| 스팟별 할증 구간 비중 | 2024 평일 OD 비율을 2025 TIMS 승차에 곱한 추정 | 현장 관측·설문으로 보완 |
| 기사 귀로 대기 의향·수수료 수용 | 시뮬레이션 가정 | 기사 인터뷰 5명 |
