-- 별점을 앱에서 뺐으므로 평가 테이블을 지운다 (Supabase SQL Editor에서 1회 실행)
-- 먼저 체험 기록 초기화 함수에서 평가 테이블 참조를 뺀 뒤 지운다.

create or replace function reset_demo() returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null or not is_demo_user(me) then raise exception '체험 계정만 초기화할 수 있어요'; end if;
  delete from ride_messages where user_id = me;
  delete from trips where user_id = me;
  delete from ride_members where user_id = me and ride_id not in (select id from rides where host_id = me);
  delete from rides where host_id = me;
end $$;

drop function if exists user_rating(uuid);
drop table if exists ratings;
