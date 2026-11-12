import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";

/**
 * 매일 한 번 Vercel 크론이 부른다(vercel.json의 crons).
 * 1) 무료 Supabase는 7일 동안 쓰이지 않으면 멈추므로, 매일 데이터베이스를 한 번 부른다.
 * 2) 처리방침의 보관 기간이 지난 기록과 사진을 지운다(규칙은 schema.sql의 purge_expired).
 * 기간이 지난 것만 지우므로 여러 번 불려도 안전하다. CRON_SECRET을 넣어 두면 그 값으로 온 요청만 받는다.
 */
export async function GET(request: Request) {
  // 빌드 때 미리 실행되지 않고 요청이 올 때만 돌게 한다(GET 경로는 기본으로 미리 만들어진다)
  await connection();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return Response.json({ ok: false, error: "not configured" }, { status: 503 });
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) return new Response("unauthorized", { status: 401 });

  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.rpc("purge_expired");
  if (error) {
    console.error("보관 기간 정리를 하지 못했어요", error);
    return Response.json({ ok: false }, { status: 500 });
  }
  const paths = data as string[];
  for (let i = 0; i < paths.length; i += 100) {
    const removed = await db.storage.from("photos").remove(paths.slice(i, i + 100));
    if (removed.error) console.error("지난 사진을 지우지 못했어요", removed.error);
  }
  return Response.json({ ok: true, photos: paths.length });
}
