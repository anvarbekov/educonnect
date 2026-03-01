'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

const inputStyle = {
  background: '#f1f5f9',
  border: '1.5px solid #e2e8f0',
  color: '#0f172a',
  fontSize: '14px',
};

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'student' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error("Barcha maydonlarni to'ldiring");
    if (form.password.length < 6) return toast.error('Parol kamida 6 ta belgi');
    if (form.password !== form.confirm) return toast.error("Parollar mos kelmadi");
    setLoading(true);
    try {
      await register(form.email, form.password, form.name, form.role);
      toast.success("Ro'yxatdan o'tdingiz!");
      router.push('/dashboard');
    } catch (err) {
      const msg =
        err.code === 'auth/email-already-in-use' ? "Bu email allaqachon ro'yxatda" :
        err.code === 'auth/weak-password' ? 'Parol juda zaif' :
        'Xato yuz berdi. Qayta urining';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const focusStyle = (e) => {
    e.target.style.border = '1.5px solid #6366f1';
    e.target.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.08)';
  };
  const blurStyle = (e) => {
    e.target.style.border = '1.5px solid #e2e8f0';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#f8faff' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            <span className="text-white font-black text-lg">E</span>
          </div>
          <span className="font-black text-xl" style={{ color: '#1e1b4b' }}>EduConnect</span>
        </div>

        <h2 className="font-black text-3xl mb-1" style={{ color: '#0f172a' }}>Ro'yxatdan o'ting</h2>
        <p className="text-sm mb-7" style={{ color: '#64748b' }}>Yangi hisob yarating</p>

        {/* Card */}
        <div className="rounded-3xl p-6 shadow-sm" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#334155' }}>To'liq ism</label>
              <input
                name="name" type="text" value={form.name} onChange={handleChange}
                placeholder="Ism Familiya"
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all"
                style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#334155' }}>Email</label>
              <input
                name="email" type="email" value={form.email} onChange={handleChange}
                placeholder="email@example.com"
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all"
                style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#334155' }}>Rol</label>
              <select
                name="role" value={form.role} onChange={handleChange}
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all appearance-none"
                style={{ ...inputStyle, cursor: 'pointer' }}
                onFocus={focusStyle} onBlur={blurStyle}
              >
                <option value="student">👨‍🎓 Talaba</option>
                <option value="teacher">👨‍🏫 O'qituvchi</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#334155' }}>Parol</label>
              <input
                name="password" type="password" value={form.password} onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all"
                style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#334155' }}>Parolni tasdiqlang</label>
              <input
                name="confirm" type="password" value={form.confirm} onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all"
                style={{
                  ...inputStyle,
                  border: form.confirm && form.confirm !== form.password ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0',
                }}
                onFocus={focusStyle} onBlur={blurStyle} required
              />
              {form.confirm && form.confirm !== form.password && (
                <p className="text-xs mt-1" style={{ color: '#ef4444' }}>Parollar mos kelmadi</p>
              )}
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 8px 24px rgba(79,70,229,0.25)', marginTop: '8px' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Ro'yxatdan o'tilmoqda...
                </span>
              ) : "Ro'yxatdan o'tish →"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: '#64748b' }}>
          Hisobingiz bormi?{' '}
          <Link href="/login" className="font-bold hover:underline" style={{ color: '#4f46e5' }}>
            Kirish
          </Link>
        </p>
      </div>
    </div>
  );
}