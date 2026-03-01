'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createGroup } from '@/services/firestore';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';

export default function CreateGroupModal({ onClose, onCreated }) {
  const { userProfile } = useAuth();
  const [title, setTitle] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Load all users once
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const users = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.id !== userProfile?.id);
        setAllUsers(users);
      } catch (e) {
        console.error('Users load error:', e);
      }
      setLoadingUsers(false);
    };
    load();
  }, [userProfile?.id]);

  // Filter on search
  useEffect(() => {
    if (!searchQ.trim()) {
      setSearchResults(allUsers.filter((u) => !selectedUsers.find((s) => s.id === u.id)));
      return;
    }
    const q = searchQ.toLowerCase();
    setSearchResults(
      allUsers.filter(
        (u) =>
          !selectedUsers.find((s) => s.id === u.id) &&
          (u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
      )
    );
  }, [searchQ, allUsers, selectedUsers]);

  const addUser = (u) => {
    setSelectedUsers((prev) => [...prev, u]);
    setSearchQ('');
  };

  const removeUser = (uid) => setSelectedUsers((prev) => prev.filter((u) => u.id !== uid));

  const handleCreate = async () => {
    if (!title.trim()) return toast.error("Guruh nomini kiriting");
    if (selectedUsers.length === 0) return toast.error("Kamida 1 ta a'zo qo'shing");
    setLoading(true);
    try {
      const memberIds = [userProfile.id, ...selectedUsers.map((u) => u.id)];
      const id = await createGroup(title.trim(), memberIds, userProfile.id);
      toast.success('Guruh yaratildi! ✅');
      onCreated(id);
    } catch (e) {
      console.error('Create group error:', e);
      toast.error('Xato: ' + (e.message || 'Noma\'lum xato'));
    }
    setLoading(false);
  };

  const getInitials = (name) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const gradients = [
    'from-indigo-400 to-violet-500',
    'from-rose-400 to-pink-500',
    'from-amber-400 to-orange-500',
    'from-emerald-400 to-teal-500',
    'from-sky-400 to-blue-500',
  ];
  const colorFor = (id) => gradients[(id?.charCodeAt(0) || 0) % gradients.length];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-3xl p-6 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #1a2035, #141928)',
          border: '1px solid rgba(99,102,241,0.25)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-lg">👥 Yangi guruh</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10 text-white/60"
          >✕</button>
        </div>

        {/* Group name */}
        <div className="mb-4">
          <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">
            Guruh nomi *
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Masalan: Frontend Kurs #1"
            className="w-full px-4 py-3 rounded-2xl text-sm outline-none text-white placeholder-white/30"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />
        </div>

        {/* Selected members */}
        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  background: 'rgba(99,102,241,0.2)',
                  color: '#a5b4fc',
                  border: '1px solid rgba(99,102,241,0.3)',
                }}
              >
                {u.name?.split(' ')[0]}
                <button onClick={() => removeUser(u.id)} className="hover:text-white ml-0.5 opacity-70">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* User search */}
        <div className="mb-4">
          <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">
            A'zo qo'shish ({selectedUsers.length} ta tanlandi)
          </label>
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Ism yoki email bilan qidiring..."
            className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none text-white placeholder-white/30 mb-2"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />

          {/* User list */}
          <div
            className="rounded-2xl overflow-hidden overflow-y-auto"
            style={{
              maxHeight: '180px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {loadingUsers ? (
              <div className="flex justify-center py-4">
                <span className="loading loading-spinner loading-sm text-primary" />
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-center py-4 text-xs text-white/30">
                {allUsers.length === 0 ? 'Foydalanuvchilar topilmadi' : 'Hamma qo\'shildi'}
              </p>
            ) : (
              searchResults.slice(0, 8).map((u) => (
                <button
                  key={u.id}
                  onClick={() => addUser(u)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/8 transition-colors text-left border-b border-white/5 last:border-0"
                >
                  <div
                    className={`w-8 h-8 rounded-xl bg-gradient-to-br ${colorFor(u.id)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                  >
                    {u.avatar
                      ? <img src={u.avatar} className="w-full h-full object-cover rounded-xl" alt="" />
                      : getInitials(u.name)
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">{u.name}</p>
                    <p className="text-[10px] text-white/40 truncate">
                      {u.role === 'teacher' ? "O'qituvchi" : u.role === 'admin' ? 'Admin' : 'Talaba'} • {u.email}
                    </p>
                  </div>
                  <span className="text-white/30 text-sm flex-shrink-0">+</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Bekor
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !title.trim() || selectedUsers.length === 0}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
            }}
          >
            {loading ? '⏳ Yaratilmoqda...' : `✓ Yaratish (${selectedUsers.length + 1} ta)`}
          </button>
        </div>
      </div>
    </div>
  );
}