// 검사용 쌍(학습에 넣지 않은 사진)으로 '학습 전 기본 모델'과 '학습한 LoRA'의 결과를 만들어 나란히 비교한다.
// lora.json이 없으면 학습 전 기본 모델만 돌린다(학습 없이 얼마나 되는지 먼저 볼 때).
//
//   node --env-file=.env.local scripts/lora/review.mjs <학습자료 폴더>
//
// 결과: <폴더>/review/index.html 을 브라우저로 열어 디자이너가 합격·불합격을 본다. 장당 약 $0.04~0.06.
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { bytes, dataUri, run } from "./fal.mjs";

const dir = process.argv[2] && resolve(process.argv[2]);
if (!dir || !existsSync(join(dir, "info.json"))) {
  console.error("사용법: node --env-file=.env.local scripts/lora/review.mjs <prepare.mjs가 만든 폴더>");
  process.exit(1);
}
const info = JSON.parse(await readFile(join(dir, "info.json"), "utf8"));
const lora = existsSync(join(dir, "lora.json")) ? JSON.parse(await readFile(join(dir, "lora.json"), "utf8")) : null;
const testDir = join(dir, "test");
const ids = existsSync(testDir)
  ? (await readdir(testDir)).filter((f) => f.endsWith("_start.jpg")).map((f) => f.slice(0, -"_start.jpg".length))
  : [];
if (!ids.length) {
  console.error("검사용 쌍(test 폴더)이 없어요. prepare.mjs를 --test 3 이상으로 다시 실행하세요.");
  process.exit(1);
}
const outDir = join(dir, "review");
await mkdir(outDir, { recursive: true });

const SEED = 7; // 같은 씨앗으로 학습 전·후를 공정하게 비교한다
async function edit(id, withLora) {
  const start2 = join(testDir, `${id}_start2.png`);
  const image_urls = [await dataUri(join(testDir, `${id}_start.jpg`)), ...(existsSync(start2) ? [await dataUri(start2)] : [])];
  const out = await run(
    "fal-ai/flux-2/lora/edit",
    { prompt: info.caption, image_urls, loras: withLora ? [{ path: lora.url, scale: 1 }] : [], seed: SEED, output_format: "jpeg", sync_mode: true },
    { every: 3000 },
  );
  const name = `${id}_${withLora ? "lora" : "base"}.jpg`;
  await writeFile(join(outDir, name), await bytes(out.images[0].url));
  return name;
}

const rows = [];
for (const id of ids) {
  const from = existsSync(join(testDir, `${id}.from`)) ? await readFile(join(testDir, `${id}.from`), "utf8") : id;
  console.log(`${from}번 쌍 만드는 중…`);
  const [base, tuned] = await Promise.all([edit(id, false), lora ? edit(id, true) : null]);
  rows.push({ id, from, base, tuned });
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const cell = (src, label) => `<figure><img src="${src}" alt="${label}"><figcaption>${label}</figcaption></figure>`;
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${info.trigger} 결과 비교</title>
<style>body{font:15px/1.5 -apple-system,'Apple SD Gothic Neo',sans-serif;margin:24px;color:#17171b;background:#faf7f2}
.row{display:grid;grid-template-columns:repeat(${lora ? 4 : 3},1fr);gap:12px;margin:0 0 28px}figure{margin:0}
img{width:100%;border-radius:10px;background:#eee}figcaption{font-size:13px;color:#666;margin-top:4px}h2{font-size:16px;margin:0 0 8px}</style>
<h1>${info.trigger} 결과 비교</h1>
<p>학습에 넣지 않은 사진 ${rows.length}쌍이에요. 각 줄에서 AI 결과가 실제 작업물(맨 오른쪽)과 얼마나 같은지 봐 주세요.<br>
지시문: ${esc(info.caption)}${lora ? `<br>LoRA: ${lora.steps}스텝, ${lora.trainedAt.slice(0, 10)}` : "<br>아직 학습 전이라 기본 모델 결과만 있어요."}</p>
${rows
  .map(
    (r) =>
      `<h2>${esc(r.from)}번</h2><div class="row">${cell(`../test/${r.id}_start.jpg`, "리폼 전")}${cell(r.base, "AI · 학습 전 기본 모델")}${
        r.tuned ? cell(r.tuned, "AI · 우리 디자인 학습 후") : ""
      }${cell(`../test/${r.id}_end.jpg`, "실제 작업물")}</div>`,
  )
  .join("\n")}`;
await writeFile(join(outDir, "index.html"), html);
console.log(`비교 화면: ${join(outDir, "index.html")}`);
