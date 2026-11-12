-- schema.sql을 이미 실행한 프로젝트에 '보관 기간이 지난 기록 지우기'를 더한다. 한 번만 실행한다.
-- 앞의 patch-*.sql(… → privacy → kakao-unlink)을 먼저 실행해야 한다. 새로 만드는 프로젝트는 건너뛴다.

-- 보관 기간이 지난 기록 지우기: 매일 한 번 /api/cron/daily가 비밀 키로 부른다(처리방침 제3조 기본안).
-- 1년 넘게 새 기록이 없는 손님의 주문에 쓰이지 않은 체험 기록, 30일 지난 주문 찾기 시도,
-- 시안을 보낸 지 30일 지난 디자이너 요청의 연락처. 지울 사진 경로를 돌려준다.
-- shortcut: '마지막 이용'은 가장 최근에 만든 기록의 때로 본다. 시안을 고치기만 한 때까지 세려면 updated_at을 둔다.
create function public.purge_expired() returns text[]
language plpgsql security definer set search_path = ''
as $$
declare
  v_paths text[] := '{}';
  v_uid uuid;
begin
  for v_uid in
    select u from (
      select user_id as u, max(created_at) as last from public.garments group by user_id
      union all select user_id, max(created_at) from public.mockup_sessions group by user_id
      union all select user_id, max(created_at) from public.quotes group by user_id
      union all select user_id, max(created_at) from public.orders group by user_id
      union all select user_id, max(requested_at) from public.manual_requests group by user_id
    ) t group by u having max(last) < now() - interval '1 year'
  loop
    v_paths := v_paths || public.forget_trials_of(v_uid);
  end loop;
  delete from public.order_lookups where at < now() - interval '30 days';
  update public.manual_requests set phone = null where phone is not null and done_at < now() - interval '30 days';
  return v_paths;
end $$;
revoke execute on function public.purge_expired from public, anon, authenticated;
grant execute on function public.purge_expired to service_role;
