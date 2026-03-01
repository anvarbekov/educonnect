'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  addVideoToCourse, updateCourseVideo, deleteVideoFromCourse, updateCourse,
} from '@/services/firestore';
import toast from 'react-hot-toast';

function extractYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/);
  return m ? m[1] : null;
}

function getYoutubeThumbnail(id) {
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const { userProfile } = useAuth();
  const router = useRouter();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);

  // Form state
  const [form, setForm] = useState({ title: '', description: '', youtubeUrl: '', timestamps: '' });
  const [saving, setSaving] = useState(false);

  const isOwner = course?.teacherId === userProfile?.id || userProfile?.role === 'admin';

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    const unsub = onSnapshot(doc(db, 'courses', courseId), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setCourse(data);
        if (!activeVideo && data.videos?.length > 0) setActiveVideo(data.videos[0]);
      } else {
        router.push('/dashboard/courses');
      }
      setLoading(false);
    });
    return unsub;
  }, [courseId]);

  const parseTimestamps = (raw) => {
    if (!raw.trim()) return [];
    return raw.split('\n').map((line) => {
      const parts = line.split(' ');
      const time = parts[0];
      const label = parts.slice(1).join(' ');
      return { time, label };
    }).filter((t) => t.time && t.label);
  };

  const handleAddVideo = async () => {
    if (!form.title.trim()) return toast.error('Video sarlavhasini kiriting');
    if (!form.youtubeUrl.trim()) return toast.error('YouTube havolasini kiriting');
    const ytId = extractYouTubeId(form.youtubeUrl);
    if (!ytId) return toast.error('YouTube havolasi noto\'g\'ri');
    setSaving(true);
    try {
      if (editingVideo) {
        await updateCourseVideo(courseId, editingVideo.id, {
          title: form.title,
          description: form.description,
          youtubeUrl: form.youtubeUrl,
          youtubeId: ytId,
          timestamps: parseTimestamps(form.timestamps),
        });
        toast.success('Video yangilandi');
      } else {
        await addVideoToCourse(courseId, {
          title: form.title,
          description: form.description,
          youtubeUrl: form.youtubeUrl,
          timestamps: parseTimestamps(form.timestamps),
        });
        toast.success('Video qo\'shildi');
      }
      setShowAddVideo(false);
      setEditingVideo(null);
      setForm({ title: '', description: '', youtubeUrl: '', timestamps: '' });
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  };

  const handleDeleteVideo = async (videoId) => {
    if (!confirm('Videoni o\'chirishni tasdiqlaysizmi?')) return;
    await deleteVideoFromCourse(courseId, videoId);
    if (activeVideo?.id === videoId) setActiveVideo(course.videos?.find((v) => v.id !== videoId) || null);
    toast.success('Video o\'chirildi');
  };

  const startEdit = (video) => {
    setEditingVideo(video);
    setForm({
      title: video.title,
      description: video.description || '',
      youtubeUrl: video.youtubeUrl,
      timestamps: video.timestamps?.map((t) => `${t.time} ${t.label}`).join('\n') || '',
    });
    setShowAddVideo(true);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="loading loading-dots loading-lg text-primary" />
      </div>
    );
  }

  const videos = course?.videos || [];
  const ytId = activeVideo?.youtubeId || extractYouTubeId(activeVideo?.youtubeUrl);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* Course header */}
      <div className="px-6 pt-5 pb-3 flex-shrink-0 border-b border-base-300 bg-base-100">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => router.push('/dashboard/courses')} className="btn-icon text-base-content/50">←</button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg text-base-content truncate">{course?.title}</h1>
            <p className="text-xs text-base-content/50">{course?.teacherName} • {videos.length} ta video</p>
          </div>
          {isOwner && (
            <button
              onClick={() => { setEditingVideo(null); setForm({ title: '', description: '', youtubeUrl: '', timestamps: '' }); setShowAddVideo(true); }}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              + Video qo'shish
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Video list sidebar */}
        <div className="w-72 flex-shrink-0 overflow-y-auto border-r border-base-300 bg-base-100">
          {videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center opacity-50">
              <span className="text-4xl mb-2">🎬</span>
              <p className="text-sm font-medium text-base-content">Videolar yo'q</p>
              {isOwner && <p className="text-xs text-base-content/50 mt-1">Yuqoridagi tugma orqali video qo'shing</p>}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {videos.map((video, idx) => {
                const vId = video.youtubeId || extractYouTubeId(video.youtubeUrl);
                const thumb = getYoutubeThumbnail(vId);
                const isActive = activeVideo?.id === video.id;
                return (
                  <div
                    key={video.id}
                    className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200"
                    style={{
                      border: isActive ? '2px solid rgba(99,102,241,0.5)' : '2px solid transparent',
                      background: isActive ? 'rgba(99,102,241,0.08)' : 'transparent',
                    }}
                    onClick={() => setActiveVideo(video)}
                  >
                    {/* Thumbnail */}
                    <div className="relative">
                      {thumb ? (
                        <img src={thumb} alt={video.title} className="w-full aspect-video object-cover" />
                      ) : (
                        <div className="w-full aspect-video bg-base-300 flex items-center justify-center text-3xl">🎬</div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                          style={{ background: 'rgba(0,0,0,0.6)' }}>
                          ▶️
                        </div>
                      </div>
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-lg text-[10px] font-bold text-white"
                        style={{ background: 'rgba(0,0,0,0.6)' }}>{idx + 1}</div>
                    </div>

                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-base-content line-clamp-2 leading-tight">{video.title}</p>
                      {video.timestamps?.length > 0 && (
                        <p className="text-[10px] text-base-content/40 mt-0.5">{video.timestamps.length} ta vaqt belgi</p>
                      )}
                    </div>

                    {/* Owner actions */}
                    {isOwner && (
                      <div className="absolute top-2 right-2 gap-1 hidden group-hover:flex">
                        <button onClick={(e) => { e.stopPropagation(); startEdit(video); }}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] bg-white/90 hover:bg-white transition-colors shadow">✏️</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteVideo(video.id); }}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] bg-white/90 hover:bg-red-50 transition-colors shadow">🗑️</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Main player area */}
        <div className="flex-1 overflow-y-auto p-6 bg-base-100">
          {activeVideo && ytId ? (
            <div className="max-w-3xl mx-auto">
              {/* YouTube embed */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl mb-5" style={{ paddingTop: '56.25%', background: '#000' }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Video info */}
              <h2 className="text-xl font-bold text-base-content mb-2">{activeVideo.title}</h2>

              {activeVideo.description && (
                <div className="glass-card p-4 mb-4">
                  <p className="text-sm text-base-content/70 leading-relaxed whitespace-pre-wrap">{activeVideo.description}</p>
                </div>
              )}

              {/* Timestamps */}
              {activeVideo.timestamps?.length > 0 && (
                <div className="glass-card p-4">
                  <h3 className="text-sm font-bold text-base-content mb-3">🕐 Vaqt belgilari</h3>
                  <div className="space-y-2">
                    {activeVideo.timestamps.map((ts, i) => (
                      <a
                        key={i}
                        href={`https://www.youtube.com/watch?v=${ytId}&t=${convertTimeToSeconds(ts.time)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-primary/5 transition-colors group"
                      >
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg min-w-[48px] text-center">
                          {ts.time}
                        </span>
                        <span className="text-sm text-base-content group-hover:text-primary transition-colors">{ts.label}</span>
                        <span className="ml-auto text-primary/40 group-hover:text-primary transition-colors text-xs">→</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full opacity-40">
              <span className="text-6xl mb-4">🎬</span>
              <p className="text-lg font-semibold text-base-content">Video tanlang</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit video modal */}
      {showAddVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl p-6 shadow-2xl bg-base-100 border border-base-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg text-base-content">
                {editingVideo ? '✏️ Videoni tahrirlash' : '🎬 Yangi video qo\'shish'}
              </h3>
              <button onClick={() => { setShowAddVideo(false); setEditingVideo(null); }} className="btn-icon">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1 block">Sarlavha *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Dars nomi..."
                  className="input input-bordered w-full rounded-2xl text-sm" />
              </div>

              <div>
                <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1 block">YouTube havola *</label>
                <input value={form.youtubeUrl} onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="input input-bordered w-full rounded-2xl text-sm" />
                {form.youtubeUrl && extractYouTubeId(form.youtubeUrl) && (
                  <div className="mt-2 rounded-xl overflow-hidden" style={{ maxWidth: 200 }}>
                    <img src={getYoutubeThumbnail(extractYouTubeId(form.youtubeUrl))} alt="preview" className="w-full" />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1 block">Tavsif</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Video haqida qisqacha tavsif..."
                  rows={3} className="textarea textarea-bordered w-full rounded-2xl text-sm resize-none" />
              </div>

              <div>
                <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1 block">
                  Vaqt belgilari (ixtiyoriy)
                </label>
                <p className="text-[10px] text-base-content/40 mb-1">Har qatorda: <code>0:00 Kirish</code> | <code>5:30 Asosiy mavzu</code></p>
                <textarea value={form.timestamps} onChange={(e) => setForm({ ...form, timestamps: e.target.value })}
                  placeholder={"0:00 Kirish\n3:30 Asosiy mavzu\n12:45 Amaliyot\n20:00 Xulosa"}
                  rows={5} className="textarea textarea-bordered w-full rounded-2xl text-xs font-mono resize-none" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddVideo(false); setEditingVideo(null); }}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold btn btn-ghost">Bekor</button>
              <button onClick={handleAddVideo} disabled={saving}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                {saving ? '⏳ Saqlanmoqda...' : editingVideo ? '✓ Yangilash' : '+ Qo\'shish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function convertTimeToSeconds(time) {
  if (!time) return 0;
  const parts = time.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}