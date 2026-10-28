import type { OrderStatus } from "./types";

export const ORDER_STEPS: { status: OrderStatus; label: string; desc: string }[] = [
  { status: "AWAITING_SHIPMENT", label: "옷 보내기", desc: "편의점 택배로 작업실에 보내 주세요" },
  { status: "INBOUND_TRANSIT", label: "작업실로 가는 중", desc: "도착하면 알림톡으로 알려 드려요" },
  { status: "INSPECTING", label: "입고·검수", desc: "원단 상태와 치수를 확인해요" },
  { status: "AWAITING_APPROVAL", label: "확정 시안 승인", desc: "실물 위 시안을 보고 승인해 주세요" },
  { status: "IN_PROGRESS", label: "리폼 작업", desc: "작업자가 직접 작업해요" },
  { status: "OUTBOUND_TRANSIT", label: "돌려보내는 중", desc: "송장 번호를 알림톡으로 보내 드려요" },
  { status: "DELIVERED", label: "받으셨어요", desc: "시안과 얼마나 같은지 알려 주세요" },
];

export const STATUS_LABEL: Record<OrderStatus, string> = Object.fromEntries(
  ORDER_STEPS.map((s) => [s.status, s.label]),
) as Record<OrderStatus, string>;

export const stepIndex = (status: OrderStatus) => ORDER_STEPS.findIndex((s) => s.status === status);

export const nextStatus = (status: OrderStatus): OrderStatus | null => ORDER_STEPS[stepIndex(status) + 1]?.status ?? null;

export const CARRIERS = ["GS25 반값택배", "CU 알뜰택배", "CJ대한통운", "우체국택배", "롯데택배", "한진택배"];

/** 고객이 옷을 보낼 작업실 주소(예시) */
export const WORKSHOP_ADDRESS = "서울시 성동구 성수이로 00, 리폼 편의점 작업실 (예시 주소)";

export const maskName = (name: string) =>
  name.length <= 1 ? name : name.length === 2 ? `${name[0]}*` : `${name[0]}${"*".repeat(name.length - 2)}${name[name.length - 1]}`;
