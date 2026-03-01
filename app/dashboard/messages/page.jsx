'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, addDoc, query, where, serverTimestamp,
} from 'firebase/firestore';

const GRAD = [
  'from-indigo-400 to-violet-500', 'from-rose-400 to-pink-500',
  'from-amber-400 to-orange-500', 'from-emerald-400 to-teal-500',
  'from-sky-400 to-blue-500', 'from-purple-400 to-fuchsia-500',
];
const colorFor = (id) => GRAD[(id?.charCodeAt(0) || 0) % GRAD.length];
const getInitials = (name) => name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

export default function MessagesIndexPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(null);

  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, 'users')).then((snap) => {
      setUsers(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.id !== user.uid)
      );
      setLoading(false);
    });
  }, [user]);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const startDM = async (other) => {
    setStarting(other.id);
    try {
      const dmKey = [user.uid, other.id].sort().join('_');
      // Check existing
      const existing = await getDocs(
        query(collection(db, 'conversations'), where('dmKey', '==', dmKey))
      );
      let convId;
      if (!existing.empty) {
        convId = existing.docs[0].id;
      } else {
        const ref = await addDoc(collection(db, 'conversations'), {
          type: 'dm',
          dmKey,
          participants: [user.uid, other.id],
          participantNames: {
            [user.uid]: userProfile?.name || '',
            [other.id]: other.name || '',
          },
          createdAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
          lastMessage: '',
        });
        convId = ref.id;
      }
      router.push(`/dashboard/messages/${convId}`);
    } catch (e) {
      console.error(e);
    }
    setStarting(null);
  };

  const ROLE_LABEL = {
    admin: { label: 'Admin', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    teacher: { label: "O'qituvchi", color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
    student: { label: 'Talaba', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  };

  return (
    <div className="flex-1 flex flex-col bg-base-100">

      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-base-200 flex-shrink-0">
        <h1 className="font-bold text-xl text-base-content mb-1">💬 Xabarlar</h1>
        <p className="text-sm text-base-content/50 mb-4">
          Suhbat boshlash uchun foydalanuvchini tanlang
        </p>

        {/* Search */}
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ism yoki email bilan qidiring..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm outline-none transition-all bg-base-200 text-base-content placeholder-base-content/40"
            style={{ border: '1.5px solid transparent' }}
            onFocus={(e) => { e.target.style.borderColor = '#6366f1'; }}
            onBlur={(e) => { e.target.style.borderColor = 'transparent'; }}
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40 text-sm">🔍</span>
        </div>
      </div>

      {/* Users list */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl">
                <div className="w-12 h-12 rounded-2xl bg-base-200 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-base-200 rounded-full animate-pulse w-1/3" />
                  <div className="h-2.5 bg-base-200 rounded-full animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 opacity-40">
            <span className="text-5xl mb-3">👤</span>
            <p className="font-semibold text-base-content">Foydalanuvchi topilmadi</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-1.5">
            {/* Grouped by role */}
            {['admin', 'teacher', 'student'].map((role) => {
              const roleUsers = filtered.filter((u) => u.role === role);
              if (roleUsers.length === 0) return null;
              const rc = ROLE_LABEL[role];
              return (
                <div key={role} className="mb-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider px-3 mb-2"
                    style={{ color: rc.color }}>
                    {rc.label}lar — {roleUsers.length} ta
                  </p>
                  <div className="space-y-1">
                    {roleUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => startDM(u)}
                        disabled={starting === u.id}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all hover:bg-base-200 group"
                      >
                        {/* Avatar */}
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorFor(u.id)} flex items-center justify-center text-white font-bold flex-shrink-0 shadow-md overflow-hidden`}>
                          {u.avatar
                            ? <img src={u.avatar} className="w-full h-full object-cover" alt="" />
                            : getInitials(u.name)
                          }
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-sm text-base-content truncate">{u.name}</p>
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: rc.bg, color: rc.color }}
                            >
                              {rc.label}
                            </span>
                          </div>
                          <p className="text-xs text-base-content/50 truncate">{u.email}</p>
                        </div>

                        {/* Action */}
                        <div
                          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}
                        >
                          {starting === u.id ? (
                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                          ) : (
                            <span className="text-sm">💬</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}