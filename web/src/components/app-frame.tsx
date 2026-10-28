"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cx } from "@/lib/format";

export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-dvh md:py-8">
      <div
        className={cx(
          "relative mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-paper md:min-h-[calc(100dvh-4rem)] md:overflow-clip md:rounded-[32px] md:shadow-[0_30px_80px_-30px_rgba(30,25,15,.35)] md:ring-1 md:ring-black/5",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function Logo({ small }: { small?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2" aria-label="리폼 편의점 처음으로">
      <svg viewBox="0 0 32 32" className={small ? "h-7 w-7" : "h-8 w-8"} aria-hidden>
        <rect x="2" y="8" width="28" height="22" rx="6" fill="#1e2b4a" />
        <path d="M2 10a2 2 0 0 1 2-2h24a2 2 0 0 1 2 2v2.5a3.5 3.5 0 0 1-7 0 3.5 3.5 0 0 1-7 0 3.5 3.5 0 0 1-7 0 3.5 3.5 0 0 1-7 0Z" fill="#ff5a1f" />
        <path d="M10 23.5 21 17" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <circle cx="21.6" cy="16.6" r="1.3" fill="#1e2b4a" stroke="#fff" strokeWidth="1" />
        <path d="M21.4 17.4c3.6 2.4 1.8 6.6-4.8 7.2" stroke="#ffc83d" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeDasharray="2 2.2" />
      </svg>
      <span className={cx("font-extrabold tracking-[-0.02em] text-ink", small ? "text-[17px]" : "text-[19px]")}>리폼 편의점</span>
    </Link>
  );
}

const FLOW = ["촬영", "인식", "디자인", "시안", "주문"];

export function FlowSteps({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-1" aria-label="진행 단계">
      {FLOW.map((label, i) => (
        <li key={label} className="flex items-center gap-1">
          <span
            className={cx(
              "h-1.5 rounded-full transition-all",
              i < current ? "w-3 bg-ink/70" : i === current ? "w-6 bg-accent" : "w-3 bg-[#ddd6cb]",
            )}
            aria-current={i === current ? "step" : undefined}
            title={label}
          />
        </li>
      ))}
    </ol>
  );
}

export function TopBar({
  title,
  step,
  right,
  backHref,
}: {
  title: string;
  step?: number;
  right?: ReactNode;
  backHref?: string;
}) {
  const router = useRouter();
  const goBack = () => {
    if (backHref) router.push(backHref);
    else if (window.history.length > 1) router.back();
    else router.push("/");
  };
  return (
    <header className="sticky top-0 z-30 border-b border-transparent bg-paper/90 backdrop-blur-md">
      <div className="flex h-14 items-center gap-1 px-2">
        <button
          type="button"
          onClick={goBack}
          className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-black/5"
          aria-label="뒤로"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 truncate text-[17px] font-bold">{title}</h1>
        {step !== undefined ? <FlowSteps current={step} /> : null}
        <div className="flex min-w-10 justify-end pr-2">{right}</div>
      </div>
    </header>
  );
}

export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-30 mt-auto border-t border-line/80 bg-paper/95 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)] backdrop-blur-md">
      {children}
    </div>
  );
}

export function ScreenSkeleton() {
  return (
    <PhoneFrame>
      <div className="h-14" />
      <div className="space-y-4 px-5 pt-2">
        <div className="h-7 w-2/3 animate-pulse rounded-lg bg-[#ebe5db]" />
        <div className="aspect-[3/4] w-full animate-pulse rounded-[22px] bg-[#ebe5db]" />
        <div className="h-24 w-full animate-pulse rounded-[20px] bg-[#ebe5db]" />
      </div>
    </PhoneFrame>
  );
}

export function Missing({ what }: { what: string }) {
  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-[18px] font-bold">{what}을(를) 찾지 못했어요</p>
        <p className="text-[14.5px] leading-relaxed text-muted">
          시안 단계라 체험 기록은 이 브라우저에만 저장돼요. 다른 기기나 새 창에서 열었다면 처음부터 다시 시작해 주세요.
        </p>
        <Link href="/" className="mt-2 rounded-xl bg-ink px-5 py-3 text-[15px] font-semibold text-white">
          처음으로
        </Link>
      </div>
    </PhoneFrame>
  );
}
