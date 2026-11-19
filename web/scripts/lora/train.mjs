// prepare.mjs가 만든 폴더로 fal에서 LoRA를 학습한다. 돈이 든다(시작 전에 예상 금액을 보여 준다).
//
//   node --env-file=.env.local scripts/lora/train.mjs <학습자료 폴더> [--steps 1000]
//
// 끝나면 폴더에 lora.json(LoRA 주소·지시문·비용)을 남기고, Vercel에 넣을 AI_LORAS 값을 보여 준다.
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { run, upload } from "./fal.mjs";

const ENDPOINT = "fal-ai/flux-2-trainer-v2/edit";
// fal 가격표(2026-11): 0.0056 × 스텝 × 배수. 배수는 쌍마다 들어가는 입력 사진 수(전 + 도안)로 정해진다
const MULTIPLIER = { 1: 2.11, 2: 3.44, 3: 5.09, 4: 6.95 };

const { values: opt, positionals } = parseArgs({ allowPositionals: true, options: { steps: { type: "string", default: "1000" } } });
const dir = positionals[0] && resolve(positionals[0]);
const steps = Number(opt.steps);
if (!dir || !existsSync(join(dir, "info.json")) || !(steps >= 100 && steps <= 20000 && steps % 100 === 0)) {
  console.error("사용법: node --env-file=.env.local scripts/lora/train.mjs <prepare.mjs가 만든 폴더> [--steps 100~20000, 100 단위]");
  process.exit(1);
}
if (existsSync(join(dir, "lora.json"))) {
  console.error("이미 학습한 폴더예요(lora.json). 다시 하려면 lora.json을 다른 이름으로 옮긴 뒤 실행하세요.");
  process.exit(1);
}
const info = JSON.parse(await readFile(join(dir, "info.json"), "utf8"));
const cost = 0.0056 * steps * MULTIPLIER[info.maxImages];
console.log(`${info.trigger}: 학습 ${info.train}쌍, ${steps}스텝, 예상 비용 약 $${cost.toFixed(2)} (실제 청구는 fal 화면 기준)`);

const zip = await upload(join(dir, "train.zip"), "application/zip");
console.log("학습 자료를 올렸어요. 학습을 시작해요(수십 분 걸려요).");
let last = "";
const result = await run(
  ENDPOINT,
  { image_data_url: zip, steps, default_caption: info.caption },
  {
    every: 15000,
    onStatus: (status, s) => {
      const line = status === "IN_QUEUE" ? `대기 중 (앞에 ${s.queue_position ?? "?"}개)` : status;
      if (line !== last) console.log(`${new Date().toLocaleTimeString("ko-KR")} ${(last = line)}`);
    },
  },
);

const lora = {
  trigger: info.trigger,
  prompt: info.caption,
  url: result.diffusers_lora_file.url,
  config: result.config_file.url,
  endpoint: ENDPOINT,
  steps,
  cost: Number(cost.toFixed(2)),
  trainedAt: new Date().toISOString(),
};
await writeFile(join(dir, "lora.json"), JSON.stringify(lora, null, 2));
console.log(`학습이 끝났어요 → ${join(dir, "lora.json")}`);
console.log(`다음: node --env-file=.env.local scripts/lora/review.mjs ${positionals[0]}`);
console.log("서비스에 붙일 때 AI_LORAS에 넣을 값(디자인 종류 또는 slug를 키로):");
console.log(JSON.stringify({ "<디자인 종류>": { url: lora.url, prompt: lora.prompt } }));
