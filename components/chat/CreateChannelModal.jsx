'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createChannel, addAuditLog } from '@/services/firestore';
import toast from 'react-hot-toast';

export default function CreateChannelModal({ courseId, onClose }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ title: '', type: 'course', description: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) return toast.error('Kanal nomi majburiy');
    setLoading(true);
    try {
      const channelId = await createChannel({
        courseId,
        title: form.title.toLowerCase().replace(/\s+/g, '-'),
        type: form.type,
        description: form.description,
      });
      await addAuditLog(user.uid, 'create_channel', channelId, form.title);
      toast.success('Kanal yaratildi!');
      onClose();
    } catch {
      toast.error('Xato yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box rounded-2xl">
        <h3 className="font-display font-bold text-lg mb-4">💬 Yangi kanal yaratish</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Kanal nomi</span></label>
            <div className="flex items-center gap-2">
              <span className="text-base-content/40 text-lg">#</span>
              <input
                type="text"
                placeholder="masalan: lab-1-topshiriqlari"
                className="input input-bordered flex-1"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Tur</span></label>
            <select
              className="select select-bordered"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="course">📚 Kurs kanali</option>
              <option value="general">💬 Umumiy</option>
              <option value="announcement">📢 E'lon</option>
            </select>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Tavsif</span></label>
            <input
              type="text"
              placeholder="Kanal maqsadi..."
              className="input input-bordered"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="modal-action mt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost rounded-xl">Bekor</button>
            <button type="submit" className="btn btn-primary rounded-xl" disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-sm" /> : null}
              Yaratish
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
