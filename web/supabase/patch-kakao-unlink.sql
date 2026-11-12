-- schema.sql을 이미 실행한 프로젝트에 '카카오 연결 해제(탈퇴) 처리'를 더한다. 한 번만 실행한다.
-- 앞의 patch-*.sql(find-order → measure-cancel → manual → privacy)을 먼저 실행해야 한다. 새로 만드는 프로젝트는 건너뛴다.

-- 한 사람의 주문에 쓰이지 않은 기록을 지우고 지울 사진 경로를 돌려준다. 아래 두 함수가 쓴다(직접 부를 수 없다).
create function public.forget_trials_of(p_uid uuid) returns text[]
language plpgsql security definer set search_path = ''
as $$
declare
  v_paths text[];
begin
  select coalesce(array_agg(p), '{}') into v_paths from (
    select g.photo_path as p from public.garments g
     where g.user_id = p_uid and g.photo_path is not null
       and g.id not in (select s.garment_id from public.mockup_sessions s join public.orders o on o.session_id = s.id where o.user_id = p_uid)
    union all
    select m.photo_path from public.manual_requests m
     where m.user_id = p_uid and m.photo_path is not null
       and m.session_id not in (select o.session_id from public.orders o where o.user_id = p_uid)
  ) photos;
  delete from public.quotes where user_id = p_uid and id not in (select o.quote_id from public.orders o where o.user_id = p_uid);
  delete from public.mockup_sessions where user_id = p_uid and id not in (select o.session_id from public.orders o where o.user_id = p_uid);
  delete from public.garments where user_id = p_uid and id not in (select s.garment_id from public.mockup_sessions s where s.user_id = p_uid);
  delete from public.order_access where user_id = p_uid;
  return v_paths;
end $$;

create or replace function public.forget_my_trials() returns text[]
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception '로그인 정보가 없어요';
  end if;
  return public.forget_trials_of(v_uid);
end $$;

-- 카카오 연결 해제(탈퇴) 알림: 카카오 연결 해제 웹훅(/api/kakao/unlink)이 비밀 키로 부른다.
-- 카카오 회원번호로 계정을 찾아 주문에 쓰이지 않은 기록을 지운다. 주문이 없으면 계정째 지우고,
-- 주문이 있으면 주문(법정 보관)만 남기고 카카오 연결과 이름·이메일 같은 카카오 정보를 지운다.
create function public.forget_kakao_user(p_kakao_id text) returns text[]
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid;
  v_paths text[];
begin
  select user_id into v_uid from auth.identities where provider = 'kakao' and provider_id = p_kakao_id;
  if v_uid is null then
    return '{}';
  end if;
  v_paths := public.forget_trials_of(v_uid);
  delete from public.order_lookups where user_id = v_uid;
  if exists (select 1 from public.orders where user_id = v_uid) then
    delete from auth.identities where user_id = v_uid;
    delete from auth.sessions where user_id = v_uid;
    update auth.users set email = null, raw_user_meta_data = '{}' where id = v_uid;
  else
    delete from auth.users where id = v_uid;
  end if;
  return v_paths;
end $$;
revoke execute on function public.forget_trials_of, public.forget_kakao_user from public, anon, authenticated;
grant execute on function public.forget_kakao_user to service_role;
