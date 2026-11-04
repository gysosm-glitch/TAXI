-- 모집 인원 + 동승자 채팅 + 체험 계정 초기화 (Supabase SQL Editor에서 1회 실행, roundtrip.sql 다음에)
-- 여러 번 실행해도 안전하다.

-- 0) 모집 인원을 2~4명으로
alter table rides drop constraint if exists rides_max_people_check;
alter table rides add constraint rides_max_people_check check (max_people between 2 and 4);
alter table trips drop constraint if exists trips_people_check;
alter table trips add constraint trips_people_check check (people between 1 and 4);

-- 1) 동승자 채팅: 같은 모집의 참여자끼리만 읽고 쓴다. 휴대폰 번호는 쓰지 않는다.
create table if not exists ride_messages (
  id         bigint generated always as identity primary key,
  ride_id    uuid not null references rides(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 200),
  created_at timestamptz default now()
);
create index if not exists ride_messages_ride_time on ride_messages (ride_id, created_at);

create or replace function is_ride_member(rid uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from ride_members where ride_id = rid and user_id = auth.uid()) $$;

alter table ride_messages enable row level security;
drop policy if exists "참여자 채팅 조회" on ride_messages;
drop policy if exists "참여자 채팅 보내기" on ride_messages;
create policy "참여자 채팅 조회" on ride_messages for select to authenticated using (is_ride_member(ride_id));
create policy "참여자 채팅 보내기" on ride_messages for insert to authenticated
  with check (user_id = auth.uid() and is_ride_member(ride_id));

do $$ begin
  alter publication supabase_realtime add table ride_messages;
exception when duplicate_object then null; end $$;

-- 2) 체험 계정인지 확인 (아래 초기화·통계에서 사용)
create or replace function is_demo_user(uid uuid) returns boolean
language sql stable security definer set search_path = public, auth as
$$ select exists (select 1 from auth.users where id = uid and email in ('demo.a@gatita-cheongju.com', 'demo.b@gatita-cheongju.com')) $$;
revoke execute on function is_demo_user(uuid) from public, anon;
grant execute on function is_demo_user(uuid) to authenticated;

-- 3) 체험 계정 초기화: 호출한 체험 계정 자신의 기록만 지운다. 일반 회원 기록은 건드리지 않는다.
create or replace function reset_demo() returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null or not is_demo_user(me) then raise exception '체험 계정만 초기화할 수 있어요'; end if;
  delete from ride_messages where user_id = me;
  delete from trips where user_id = me;
  delete from ride_members where user_id = me and ride_id not in (select id from rides where host_id = me);
  delete from rides where host_id = me;   -- 그 모집의 참여자·채팅도 함께 지워진다
end $$;
revoke execute on function reset_demo() from public, anon;
grant execute on function reset_demo() to authenticated;

-- 4) 공개 통계에서 체험 계정 제외
create or replace function public_stats() returns json
language sql stable security definer set search_path = public as $$
  with real_rides as (select * from rides where not is_demo_user(host_id)),
       real_trips as (select * from trips where not is_demo_user(user_id))
  select json_build_object(
    'rides',     (select count(*) from real_rides),
    'matched',   (select count(*) from real_rides r where (select count(*) from ride_members m where m.ride_id = r.id) >= 2),
    'riders',    (select count(distinct user_id) from ride_members where not is_demo_user(user_id)),
    'trips',     (select count(*) from real_trips),
    'saving',    (select coalesce(sum(saving), 0) from real_trips),
    'avg_people',(select coalesce(round(avg(people)::numeric, 1), 0) from real_trips),
    'by_spot',   (select coalesce(json_agg(x order by x.rides desc), '[]'::json) from (
                    select spot_name as spot, count(*) as rides from real_rides group by spot_name) x),
    'members',   (select count(*) from profiles where not is_demo_user(id))
  )
$$;
grant execute on function public_stats() to anon, authenticated;

-- 5) 매일 정리: 지난 모집 마감 + 30일 지난 채팅 삭제 (개인정보 안내의 보관 기간과 같음)
create or replace function close_stale_rides() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update rides r set status = case when (select count(*) from ride_members m where m.ride_id = r.id) >= 2 then 'done' else 'cancelled' end
  where status in ('open', 'full') and depart_at < now() - interval '2 hours';
  get diagnostics n = row_count;
  delete from ride_messages where created_at < now() - interval '30 days';
  return n;
end $$;
grant execute on function close_stale_rides() to anon, authenticated;
