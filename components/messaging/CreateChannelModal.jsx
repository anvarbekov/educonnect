'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';

export default function CreateChannelModal({ onClose, onCreated }) {
  const { userProfile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return toast.error('Kanal nomini kiriting');
    setLoading(true);
    try {
      // Direct Firestore write — no helper function complexity
      const ref = await addDoc(collection(db, 'conversations'), {
        type: 'channel',
        title: title.trim(),
        description: description.trim(),
        subscribers: [userProfile.id],
        createdBy: userProfile.id,
        isPublic,
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        lastMessage: '',
      });
      toast.success('Kanal yaratildi! ✅');
      onCreated(ref.id);
    } catch (e) {
      console.error('Create channel error:', e);
      toast.error('Xato: ' + (e.message || 'Noma\'lum'));
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-3xl p-6 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #1a2035, #141928)',
          border: '1px solid rgba(99,102,241,0.25)',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-lg">📢 Yangi kanal</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 text-white/60 transition-colors"
          >✕</button>
        </div>

        <div className="space-y-4 mb-5">
          <div>
            <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Kanal nomi *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: Yangiliklar, E'lonlar..."
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none text-white placeholder-white/30"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Tavsif (ixtiyoriy)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kanal haqida qisqacha..."
              rows={2}
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none text-white placeholder-white/30 resize-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          <div
            className="flex items-center justify-between p-4 rounded-2xl cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            onClick={() => setIsPublic(!isPublic)}
          >
            <div>
              <p className="text-sm font-semibold text-white">
                {isPublic ? '🌍 Ochiq kanal' : '🔒 Yopiq kanal'}
              </p>
              <p className="text-[11px] text-white/40 mt-0.5">
                {isPublic ? 'Barcha foydalanuvchilar ko\'ra oladi' : 'Faqat taklif qilinganlar'}
              </p>
            </div>
            <div
              className="w-12 h-6 rounded-full relative transition-all duration-300 flex-shrink-0"
              style={{ background: isPublic ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.15)' }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300"
                style={{ left: isPublic ? '26px' : '2px' }}
              />
            </div>
          </div>
        </div>

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
            disabled={loading || !title.trim()}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}
          >
            {loading ? '⏳ Yaratilmoqda...' : '✓ Yaratish'}
          </button>
        </div>
      </div>
    </div>
  );
}