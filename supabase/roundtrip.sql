-- 왕복 매칭 (Supabase SQL Editor에서 1회 실행, ops.sql 다음에)
-- 왕복 매칭: 시내→읍·면으로 가는 손님이 "도착지에서 시내로 갈 손님"을 미리 구한다.
--   같은 택시를 갈 때와 올 때 따로 타므로 합승이 아니다 → 성별 제한 없이 누구나 보고 참여한다.
--   양쪽 모두 할증 없음. 노쇼하면 할증분(hold_won)을 안 온 쪽이 부담해 기사의 빈 차 손실을 보전한다(모의).

alter table rides add column if not exists kind text not null default 'pool';
alter table rides drop constraint if exists rides_kind_check;
alter table rides add constraint rides_kind_check check (kind in ('pool', 'roundtrip'));
alter table rides add column if not exists hold_won int;          -- 노쇼 수수료 = 할증분
alter table rides add column if not exists out_from text;         -- 왕복: 갈 때 출발지 이름

-- 왕복 매칭은 성별과 관계없이 조회
drop policy if exists "같은 성별 모집 조회" on rides;
create policy "같은 성별 모집 조회" on rides for select to authenticated
  using (gender = my_gender() or kind = 'roundtrip');
drop policy if exists "같은 성별 참여자 조회" on ride_members;
create policy "같은 성별 참여자 조회" on ride_members for select to authenticated
  using (exists (select 1 from rides r where r.id = ride_id and (r.gender = my_gender() or r.kind = 'roundtrip')));

-- 참여 검사: 왕복 매칭은 성별 검사 생략, 정원 검사는 같다
create or replace function check_join() returns trigger
language plpgsql security definer set search_path = public as $$
declare r rides; cnt int;
begin
  select * into r from rides where id = new.ride_id for update;
  if r.status <> 'open' then raise exception '이미 마감된 모집이에요'; end if;
  if r.kind = 'pool' and r.gender <> (select gender from profiles where id = new.user_id) then raise exception '같은 성별끼리만 탈 수 있어요'; end if;
  select count(*) into cnt from ride_members where ride_id = new.ride_id;
  if cnt >= r.max_people then raise exception '정원이 찼어요'; end if;
  if cnt + 1 >= r.max_people then update rides set status = 'full' where id = new.ride_id; end if;
  return new;
end $$;
