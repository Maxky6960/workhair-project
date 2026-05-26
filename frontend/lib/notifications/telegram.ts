const TELEGRAM_API = "https://api.telegram.org";

type InlineKeyboardButton = {
  text: string;
  url?: string;
  callback_data?: string;
};

type TelegramReplyMarkup = {
  inline_keyboard: InlineKeyboardButton[][];
};

export const bookingStatusLabel = (status: string) => {
  switch (status) {
    case "waiting":
      return "รอดำเนินการ";
    case "pending":
      return "รอยืนยัน";
    case "confirmed":
      return "ยืนยันแล้ว";
    case "completed":
      return "เสร็จสิ้น";
    case "cancelled":
      return "ยกเลิก";
    case "no_show":
      return "ไม่มา";
    default:
      return status;
  }
};

export const bookingNextStepLabel = (status: string) => {
  switch (status) {
    case "pending":
      return "แนะนำ: กด 'ยืนยันแล้ว' เมื่อรับคิว";
    case "confirmed":
      return "แนะนำ: กด 'เสร็จสิ้น' เมื่อตัดผมเสร็จ";
    case "completed":
      return "งานจบแล้ว";
    case "cancelled":
      return "คิวถูกยกเลิก";
    case "no_show":
      return "ลูกค้าไม่มาตามนัด";
    case "waiting":
      return "รอดำเนินการโดยแอดมิน";
    default:
      return "ติดตามสถานะคิว";
  }
};

export async function sendTelegramMessage(text: string, replyMarkup?: TelegramReplyMarkup) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return { ok: false as const, reason: "missing_env" as const };

  const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: replyMarkup,
    }),
  });

  if (!response.ok) {
    return { ok: false as const, reason: "send_failed" as const };
  }

  return { ok: true as const };
}
