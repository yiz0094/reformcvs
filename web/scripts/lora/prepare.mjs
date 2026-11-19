// 대표님이 보낸 리폼 전·후 사진을 fal 학습 형식으로 정리한다. 키가 필요 없다.
//
//   node scripts/lora/prepare.mjs <사진 폴더> --trigger RFM_WAPPEN --task "sew the wappen from the reference onto the left chest"
//
// 사진 폴더의 이름 규칙: 01_전.jpg, 01_후.jpg, (있으면) 01_도안.png. 번호가 같은 것끼리 한 쌍이다. heic도 된다.
// 결과는 옆 폴더 '<사진 폴더>-<trigger>'에 생긴다.
//   train/     학습에 쓰는 쌍: 001_start.jpg(전) 001_start2.png(도안) 001_end.jpg(후) 001.txt(지시문)
//   test/      학습에 넣지 않고 결과 검사에만 쓰는 쌍(기본 20%, 최대 10쌍)
//   train.zip  fal에 올리는 묶음
//   info.json  트리거·지시문·쌍 수
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import sharp from "sharp";

const { values: opt, positionals } = parseArgs({
  allowPositionals: true,
  options: { trigger: { type: "string" }, task: { type: "string" }, test: { type: "string" } },
});
const src = positionals[0] && resolve(positionals[0]);
if (!src || !opt.trigger || !opt.task || !/^[A-Z][A-Z0-9_]{3,}$/.test(opt.trigger)) {
  console.error('사용법: node scripts/lora/prepare.mjs <사진 폴더> --trigger RFM_이름(영문 대문자) --task "무엇을 바꾸는지(영어)" [--test 쌍 수]');
  process.exit(1);
}
const out = `${src}-${opt.trigger}`;
if (existsSync(join(out, "lora.json"))) {
  console.error(`${out}는 이미 학습한 폴더예요. 학습 기록(lora.json)을 지키려고 멈춰요. 다른 --trigger를 쓰세요.`);
  process.exit(1);
}

// 맥에서 온 한글 파일 이름은 자모가 나뉘어 있을 수 있어 NFC로 맞춘다
const KIND = { 전: "start", 후: "end", 도안: "start2" };
const pairs = new Map();
const skipped = [];
for (const name of (await readdir(src)).sort()) {
  const m = name.normalize("NFC").match(/^(.+?)[_\- ](전|후|도안)\.(jpe?g|png|webp|heic|heif)$/i);
  if (!m) {
    if (!name.startsWith(".")) skipped.push(name);
    continue;
  }
  const pair = pairs.get(m[1]) ?? {};
  pair[KIND[m[2]]] = join(src, name);
  pairs.set(m[1], pair);
}
const ready = [...pairs].filter(([, p]) => p.start && p.end);
for (const [id, p] of pairs) if (!p.start || !p.end) skipped.push(`${id}: ${p.start ? "후" : "전"} 사진이 없어요`);
if (!ready.length) {
  console.error("전·후가 모두 있는 쌍이 없어요. 파일 이름이 01_전.jpg, 01_후.jpg 같은지 봐 주세요.");
  process.exit(1);
}

// 검사용 쌍은 앞쪽에 몰리지 않게 고르게 뽑는다
const testCount = Math.min(ready.length - 1, opt.test ? Number(opt.test) || 0 :Math.min(10, Math.round(ready.length * 0.2)));
const testIdx = new Set(Array.from({ length: testCount }, (_, i) => Math.floor(((i + 0.5) * ready.length) / testCount)));

const caption = `Apply the ${opt.trigger} reform: ${opt.task.replace(/[.\s]+$/, "")}. Keep everything else unchanged and preserve the original fabric color, texture, logo, fit and background.`;
const tmp = await mkdtemp(join(tmpdir(), "lora-"));
const small = [];

/** 방향을 바로잡고 긴 변 1536px 이하로 줄여 저장한다. 사진 정보(EXIF·위치)는 지운다. 짧은 변 길이를 돌려준다 */
async function save(file, to, png) {
  let input = file;
  if (/\.(heic|heif)$/i.test(file)) {
    input = join(tmp, `${basename(file)}.jpg`);
    execFileSync("sips", ["-s", "format", "jpeg", file, "--out", input], { stdio: "ignore" });
  }
  const img = sharp(input).rotate().resize(1536, 1536, { fit: "inside", withoutEnlargement: true });
  const info = await (png ? img.png() : img.jpeg({ quality: 92 })).toFile(to);
  return Math.min(info.width, info.height);
}

await rm(join(out, "train"), { recursive: true, force: true });
await rm(join(out, "test"), { recursive: true, force: true });
await rm(join(out, "train.zip"), { force: true });
let maxImages = 1;
for (const [i, [id, p]] of ready.entries()) {
  const dir = join(out, testIdx.has(i) ? "test" : "train");
  await mkdir(dir, { recursive: true });
  const n = String(i + 1).padStart(3, "0");
  for (const [kind, file] of Object.entries(p)) {
    const short = await save(file, join(dir, `${n}_${kind}.${kind === "start2" ? "png" : "jpg"}`), kind === "start2");
    if (kind !== "start2" && short < 1024) small.push(`${id}_${kind === "start" ? "전" : "후"} (${short}px)`);
  }
  if (p.start2) maxImages = 2;
  await writeFile(join(dir, `${n}.txt`), caption);
  await writeFile(join(dir, `${n}.from`), id); // 원래 번호(대표님 파일 이름) 기록
}
await rm(tmp, { recursive: true, force: true });

const trainDir = join(out, "train");
const files = (await readdir(trainDir)).filter((f) => !f.endsWith(".from")).map((f) => join(trainDir, f));
execFileSync("zip", ["-j", "-q", join(out, "train.zip"), ...files]);
const trainCount = ready.length - testCount;
await writeFile(
  join(out, "info.json"),
  JSON.stringify({ trigger: opt.trigger, task: opt.task, caption, train: trainCount, test: testCount, maxImages, madeAt: new Date().toISOString() }, null, 2),
);

console.log(`학습 ${trainCount}쌍, 검사 ${testCount}쌍 → ${out}`);
console.log(`지시문: ${caption}`);
if (trainCount < 15) console.log(`주의: 학습 쌍이 ${trainCount}개예요. fal은 15~50쌍을 권해요.`);
if (small.length) console.log(`주의: 짧은 변이 1024px보다 작은 사진 ${small.length}장: ${small.join(", ")}`);
if (skipped.length) console.log(`건너뛴 파일: ${skipped.join(", ")}`);
