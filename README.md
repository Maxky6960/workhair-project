# Workhair

ระบบเว็บไซต์และหลังบ้านสำหรับร้านทำผม Workhair พัฒนาเพื่อช่วยให้ลูกค้าดูบริการ จองคิว และสอบถามข้อมูลร้านได้สะดวกขึ้น พร้อมระบบจัดการคิว เมนูบริการ รายงานยอดขาย การตั้งค่าร้าน และ AI Assistant สำหรับช่วยตอบคำถามหรือสนับสนุนงานแอดมิน

## ภาพรวมโปรเจกต์

Workhair เป็นเว็บแอปสำหรับร้านทำผมที่ออกแบบให้รองรับทั้งฝั่งลูกค้าและฝั่งผู้ดูแลร้านในระบบเดียว ลูกค้าสามารถเลือกบริการ สมัคร/เข้าสู่ระบบ จองคิว และติดตามคิวได้ ส่วนแอดมินสามารถจัดการบริการ ดูแดชบอร์ด ควบคุมสถานะคิว ตั้งค่าร้าน และเปิดใช้งาน AI/RAG เพื่อช่วยตอบคำถามจากฐานความรู้ของร้าน

อ่านแนวคิดการ pivot และปัญหาธุรกิจที่ระบบนี้ต้องการแก้ได้ที่ [PIVOT.md](./PIVOT.md)

## ฟีเจอร์หลัก

- หน้าแรกสำหรับนำเสนอร้าน บริการยอดนิยม เวลาเปิดทำการ และทางลัดไปยังหน้าจองคิว
- ระบบสมัครสมาชิกและเข้าสู่ระบบด้วย Supabase Auth
- ระบบจองคิวพร้อมเลือกบริการ วันที่ เวลา เบอร์โทร และหมายเหตุเพิ่มเติม
- หน้าแสดงรายการบริการ แบ่งหมวดหมู่ เช่น ผู้ชาย ผู้หญิง และบริการอื่น ๆ
- หน้ายืนยันการจองพร้อมข้อมูลสรุปของลูกค้า
- ระบบหลังบ้านสำหรับแอดมิน
- แดชบอร์ดสรุปยอดขาย จำนวนลูกค้า ค่าเฉลี่ยต่อบิล และคิวย้อนหลัง
- ระบบจัดการคิว เปลี่ยนสถานะคิว และแก้ไขเวลานัดหมาย
- ระบบจัดการเมนูบริการ เพิ่ม แก้ไข ลบ ราคา รูปภาพ และระยะเวลาบริการ
- ระบบตั้งค่าข้อมูลร้าน เวลาเปิดทำการ ช่องทางติดต่อ และการแจ้งเตือน
- AI Chat สำหรับลูกค้าและแอดมิน เชื่อมต่อ Google Gemini API
- RAG/Knowledge Base สำหรับให้ AI อ้างอิงข้อมูลร้าน เช่น FAQ ราคา นโยบาย และบริการ
- แจ้งเตือนการจองผ่าน Telegram Bot
- รองรับการรันแบบ Production ด้วย Docker

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth และ Supabase Database
- Google Gemini API และ Text Embedding
- React Hook Form
- Recharts
- Radix UI Components
- Lucide React Icons
- Docker และ Docker Compose

## โครงสร้างโปรเจกต์

```text
workhair-project/
├── README.md
├── PIVOT.md
└── frontend/
    ├── app/
    │   ├── (customer)/          # หน้าเว็บฝั่งลูกค้า
    │   ├── admin/               # หน้าเว็บฝั่งแอดมิน
    │   ├── api/                 # API Routes
    │   └── auth/                # Auth callback
    ├── components/              # React components หลักของระบบ
    ├── lib/
    │   ├── auth/                # helper สำหรับตรวจสิทธิ์แอดมิน
    │   ├── notifications/       # Telegram notification
    │   └── supabase/            # Supabase client/server config
    ├── public/
    ├── Dockerfile
    ├── docker-compose.yml
    ├── package.json
    └── next.config.ts
```

## การติดตั้งและรันบนเครื่อง

ต้องมี Node.js 20 หรือใหม่กว่า และ npm ติดตั้งไว้ในเครื่อง

```bash
cd frontend
npm install
npm run dev
```

เปิดเว็บที่:

```text
http://localhost:3000
```

## Environment Variables

สร้างไฟล์ `.env.local` ในโฟลเดอร์ `frontend` แล้วกำหนดค่าที่จำเป็นตามตัวอย่างด้านล่าง

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

GOOGLE_AI_API_KEY=your_google_ai_api_key
GOOGLE_AI_MODEL_NAME=gemini-2.5-flash-lite

TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

หมายเหตุ: ค่าที่เป็น secret เช่น `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_AI_API_KEY`, `TELEGRAM_BOT_TOKEN` และ `TELEGRAM_CHAT_ID` ต้องเก็บไว้ฝั่ง server เท่านั้น ห้ามนำไปใส่ในโค้ดฝั่ง client หรือ commit ขึ้น repository

## คำสั่งที่ใช้บ่อย

```bash
npm run dev      # รัน development server
npm run build    # build สำหรับ production
npm run start    # รัน production server หลัง build
npm run lint     # ตรวจ lint
```

## การรันด้วย Docker

โปรเจกต์มี `Dockerfile` และ `docker-compose.yml` สำหรับรัน frontend ในโหมด production

```bash
cd frontend
docker compose up --build -d
```

ระบบจะเปิดใช้งานที่ port `3000`

```text
http://localhost:3000
```

สำหรับ production ให้สร้างไฟล์ `.env.production` ในโฟลเดอร์ `frontend` และกำหนด environment variables ให้ครบก่อนรัน Docker Compose

## สิทธิ์ผู้ใช้

- ลูกค้าทั่วไปสามารถสมัครสมาชิก เข้าสู่ระบบ ดูบริการ และจองคิวได้
- ผู้ดูแลระบบสามารถเข้าหน้า `/admin` เพื่อดูแดชบอร์ด จัดการคิว จัดการเมนู และตั้งค่าร้านได้
- การตรวจสิทธิ์แอดมินอ้างอิงข้อมูลจาก Supabase และ RPC/ตารางโปรไฟล์ในฐานข้อมูล

## AI และ RAG

ระบบ AI ใช้ Google Gemini API สำหรับตอบคำถาม โดยแบ่งการทำงานเป็น 2 โหมด

- Customer AI: ช่วยตอบคำถามทั่วไป เช่น ราคา เวลาเปิดทำการ การจองคิว และข้อมูลบริการ
- Admin AI: ช่วยแอดมินเขียนข้อความ สรุปรายงาน ตั้ง prompt และใช้ฐานความรู้ของร้าน

ในหน้าแอดมินสามารถเพิ่ม Knowledge Base หรือไฟล์ข้อมูล เช่น `.txt`, `.md`, `.json`, `.csv` เพื่อให้ระบบ chunk และ embed ข้อความ ก่อนนำ context ที่เกี่ยวข้องไปประกอบคำตอบของ AI

## Telegram Notification

เมื่อเปิดใช้งาน Telegram ในหน้าแอดมิน ระบบสามารถส่งแจ้งเตือนเมื่อมีการจองใหม่ โดยข้อความจะแสดงข้อมูลสำคัญ เช่น ชื่อลูกค้า เบอร์โทร บริการ วันเวลา รหัสคิว และลิงก์ไปยังหน้าจัดการคิว

## Production Checklist

- ตั้งค่า Supabase URL และ Publishable Key ให้ถูกต้อง
- ตั้งค่า Service Role Key เฉพาะฝั่ง server
- ตั้งค่า Google AI API Key หากต้องการใช้ AI Chat
- ตั้งค่า Telegram Bot Token และ Chat ID หากต้องการใช้ระบบแจ้งเตือน
- ตรวจสอบ RLS และ policy ใน Supabase ก่อนเปิดใช้งานจริง
- รัน `npm run build` เพื่อตรวจสอบความพร้อมก่อน deploy
- ตรวจสอบ URL ใน `NEXT_PUBLIC_SITE_URL` และ `NEXT_PUBLIC_APP_URL` ให้ตรงกับ domain จริง

## เป้าหมายของระบบ

โปรเจกต์นี้ถูกออกแบบมาเพื่อลดงานตอบคำถามซ้ำ ๆ ของแอดมิน เพิ่มความสะดวกให้ลูกค้าในการจองคิว และทำให้ร้าน Workhair มีระบบจัดการหลังบ้านที่เป็นระเบียบ วัดผลได้ และพร้อมต่อยอดสู่การใช้งานจริง
