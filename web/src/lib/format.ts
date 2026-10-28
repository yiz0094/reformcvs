export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export const timeLabel = (ts: number) =>
  new Date(ts).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const newId = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;

export const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

/** 0(어두움)–1(밝음) 사이의 상대 밝기 */
export function luminance(hex: string) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** amount가 음수면 어둡게, 양수면 밝게 */
export function shade(hex: string, amount: number) {
  const h = hex.replace("#", "");
  const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const out = ch.map((c) =>
    Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount),
  );
  return `#${out.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0")).join("")}`;
}

/** 이벤트 처리에서 쓰는 현재 시각. 렌더 중에는 부르지 않는다. */
export const nowMs = () => Date.now();
