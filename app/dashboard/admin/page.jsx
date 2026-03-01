'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAllUsers, updateUser, getAuditLogs, addAuditLog } from '@/services/firestore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ROLES = ['student', 'teacher', 'admin'];
const ROLE_LABELS = { student: 'Talaba', teacher: "O'qituvchi", admin: 'Admin' };
const ROLE_ICONS = { student: '👨‍🎓', teacher: '👨‍🏫', admin: '👨‍💼' };
const ROLE_COLORS = {
  student:  { bg: 'rgba(99,102,241,0.1)',   text: '#6366f1', border: 'rgba(99,102,241,0.2)' },
  teacher:  { bg: 'rgba(139,92,246,0.1)',   text: '#8b5cf6', border: 'rgba(139,92,246,0.2)' },
  admin:    { bg: 'rgba(239,68,68,0.1)',    text: '#ef4444', border: 'rgba(239,68,68,0.2)' },
};

const GRAD = [
  'from-violet-500 to-purple-600','from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600','from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600','from-fuchsia-500 to-purple-600',
];
const gc = (id) => GRAD[(id?.charCodeAt(0)||0) % GRAD.length];
const gi = (name) => name?.split(' ').map((n)=>n[0]).join('').toUpperCase().slice(0,2)||'?';

export default function AdminPage() {
  const { userProfile, user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('users');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editingUser, setEditingUser] = useState(null);
  const [statsFilter, setStatsFilter] = useState('all');

  useEffect(() => {
    if (userProfile && userProfile.role !== 'admin') router.push('/dashboard');
  }, [userProfile]);

  useEffect(() => {
    if (userProfile?.role !== 'admin') return;
    loadData();
  }, [userProfile]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, logs] = await Promise.all([getAllUsers(), getAuditLogs(100)]);
      setUsers(u); setAuditLogs(logs);
    } catch {}
    setLoading(false);
  };

  const handleRoleChange = async (uid, newRole) => {
    try {
      await updateUser(uid, { role: newRole });
      await addAuditLog(user.uid, 'change_role', uid, `→ ${newRole}`);
      setUsers((prev) => prev.map((u) => u.id === uid ? { ...u, role: newRole } : u));
      toast.success('Rol o\'zgartirildi ✅');
    } catch { toast.error('Xato'); }
  };

  const handleMute = async (uid, isMuted) => {
    try {
      await updateUser(uid, { isMuted: !isMuted });
      await addAuditLog(user.uid, isMuted ? 'unmute' : 'mute', uid);
      setUsers((prev) => prev.map((u) => u.id === uid ? { ...u, isMuted: !isMuted } : u));
      toast.success(isMuted ? 'Cheklov olib tashlandi' : 'Cheklandi 🚫');
    } catch { toast.error('Xato'); }
  };

  const handleBan = async (uid, isBanned) => {
    if (!isBanned && !confirm('Bu foydalanuvchini ban qilmoqchimisiz?')) return;
    try {
      await updateUser(uid, { isBanned: !isBanned });
      await addAuditLog(user.uid, isBanned ? 'unban' : 'ban', uid);
      setUsers((prev) => prev.map((u) => u.id === uid ? { ...u, isBanned: !isBanned } : u));
      toast.success(isBanned ? 'Ban olib tashlandi' : 'Ban qilindi 🚫');
    } catch { toast.error('Xato'); }
  };

  const stats = [
    { key: 'all',     icon: '👥', label: 'Jami', value: users.length,                          color: '#6366f1', route: null },
    { key: 'admin',   icon: '👨‍💼', label: 'Adminlar', value: users.filter((u)=>u.role==='admin').length,   color: '#ef4444', route: null },
    { key: 'teacher', icon: '👨‍🏫', label: "O'qituvchilar", value: users.filter((u)=>u.role==='teacher').length, color: '#8b5cf6', route: null },
    { key: 'student', icon: '👨‍🎓', label: 'Talabalar', value: users.filter((u)=>u.role==='student').length, color: '#0891b2', route: null },
    { key: 'muted',   icon: '🚫', label: 'Cheklangan', value: users.filter((u)=>u.isMuted).length, color: '#f59e0b', route: null },
    { key: 'banned',  icon: '⛔', label: 'Banned', value: users.filter((u)=>u.isBanned).length,   color: '#ef4444', route: null },
    { key: 'courses', icon: '📚', label: 'Kurslar', value: '→', color: '#10b981', route: '/dashboard/courses' },
    { key: 'survey',  icon: '📋', label: "So'rovnomalar", value: '→', color: '#6366f1', route: '/dashboard/sus-survey' },
    { key: 'analytics',icon: '📊', label: 'Statistika', value: '→', color: '#7c3aed', route: '/dashboard/analytics' },
  ];

  const filteredUsers = users.filter((u) => {
    const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = statsFilter === 'all' ? true :
      statsFilter === 'muted' ? u.isMuted :
      statsFilter === 'banned' ? u.isBanned :
      u.role === statsFilter;
    const matchFilter = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole && matchFilter;
  });

  const ACTION_ICONS = {
    change_role: '🔄', mute: '🔇', unmute: '🔊', ban: '⛔', unban: '✅',
    create_course: '📚', delete_course: '🗑', enroll_course: '📝',
  };

  if (userProfile?.role !== 'admin') return null;

  return (
    <div className="flex-1 overflow-y-auto bg-base-100">
      <div className="max-w-6xl mx-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-black text-2xl text-base-content">🛡️ Admin Panel</h1>
            <p className="text-sm text-base-content/50 mt-0.5">Tizim boshqaruvi va monitoring</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/analytics">
              <button className="px-4 py-2 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
                📊 Statistika →
              </button>
            </Link>
          </div>
        </div>

        {/* Stats Grid — CLICKABLE */}
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 mb-6">
          {stats.map((s) => {
            const isActive = statsFilter === s.key;
            const isLink = !!s.route;
            const inner = (
              <div
                className="p-3 rounded-2xl text-center cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
                style={{
                  background: isActive ? `${s.color}20` : 'var(--base-200,rgba(0,0,0,0.04))',
                  border: `1.5px solid ${isActive ? s.color : 'transparent'}`,
                  boxShadow: isActive ? `0 4px 16px ${s.color}25` : 'none',
                }}
                onClick={() => !isLink && setStatsFilter(isActive ? 'all' : s.key)}
              >
                <div className="text-xl mb-0.5">{s.icon}</div>
                <div className="font-black text-base leading-none" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[9px] font-semibold mt-1 text-base-content/50 truncate">{s.label}</div>
              </div>
            );
            return isLink ? <Link key={s.key} href={s.route}>{inner}</Link> : <div key={s.key}>{inner}</div>;
          })}
        </div>

        {/* Active filter indicator */}
        {statsFilter !== 'all' && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-2xl text-sm font-semibold"
            style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.15)' }}>
            <span>Filtr: {stats.find(s=>s.key===statsFilter)?.label} ({filteredUsers.length} ta)</span>
            <button onClick={() => setStatsFilter('all')} className="ml-auto text-xs hover:opacity-70">✕ Tozalash</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-2xl mb-5 w-fit" style={{ background: 'var(--base-200,rgba(0,0,0,0.04))' }}>
          {[
            { id: 'users', icon: '👥', label: 'Foydalanuvchilar' },
            { id: 'audit', icon: '📋', label: 'Audit Log' },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: tab === t.id ? 'white' : 'transparent',
                color: tab === t.id ? '#6366f1' : 'var(--base-content-50,rgba(0,0,0,0.4))',
                boxShadow: tab === t.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                <span className="loading loading-spinner loading-sm text-white" />
              </div>
              <p className="text-sm text-base-content/50">Yuklanmoqda...</p>
            </div>
          </div>
        ) : tab === 'users' ? (
          <>
            {/* Search + filter */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-48">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ism yoki email bilan qidiring..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm outline-none bg-base-200 text-base-content"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40">🔍</span>
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2.5 rounded-2xl text-sm font-semibold outline-none bg-base-200 text-base-content"
              >
                <option value="all">Barcha rollar</option>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_ICONS[r]} {ROLE_LABELS[r]}</option>)}
              </select>
            </div>

            {/* Users list */}
            <div className="space-y-2">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-4 rounded-2xl transition-all"
                  style={{
                    background: u.isBanned ? 'rgba(239,68,68,0.05)' : 'var(--base-200,rgba(0,0,0,0.04))',
                    border: u.isBanned ? '1px solid rgba(239,68,68,0.15)' : '1px solid transparent',
                    opacity: u.isBanned ? 0.75 : 1,
                  }}
                >
                  {/* Avatar */}
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gc(u.id)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden shadow-md`}>
                    {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" alt="" /> : gi(u.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-base-content">{u.name}</p>
                      {u.id === user?.uid && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                          style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>Sen</span>
                      )}
                      {u.isMuted && <span className="text-[10px]">🔇</span>}
                      {u.isBanned && <span className="text-[10px]">⛔</span>}
                    </div>
                    <p className="text-xs text-base-content/50 truncate">{u.email}</p>
                  </div>

                  {/* Role selector */}
                  {editingUser === u.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={u.role}
                        onChange={(e) => { handleRoleChange(u.id, e.target.value); setEditingUser(null); }}
                        className="text-xs px-2 py-1.5 rounded-xl outline-none font-semibold"
                        style={{
                          background: ROLE_COLORS[u.role].bg,
                          color: ROLE_COLORS[u.role].text,
                          border: `1px solid ${ROLE_COLORS[u.role].border}`,
                        }}
                        autoFocus
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_ICONS[r]} {ROLE_LABELS[r]}</option>)}
                      </select>
                      <button onClick={() => setEditingUser(null)} className="text-xs text-base-content/40 hover:text-base-content">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => u.id !== user?.uid && setEditingUser(u.id)}
                      disabled={u.id === user?.uid}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                      style={{
                        background: ROLE_COLORS[u.role]?.bg || 'transparent',
                        color: ROLE_COLORS[u.role]?.text || 'gray',
                        border: `1px solid ${ROLE_COLORS[u.role]?.border || 'transparent'}`,
                        cursor: u.id === user?.uid ? 'default' : 'pointer',
                      }}
                    >
                      {ROLE_ICONS[u.role]} {ROLE_LABELS[u.role]}
                      {u.id !== user?.uid && <span className="opacity-50">✏️</span>}
                    </button>
                  )}

                  {/* Actions */}
                  {u.id !== user?.uid && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleMute(u.id, u.isMuted)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105"
                        style={u.isMuted
                          ? { background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }
                          : { background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }
                        }
                        title={u.isMuted ? 'Cheklovni olib tashlash' : 'Cheklash'}
                      >
                        {u.isMuted ? '🔊' : '🔇'}
                      </button>
                      <button
                        onClick={() => handleBan(u.id, u.isBanned)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105"
                        style={u.isBanned
                          ? { background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }
                          : { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }
                        }
                        title={u.isBanned ? 'Ban olib tashlash' : 'Ban qilish'}
                      >
                        {u.isBanned ? '✅' : '⛔'}
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {filteredUsers.length === 0 && (
                <div className="flex flex-col items-center py-16 opacity-40">
                  <span className="text-4xl mb-2">👤</span>
                  <p className="text-sm font-semibold text-base-content">Foydalanuvchi topilmadi</p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Audit log */
          <div className="space-y-2">
            {auditLogs.map((log) => {
              const actor = users.find((u) => u.id === log.actorId);
              const target = users.find((u) => u.id === log.target);
              return (
                <div key={log.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: 'var(--base-200,rgba(0,0,0,0.04))' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: 'rgba(99,102,241,0.1)' }}>
                    {ACTION_ICONS[log.action] || '⚡'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-base-content">{actor?.name || log.actorId?.slice(0,8)}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{log.action}</span>
                      {target && <span className="text-xs text-base-content/50">→ {target.name}</span>}
                      {log.details && <span className="text-xs text-base-content/40">{log.details}</span>}
                    </div>
                  </div>
                  <span className="text-[10px] text-base-content/40 flex-shrink-0">
                    {log.createdAt?.toDate ? format(log.createdAt.toDate(), 'dd.MM HH:mm') : '—'}
                  </span>
                </div>
              );
            })}
            {auditLogs.length === 0 && (
              <div className="text-center py-16 opacity-40">
                <p className="text-4xl mb-2">📋</p>
                <p className="text-sm text-base-content">Hozircha log yo'q</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}