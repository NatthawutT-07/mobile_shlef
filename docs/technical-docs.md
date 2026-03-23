# เอกสารทางเทคนิค Mobile BMR (Mobile BMR - Technical Documentation)

## 1. ภาพรวมโครงการ (Project Overview)
**Mobile BMR** คือแอปพลิเคชันที่พัฒนาด้วย React Native และ Expo ออกแบบมาเพื่อให้พนักงานสาขาสามารถจัดการแผนผังชั้นวางสินค้า (Planogram), ส่งคำขอปรับเปลี่ยนแผนผัง, และลงทะเบียนสินค้าใหม่ได้โดยตรงจากหน้าร้าน แอปพลิเคชันนี้เชื่อมต่อกับระบบหลังบ้าน `server-BMR`

## 2. เทคโนโลยีที่ใช้ (Technology Stack)
*   **Framework:** React Native (v0.81.5)
*   **Platform:** Expo (v54.0.31)
*   **Language:** JavaScript (ES6+)
*   **State Management:** Zustand
*   **Navigation:** React Navigation (Native Stack)
*   **Networking:** Axios
*   **UI Components:** Lucide React Native, React Native SVG
*   **Features:** Expo Camera (สำหรับสแกนบาร์โค้ด), Secure Store (สำหรับเก็บ Token)

## 3. โครงสร้างโปรเจกต์ (Project Structure)
```
mobile-bmr/src/
├── api/                # โมดูลสำหรับการเชื่อมต่อ API
│   ├── axios.js        # การตั้งค่า Axios และ Interceptors
│   └── user.js         # API ที่เกี่ยวข้องกับผู้ใช้ (รวมถึง POG & การลงทะเบียน)
├── components/         # UI Components ที่นำกลับมาใช้ซ้ำได้
├── constants/          # ค่าคงที่ต่างๆ ของแอป (สี, Layout)
├── navigation/         # การตั้งค่าระบบนำทาง (Navigation)
│   └── AppNavigator.js # ตัวนำทางหลักแบบ Stack Navigator
├── screens/            # หน้าจอต่างๆ ของแอป (Pages)
│   ├── LoginScreen.js          # หน้าเข้าสู่ระบบ
│   ├── HomeScreen.js           # หน้าหลัก (Dashboard)
│   ├── PlanogramScreen.js      # หน้าแสดงแผนผังและส่งคำขอปรับเปลี่ยน
│   ├── BarcodeScannerScreen.js # หน้าค้นหาสินค้าด้วยบาร์โค้ด
│   ├── PogRequestsScreen.js    # หน้าดูประวัติคำขอ
│   ├── RegisterProductScreen.js# หน้าลงทะเบียนสินค้า (ฟีเจอร์ใหม่)
│   └── ...
├── store/              # การจัดการ State ส่วนกลาง (Zustand)
└── utils/              # ฟังก์ชันช่วยเหลือต่างๆ (Helper functions)
```

## 4. ฟีเจอร์หลักและการพัฒนา (Key Features & Implementation)

### 4.1 การยืนยันตัวตน (Authentication)
- ใช้ **JWT (JSON Web Token)** ในการยืนยันตัวตน
- Token จะถูกเก็บไว้อย่างปลอดภัยใน `expo-secure-store`
- Axios interceptor จะทำการแนบ `Authorization: Bearer <token>` ไปกับทุก Request โดยอัตโนมัติ

### 4.2 การสแกนบาร์โค้ด (Barcode Scanning)
- พัฒนาโดยใช้ `expo-camera`
- มีระบบป้องกันการสแกนซ้ำ (Throttle) เพื่อไม่ให้สแกนรัวเกินไป
- **หน้าจอที่ใช้:** `BarcodeScannerScreen.js`, `RegisterProductScreen.js`

### 4.3 การจัดการ Planogram (Planogram Management)
- **การแสดงผล:** `PlanogramScreen.js` จะแสดงผลชั้นวางแบบ Dynamic ตามข้อมูล API `getTemplateAndProduct`
- **การขอปรับเปลี่ยน:** ผู้ใช้สามารถกดเพื่อ ย้าย (Move), แก้ไข (Edit), ลบ (Delete), หรือ เพิ่ม (Add) สินค้าได้ ซึ่งจะสร้างคำขอ (Request record) ส่งไปที่ Backend

### 4.4 การลงทะเบียนสินค้าโดยตรง (Direct Product Registration - New Feature)
- ช่วยให้สามารถเพิ่มสินค้า (SKU) ใหม่ลงในฐานข้อมูลได้ทันที โดยไม่ต้องผ่านขั้นตอนการขออนุมัติ POG
- **ขั้นตอนการทำงาน:**
    1. สแกนบาร์โค้ด -> เรียก `checkProductExists`
    2. ถ้าเป็นสินค้าใหม่ -> เลือกตู้ (`getShelvesForRegister`) -> เลือกชั้น
    3. คำนวณตำแหน่งถัดไป (`getNextIndex`)
    4. บันทึกข้อมูล (`registerProduct`)

## 5. การเชื่อมต่อ API (`src/api/user.js`)
การเรียกใช้ API ทั้งหมดจะรวมอยู่ที่ไฟล์ `src/api/user.js`
*   `getTemplateAndProduct(branchCode)` - ดึงข้อมูล Template และสินค้า
*   `getBranchShelves(branchCode)` - ดึงข้อมูลชั้นวางของสาขา
*   `createPogRequest(data)` - สร้างคำขอปรับเปลี่ยน Planogram
*   `getMyPogRequests(branchCode)` - ดึงประวัติคำขอ
*   `lookupProduct(branchCode, barcode)` - ค้นหาสินค้า
*   `checkProductExists(branchCode, barcode)` - ตรวจสอบสินค้าก่อนลงทะเบียน
*   `registerProduct(data)` - บันทึกการลงทะเบียนสินค้า

## 6. การ Build และ Deployment
แอปพลิเคชันนี้ Build โดยใช้ Expo Application Services (EAS) หรือคำสั่ง Expo มาตรฐาน

**สำหรับการพัฒนา (Development):**
```bash
npm start
# กด 'a' สำหรับ Android, 'i' สำหรับ iOS
```

**การ Build สำหรับ Production:**
```bash
eas build --platform android
eas build --platform ios
```

**การอัปเดตแอป (OTA Update):**
```bash
eas update
```
