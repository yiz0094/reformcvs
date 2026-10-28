import { designSvg } from "./design-svg";
import { blendFor, type Design } from "./designs";
import { loadImage } from "./image";
import type { Garment, MockupOptions } from "./types";

export type Framing = "full" | "close";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * 원본 사진 위에 디자인을 합성해 JPEG 데이터 URL로 돌려준다.
 * 백엔드가 붙으면 생성형 후보는 서버에서 오고, 이 함수는 오버레이 미리보기와 저장용으로만 쓴다.
 */
export async function renderComposite(
  garment: Garment,
  design: Design,
  options: MockupOptions,
  framing: Framing = "full",
  watermark = true,
): Promise<string> {
  const base = await loadImage(garment.image);
  const gw = garment.width;
  const gh = garment.height;

  // 디자인 위치와 크기 (사진 좌표)
  const dw = ((options.sizeCm * garment.pctPerCm) / 100) * gw;
  const dh = dw / design.aspect;
  const cx = options.pos.x * gw;
  const cy = options.pos.y * gh;

  // 잘라 낼 영역 (사진 좌표). 가까이 보기는 디자인 주변만 3:4로 자른다.
  let sx = 0;
  let sy = 0;
  let sw = gw;
  let sh = gh;
  if (framing === "close") {
    sw = Math.min(gw, Math.max(dw * 3, gw * 0.2));
    sh = (sw * 4) / 3;
    if (sh > gh) {
      sh = gh;
      sw = (gh * 3) / 4;
    }
    sx = clamp(cx - sw / 2, 0, gw - sw);
    sy = clamp(cy - sh / 2, 0, gh - sh);
  }

  // 원본에서 필요한 부분만 출력 크기로 바로 그려 선명도를 지킨다
  const outW = framing === "close" ? 900 : garment.source === "sample" ? gw * 2 : gw;
  const k = outW / sw;
  const outH = Math.round(sh * k);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 만들지 못했어요");
  const fx = base.naturalWidth / gw;
  const fy = base.naturalHeight / gh;
  ctx.drawImage(base, sx * fx, sy * fy, sw * fx, sh * fy, 0, 0, outW, outH);

  const pw = dw * k;
  const ph = dh * k;
  const svg = designSvg(design.slug, options.colorId, options.text, "cv", { w: pw, h: ph });
  const art = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  ctx.globalCompositeOperation = blendFor(design, options.colorId) === "multiply" ? "multiply" : "source-over";
  ctx.drawImage(art, (cx - sx) * k - pw / 2, (cy - sy) * k - ph / 2, pw, ph);
  ctx.globalCompositeOperation = "source-over";

  if (watermark) drawWatermark(canvas);
  return canvas.toDataURL("image/jpeg", 0.9);
}

function drawWatermark(c: HTMLCanvasElement) {
  const ctx = c.getContext("2d");
  if (!ctx) return;
  const s = c.width / 600;
  const text = "AI 예시 · 리폼 편의점";
  ctx.font = `600 ${Math.round(14 * s)}px 'Pretendard Variable', Pretendard, -apple-system, 'Apple SD Gothic Neo', sans-serif`;
  const tw = ctx.measureText(text).width;
  const pad = 10 * s;
  const bw = tw + pad * 2;
  const bh = 28 * s;
  const x = c.width - bw - 14 * s;
  const y = c.height - bh - 14 * s;
  ctx.fillStyle = "rgba(23,23,27,0.62)";
  ctx.beginPath();
  ctx.roundRect(x, y, bw, bh, bh / 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + pad, y + bh / 2 + s);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
