"use client";

import { CustomerLayout } from "@/website-markdown/src/app/components/CustomerLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CustomerLayout>{children}</CustomerLayout>;
}
