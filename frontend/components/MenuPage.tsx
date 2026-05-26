import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Scissors } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ServiceItem {
  id: string;
  name: string;
  category: "men" | "women" | "other";
  price: number;
  duration_minutes: number;
  description: string | null;
  image_url: string | null;
}

export function MenuPage() {
  const [tab, setTab] = useState<"men" | "women">("men");
  const [styles, setStyles] = useState<ServiceItem[]>([]);

  useEffect(() => {
    const fetchServices = async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("services")
        .select("id,name,category,price,duration_minutes,description,image_url")
        .eq("is_active", true)
        .in("category", ["men", "women"])
        .order("name");
      if (data) setStyles(data as ServiceItem[]);
    };

    fetchServices();
  }, []);

  const filtered = styles.filter((s) => s.category === tab);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFF8F0" }}>
      {/* Page header */}
      <div className="py-14" style={{ backgroundColor: "#4B2E2B" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#C08552" }}>เมนู</p>
          <h1 style={{ color: "#FFF8F0", fontWeight: 600, fontSize: "2rem" }}>ทรงผมทั้งหมด</h1>
          <p className="mt-2 text-sm" style={{ color: "rgba(255,248,240,0.6)" }}>เลือกทรงผมที่ถูกใจแล้วจองคิวได้เลย</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* Tabs */}
        <div className="flex gap-2 mb-10 p-1 rounded-2xl w-fit mx-auto" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 12px rgba(75,46,43,0.08)" }}>
          {(["men", "women"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm transition-all duration-200"
              style={
                tab === t
                  ? { backgroundColor: "#C08552", color: "#ffffff" }
                  : { color: "#8C5A3C" }
              }
            >
              <Scissors className="w-4 h-4" />
              {t === "men" ? "ทรงผมผู้ชาย" : "ทรงผมผู้หญิง"}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(style => (
            <div
              key={style.id}
              className="rounded-2xl overflow-hidden group"
              style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 16px rgba(75,46,43,0.08)" }}
            >
              <div className="relative h-52 overflow-hidden">
                <img
                    src={style.image_url || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&fit=crop"}
                  alt={style.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <h3 className="mb-1" style={{ color: "#4B2E2B", fontSize: "1rem", fontWeight: 600 }}>{style.name}</h3>
                <p className="text-xs mb-4" style={{ color: "#8C5A3C" }}>{style.description || "บริการตัดและจัดทรงโดยช่างมืออาชีพ"}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p style={{ color: "#C08552", fontWeight: 600, fontSize: "1.125rem" }}>฿{style.price}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" style={{ color: "#8C5A3C" }} />
                      <span className="text-xs" style={{ color: "#8C5A3C" }}>{style.duration_minutes} นาที</span>
                    </div>
                  </div>
                  <Link
                    href={`/book?service=${encodeURIComponent(style.name)}&price=${style.price}`}
                    className="px-5 py-2 rounded-full text-sm transition-opacity hover:opacity-80"
                    style={{ backgroundColor: "#C08552", color: "#ffffff" }}
                  >
                    จองทรงนี้
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* All services summary */}
        <div className="mt-14 p-8 rounded-3xl text-center" style={{ backgroundColor: "#4B2E2B" }}>
          <p className="text-sm mb-2" style={{ color: "rgba(255,248,240,0.6)" }}>ไม่แน่ใจว่าจะเลือกทรงไหน?</p>
          <h2 className="mb-4" style={{ color: "#FFF8F0", fontSize: "1.25rem", fontWeight: 600 }}>ปรึกษาช่างได้เลยที่ร้าน</h2>
          <p className="text-sm mb-6" style={{ color: "rgba(255,248,240,0.5)" }}>หรือจองคิวล่วงหน้า แล้วค่อยตัดสินใจที่ร้านก็ได้</p>
          <Link
            href="/book"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm transition-opacity hover:opacity-85"
            style={{ backgroundColor: "#C08552", color: "#ffffff" }}
          >
            จองคิวเลย
          </Link>
        </div>
      </div>
    </div>
  );
}
