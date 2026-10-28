import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper px-8 text-center">
      <div>
        <p className="text-[18px] font-bold">페이지를 찾을 수 없어요</p>
        <Link href="/" className="mt-4 inline-block rounded-xl bg-ink px-5 py-3 text-[15px] font-semibold text-white">
          처음으로
        </Link>
      </div>
    </div>
  );
}
