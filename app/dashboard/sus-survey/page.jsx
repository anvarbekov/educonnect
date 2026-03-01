'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  subscribeSurveys, createSurvey, deleteSurvey,
  submitSurveyResponse, getSurveyResponses, getUserSurveyResponse,
  getLegacySusResponses,
} from '@/services/firestore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Papa from 'papaparse';

const DEFAULT_SUS = [
  { id: 1, text: "Men bu tizimni tez-tez ishlatmoqchiman.", positive: true },
  { id: 2, text: "Tizim keraksiz darajada murakkab.", positive: false },
  { id: 3, text: "Tizim ishlatish oson deb o'ylayman.", positive: true },
  { id: 4, text: "Tizimdan foydalanish uchun texnik mutaxassisga muhtojman.", positive: false },
  { id: 5, text: "Tizimdagi funksiyalar yaxshi integratsiyalashgan.", positive: true },
  { id: 6, text: "Tizimda juda ko'p nomuvofiqliqlar bor.", positive: false },
  { id: 7, text: "Ko'pchilik bu tizimni tez o'rganadi deb o'ylayman.", positive: true },
  { id: 8, text: "Tizim juda noqulay.", positive: false },
  { id: 9, text: "Tizimdan foydalanishda o'zimni ishonchli his qildim.", positive: true },
  { id: 10, text: "Tizimni ishlatishni boshlashdan oldin ko'p narsalarni o'rganishim kerak edi.", positive: false },
];

const SURVEY_TYPES = [
  { value: 'sus', label: 'SUS (System Usability Scale)', desc: '10 ta standart savol, 0-100 ball', icon: '📊' },
  { value: 'custom', label: "Maxsus so'rovnoma", desc: 'O\'z savollaringizni qo\'shing', icon: '✏️' },
  { value: 'satisfaction', label: 'Qoniqish so\'rovnomasi', desc: 'Umumiy foydalanuvchi tajribasi', icon: '⭐' },
];

function calcSUSScore(answers, questions) {
  let total = 0;
  questions.forEach((q) => {
    const val = answers[q.id];
    if (val === undefined) return;
    if (q.positive) total += val - 1;
    else total += 5 - val;
  });
  return total * 2.5;
}

function getScoreInfo(score) {
  if (score >= 85) return { label: "A'lo", color: 'text-success', bg: 'bg-success/10', emoji: '🌟', grade: 'A' };
  if (score >= 72) return { label: 'Yaxshi', color: 'text-info', bg: 'bg-info/10', emoji: '👍', grade: 'B' };
  if (score >= 52) return { label: "O'rta", color: 'text-warning', bg: 'bg-warning/10', emoji: '📊', grade: 'C' };
  return { label: 'Yomon', color: 'text-error', bg: 'bg-error/10', emoji: '⚠️', grade: 'F' };
}

export default function SusSurveyPage() {
  const { user, userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'admin';
  const isTeacher = userProfile?.role === 'teacher';
  const canManage = isAdmin || isTeacher;

  const [tab, setTab] = useState('available'); // 'available' | 'admin' | 'results'
  const [surveys, setSurveys] = useState([]);
  const [activeSurvey, setActiveSurvey] = useState(null);
  const [userResponse, setUserResponse] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [responses, setResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Admin create state
  const [showCreate, setShowCreate] = useState(false);
  const [newSurvey, setNewSurvey] = useState({
    title: '', description: '', type: 'sus',
    questions: DEFAULT_SUS,
    targetRole: 'all',
  });
  const [creating, setCreating] = useState(false);
  const [editQuestion, setEditQuestion] = useState(null);

  useEffect(() => {
    const unsub = subscribeSurveys(setSurveys);
    return unsub;
  }, []);

  useEffect(() => {
    if (!activeSurvey || !user) return;
    setLoadingResponses(true);
    getUserSurveyResponse(activeSurvey.id, user.uid).then((res) => {
      setUserResponse(res);
      setLoadingResponses(false);
    });
  }, [activeSurvey, user]);

  const handleSelectSurvey = async (survey) => {
    setActiveSurvey(survey);
    setAnswers({});
    setUserResponse(null);
    const res = await getUserSurveyResponse(survey.id, user.uid);
    setUserResponse(res);
  };

  const handleSubmit = async () => {
    const qs = activeSurvey.questions || DEFAULT_SUS;
    if (Object.keys(answers).length < qs.length) {
      return toast.error('Barcha savollarga javob bering');
    }
    setSubmitting(true);
    try {
      let score = null;
      if (activeSurvey.type === 'sus') {
        score = calcSUSScore(answers, qs);
      } else {
        const total = Object.values(answers).reduce((s, v) => s + v, 0);
        score = (total / (qs.length * 5)) * 100;
      }
      await submitSurveyResponse(
        activeSurvey.id, user.uid, userProfile?.name, userProfile?.role, answers, score
      );
      setUserResponse({ score, answers });
      toast.success("So'rovnoma yuborildi! ✅");
    } catch { toast.error('Xato yuz berdi'); }
    setSubmitting(false);
  };

  const handleCreateSurvey = async () => {
    if (!newSurvey.title.trim()) return toast.error('Sarlavha kiriting');
    if (newSurvey.questions.length === 0) return toast.error('Kamida 1 ta savol qo\'shing');
    setCreating(true);
    try {
      await createSurvey({
        title: newSurvey.title,
        description: newSurvey.description,
        type: newSurvey.type,
        questions: newSurvey.questions,
        targetRole: newSurvey.targetRole,
        createdBy: user.uid,
      });
      toast.success("So'rovnoma yaratildi!");
      setShowCreate(false);
      setNewSurvey({ title: '', description: '', type: 'sus', questions: DEFAULT_SUS, targetRole: 'all' });
    } catch { toast.error('Xato'); }
    setCreating(false);
  };

  const handleViewResults = async (survey) => {
    setActiveSurvey(survey);
    setTab('results');
    setLoadingResponses(true);
    const res = await getSurveyResponses(survey.id);
    setResponses(res);
    setLoadingResponses(false);
  };

  const exportCSV = () => {
    const data = responses.map((r) => ({
      Foydalanuvchi: r.userName,
      Rol: r.userRole,
      Ball: r.score?.toFixed(1),
      Baho: r.score ? getScoreInfo(r.score).label : '',
      Vaqt: r.submittedAt?.toDate ? format(r.submittedAt.toDate(), 'dd.MM.yyyy HH:mm') : '',
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `survey_${activeSurvey?.title || 'results'}_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
  };

  const avgScore = responses.length > 0
    ? responses.reduce((s, r) => s + (r.score || 0), 0) / responses.length
    : null;

  return (
    <div className="flex-1 flex h-full overflow-hidden">

      {/* Left panel - survey list */}
      <div className="w-72 flex-shrink-0 border-r border-base-300 flex flex-col bg-base-100">
        <div className="p-4 border-b border-base-300 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base-content">📋 So'rovnomalar</h2>
            {canManage && (
              <button onClick={() => setShowCreate(true)}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-sm font-bold text-white transition-all hover:scale-110"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>+</button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.04)' }}>
            {['available', ...(canManage ? ['admin'] : [])].map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-1.5 text-xs font-semibold transition-all"
                style={{
                  background: tab === t ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                  color: tab === t ? 'white' : 'rgba(0,0,0,0.5)',
                  borderRadius: '10px',
                }}>
                {t === 'available' ? '📋 Mavjud' : '⚙️ Boshqarish'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {surveys.length === 0 ? (
            <div className="text-center py-8 opacity-40">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-xs text-base-content">Hali so'rovnoma yo'q</p>
            </div>
          ) : (
            surveys.map((sv) => (
              <div key={sv.id}
                onClick={() => handleSelectSurvey(sv)}
                className="p-3 rounded-2xl cursor-pointer transition-all"
                style={{
                  background: activeSurvey?.id === sv.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                  border: activeSurvey?.id === sv.id ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{SURVEY_TYPES.find((t) => t.value === sv.type)?.icon || '📊'}</span>
                  <p className="text-xs font-bold text-base-content truncate">{sv.title}</p>
                  {sv.isActive && <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />}
                </div>
                <p className="text-[10px] text-base-content/50 truncate">{sv.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-base-content/40">{sv.questions?.length || 10} ta savol</span>
                  {canManage && (
                    <div className="flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); handleViewResults(sv); }}
                        className="text-[10px] px-2 py-0.5 rounded-lg text-primary hover:bg-primary/10 transition-colors">
                        Natijalar
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); if (confirm('O\'chirishni tasdiqlaysizmi?')) deleteSurvey(sv.id); }}
                        className="text-[10px] px-2 py-0.5 rounded-lg text-error hover:bg-error/10 transition-colors">
                        O'chir
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto p-6 bg-base-100">
        {/* Results view */}
        {tab === 'results' && activeSurvey && (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-bold text-xl text-base-content">{activeSurvey.title} — Natijalar</h2>
                <p className="text-sm text-base-content/50">{responses.length} ta javob</p>
              </div>
              <button onClick={exportCSV} className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                📥 CSV Export
              </button>
            </div>

            {avgScore !== null && (
              <div className="glass-card p-5 mb-6 flex items-center gap-5">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${getScoreInfo(avgScore).bg}`}>
                  {getScoreInfo(avgScore).emoji}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-base-content/60">O'rtacha ball</p>
                  <p className={`text-4xl font-black ${getScoreInfo(avgScore).color}`}>{avgScore.toFixed(1)}</p>
                  <p className="text-sm font-semibold text-base-content/70">{getScoreInfo(avgScore).label}</p>
                </div>
                <div className="flex-1">
                  <div className="w-full h-3 rounded-full bg-base-300 overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${avgScore}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
                  </div>
                  <p className="text-xs text-base-content/40 mt-1">{responses.length} ta foydalanuvchi</p>
                </div>
              </div>
            )}

            {loadingResponses ? (
              <div className="flex justify-center py-10"><span className="loading loading-dots loading-md text-primary" /></div>
            ) : (
              <div className="glass-card overflow-hidden">
                <table className="table table-sm w-full">
                  <thead>
                    <tr className="border-b border-base-200">
                      <th className="text-xs">Foydalanuvchi</th>
                      <th className="text-xs">Rol</th>
                      <th className="text-xs">Ball</th>
                      <th className="text-xs">Baho</th>
                      <th className="text-xs">Vaqt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map((r) => {
                      const info = getScoreInfo(r.score || 0);
                      return (
                        <tr key={r.id} className="hover:bg-base-200/50">
                          <td className="font-medium text-sm">{r.userName}</td>
                          <td className="text-xs capitalize text-base-content/60">{r.userRole}</td>
                          <td><span className={`font-bold text-sm ${info.color}`}>{r.score?.toFixed(1)}</span></td>
                          <td>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${info.bg} ${info.color}`}>
                              {info.emoji} {info.label}
                            </span>
                          </td>
                          <td className="text-xs text-base-content/50">
                            {r.submittedAt?.toDate ? format(r.submittedAt.toDate(), 'dd.MM.yy HH:mm') : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Fill survey */}
        {tab === 'available' && activeSurvey && !loadingResponses && (
          <div className="max-w-2xl mx-auto">
            <h2 className="font-bold text-xl text-base-content mb-1">{activeSurvey.title}</h2>
            {activeSurvey.description && <p className="text-sm text-base-content/60 mb-4">{activeSurvey.description}</p>}

            {userResponse ? (
              // Already submitted
              <div className="glass-card p-8 text-center">
                {userResponse.score !== null && (
                  <>
                    <div className="text-6xl mb-4">{getScoreInfo(userResponse.score).emoji}</div>
                    <p className="text-5xl font-black text-primary mb-2">{userResponse.score?.toFixed(1)}</p>
                    <p className={`text-lg font-bold mb-3 ${getScoreInfo(userResponse.score).color}`}>
                      {getScoreInfo(userResponse.score).label}
                    </p>
                    <div className="w-full h-4 rounded-full bg-base-300 mb-3 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${userResponse.score}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
                    </div>
                  </>
                )}
                <p className="text-sm text-base-content/60">✅ So'rovnomani to'ldirdingiz. Rahmat!</p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl p-3 mb-4 text-sm text-info"
                  style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)' }}>
                  1 = Qat'iyan rozi emas &nbsp;|&nbsp; 5 = To'liq roziman
                </div>
                <div className="space-y-3 mb-6">
                  {(activeSurvey.questions || DEFAULT_SUS).map((q, idx) => (
                    <div key={q.id}
                      className="glass-card p-4 transition-all"
                      style={{ border: answers[q.id] ? '1px solid rgba(99,102,241,0.2)' : undefined }}>
                      <p className="text-sm font-medium text-base-content mb-3">
                        <span className="font-bold text-primary mr-2">{idx + 1}.</span>
                        {q.text}
                        {!q.positive && <span className="text-[10px] text-base-content/30 ml-2">(teskari)</span>}
                      </p>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] text-base-content/40 w-24">Rozi emas</span>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button key={val} onClick={() => setAnswers({ ...answers, [q.id]: val })}
                              className="w-10 h-10 rounded-xl font-bold text-sm transition-all"
                              style={{
                                background: answers[q.id] === val
                                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                  : 'rgba(0,0,0,0.05)',
                                color: answers[q.id] === val ? 'white' : 'rgba(0,0,0,0.5)',
                                transform: answers[q.id] === val ? 'scale(1.12)' : 'scale(1)',
                                boxShadow: answers[q.id] === val ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                              }}>
                              {val}
                            </button>
                          ))}
                        </div>
                        <span className="text-[10px] text-base-content/40 w-24 text-right">Roziman</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={handleSubmit} disabled={submitting}
                  className="w-full py-4 rounded-2xl font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 24px rgba(99,102,241,0.3)', opacity: Object.keys(answers).length < (activeSurvey.questions || DEFAULT_SUS).length ? 0.6 : 1 }}>
                  {submitting ? '⏳ Yuborilmoqda...' : `✓ Yuborish (${Object.keys(answers).length}/${(activeSurvey.questions || DEFAULT_SUS).length})`}
                </button>
              </>
            )}
          </div>
        )}

        {/* No survey selected */}
        {!activeSurvey && (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <span className="text-5xl mb-3">📋</span>
            <p className="font-semibold text-base-content">So'rovnoma tanlang</p>
          </div>
        )}
      </div>

      {/* Create survey modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl p-6 shadow-2xl bg-base-100 border border-base-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg text-base-content">📋 Yangi so'rovnoma</h3>
              <button onClick={() => setShowCreate(false)} className="btn-icon">✕</button>
            </div>

            <div className="space-y-4">
              {/* Type selector */}
              <div>
                <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2 block">Tur</label>
                <div className="grid grid-cols-3 gap-2">
                  {SURVEY_TYPES.map((type) => (
                    <button key={type.value} onClick={() => {
                      setNewSurvey({ ...newSurvey, type: type.value, questions: type.value === 'sus' ? DEFAULT_SUS : [] });
                    }}
                      className="p-3 rounded-2xl text-left transition-all"
                      style={{
                        background: newSurvey.type === type.value ? 'rgba(99,102,241,0.1)' : 'rgba(0,0,0,0.03)',
                        border: newSurvey.type === type.value ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(0,0,0,0.06)',
                      }}>
                      <span className="text-xl block mb-1">{type.icon}</span>
                      <p className="text-xs font-bold text-base-content">{type.label}</p>
                      <p className="text-[10px] text-base-content/50">{type.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1 block">Sarlavha *</label>
                <input value={newSurvey.title} onChange={(e) => setNewSurvey({ ...newSurvey, title: e.target.value })}
                  placeholder="So'rovnoma nomi..."
                  className="input input-bordered w-full rounded-2xl text-sm" />
              </div>

              <div>
                <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1 block">Tavsif</label>
                <textarea value={newSurvey.description} onChange={(e) => setNewSurvey({ ...newSurvey, description: e.target.value })}
                  placeholder="Qisqacha tavsif..." rows={2}
                  className="textarea textarea-bordered w-full rounded-2xl text-sm resize-none" />
              </div>

              <div>
                <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1 block">Maqsadli guruh</label>
                <select value={newSurvey.targetRole} onChange={(e) => setNewSurvey({ ...newSurvey, targetRole: e.target.value })}
                  className="select select-bordered w-full rounded-2xl text-sm">
                  <option value="all">Hammasi</option>
                  <option value="student">Faqat talabalar</option>
                  <option value="teacher">Faqat o'qituvchilar</option>
                </select>
              </div>

              {/* Questions (for custom type) */}
              {newSurvey.type !== 'sus' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Savollar</label>
                    <button onClick={() => setNewSurvey({
                      ...newSurvey,
                      questions: [...newSurvey.questions, { id: Date.now(), text: '', positive: true }]
                    })}
                      className="text-xs px-2 py-1 rounded-lg text-primary hover:bg-primary/10 transition-colors font-semibold">
                      + Savol qo'shish
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {newSurvey.questions.map((q, i) => (
                      <div key={q.id} className="flex gap-2 items-center">
                        <span className="text-xs text-base-content/40 w-5 flex-shrink-0 text-right">{i + 1}.</span>
                        <input value={q.text}
                          onChange={(e) => setNewSurvey({
                            ...newSurvey,
                            questions: newSurvey.questions.map((qq) => qq.id === q.id ? { ...qq, text: e.target.value } : qq)
                          })}
                          placeholder="Savol matni..."
                          className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                          style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' }} />
                        <select value={q.positive ? 'pos' : 'neg'}
                          onChange={(e) => setNewSurvey({
                            ...newSurvey,
                            questions: newSurvey.questions.map((qq) => qq.id === q.id ? { ...qq, positive: e.target.value === 'pos' } : qq)
                          })}
                          className="text-xs px-2 py-1.5 rounded-lg outline-none flex-shrink-0"
                          style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' }}>
                          <option value="pos">Musbat</option>
                          <option value="neg">Manfiy</option>
                        </select>
                        <button onClick={() => setNewSurvey({
                          ...newSurvey,
                          questions: newSurvey.questions.filter((qq) => qq.id !== q.id)
                        })}
                          className="text-error hover:bg-error/10 w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors flex-shrink-0">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {newSurvey.type === 'sus' && (
                <div className="rounded-2xl p-3 text-xs text-base-content/60"
                  style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}>
                  ℹ️ SUS standarti 10 ta savoldan iborat. Ular avtomatik qo'shiladi.
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-3 rounded-2xl text-sm font-semibold btn btn-ghost">Bekor</button>
              <button onClick={handleCreateSurvey} disabled={creating}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                {creating ? '⏳ Yaratilmoqda...' : '✓ Yaratish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}