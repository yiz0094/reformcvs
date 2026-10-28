"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/format";

type Variant = "primary" | "dark" | "secondary" | "ghost" | "kakao";
type Size = "lg" | "md" | "sm";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white shadow-[0_6px_18px_-6px_rgba(255,90,31,.55)] hover:bg-[#f04d12] disabled:bg-[#d9d3ca] disabled:text-white disabled:shadow-none",
  dark: "bg-ink text-white hover:bg-black disabled:bg-[#d9d3ca]",
  secondary: "border border-line bg-white text-ink hover:border-ink/25 disabled:text-muted",
  ghost: "text-ink hover:bg-black/[.04] disabled:text-muted",
  kakao: "bg-[#fee500] text-[#191919] hover:bg-[#f5dc00]",
};

const sizes: Record<Size, string> = {
  lg: "h-14 rounded-2xl px-5 text-[16px]",
  md: "h-11 rounded-xl px-4 text-[15px]",
  sm: "h-9 rounded-lg px-3 text-[13.5px]",
};

const base =
  "inline-flex select-none items-center justify-center gap-2 font-semibold transition active:scale-[.985] disabled:cursor-not-allowed disabled:active:scale-100";

export function Button({
  variant = "primary",
  size = "lg",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={cx(base, variants[variant], sizes[size], className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "lg",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={cx(base, variants[variant], sizes[size], className)} {...props} />;
}

export function Chip({
  active,
  className,
  ...props
}: ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cx(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-medium transition",
        active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink/30",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "neutral" | "accent" | "ok" | "warn" | "navy";
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-[#efeae2] text-[#5c5852]",
    accent: "bg-accent-soft text-accent",
    ok: "bg-[#e3f4ea] text-ok",
    warn: "bg-[#fcefdc] text-warn",
    navy: "bg-navy text-white",
  };
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx("rounded-[20px] border border-line bg-white p-4", className)}>{children}</section>;
}

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <span className="text-[14px] font-semibold text-ink">{children}</span>
      {hint ? <span className="text-[12.5px] text-muted">{hint}</span> : null}
    </div>
  );
}

export function DemoTag({ children = "데모" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-dashed border-[#c9c1b4] px-1.5 py-px text-[11px] font-semibold text-[#8a8278]">
      {children}
    </span>
  );
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-6">
      {message ? (
        <div key={message} className="animate-rise max-w-[360px] rounded-2xl bg-ink/92 px-4 py-3 text-center text-[14px] leading-snug text-white shadow-lg">
          {message}
        </div>
      ) : null}
    </div>
  );
}

export function TextField({ label, ...props }: ComponentProps<"input"> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-muted">{label}</span>
      <input
        className="h-12 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink outline-none transition placeholder:text-[#b3aca2] focus:border-ink"
        {...props}
      />
    </label>
  );
}
