"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  id: number;
  role: "user" | "bot";
  text: string;
}

interface AIChatPopupProps {
  mode?: "customer" | "admin";
}

export function AIChatPopup({ mode = "customer" }: AIChatPopupProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "bot",
      text: mode === "admin"
        ? "สวัสดีครับ/ค่ะ แอดมิน! ผมช่วยสรุปงาน เขียน caption หรือช่วยตอบคำถามได้ครับ"
        : "สวัสดีค่ะ! ยินดีต้อนรับสู่ Workhair 💇 มีอะไรให้ช่วยไหมคะ?",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(1);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = async () => {
    const text = input.trim();
    if (!text || typing) return;

    const history = messages.slice(-6);
    const userMsg: Message = { id: idRef.current++, role: "user", text };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, message: text, history }),
      });

      const data = await response.json().catch(() => null);
      const reply = data?.reply || (mode === "admin"
        ? "ลองถามเรื่องยอดขาย, ลูกค้า, caption หรือสรุปรายงานได้นะครับ"
        : "ขอโทษนะคะ ไม่เข้าใจคำถามค่ะ ลองถามเรื่องราคา เวลาเปิดปิด หรือวิธีจองคิวได้เลยค่ะ");

      setMessages((prev) => [...prev, { id: idRef.current++, role: "bot", text: reply }]);

      if (data?.fallback) {
        setErrorMessage("AI ยังไม่พร้อมใช้งานเต็มที่ ใช้คำตอบสำรองอยู่");
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: idRef.current++,
        role: "bot",
        text: mode === "admin"
          ? "ลองถามเรื่องยอดขาย, ลูกค้า, caption หรือสรุปรายงานได้นะครับ"
          : "ขอโทษนะคะ ไม่เข้าใจคำถามค่ะ ลองถามเรื่องราคา เวลาเปิดปิด หรือวิธีจองคิวได้เลยค่ะ",
      }]);
      setErrorMessage("เชื่อมต่อ AI ไม่สำเร็จ");
    } finally {
      setTyping(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-4 z-50 w-80 rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: "#ffffff", border: "1px solid rgba(192,133,82,0.25)" }}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: "#C08552" }}>
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-white" />
                <span className="text-white text-sm">
                  {mode === "admin" ? "Workhair AI (Gemini)" : "Workhair AI"}
                </span>
                <span className="w-2 h-2 bg-green-300 rounded-full"></span>
              </div>
              <button onClick={() => setOpen(false)}>
                <Minimize2 className="w-4 h-4 text-white/80 hover:text-white" />
              </button>
            </div>

            <div className="h-72 overflow-y-auto p-3 space-y-2" style={{ backgroundColor: "#FFF8F0" }}>
              {errorMessage && (
                <div className="text-[11px] px-3 py-2 rounded-xl" style={{ backgroundColor: "#FFF3E0", color: "#8C5A3C" }}>
                  {errorMessage}
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap"
                    style={
                      msg.role === "user"
                        ? { backgroundColor: "#C08552", color: "#ffffff", borderBottomRightRadius: "4px" }
                        : { backgroundColor: "#ffffff", color: "#4B2E2B", borderBottomLeftRadius: "4px", border: "1px solid rgba(192,133,82,0.2)" }
                    }
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-2xl text-sm" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(192,133,82,0.2)" }}>
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C08552] animate-bounce" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C08552] animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C08552] animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="p-3 border-t" style={{ borderColor: "rgba(192,133,82,0.2)" }}>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="พิมพ์ข้อความ..."
                  className="flex-1 px-3 py-2 rounded-full text-sm outline-none"
                  style={{ backgroundColor: "#f5e9db", color: "#4B2E2B", border: "1px solid rgba(192,133,82,0.2)" }}
                />
                <button
                  onClick={send}
                  disabled={typing}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-60"
                  style={{ backgroundColor: "#C08552" }}
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors"
        style={{ backgroundColor: open ? "#8C5A3C" : "#C08552" }}
      >
        {open ? <X className="w-6 h-6 text-white" /> : <Bot className="w-6 h-6 text-white" />}
      </motion.button>
    </>
  );
}
