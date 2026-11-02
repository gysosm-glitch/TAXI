# 실행 · 배포 가이드 (팀원용)

## 1. 내 컴퓨터에서 실행

필요한 것: Node.js 20 이상, Git. 분석 스크립트까지 돌리려면 Python 3.11 이상(pandas, pyproj).

```bash
git clone https://github.com/gysosm-glitch/TAXI.git
cd TAXI
npm install
npm run dev
```

브라우저에서 http://localhost:5173 을 연다.

- 실시간 버스 정보는 Vercel 서버 함수라 **로컬 `npm run dev`에서는 동작하지 않는다.** 배포 주소에서 확인하거나 `npx vercel dev`로 실행한다.
- 테스트: `npm test`
- 빌드 확인: `npm run build`

## 2. 수정하고 배포하기

1. 브랜치를 만들어 작업한다: `git checkout -b 기능이름`
2. 커밋하고 GitHub에 올린 뒤 Pull Request를 연다.
3. `main`에 합쳐지면 Vercel이 자동으로 다시 배포한다 (약 1분).

## 3. 환경변수 (Vercel › Settings › Environment Variables)

| 이름 | 값 | 어디서 | 브라우저 노출 |
|---|---|---|---|
| `TAGO_API_KEY` | 공공데이터포털 일반 인증키(Decoding) | 15098534 버스정류소정보 | 안 됨 (서버 함수 전용) |
| `VWORLD_API_KEY` | 브이월드(vworld.kr) 검색 API 인증키. 서비스 URL에 `taxi-woad-seven.vercel.app` 등록 | 주소 검색(도로명·지번). 없으면 장소 이름 검색만 됨 | 안 됨 (서버 함수 전용) |
| `TAGO_ARRIVAL_API_KEY` | 공공데이터포털 일반 인증키(Decoding) | 15098530 버스도착정보 (없으면 위 키 사용) | 안 됨 (서버 함수 전용) |
| `VITE_SUPABASE_URL` | Supabase Project URL | Supabase › Project Settings › API | 됨 (공개용) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public 키 | 위와 같음 | 됨 (RLS로 보호) |

- 환경변수를 바꾼 뒤에는 Vercel › Deployments › 최신 배포 › **Redeploy**를 눌러야 반영된다.
- `VITE_`로 시작하는 값은 화면 코드에 그대로 들어가므로 **비밀 키를 넣으면 안 된다.** Supabase `service_role` 키는 절대 쓰지 않는다.
- 로컬에서 Supabase를 쓰려면 `.env.example`을 `.env`로 복사해 값을 채운다 (`.env`는 GitHub에 올라가지 않음).

## 4. Supabase

1. Supabase › SQL Editor에서 `supabase/profiles.sql` → `supabase/rides.sql` → `supabase/ops.sql` 순서로 실행
2. Authentication › URL Configuration: Site URL과 Redirect URLs에 배포 주소, Redirect URLs에 `http://localhost:5173` 추가
3. 무료 플랜은 1주일 접속이 없으면 일시정지된다. 발표 전날 대시보드에서 Restore.

## 5. 휴대폰에서 보기

- 배포 주소를 휴대폰 브라우저로 연다.
- 안드로이드 Chrome: 메뉴(⋮) › 홈 화면에 추가 / 아이폰 Safari: 공유 › 홈 화면에 추가
- 주소창 없이 앱처럼 열린다.

## 6. 데이터 다시 만들기

`docs/DATA_DICTIONARY.md` §3 참고.
