"use client";

import { AdminLayout } from "@/website-markdown/src/app/components/AdminLayout";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
