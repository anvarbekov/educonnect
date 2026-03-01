'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Barcha maydonlarni to'ldiring");
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Xush kelibsiz!');
      router.push('/dashboard');
    } catch (err) {
      const msg =
        err.code === 'auth/user-not-found' ? 'Foydalanuvchi topilmadi' :
        err.code === 'auth/wrong-password' ? "Noto'g'ri parol" :
        err.code === 'auth/invalid-credential' ? "Email yoki parol noto'g'ri" :
        err.code === 'auth/too-many-requests' ? "Juda ko'p urinish. Keyinroq urining" :
        'Kirish xatosi. Qayta urining';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#f8faff' }}>

      {/* Left decorative panel */}
      <div
        className="hidden lg:flex flex-col w-1/2 p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%)' }}
      >
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 rounded-full -top-20 -right-20 opacity-20"
            style={{ background: 'rgba(255,255,255,0.3)', filter: 'blur(60px)' }} />
          <div className="absolute w-64 h-64 rounded-full bottom-20 -left-10 opacity-20"
            style={{ background: 'rgba(255,255,255,0.2)', filter: 'blur(40px)' }} />
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <span className="text-white text-xl font-black">E</span>
            </div>
            <span className="text-white font-black text-xl">EduConnect</span>
          </div>

          {/* Main content */}
          <div>
            <h1 className="text-white font-black text-4xl leading-tight mb-4">
              Ta'lim muhitida<br />
              <span style={{ color: 'rgba(196,181,253,1)' }}>samarali muloqot</span>
            </h1>
            <p className="text-blue-100 text-base leading-relaxed mb-8 max-w-sm">
              O'qituvchi va talabalar o'rtasida real-vaqt muloqotni ta'minlovchi zamonaviy platforma
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '💬', label: 'Real-time chat' },
                { icon: '📚', label: 'Kurs videolari' },
                { icon: '📢', label: 'Kanallar' },
                { icon: '📊', label: 'Analytics' },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)' }}>
                  <span className="text-lg">{f.icon}</span>
                  <span className="text-white text-sm font-semibold">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-blue-200 text-sm">© 2024 EduConnect • BMI Loyihasi</p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              <span className="text-white font-black">E</span>
            </div>
            <span className="font-black text-xl" style={{ color: '#1e1b4b' }}>EduConnect</span>
          </div>

          <h2 className="font-black text-3xl mb-1" style={{ color: '#0f172a' }}>Xush kelibsiz 👋</h2>
          <p className="text-sm mb-8" style={{ color: '#64748b' }}>Hisobingizga kiring</p>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#334155' }}>
                Email manzil
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none transition-all"
                style={{
                  background: '#f1f5f9',
                  border: '1.5px solid #e2e8f0',
                  color: '#0f172a',
                  fontSize: '14px',
                }}
                onFocus={(e) => {
                  e.target.style.border = '1.5px solid #6366f1';
                  e.target.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.08)';
                }}
                onBlur={(e) => {
                  e.target.style.border = '1.5px solid #e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#334155' }}>
                Parol
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none transition-all"
                style={{
                  background: '#f1f5f9',
                  border: '1.5px solid #e2e8f0',
                  color: '#0f172a',
                  fontSize: '14px',
                }}
                onFocus={(e) => {
                  e.target.style.border = '1.5px solid #6366f1';
                  e.target.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.08)';
                }}
                onBlur={(e) => {
                  e.target.style.border = '1.5px solid #e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-98 disabled:opacity-50 mt-2"
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                boxShadow: '0 8px 24px rgba(79,70,229,0.3)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Kirilmoqda...
                </span>
              ) : 'Kirish →'}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
            <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>yoki</span>
            <div className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
          </div>

          <p className="text-center text-sm" style={{ color: '#64748b' }}>
            Hisobingiz yo'qmi?{' '}
            <Link href="/register" className="font-bold hover:underline" style={{ color: '#4f46e5' }}>
              Ro'yxatdan o'ting
            </Link>
          </p>

          {/* Demo accounts */}
          <div className="mt-6 p-4 rounded-2xl" style={{ background: '#f8faff', border: '1px solid #e0e7ff' }}>
            <p className="text-xs font-bold mb-2" style={{ color: '#4f46e5' }}>🔑 Demo hisoblar:</p>
            <div className="space-y-1">
              {[
                { icon: '👨‍💼', role: 'Admin', email: 'admin@edu.uz', pass: 'admin123' },
                { icon: '👨‍🏫', role: "O'qituvchi", email: 'teacher@edu.uz', pass: 'teacher123' },
                { icon: '👨‍🎓', role: 'Talaba', email: 'student@edu.uz', pass: 'student123' },
              ].map((d) => (
                <button
                  key={d.role}
                  onClick={() => { setEmail(d.email); setPassword(d.pass); }}
                  className="w-full text-left text-xs px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                  style={{ color: '#475569' }}
                >
                  {d.icon} {d.role}: <span style={{ color: '#6366f1' }}>{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}