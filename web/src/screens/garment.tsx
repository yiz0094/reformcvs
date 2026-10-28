"use client";

import { Check, LoaderCircle, Sparkles } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomBar, Missing, PhoneFrame, ScreenSkeleton, TopBar } from "@/components/app-frame";
import { Badge, Button, Card, Chip, DemoTag, Label } from "@/components/ui";
import { cx } from "@/lib/format";
import { CATEGORY_LABEL, COLOR_PALETTE, genericAnchors, genericPctPerCm, MATERIAL_LABEL } from "@/lib/garments";
import { dispatch, useIsClient, useStore } from "@/lib/store";
import type { Category, Material } from "@/lib/types";

const STEPS = ["사진 정리하기", "옷 영역 찾기", "종류·색·소재 알아보기"];

export default function GarmentScreen() {
  const { garmentId } = useParams<{ garmentId: string }>();
  const router = useRouter();
  const isClient = useIsClient();
  const { garments } = useStore();
  const g = garments[garmentId];
  const [step, setStep] = useState(0);
  const [pickColor, setPickColor] = useState(false);

  const id = g?.id;
  const analyzed = g?.analyzed;
  useEffect(() => {
    if (!id || analyzed) return;
    const timers = [
      window.setTimeout(() => setStep(1), 750),
      window.setTimeout(() => setStep(2), 1500),
      window.setTimeout(() => setStep(3), 2300),
      window.setTimeout(() => dispatch({ type: "garment/update", id, patch: { analyzed: true } }), 2750),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [id, analyzed]);

  if (!isClient) return <ScreenSkeleton />;
  if (!g) return <Missing what="옷 사진" />;

  const setCategory = (category: Category) =>
    dispatch({
      type: "garment/update",
      id: g.id,
      patch: g.source === "upload" ? { category, anchors: genericAnchors(category), pctPerCm: genericPctPerCm(category) } : { category },
    });
  const setMaterial = (material: Material) => dispatch({ type: "garment/update", id: g.id, patch: { material } });

  return (
    <PhoneFrame>
      <TopBar title={g.analyzed ? "인식 결과 확인" : "AI가 살펴보는 중"} step={1} />

      <section className="px-5 pt-1">
        <div className={cx("relative mx-auto overflow-hidden rounded-[22px] ring-1 ring-line transition-all duration-500", g.analyzed ? "w-[46%]" : "w-full")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={g.image} alt={g.name} className="block w-full" />
          {!g.analyzed ? (
            <>
              <div className="absolute inset-0 bg-[linear-gradient(transparent,rgba(255,90,31,.08))]" />
              <div className="animate-scan absolute inset-x-0 h-0.5 bg-accent shadow-[0_0_18px_4px_rgba(255,90,31,.55)]" />
            </>
          ) : (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11.5px] font-bold">
              <Sparkles size={12} className="text-accent" /> 인식 완료
            </span>
          )}
        </div>
      </section>

      {!g.analyzed ? (
        <section className="px-5 pt-6">
          <ul className="space-y-3">
            {STEPS.map((label, i) => (
              <li key={label} className={cx("flex items-center gap-3 text-[15px] transition", i <= step ? "text-ink" : "text-[#b9b1a5]")}>
                <span className={cx("grid h-7 w-7 place-items-center rounded-full", i < step ? "bg-ink text-white" : "bg-white ring-1 ring-line")}>
                  {i < step ? <Check size={15} /> : i === step ? <LoaderCircle size={15} className="animate-spin text-accent" /> : null}
                </span>
                {label}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[13px] leading-relaxed text-muted">
            회전·밝기를 맞추고 사진 속 위치 정보를 지운 뒤, 옷이 있는 영역과 종류를 찾고 있어요.
          </p>
        </section>
      ) : (
        <>
          <section className="px-5 pt-5">
            <div className="flex items-center gap-2">
              <h2 className="text-[21px] font-bold tracking-[-0.01em]">이렇게 인식했어요</h2>
              {g.source === "upload" ? <DemoTag>예시 인식</DemoTag> : null}
            </div>
            <p className="mt-1 text-[14px] text-muted">틀린 곳이 있으면 눌러서 고쳐 주세요. 소재에 따라 할 수 있는 리폼이 달라져요.</p>
          </section>

          <section className="space-y-3 px-5 pt-4 pb-6">
            <Card>
              <Label hint={g.source === "upload" ? "종류는 직접 확인해 주세요" : undefined}>종류</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
                  <Chip key={c} active={g.category === c} onClick={() => setCategory(c)}>
                    {CATEGORY_LABEL[c]}
                  </Chip>
                ))}
              </div>
            </Card>
            <Card>
              <Label hint={<button type="button" className="font-semibold text-ink underline underline-offset-2" onClick={() => setPickColor((v) => !v)}>{pickColor ? "닫기" : "바꾸기"}</button>}>
                색
              </Label>
              <div className="flex items-center gap-2.5">
                <span className="h-8 w-8 rounded-full ring-1 ring-black/10" style={{ background: g.colorHex }} />
                <span className="text-[15px] font-semibold">{g.colorName}</span>
                {g.source === "upload" ? <Badge tone="ok">사진에서 계산</Badge> : null}
              </div>
              {pickColor ? (
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        dispatch({ type: "garment/update", id: g.id, patch: { colorName: c.name, colorHex: c.hex } });
                        setPickColor(false);
                      }}
                      className="flex flex-col items-center gap-1 text-[11.5px]"
                    >
                      <span className={cx("h-8 w-8 rounded-full ring-1 ring-black/10", g.colorName === c.name && "ring-2 ring-ink ring-offset-2")} style={{ background: c.hex }} />
                      {c.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </Card>
            <Card className={cx(!g.material && "ring-2 ring-accent/60")}>
              <Label hint={!g.material ? <span className="font-semibold text-accent">필수</span> : undefined}>소재</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(MATERIAL_LABEL) as Material[]).map((m) => (
                  <Chip key={m} active={g.material === m} onClick={() => setMaterial(m)}>
                    {MATERIAL_LABEL[m]}
                  </Chip>
                ))}
              </div>
              <p className="mt-2.5 text-[12.5px] text-muted">소재는 사진만으로 알기 어려워 직접 골라 주세요. 라벨에 적힌 소재가 가장 정확해요.</p>
            </Card>
          </section>

          <BottomBar>
            <Button className="w-full" disabled={!g.material} onClick={() => router.push(`/g/${g.id}/designs`)}>
              {g.material ? "이 옷에 맞는 디자인 보기" : "소재를 골라 주세요"}
            </Button>
          </BottomBar>
        </>
      )}
    </PhoneFrame>
  );
}
