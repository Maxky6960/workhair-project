"use client";

import { Suspense } from "react";
import { BookingConfirmedPage } from "@/components/BookingConfirmedPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BookingConfirmedPage />
    </Suspense>
  );
}
