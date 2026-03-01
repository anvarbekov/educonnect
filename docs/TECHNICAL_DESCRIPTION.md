# EduConnect — Ilmiy Texnik Tavsif
## BMI uchun Texnik Hujjat

---

## 1. TIZIM ARXITEKTURASI

```
┌─────────────────────────────────────────────────────────┐
│                    MIJOZ (Browser)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Next.js App │  │  React State │  │  Tailwind CSS │  │
│  │  (App Router)│  │  (Context)   │  │  + DaisyUI    │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                    Firebase SDK
                           │
┌─────────────────────────────────────────────────────────┐
│                  FIREBASE BACKEND                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   Firebase   │  │    Cloud     │  │   Firebase    │  │
│  │    Auth      │  │  Firestore   │  │   Storage     │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. KOMPONENTLAR DIAGRAMMASI

```
app/
├── layout.jsx              # Root layout (AuthProvider + ThemeProvider)
├── page.jsx                # Redirect (login/dashboard)
├── login/page.jsx          # Autentifikatsiya sahifasi
├── register/page.jsx       # Ro'yxatdan o'tish
└── dashboard/
    ├── layout.jsx          # Protected layout + Sidebar
    ├── page.jsx            # Asosiy sahifa
    ├── chat/[channelId]/   # Real-time chat
    ├── analytics/          # Learning Analytics dashboard
    ├── admin/              # Admin panel (CRUD + audit)
    ├── courses/            # Kurslar boshqaruvi
    ├── profile/            # Foydalanuvchi profili
    └── sus-survey/         # SUS so'rovnoma

components/
├── layout/Sidebar.jsx      # Navigatsiya + kurs daraxti
└── chat/
    ├── MessageBubble.jsx   # Xabar komponenti (reactions, context menu)
    ├── ChatInput.jsx       # Matn/fayl/ovoz kiritish
    ├── ChatHeader.jsx      # Kanal sarlavhasi
    ├── SearchPanel.jsx     # Xabar qidirish
    ├── PinnedMessages.jsx  # Mahkamlangan xabarlar
    ├── CreateCourseModal   # Kurs yaratish modali
    └── CreateChannelModal  # Kanal yaratish modali
```

---

## 3. REAL-TIME XABAR ALMASHISH

### Mexanizm

```javascript
// Firestore onSnapshot — real-time sinxronizatsiya
const unsub = subscribeToMessages(channelId, (messages) => {
  setMessages(messages); // React state yangilanadi
}, 100); // Oxirgi 100 ta xabar
```

### Xabar yuborish oqimi

```
Foydalanuvchi yozadi
     ↓
Rate-limit tekshirish (10 msg / 10 sek)
     ↓
Fayl bo'lsa → Firebase Storage upload
     ↓
Firestore messages/ kolleksiyasiga yozish
     ↓
onSnapshot trigger → Barcha ulangan foydalanuvchilarga real-time
```

---

## 4. RBAC TIZIMI

```javascript
Rol Huquqlari:
┌──────────────┬────────┬───────────┬──────────┐
│ Funksiya     │ Admin  │ O'qituvchi│  Talaba  │
├──────────────┼────────┼───────────┼──────────┤
│ Kurs yaratish│  ✅    │    ✅     │    ❌    │
│ Kanal yaratish│ ✅   │    ✅     │    ❌    │
│ Xabar yuborish│ ✅   │    ✅     │    ✅    │
│ Pin qilish  │  ✅    │    ✅     │    ❌    │
│ Cheklash    │  ✅    │    ✅     │    ❌    │
│ Admin panel │  ✅    │    ❌     │    ❌    │
│ Audit log   │  ✅    │    ❌     │    ❌    │
│ Analytics   │  ✅    │    ✅     │    ❌    │
└──────────────┴────────┴───────────┴──────────┘
```

---

## 5. SUS SO'ROVNOMA ALGORITMI

```
SUS Ball = Σ(savollar) × 2.5

Har bir savol uchun:
- Ijobiy savollar (1,3,5,7,9): ball = javob - 1
- Salbiy savollar (2,4,6,8,10): ball = 5 - javob

Minimum: 0  |  Maksimum: 100

Talqin:
- 85-100: A'lo (Excellent)
- 72-84:  Yaxshi (Good)
- 52-71:  O'rta (OK)
- 38-51:  Qoniqarli (Poor)
- 0-37:   Yomon (Awful)
```

---

## 6. JAVOB VAQTI HISOBLASH

```javascript
// O'qituvchining javob berish vaqti
const calcResponseTime = (messages, teacherId) => {
  const studentMsgs = messages.filter(m => m.senderId !== teacherId);
  const teacherReplies = messages.filter(m => m.senderId === teacherId);
  
  let totalTime = 0;
  let count = 0;
  
  studentMsgs.forEach(studentMsg => {
    const nextTeacherMsg = teacherReplies.find(tm => 
      tm.createdAt.seconds > studentMsg.createdAt.seconds
    );
    if (nextTeacherMsg) {
      totalTime += (nextTeacherMsg.createdAt.seconds - studentMsg.createdAt.seconds) / 60;
      count++;
    }
  });
  
  return count > 0 ? (totalTime / count).toFixed(1) : 0; // daqiqada
};
```

---

## 7. FAOLLIK-NATIJA KORRELYATSIYASI

```
Pearson korrelyatsiyasi formulasi:
r = Σ(xi - x̄)(yi - ȳ) / √[Σ(xi - x̄)² × Σ(yi - ȳ)²]

Bu yerda:
x = talaba chat faolligi (xabarlar soni)
y = test natijalari (0-100)

Ilmiy taxmin: r ≥ 0.6 bo'lsa — kuchli ijobiy korrelyatsiya
```

---

## 8. XAVFSIZLIK CHORALARI

1. **Firebase Auth** — JWT asosidagi autentifikatsiya
2. **Firestore Rules** — Server tomonidan ruxsat tekshirish
3. **MIME tekshirish** — Fayl yuklashda tur nazorati
4. **Fayl hajmi chegarasi** — 10MB maksimum
5. **Rate limiting** — 10 xabar / 10 soniya (frontend)
6. **isMuted flag** — Foydalanuvchini cheklash imkoniyati

---

## 9. PILOT SINOV REJASI

### Qatnashchilar
- 10 ta o'qituvchi
- 30 ta talaba (3 kurs × 10 talaba)

### Sinov Bosqichlari
1. **Onboarding** (1 hafta) — Tizimni o'rgatish
2. **Faol ishlatish** (2 hafta) — Dars jarayonida qo'llash
3. **Baholash** (1 hafta) — SUS so'rovnoma + intervyu

### O'lchanadigan ko'rsatkichlar
- O'rtacha SUS bali (maqsad: ≥ 72)
- O'qituvchi javob vaqti (maqsad: ≤ 5 daqiqa)
- Kunlik faol foydalanuvchilar
- Xabarlar soni / kurs

---

*Hujjat EduConnect BMI loyihasi uchun tayyorlangan | 2024*
