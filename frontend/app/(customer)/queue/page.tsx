"use client";

import { Suspense } from "react";
import { CustomerQueuePage } from "@/website-markdown/src/app/components/CustomerQueuePage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CustomerQueuePage />
    </Suspense>
  );
}
