// prepare.mjs 검사: 가짜 사진 폴더를 만들어 돌리고 결과 이름·쌍·지시문·묶음을 본다. node scripts/lora/prepare.check.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

const root = await mkdtemp(join(tmpdir(), "prepare-check-"));
try {
  const src = join(root, "사진");
  await mkdir(src);
  const photo = (w, h) => sharp({ create: { width: w, height: h, channels: 3, background: "#7a8" } }).jpeg().toBuffer();
  // 맥에서 온 이름처럼 자모가 나뉜(NFD) 파일 이름도 섞는다
  for (let i = 1; i <= 10; i++) {
    const n = String(i).padStart(2, "0");
    await writeFile(join(src, `${n}_전.jpg`.normalize(i % 2 ? "NFD" : "NFC")), await photo(3000, 4000));
    await writeFile(join(src, `${n}_후.jpg`), await photo(3000, 4000));
  }
  await writeFile(join(src, "03_도안.png"), await sharp({ create: { width: 400, height: 400, channels: 4, background: "#0000" } }).png().toBuffer());
  await writeFile(join(src, "11_전.jpg"), await photo(800, 600)); // 짝 없음
  await writeFile(join(src, "메모.txt"), "x");

  const log = execFileSync(process.execPath, [join(import.meta.dirname, "prepare.mjs"), src, "--trigger", "RFM_TEST", "--task", "sew the patch."], { encoding: "utf8" });
  const out = `${src}-RFM_TEST`;
  const info = JSON.parse(await readFile(join(out, "info.json"), "utf8"));
  assert.deepEqual([info.train, info.test, info.maxImages], [8, 2, 2], "10쌍 중 2쌍을 검사용으로 빼고, 도안이 있으면 입력이 2장");
  assert.equal(info.caption, "Apply the RFM_TEST reform: sew the patch. Keep everything else unchanged and preserve the original fabric color, texture, logo, fit and background.");
  const test = (await readdir(join(out, "test"))).sort();
  assert.deepEqual(test, ["003.from", "003.txt", "003_end.jpg", "003_start.jpg", "003_start2.png", "008.from", "008.txt", "008_end.jpg", "008_start.jpg"], "검사용 쌍은 고르게 뽑는다");
  const zipped = execFileSync("unzip", ["-Z1", join(out, "train.zip")], { encoding: "utf8" }).trim().split("\n").sort();
  assert.equal(zipped.length, 8 * 3, "학습 묶음에는 8쌍의 전·후·지시문만 들어간다");
  assert.ok(zipped.every((f) => /^\d{3}(_start|_end)?\.(jpg|txt)$/.test(f)), "fal 이름 규칙");
  const meta = await sharp(join(out, "train", "001_start.jpg")).metadata();
  assert.deepEqual([meta.width, meta.height, meta.exif], [1152, 1536, undefined], "긴 변 1536px로 줄이고 사진 정보는 지운다");
  assert.match(log, /11: 후 사진이 없어요/);
  assert.match(log, /메모\.txt/);
  assert.match(log, /15~50쌍/, "쌍이 적으면 알려 준다");
  console.log("prepare.mjs 검사 통과");
} finally {
  await rm(root, { recursive: true, force: true });
}
