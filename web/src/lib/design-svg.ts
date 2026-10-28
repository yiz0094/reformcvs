import { colorOf, designBySlug } from "./designs";
import { luminance, shade } from "./format";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

const shadow = (id: string, dy: number, blur: number, op: number) =>
  `<filter id="${id}" x="-25%" y="-25%" width="150%" height="150%"><feDropShadow dx="0" dy="${dy}" stdDeviation="${blur}" flood-color="#000" flood-opacity="${op}"/></filter>`;

/** 실 결을 흉내 내는 가는 선 무늬. 요소의 transform을 따라 같이 돈다. */
const thread = (id: string, gap: number, op: number, width: number, angle = 0) =>
  `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><path d="M0 0V${gap}" stroke="#000" stroke-opacity="${op}" stroke-width="${width}"/></pattern>`;

const starPoints = (cx: number, cy: number, R: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? R : r;
    return `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`;
  }).join(" ");

function daisy(c: string, u: string): [string, string] {
  const edge = shade(c, -0.22);
  const core = c.toLowerCase() === "#f5d36b" ? "#d9772b" : "#f2a93b";
  const angles = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324];
  const petal = (a: number, fill: string, extra = "") =>
    `<ellipse cx="50" cy="27.5" rx="8.6" ry="18.5" transform="rotate(${a} 50 50)" fill="${fill}" ${extra}/>`;
  const knots = [
    [46, 47],
    [53, 45.5],
    [55.5, 52],
    [48, 54.5],
    [50.5, 50],
    [44.5, 51.5],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.35" fill="${shade(core, -0.32)}"/>`)
    .join("");
  return [
    "0 0 100 100",
    `<defs>${shadow(`s${u}`, 0.9, 0.9, 0.38)}${thread(`t${u}`, 2, 0.18, 0.7)}${thread(`k${u}`, 1.6, 0.25, 0.6, 45)}</defs>
    <g filter="url(#s${u})">
      ${angles.map((a) => petal(a, c, `stroke="${edge}" stroke-width="0.9"`)).join("")}
      ${angles.map((a) => petal(a, `url(#t${u})`)).join("")}
      <circle cx="50" cy="50" r="12.5" fill="${core}" stroke="${shade(core, -0.25)}" stroke-width="0.9"/>
      <circle cx="50" cy="50" r="12.5" fill="url(#k${u})"/>
      ${knots}
    </g>`,
  ];
}

function initials(c: string, text: string, u: string): [string, string] {
  const t = esc((text || "RE").slice(0, 3));
  const edge = luminance(c) > 0.6 ? shade(c, -0.38) : shade(c, -0.32);
  return [
    "0 0 160 80",
    `<defs>${shadow(`s${u}`, 0.9, 0.8, 0.35)}${thread(`t${u}`, 1.8, 0.22, 0.6, 25)}</defs>
    <g filter="url(#s${u})" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-weight="700" font-size="60" text-anchor="middle">
      <text x="80" y="60" fill="${c}" stroke="${edge}" stroke-width="1.6" paint-order="stroke" stroke-linejoin="round">${t}</text>
      <text x="80" y="60" fill="url(#t${u})">${t}</text>
    </g>`,
  ];
}

function smile(c: string, u: string): [string, string] {
  const rim = shade(c, -0.2);
  return [
    "0 0 100 100",
    `<defs>${shadow(`s${u}`, 1.5, 1.3, 0.42)}${thread(`t${u}`, 1.6, 0.1, 0.6, 45)}</defs>
    <g filter="url(#s${u})">
      <circle cx="50" cy="50" r="46.5" fill="${rim}"/>
      <circle cx="50" cy="50" r="45" fill="none" stroke="${shade(rim, -0.2)}" stroke-width="3" stroke-dasharray="0.8 0.9"/>
      <circle cx="50" cy="50" r="41" fill="${c}"/>
      <circle cx="50" cy="50" r="41" fill="url(#t${u})"/>
      <ellipse cx="37" cy="40" rx="4.6" ry="7.4" fill="#1d1d1f"/>
      <ellipse cx="63" cy="40" rx="4.6" ry="7.4" fill="#1d1d1f"/>
      <path d="M29 57 Q50 79 71 57" fill="none" stroke="#1d1d1f" stroke-width="5" stroke-linecap="round"/>
    </g>`,
  ];
}

function starPatch(c: string, u: string): [string, string] {
  const rim = shade(c, -0.25);
  return [
    "0 0 100 100",
    `<defs>${shadow(`s${u}`, 1.3, 1.2, 0.4)}${thread(`t${u}`, 1.5, 0.12, 0.6, 45)}</defs>
    <g filter="url(#s${u})" stroke-linejoin="round">
      <polygon points="${starPoints(50, 53, 46, 20)}" fill="${rim}" stroke="${rim}" stroke-width="2"/>
      <polygon points="${starPoints(50, 53, 42.5, 18.6)}" fill="${c}"/>
      <polygon points="${starPoints(50, 53, 42.5, 18.6)}" fill="url(#t${u})"/>
      <polygon points="${starPoints(50, 53, 37, 16.2)}" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="0.9" stroke-dasharray="1.8 1.6"/>
    </g>`,
  ];
}

function checker(c1: string, c2: string, u: string): [string, string] {
  const n = 6;
  const s = 84 / n;
  let squares = "";
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      if ((i + j) % 2 === 0)
        squares += `<rect x="${(8 + i * s).toFixed(2)}" y="${(8 + j * s).toFixed(2)}" width="${s.toFixed(2)}" height="${s.toFixed(2)}" fill="${c1}"/>`;
  const stitch = luminance(c1) < 0.3 ? "#f1e9d8" : "#2b2b2b";
  return [
    "0 0 100 100",
    `<defs>${shadow(`s${u}`, 0.8, 0.8, 0.32)}<clipPath id="c${u}"><rect x="8" y="8" width="84" height="84" rx="4"/></clipPath>${thread(`t${u}`, 1.4, 0.08, 0.5, 30)}</defs>
    <g filter="url(#s${u})">
      <rect x="8" y="8" width="84" height="84" rx="4" fill="${c2}"/>
      <g clip-path="url(#c${u})">${squares}<rect x="8" y="8" width="84" height="84" fill="url(#t${u})"/></g>
      <rect x="12" y="12" width="76" height="76" rx="2.5" fill="none" stroke="${stitch}" stroke-opacity="0.8" stroke-width="1.1" stroke-dasharray="3 2.2"/>
    </g>`,
  ];
}

function rewear(c: string, u: string): [string, string] {
  return [
    "0 0 200 92",
    `<defs><filter id="i${u}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -5 0 0 0 3.9" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter></defs>
    <g filter="url(#i${u})" fill="${c}" text-anchor="middle" opacity="0.95">
      <text x="100" y="54" font-family="'Arial Black', 'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="46" textLength="186" lengthAdjust="spacingAndGlyphs">RE:WEAR</text>
      <rect x="22" y="64" width="156" height="2.4"/>
      <text x="100" y="84" font-family="'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif" font-weight="700" font-size="13" letter-spacing="5">다시 입는 옷</text>
    </g>`,
  ];
}

/**
 * 디자인 한 개를 SVG 문자열로 만든다. 화면 미리보기와 캔버스 합성이 같은 그림을 쓴다.
 * uid는 한 문서 안에서 필터·무늬 id가 겹치지 않게 하는 접미사다.
 */
export function designSvg(slug: string, colorId: string, text: string, uid: string, px?: { w: number; h: number }) {
  const design = designBySlug(slug);
  if (!design) return "";
  const color = colorOf(design, colorId);
  const u = uid.replace(/[^a-zA-Z0-9_-]/g, "");
  let art: [string, string];
  switch (slug) {
    case "daisy-embroidery":
      art = daisy(color.hex, u);
      break;
    case "initial-embroidery":
      art = initials(color.hex, text, u);
      break;
    case "smile-wappen":
      art = smile(color.hex, u);
      break;
    case "star-patch":
      art = starPatch(color.hex, u);
      break;
    case "checker-patchwork":
      art = checker(color.hex, color.hex2 ?? "#efe6d2", u);
      break;
    default:
      art = rewear(color.hex, u);
  }
  const dims = px ? `width="${Math.round(px.w)}" height="${Math.round(px.h)}"` : `width="100%" height="100%"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${art[0]}" ${dims} preserveAspectRatio="xMidYMid meet" style="display:block;overflow:visible">${art[1]}</svg>`;
}
