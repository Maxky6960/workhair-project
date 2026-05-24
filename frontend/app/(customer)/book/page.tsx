"use client";

import { Suspense } from "react";
import { BookPage } from "@/website-markdown/src/app/components/BookPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BookPage />
    </Suspense>
  );
}
