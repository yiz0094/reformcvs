-- schema.sql을 이미 실행한 프로젝트에 'AI 시안 횟수 제한'을 더한다. 한 번만 실행한다.
-- 앞의 patch-*.sql(… → kakao-unlink → retention)을 먼저 실행해야 한다. 새로 만드는 프로젝트는 건너뛴다.

-- AI 시안 횟수: 돈이 드는 생성 AI 호출을 계정별·전체 하루 횟수로 막는다. /api/generate가 비밀 키로 부른다.
-- 하루가 지난 기록은 부를 때마다 지워서 하루치만 남는다. 손님은 이 표를 읽거나 쓰지 못한다.
create table public.ai_runs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now()
);
create index ai_runs_at on public.ai_runs (at);
create index ai_runs_user on public.ai_runs (user_id, at);
alter table public.ai_runs enable row level security;

-- 'ok'면 한 번을 세고 만들어도 된다. 'user'는 그 계정이, 'total'은 전체가 오늘 몫을 다 썼다
create function public.take_ai_run(p_uid uuid, p_user_limit int, p_total_limit int) returns text
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.ai_runs where at < now() - interval '1 day';
  if (select count(*) from public.ai_runs where user_id = p_uid) >= p_user_limit then
    return 'user';
  end if;
  if (select count(*) from public.ai_runs) >= p_total_limit then
    return 'total';
  end if;
  insert into public.ai_runs (user_id) values (p_uid);
  return 'ok';
end $$;

revoke execute on function public.take_ai_run from public, anon, authenticated;
grant execute on function public.take_ai_run to service_role;
