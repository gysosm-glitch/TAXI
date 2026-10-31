-- 시범 운영용 (Supabase SQL Editor에서 1회 실행, rides.sql 다음에)
-- 이용 기록·동승 평가·의견을 서버에 쌓고, 개인정보 없이 통계만 공개한다.

-- 1) 이용 기록: '도착했어요'를 누르면 1건
create table if not exists trips (
  id         bigint generated always as identity primary key,
  ride_id    uuid references rides(id) on delete set null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  spot_id    text not null,
  dest_name  text not null,
  people     int  not null check (people between 1 and 3),
  paid       int  not null check (paid >= 0),
  solo       int  not null check (solo >= 0),
  saving     int  not null check (saving >= 0),
  created_at timestamptz default now(),
  unique (ride_id, user_id)
);

-- 2) 동승 평가: 같이 탄 사람끼리 별점·노쇼
create table if not exists ratings (
  ride_id    uuid not null references rides(id) on delete cascade,
  rater_id   uuid not null references auth.users(id) on delete cascade,
  ratee_id   uuid not null references auth.users(id) on delete cascade,
  score      int  not null check (score between 1 and 5),
  no_show    boolean not null default false,
  created_at timestamptz default now(),
  primary key (ride_id, rater_id, ratee_id),
  check (rater_id <> ratee_id)
);

-- 3) 의견 보내기
create table if not exists feedback (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users(id) on delete set null,
  message    text not null check (char_length(message) between 2 and 1000),
  created_at timestamptz default now()
);

alter table trips enable row level security;
alter table ratings enable row level security;
alter table feedback enable row level security;

drop policy if exists "본인 이용 기록 추가" on trips;
drop policy if exists "본인 이용 기록 조회" on trips;
drop policy if exists "같이 탄 사람 평가" on ratings;
drop policy if exists "의견 보내기" on feedback;

create policy "본인 이용 기록 추가" on trips for insert to authenticated with check (user_id = auth.uid());
create policy "본인 이용 기록 조회" on trips for select to authenticated using (user_id = auth.uid());
-- 평가는 둘 다 그 모집의 참여자일 때만
create policy "같이 탄 사람 평가" on ratings for insert to authenticated with check (
  rater_id = auth.uid()
  and exists (select 1 from ride_members m where m.ride_id = ratings.ride_id and m.user_id = auth.uid())
  and exists (select 1 from ride_members m where m.ride_id = ratings.ride_id and m.user_id = ratings.ratee_id)
);
create policy "의견 보내기" on feedback for insert to anon, authenticated with check (user_id is null or user_id = auth.uid());

-- 4) 공개 통계 (개인정보 없이 합계만)
create or replace function public_stats() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'rides',     (select count(*) from rides),
    'matched',   (select count(*) from rides r where (select count(*) from ride_members m where m.ride_id = r.id) >= 2),
    'riders',    (select count(distinct user_id) from ride_members),
    'trips',     (select count(*) from trips),
    'saving',    (select coalesce(sum(saving), 0) from trips),
    'avg_people',(select coalesce(round(avg(people)::numeric, 1), 0) from trips),
    'by_spot',   (select coalesce(json_agg(x order by x.rides desc), '[]'::json) from (
                    select spot_name as spot, count(*) as rides from rides group by spot_name) x),
    'members',   (select count(*) from profiles)
  )
$$;
grant execute on function public_stats() to anon, authenticated;

-- 5) 사용자 평점 (평균·횟수·노쇼)
create or replace function user_rating(uid uuid) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('avg', coalesce(round(avg(score)::numeric, 1), 0), 'count', count(*), 'no_show', count(*) filter (where no_show))
  from ratings where ratee_id = uid
$$;
grant execute on function user_rating(uuid) to authenticated;

-- 6) 지난 모집 자동 정리 (매일 Vercel이 호출): 출발 2시간이 지난 모집을 마감
create or replace function close_stale_rides() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update rides r set status = case when (select count(*) from ride_members m where m.ride_id = r.id) >= 2 then 'done' else 'cancelled' end
  where status in ('open', 'full') and depart_at < now() - interval '2 hours';
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function close_stale_rides() to anon, authenticated;
