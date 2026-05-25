import { useEffect, useState } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2, X } from "lucide-react";

interface ServiceItem {
  id: string;
  name: string;
  category: "men" | "women" | "other";
  price: number;
  duration_minutes: number;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
}

export function AdminMenuPage() {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [form, setForm] = useState({ name: "", category: "men" as "men" | "women" | "other", price: "", duration: "", description: "", imageUrl: "" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadServices = async () => {
    const response = await fetch("/api/admin/services");
    if (!response.ok) return;

    const payload = await response.json() as { items?: ServiceItem[] };
    setItems(payload.items || []);
  };

  useEffect(() => {
    let active = true;

    void (async () => {
      const response = await fetch("/api/admin/services");
      if (!response.ok || !active) return;

      const payload = await response.json() as { items?: ServiceItem[] };
      if (active) setItems(payload.items || []);
    })();

    return () => {
      active = false;
    };
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", category: "men", price: "", duration: "", description: "", imageUrl: "" });
    setModalOpen(true);
  };

  const openEdit = (item: ServiceItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      price: String(item.price),
      duration: String(item.duration_minutes),
      description: item.description || "",
      imageUrl: item.image_url || "",
    });
    setModalOpen(true);
  };

  const deleteItem = async (id: string) => {
    const response = await fetch(`/api/admin/services?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      setErrorMessage("ลบไม่สำเร็จ");
      return;
    }
    await loadServices();
  };

  const saveForm = async () => {
    setErrorMessage(null);
    if (!form.name || !form.price) return;
    const payload = {
      name: form.name,
      category: form.category,
      price: Number(form.price),
      duration_minutes: Number(form.duration || 30),
      description: form.description || null,
      image_url: form.imageUrl || null,
      is_active: true,
    };

    if (editing) {
      const response = await fetch(`/api/admin/services?id=${encodeURIComponent(editing.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setErrorMessage("บันทึกไม่สำเร็จ");
        return;
      }
    } else {
      const response = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setErrorMessage("เพิ่มเมนูไม่สำเร็จ");
        return;
      }
    }
    await loadServices();
    setModalOpen(false);
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl text-sm outline-none";
  const inputStyle = { backgroundColor: "#f5e9db", color: "#4B2E2B", border: "1.5px solid rgba(192,133,82,0.25)" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ color: "#4B2E2B", fontSize: "1.5rem", fontWeight: 700 }}>จัดการเมนู</h1>
          <p className="text-sm mt-1" style={{ color: "#8C5A3C" }}>เพิ่ม แก้ไข หรือลบทรงผมในร้าน</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-opacity hover:opacity-85"
          style={{ backgroundColor: "#C08552", color: "#ffffff" }}
        >
          <Plus className="w-4 h-4" />
          เพิ่มทรงผม
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex gap-3">
          {[
            { label: `ผู้ชาย ${items.filter(i => i.category === "men").length} ทรง`, color: "#C08552" },
            { label: `ผู้หญิง ${items.filter(i => i.category === "women").length} ทรง`, color: "#8C5A3C" },
            { label: `ทั้งหมด ${items.length} ทรง`, color: "#4B2E2B" },
          ].map(c => (
          <span key={c.label} className="px-3 py-1.5 rounded-full text-xs" style={{ backgroundColor: `${c.color}15`, color: c.color }}>
            {c.label}
          </span>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 16px rgba(75,46,43,0.07)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#f5e9db" }}>
                {["ชื่อทรงผม", "ประเภท", "ราคา", "เวลา (นาที)", "รายละเอียด", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs" style={{ color: "#8C5A3C", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} style={{ borderBottom: "1px solid rgba(192,133,82,0.1)", backgroundColor: i % 2 === 0 ? "transparent" : "rgba(192,133,82,0.02)" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Image src={item.image_url || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&fit=crop"} alt={item.name} width={40} height={40} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      <span style={{ color: "#4B2E2B", fontWeight: 500 }}>{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 rounded-full text-xs" style={{ backgroundColor: item.category === "men" ? "#C0855220" : "#8C5A3C20", color: item.category === "men" ? "#C08552" : "#8C5A3C" }}>
                      {item.category === "men" ? "ผู้ชาย" : item.category === "women" ? "ผู้หญิง" : "อื่นๆ"}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: "#C08552", fontWeight: 600 }}>฿{item.price}</td>
                  <td className="px-4 py-3" style={{ color: "#4B2E2B" }}>{item.duration_minutes}</td>
                  <td className="px-4 py-3 text-xs max-w-40" style={{ color: "#8C5A3C" }}>
                    <span className="line-clamp-2">{item.description}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(item)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#C0855220", color: "#C08552" }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteItem(item.id)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#EF444420", color: "#EF4444" }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(75,46,43,0.4)" }}>
          <div className="w-full max-w-md rounded-3xl overflow-hidden" style={{ backgroundColor: "#ffffff" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(192,133,82,0.15)" }}>
              <h3 style={{ color: "#4B2E2B", fontWeight: 600 }}>{editing ? "แก้ไขทรงผม" : "เพิ่มทรงผม"}</h3>
              <button onClick={() => setModalOpen(false)}><X className="w-5 h-5" style={{ color: "#8C5A3C" }} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: "#8C5A3C" }}>ชื่อทรงผม</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ชื่อทรงผม" className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: "#8C5A3C" }}>ประเภท</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as "men" | "women" | "other" }))} className={inputClass} style={{ ...inputStyle, appearance: "none" }}>
                  <option value="men">ผู้ชาย</option>
                  <option value="women">ผู้หญิง</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: "#8C5A3C" }}>ราคา (฿)</label>
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: "#8C5A3C" }}>เวลา (นาที)</label>
                  <input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="30" className={inputClass} style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: "#8C5A3C" }}>รายละเอียด</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="คำอธิบายสั้นๆ" className={inputClass + " resize-none"} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: "#8C5A3C" }}>รูปภาพ URL</label>
                <input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." className={inputClass} style={inputStyle} />
              </div>
              {errorMessage && <p className="text-xs" style={{ color: "#d4183d" }}>{errorMessage}</p>}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm" style={{ backgroundColor: "#f5e9db", color: "#8C5A3C" }}>ยกเลิก</button>
              <button onClick={saveForm} className="flex-1 py-2.5 rounded-xl text-sm" style={{ backgroundColor: "#C08552", color: "#ffffff", fontWeight: 600 }}>
                {editing ? "บันทึก" : "เพิ่มเมนู"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
