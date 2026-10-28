import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/app-frame";
import OrderScreen from "@/screens/order";

export default function Page() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <OrderScreen />
    </Suspense>
  );
}
