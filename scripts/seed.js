/**
 * Demo ma'lumotlarini Firebase'ga yuklash uchun skript
 * 
 * Ishlatish:
 * 1. npm install firebase-admin
 * 2. Firebase Console → Project Settings → Service accounts → Generate new private key
 * 3. Yuklab olingan JSON ni "serviceAccount.json" nomi bilan saqlang
 * 4. node scripts/seed.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

async function seedData() {
  console.log('🌱 Demo ma\'lumotlar yuklanmoqda...\n');

  // Create demo users in Auth
  const users = [
    { email: 'admin@edu.uz', password: 'admin123', name: 'Admin Foydalanuvchi', role: 'admin' },
    { email: 'teacher@edu.uz', password: 'teacher123', name: 'Alisher Umarov', role: 'teacher' },
    { email: 'student@edu.uz', password: 'student123', name: 'Zulfiya Karimova', role: 'student' },
    { email: 'student2@edu.uz', password: 'student123', name: 'Bobur Toshmatov', role: 'student' },
  ];

  const createdUsers = [];

  for (const u of users) {
    try {
      let uid;
      try {
        const existing = await auth.getUserByEmail(u.email);
        uid = existing.uid;
        console.log(`✅ Mavjud foydalanuvchi: ${u.email}`);
      } catch {
        const created = await auth.createUser({
          email: u.email,
          password: u.password,
          displayName: u.name,
        });
        uid = created.uid;
        console.log(`✅ Yaratildi: ${u.email}`);
      }

      await db.collection('users').doc(uid).set({
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isMuted: false,
        isActive: true,
      });

      createdUsers.push({ uid, ...u });
    } catch (err) {
      console.error(`❌ Xato (${u.email}):`, err.message);
    }
  }

  const teacherUid = createdUsers.find((u) => u.role === 'teacher')?.uid;
  if (!teacherUid) {
    console.error('O\'qituvchi topilmadi');
    return;
  }

  // Create courses
  const courses = [
    { title: 'Dasturlash Asoslari', code: 'CS101', description: 'Python va algoritmlar asoslari' },
    { title: 'Web Dasturlash', code: 'WEB201', description: 'HTML, CSS, JavaScript' },
    { title: 'Ma\'lumotlar Bazasi', code: 'DB301', description: 'SQL va NoSQL tizimlar' },
  ];

  for (const course of courses) {
    const courseRef = await db.collection('courses').add({
      ...course,
      teacherId: teacherUid,
      teacherName: 'Alisher Umarov',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`📚 Kurs yaratildi: ${course.title} (${courseRef.id})`);

    // Create channels for each course
    const channels = [
      { title: 'umumiy', type: 'course', description: 'Umumiy muhokama' },
      { title: 'e-lonlar', type: 'announcement', description: 'O\'qituvchi e\'lonlari' },
      { title: 'savol-javob', type: 'general', description: 'Savollar va javoblar' },
    ];

    for (const ch of channels) {
      const chRef = await db.collection('channels').add({
        ...ch,
        courseId: courseRef.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessage: 'Kanal yaratildi',
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`  💬 Kanal: #${ch.title} (${chRef.id})`);

      // Add teacher membership
      await db.collection('memberships').add({
        userId: teacherUid,
        channelId: chRef.id,
        role: 'moderator',
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Add student memberships
      const studentUids = createdUsers.filter((u) => u.role === 'student').map((u) => u.uid);
      for (const sUid of studentUids) {
        await db.collection('memberships').add({
          userId: sUid,
          channelId: chRef.id,
          role: 'member',
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Add demo messages
      const demoMessages = [
        { senderId: teacherUid, senderName: 'Alisher Umarov', body: `Assalomu alaykum! ${course.title} kursiga xush kelibsiz!`, type: 'text' },
        { senderId: studentUids[0], senderName: 'Zulfiya Karimova', body: 'Va alaykum assalom, ustoz!', type: 'text' },
        { senderId: teacherUid, senderName: 'Alisher Umarov', body: 'Bugungi dars uchun materiallar tayyorlab keling.', type: 'text', isPinned: true },
      ];

      for (const msg of demoMessages) {
        await db.collection('messages').add({
          ...msg,
          channelId: chRef.id,
          reactions: {},
          isPinned: msg.isPinned || false,
          isDeleted: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }

  console.log('\n✅ Demo ma\'lumotlar muvaffaqiyatli yuklandi!');
  console.log('\n📝 Kirish ma\'lumotlari:');
  users.forEach((u) => {
    console.log(`  ${u.role}: ${u.email} / ${u.password}`);
  });

  process.exit(0);
}

seedData().catch((err) => {
  console.error('❌ Xato:', err);
  process.exit(1);
});
