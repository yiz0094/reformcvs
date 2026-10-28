import { luminance } from "./format";
import type { Category, DesignType, Garment, Material, MockupOptions, PlacementId, PriceLine } from "./types";

export interface DesignColor {
  id: string;
  label: string;
  hex: string;
  /** 체커 패치워크처럼 두 색을 쓰는 디자인의 두 번째 색 */
  hex2?: string;
}

export interface Design {
  slug: string;
  name: string;
  type: DesignType;
  typeLabel: string;
  summary: string;
  basePrice: number;
  leadDays: number;
  size: { min: number; max: number; default: number; step: number; largeOver: number; largeFee: number };
  /** 너비 ÷ 높이 */
  aspect: number;
  placements: PlacementId[];
  colors: DesignColor[];
  text?: { default: string; max: number };
  blocked?: { materials?: Material[]; categories?: Category[]; reason: string }[];
  /** 작업지시서에 들어가는 작업 순서 */
  ops: string[];
}

export const DESIGN_TYPE_LABEL: Record<DesignType, string> = {
  embroidery: "자수",
  wappen: "와펜",
  patch: "패치",
  print: "프린트",
};

export const DESIGNS: Design[] = [
  {
    slug: "daisy-embroidery",
    name: "데이지 자수",
    type: "embroidery",
    typeLabel: "자수",
    summary: "작은 데이지 꽃을 실로 촘촘히 수놓아요",
    basePrice: 25000,
    leadDays: 7,
    size: { min: 4, max: 10, default: 6, step: 0.5, largeOver: 8, largeFee: 5000 },
    aspect: 1,
    placements: ["left-chest", "right-chest", "sleeve", "hem", "thigh"],
    colors: [
      { id: "white", label: "화이트", hex: "#f6f3ea" },
      { id: "butter", label: "버터", hex: "#f5d36b" },
      { id: "coral", label: "코랄", hex: "#ee8577" },
      { id: "lavender", label: "라벤더", hex: "#b6a3e2" },
    ],
    blocked: [{ materials: ["leather"], reason: "가죽은 바늘 자국이 남아 자수를 놓기 어려워요" }],
    ops: ["자수 도안 불러오기", "안쪽에 심지 붙이기", "자수 후 실밥 정리"],
  },
  {
    slug: "initial-embroidery",
    name: "이니셜 자수",
    type: "embroidery",
    typeLabel: "자수",
    summary: "이름 머리글자를 필기체로 수놓아요",
    basePrice: 25000,
    leadDays: 7,
    size: { min: 4, max: 12, default: 7, step: 0.5, largeOver: 9, largeFee: 5000 },
    aspect: 2,
    placements: ["left-chest", "right-chest", "sleeve", "hem", "thigh"],
    colors: [
      { id: "navy", label: "네이비", hex: "#22325a" },
      { id: "white", label: "화이트", hex: "#f6f3ea" },
      { id: "red", label: "레드", hex: "#c8323c" },
      { id: "gold", label: "골드", hex: "#d6a73a" },
    ],
    text: { default: "RE", max: 3 },
    blocked: [{ materials: ["leather"], reason: "가죽은 바늘 자국이 남아 자수를 놓기 어려워요" }],
    ops: ["이니셜 도안 만들기", "안쪽에 심지 붙이기", "자수 후 실밥 정리"],
  },
  {
    slug: "smile-wappen",
    name: "스마일 와펜",
    type: "wappen",
    typeLabel: "와펜",
    summary: "동그란 스마일 와펜을 박음질로 단단히 달아요",
    basePrice: 30000,
    leadDays: 5,
    size: { min: 5, max: 12, default: 7, step: 0.5, largeOver: 9, largeFee: 5000 },
    aspect: 1,
    placements: ["left-chest", "right-chest", "center-chest", "sleeve", "thigh", "knee"],
    colors: [
      { id: "yellow", label: "옐로", hex: "#f7c531" },
      { id: "pink", label: "핑크", hex: "#f39ac0" },
      { id: "mint", label: "민트", hex: "#8fd8c4" },
      { id: "white", label: "화이트", hex: "#f4f1e8" },
    ],
    blocked: [{ materials: ["knit"], reason: "니트는 늘어나서 와펜 가장자리가 들뜰 수 있어요" }],
    ops: ["와펜 위치 시침", "가장자리 박음질", "다림질 마감"],
  },
  {
    slug: "star-patch",
    name: "스타 패치",
    type: "patch",
    typeLabel: "패치",
    summary: "별 모양 원단 패치를 오버로크로 덧대요",
    basePrice: 30000,
    leadDays: 7,
    size: { min: 5, max: 14, default: 8, step: 0.5, largeOver: 11, largeFee: 5000 },
    aspect: 1,
    placements: ["left-chest", "right-chest", "center-chest", "sleeve", "hem", "knee"],
    colors: [
      { id: "red", label: "레드", hex: "#d6423a" },
      { id: "navy", label: "네이비", hex: "#27396a" },
      { id: "yellow", label: "옐로", hex: "#f0c030" },
      { id: "black", label: "블랙", hex: "#222225" },
    ],
    ops: ["패치 재단과 오버로크", "위치 시침", "가장자리 박음질"],
  },
  {
    slug: "checker-patchwork",
    name: "체커 패치워크",
    type: "patch",
    typeLabel: "패치",
    summary: "체크무늬 원단을 덧대 낡은 부분을 살려요",
    basePrice: 35000,
    leadDays: 7,
    size: { min: 8, max: 16, default: 11, step: 0.5, largeOver: 13, largeFee: 5000 },
    aspect: 1,
    placements: ["knee", "hem", "sleeve", "left-chest"],
    colors: [
      { id: "black", label: "블랙·크림", hex: "#1f1f1f", hex2: "#efe6d2" },
      { id: "red", label: "레드·크림", hex: "#c8423b", hex2: "#f1e7d3" },
      { id: "green", label: "그린·크림", hex: "#2f6b4f", hex2: "#eee5d0" },
      { id: "blue", label: "블루·크림", hex: "#2b4c8c", hex2: "#efe7d6" },
    ],
    blocked: [
      { materials: ["knit", "poly", "leather"], reason: "데님·면처럼 탄탄한 원단에만 덧댈 수 있어요" },
    ],
    ops: ["패치 원단 재단", "가장자리 접어 시침", "상침 박음질"],
  },
  {
    slug: "rewear-print",
    name: "RE:WEAR 레터링",
    type: "print",
    typeLabel: "프린트",
    summary: "가슴에 빈티지 레터링을 프린트해요",
    basePrice: 30000,
    leadDays: 5,
    size: { min: 14, max: 28, default: 20, step: 1, largeOver: 24, largeFee: 5000 },
    aspect: 200 / 92,
    placements: ["center-chest"],
    colors: [
      { id: "black", label: "블랙", hex: "#1c1c1e" },
      { id: "white", label: "화이트", hex: "#f4f1ea" },
      { id: "red", label: "레드", hex: "#c73a32" },
      { id: "cream", label: "크림", hex: "#eadfc4" },
    ],
    blocked: [
      { materials: ["knit", "leather"], reason: "니트·가죽은 잉크가 고르게 먹지 않아요" },
      { categories: ["jacket"], reason: "자켓 앞판은 단추가 있어 가슴 프린트가 어려워요" },
      { categories: ["pants"], reason: "바지는 레터링 프린트를 받지 않아요" },
    ],
    ops: ["프린트 필름 출력", "위치 맞춰 열전사", "잉크 경화 후 세탁 테스트"],
  },
];

export const designBySlug = (slug: string) => DESIGNS.find((d) => d.slug === slug);

export function colorOf(design: Design, colorId: string) {
  return design.colors.find((c) => c.id === colorId) ?? design.colors[0];
}

export type Availability =
  | { ok: true; placements: PlacementId[] }
  | { ok: false; reason: string };

export function checkDesign(design: Design, garment: Garment): Availability {
  for (const rule of design.blocked ?? []) {
    if (garment.material && rule.materials?.includes(garment.material)) return { ok: false, reason: rule.reason };
    if (rule.categories?.includes(garment.category)) return { ok: false, reason: rule.reason };
  }
  const placements = design.placements.filter((p) => garment.anchors[p]);
  if (placements.length === 0) return { ok: false, reason: "이 옷에는 놓을 자리가 없어요" };
  return { ok: true, placements };
}

/** 대표 색이 옷 색과 충분히 구분되면 그대로 쓰고, 아니면 밝기 차이가 가장 큰 색을 고른다 */
export function defaultColorFor(design: Design, garment: Garment) {
  const fabric = luminance(garment.colorHex);
  let best = design.colors[0];
  if (Math.abs(luminance(best.hex) - fabric) >= 0.25) return best.id;
  for (const c of design.colors) {
    if (Math.abs(luminance(c.hex) - fabric) > Math.abs(luminance(best.hex) - fabric)) best = c;
  }
  return best.id;
}

export function defaultOptions(design: Design, garment: Garment, placements: PlacementId[]): MockupOptions {
  const placement = placements[0];
  return {
    placement,
    pos: garment.anchors[placement] ?? { x: 0.5, y: 0.45 },
    sizeCm: design.size.default,
    colorId: defaultColorFor(design, garment),
    text: design.text?.default ?? "",
  };
}

export const SHIPPING_FEE = 3500;

export function priceLines(design: Design, options: MockupOptions): PriceLine[] {
  const lines: PriceLine[] = [{ label: `${design.name} (${design.typeLabel})`, amount: design.basePrice }];
  if (options.sizeCm > design.size.largeOver) lines.push({ label: `큰 사이즈 (${design.size.largeOver}cm 초과)`, amount: design.size.largeFee });
  lines.push({ label: "반송 택배비", amount: SHIPPING_FEE });
  return lines;
}

export const sumLines = (lines: PriceLine[]) => lines.reduce((s, l) => s + l.amount, 0);

/** 프린트의 어두운 잉크는 원단 질감이 비치도록 곱하기 혼합으로 올린다 */
export function blendFor(design: Design, colorId: string): "multiply" | "normal" {
  if (design.type !== "print") return "normal";
  return luminance(colorOf(design, colorId).hex) < 0.6 ? "multiply" : "normal";
}
