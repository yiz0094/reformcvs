// fal.ai를 부르는 최소 도구. 키는 FAL_KEY 환경 변수(web/.env.local)에서만 읽는다.
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

const key = () => {
  const k = process.env.FAL_KEY;
  if (!k) throw new Error("FAL_KEY가 없어요. web/.env.local에 FAL_KEY=... 를 넣고 `node --env-file=.env.local ...`로 실행해 주세요.");
  return k;
};

async function call(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { authorization: `Key ${key()}`, "content-type": "application/json", ...init.headers } });
  const text = await res.text();
  if (!res.ok) throw new Error(`fal ${res.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

/** 파일을 fal 저장소에 올리고 주소를 돌려준다. 학습용 사진이라 7일 뒤 지워지게 한다. */
export async function upload(path, contentType) {
  const { upload_url, file_url } = await call("https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3", {
    method: "POST",
    headers: { "X-Fal-Object-Lifecycle": JSON.stringify({ expiration_duration_seconds: 7 * 24 * 3600 }) },
    body: JSON.stringify({ content_type: contentType, file_name: basename(path) }),
  });
  const put = await fetch(upload_url, { method: "PUT", headers: { "content-type": contentType }, body: await readFile(path) });
  if (!put.ok) throw new Error(`fal 업로드 실패 ${put.status}`);
  return file_url;
}

/** 대기열에 작업을 넣고 끝날 때까지 기다려 결과를 돌려준다. */
export async function run(endpoint, input, { every = 5000, onStatus = () => {} } = {}) {
  const job = await call(`https://queue.fal.run/${endpoint}`, { method: "POST", body: JSON.stringify(input) });
  for (;;) {
    const s = await call(job.status_url);
    onStatus(s.status, s);
    if (s.status === "COMPLETED") return call(job.response_url);
    await new Promise((r) => setTimeout(r, every));
  }
}

/** 사진 파일을 data URI로. 시험 생성은 저장소에 올리지 않고 바로 보낸다. */
export async function dataUri(path) {
  const type = /\.png$/i.test(path) ? "image/png" : "image/jpeg";
  return `data:${type};base64,${(await readFile(path)).toString("base64")}`;
}

/** 생성 결과(주소 또는 data URI)를 바이트로 */
export async function bytes(url) {
  if (url.startsWith("data:")) return Buffer.from(url.slice(url.indexOf(",") + 1), "base64");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`결과 이미지를 받지 못했어요 ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
