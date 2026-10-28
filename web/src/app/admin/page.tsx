import type { Metadata } from "next";
import AdminBoard from "@/screens/admin";

export const metadata: Metadata = { title: "운영 콘솔 · 리폼 편의점 (시안)" };

export default function Page() {
  return <AdminBoard />;
}
