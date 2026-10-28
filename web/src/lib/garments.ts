import type { Category, Garment, Material, PlacementId, Point } from "./types";

export const CATEGORY_LABEL: Record<Category, string> = {
  jacket: "자켓",
  shirt: "셔츠",
  tshirt: "티셔츠",
  hoodie: "후드·맨투맨",
  pants: "바지",
};

export const MATERIAL_LABEL: Record<Material, string> = {
  denim: "데님",
  cotton: "면",
  knit: "니트",
  poly: "폴리·나일론",
  leather: "가죽",
};

export const PLACEMENT_LABEL: Record<PlacementId, string> = {
  "left-chest": "왼쪽 가슴",
  "right-chest": "오른쪽 가슴",
  "center-chest": "가슴 가운데",
  sleeve: "소매",
  hem: "밑단",
  thigh: "허벅지",
  knee: "무릎",
};

type SampleGarment = Omit<Garment, "id" | "source" | "analyzed" | "createdAt">;

/** 사내 샘플 의류. 위치 기준점은 사진 크기 대비 비율(0–1)이다. */
export const SAMPLE_GARMENTS: SampleGarment[] = [
  {
    sampleId: "denim-jacket",
    name: "데님 자켓",
    image: "/samples/denim-jacket.svg",
    width: 600,
    height: 800,
    category: "jacket",
    colorName: "인디고",
    colorHex: "#3e5f8a",
    material: "denim",
    pctPerCm: 0.74,
    anchors: {
      "left-chest": { x: 0.617, y: 0.412 },
      "right-chest": { x: 0.383, y: 0.412 },
      sleeve: { x: 0.762, y: 0.4 },
      hem: { x: 0.62, y: 0.745 },
    },
  },
  {
    sampleId: "white-tee",
    name: "화이트 티셔츠",
    image: "/samples/white-tee.svg",
    width: 600,
    height: 800,
    category: "tshirt",
    colorName: "화이트",
    colorHex: "#f4f3ef",
    material: "cotton",
    pctPerCm: 0.72,
    anchors: {
      "left-chest": { x: 0.6, y: 0.33 },
      "right-chest": { x: 0.4, y: 0.33 },
      "center-chest": { x: 0.5, y: 0.43 },
      sleeve: { x: 0.778, y: 0.342 },
      hem: { x: 0.6, y: 0.8 },
    },
  },
  {
    sampleId: "gray-hoodie",
    name: "그레이 후드티",
    image: "/samples/gray-hoodie.svg",
    width: 600,
    height: 800,
    category: "hoodie",
    colorName: "그레이",
    colorHex: "#a8aaad",
    material: "cotton",
    pctPerCm: 0.7,
    anchors: {
      "left-chest": { x: 0.6, y: 0.355 },
      "right-chest": { x: 0.4, y: 0.355 },
      "center-chest": { x: 0.5, y: 0.53 },
      sleeve: { x: 0.755, y: 0.43 },
      hem: { x: 0.62, y: 0.75 },
    },
  },
];

const TOP_ANCHORS: Partial<Record<PlacementId, Point>> = {
  "left-chest": { x: 0.62, y: 0.36 },
  "right-chest": { x: 0.38, y: 0.36 },
  "center-chest": { x: 0.5, y: 0.44 },
  sleeve: { x: 0.84, y: 0.45 },
  hem: { x: 0.64, y: 0.8 },
};

const PANTS_ANCHORS: Partial<Record<PlacementId, Point>> = {
  thigh: { x: 0.36, y: 0.36 },
  knee: { x: 0.66, y: 0.6 },
  hem: { x: 0.34, y: 0.9 },
};

/** 업로드 사진은 옷이 화면을 꽉 채운다고 보고 일반 기준점을 쓴다. */
export function genericAnchors(category: Category) {
  return category === "pants" ? PANTS_ANCHORS : TOP_ANCHORS;
}

export const genericPctPerCm = (category: Category) => (category === "pants" ? 1.5 : 1.15);

export const COLOR_PALETTE: { name: string; hex: string }[] = [
  { name: "블랙", hex: "#1f1f21" },
  { name: "차콜", hex: "#3d3e42" },
  { name: "그레이", hex: "#9c9da1" },
  { name: "화이트", hex: "#f3f2ee" },
  { name: "아이보리", hex: "#ede6d6" },
  { name: "베이지", hex: "#d6c2a0" },
  { name: "브라운", hex: "#6f4c33" },
  { name: "카키", hex: "#6e6c46" },
  { name: "네이비", hex: "#1f2a44" },
  { name: "인디고", hex: "#3e5f8a" },
  { name: "블루", hex: "#3a6fd8" },
  { name: "스카이", hex: "#8ec3eb" },
  { name: "레드", hex: "#c0392b" },
  { name: "버건디", hex: "#6d1f2a" },
  { name: "핑크", hex: "#f2a2b8" },
  { name: "오렌지", hex: "#e67e22" },
  { name: "옐로", hex: "#f2c94c" },
  { name: "그린", hex: "#2e8b57" },
  { name: "민트", hex: "#98d8c8" },
  { name: "퍼플", hex: "#6c4fa3" },
];

export function nearestColor(r: number, g: number, b: number) {
  let best = COLOR_PALETTE[0];
  let bestD = Infinity;
  for (const c of COLOR_PALETTE) {
    const h = c.hex.slice(1);
    const cr = parseInt(h.slice(0, 2), 16);
    const cg = parseInt(h.slice(2, 4), 16);
    const cb = parseInt(h.slice(4, 6), 16);
    const rm = (r + cr) / 2;
    // 사람 눈의 색 차이에 가깝게 보정한 거리
    const d = (2 + rm / 256) * (r - cr) ** 2 + 4 * (g - cg) ** 2 + (2 + (255 - rm) / 256) * (b - cb) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}
