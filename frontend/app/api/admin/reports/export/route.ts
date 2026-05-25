import { NextRequest } from "next/server";
import { requireAdminServer } from "@/lib/auth/admin";

const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export async function GET(request: NextRequest) {
  const auth = await requireAdminServer();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const params = request.nextUrl.searchParams;
  const month = Number(params.get("month") || 0);
  const year = Number(params.get("year") || new Date().getFullYear());
  const from = params.get("from") || "";
  const to = params.get("to") || "";

  let start = `${year}-01-01`;
  let end = `${year + 1}-01-01`;
  if (month >= 1 && month <= 12) {
    start = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  }

  const { data: rows, error: exportError } = await supabase
    .from("bookings")
    .select("id,appointment_at,customer_name,service_name,service_price,status")
    .gte("appointment_at", `${start}T00:00:00`)
    .lt("appointment_at", `${end}T00:00:00`)
    .order("appointment_at", { ascending: true });

  if (exportError) {
    return new Response("Failed to export", { status: 500 });
  }

  const filtered = (rows || []).filter((row) => {
    const day = row.appointment_at.slice(0, 10);
    return (!from || day >= from) && (!to || day <= to);
  });

  const headers = ["id", "appointment_at", "customer_name", "service_name", "service_price", "status"];
  const csvRows = filtered.map((row) => [
    row.id,
    row.appointment_at,
    row.customer_name,
    row.service_name,
    row.service_price,
    row.status,
  ]);
  const csv = [headers.join(","), ...csvRows.map((r) => r.map(escapeCsv).join(","))].join("\n");

  return new Response(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="workhair-report-${year}-${String(month || 0).padStart(2, "0")}.csv"`,
    },
  });
}
