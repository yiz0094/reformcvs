import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/app-frame";
import GarmentScreen from "@/screens/garment";

export default function Page() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <GarmentScreen />
    </Suspense>
  );
}
