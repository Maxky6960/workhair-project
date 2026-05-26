"use client";

import { Suspense } from "react";
import { BookPage } from "@/components/BookPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BookPage />
    </Suspense>
  );
}
