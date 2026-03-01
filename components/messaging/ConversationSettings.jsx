'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const GRAD = [
  'from-indigo-400 to-violet-500', 'from-rose-400 to-pink-500',
  'from-amber-400 to-orange-500', 'from-emerald-400 to-teal-500',
  'from-sky-400 to-blue-500', 'from-purple-400 to-fuchsia-500',
];
const colorFor = (id) => GRAD[(id?.charCodeAt(0) || 0) % GRAD.length];
const getInitials = (name) => name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

export default function ConversationSettings({ conv, onClose }) {
  const { user, userProfile } = useAuth();
  const router = useRouter();

  const [allUsers, setAllUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('members'); // 'members' | 'add' | 'settings'

  const isAdmin = userProfile?.role === 'admin';
  const isOwner = conv?.createdBy === user?.uid;
  const canManage = isAdmin || isOwner;

  // Current member IDs
  const memberIds = conv?.type === 'group'
    ? (conv?.members || [])
    : (conv?.subscribers || []);

  useEffect(() => {
    // Load all users
    getDocs(collection(db, 'users')).then((snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllUsers(list);
      setMembers(list.filter((u) => memberIds.includes(u.id)));
    });
  }, [conv?.id]);

  const nonMembers = allUsers.filter(
    (u) => !memberIds.includes(u.id) && (
      !search || u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const addMember = async (uid) => {
    setSaving(true);
    try {
      const field = conv.type === 'group' ? 'members' : 'subscribers';
      await updateDoc(doc(db, 'conversations', conv.id), {
        [field]: arrayUnion(uid),
      });
      const u = allUsers.find((u) => u.id === uid);
      setMembers((prev) => [...prev, u]);
      toast.success(`${u?.name} qo'shildi!`);
    } catch (e) {
      toast.error('Xato: ' + e.message);
    }
    setSaving(false);
  };

  const removeMember = async (uid) => {
    if (uid === conv?.createdBy) return toast.error("Yaratuvchini o'chirish mumkin emas");
    if (!confirm("A'zoni o'chirmoqchimisiz?")) return;
    setSaving(true);
    try {
      const field = conv.type === 'group' ? 'members' : 'subscribers';
      await updateDoc(doc(db, 'conversations', conv.id), {
        [field]: arrayRemove(uid),
      });
      setMembers((prev) => prev.filter((u) => u.id !== uid));
      toast.success("A'zo o'chirildi");
    } catch (e) {
      toast.error('Xato: ' + e.message);
    }
    setSaving(false);
  };

  const [editTitle, setEditTitle] = useState(conv?.title || '');
  const [editDesc, setEditDesc] = useState(conv?.description || '');

  const saveSettings = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'conversations', conv.id), {
        title: editTitle.trim(),
        description: editDesc.trim(),
      });
      toast.success('Saqlandi ✅');
      onClose();
    } catch {
      toast.error('Xato');
    }
    setSaving(false);
  };

  const deleteConv = async () => {
    if (!confirm("Bu suhbatni o'chirmoqchimisiz? Barcha xabarlar o'chadi.")) return;
    try {
      await deleteDoc(doc(db, 'conversations', conv.id));
      router.push('/dashboard/messages');
      onClose();
      toast.success("O'chirildi");
    } catch {
      toast.error('Xato');
    }
  };

  const typeLabel = conv?.type === 'group' ? 'Guruh' : 'Kanal';
  const memberField = conv?.type === 'group' ? "A'zolar" : 'Obunachlar';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--card-bg, white)', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${colorFor(conv?.id)} flex items-center justify-center text-white font-bold text-sm`}
            >
              {conv?.type === 'group' ? '👥' : '📢'}
            </div>
            <div>
              <p className="font-bold text-sm text-base-content">{conv?.title}</p>
              <p className="text-[11px] text-base-content/50">{typeLabel} sozlamalari</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-base-200 text-base-content/50 transition-colors"
          >✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-base-200 flex-shrink-0">
          {[
            { id: 'members', label: `${memberField} (${members.length})` },
            { id: 'add', label: "Qo'shish" },
            ...(canManage ? [{ id: 'settings', label: 'Sozlamalar' }] : []),
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2.5 text-xs font-semibold transition-all"
              style={{
                color: tab === t.id ? '#6366f1' : 'rgba(0,0,0,0.4)',
                borderBottom: tab === t.id ? '2px solid #6366f1' : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>

          {/* Members list */}
          {tab === 'members' && (
            <div className="p-3 space-y-1">
              {members.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-base-100 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${colorFor(u.id)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden`}>
                    {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" alt="" /> : getInitials(u.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-base-content truncate">{u.name}</p>
                      {u.id === conv?.createdBy && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                          style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>Admin</span>
                      )}
                    </div>
                    <p className="text-[11px] text-base-content/50 truncate">{u.email}</p>
                  </div>
                  {canManage && u.id !== user?.uid && u.id !== conv?.createdBy && (
                    <button
                      onClick={() => removeMember(u.id)}
                      disabled={saving}
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-error hover:bg-error/10 transition-colors text-xs"
                    >✕</button>
                  )}
                </div>
              ))}
              {members.length === 0 && (
                <p className="text-center py-8 text-sm text-base-content/40">A'zo yo'q</p>
              )}
            </div>
          )}

          {/* Add members */}
          {tab === 'add' && (
            <div className="p-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ism yoki email bilan qidiring..."
                className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none mb-3 bg-base-200 text-base-content placeholder-base-content/40"
              />
              <div className="space-y-1">
                {nonMembers.slice(0, 10).map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-base-100 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${colorFor(u.id)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden`}>
                      {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" alt="" /> : getInitials(u.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-base-content truncate">{u.name}</p>
                      <p className="text-[11px] text-base-content/50 truncate">{u.role} • {u.email}</p>
                    </div>
                    <button
                      onClick={() => addMember(u.id)}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                    >
                      + Qo'shish
                    </button>
                  </div>
                ))}
                {nonMembers.length === 0 && (
                  <p className="text-center py-6 text-sm text-base-content/40">
                    {search ? 'Topilmadi' : 'Hamma allaqachon qo\'shilgan'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Settings */}
          {tab === 'settings' && canManage && (
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-base-content/50 uppercase tracking-wider mb-1.5">
                  {typeLabel} nomi
                </label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl text-sm outline-none bg-base-200 text-base-content"
                />
              </div>
              {conv?.type === 'channel' && (
                <div>
                  <label className="block text-xs font-bold text-base-content/50 uppercase tracking-wider mb-1.5">Tavsif</label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl text-sm outline-none bg-base-200 text-base-content resize-none"
                  />
                </div>
              )}

              <button
                onClick={saveSettings}
                disabled={saving}
                className="w-full py-3 rounded-2xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                {saving ? '⏳ Saqlanmoqda...' : '✓ Saqlash'}
              </button>

              {isAdmin && (
                <button
                  onClick={deleteConv}
                  className="w-full py-3 rounded-2xl text-sm font-bold text-error"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  🗑️ {typeLabel}ni o'chirish
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}