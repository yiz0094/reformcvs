import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

/** 카카오가 보낸 요청인지 대표 어드민 키로 확인한다 */
function fromKakao(request: Request, adminKey: string) {
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`KakaoAK ${adminKey}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/**
 * 카카오 연결 해제 웹훅. 손님이 카카오에서 연결을 끊거나 탈퇴하면 카카오가 GET 또는 POST로 부른다.
 * 그 손님의 주문에 쓰이지 않은 기록·사진과 카카오 정보를 지운다(규칙은 schema.sql의 forget_kakao_user).
 * 카카오는 3초 안에 200을 받아야 해서, 처리 중 오류가 나도 200으로 답하고 서버 기록에만 남긴다.
 */
async function handle(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const adminKey = process.env.KAKAO_ADMIN_KEY;
  if (!url || !secret || !adminKey) return new Response("not configured", { status: 503 });
  if (!fromKakao(request, adminKey)) return new Response("unauthorized", { status: 401 });

  const params = request.method === "POST" ? new URLSearchParams(await request.text()) : new URL(request.url).searchParams;
  const kakaoId = params.get("user_id");
  if (!kakaoId) return new Response("ok");
  try {
    const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: paths, error } = await db.rpc("forget_kakao_user", { p_kakao_id: kakaoId });
    if (error) throw error;
    if ((paths as string[]).length) {
      const removed = await db.storage.from("photos").remove(paths as string[]);
      if (removed.error) throw removed.error;
    }
  } catch (e) {
    console.error("카카오 연결 해제를 처리하지 못했어요", params.get("referrer_type"), e);
  }
  return new Response("ok");
}

export const GET = handle;
export const POST = handle;
