import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ChatMode = "customer" | "admin";

type ChatMessage = {
  role: "user" | "bot";
  text: string;
};

type AdminAiSettings = {
  ai_model_name: string | null;
  ai_system_prompt: string | null;
  rag_enabled: boolean | null;
  rag_content: string | null;
};

type ShopSettings = {
  shop_name: string | null;
  address: string | null;
  phone: string | null;
  open_hours: string | null;
  line_id: string | null;
};

type TodayRevenueSummary = {
  totalRevenue: number;
  completedCount: number;
  bookedCount: number;
  pendingCount: number;
};

type EmbeddingResponse = {
  embedding?: { values?: number[] };
  error?: { message?: string };
};

const fallbackModels = ["gemini-3.1-flash-lite", "gemini-3.1-flash", "gemini-2.5-flash-lite", "gemini-2.5-flash"];
const defaultCustomerModel = (process.env.GOOGLE_AI_MODEL_NAME || "gemini-3.1-flash-lite").toLowerCase();
const embeddingModel = "text-embedding-004";

const systemPrompts: Record<ChatMode, string> = {
  customer: [
    "คุณคือผู้ช่วยของร้านทำผม Workhair ตอบเป็นภาษาไทย สุภาพ กระชับ เป็นธรรมชาติ",
    "ข้อมูลร้านที่ใช้ตอบได้: ร้านเปิดทุกวัน 09:00-20:00, รับจองคิวผ่านเว็บ, รับชำระเงินสด/โอน/QR Code",
    "หากไม่แน่ใจเรื่องข้อมูลจริง ให้บอกตรง ๆ และแนะนำให้ติดต่อร้าน",
  ].join("\n"),
  admin: [
    "คุณคือผู้ช่วยแอดมินของร้าน Workhair ตอบเป็นภาษาไทย กระชับ และใช้งานได้จริง",
    "ช่วยเรื่องรายงาน สรุปงาน เขียนข้อความ โปรโมชัน และการตั้งค่าระบบได้",
    "ห้ามเดาตัวเลขยอดขายหรือข้อมูลลูกค้าจริง ถ้าไม่มีข้อมูลจริงให้บอกว่าต้องเชื่อมต่อฐานข้อมูลก่อน",
  ].join("\n"),
};

const normalizeModelName = (value: string | null | undefined) => (value || "").trim().toLowerCase();

const shouldHandleCustomerLocation = (message: string) => {
  const lower = message.toLowerCase();
  return (
    lower.includes("ที่ตั้ง") ||
    lower.includes("ที่อยู่") ||
    lower.includes("พิกัด") ||
    lower.includes("location") ||
    lower.includes("map")
  );
};

const shouldHandleTodayRevenue = (message: string) => {
  const lower = message.toLowerCase();
  const hasRevenueWord = lower.includes("รายได้") || lower.includes("ยอด") || lower.includes("revenue") || lower.includes("sales");
  const hasTodayWord = lower.includes("วันนี้") || lower.includes("today");
  return hasRevenueWord && hasTodayWord;
};

const getBangkokDateRangeIso = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === "year")?.value || "0");
  const month = Number(parts.find((part) => part.type === "month")?.value || "0");
  const day = Number(parts.find((part) => part.type === "day")?.value || "0");

  const bangkokOffsetMs = 7 * 60 * 60 * 1000;
  const startUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0) - bangkokOffsetMs;
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000;

  return {
    startIso: new Date(startUtcMs).toISOString(),
    endIso: new Date(endUtcMs).toISOString(),
  };
};

async function getTodayRevenueSummary(): Promise<TodayRevenueSummary | null> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data: isAdmin, error: isAdminError } = await supabase.rpc("is_current_user_admin");
  if (isAdminError || isAdmin !== true) return null;

  const { startIso, endIso } = getBangkokDateRangeIso();
  const { data, error } = await supabase
    .from("bookings")
    .select("service_price,status")
    .gte("appointment_at", startIso)
    .lt("appointment_at", endIso);

  if (error || !data) return null;

  let totalRevenue = 0;
  let completedCount = 0;
  let pendingCount = 0;

  for (const row of data) {
    if (row.status === "completed") {
      totalRevenue += Number(row.service_price || 0);
      completedCount += 1;
    }
    if (row.status === "pending") pendingCount += 1;
  }

  return {
    totalRevenue,
    completedCount,
    bookedCount: data.length,
    pendingCount,
  };
}

const chunkText = (text: string) => {
  const paragraphs = text.split(/\n\s*\n/g).map((part) => part.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs.length ? paragraphs : [text]) {
    if (!paragraph) continue;
    if ((current + "\n\n" + paragraph).length > 900 && current) {
      chunks.push(current);
      current = paragraph;
      continue;
    }
    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }

  if (current) chunks.push(current);
  return chunks.slice(0, 8);
};

const cosineSimilarity = (a: number[], b: number[]) => {
  const length = Math.min(a.length, b.length);
  if (!length) return 0;

  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let index = 0; index < length; index += 1) {
    const valueA = a[index] || 0;
    const valueB = b[index] || 0;
    dot += valueA * valueB;
    magnitudeA += valueA * valueA;
    magnitudeB += valueB * valueB;
  }

  const denominator = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
  return denominator ? dot / denominator : 0;
};

async function embedText(apiKey: string, text: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${embeddingModel}:embedContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: {
        parts: [{ text }],
      },
    }),
  });

  const data = await response.json().catch(() => null) as EmbeddingResponse | null;
  if (!response.ok) throw new Error(data?.error?.message || "Embedding request failed");

  const values = data?.embedding?.values;
  if (!values?.length) throw new Error("Embedding response missing values");
  return values;
}

function buildModelCandidates(selectedModel: string, message: string) {
  if (!selectedModel || selectedModel === "auto") {
    return message.length > 900
      ? ["gemini-3.1-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-1.5-flash"]
      : ["gemini-3.1-flash-lite", "gemini-3.1-flash", "gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-1.5-flash"];
  }

  return [selectedModel, ...fallbackModels.filter((model) => model !== selectedModel)];
}

const fallbackReply = (mode: ChatMode, text: string) => {
  const lower = text.toLowerCase();

  const customerReplies: Record<string, string> = {
    ราคา: "ทรงผมผู้ชาย เริ่มต้น ฿120 - ฿250 | ทรงผมผู้หญิง เริ่มต้น ฿200 - ฿400 ค่ะ",
    price: "ทรงผมผู้ชาย เริ่มต้น ฿120 - ฿250 | ทรงผมผู้หญิง เริ่มต้น ฿200 - ฿400 ค่ะ",
    เปิด: "เปิดทุกวัน 09:00 - 20:00 น. ค่ะ",
    เวลา: "เปิดทุกวัน 09:00 - 20:00 น. ค่ะ",
    จอง: "จองคิวได้จากหน้าเว็บได้เลยค่ะ",
    ชำระ: "รับชำระเงินสด โอน และ QR Code ค่ะ",
    จ่าย: "รับชำระเงินสด โอน และ QR Code ค่ะ",
  };

  const adminReplies: Record<string, string> = {
    ยอด: "ถ้าต่อฐานข้อมูลแล้ว ฉันช่วยสรุปยอดได้ทันทีค่ะ",
    รายงาน: "ฉันช่วยเขียน/สรุปรายงานได้ แต่ตอนนี้ยังไม่ได้เชื่อมข้อมูลจริงค่ะ",
    caption: "ส่งหัวข้อ caption มาได้เลย เดี๋ยวช่วยเขียนให้ค่ะ",
    telegram: "Telegram ต้องตั้งค่าคีย์ฝั่ง server ผ่าน `.env.local` ค่ะ",
  };

  const dict = mode === "admin" ? adminReplies : customerReplies;
  for (const key of Object.keys(dict)) {
    if (lower.includes(key)) return dict[key];
  }

  return mode === "admin"
    ? "บอกโจทย์มาได้เลย เช่น สรุปยอด เขียน caption หรือช่วยตั้งค่าระบบ"
    : "ถามเรื่องราคา เวลาเปิดปิด หรือการจองคิวได้เลยค่ะ";
};

const toGeminiRole = (role: ChatMessage["role"]) => (role === "user" ? "user" : "model");

async function loadAdminSettings() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) return null;

  const { data: isAdmin, error } = await supabase.rpc("is_current_user_admin");

  if (error || isAdmin !== true) return null;

  const { data } = await supabase
    .from("admin_settings")
    .select("ai_model_name,ai_system_prompt,rag_enabled,rag_content")
    .eq("id", 1)
    .maybeSingle<AdminAiSettings>();

  return data || null;
}

async function loadShopSettings() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shop_settings")
    .select("shop_name,address,phone,open_hours,line_id")
    .eq("id", 1)
    .maybeSingle<ShopSettings>();

  return data || null;
}

const formatShopInfoForReply = (shop: ShopSettings | null) => {
  const shopName = shop?.shop_name?.trim() || "Workhair";
  const address = shop?.address?.trim();
  const phone = shop?.phone?.trim();
  const lineId = shop?.line_id?.trim();

  if (!address) {
    return `${shopName} ยังไม่ได้ตั้งค่าที่อยู่ร้านแบบละเอียดในระบบตอนนี้ค่ะ รบกวนติดต่อร้านโดยตรง${phone ? `ที่ ${phone}` : ""} เพื่อยืนยันพิกัดล่าสุดนะคะ`;
  }

  return [
    `ที่ตั้งร้าน ${shopName}:`,
    address,
    phone ? `โทร: ${phone}` : "",
    lineId ? `Line: ${lineId}` : "",
  ].filter(Boolean).join("\n");
};

async function buildRagContext(apiKey: string, prompt: string, ragContent: string) {
  const chunks = chunkText(ragContent);
  if (!chunks.length) return "";

  const queryEmbedding = await embedText(apiKey, prompt);
  const scoredChunks = [] as Array<{ text: string; score: number }>;

  for (const chunk of chunks) {
    try {
      const chunkEmbedding = await embedText(apiKey, chunk);
      scoredChunks.push({ text: chunk, score: cosineSimilarity(queryEmbedding, chunkEmbedding) });
    } catch {
      continue;
    }
  }

  return scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item, index) => `${index + 1}. ${item.text}`)
    .join("\n");
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return Response.json({ error: "Missing GOOGLE_AI_API_KEY" }, { status: 500 });

  let payload: { mode?: ChatMode; message?: string; history?: ChatMessage[] };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mode = payload.mode === "admin" ? "admin" : "customer";
  const message = payload.message?.trim();

  if (!message) {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  if (mode === "admin" && shouldHandleTodayRevenue(message)) {
    const todaySummary = await getTodayRevenueSummary();
    if (todaySummary) {
      return Response.json({
        reply: `สรุปรายได้วันนี้ (เฉพาะคิวที่เสร็จสิ้น): ${todaySummary.totalRevenue.toLocaleString("th-TH")} บาท\nคิวเสร็จสิ้น: ${todaySummary.completedCount} คิว | คิวทั้งหมดวันนี้: ${todaySummary.bookedCount} คิว | รอยืนยัน: ${todaySummary.pendingCount} คิว`,
        fromData: true,
      });
    }
  }

  if (mode === "customer" && shouldHandleCustomerLocation(message)) {
    const shopSettings = await loadShopSettings();
    return Response.json({
      reply: formatShopInfoForReply(shopSettings),
      fromData: true,
    });
  }

  const adminSettings = mode === "admin" ? await loadAdminSettings() : null;
  const shopSettings = mode === "customer" ? await loadShopSettings() : null;
  const selectedModel = mode === "admin"
    ? normalizeModelName(adminSettings?.ai_model_name || process.env.GOOGLE_AI_MODEL_NAME)
    : defaultCustomerModel;

  const customPrompt = mode === "admin" ? adminSettings?.ai_system_prompt?.trim() || "" : "";
  const ragContent = mode === "admin" && adminSettings?.rag_enabled ? adminSettings.rag_content?.trim() || "" : "";

  const history = (payload.history || [])
    .filter((item): item is ChatMessage => Boolean(item?.text) && (item.role === "user" || item.role === "bot"))
    .slice(-8)
    .map((item) => ({
      role: toGeminiRole(item.role),
      parts: [{ text: item.text }],
    }));

  let ragContext = "";
  if (ragContent) {
    try {
      ragContext = await buildRagContext(apiKey, message, ragContent);
    } catch {
      ragContext = "";
    }
  }

  const systemInstruction = [
    systemPrompts[mode],
    mode === "customer" && shopSettings
      ? `\n\nข้อมูลร้านจากฐานข้อมูล (ให้ยึดข้อมูลนี้ก่อน):\n- ชื่อร้าน: ${shopSettings.shop_name || "Workhair"}\n- ที่อยู่: ${shopSettings.address || "ไม่พบข้อมูล"}\n- เบอร์โทร: ${shopSettings.phone || "ไม่พบข้อมูล"}\n- Line: ${shopSettings.line_id || "ไม่พบข้อมูล"}\n- เวลาเปิดปิด(raw): ${shopSettings.open_hours || "ไม่พบข้อมูล"}`
      : "",
    customPrompt ? `\n\nSystem prompt from admin settings:\n${customPrompt}` : "",
    ragContext ? `\n\nRAG context (use only if relevant):\n${ragContext}` : "",
  ].join("");

  const body = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      ...history,
      {
        role: "user",
        parts: [{ text: message }],
      },
    ],
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 256,
    },
  };

  const models = buildModelCandidates(selectedModel, message);

  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);
      const reply = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();

      if (!response.ok || !reply) {
        continue;
      }

      return Response.json({ reply, model });
    } catch {
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }

  return Response.json({ reply: fallbackReply(mode, message), fallback: true }, { status: 200 });
}
