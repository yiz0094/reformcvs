import { createClient } from "@supabase/supabase-js";
import { designBySlug } from "@/lib/designs";
import type { DesignType } from "@/lib/types";

/**
 * AI 정밀 시안. 화면이 만든 합성 시안(디자인을 원하는 자리에 올린 사진)을 fal.ai의 FLUX.2 편집 모델로
 * 실제 작업처럼 다듬는다. FAL_KEY가 없으면 503으로 답하고, 화면은 지금처럼 합성 예시를 보여 준다.
 * 학습한 LoRA는 AI_LORAS 환경 변수(JSON)에 디자인 slug나 종류(embroidery·wappen·patch·print)별로 넣는다.
 * 예: {"wappen":{"url":"https://...safetensors","prompt":"..."}}  (만드는 법: README의 'AI 시안 학습')
 */
export const maxDuration = 60;

const PER_USER = 9; // 계정 하나가 하루에 만드는 AI 시안 수(한 번 누르면 3장)
const TOTAL = 300; // 하루 전체 상한. 장당 약 $0.04라 하루 최대 약 $13
const MAX_IMAGE = 3_000_000; // data URL 길이(약 2.2MB)

const MAKE_REAL: Record<DesignType, string> = {
  embroidery:
    "Turn the flat graphic on the garment into real machine embroidery stitched into the fabric, with visible thread texture, slight relief and shading that follows the fabric folds and lighting.",
  wappen:
    "Turn the flat graphic on the garment into a real embroidered wappen sewn onto the fabric, with a stitched border, slight thickness and a soft shadow that follows the fabric folds and lighting.",
  patch:
    "Turn the flat graphic on the garment into a real fabric patch sewn onto the garment, with stitched edges, fabric texture and a soft shadow that follows the folds and lighting.",
  print:
    "Turn the flat graphic on the garment into a real screen print on the fabric, with the ink sitting in the fabric texture and following the folds and lighting.",
};
const KEEP = " Keep the design's position, size, shape and colors. Keep everything else in the photo unchanged.";

type Lora = { url: string; prompt?: string; scale?: number };

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const falKey = process.env.FAL_KEY;
  if (!url || !secret || !falKey) return fail(503, "AI 시안이 아직 준비되지 않았어요");
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const user = token ? (await db.auth.getUser(token)).data.user : null;
  if (!user) return fail(401, "다시 들어와서 시도해 주세요");

  const body = (await request.json().catch(() => null)) as { designSlug?: unknown; image?: unknown } | null;
  const design = designBySlug(String(body?.designSlug ?? ""));
  const image = typeof body?.image === "string" ? body.image : "";
  if (!design || !image.startsWith("data:image/jpeg;base64,") || image.length > MAX_IMAGE) return fail(400, "시안 사진을 확인해 주세요");

  // 돈이 드는 호출이라 계정별·전체 하루 횟수를 데이터베이스에서 센다(patch-ai-runs.sql). 함수가 없으면 열지 않는다
  const { data: verdict, error } = await db.rpc("take_ai_run", { p_uid: user.id, p_user_limit: PER_USER, p_total_limit: TOTAL });
  if (error) {
    console.error("AI 시안 횟수를 세지 못했어요", error);
    return fail(503, "AI 시안이 아직 준비되지 않았어요");
  }
  if (verdict === "user") return fail(429, "오늘 만들 수 있는 AI 시안을 다 만들었어요. 내일 다시 만들 수 있어요.");
  if (verdict !== "ok") return fail(429, "오늘은 AI 시안 요청이 많아 쉬어 가요. 내일 다시 시도해 주세요.");

  let loras: Record<string, Lora> = {};
  try {
    loras = JSON.parse(process.env.AI_LORAS || "{}");
  } catch {
    console.error("AI_LORAS가 JSON 형식이 아니에요");
  }
  const lora = loras[design.slug] ?? loras[design.type];
  // shortcut: LoRA는 리폼 전 사진으로 학습하는데 여기는 합성 시안을 보낸다. 결과가 어긋나면 합성 시안→실물 사진 쌍을 학습 자료에 더한다
  const prompt = lora?.prompt ?? MAKE_REAL[design.type] + KEEP;

  const res = await fetch("https://fal.run/fal-ai/flux-2/lora/edit", {
    method: "POST",
    headers: { authorization: `Key ${falKey}`, "content-type": "application/json" },
    // sync_mode: 결과를 data URI로 받고 fal 요청 기록에 남기지 않는다(손님 사진)
    body: JSON.stringify({ prompt, image_urls: [image], loras: lora ? [{ path: lora.url, scale: lora.scale ?? 1 }] : [], output_format: "jpeg", sync_mode: true }),
    signal: AbortSignal.timeout(55_000),
  }).catch((e) => {
    console.error("AI 시안 서버에 닿지 못했어요", e);
    return null;
  });
  if (!res?.ok) {
    if (res) console.error("AI 시안 생성 실패", res.status, (await res.text()).slice(0, 300));
    return fail(502, "AI 시안을 만들지 못했어요.");
  }
  const out = (await res.json()) as { images?: { url?: string }[]; has_nsfw_concepts?: boolean[] };
  const result = out.images?.[0]?.url;
  if (!result?.startsWith("data:image/") || out.has_nsfw_concepts?.[0]) return fail(502, "AI 시안을 만들지 못했어요.");
  return Response.json({ image: result });
}
