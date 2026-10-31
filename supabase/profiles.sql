-- 회원 프로필 테이블 (Supabase SQL Editor에서 1회 실행)
-- 로그인 계정(auth.users)마다 프로필 1개. 본인만 읽고 쓸 수 있다.

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text not null check (char_length(nickname) between 2 and 12),
  gender      text not null check (gender in ('F','M')),          -- 동성 합승 법령 요건
  phone       text not null check (phone ~ '^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$'),  -- 정식 서비스에서는 안심번호로만 연결
  age_group   text check (age_group in ('10s','20s','30s','40s','50s+')),
  org_email   text,                                               -- 학교·직장 이메일 (선택, 신뢰 배지용)
  agree_terms boolean not null default false,
  agree_privacy boolean not null default false,
  agree_location boolean not null default false,
  agree_age14 boolean not null default false,
  agree_marketing boolean not null default false,
  agreed_at   timestamptz default now(),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  constraint required_agreements check (agree_terms and agree_privacy and agree_location and agree_age14)
);

alter table profiles enable row level security;

drop policy if exists "본인 프로필 조회" on profiles;
drop policy if exists "본인 프로필 생성" on profiles;
drop policy if exists "본인 프로필 수정" on profiles;
drop policy if exists "본인 프로필 삭제" on profiles;
create policy "본인 프로필 조회" on profiles for select using (auth.uid() = id);
create policy "본인 프로필 생성" on profiles for insert with check (auth.uid() = id);
create policy "본인 프로필 수정" on profiles for update using (auth.uid() = id);
create policy "본인 프로필 삭제" on profiles for delete using (auth.uid() = id);
