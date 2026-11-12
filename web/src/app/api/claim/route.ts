import { createClient } from "@supabase/supabase-js";

const fail = (status: number, error: string) => Response.json({ error }, { status });

/** 사진 경로가 들어 있는 표: [표, 기본 키, 경로 칸] */
const PHOTO_COLUMNS = [
  ["garments", "id", "photo_path"],
  ["manual_requests", "session_id", "photo_path"],
  ["orders", "id", "confirm_photo_path"],
] as const;
const OWNED = ["garments", "mockup_sessions", "quotes", "orders", "manual_requests"] as const;

/**
 * 카카오 로그인 직후, 같은 브라우저의 익명 계정이 만든 기록(옷·시안·견적·주문·디자이너 요청·찾은 주문)과 사진을
 * 카카오 계정으로 옮긴다. 두 계정의 열쇠를 모두 받아, 둘 다 지금 이 손님의 것인지 확인한 뒤에만 옮긴다.
 * 다시 불러도 이미 옮긴 것은 건너뛰므로 중간에 실패하면 그대로 다시 부르면 된다.
 */
export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return fail(503, "서버가 아직 준비되지 않았어요");
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const body = (await request.json().catch(() => null)) as { anonToken?: unknown } | null;
  const user = token ? (await db.auth.getUser(token)).data.user : null;
  if (!user || user.is_anonymous) return fail(401, "카카오 로그인을 다시 해 주세요");
  const anon = typeof body?.anonToken === "string" ? (await db.auth.getUser(body.anonToken)).data.user : null;
  // 익명 계정이 아니면 남의 기록일 수 있으니 옮기지 않는다
  if (!anon?.is_anonymous || anon.id === user.id) return Response.json({ moved: false });

  // 사진은 계정 폴더에 있어야 열리므로 파일을 먼저 옮기고 경로를 고친다
  const from = `${anon.id}/`;
  for (const [table, key, column] of PHOTO_COLUMNS) {
    const { data, error } = await db.from(table).select(`${key}, ${column}`).eq("user_id", anon.id).like(column, `${from}%`);
    if (error) return fail(500, "사진을 옮기지 못했어요");
    for (const row of data as unknown as Record<string, string>[]) {
      const to = `${user.id}/${row[column].slice(from.length)}`;
      const moved = await db.storage.from("photos").move(row[column], to);
      if (moved.error) return fail(500, "사진을 옮기지 못했어요");
      const updated = await db.from(table).update({ [column]: to }).eq(key, row[key]);
      if (updated.error) return fail(500, "사진을 옮기지 못했어요");
    }
  }

  for (const table of OWNED) {
    const { error } = await db.from(table).update({ user_id: user.id }).eq("user_id", anon.id);
    if (error) return fail(500, "체험 기록을 옮기지 못했어요");
  }
  // 찾은 주문은 (주문, 계정)이 겹칠 수 있어 새 계정에 열어 준 뒤 익명 쪽을 지운다
  const { data: access } = await db.from("order_access").select("order_id").eq("user_id", anon.id);
  if (access?.length) {
    const opened = await db
      .from("order_access")
      .upsert(access.map((a) => ({ order_id: a.order_id, user_id: user.id })), { onConflict: "order_id,user_id", ignoreDuplicates: true });
    if (opened.error) return fail(500, "찾은 주문을 옮기지 못했어요");
    await db.from("order_access").delete().eq("user_id", anon.id);
  }
  // shortcut: 빈 익명 계정은 지우지 않고 남긴다. 계정이 많이 쌓이면 주기적으로 정리한다
  return Response.json({ moved: true });
}
