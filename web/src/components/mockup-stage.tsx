"use client";

import { Fragment, useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { designSvg } from "@/lib/design-svg";
import { blendFor, designBySlug, type Design } from "@/lib/designs";
import { cx } from "@/lib/format";
import type { Garment, MockupOptions, Point } from "@/lib/types";

export function DesignArt({
  slug,
  colorId,
  text = "",
  className,
}: {
  slug: string;
  colorId: string;
  text?: string;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const html = useMemo(() => designSvg(slug, colorId, text, `a${uid}`), [slug, colorId, text, uid]);
  return <div className={cx("pointer-events-none h-full w-full", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** 원단 색 바탕 위에 디자인을 올린 작은 견본 */
export function DesignSwatch({
  design,
  colorId,
  text,
  fabric,
  className,
}: {
  design: Design;
  colorId: string;
  text?: string;
  fabric: string;
  className?: string;
}) {
  return (
    <div className={cx("relative grid place-items-center overflow-hidden", className)} style={{ background: fabric }}>
      <div
        className="absolute inset-0 opacity-[.16] mix-blend-multiply"
        style={{ backgroundImage: "url(/textures/noise.svg)", backgroundSize: "120px" }}
      />
      <div
        className="relative"
        style={{
          width: design.aspect > 1.3 ? "80%" : "60%",
          aspectRatio: `${design.aspect}`,
          mixBlendMode: blendFor(design, colorId),
        }}
      >
        <DesignArt slug={design.slug} colorId={colorId} text={text ?? design.text?.default ?? ""} />
      </div>
    </div>
  );
}

export interface StageLayer {
  designSlug: string;
  options: MockupOptions;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function MockupStage({
  garment,
  layers,
  compare = false,
  editable = false,
  zoom = false,
  badge = false,
  onMove,
  className,
  rounded = "rounded-[22px]",
}: {
  garment: Pick<Garment, "image" | "width" | "height" | "pctPerCm" | "name">;
  layers: StageLayer[];
  compare?: boolean;
  editable?: boolean;
  zoom?: boolean;
  badge?: boolean;
  onMove?: (index: number, pos: Point) => void;
  className?: string;
  rounded?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const grab = useRef<{ dx: number; dy: number } | null>(null);
  const [drag, setDrag] = useState<{ index: number; pos: Point } | null>(null);
  const [split, setSplit] = useState(50);
  const [splitting, setSplitting] = useState(false);

  const showCompare = compare && !zoom;
  const canDrag = editable && !zoom;
  const focus = layers[0]?.options.pos ?? { x: 0.5, y: 0.5 };

  const rel = (e: ReactPointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return { x: 0.5, y: 0.5 };
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>, index: number) => {
    if (!canDrag) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = rel(e);
    const cur = layers[index].options.pos;
    grab.current = { dx: p.x - cur.x, dy: p.y - cur.y };
    setDrag({ index, pos: cur });
  };
  const moveDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!grab.current || !drag) return;
    const p = rel(e);
    setDrag({ index: drag.index, pos: { x: clamp(p.x - grab.current.dx, 0.04, 0.96), y: clamp(p.y - grab.current.dy, 0.04, 0.96) } });
  };
  const endDrag = () => {
    if (drag) onMove?.(drag.index, drag.pos);
    grab.current = null;
    setDrag(null);
  };

  const moveSplit = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!splitting) return;
    setSplit(clamp(rel(e).x * 100, 0, 100));
  };

  return (
    <div
      ref={ref}
      className={cx("relative isolate w-full select-none overflow-hidden bg-[#e7e1d7]", rounded, className)}
      style={{ aspectRatio: `${garment.width} / ${garment.height}`, touchAction: canDrag || showCompare ? "none" : undefined }}
    >
      <div
        className="absolute inset-0 isolate transition-transform duration-500 ease-out"
        style={zoom ? { transform: "scale(2.4)", transformOrigin: `${focus.x * 100}% ${focus.y * 100}%` } : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={garment.image} alt={garment.name} draggable={false} className="absolute inset-0 h-full w-full object-cover" />
        {layers.map((layer, i) => {
          const design = designBySlug(layer.designSlug);
          if (!design) return null;
          const pos = drag?.index === i ? drag.pos : layer.options.pos;
          const place: CSSProperties = {
            left: `${pos.x * 100}%`,
            top: `${pos.y * 100}%`,
            width: `${layer.options.sizeCm * garment.pctPerCm}%`,
            aspectRatio: `${design.aspect}`,
            transform: "translate(-50%, -50%)",
          };
          return (
            <Fragment key={`${layer.designSlug}-${i}`}>
              {/* 혼합 모드는 디자인 그림에만 걸고, 편집 테두리는 따로 그린다 */}
              <div className="pointer-events-none absolute" style={{ ...place, mixBlendMode: blendFor(design, layer.options.colorId) }}>
                <DesignArt slug={design.slug} colorId={layer.options.colorId} text={layer.options.text} />
              </div>
              {canDrag ? (
                <div
                  className="absolute cursor-grab active:cursor-grabbing"
                  style={place}
                  onPointerDown={(e) => startDrag(e, i)}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  aria-label="디자인을 끌어서 옮기기"
                >
                  <span
                    className={cx("pointer-events-none absolute -inset-1.5 rounded-md border border-dashed transition", drag ? "border-white" : "border-white/70")}
                    style={{ boxShadow: "0 0 0 1px rgba(0,0,0,.18)" }}
                  />
                </div>
              ) : null}
            </Fragment>
          );
        })}
        {showCompare ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={garment.image}
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
          />
        ) : null}
      </div>

      {showCompare ? (
        <>
          <div
            role="slider"
            aria-label="원본과 시안 비교"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(split)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setSplit((s) => clamp(s - 5, 0, 100));
              if (e.key === "ArrowRight") setSplit((s) => clamp(s + 5, 0, 100));
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setSplitting(true);
            }}
            onPointerMove={moveSplit}
            onPointerUp={() => setSplitting(false)}
            onPointerCancel={() => setSplitting(false)}
            className="absolute inset-y-0 z-10 -ml-6 w-12 cursor-ew-resize outline-none"
            style={{ left: `${split}%` }}
          >
            <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,.12)]" />
            <span className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-lg">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m9 7-5 5 5 5M15 7l5 5-5 5" />
              </svg>
            </span>
          </div>
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-semibold text-white">원본</span>
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[12px] font-semibold text-white">시안</span>
        </>
      ) : null}

      {badge ? (
        <span
          className={cx(
            "pointer-events-none absolute left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11.5px] font-bold text-ink shadow-sm",
            showCompare ? "bottom-3" : "top-3",
          )}
        >
          AI 예시
        </span>
      ) : null}
    </div>
  );
}
