'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { getAllCourses, getCoursesByTeacher, deleteCourse, addAuditLog } from '@/services/firestore';
import CreateCourseModal from '@/components/chat/CreateCourseModal';
import toast from 'react-hot-toast';

const COURSE_THEMES = [
  { gradient: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', accent: '#a78bfa', light: '#f3f0ff' },
  { gradient: 'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)', accent: '#f472b6', light: '#fdf2f8' },
  { gradient: 'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)', accent: '#38bdf8', light: '#f0f9ff' },
  { gradient: 'linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)', accent: '#34d399', light: '#f0fdf4' },
  { gradient: 'linear-gradient(135deg,#fa709a 0%,#fee140 100%)', accent: '#fb923c', light: '#fff7ed' },
  { gradient: 'linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)', accent: '#c084fc', light: '#faf5ff' },
  { gradient: 'linear-gradient(135deg,#fccb90 0%,#d57eeb 100%)', accent: '#e879f9', light: '#fdf4ff' },
  { gradient: 'linear-gradient(135deg,#84fab0 0%,#8fd3f4 100%)', accent: '#22d3ee', light: '#ecfeff' },
];

const getTheme = (id) => COURSE_THEMES[(id?.charCodeAt(0) || 0) % COURSE_THEMES.length];
const getInitials = (name) => name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'K';

export default function CoursesPage() {
  const { user, userProfile } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [hoveredCard, setHoveredCard] = useState(null);

  const isTeacher = userProfile?.role === 'teacher';
  const isAdmin = userProfile?.role === 'admin';
  const isStudent = userProfile?.role === 'student';

  useEffect(() => { loadCourses(); }, [userProfile]);

  const loadCourses = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      const data = isTeacher ? await getCoursesByTeacher(user.uid) : await getAllCourses();
      setCourses(data);
    } catch {}
    setLoading(false);
  };

  const handleDelete = async (courseId, title) => {
    if (!confirm(`"${title}" kursini o'chirmoqchimisiz?`)) return;
    try {
      await deleteCourse(courseId);
      await addAuditLog(user.uid, 'delete_course', courseId, title);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      toast.success("Kurs o'chirildi");
    } catch { toast.error('Xato'); }
  };

  const filtered = courses.filter((c) =>
    !search || c.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.teacherName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto bg-base-100 relative">

      {/* Hero header with mesh gradient */}
      <div className="relative overflow-hidden px-6 pt-8 pb-6"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 70%, #1e1b4b 100%)',
        }}>
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-96 h-96 rounded-full -top-24 -right-24 opacity-20"
            style={{ background: 'radial-gradient(circle, #7c3aed, transparent)', filter: 'blur(60px)' }} />
          <div className="absolute w-64 h-64 rounded-full bottom-0 left-1/4 opacity-15"
            style={{ background: 'radial-gradient(circle, #6366f1, transparent)', filter: 'blur(40px)' }} />
          {/* Floating dots pattern */}
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                left: `${(i * 17 + 5) % 95}%`, top: `${(i * 23 + 10) % 85}%`,
                background: `rgba(255,255,255,${0.05 + (i % 4) * 0.04})`,
                animation: `pulse ${2 + i * 0.3}s ease-in-out infinite`,
              }} />
          ))}
        </div>

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📚</span>
                <span className="text-xs font-bold uppercase tracking-widest text-violet-300 px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(124,58,237,0.3)', border: '1px solid rgba(167,139,250,0.3)' }}>
                  {isTeacher ? "O'quv dasturlari" : isAdmin ? 'Boshqaruv' : 'Ta\'lim markazi'}
                </span>
              </div>
              <h1 className="text-3xl font-black text-white mb-1 tracking-tight">
                {isTeacher ? 'Mening Kurslarim' : isAdmin ? 'Barcha Kurslar' : 'Kurslar Katalogi'}
              </h1>
              <p className="text-violet-300 text-sm">
                {filtered.length} ta kurs • Bilim va ko'nikmalarni rivojlantiring
              </p>
            </div>
            <div className="flex flex-col gap-2 items-end flex-shrink-0">
              {(isTeacher || isAdmin) && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm text-white transition-all hover:scale-105 hover:shadow-xl"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                    boxShadow: '0 4px 20px rgba(124,58,237,0.5)',
                  }}
                >
                  <span className="text-base">+</span> Kurs yaratish
                </button>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="mt-5 relative max-w-md">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kurs yoki o'qituvchi bo'yicha qidiring..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm outline-none text-white placeholder-violet-300/60"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
              }}
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-300 text-sm">🔍</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 max-w-5xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-3xl overflow-hidden animate-pulse" style={{ height: 220 }}>
                <div className="h-28" style={{ background: 'rgba(124,58,237,0.15)' }} />
                <div className="p-4 space-y-2.5 bg-base-200">
                  <div className="h-4 rounded-full bg-base-300 w-3/4" />
                  <div className="h-3 rounded-full bg-base-300 w-1/2" />
                  <div className="h-8 rounded-2xl bg-base-300" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl mb-6"
              style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(99,102,241,0.1))' }}>
              {search ? '🔍' : '📭'}
            </div>
            <h3 className="font-black text-xl text-base-content mb-2">
              {search ? 'Kurs topilmadi' : "Kurslar yo'q"}
            </h3>
            <p className="text-base-content/50 text-sm mb-6">
              {search ? `"${search}" bo'yicha natija topilmadi` : "Hozircha birorta kurs mavjud emas"}
            </p>
            {(isTeacher || isAdmin) && !search && (
              <button onClick={() => setShowCreate(true)}
                className="px-6 py-3 rounded-2xl font-bold text-white text-sm transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', boxShadow: '0 4px 20px rgba(124,58,237,0.35)' }}>
                + Birinchi kursni yarating
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((course) => {
              const theme = getTheme(course.id);
              const isOwner = course.teacherId === user?.uid;
              const isHovered = hoveredCard === course.id;

              return (
                <div
                  key={course.id}
                  className="group relative rounded-3xl overflow-hidden transition-all duration-300"
                  style={{
                    transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
                    boxShadow: isHovered
                      ? `0 20px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.05)`
                      : '0 2px 12px rgba(0,0,0,0.06)',
                  }}
                  onMouseEnter={() => setHoveredCard(course.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  {/* Card top: gradient cover */}
                  <div className="relative h-28 overflow-hidden" style={{ background: theme.gradient }}>
                    {/* Pattern overlay */}
                    <div className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: `radial-gradient(circle at 20% 80%, white 1px, transparent 1px),
                          radial-gradient(circle at 80% 20%, white 1px, transparent 1px),
                          radial-gradient(circle at 50% 50%, white 0.5px, transparent 0.5px)`,
                        backgroundSize: '30px 30px, 40px 40px, 20px 20px',
                      }} />

                    {/* Course initial badge */}
                    <div className="absolute top-4 left-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black"
                        style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(10px)', color: 'white' }}>
                        {getInitials(course.title)}
                      </div>
                    </div>

                    {/* Code badge */}
                    {course.code && (
                      <div className="absolute top-4 right-4">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl"
                          style={{ background: 'rgba(0,0,0,0.25)', color: 'white', backdropFilter: 'blur(8px)' }}>
                          {course.code}
                        </span>
                      </div>
                    )}

                    {/* Video count */}
                    <div className="absolute bottom-3 right-4">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1"
                        style={{ background: 'rgba(0,0,0,0.3)', color: 'white', backdropFilter: 'blur(8px)' }}>
                        ▶ {course.videos?.length || 0} video
                      </span>
                    </div>

                    {/* Shine effect on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)' }} />
                  </div>

                  {/* Card body */}
                  <div className="p-4 bg-base-100" style={{ borderTop: `3px solid ${theme.accent}` }}>
                    <h3 className="font-black text-sm text-base-content mb-1 line-clamp-1">{course.title}</h3>
                    <p className="text-[11px] text-base-content/50 mb-1 line-clamp-2 leading-relaxed">
                      {course.description || 'Kurs tavsifi qo\'shilmagan'}
                    </p>
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                        style={{ background: theme.gradient }}>
                        {course.teacherName?.charAt(0) || 'T'}
                      </div>
                      <p className="text-[11px] font-semibold truncate" style={{ color: theme.accent }}>
                        {course.teacherName || "O'qituvchi"}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Link href={`/dashboard/courses/${course.id}`} className="flex-1">
                        <button
                          className="w-full py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                          style={{ background: theme.gradient }}
                        >
                          Kursga kirish →
                        </button>
                      </Link>
                      {(isOwner || isAdmin) && (
                        <button
                          onClick={() => handleDelete(course.id, course.title)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all hover:scale-110"
                          style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
                          title="O'chirish"
                        >🗑️</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && <CreateCourseModal onClose={() => { setShowCreate(false); loadCourses(); }} />}
    </div>
  );
}