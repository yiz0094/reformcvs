import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/app-frame";
import MockupScreen from "@/screens/mockup";

export default function Page() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <MockupScreen />
    </Suspense>
  );
}
