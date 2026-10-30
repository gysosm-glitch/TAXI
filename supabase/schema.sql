-- 청주 택시 복합할증 데모 DB 스키마 (Supabase SQL Editor에서 1회 실행)
-- 실행 순서: schema.sql → seed.sql

create table if not exists zones (
  zone_id      int primary key,           -- OD 존번호(107~149)
  name         text not null,             -- 읍면동 이름
  gu           text not null,
  type_ko      text not null,             -- 동/읍/면
  type         text not null check (type in ('dong','eup','myeon')),
  is_eupmyeon  boolean not null,
  adm_code     text,
  centroid_lon double precision,
  centroid_lat double precision
);

create table if not exists fare_rules (
  region     text primary key,            -- cheongju / sejong / daejeon
  version    text not null,
  rules      jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists scenarios (
  id                text primary key,
  description       text,
  category          text,
  distance_km       numeric,
  fare_now          int,
  fare_if_dong_rate int,
  payload           jsonb
);

create table if not exists ride_requests (
  id               bigint generated always as identity primary key,
  nickname         text not null,
  gender           text check (gender in ('F','M')),
  age_group        text,
  origin_zone      int references zones(zone_id),
  origin_name      text,
  origin_lon       double precision,
  origin_lat       double precision,
  dest_zone        int references zones(zone_id),
  dest_name        text,
  dest_lon         double precision,
  dest_lat         double precision,
  depart_at        timestamptz not null,
  seats            int default 1 check (seats between 1 and 3),
  same_gender_only boolean default true,
  category         text,
  status           text default 'waiting' check (status in ('waiting','matched','cancelled','done')),
  is_synthetic     boolean default false,  -- 합성(가상) 데이터 여부: 화면에 배지로 표시
  created_at       timestamptz default now()
);

create table if not exists matches (
  id             bigint generated always as identity primary key,
  request_ids    bigint[] not null,
  total_fare     int,
  shares         int[],
  saving_vs_solo int,
  created_at     timestamptz default now()
);

-- RLS: 데모용 공개 정책 (anon 키로 읽기 + 요청 등록만 허용, 수정·삭제 불가)
alter table zones         enable row level security;
alter table fare_rules    enable row level security;
alter table scenarios     enable row level security;
alter table ride_requests enable row level security;
alter table matches       enable row level security;

create policy "public read zones"      on zones         for select using (true);
create policy "public read fare"       on fare_rules    for select using (true);
create policy "public read scenarios"  on scenarios     for select using (true);
create policy "public read requests"   on ride_requests for select using (true);
create policy "public insert requests" on ride_requests for insert with check (is_synthetic = false);
create policy "public read matches"    on matches       for select using (true);
create policy "public insert matches"  on matches       for insert with check (true);

-- 실시간 구독 (새 합승 요청이 들어오면 화면 자동 갱신)
alter publication supabase_realtime add table ride_requests;
