"use client";

import { Suspense } from "react";
import { CustomerQueuePage } from "@/components/CustomerQueuePage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CustomerQueuePage />
    </Suspense>
  );
}
