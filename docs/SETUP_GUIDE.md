# Supabase DB 구축 → Vercel 배포 가이드

로그인과 키 입력은 직접 해야 하는 단계라 클릭 순서대로 적었다. 예상 소요 20~30분.

## 0. 로컬에서 먼저 실행해 보기

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:5173 을 연다. Supabase 연결 전에는 **로컬 합성 데이터**로 동작한다.

## 1. Supabase 프로젝트 만들기

1. https://supabase.com 로그인 → **New project**
2. Name: `cheongju-taxi`, Region: **Northeast Asia (Seoul)**, DB 비밀번호는 따로 보관
3. 생성이 끝나면 왼쪽 **SQL Editor** → New query
4. `supabase/schema.sql` 내용을 붙여넣고 **Run** (테이블 5개, RLS, Realtime 설정)
5. 새 쿼리에 `supabase/seed.sql`을 붙여넣고 **Run** (존 43개, 요금규칙 3개, 시나리오 4개, 합성 요청 240건)
6. **Table Editor**에서 `ride_requests`에 240행이 있는지 확인
7. **Project Settings → API**에서 `Project URL`과 `anon public` 키를 복사

> ⚠️ `service_role` 키는 절대 앱이나 GitHub에 넣지 않는다.
> ⚠️ 무료 플랜은 **1주일 동안 접속이 없으면 일시정지**된다. 발표 전날 대시보드에 들어가 Restore 해 둔다.

## 2. 로컬에서 Supabase 연결 확인

`.env.example`을 `.env`로 복사하고 두 값을 채운 뒤 `npm run dev`를 다시 실행한다. 합승 매칭 탭 상단이 "Supabase 실시간 DB"로 바뀌면 성공이다. 휴대폰 두 대로 접속해 한쪽에서 요청을 등록하면 다른 쪽 목록에 실시간으로 뜬다.

## 3. Vercel 배포

1. https://vercel.com 에서 **GitHub로 로그인**
2. **Add New → Project** → `gysosm-glitch/TAXI` **Import**
3. Framework Preset은 **Vite**로 자동 인식된다 (Build `npm run build`, Output `dist`)
4. **Environment Variables**에 두 개 추가
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. **Deploy** → 1분 뒤 `https://<프로젝트명>.vercel.app` 주소가 나온다
6. 이후 GitHub에 push할 때마다 자동으로 재배포된다

## 4. 휴대폰에서 앱처럼 쓰기 (PWA)

Vercel 주소(HTTPS)를 휴대폰 브라우저로 연다.
- Android Chrome: 메뉴 → **홈 화면에 추가**
- iPhone Safari: 공유 → **홈 화면에 추가**

## 5. 다음 단계: Kakao 지도·길찾기 (1주차)

1. https://developers.kakao.com → 내 애플리케이션 → 앱 추가 (**계정의 첫 앱에만 무료 쿼터가 적용**됨)
2. 플랫폼 → Web → 사이트 도메인에 `http://localhost:5173`, `https://<프로젝트명>.vercel.app` 등록
3. JavaScript 키는 지도 표시용 → `VITE_KAKAO_JS_KEY`
4. Kakao Mobility 길찾기(https://developers.kakaomobility.com)는 REST 키를 쓴다. 이 키는 브라우저에 노출하지 말고 Vercel Serverless Function(`/api/route`)에서 호출한다. 키는 Vercel 환경변수 `KAKAO_REST_KEY`에 넣는다.
5. 길찾기 거리로 `est_distance_km`를 교체하면 요금 계산이 "추정치"에서 "실경로" 기준으로 바뀐다.
