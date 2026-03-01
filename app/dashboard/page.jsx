'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { userProfile } = useAuth();

  const isTeacher = userProfile?.role === 'teacher';
  const isAdmin = userProfile?.role === 'admin';

  const roleConfig = {
    admin: { emoji: '⚡', label: 'Administrator', gradient: 'from-red-500 to-orange-500', glow: 'rgba(239,68,68,0.2)' },
    teacher: { emoji: '🎓', label: "O'qituvchi", gradient: 'from-violet-500 to-purple-600', glow: 'rgba(124,58,237,0.2)' },
    student: { emoji: '📚', label: 'Talaba', gradient: 'from-blue-500 to-indigo-600', glow: 'rgba(79,70,229,0.2)' },
  };
  const rc = roleConfig[userProfile?.role] || roleConfig.student;

  const cards = [
    {
      icon: '💬',
      title: 'Chat',
      desc: 'Real-vaqt xabar almashinuvi',
      href: null,
      gradient: 'from-indigo-500 to-violet-600',
      glow: 'rgba(99,102,241,0.25)',
      hint: 'Chap menudagi kanallardan birini tanlang',
      tag: 'Kanal tanlang',
    },
    {
      icon: '📋',
      title: "SUS So'rovnoma",
      desc: 'Foydalanish qulayligini baholang',
      href: '/dashboard/sus-survey',
      gradient: 'from-orange-500 to-amber-500',
      glow: 'rgba(245,158,11,0.25)',
      tag: 'To\'ldirish →',
    },
    {
      icon: '📊',
      title: 'Analytics',
      desc: "Faollik statistikasi va hisobotlar",
      href: (isTeacher || isAdmin) ? '/dashboard/analytics' : null,
      gradient: 'from-emerald-500 to-teal-500',
      glow: 'rgba(16,185,129,0.25)',
      locked: !isTeacher && !isAdmin,
      tag: 'Ko\'rish →',
    },
    {
      icon: '👤',
      title: 'Profil',
      desc: "Ma'lumotlarni tahrirlash",
      href: '/dashboard/profile',
      gradient: 'from-pink-500 to-rose-500',
      glow: 'rgba(236,72,153,0.25)',
      tag: 'Tahrirlash →',
    },
    ...(isAdmin ? [{
      icon: '⚙️',
      title: 'Admin Panel',
      desc: 'Tizim boshqaruvi',
      href: '/dashboard/admin',
      gradient: 'from-red-500 to-orange-600',
      glow: 'rgba(239,68,68,0.25)',
      tag: 'Kirish →',
    }] : []),
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-base-100" style={{
      backgroundImage: 'radial-gradient(at 10% 10%, rgba(79,70,229,0.05) 0%, transparent 50%), radial-gradient(at 90% 80%, rgba(124,58,237,0.04) 0%, transparent 50%)'
    }}>
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Hero welcome */}
        <div className="text-center mb-10 fade-up">
          {/* Avatar */}
          <div className="relative inline-block mb-5">
            <div
              className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${rc.gradient} flex items-center justify-center text-4xl shadow-2xl mx-auto`}
              style={{ boxShadow: `0 12px 40px ${rc.glow}` }}
            >
              {rc.emoji}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white online-dot" />
          </div>

          <h1 className="text-3xl font-bold text-base-content mb-2">
            Xush kelibsiz, <span className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">{userProfile?.name?.split(' ')[0] || 'Foydalanuvchi'}</span>!
          </h1>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-base-200 border border-base-300 mt-1">
            <span className="w-2 h-2 rounded-full bg-green-400 online-dot" />
            <span className="text-sm text-base-content/60 font-medium">{rc.label}</span>
          </div>
        </div>

        {/* Stats mini bar */}
        <div className="grid grid-cols-3 gap-3 mb-8 fade-up">
          {[
            { label: 'Online', value: '●', color: 'text-green-500' },
            { label: 'Bugun', value: new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }), color: 'text-indigo-500' },
            { label: 'EduConnect', value: 'v1.0', color: 'text-violet-500' },
          ].map((s) => (
            <div key={s.label} className="glass-card p-3 text-center">
              <p className={`font-bold text-sm ${s.color}`}>{s.value}</p>
              <p className="text-xs text-base-content/40 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-2 gap-4 fade-up">
          {cards.map((card) => {
            const inner = (
              <div
                className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-300 ${
                  card.href
                    ? 'cursor-pointer hover:-translate-y-1 hover:scale-[1.02]'
                    : card.locked
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-default'
                }`}
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(99,102,241,0.1)',
                  boxShadow: card.href ? `0 4px 24px ${card.glow || 'rgba(0,0,0,0.06)'}` : '0 2px 12px rgba(0,0,0,0.04)',
                }}
              >
                {/* Gradient blob */}
                <div
                  className={`absolute -top-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-br ${card.gradient} opacity-15 blur-xl`}
                />

                {/* Icon */}
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-xl mb-4 shadow-lg`}
                  style={{ boxShadow: `0 4px 12px ${card.glow}` }}
                >
                  {card.icon}
                </div>

                <p className="font-bold text-base-content text-sm mb-1">{card.title}</p>
                <p className="text-base-content/50 text-xs leading-relaxed mb-3">{card.desc}</p>

                {card.locked ? (
                  <span className="inline-flex items-center gap-1 text-xs text-base-content/30 font-medium">
                    🔒 Ruxsat yo'q
                  </span>
                ) : card.hint ? (
                  <span className="inline-flex items-center gap-1 text-xs text-base-content/40 font-medium">
                    💡 {card.hint}
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
                    {card.tag}
                  </span>
                )}
              </div>
            );

            return card.href ? (
              <Link key={card.title} href={card.href}>{inner}</Link>
            ) : (
              <div key={card.title}>{inner}</div>
            );
          })}
        </div>

        {/* Bottom hint */}
        <div className="mt-8 glass-card p-4 flex items-center gap-3 fade-up">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-lg flex-shrink-0">
            💡
          </div>
          <div>
            <p className="text-sm font-semibold text-base-content">Chat boshlash uchun</p>
            <p className="text-xs text-base-content/50">Chap menudagi kurslardan kanal tanlang va xabar yozishni boshlang</p>
          </div>
        </div>
      </div>
    </div>
  );
}