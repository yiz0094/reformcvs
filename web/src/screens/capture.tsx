"use client";

import { Camera, CircleAlert, CircleCheck, ImagePlus, LoaderCircle, RotateCcw, Sun, Shirt, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { BottomBar, PhoneFrame, TopBar } from "@/components/app-frame";
import { Button } from "@/components/ui";
import { garmentFromPhoto, garmentFromSample } from "@/lib/factory";
import { cx, newId, nowMs } from "@/lib/format";
import { SAMPLE_GARMENTS } from "@/lib/garments";
import { preparePhoto, QUALITY_MESSAGE, type PreparedPhoto } from "@/lib/image";
import { dispatch } from "@/lib/store";

const EXAMPLES = [
  { label: "좋아요", ok: true, style: {} },
  { label: "흔들림", ok: false, style: { filter: "blur(2.2px)" } },
  { label: "어두움", ok: false, style: { filter: "brightness(.42)" } },
  { label: "잘림", ok: false, style: { transform: "scale(1.9) translate(12%, 10%)" } },
];

const TIPS = [
  { icon: Sun, text: "밝은 곳에서, 그림자가 진하지 않게" },
  { icon: Shirt, text: "무늬 없는 바닥에 옷 전체가 보이게" },
  { icon: UserX, text: "사람 얼굴이나 몸은 나오지 않게" },
];

export default function CaptureScreen() {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const albumRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      setPhoto(await preparePhoto(file));
    } catch {
      setError("이 사진은 열 수 없어요. JPG나 PNG 사진으로 다시 골라 주세요.");
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (albumRef.current) albumRef.current.value = "";
    }
  };

  const startWithPhoto = () => {
    if (!photo) return;
    const g = garmentFromPhoto(photo, newId("g"), nowMs());
    dispatch({ type: "garment/add", garment: g });
    router.push(`/g/${g.id}`);
  };

  const startWithSample = (sampleId: string) => {
    const g = garmentFromSample(sampleId, newId("g"), nowMs());
    dispatch({ type: "garment/add", garment: g });
    router.push(`/g/${g.id}`);
  };

  const checks = photo
    ? [
        { key: "light", label: "밝기", issue: photo.quality.issues.find((i) => i === "dark" || i === "bright") },
        { key: "sharp", label: "선명도", issue: photo.quality.issues.find((i) => i === "blur") },
        { key: "size", label: "옷 크기", issue: photo.quality.issues.find((i) => i === "small" || i === "crop") },
      ]
    : [];
  const hasIssue = checks.some((c) => c.issue);

  return (
    <PhoneFrame>
      <TopBar title="사진 올리기" step={0} backHref="/" />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <input ref={albumRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

      {photo ? (
        <>
          <section className="px-5 pt-2">
            <h2 className="text-[22px] font-bold leading-snug tracking-[-0.01em]">이 사진으로 시안을 만들까요?</h2>
            <p className="mt-1.5 text-[14px] text-muted">사진은 휴대폰에서 줄이고 위치 정보(EXIF)를 지운 뒤 올라가요.</p>
          </section>
          <section className="px-5 pt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.dataUrl} alt="올린 옷 사진" className="mx-auto max-h-[52vh] w-auto rounded-[22px] object-contain ring-1 ring-line" />
          </section>
          <section className="px-5 pt-4">
            <ul className="divide-y divide-line rounded-[20px] border border-line bg-white">
              {checks.map((c) => (
                <li key={c.key} className="flex items-start gap-3 px-4 py-3">
                  {c.issue ? <CircleAlert size={20} className="mt-0.5 shrink-0 text-warn" /> : <CircleCheck size={20} className="mt-0.5 shrink-0 text-ok" />}
                  <div>
                    <div className="text-[14.5px] font-semibold">{c.label}</div>
                    <div className="text-[13px] text-muted">{c.issue ? QUALITY_MESSAGE[c.issue] : "좋아요"}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <BottomBar>
            <div className="grid grid-cols-[1fr_2fr] gap-2">
              <Button variant="secondary" onClick={() => setPhoto(null)}>
                <RotateCcw size={17} /> 다시
              </Button>
              <Button onClick={startWithPhoto}>{hasIssue ? "그래도 계속" : "이 사진으로 계속"}</Button>
            </div>
          </BottomBar>
        </>
      ) : (
        <>
          <section className="px-5 pt-2">
            <h2 className="text-[24px] font-bold leading-[1.3] tracking-[-0.015em]">
              옷을 바닥에 펼쳐서
              <br />
              한 장만 찍어 주세요
            </h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted">AI가 옷의 종류와 색을 알아보고, 이 옷에 할 수 있는 리폼만 골라 드려요.</p>
          </section>

          <section className="grid grid-cols-4 gap-2 px-5 pt-5">
            {EXAMPLES.map((ex) => (
              <figure key={ex.label} className="text-center">
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl ring-1 ring-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/samples/white-tee.svg" alt="" className="h-full w-full object-cover" style={ex.style} />
                  <span
                    className={cx(
                      "absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold text-white",
                      ex.ok ? "bg-ok" : "bg-[#d0452f]",
                    )}
                  >
                    {ex.ok ? "✓" : "✕"}
                  </span>
                </div>
                <figcaption className="mt-1 text-[12px] text-muted">{ex.label}</figcaption>
              </figure>
            ))}
          </section>

          <section className="px-5 pt-5">
            <ul className="space-y-2.5">
              {TIPS.map((t) => (
                <li key={t.text} className="flex items-center gap-2.5 text-[14px]">
                  <t.icon size={17} className="text-muted" /> {t.text}
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-2.5 px-5 pt-6">
            <Button onClick={() => cameraRef.current?.click()} disabled={busy}>
              {busy ? <LoaderCircle size={19} className="animate-spin" /> : <Camera size={19} />} 카메라로 찍기
            </Button>
            <Button variant="secondary" onClick={() => albumRef.current?.click()} disabled={busy}>
              <ImagePlus size={19} /> 앨범에서 고르기
            </Button>
            {error ? <p className="text-center text-[13.5px] text-[#c2412c]">{error}</p> : null}
          </section>

          <section id="samples" className="scroll-mt-16 px-5 pb-10 pt-10">
            <div className="flex items-center gap-3 text-[13px] text-muted">
              <span className="h-px flex-1 bg-line" /> 찍을 옷이 없다면 <span className="h-px flex-1 bg-line" />
            </div>
            <h3 className="mt-4 text-[17px] font-bold">샘플 옷으로 체험하기</h3>
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {SAMPLE_GARMENTS.map((g) => (
                <button
                  key={g.sampleId}
                  type="button"
                  onClick={() => startWithSample(g.sampleId!)}
                  className="group overflow-hidden rounded-2xl bg-white text-left ring-1 ring-line transition hover:ring-ink/30 active:scale-[.98]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.image} alt={g.name} className="aspect-[3/4] w-full object-cover" />
                  <div className="px-2.5 py-2">
                    <div className="text-[13px] font-semibold">{g.name}</div>
                    <div className="text-[12px] text-muted">체험하기</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </PhoneFrame>
  );
}
