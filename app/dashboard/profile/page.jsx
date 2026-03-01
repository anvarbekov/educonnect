'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { updateUser } from '@/services/firestore';
import { updateProfile } from 'firebase/auth';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ✅ FIXED: transformation parametri olib tashlandi (unsigned upload da ruxsat berilmaydi)
async function uploadAvatar(file) {
  const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!CLOUD || !PRESET) throw new Error('Cloudinary sozlanmagan (.env.local faylini tekshiring)');

  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', PRESET);
  fd.append('folder', 'educonnect/avatars');
  // ❌ transformation: ruxsat berilmaydi unsigned upload da
  // ✅ Faqat ruxsat etilgan parametrlar ishlatiladi

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: 'POST',
    body: fd,
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.secure_url;
}

const ROLE_CONFIG = {
  admin:   { label: 'Admin',        icon: '👨‍💼', gradient: 'linear-gradient(135deg,#ef4444,#dc2626)',  badge: 'rgba(239,68,68,0.1)',   text: '#ef4444' },
  teacher: { label: "O'qituvchi",  icon: '👨‍🏫', gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', badge: 'rgba(139,92,246,0.1)', text: '#8b5cf6' },
  student: { label: 'Talaba',       icon: '👨‍🎓', gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)', badge: 'rgba(99,102,241,0.1)',  text: '#6366f1' },
};

export default function ProfilePage() {
  const { user, userProfile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(userProfile?.name || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const role = ROLE_CONFIG[userProfile?.role] || ROLE_CONFIG.student;

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Ism bo'sh bo'lishi mumkin emas");
    setSaving(true);
    try {
      await updateUser(user.uid, { name: name.trim(), bio: bio.trim() });
      await updateProfile(user, { displayName: name.trim() });
      await refreshProfile();
      setEditing(false);
      toast.success('Profil yangilandi ✅');
    } catch { toast.error('Xato yuz berdi'); }
    setSaving(false);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Rasm 5MB dan kichik bo'lishi kerak");
    if (!file.type.startsWith('image/')) return toast.error("Faqat rasm fayllari");

    setUploading(true);
    try {
      const url = await uploadAvatar(file);
      await updateUser(user.uid, { avatar: url });
      await updateProfile(user, { photoURL: url });
      await refreshProfile();
      toast.success('Avatar yangilandi! 🎉');
    } catch (e) {
      toast.error('Yuklashda xato: ' + e.message);
    }
    setUploading(false);
    e.target.value = '';
  };

  const joinDate = userProfile?.createdAt?.toDate
    ? format(userProfile.createdAt.toDate(), 'dd MMMM yyyy')
    : null;

  const initials = userProfile?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const stats = [
    { icon: '📅', label: "Ro'yxatdan o'tilgan", value: joinDate || '—' },
    { icon: '📧', label: 'Email', value: userProfile?.email || '—' },
    { icon: '🎭', label: 'Rol', value: role.label },
    { icon: userProfile?.isMuted ? '🔇' : '✅', label: 'Holat', value: userProfile?.isMuted ? 'Cheklangan' : 'Faol' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-base-100">
      {/* Header banner */}
      <div className="relative h-36 overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#1e1b4b,#4c1d95,#312e81)' }}>
        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute rounded-full opacity-10"
              style={{
                width: `${80 + i * 40}px`, height: `${80 + i * 40}px`,
                left: `${(i * 15) % 100}%`, top: `${(i * 20 - 20) % 80}%`,
                background: 'white', filter: 'blur(20px)',
              }} />
          ))}
        </div>
        <div className="absolute inset-0 flex items-center px-6">
          <div className="relative z-10">
            <h1 className="text-2xl font-black text-white">Mening Profilim</h1>
            <p className="text-violet-300 text-sm mt-0.5">Shaxsiy ma'lumotlarni boshqarish</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-8">
        {/* Avatar card — floating over banner */}
        <div className="relative -mt-10 mb-5">
          <div className="bg-base-100 rounded-3xl p-5 shadow-lg" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="flex items-end gap-5">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-20 h-20 rounded-3xl overflow-hidden shadow-xl cursor-pointer relative group"
                  style={{ background: role.gradient }}
                  onClick={() => !uploading && fileRef.current?.click()}
                >
                  {userProfile?.avatar ? (
                    <img src={userProfile.avatar} className="w-full h-full object-cover" alt="Avatar" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-white font-black text-2xl">
                      {initials}
                    </span>
                  )}

                  {/* Upload overlay */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
                  >
                    {uploading ? (
                      <svg className="animate-spin w-6 h-6 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                    ) : (
                      <>
                        <span className="text-xl">📷</span>
                        <span className="text-[9px] text-white font-bold">O'zgartirish</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Online dot */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-base-100 bg-emerald-400 shadow" />

                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>

              {/* Name + role */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="font-black text-xl text-base-content">{userProfile?.name}</h2>
                  <span
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ background: role.badge, color: role.text }}
                  >
                    {role.icon} {role.label}
                  </span>
                </div>
                <p className="text-sm text-base-content/50 truncate">{userProfile?.email}</p>
                {userProfile?.bio && !editing && (
                  <p className="text-xs text-base-content/60 mt-1 italic">"{userProfile.bio}"</p>
                )}
              </div>

              {/* Edit button */}
              {!editing && (
                <button
                  onClick={() => { setEditing(true); setName(userProfile?.name||''); setBio(userProfile?.bio||''); }}
                  className="px-4 py-2 rounded-2xl text-xs font-bold transition-all hover:scale-105 flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg,#7c3aed,#6366f1)',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
                  }}
                >
                  ✏️ Tahrirlash
                </button>
              )}
            </div>

            {/* Edit form */}
            {editing && (
              <div className="mt-5 pt-5 space-y-4" style={{ borderTop: '1px solid var(--base-200,rgba(0,0,0,0.06))' }}>
                <div>
                  <label className="block text-xs font-bold text-base-content/50 uppercase tracking-wider mb-1.5">
                    To'liq ism *
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl text-sm outline-none bg-base-200 text-base-content"
                    style={{ border: '1.5px solid transparent', transition: 'border .2s' }}
                    onFocus={(e) => e.target.style.border = '1.5px solid #7c3aed'}
                    onBlur={(e) => e.target.style.border = '1.5px solid transparent'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-base-content/50 uppercase tracking-wider mb-1.5">
                    Bio (ixtiyoriy)
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="O'zingiz haqida qisqacha yozing..."
                    rows={2}
                    className="w-full px-4 py-3 rounded-2xl text-sm outline-none bg-base-200 text-base-content resize-none"
                    style={{ border: '1.5px solid transparent', transition: 'border .2s' }}
                    onFocus={(e) => e.target.style.border = '1.5px solid #7c3aed'}
                    onBlur={(e) => e.target.style.border = '1.5px solid transparent'}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="flex-1 py-2.5 rounded-2xl text-sm font-semibold bg-base-200 text-base-content/60 hover:bg-base-300 transition-colors"
                  >Bekor</button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}
                  >
                    {saving ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                          <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        Saqlanmoqda...
                      </span>
                    ) : '✓ Saqlash'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {stats.map((s) => (
            <div key={s.label}
              className="p-4 rounded-2xl flex items-center gap-3"
              style={{ background: 'var(--base-200,rgba(0,0,0,0.04))', border: '1px solid var(--base-300,rgba(0,0,0,0.06))' }}>
              <span className="text-xl flex-shrink-0">{s.icon}</span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">{s.label}</p>
                <p className="text-sm font-semibold text-base-content truncate mt-0.5">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Avatar upload hint */}
        <div className="p-4 rounded-2xl flex items-center gap-3"
          style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.15)' }}>
          <span className="text-2xl flex-shrink-0">📷</span>
          <div>
            <p className="text-xs font-bold" style={{ color: '#7c3aed' }}>Profil rasmini o'zgartirish</p>
            <p className="text-[11px] text-base-content/50 mt-0.5">
              Avatar ustiga bosing • PNG, JPG, WEBP • Max 5MB
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}