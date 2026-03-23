# BMR Mobile ERP - Design Concept

![Mobile ERP Mockup](mobile_erp_dashboard_mockup.png)
*(Note: Please ensure the mockup image is placed in this directory)*

## 1. Design Philosophy (UI/UX)
*   **Clean & Focused:** เน้นความสะอาดตา ข้อมูลสำคัญต้องเห็นชัด (Dashboard First)
*   **Brand Identity:** ใช้ธีมสีเขียว Emerald (`#10b981`) เป็นหลัก เพื่อความต่อเนื่องกับแอปเดิม
*   **Action-Oriented:** ปุ่มคำสั่งสำคัญ (Quick Actions) ต้องกดง่ายด้วยนิ้วโป้ง
*   **Mobile-First Workflow:** เน้นการใช้กล้อง (Scan), การ Swipe, และการแจ้งเตือน (Push Notifications)

## 2. Key Modules (ฟีเจอร์หลัก)

### 📊 1. Executive Dashboard (หน้าหลัก)
*   **Real-time Insights:** กราฟยอดขายวันนี้เปรียบเทียบกับเป้าหมาย
*   **Alerts:** แจ้งเตือนสินค้าใกล้หมด (Low Stock), คำขอที่รออนุมัติ (Pending Requests)
*   **Quick Actions:** ทางลัดเข้าเมนูที่ใช้บ่อย

### 📦 2. Inventory Management (คลังสินค้า)
*   **Stock Lookup:** สแกนบาร์โค้ดเพื่อดูจำนวนสินค้าทุกสาขา
*   **Stock Movement:** รับสินค้าเข้า (Unloading), โอนย้ายสินค้าระหว่างสาขา, ตัดสต็อกเสียหาย
*   **Stock Count:** ระบบนับสต็อก (Cycle Count) ผ่านมือถือ

### 🛍️ 3. Sales & Order (การขายและสั่งซื้อ)
*   **Mobile POS:** ขายสินค้าผ่านมือถือ (กรณีออกบูธ หรือจุดขายชั่วคราว)
*   **PO Approval:** ผู้บริหารกดอนุมัติใบสั่งซื้อ (Purchase Order) ได้ทันที

### 👥 4. HR & Team (จัดการทีม)
*   **Check-in/Out:** ลงเวลางานผ่าน GPS
*   **Task Assignment:** มอบหมายงานให้พนักงานสาขา (เช่น จัดบูธ, เติมของ)

## 3. Screen Layout Example

| Zone | Content |
| :--- | :--- |
| **Top Bar** | โลโก้, รูปโปรไฟล์, ปุ่มแจ้งเตือน (Bell) |
| **Hero Section** | การ์ดสรุปยอดขาย/กำไรประจำวัน (Graph) |
| **Status Cards** | 🟢 Stock ปกติ | 🔴 รออนุมัติ 3 รายการ | 🟠 งานค้าง 2 |
| **Grid Menu** | [📦 คลังสินค้า] [🛒 ขาย] [👥 ทีมงาน] [📝 รายงาน] |
| **Recent List** | รายการเคลื่อนไหวล่าสุด (เช่น สินค้าเข้า 20 นาทีที่แล้ว) |
| **Bottom Bar** | Home | Tasks | Notifications | Profile |

## 4. Technical Feasibility
สามารถพัฒนาต่อยอดจาก `mobile-bmr` เดิมได้เลย โดย:
1.  **Add Modules:** เพิ่ม Tab หรือ Drawer Menu สำหรับฟีเจอร์ ERP
2.  **Shared Components:** ใช้ UI Library เดิม (ปุ่ม, การ์ด, สแกนเนอร์)
3.  **Role-based Access:** กำหนดสิทธิ์ให้เห็นเมนูต่างกัน (Admin เห็นยอดขาย, Staff เห็นแค่สต็อก)

