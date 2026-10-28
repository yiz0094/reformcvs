import { nearestColor } from "./garments";
import type { QualityReport } from "./types";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러오지 못했어요"));
    img.src = src;
  });
}

export interface PreparedPhoto {
  dataUrl: string;
  width: number;
  height: number;
  quality: QualityReport;
  color: { name: string; hex: string };
}

export const QUALITY_MESSAGE: Record<string, string> = {
  dark: "사진이 어두워요. 밝은 곳에서 찍으면 시안이 더 정확해요.",
  bright: "빛이 너무 강해요. 그늘진 밝은 곳에서 찍어 주세요.",
  blur: "사진이 흔들렸어요. 휴대폰을 고정하고 다시 찍어 주세요.",
  small: "옷이 작게 찍혔어요. 옷이 화면을 채우게 찍어 주세요.",
  crop: "옷 가장자리가 잘렸을 수 있어요. 조금 멀리서 찍어 주세요.",
};

/**
 * 고객 기기에서 사진을 줄이고(긴 변 1,080px) 다시 인코딩해 EXIF를 지운 뒤,
 * 밝기·흔들림·옷 크기와 대표 색을 계산한다. 서버로 보내기 전 단계와 같다.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, 1080 / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("이미지를 처리하지 못했어요");
    ctx.drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
    return { dataUrl, width, height, ...analyze(img) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
};

function analyze(img: HTMLImageElement) {
  const S = 160;
  const scale = S / Math.max(img.naturalWidth, img.naturalHeight);
  const w = Math.max(8, Math.round(img.naturalWidth * scale));
  const h = Math.max(8, Math.round(img.naturalHeight * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("이미지를 처리하지 못했어요");
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const n = w * h;
  const gray = new Float32Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const y = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    gray[i] = y;
    sum += y;
  }
  const brightness = sum / n;

  // 라플라시안 분산이 낮으면 흔들린 사진이다
  let lsum = 0;
  let lsq = 0;
  let cnt = 0;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const l = gray[i - w] + gray[i + w] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      lsum += l;
      lsq += l * l;
      cnt++;
    }
  const lmean = lsum / cnt;
  const sharpness = lsq / cnt - lmean * lmean;

  // 가장자리 색을 바닥색으로 보고, 바닥과 다른 픽셀을 옷으로 센다
  const at = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const border: number[][] = [];
  for (let x = 0; x < w; x++) border.push(at(x, 0), at(x, h - 1));
  for (let y = 0; y < h; y++) border.push(at(0, y), at(w - 1, y));
  const bg = [0, 1, 2].map((k) => median(border.map((p) => p[k])));
  let fg = 0;
  let fr = 0;
  let fgr = 0;
  let fb = 0;
  for (let i = 0; i < n; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    if (Math.hypot(r - bg[0], g - bg[1], b - bg[2]) > 42) {
      fg++;
      fr += r;
      fgr += g;
      fb += b;
    }
  }
  const coverage = fg / n;
  const color = fg > n * 0.02 ? nearestColor(fr / fg, fgr / fg, fb / fg) : nearestColor(bg[0], bg[1], bg[2]);

  const issues: string[] = [];
  if (brightness < 60) issues.push("dark");
  else if (brightness > 228) issues.push("bright");
  if (sharpness < 35) issues.push("blur");
  if (coverage < 0.18) issues.push("small");
  else if (coverage > 0.97) issues.push("crop");
  return { quality: { brightness, sharpness, coverage, issues }, color };
}
