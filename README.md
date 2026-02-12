# 📊 MIS Dashboard

ระบบ Management Information System (MIS) Dashboard สำหรับการจัดการและวิเคราะห์ข้อมูลทางธุรกิจ..

## 🎯 คุณสมบัติหลัก

### 📈 4 โมดูลหลัก

1. **Accounting (บัญชี)**
   - งบกำไรขาดทุน (P&L Statement)
   - งบดุล (Balance Sheet)
   - กระแสเงินสด (Cash Flow)
   - อายุลูกหนี้/เจ้าหนี้ (AR/AP Aging)
   - รายรับ/รายจ่ายแยกตามประเภท

2. **Sales (ขาย)**
   - ภาพรวมยอดขาย และ KPIs
   - แนวโน้มยอดขาย
   - สินค้าขายดี
   - ยอดขายตามสาขา/พนักงานขาย
   - ลูกค้า VIP
   - สถานะลูกหนี้

3. **Purchase (จัดซื้อ)**
   - ภาพรวมการจัดซื้อ และ KPIs
   - แนวโน้มการจัดซื้อ
   - ซัพพลายเออร์หลัก
   - การซื้อตามหมวดสินค้า/แบรนด์
   - เจ้าหนี้คงค้าง

4. **Inventory (คลังสินค้า)**
   - มูลค่าสินค้าคงคลัง
   - การเคลื่อนไหวสต็อก
   - สินค้าใกล้หมด/เกินคลัง
   - สินค้าหมุนเวียนช้า
   - อัตราหมุนเวียนสินค้า
   - สต็อกแยกตามสาขา

### 🔐 ระบบสิทธิ์การเข้าถึง

- **Component-level Permission**: ควบคุมการแสดงผลแต่ละ Component แยกกัน
- **3 ระดับสิทธิ์**: `none`, `view`, `full`
- **5 Roles พื้นฐาน**:
  - Admin - เข้าถึงทุกอย่าง
  - Manager - ดูได้ทุก Module
  - Sales - เข้าถึง Sales + บางส่วนของ Inventory
  - Purchase - เข้าถึง Purchase + Inventory
  - Accountant - เข้าถึง Accounting + financial data

### 🎨 UI/UX Features

- ✅ Responsive Design - ใช้งานได้ทุกอุปกรณ์
- ✅ Dark Mode Support
- ✅ Modern & Minimal Design
- ✅ Interactive Charts (ECharts)
- ✅ Loading States & Error Handling
- ✅ Tailwind CSS v4

---

## 🚀 เริ่มต้นใช้งาน

### ข้อกำหนดระบบ

- Node.js 18+
- npm หรือ yarn
- ClickHouse Database (สำหรับ Production)

### การติดตั้ง

```bash
# Clone repository
git clone [repository-url]
cd dashboard

# ติดตั้ง dependencies
npm install

# รัน development server
npm run dev
```

เปิดเบราว์เซอร์ไปที่ [http://localhost:3000](http://localhost:3000)

---

## 📁 โครงสร้างโปรเจค

```
dashboard/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── accounting/           # Accounting module
│   │   ├── sales/                # Sales module
│   │   ├── purchase/             # Purchase module
│   │   ├── inventory/            # Inventory module
│   │   └── api/                  # API routes
│   ├── components/               # React components
│   └── lib/                      # Utilities & helpers
│       ├── data/                 # Data layer
│       └── permissions/          # Permission system
├── docs/                         # Documentation
└── README.md                     # This file
```

---

## 🛠️ เทคโนโลยีที่ใช้

- **Next.js 15** - React framework
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Utility-first CSS
- **ECharts** - Data visualization
- **ClickHouse** - Analytics database

---

## 📚 เอกสารเพิ่มเติม

- [Permission System Guide](docs/PERMISSION_SYSTEM.md)
- [Add Permissions Guide](docs/ADD_PERMISSIONS_GUIDE.md)
- [Development Plan](plan%20develop.md)

---

## 🔧 Scripts

```bash
npm run dev          # รัน dev server
npm run build        # Build สำหรับ production
npm run start        # รัน production server
npm run lint         # ตรวจสอบ code style
```

---

## 🧪 การทดสอบ Permission

แก้ไขไฟล์ `src/lib/permissions/mockData.ts`:

```typescript
export function getMockCurrentUser(): User {
  return mockUsers[0]; // Admin
  // return mockUsers[1]; // Manager
  // return mockUsers[2]; // Sales
  // return mockUsers[3]; // Purchase
  // return mockUsers[4]; // Accountant
}
```

---

**Built with ❤️ using Next.js + TypeScript + Tailwind CSS**
