"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Scissors, Clock, CheckCircle, Calendar, ChevronRight, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AIChatPopup } from "./AIChatPopup";

interface ServiceItem {
  id: string;
  name: string;
  category: "men" | "women" | "other";
  price: number;
  duration_minutes: number;
  description: string | null;
  image_url: string | null;
}

export function HomePage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [hours, setHours] = useState([
    { label: "จันทร์ - ศุกร์", time: "09:00 - 20:00 น." },
    { label: "เสาร์ - อาทิตย์", time: "09:00 - 20:00 น." },
    { label: "วันหยุดนักขัตฤกษ์", time: "10:00 - 18:00 น." },
  ]);

  useEffect(() => {
    const loadData = async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return;
      const supabase = createClient();
      const [{ data: serviceRows }, { data: settings }] = await Promise.all([
        supabase.from("services").select("id,name,category,price,duration_minutes,description,image_url").eq("is_active", true).order("created_at", { ascending: true }),
        supabase.from("shop_settings").select("open_hours").eq("id", 1).single(),
      ]);

      if (serviceRows) setServices(serviceRows as ServiceItem[]);
      if (settings?.open_hours) {
        try {
          const parsed = JSON.parse(settings.open_hours);
          setHours([
            { label: "จันทร์ - ศุกร์", time: `${parsed.weekday?.open || "09:00"} - ${parsed.weekday?.close || "20:00"} น.` },
            { label: "เสาร์ - อาทิตย์", time: `${parsed.weekend?.open || "09:00"} - ${parsed.weekend?.close || "20:00"} น.` },
            { label: "วันหยุดนักขัตฤกษ์", time: `${parsed.holiday?.open || "10:00"} - ${parsed.holiday?.close || "18:00"} น.` },
          ]);
        } catch {
          // keep defaults
        }
      }
    };

    loadData();
  }, []);

  const featured = useMemo(() => services.slice(0, 3), [services]);

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[85vh] min-h-[560px] flex items-center overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1536520002442-39764a41e987?w=1400&fit=crop"
          alt="Workhair salon interior"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(75,46,43,0.85) 0%, rgba(75,46,43,0.4) 60%, rgba(75,46,43,0.1) 100%)" }} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 w-full">
          <div className="max-w-lg">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-px" style={{ backgroundColor: "#C08552" }} />
              <span className="text-xs uppercase tracking-widest" style={{ color: "#C08552" }}>ร้านตัดผม หญิง ชาย</span>
            </div>
            <h1 className="mb-4 leading-tight" style={{ color: "#FFF8F0", fontSize: "3rem", fontWeight: 600 }}>
              ยินดีต้อนรับสู่<br />
              <span style={{ color: "#C08552" }}>Workhair</span>
            </h1>
            <p className="mb-8 text-base" style={{ color: "rgba(255,248,240,0.75)" }}>
              ร้านตัดผมสไตล์โมเดิร์น บริการครบครัน ทั้งทรงผมหญิงและชาย<br />
              โดยช่างมืออาชีพ เปิดทุกวัน 09:00 - 20:00 น.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/book"
                className="flex items-center gap-2 px-6 py-3 rounded-full text-sm transition-opacity hover:opacity-85"
                style={{ backgroundColor: "#C08552", color: "#ffffff" }}
              >
                <Calendar className="w-4 h-4" />
                จองคิวเลย
              </Link>
              <Link
                href="/menu"
                className="flex items-center gap-2 px-6 py-3 rounded-full text-sm border transition-colors"
                style={{ borderColor: "rgba(255,248,240,0.5)", color: "#FFF8F0" }}
              >
                ดูเมนูทั้งหมด
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-5" style={{ backgroundColor: "#C08552" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-3 gap-4 text-center text-white">
            {[
              { value: "500+", label: "ลูกค้าที่ไว้วางใจ" },
              { value: `${services.length || 10}+`, label: "ทรงผมให้เลือก" },
              { value: "5 ★", label: "คะแนนรีวิว" },
            ].map(s => (
            <div key={s.label}>
              <p className="text-xl" style={{ fontWeight: 600 }}>{s.value}</p>
              <p className="text-xs opacity-80">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured hairstyles */}
      <section className="py-16" style={{ backgroundColor: "#FFF8F0" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#C08552" }}>แนะนำ</p>
              <h2 style={{ color: "#4B2E2B", fontSize: "1.75rem", fontWeight: 600 }}>ทรงผมยอดนิยม</h2>
            </div>
            <Link href="/menu" className="flex items-center gap-1 text-sm" style={{ color: "#C08552" }}>
              ดูทั้งหมด <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map(style => (
              <div
                key={style.id}
                className="rounded-2xl overflow-hidden group cursor-pointer"
                style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 20px rgba(75,46,43,0.08)" }}
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={style.image_url || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&fit=crop"}
                    alt={style.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-1 rounded-full text-xs" style={{ backgroundColor: "#C08552", color: "#fff" }}>
                   {style.category === "men" ? "ผู้ชาย" : style.category === "women" ? "ผู้หญิง" : "อื่นๆ"}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ backgroundColor: "rgba(255,248,240,0.95)" }}>
                    <Star className="w-3 h-3 fill-[#C08552] text-[#C08552]" />
                    <span style={{ color: "#4B2E2B" }}>ยอดนิยม</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="mb-1" style={{ color: "#4B2E2B", fontSize: "1rem", fontWeight: 600 }}>{style.name}</h3>
                   <p className="text-xs mb-3 line-clamp-2" style={{ color: "#8C5A3C" }}>{style.description || "บริการตัดและจัดทรงโดยช่างมืออาชีพ"}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm" style={{ color: "#C08552", fontWeight: 600 }}>฿{style.price}</p>
                       <p className="text-xs" style={{ color: "#8C5A3C" }}>~{style.duration_minutes} นาที</p>
                    </div>
                    <Link
                      href="/book"
                      className="px-4 py-2 rounded-full text-xs transition-opacity hover:opacity-80"
                      style={{ backgroundColor: "#4B2E2B", color: "#FFF8F0" }}
                    >
                      จองเลย
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16" style={{ backgroundColor: "#ffffff" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#C08552" }}>ขั้นตอน</p>
          <h2 className="mb-12" style={{ color: "#4B2E2B", fontSize: "1.75rem", fontWeight: 600 }}>วิธีการใช้บริการ</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", icon: Scissors, title: "เลือกทรงผม", desc: "เลือกทรงผมที่ถูกใจจากเมนูหลากหลาย แบ่งตามชาย-หญิง" },
              { step: "02", icon: Calendar, title: "จองคิว", desc: "กรอกข้อมูล ชื่อ เบอร์โทร และเลือกวันเวลาที่สะดวก" },
              { step: "03", icon: CheckCircle, title: "มาตัดผม", desc: "มาตามนัด ช่างพร้อมให้บริการ รับรองพอใจ 100%" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="relative">
                  {i < 2 && (
                    <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px" style={{ backgroundColor: "rgba(192,133,82,0.3)" }} />
                  )}
                  <div className="relative z-10">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#FFF8F0", border: "2px solid rgba(192,133,82,0.3)" }}>
                      <Icon className="w-7 h-7" style={{ color: "#C08552" }} />
                    </div>
                    <p className="text-xs mb-2" style={{ color: "#C08552" }}>STEP {item.step}</p>
                    <h3 className="mb-2" style={{ color: "#4B2E2B", fontSize: "1rem", fontWeight: 600 }}>{item.title}</h3>
                    <p className="text-sm" style={{ color: "#8C5A3C" }}>{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Opening hours + CTA */}
      <section className="py-16" style={{ backgroundColor: "#FFF8F0" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="rounded-3xl overflow-hidden grid md:grid-cols-2" style={{ backgroundColor: "#4B2E2B" }}>
            <div className="p-10">
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#C08552" }}>เวลาทำการ</p>
              <h2 className="mb-6" style={{ color: "#FFF8F0", fontSize: "1.5rem", fontWeight: 600 }}>พร้อมให้บริการ<br />ทุกวัน</h2>
              <div className="space-y-3">
                 {hours.map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "rgba(255,248,240,0.1)" }}>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" style={{ color: "#C08552" }} />
                      <span className="text-sm" style={{ color: "rgba(255,248,240,0.7)" }}>{item.label}</span>
                    </div>
                    <span className="text-sm" style={{ color: "#FFF8F0", fontWeight: 500 }}>{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-10 flex flex-col justify-center items-start" style={{ backgroundColor: "rgba(192,133,82,0.15)" }}>
              <p className="text-sm mb-3" style={{ color: "rgba(255,248,240,0.7)" }}>พร้อมเปลี่ยนลุคใหม่แล้วหรือยัง?</p>
              <h3 className="mb-6" style={{ color: "#FFF8F0", fontSize: "1.25rem", fontWeight: 600 }}>จองคิวล่วงหน้า<br />สะดวก รวดเร็ว ไม่ต้องรอนาน</h3>
              <Link
                href="/book"
                className="flex items-center gap-2 px-6 py-3 rounded-full text-sm transition-opacity hover:opacity-85"
                style={{ backgroundColor: "#C08552", color: "#ffffff" }}
              >
                <Calendar className="w-4 h-4" />
                จองคิวเลย
              </Link>
            </div>
          </div>
        </div>
      </section>

      <AIChatPopup mode="customer" />
    </div>
  );
}
