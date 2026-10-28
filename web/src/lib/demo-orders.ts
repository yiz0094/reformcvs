import { SAMPLE_GARMENTS } from "./garments";
import type { MockupOptions, OrderStatus } from "./types";

/** 운영 콘솔 시안에 미리 채워 두는 예시 주문. 실제 고객 데이터가 아니다. */
export interface SeedOrder {
  key: string;
  orderNo: string;
  customer: string;
  sampleId: string;
  designSlug: string;
  options: MockupOptions;
  status: OrderStatus;
  age: string;
  due: string;
  total: number;
}

const anchor = (sampleId: string, p: keyof (typeof SAMPLE_GARMENTS)[number]["anchors"]) =>
  SAMPLE_GARMENTS.find((s) => s.sampleId === sampleId)?.anchors[p] ?? { x: 0.5, y: 0.5 };

export const SEED_ORDERS: SeedOrder[] = [
  {
    key: "seed-1",
    orderNo: "R2610210019",
    customer: "최*빈",
    sampleId: "white-tee",
    designSlug: "initial-embroidery",
    options: { placement: "left-chest", pos: anchor("white-tee", "left-chest"), sizeCm: 7, colorId: "navy", text: "JH" },
    status: "AWAITING_SHIPMENT",
    age: "1일 전",
    due: "D-7",
    total: 28500,
  },
  {
    key: "seed-2",
    orderNo: "R2610210008",
    customer: "정*호",
    sampleId: "denim-jacket",
    designSlug: "smile-wappen",
    options: { placement: "sleeve", pos: anchor("denim-jacket", "sleeve"), sizeCm: 7, colorId: "yellow", text: "" },
    status: "INBOUND_TRANSIT",
    age: "1일 전",
    due: "D-6",
    total: 33500,
  },
  {
    key: "seed-3",
    orderNo: "R2610200044",
    customer: "이*아",
    sampleId: "gray-hoodie",
    designSlug: "rewear-print",
    options: { placement: "center-chest", pos: anchor("gray-hoodie", "center-chest"), sizeCm: 20, colorId: "black", text: "" },
    status: "INSPECTING",
    age: "2일 전",
    due: "D-5",
    total: 33500,
  },
  {
    key: "seed-4",
    orderNo: "R2610200031",
    customer: "박*준",
    sampleId: "denim-jacket",
    designSlug: "star-patch",
    options: { placement: "left-chest", pos: anchor("denim-jacket", "left-chest"), sizeCm: 8, colorId: "red", text: "" },
    status: "AWAITING_APPROVAL",
    age: "2일 전",
    due: "D-4",
    total: 33500,
  },
  {
    key: "seed-5",
    orderNo: "R2610190012",
    customer: "김*연",
    sampleId: "white-tee",
    designSlug: "daisy-embroidery",
    options: { placement: "left-chest", pos: anchor("white-tee", "left-chest"), sizeCm: 6, colorId: "butter", text: "" },
    status: "IN_PROGRESS",
    age: "3일 전",
    due: "D-2",
    total: 28500,
  },
  {
    key: "seed-6",
    orderNo: "R2610180027",
    customer: "한*솔",
    sampleId: "gray-hoodie",
    designSlug: "checker-patchwork",
    options: { placement: "hem", pos: anchor("gray-hoodie", "hem"), sizeCm: 11, colorId: "black", text: "" },
    status: "OUTBOUND_TRANSIT",
    age: "4일 전",
    due: "배송 중",
    total: 38500,
  },
  {
    key: "seed-7",
    orderNo: "R2610170003",
    customer: "윤*서",
    sampleId: "white-tee",
    designSlug: "star-patch",
    options: { placement: "sleeve", pos: anchor("white-tee", "sleeve"), sizeCm: 7, colorId: "navy", text: "" },
    status: "DELIVERED",
    age: "5일 전",
    due: "완료",
    total: 33500,
  },
];
