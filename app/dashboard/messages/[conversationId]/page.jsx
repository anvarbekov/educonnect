'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  subscribeToConversation, subscribeToMessages, sendMessage,
  editMessage, deleteMessage, pinMessage, addReaction, markAsRead,
  searchMessages, addAuditLog, joinChannel, leaveChannel,
  addGroupMember, searchUsers,
} from '@/services/firestore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import ConversationSettings from '@/components/messaging/ConversationSettings';

// Cloudinary upload (if configured)
async function uploadToCloudinary(file) {
  const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!CLOUD || !PRESET) throw new Error('Cloudinary sozlanmagan');
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', PRESET);
  const type = file.type.startsWith('audio/') ? 'video' : 'auto';
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/${type}/upload`, { method: 'POST', body: fd });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.secure_url;
}

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '✅'];

export default function MessagesPage() {
  const { conversationId } = useParams();
  const { user, userProfile } = useAuth();
  const router = useRouter();

  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editMsg, setEditMsg] = useState(null);
  const [editText, setEditText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [highlightId, setHighlightId] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const bottomRef = useRef(null);
  const msgRefs = useRef({});
  const fileRef = useRef(null);
  const inputRef = useRef(null);
  const recordTimer = useRef(null);

  const isOwner = conv?.createdBy === user?.uid;
  const isAdmin = userProfile?.role === 'admin';
  const isTeacher = userProfile?.role === 'teacher';
  const canModerate = isAdmin || isTeacher || isOwner;
  const canSend = conv?.type !== 'channel' || canModerate;

  // Subscribe conversation
  useEffect(() => {
    if (!conversationId) return;
    return subscribeToConversation(conversationId, setConv);
  }, [conversationId]);

  // Subscribe messages
  useEffect(() => {
    if (!conversationId || !user) return;
    setLoading(true);
    return subscribeToMessages(conversationId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      msgs.slice(-3).forEach((m) => { if (m.senderId !== user.uid) markAsRead(m.id, user.uid); });
    });
  }, [conversationId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Search
  const handleSearch = async () => {
    if (!searchQ.trim()) return;
    const res = await searchMessages(conversationId, searchQ);
    setSearchResults(res);
  };

  const jumpTo = (msgId) => {
    setHighlightId(msgId);
    setShowSearch(false);
    setTimeout(() => {
      msgRefs.current[msgId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    setTimeout(() => setHighlightId(null), 3000);
  };

  // Send
  const handleSend = async () => {
    if (!text.trim() && !editMsg) return;
    if (!canSend) return toast.error("Kanalda faqat adminlar xabar yubora oladi");

    if (editMsg) {
      await editMessage(editMsg.id, text);
      setEditMsg(null);
      setText('');
      return;
    }

    setSending(true);
    try {
      await sendMessage({
        conversationId,
        senderId: user.uid,
        senderName: userProfile?.name || user.displayName || 'Noma\'lum',
        senderAvatar: userProfile?.avatar || '',
        body: text.trim(),
        type: 'text',
        fileUrl: null,
        fileName: null,
        fileSize: null,
        replyTo: replyTo ? { id: replyTo.id, senderName: replyTo.senderName, body: replyTo.body?.substring(0, 60) } : null,
      });
      setText('');
      setReplyTo(null);
    } catch (e) { toast.error(e.message); }
    setSending(false);
  };

  // File upload
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return toast.error("Fayl 20MB dan kichik bo'lishi kerak");
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      const isImg = file.type.startsWith('image/');
      await sendMessage({
        conversationId, senderId: user.uid,
        senderName: userProfile?.name || 'Noma\'lum',
        senderAvatar: userProfile?.avatar || '',
        body: '', type: isImg ? 'image' : 'file',
        fileUrl: url, fileName: file.name, fileSize: file.size,
        replyTo: null,
      });
      toast.success('Fayl yuborildi');
    } catch (e) { toast.error('Yuklashda xato: ' + e.message); }
    setUploading(false);
    e.target.value = '';
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'voice.webm', { type: 'audio/webm' });
        setUploading(true);
        try {
          const url = await uploadToCloudinary(file);
          await sendMessage({
            conversationId, senderId: user.uid,
            senderName: userProfile?.name || 'Noma\'lum',
            senderAvatar: userProfile?.avatar || '',
            body: '', type: 'voice',
            fileUrl: url, fileName: 'voice.webm', fileSize: blob.size,
            replyTo: null,
          });
        } catch (e) { toast.error('Ovoz yuklashda xato'); }
        setUploading(false);
      };
      mr.start();
      setMediaRecorder(mr);
      setRecording(true);
      setRecordSeconds(0);
      recordTimer.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch { toast.error("Mikrofonga ruxsat yo'q"); }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setMediaRecorder(null);
    setRecording(false);
    clearInterval(recordTimer.current);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const getConvTitle = () => {
    if (!conv) return '...';
    if (conv.type === 'dm') {
      const otherId = conv.participants?.find((id) => id !== user?.uid);
      return conv.participantNames?.[otherId] || 'Foydalanuvchi';
    }
    return conv.title || 'Suhbat';
  };

  const getConvIcon = () => {
    if (!conv) return '💬';
    if (conv.type === 'dm') return '👤';
    if (conv.type === 'group') return '👥';
    if (conv.type === 'channel') return '📢';
    return '💬';
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ background: 'var(--chat-bg)' }}>
        <div className="text-7xl opacity-20">💬</div>
        <p className="text-lg font-semibold opacity-30">Suhbat tanlang</p>
        <p className="text-sm opacity-20">Chap menuda suhbatni tanlang</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 chat-header">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-lg"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          {getConvIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-sm truncate text-base-content">{getConvTitle()}</h2>
          <p className="text-xs text-base-content/50">
            {conv?.type === 'dm' && 'To\'g\'ridan-to\'g\'ri xabar'}
            {conv?.type === 'group' && `${conv.members?.length || 0} ta a'zo`}
            {conv?.type === 'channel' && `${conv.subscribers?.length || 0} ta obunachi`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSearch(!showSearch)} className="btn-icon" title="Qidirish">🔍</button>
          {/* Group/Channel settings */}
          {(conv?.type === 'group' || conv?.type === 'channel') && (
            <button
              onClick={() => setShowSettings(true)}
              className="btn-icon" title="Sozlamalar"
              style={{ fontSize: 18 }}
            >⚙️</button>
          )}
          {/* Join/Leave channel */}
          {conv?.type === 'channel' && !isOwner && (
            conv.subscribers?.includes(user?.uid) ? (
              <button onClick={() => leaveChannel(conversationId, user.uid)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                Chiqish
              </button>
            ) : (
              <button onClick={() => joinChannel(conversationId, user.uid)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}>
                Qo'shilish
              </button>
            )
          )}
        </div>
      </div>

      {/* Settings modal */}
      {showSettings && conv && (conv.type === 'group' || conv.type === 'channel') && (
        <ConversationSettings conv={conv} onClose={() => setShowSettings(false)} />
      )}

      {/* Search panel */}
      {showSearch && (
        <div className="px-4 py-2 flex-shrink-0 border-b border-base-300 bg-base-100">
          <div className="flex gap-2">
            <input
              autoFocus value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Xabarlarda qidirish..."
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none bg-base-200 text-base-content"
            />
            <button onClick={handleSearch} className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}>
              Qidirish
            </button>
            <button onClick={() => { setShowSearch(false); setSearchResults([]); setSearchQ(''); }}
              className="px-3 py-2 rounded-xl text-sm text-base-content/50 hover:bg-base-200">✕</button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
              {searchResults.map((msg) => (
                <button key={msg.id} onClick={() => jumpTo(msg.id)}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-base-200 transition-colors">
                  <div className="flex justify-between mb-0.5">
                    <span className="text-xs font-semibold text-primary">{msg.senderName}</span>
                    <span className="text-[10px] text-base-content/40">
                      {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'dd.MM HH:mm') : ''}
                    </span>
                  </div>
                  <p className="text-xs text-base-content/70 truncate">{msg.body || '[fayl]'}</p>
                  <span className="text-[10px] text-primary/60">→ O'sha joyga o'tish</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 chat-bg">
        {loading ? (
          <div className="flex flex-col gap-3 pt-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`flex gap-2 ${i % 3 === 2 ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-2xl skeleton-pulse flex-shrink-0" />
                <div className="flex flex-col gap-1">
                  <div className="skeleton-pulse rounded-2xl" style={{ width: `${120 + i * 30}px`, height: '40px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 opacity-50">
            <div className="text-5xl mb-3">✨</div>
            <p className="font-semibold text-base-content">Birinchi xabarni yuboring!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const prev = messages[i - 1];
            const showAvatar = !prev || prev.senderId !== msg.senderId || (msg.createdAt?.seconds - prev.createdAt?.seconds) > 300;
            const isOwn = msg.senderId === user?.uid;
            return (
              <div key={msg.id} ref={(el) => { msgRefs.current[msg.id] = el; }}
                className={clsx('transition-all duration-500 rounded-2xl', highlightId === msg.id && 'ring-2 ring-primary/50 ring-offset-2 bg-primary/5')}>
                <MsgBubble
                  msg={msg} isOwn={isOwn} showAvatar={showAvatar}
                  canModerate={canModerate}
                  onReply={() => { setReplyTo(msg); inputRef.current?.focus(); }}
                  onEdit={() => { setEditMsg(msg); setEditText(msg.body); setText(msg.body); inputRef.current?.focus(); }}
                  onDelete={async () => {
                    if (!confirm('O\'chirishni tasdiqlaysizmi?')) return;
                    await deleteMessage(msg.id);
                    toast.success('Xabar o\'chirildi');
                  }}
                  onPin={async () => {
                    await pinMessage(msg.id, !msg.isPinned);
                    toast.success(msg.isPinned ? 'Yechildi' : 'Mahkamlandi');
                  }}
                  onReact={async (emoji) => { await addReaction(msg.id, emoji, user.uid); }}
                  userId={user?.uid}
                />
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply/Edit preview */}
      {(replyTo || editMsg) && (
        <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0 border-t border-base-300"
          style={{ background: 'rgba(99,102,241,0.05)' }}>
          <div className="w-0.5 h-8 rounded-full" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary">{editMsg ? '✏️ Tahrirlash' : `↩️ ${replyTo?.senderName}`}</p>
            <p className="text-xs text-base-content/60 truncate">{editMsg ? editMsg.body : replyTo?.body}</p>
          </div>
          <button onClick={() => { setReplyTo(null); setEditMsg(null); setText(''); }}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs text-base-content/40 hover:bg-base-200">✕</button>
        </div>
      )}

      {/* Input area */}
      {canSend ? (
        <div className="px-4 py-3 flex-shrink-0 chat-input-wrap">
          {uploading && (
            <div className="flex items-center gap-2 mb-2 text-xs text-primary">
              <span className="loading loading-spinner loading-xs" />
              Yuklanmoqda...
            </div>
          )}
          <div className="flex items-end gap-2">
            <input type="file" ref={fileRef} onChange={handleFile} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />

            {recording ? (
              <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-semibold text-red-500">{formatTime(recordSeconds)}</span>
                <span className="text-xs text-red-400">Ovoz yozilmoqda...</span>
                <button onClick={stopRecording}
                  className="ml-auto px-4 py-1.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                  Tugatish
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => fileRef.current?.click()}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 text-base-content/50 hover:text-primary hover:bg-primary/10">
                  📎
                </button>
                <div className="flex-1 chat-input-inner flex items-end gap-2 px-4 py-2.5">
                  <textarea
                    ref={inputRef}
                    value={text}
                    onChange={(e) => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Xabar yozing..."
                    rows={1}
                    className="flex-1 bg-transparent outline-none resize-none text-sm text-base-content placeholder-base-content/40"
                    style={{ minHeight: '24px', maxHeight: '120px' }}
                  />
                </div>
                {text.trim() ? (
                  <button onClick={handleSend} disabled={sending}
                    className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 send-btn text-white">
                    {sending ? <span className="loading loading-spinner loading-xs" /> : '→'}
                  </button>
                ) : (
                  <button onClick={startRecording}
                    className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 text-base-content/50 hover:text-primary hover:bg-primary/10">
                    🎙️
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 flex-shrink-0 text-center text-sm text-base-content/40 border-t border-base-300">
          📢 Faqat kanal administratorlari xabar yubora oladi
        </div>
      )}
    </div>
  );
}

// ── Message Bubble ──────────────────────────────────────────────
function MsgBubble({ msg, isOwn, showAvatar, canModerate, onReply, onEdit, onDelete, onPin, onReact, userId }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(null);
  const audioRef = useRef(null);

  const time = msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'HH:mm') : '';

  const toggleAudio = () => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) { a.pause(); setIsPlaying(false); }
    else { a.play().then(() => setIsPlaying(true)).catch(() => window.open(msg.fileUrl, '_blank')); }
  };

  const totalReactions = Object.values(msg.reactions || {}).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className={clsx('group flex items-end gap-2 mb-0.5 msg-animate', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {showAvatar && !isOwn ? (
        <div className="w-8 h-8 rounded-2xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mb-1"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          {msg.senderAvatar ? <img src={msg.senderAvatar} className="w-full h-full object-cover rounded-2xl" alt="" /> : msg.senderName?.charAt(0) || '?'}
        </div>
      ) : <div className="w-8 flex-shrink-0" />}

      <div className={clsx('max-w-[70%] flex flex-col', isOwn ? 'items-end' : 'items-start')}>
        {showAvatar && !isOwn && (
          <span className="text-[11px] text-base-content/50 px-3 mb-0.5 font-semibold">{msg.senderName}</span>
        )}

        {msg.replyTo && (
          <div className={clsx('text-xs px-3 py-1.5 rounded-t-2xl border-l-2 border-primary mb-[-4px]', isOwn ? 'bg-primary/10' : 'bg-base-200')}>
            <span className="font-semibold text-primary text-[10px]">{msg.replyTo.senderName}</span>
            <p className="opacity-60 truncate text-[10px]">{msg.replyTo.body}</p>
          </div>
        )}

        <div
          className={clsx('relative px-3 py-2 select-text', isOwn ? 'msg-bubble-out' : 'msg-bubble-in', msg.replyTo && 'rounded-t-none')}
          onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
        >
          {msg.isPinned && <span className="absolute -top-2 -right-1 text-xs">📌</span>}

          {msg.type === 'text' && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
          )}

          {msg.type === 'image' && msg.fileUrl && (
            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
              <img src={msg.fileUrl} alt="rasm" className="max-w-[260px] rounded-xl cursor-zoom-in hover:opacity-90 transition-opacity" style={{ maxHeight: 260, objectFit: 'cover' }} />
            </a>
          )}

          {msg.type === 'file' && msg.fileUrl && (
            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer"
              className={clsx('flex items-center gap-3 p-2 rounded-xl hover:opacity-80 transition-opacity', isOwn ? 'bg-white/10' : 'bg-base-200')}>
              <span className="text-2xl flex-shrink-0">📎</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate max-w-[160px]">{msg.fileName}</p>
                <p className="text-[10px] opacity-60">Yuklab olish</p>
              </div>
            </a>
          )}

          {msg.type === 'voice' && msg.fileUrl && (
            <div className="flex items-center gap-2 min-w-[160px]">
              <audio ref={audioRef} src={msg.fileUrl}
                onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
                onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.target.duration)}
                crossOrigin="anonymous"
              />
              <button onClick={toggleAudio}
                className={clsx('w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 transition-all', isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-primary/10 hover:bg-primary/20')}>
                {isPlaying ? '⏸' : '▶️'}
              </button>
              <div className="flex items-end gap-0.5 h-6 flex-1">
                {[...Array(14)].map((_, i) => {
                  const h = [3, 7, 11, 6, 13, 5, 9, 14, 4, 10, 7, 12, 5, 8][i];
                  return <div key={i} className={clsx('w-1 rounded-full', isOwn ? 'bg-white/50' : 'bg-primary/40', isPlaying && 'waveform-bar')} style={{ height: h, animationDelay: `${i * 0.06}s` }} />;
                })}
              </div>
              <span className={clsx('text-[10px] flex-shrink-0', isOwn ? 'text-white/60' : 'text-base-content/40')}>
                {isPlaying ? formatATime(currentTime) : duration ? formatATime(duration) : '🎙️'}
              </span>
            </div>
          )}

          <div className={clsx('flex items-center gap-1 mt-0.5', isOwn ? 'justify-end' : 'justify-start')}>
            {msg.editedAt && <span className="text-[9px] opacity-40">tahrirlangan</span>}
            <span className="text-[10px] opacity-40">{time}</span>
            {isOwn && <span className="text-[10px] text-blue-300">✓✓</span>}
          </div>

          {/* Context menu */}
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className={clsx('absolute z-50 py-1.5 rounded-2xl shadow-2xl min-w-[160px] context-menu bg-base-100', isOwn ? 'right-0' : 'left-0')} style={{ bottom: '100%', marginBottom: 4 }}>
                <MI icon="↩️" label="Javob" onClick={() => { onReply(); setShowMenu(false); }} />
                <MI icon="😊" label="Reakciya" onClick={() => { setShowEmoji(true); setShowMenu(false); }} />
                {isOwn && msg.type === 'text' && <MI icon="✏️" label="Tahrirlash" onClick={() => { onEdit(); setShowMenu(false); }} />}
                {canModerate && <MI icon="📌" label={msg.isPinned ? 'Yeching' : 'Mahkamlash'} onClick={() => { onPin(); setShowMenu(false); }} />}
                {(isOwn || canModerate) && <MI icon="🗑️" label="O'chirish" onClick={() => { onDelete(); setShowMenu(false); }} danger />}
              </div>
            </>
          )}
        </div>

        {/* Reactions */}
        {totalReactions > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 px-1">
            {Object.entries(msg.reactions || {}).map(([emoji, users]) =>
              users.length > 0 ? (
                <button key={emoji} onClick={() => onReact(emoji)}
                  className={clsx('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all',
                    users.includes(userId) ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-base-200 border-base-300 hover:bg-base-300')}>
                  {emoji} {users.length}
                </button>
              ) : null
            )}
          </div>
        )}

        {/* Emoji picker */}
        {showEmoji && (
          <div className="flex gap-1 bg-base-100 rounded-full shadow-xl border border-base-300 px-3 py-2 mt-1 emoji-picker">
            {EMOJI_LIST.map((e) => (
              <button key={e} onClick={() => { onReact(e); setShowEmoji(false); }} className="text-lg hover:scale-125 transition-transform">{e}</button>
            ))}
            <button onClick={() => setShowEmoji(false)} className="text-xs text-base-content/40 ml-1">✕</button>
          </div>
        )}
      </div>
    </div>
  );
}

function MI({ icon, label, onClick, danger }) {
  return (
    <button onClick={onClick}
      className={clsx('flex items-center gap-2.5 px-4 py-2 hover:bg-base-200 w-full text-sm text-left transition-colors', danger && 'text-error hover:bg-error/10')}>
      <span>{icon}</span><span>{label}</span>
    </button>
  );
}

function formatATime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  return `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, '0')}`;
}