import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/app-frame";
import CheckoutScreen from "@/screens/checkout";

export default function Page() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <CheckoutScreen />
    </Suspense>
  );
}
