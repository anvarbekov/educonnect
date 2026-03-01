# EduConnect — O'qituvchi-Talaba Chat Platformasi

**BMI (Bitiruv Malakaviy Ish) Loyihasi**

> Ta'lim muhitida o'qituvchi–talaba muloqotini ta'minlovchi web-chat platformasini loyihalash, joriy etish va samaradorligini baholash

---

## 📋 Loyiha Haqida

EduConnect — real-time xabar almashish imkoniyatini ta'minlovchi, Firebase backend'iga asoslangan Next.js web-platformasidir. Platforma uchta foydalanuvchi roli (Admin, O'qituvchi, Talaba) bilan ishlaydi va pedagogik jarayonni raqamlashtiradi.

---

## 🛠 Texnologiyalar

| Texnologiya | Maqsad |
|---|---|
| Next.js 14 (App Router) | Frontend framework |
| Firebase Auth | Autentifikatsiya |
| Cloud Firestore | Real-time ma'lumotlar bazasi |
| Firebase Storage | Fayl saqlash |
| Tailwind CSS + DaisyUI | Styling |
| Recharts | Grafiklar |
| react-hot-toast | Bildirishnomalar |
| date-fns | Vaqt formatlash |
| papaparse | CSV export |

---

## 🚀 O'rnatish va Ishga Tushirish

### 1. Firebase Loyiha Yaratish

1. [Firebase Console](https://console.firebase.google.com) → **Add project**
2. Loyiha nomi: `educonnect` (yoki boshqa nom)
3. Google Analytics: optional

### 2. Firebase Xizmatlarni Yoqish

**Authentication:**
```
Firebase Console → Authentication → Sign-in method → Email/Password → Enable
```

**Firestore Database:**
```
Firebase Console → Firestore Database → Create database → Start in test mode
(Keyinchalik production rules qo'shasiz)
```

**Storage:**
```
Firebase Console → Storage → Get started → Start in test mode
```

### 3. Web App Konfiguratsiyasi

```
Firebase Console → Project Settings → Your apps → Add app → Web
App nickname: EduConnect Web
```

Olingan config'ni nusxalang.

### 4. Loyihani Sozlash

```bash
# 1. Repozitoriyni klonlash yoki fayllarni yuklash
cd educonnect

# 2. .env.local fayl yaratish
cp .env.local.example .env.local

# 3. Firebase config'ni .env.local ga qo'shing:
```

`.env.local` faylini oching va o'zgartiring:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=yourproject.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=yourproject
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=yourproject.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### 5. Paketlarni O'rnatish va Ishga Tushirish

```bash
npm install
npm run dev
```

Brauzerda oching: `http://localhost:3000`

---

## 🔐 Firestore Security Rules

`firestore.rules` faylidan nusxa olib Firebase Console ga joylashtiring:

```
Firebase Console → Firestore → Rules → tahrirlash → Paste → Publish
```

## 📁 Storage Rules

`storage.rules` faylidan nusxa olib:
```
Firebase Console → Storage → Rules → tahrirlash → Paste → Publish
```

---

## 👤 Birinchi Admin Yaratish

1. Ro'yxatdan o'ting (register)
2. Firebase Console → Firestore → `users` kolleksiyasini toping
3. Yangi yaratilgan hujjatni toping
4. `role` maydonini `admin` ga o'zgartiring

---

## 📊 Firestore Kolleksiyalar

```
users/
  {uid}/
    name: string
    email: string
    role: "admin" | "teacher" | "student"
    createdAt: timestamp
    isMuted: boolean
    isActive: boolean

courses/
  {id}/
    title: string
    code: string (e.g. "CS101")
    description: string
    teacherId: uid
    teacherName: string
    createdAt: timestamp

channels/
  {id}/
    courseId: string
    title: string
    type: "course" | "general" | "private" | "announcement"
    description: string
    createdAt: timestamp
    lastMessage: string
    lastMessageAt: timestamp

memberships/
  {id}/
    userId: uid
    channelId: string
    role: "member" | "moderator"
    joinedAt: timestamp

messages/
  {id}/
    channelId: string
    senderId: uid
    senderName: string
    body: string
    type: "text" | "image" | "file" | "voice"
    fileUrl: string?
    fileName: string?
    fileSize: number?
    replyTo: { id, senderName, body }?
    reactions: { emoji: [uid, ...] }
    isPinned: boolean
    isDeleted: boolean
    createdAt: timestamp
    editedAt: timestamp?

readReceipts/
  {id}/
    messageId: string
    userId: uid
    readAt: timestamp

auditLogs/
  {id}/
    actorId: uid
    action: string
    target: string
    details: string
    createdAt: timestamp

susResponses/
  {id}/
    userId: uid
    userName: string
    userRole: string
    answers: { questionId: 1-5 }
    score: number (0-100)
    submittedAt: timestamp

presence/
  {uid}/
    online: boolean
    lastSeen: timestamp
```

---

## 🌐 Deploy (Vercel)

### Avtomatik Deploy:

1. [vercel.com](https://vercel.com) → Import Git Repository
2. Framework: Next.js (avtomatik aniqlanadi)
3. Environment Variables qo'shing (.env.local dagi barcha o'zgaruvchilarni)
4. **Deploy** bosing

### Manual Deploy:
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Firebase Hosting (ixtiyoriy):
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

---

## 📖 Ilmiy Tavsif (BMI uchun)

### Arxitektura

Platforma **3-qatlamli arxitektura** asosida qurilgan:
- **Prezentatsiya qatlami**: Next.js + React komponenti
- **Biznes mantiq qatlami**: Firebase SDK orqali real-time operatsiyalar
- **Ma'lumotlar qatlami**: Cloud Firestore (NoSQL) + Firebase Storage

### Asosiy Xususiyatlar

1. **Real-time xabar almashish** — Firestore `onSnapshot` yordamida WebSocket-siz real-time sinxronizatsiya
2. **RBAC (Role-Based Access Control)** — 3 ta rol: Admin, O'qituvchi, Talaba
3. **Fayl almashish** — 10MB gacha, MIME tekshirish bilan
4. **Ovozli xabarlar** — MediaRecorder API orqali WebM format
5. **Xabarni pin qilish** — Muhim e'lonlarni kanal tepasida ko'rsatish
6. **SUS So'rovnoma** — System Usability Scale (100 ballik shkala)
7. **Learning Analytics** — Faollik statistikasi va korrelyatsiya tahlili

### SUS Ball Talqini

| Ball | Daraja | Talqin |
|------|--------|--------|
| 85-100 | A'lo | Foydalanish juda qulay |
| 72-84 | Yaxshi | Foydalanish qulay |
| 52-71 | O'rta | Qoniqarli |
| 38-51 | Past | Yaxshilash talab etiladi |
| 0-37 | Yomon | Qayta loyihalash kerak |

### Ilmiy Metodologiya

- **Pilot sinov**: 20-30 foydalanuvchi (o'qituvchi + talabalar)
- **O'lchov usuli**: SUS so'rovnomasi + javob vaqti algoritmi
- **Tahlil**: Faollik ↔ akademik ko'rsatkichlar korrelyatsiyasi
- **Eksport**: CSV format, SPSS/Excel da qayta ishlash uchun

---

## 🧪 Test Ma'lumotlari

Testlash uchun Firebase console'da quyidagi hujjatlarni yarating:

**users kolleksiyasida:**
```json
{
  "name": "Admin Foydalanuvchi",
  "email": "admin@edu.uz",
  "role": "admin",
  "isMuted": false
}
```

---

## 📞 Qo'llab-quvvatlash

Savollar uchun loyiha GitHub Issues bo'limine murojaat qiling.

---

*© 2024 EduConnect. Barcha huquqlar himoyalangan. BMI loyihasi sifatida taqdim etilgan.*
# educonnect
