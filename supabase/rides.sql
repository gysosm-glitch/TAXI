-- 같이타기 모집·참여 (Supabase SQL Editor에서 1회 실행, profiles.sql 다음에)
-- 규칙: 같은 성별끼리만 보이고 참여 가능(택시 합승 법령), 정원(2~3명)이 차면 자동 마감

create table if not exists rides (
  id          uuid primary key default gen_random_uuid(),
  host_id     uuid not null references auth.users(id) on delete cascade,
  spot_id     text not null,                 -- 매칭 스팟 (data/web/13_spots)
  spot_name   text not null,
  dest_zone   int  not null,                 -- 목적지 읍면동 존 번호
  dest_name   text not null,
  depart_at   timestamptz not null,
  max_people  int  not null check (max_people between 2 and 3),
  gender      text not null check (gender in ('F','M')),
  status      text not null default 'open' check (status in ('open','full','done','cancelled')),
  created_at  timestamptz default now()
);

create table if not exists ride_members (
  ride_id   uuid not null references rides(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  nickname  text not null,
  joined_at timestamptz default now(),
  primary key (ride_id, user_id)
);

create index if not exists rides_spot_time on rides (spot_id, depart_at);

-- 내 성별 (RLS에서 사용)
create or replace function my_gender() returns text
language sql stable security definer set search_path = public as
$$ select gender from profiles where id = auth.uid() $$;

-- 모집을 열면 모집자를 첫 참여자로 자동 등록
create or replace function add_host_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into ride_members (ride_id, user_id, nickname)
  select new.id, new.host_id, p.nickname from profiles p where p.id = new.host_id;
  return new;
end $$;
drop trigger if exists rides_add_host on rides;
create trigger rides_add_host after insert on rides for each row execute function add_host_member();

-- 참여 전 검사: 모집 중인지, 같은 성별인지, 정원이 남았는지 → 정원이 차면 마감
create or replace function check_join() returns trigger
language plpgsql security definer set search_path = public as $$
declare r rides; cnt int;
begin
  select * into r from rides where id = new.ride_id for update;
  if r.status <> 'open' then raise exception '이미 마감된 모집이에요'; end if;
  if r.gender <> (select gender from profiles where id = new.user_id) then raise exception '같은 성별끼리만 탈 수 있어요'; end if;
  select count(*) into cnt from ride_members where ride_id = new.ride_id;
  if cnt >= r.max_people then raise exception '정원이 찼어요'; end if;
  if cnt + 1 >= r.max_people then update rides set status = 'full' where id = new.ride_id; end if;
  return new;
end $$;
drop trigger if exists ride_members_check on ride_members;
create trigger ride_members_check before insert on ride_members for each row execute function check_join();

-- 나가면 다시 모집 중으로
create or replace function reopen_on_leave() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update rides set status = 'open' where id = old.ride_id and status = 'full';
  return old;
end $$;
drop trigger if exists ride_members_reopen on ride_members;
create trigger ride_members_reopen after delete on ride_members for each row execute function reopen_on_leave();

alter table rides enable row level security;
alter table ride_members enable row level security;

drop policy if exists "같은 성별 모집 조회" on rides;
drop policy if exists "본인 모집 생성" on rides;
drop policy if exists "모집자 상태 변경" on rides;
drop policy if exists "같은 성별 참여자 조회" on ride_members;
drop policy if exists "본인 참여" on ride_members;
drop policy if exists "본인 나가기" on ride_members;

create policy "같은 성별 모집 조회" on rides for select to authenticated using (gender = my_gender());
create policy "본인 모집 생성" on rides for insert to authenticated with check (host_id = auth.uid() and gender = my_gender());
create policy "모집자 상태 변경" on rides for update to authenticated using (host_id = auth.uid());
create policy "같은 성별 참여자 조회" on ride_members for select to authenticated
  using (exists (select 1 from rides r where r.id = ride_id and r.gender = my_gender()));
create policy "본인 참여" on ride_members for insert to authenticated with check (user_id = auth.uid());
create policy "본인 나가기" on ride_members for delete to authenticated using (user_id = auth.uid());

-- 실시간 갱신
do $$ begin
  alter publication supabase_realtime add table rides;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table ride_members;
exception when duplicate_object then null; end $$;
