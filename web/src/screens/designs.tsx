"use client";

import { ChevronRight, Info } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Missing, PhoneFrame, ScreenSkeleton, TopBar } from "@/components/app-frame";
import { DesignSwatch } from "@/components/mockup-stage";
import { Badge, Chip } from "@/components/ui";
import { checkDesign, defaultColorFor, defaultOptions, DESIGNS, type Design } from "@/lib/designs";
import { newId, won, nowMs } from "@/lib/format";
import { CATEGORY_LABEL, MATERIAL_LABEL } from "@/lib/garments";
import { dispatch, useIsClient, useStore } from "@/lib/store";
import type { PlacementId } from "@/lib/types";

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "embroidery", label: "자수" },
  { key: "patch", label: "와펜·패치" },
  { key: "print", label: "프린트" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const matches = (d: Design, f: FilterKey) =>
  f === "all" || (f === "patch" ? d.type === "patch" || d.type === "wappen" : d.type === f);

export default function DesignsScreen() {
  const { garmentId } = useParams<{ garmentId: string }>();
  const router = useRouter();
  const isClient = useIsClient();
  const { garments } = useStore();
  const g = garments[garmentId];
  const [filter, setFilter] = useState<FilterKey>("all");

  if (!isClient) return <ScreenSkeleton />;
  if (!g) return <Missing what="옷 사진" />;

  const results = DESIGNS.filter((d) => matches(d, filter)).map((d) => ({ d, a: checkDesign(d, g) }));
  const ok = results.filter((r) => r.a.ok);
  const no = results.filter((r) => !r.a.ok);

  const pick = (d: Design, placements: PlacementId[]) => {
    const session = {
      id: newId("m"),
      garmentId: g.id,
      designSlug: d.slug,
      options: defaultOptions(d, g, placements),
      feedback: {},
      createdAt: nowMs(),
    };
    dispatch({ type: "session/add", session });
    router.push(`/m/${session.id}`);
  };

  return (
    <PhoneFrame>
      <TopBar title="디자인 고르기" step={2} />

      <section className="px-5 pt-1">
        <Link href={`/g/${g.id}`} className="flex items-center gap-3 rounded-2xl bg-white p-2.5 ring-1 ring-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={g.image} alt="" className="h-14 w-11 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold">{g.name}</div>
            <div className="truncate text-[13px] text-muted">
              {CATEGORY_LABEL[g.category]} · {g.colorName} · {g.material ? MATERIAL_LABEL[g.material] : "소재 미정"}
            </div>
          </div>
          <span className="pr-1 text-[13px] font-semibold text-muted">수정</span>
        </Link>
      </section>

      <nav className="no-scrollbar flex gap-2 overflow-x-auto px-5 pt-4">
        {FILTERS.map((f) => (
          <Chip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </Chip>
        ))}
      </nav>

      <section className="px-5 pt-5">
        <h2 className="text-[15px] font-bold">
          이 옷에 할 수 있어요 <span className="text-accent">{ok.length}</span>
        </h2>
        <ul className="mt-3 space-y-2.5">
          {ok.map(({ d, a }) => (
            <li key={d.slug}>
              <button
                type="button"
                onClick={() => a.ok && pick(d, a.placements)}
                className="animate-rise flex w-full gap-3.5 rounded-[20px] border border-line bg-white p-3 text-left transition hover:border-ink/25 active:scale-[.99]"
              >
                <DesignSwatch design={d} colorId={defaultColorFor(d, g)} fabric={g.colorHex} className="h-[88px] w-[88px] shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1 py-0.5">
                  <div className="flex items-center gap-1.5">
                    <Badge tone="accent">{d.typeLabel}</Badge>
                    <span className="text-[12px] text-muted">작업 {d.leadDays}일</span>
                  </div>
                  <div className="mt-1 text-[16px] font-bold">{d.name}</div>
                  <div className="line-clamp-1 text-[13px] text-muted">{d.summary}</div>
                  <div className="mt-1 text-[14px] font-semibold">{won(d.basePrice)}부터</div>
                </div>
                <ChevronRight size={20} className="self-center text-muted" />
              </button>
            </li>
          ))}
        </ul>
        {ok.length === 0 ? <p className="mt-3 text-[14px] text-muted">이 분류에는 지금 할 수 있는 디자인이 없어요.</p> : null}
      </section>

      {no.length > 0 ? (
        <section className="px-5 pb-12 pt-8">
          <h2 className="text-[15px] font-bold text-muted">이 옷에는 어려워요 {no.length}</h2>
          <ul className="mt-3 space-y-2.5">
            {no.map(({ d, a }) => (
              <li key={d.slug} className="flex gap-3.5 rounded-[20px] border border-line bg-[#faf8f4] p-3">
                <DesignSwatch design={d} colorId={d.colors[0].id} fabric={g.colorHex} className="h-[64px] w-[64px] shrink-0 rounded-xl opacity-50 grayscale" />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-muted">{d.name}</div>
                  <div className="mt-1 flex items-start gap-1.5 text-[13px] text-warn">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    {!a.ok ? a.reason : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="pb-12" />
      )}
    </PhoneFrame>
  );
}
