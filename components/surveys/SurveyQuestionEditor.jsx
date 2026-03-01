'use client';

import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';

export default function SurveyQuestionEditor({ survey, onClose }) {
  const [questions, setQuestions] = useState([...(survey.questions || [])]);
  const [saving, setSaving] = useState(false);
  const [newText, setNewText] = useState('');
  const [newPositive, setNewPositive] = useState(true);

  const addQ = () => {
    if (!newText.trim()) return toast.error('Savol matnini kiriting');
    setQuestions([...questions, {
      id: questions.length + 1,
      text: newText.trim(),
      positive: newPositive,
    }]);
    setNewText('');
    setNewPositive(true);
  };

  const removeQ = (idx) => {
    setQuestions(questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, id: i + 1 })));
  };

  const updateQ = (idx, field, val) => {
    setQuestions(questions.map((q, i) => i === idx ? { ...q, [field]: val } : q));
  };

  const save = async () => {
    if (questions.length === 0) return toast.error('Kamida 1 ta savol bo\'lishi kerak');
    setSaving(true);
    try {
      await updateDoc(doc(db, 'surveys', survey.id), { questions });
      toast.success('Savollar saqlandi! ✅');
      onClose?.();
    } catch (e) {
      toast.error('Xato: ' + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl bg-base-100 border border-base-300"
        style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-200 flex-shrink-0">
          <div>
            <h3 className="font-bold text-base text-base-content">📋 Savollarni tahrirlash</h3>
            <p className="text-xs text-base-content/50">{survey.title}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-base-200 text-base-content/50 transition-colors">✕</button>
        </div>

        {/* Questions list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {questions.map((q, i) => (
            <div key={i} className="flex gap-2 items-start p-3 rounded-2xl bg-base-200 group">
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                {i + 1}
              </span>
              <textarea
                value={q.text}
                onChange={(e) => updateQ(i, 'text', e.target.value)}
                rows={2}
                className="flex-1 bg-transparent text-sm text-base-content outline-none resize-none"
              />
              <div className="flex flex-col gap-1 items-end flex-shrink-0">
                <select
                  value={q.positive ? 'pos' : 'neg'}
                  onChange={(e) => updateQ(i, 'positive', e.target.value === 'pos')}
                  className="text-[10px] px-2 py-1 rounded-lg outline-none"
                  style={{ background: q.positive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: q.positive ? '#10b981' : '#ef4444', border: 'none' }}>
                  <option value="pos">✅ Musbat</option>
                  <option value="neg">❌ Manfiy</option>
                </select>
                <button onClick={() => removeQ(i)}
                  className="opacity-0 group-hover:opacity-100 text-error hover:bg-error/10 w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-all">
                  🗑
                </button>
              </div>
            </div>
          ))}

          {questions.length === 0 && (
            <div className="text-center py-8 opacity-40">
              <p className="text-2xl mb-1">📝</p>
              <p className="text-sm text-base-content">Hali savol yo'q</p>
            </div>
          )}
        </div>

        {/* Add new question */}
        <div className="px-4 pb-4 flex-shrink-0">
          <div className="p-3 rounded-2xl border border-dashed border-base-300 bg-base-100">
            <p className="text-[11px] font-bold text-base-content/50 uppercase tracking-wider mb-2">Yangi savol qo'shish</p>
            <div className="flex gap-2">
              <input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addQ()}
                placeholder="Savol matni..."
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none bg-base-200 text-base-content"
              />
              <select
                value={newPositive ? 'pos' : 'neg'}
                onChange={(e) => setNewPositive(e.target.value === 'pos')}
                className="text-xs px-3 py-2 rounded-xl outline-none bg-base-200 text-base-content">
                <option value="pos">✅ Musbat</option>
                <option value="neg">❌ Manfiy</option>
              </select>
              <button onClick={addQ}
                className="px-3 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                + Qo'sh
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 pb-4 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold btn btn-ghost">Bekor</button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            {saving ? '⏳ Saqlanmoqda...' : `✓ Saqlash (${questions.length} savol)`}
          </button>
        </div>
      </div>
    </div>
  );
}