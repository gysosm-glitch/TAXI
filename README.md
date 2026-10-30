# 청주 복합할증 개선 · 택시 매칭 스팟

충북대학교 경영대 캡스톤디자인. 같은 청주인데 13개 읍·면으로 가면 일괄 35%가 붙는 택시 복합할증을, 교통 데이터로 진단하고 → 공차 위험에 따라 제도를 다시 설계하고 → 수요가 몰리는 스팟에서 합승·귀로 매칭으로 실행하는 개선 시스템.

- 데모: https://taxi-woad-seven.vercel.app (휴대폰에서 바로 보기, 홈 화면에 추가 가능)
- **먼저 읽을 문서: [PRD.md](PRD.md)**

| 문서 | 내용 |
|---|---|
| [PRD.md](PRD.md) | 문제·해결 전략·분석 결과·데모 범위·팀 과제·일정 |
| [docs/DATA_DICTIONARY.md](docs/DATA_DICTIONARY.md) | 데이터 목록·출처·재생성 방법·검증 필요 수치 |
| [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) | 실행·배포·환경변수 |
| [docs/복합할증_해결방안_리서치.md](docs/복합할증_해결방안_리서치.md) | 국내 사례·연구 19건 |
| [docs/리서치보고서_청주택시복합할증.pdf](docs/리서치보고서_청주택시복합할증.pdf) | 초기 리서치 보고서 |

## 폴더 구조

```
api/        Vercel 서버 함수 (실시간 버스·도로)
src/        웹 화면 (매칭 스팟 · 실시간 교통 · 매칭에 필요한 정보)
data/raw/   원본 데이터 (TIMS 압축 원본은 용량 때문에 제외)
data/web/   가공 데이터
scripts/    데이터 가공·분석·시뮬레이션
supabase/   DB 스키마·시드 (매칭 신청 기능용)
docs/       문서
```

## 빠른 시작

```bash
npm install
npm run dev
```
