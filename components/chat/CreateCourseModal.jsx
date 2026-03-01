'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createCourse, createChannel, addAuditLog } from '@/services/firestore';
import toast from 'react-hot-toast';

export default function CreateCourseModal({ onClose }) {
  const { user, userProfile } = useAuth();
  const [form, setForm] = useState({ title: '', code: '', description: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.code) return toast.error('Nom va kod majburiy');
    setLoading(true);
    try {
      const courseId = await createCourse({
        title: form.title,
        code: form.code.toUpperCase(),
        description: form.description,
        teacherId: user.uid,
        teacherName: userProfile?.name,
      });

      // Create default general channel
      await createChannel({
        courseId,
        title: 'umumiy',
        type: 'course',
        description: 'Umumiy muhokama kanali',
      });

      await addAuditLog(user.uid, 'create_course', courseId, form.title);
      toast.success('Kurs yaratildi!');
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
        <h3 className="font-display font-bold text-lg mb-4">📚 Yangi kurs yaratish</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Kurs nomi</span></label>
            <input
              type="text"
              placeholder="Masalan: Dasturlash asoslari"
              className="input input-bordered"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Kurs kodi</span></label>
            <input
              type="text"
              placeholder="Masalan: CS101"
              className="input input-bordered uppercase"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              maxLength={10}
              required
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Tavsif (ixtiyoriy)</span></label>
            <textarea
              placeholder="Kurs haqida qisqacha..."
              className="textarea textarea-bordered resize-none"
              rows={2}
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
