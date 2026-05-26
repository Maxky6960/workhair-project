import { useEffect, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { Save, Store, Clock, Bell, CheckCircle, ShieldAlert, Bot, FileText } from "lucide-react";
const defaultHours = {
  weekday: { open: "09:00", close: "20:00" },
  weekend: { open: "09:00", close: "20:00" },
  holiday: { open: "10:00", close: "18:00" },
};

const defaultNotifications = {
  enabled: false,
  dailyReport: true,
  reportTime: "21:00",
};

const geminiModelOptions = [
  "auto",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
];

const normalizeModelName = (value: string) => value.trim().toLowerCase().replace(/^models\//, "");

const normalizeModelOptions = (value: unknown) => {
  const options = Array.isArray(value) ? value : geminiModelOptions;
  const normalized = options
    .filter((item): item is string => typeof item === "string")
    .map(normalizeModelName)
    .filter((item) => item === "auto" || /^gemini-[a-z0-9.-]+$/.test(item));

  return Array.from(new Set(["auto", ...normalized]));
};

type SectionProps = {
  id: "shop" | "hours" | "ai" | "notifications";
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  title: string;
  children: ReactNode;
  onSave: (id: "shop" | "hours" | "ai" | "notifications") => void;
  saved: string | null;
};

function SettingsSection({ id, icon: Icon, title, children, onSave, saved }: SectionProps) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 16px rgba(75,46,43,0.07)" }}>
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(192,133,82,0.12)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#f5e9db" }}>
            <Icon className="w-4 h-4" style={{ color: "#C08552" }} />
          </div>
          <h2 style={{ color: "#4B2E2B", fontWeight: 600 }}>{title}</h2>
        </div>
        <button
          onClick={() => onSave(id)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
          style={saved === id ? { backgroundColor: "#22C55E18", color: "#22C55E" } : { backgroundColor: "#C08552", color: "#ffffff" }}
        >
          {saved === id ? <><CheckCircle className="w-4 h-4" />บันทึกแล้ว</> : <><Save className="w-4 h-4" />บันทึก</>}
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export function AdminSettings() {
  const [saved, setSaved] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [shopInfo, setShopInfo] = useState({
    name: "Workhair",
    address: "123 ถ.สุขุมวิท แขวงคลองเตย กรุงเทพฯ 10110",
    phone: "02-XXX-XXXX",
    lineId: "@workhair",
    facebook: "Workhair",
  });

  const [hours, setHours] = useState(defaultHours);

  const [aiSettings, setAiSettings] = useState({
    modelName: "auto",
    modelOptions: geminiModelOptions,
    systemPrompt: "",
    ragEnabled: false,
    ragContent: "",
  });
  const [newModelName, setNewModelName] = useState("");
  const [ragFileName, setRagFileName] = useState<string | null>(null);

  const [notifications, setNotifications] = useState(defaultNotifications);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      const response = await fetch("/api/admin/settings");

      if (!response.ok) {
        setErrorMessage("โหลดค่าตั้งค่าไม่สำเร็จ");
        setLoading(false);
        return;
      }

      const data = await response.json() as {
        shop?: { shop_name?: string; address?: string; phone?: string; open_hours?: string; line_id?: string; facebook?: string } | null;
        admin?: { telegram_enabled?: boolean; daily_report?: boolean; report_time?: string; ai_model_name?: string; ai_model_options?: unknown; ai_system_prompt?: string; rag_enabled?: boolean; rag_content?: string } | null;
      };

      const shopData = data.shop;
      const adminData = data.admin;

      if (shopData) {
        setShopInfo((prev) => ({
          ...prev,
          name: shopData.shop_name || prev.name,
          address: shopData.address || prev.address,
          phone: shopData.phone || prev.phone,
          lineId: shopData.line_id || prev.lineId,
          facebook: shopData.facebook || prev.facebook,
        }));

        if (shopData.open_hours) {
          try {
            const parsed = JSON.parse(shopData.open_hours);
            if (parsed.weekday && parsed.weekend && parsed.holiday) setHours(parsed);
          } catch {
            // keep default hours if parsing fails
          }
        }
      }

      if (adminData) {
        setNotifications({
          enabled: Boolean(adminData.telegram_enabled),
          dailyReport: Boolean(adminData.daily_report),
          reportTime: adminData.report_time || defaultNotifications.reportTime,
        });

        setAiSettings({
          modelName: adminData.ai_model_name || "auto",
          modelOptions: normalizeModelOptions(adminData.ai_model_options),
          systemPrompt: adminData.ai_system_prompt || "",
          ragEnabled: Boolean(adminData.rag_enabled),
          ragContent: adminData.rag_content || "",
        });
      }

      setLoading(false);
    };

    loadSettings();
  }, []);

  const handleSave = async (section: "shop" | "hours" | "ai" | "notifications") => {
    setErrorMessage(null);

    const response = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        section === "shop" || section === "hours"
          ? { section, shopInfo, hours }
          : section === "notifications"
            ? { section, notifications }
            : { section, aiSettings },
      ),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      setErrorMessage(payload?.error || "บันทึกค่าไม่สำเร็จ");
      return;
    }

    setSaved(section);
    setTimeout(() => setSaved(null), 2500);
  };

  const importRagFile = async (file: File | null) => {
    if (!file) return;

    const text = await file.text();
    setRagFileName(file.name);
    setAiSettings((current) => ({
      ...current,
      ragContent: text,
      ragEnabled: true,
    }));
  };

  const addAiModel = () => {
    const modelName = normalizeModelName(newModelName);

    if (!modelName || (modelName !== "auto" && !/^gemini-[a-z0-9.-]+$/.test(modelName))) {
      setErrorMessage("ชื่อโมเดลต้องเป็น auto หรือขึ้นต้นด้วย gemini-");
      return;
    }

    setErrorMessage(null);
    setAiSettings((current) => ({
      ...current,
      modelName,
      modelOptions: Array.from(new Set([...current.modelOptions, modelName])),
    }));
    setNewModelName("");
  };

  const removeAiModel = (modelName: string) => {
    if (modelName === "auto") return;

    setAiSettings((current) => {
      const modelOptions = current.modelOptions.filter((item) => item !== modelName);
      return {
        ...current,
        modelName: current.modelName === modelName ? "auto" : current.modelName,
        modelOptions,
      };
    });
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl text-sm outline-none";
  const inputStyle = { backgroundColor: "#f5e9db", color: "#4B2E2B", border: "1.5px solid rgba(192,133,82,0.2)" };

  return (
    <div className="space-y-6 max-w-7xl">
      {loading && <p className="text-sm" style={{ color: "#8C5A3C" }}>กำลังโหลดค่าตั้งค่า...</p>}
      {errorMessage && <p className="text-sm" style={{ color: "#d4183d" }}>{errorMessage}</p>}
      <div className="rounded-2xl px-5 py-4" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 16px rgba(75,46,43,0.07)" }}>
        <h1 style={{ color: "#4B2E2B", fontSize: "1.5rem", fontWeight: 700 }}>ตั้งค่า</h1>
        <p className="text-sm mt-1" style={{ color: "#8C5A3C" }}>จัดการข้อมูลร้านและการเชื่อมต่อ</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          {/* Shop info */}
          <SettingsSection id="shop" icon={Store} title="ข้อมูลร้าน" onSave={handleSave} saved={saved}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[
                { label: "ชื่อร้าน", key: "name" as const, placeholder: "ชื่อร้าน" },
                { label: "ที่อยู่", key: "address" as const, placeholder: "ที่อยู่ร้าน" },
                { label: "เบอร์โทรศัพท์", key: "phone" as const, placeholder: "0X-XXXX-XXXX" },
                { label: "Line ID", key: "lineId" as const, placeholder: "@lineid" },
                { label: "Facebook Page", key: "facebook" as const, placeholder: "ชื่อ Facebook Page" },
              ].map(f => (
                <div key={f.key} className={f.key === "address" ? "md:col-span-2 xl:col-span-3" : ""}>
                  <label className="text-xs mb-1.5 block" style={{ color: "#8C5A3C" }}>{f.label}</label>
                  <input value={shopInfo[f.key]} onChange={e => setShopInfo(s => ({ ...s, [f.key]: e.target.value }))} placeholder={f.placeholder} className={inputClass} style={inputStyle} />
                </div>
              ))}
            </div>
          </SettingsSection>
        </div>

        <div>
          {/* Hours */}
          <SettingsSection id="hours" icon={Clock} title="เวลาทำการ" onSave={handleSave} saved={saved}>
            <div className="grid grid-cols-1 gap-4">
              {[
                { label: "จันทร์ - ศุกร์", key: "weekday" as const },
                { label: "เสาร์ - อาทิตย์", key: "weekend" as const },
                { label: "วันหยุดนักขัตฤกษ์", key: "holiday" as const },
              ].map(row => (
                <div key={row.key} className="rounded-xl p-3" style={{ backgroundColor: "#fbf4ee", border: "1px solid rgba(192,133,82,0.12)" }}>
                  <label className="text-xs mb-2 block" style={{ color: "#8C5A3C" }}>{row.label}</label>
                  <div className="flex items-center gap-2">
                    <input type="time" value={hours[row.key].open} onChange={e => setHours(h => ({ ...h, [row.key]: { ...h[row.key], open: e.target.value } }))} className={inputClass} style={inputStyle} />
                    <span className="text-sm" style={{ color: "#8C5A3C" }}>ถึง</span>
                    <input type="time" value={hours[row.key].close} onChange={e => setHours(h => ({ ...h, [row.key]: { ...h[row.key], close: e.target.value } }))} className={inputClass} style={inputStyle} />
                  </div>
                </div>
              ))}
            </div>
          </SettingsSection>
        </div>

        <div className="xl:col-span-2">
          {/* AI */}
          <SettingsSection id="ai" icon={Bot} title="AI / RAG" onSave={handleSave} saved={saved}>
        <div className="space-y-5">
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: "#8C5A3C" }}>Model</label>
            <select
              value={aiSettings.modelName}
              onChange={(e) => setAiSettings((s) => ({ ...s, modelName: e.target.value }))}
              className={inputClass}
              style={inputStyle}
            >
              {aiSettings.modelOptions.map((model) => (
                <option key={model} value={model}>{model === "auto" ? "Auto switch" : model}</option>
              ))}
            </select>
            <p className="text-[11px] mt-1" style={{ color: "#8C5A3C" }}>เลือก auto เพื่อสลับ model อัตโนมัติ หรือเพิ่มชื่อโมเดล Gemini เองด้านล่าง</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAiModel();
                  }
                }}
                placeholder="เช่น gemini-2.5-pro"
                className={inputClass}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={addAiModel}
                className="px-4 py-2.5 rounded-xl text-sm whitespace-nowrap"
                style={{ backgroundColor: "#C08552", color: "#fff" }}
              >
                เพิ่มโมเดล
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {aiSettings.modelOptions.map((model) => (
                <span key={model} className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs" style={{ backgroundColor: "#fbf4ee", color: "#4B2E2B", border: "1px solid rgba(192,133,82,0.16)" }}>
                  {model}
                  {model !== "auto" && (
                    <button type="button" onClick={() => removeAiModel(model)} style={{ color: "#d4183d" }}>
                      ลบ
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-3" style={{ backgroundColor: "#fbf4ee", border: "1px solid rgba(192,133,82,0.12)" }}>
            <label className="text-xs mb-1.5 block" style={{ color: "#8C5A3C" }}>System Prompt</label>
            <textarea
              value={aiSettings.systemPrompt}
              onChange={(e) => setAiSettings((s) => ({ ...s, systemPrompt: e.target.value }))}
              rows={5}
              placeholder="วาง prompt หลักของแอดมินตรงนี้"
              className={`${inputClass} min-h-32 resize-y`}
              style={inputStyle}
            />
          </div>

          <div className="rounded-xl p-3" style={{ backgroundColor: "#fbf4ee", border: "1px solid rgba(192,133,82,0.12)" }}>
            <label className="text-xs mb-1.5 block" style={{ color: "#8C5A3C" }}>RAGFILE / Knowledge</label>
            <div className="flex items-center gap-3 mb-2">
              <input
                type="file"
                accept=".txt,.md,.json,.csv"
                onChange={(e) => void importRagFile(e.target.files?.[0] || null)}
                className="text-xs"
              />
              {ragFileName && <span className="text-[11px]" style={{ color: "#8C5A3C" }}>{ragFileName}</span>}
            </div>
            <textarea
              value={aiSettings.ragContent}
              onChange={(e) => setAiSettings((s) => ({ ...s, ragContent: e.target.value }))}
              rows={8}
              placeholder="วางข้อมูลความรู้, FAQ, หรือ prompt ที่ต้องการให้ AI ใช้อ้างอิงได้เลย"
              className={`${inputClass} min-h-40 resize-y`}
              style={inputStyle}
            />
            <div className="flex items-center justify-between mt-2 text-[11px]" style={{ color: "#8C5A3C" }}>
              <span>ระบบจะ chunk + embed ข้อความนี้ก่อนเอาไปค้น context</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAiSettings((s) => ({ ...s, ragEnabled: !s.ragEnabled }))}
                  className="px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: aiSettings.ragEnabled ? "#C08552" : "#e0d0c4", color: aiSettings.ragEnabled ? "#fff" : "#4B2E2B" }}
                >
                  {aiSettings.ragEnabled ? "RAG enabled" : "RAG disabled"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRagFileName(null);
                    setAiSettings((s) => ({ ...s, ragContent: "" }));
                  }}
                  className="px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: "#e0d0c4", color: "#4B2E2B" }}
                >
                  ล้างข้อมูล
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl p-3 text-xs flex gap-2" style={{ backgroundColor: "#FFF3E0", color: "#8C5A3C", border: "1px solid rgba(192,133,82,0.3)" }}>
            <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>ถ้าต้องการให้ตอบแม่นขึ้น ให้ใส่ข้อความสั้น ๆ แบบ FAQ หรือ policy ของร้านในช่อง RAGFILE</span>
          </div>
        </div>
      </SettingsSection>
        </div>

        <div>
          {/* Notifications */}
          <SettingsSection id="notifications" icon={Bell} title="Telegram / Notifications" onSave={handleSave} saved={saved}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: "#f5e9db" }}>
            <div>
              <p className="text-sm" style={{ color: "#4B2E2B", fontWeight: 500 }}>เปิดใช้งาน Telegram Bot</p>
              <p className="text-xs" style={{ color: "#8C5A3C" }}>รับการแจ้งเตือนผ่าน Telegram</p>
            </div>
            <button
              type="button"
              onClick={() => setNotifications(t => ({ ...t, enabled: !t.enabled }))}
              className="w-12 h-6 rounded-full transition-colors relative"
              style={{ backgroundColor: notifications.enabled ? "#C08552" : "#e0d0c4" }}
            >
              <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all" style={{ left: notifications.enabled ? "calc(100% - 1.375rem)" : "0.125rem" }} />
            </button>
          </div>
          <div className="rounded-xl p-3 text-xs flex gap-2" style={{ backgroundColor: "#FFF3E0", color: "#8C5A3C", border: "1px solid rgba(192,133,82,0.3)" }}>
            <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              ค่า secret เช่น <code>TELEGRAM_BOT_TOKEN</code>, <code>TELEGRAM_CHAT_ID</code>, <code>GITHUB_MODEL_API_KEY</code>, <code>GOOGLE_AI_API_KEY</code> ให้ใส่ใน <code>.env.local</code> บนเครื่อง/server ไม่ต้องกรอกในหน้าเว็บ
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm" style={{ color: "#4B2E2B" }}>
            <div className="rounded-xl p-3" style={{ backgroundColor: "#f5e9db" }}>
              <p className="font-medium">Telegram</p>
              <p className="text-xs mt-1" style={{ color: "#8C5A3C" }}>เปิดใช้การแจ้งเตือนและตั้งเวลารายงานได้จากหน้าเว็บ</p>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: "#f5e9db" }}>
              <p className="font-medium">API Keys</p>
              <p className="text-xs mt-1" style={{ color: "#8C5A3C" }}>ค่าลับถูกย้ายไปอยู่ใน environment แล้ว</p>
            </div>
          </div>
        </div>
      </SettingsSection>
        </div>
      </div>
    </div>
  );
}
