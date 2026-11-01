# 쉐어택 (ShareTaxi)

충북대학교 경영대 캡스톤디자인. 읍·면에 손님을 내려준 뒤 빈 차로 돌아가는 택시에 시내 가는 손님을 이어 주는 귀로 매칭 플랫폼. 귀로를 채워 복합할증(동↔읍·면 35%)의 근거를 없애는 것이 목표다.

- 데모: https://taxi-woad-seven.vercel.app (휴대폰에서 바로 보기, 홈 화면에 추가 가능)
- **팀원은 먼저: [PRD.md](PRD.md)** (앱 소개·할 일) → [사용 설명서](docs/사용설명서.md)

| 문서 | 내용 |
|---|---|
| [PRD.md](PRD.md) | 앱 소개·기능·법·데이터·할 일 (팀원용 핵심 문서) |
| [docs/사용설명서.md](docs/사용설명서.md) | 1분 사용법 |
| [docs/발표원고.md](docs/발표원고.md) | **PPT 8장 내용·숫자·출처 (발표 기준 문서)** |
| [docs/DATA_DICTIONARY.md](docs/DATA_DICTIONARY.md) | 데이터 목록·출처·재생성 방법·가정·검증 필요 수치 |
| [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) | 실행·배포·환경변수 |
| [docs/복합할증_해결방안_리서치.md](docs/복합할증_해결방안_리서치.md) | 국내 사례·연구 19건 |
| [docs/리서치보고서_청주택시복합할증.pdf](docs/리서치보고서_청주택시복합할증.pdf) | 초기 리서치 보고서 |

## 폴더 구조

```
api/        Vercel 서버 함수 (실시간 버스·막차·KTX)
src/        웹 화면 (첫 화면 · 타기 · 기사 · 내 정보)
data/raw/   원본 데이터 (TIMS 압축 원본은 용량 때문에 제외)
data/web/   가공 데이터 (비율·순위·합계만)
private/    KTDB OD 원자료 (재배포 불가, 저장소에 없음)
scripts/    데이터 가공·분석·시뮬레이션
supabase/   DB 설정 SQL (회원·모집·운영)
docs/       문서
presentation/ 발표 PPT 생성기와 완성본 (npm install && npm run art && npm run build)
```

## 빠른 시작

```bash
npm install
npm run dev
```
