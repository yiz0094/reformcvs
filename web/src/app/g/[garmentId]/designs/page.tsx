import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/app-frame";
import DesignsScreen from "@/screens/designs";

export default function Page() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <DesignsScreen />
    </Suspense>
  );
}
