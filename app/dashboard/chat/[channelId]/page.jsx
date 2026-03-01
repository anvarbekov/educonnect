'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  subscribeToMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  pinMessage,
  markAsRead,
  uploadFile,
  addAuditLog,
} from '@/services/firestore';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatInput from '@/components/chat/ChatInput';
import ChatHeader from '@/components/chat/ChatHeader';
import PinnedMessages from '@/components/chat/PinnedMessages';
import SearchPanel from '@/components/chat/SearchPanel';
import MessageSkeleton from '@/components/ui/MessageSkeleton';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const { channelId } = useParams();
  const { user, userProfile } = useAuth();
  const [channel, setChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editMsg, setEditMsg] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [highlightMsgId, setHighlightMsgId] = useState(null);
  const bottomRef = useRef(null);
  const messagesRef = useRef([]);
  const msgRefs = useRef({});

  // Load channel info
  useEffect(() => {
    if (!channelId) return;
    const unsub = onSnapshot(doc(db, 'channels', channelId), (snap) => {
      if (snap.exists()) setChannel({ id: snap.id, ...snap.data() });
    });
    return unsub;
  }, [channelId]);

  // Subscribe to messages
  useEffect(() => {
    if (!channelId || !user) return;
    setLoading(true);
    const unsub = subscribeToMessages(channelId, (msgs) => {
      setMessages(msgs);
      messagesRef.current = msgs;
      setLoading(false);
      // Mark last messages as read
      msgs.slice(-5).forEach((m) => {
        if (m.senderId !== user.uid) {
          markAsRead(m.id, user.uid).catch(() => {});
        }
      });
    });
    return unsub;
  }, [channelId, user]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async ({ text, file, voiceBlob, type = 'text' }) => {
    if (!user || !channelId) return;
    if (userProfile?.isMuted) return toast.error('Siz vaqtincha cheklangansiz');

    try {
      let fileUrl = null;
      let fileName = null;
      let fileSize = null;

      if (file) {
        setUploading(true);
        const path = `files/${channelId}/${Date.now()}_${file.name}`;
        fileUrl = await uploadFile(file, path);
        fileName = file.name;
        fileSize = file.size;
        setUploading(false);
      } else if (voiceBlob) {
        setUploading(true);
        const path = `voice/${channelId}/${Date.now()}_voice.webm`;
        const voiceFile = new File([voiceBlob], 'voice.webm', { type: 'audio/webm' });
        fileUrl = await uploadFile(voiceFile, path);
        setUploading(false);
      }

      const msgData = {
        channelId,
        senderId: user.uid,
        senderName: userProfile?.name || user.displayName,
        body: text || '',
        type: voiceBlob ? 'voice' : file ? (file.type.startsWith('image/') ? 'image' : 'file') : 'text',
        fileUrl,
        fileName,
        fileSize,
        replyTo: replyTo ? {
          id: replyTo.id,
          senderName: replyTo.senderName,
          body: replyTo.body?.substring(0, 60),
        } : null,
      };

      await sendMessage(msgData);
      setReplyTo(null);
    } catch (err) {
      toast.error(err.message || 'Xabar yuborishda xato');
      setUploading(false);
    }
  };

  const handleEdit = async (msgId, newText) => {
    try {
      await editMessage(msgId, newText);
      setEditMsg(null);
      toast.success('Xabar tahrirlandi');
    } catch {
      toast.error('Tahrirda xato');
    }
  };

  const handleDelete = async (msgId) => {
    if (!confirm('Xabarni o\'chirmoqchimisiz?')) return;
    try {
      await deleteMessage(msgId);
      await addAuditLog(user.uid, 'delete_message', msgId);
      toast.success('Xabar o\'chirildi');
    } catch {
      toast.error('O\'chirishda xato');
    }
  };

  const handlePin = async (msgId, isPinned) => {
    try {
      await pinMessage(msgId, !isPinned);
      toast.success(isPinned ? 'Xabar yechildi' : 'Xabar mahkamlandi');
    } catch {
      toast.error('Xato');
    }
  };

  const jumpToMessage = (msgId) => {
    setHighlightMsgId(msgId);
    setTimeout(() => {
      msgRefs.current[msgId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    setTimeout(() => setHighlightMsgId(null), 3000);
  };

  const pinnedMessages = messages.filter((m) => m.isPinned);

  if (!channelId) {
    return (
      <div className="flex-1 flex items-center justify-center text-base-content/40">
        <div className="text-center">
          <div className="text-5xl mb-3">💬</div>
          <p className="font-medium">Kanal tanlang</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-base-100 relative">
      <ChatHeader
        channel={channel}
        onSearchToggle={() => setShowSearch(!showSearch)}
        onPinnedToggle={() => setShowPinned(!showPinned)}
        memberCount={0}
      />

      {showSearch && (
        <SearchPanel channelId={channelId} onClose={() => setShowSearch(false)} onJumpToMessage={jumpToMessage} />
      )}

      {pinnedMessages.length > 0 && showPinned && (
        <PinnedMessages messages={pinnedMessages} onUnpin={(id) => handlePin(id, true)} />
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1" style={{ background: 'var(--chat-bg)' }}>
        {loading ? (
          <MessageSkeleton count={8} />
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-base-content/40 py-20">
            <div className="text-5xl mb-3">🌟</div>
            <p className="font-medium">Muloqotni boshlang!</p>
            <p className="text-sm mt-1">Birinchi xabarni yuboring</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const prevMsg = messages[i - 1];
            const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId ||
              (msg.createdAt?.seconds - prevMsg.createdAt?.seconds) > 300;
            const isOwn = msg.senderId === user?.uid;

            return (
              <div key={msg.id} ref={(el) => { msgRefs.current[msg.id] = el; }}
                className={highlightMsgId === msg.id ? 'rounded-2xl ring-2 ring-primary/50 ring-offset-2 transition-all duration-500' : ''}>
                <MessageBubble
                  msg={msg}
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                  onReply={() => setReplyTo(msg)}
                  onEdit={() => setEditMsg(msg)}
                  onDelete={() => handleDelete(msg.id)}
                  onPin={() => handlePin(msg.id, msg.isPinned)}
                  canModerate={userProfile?.role === 'teacher' || userProfile?.role === 'admin'}
                />
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput
        onSend={handleSend}
        replyTo={replyTo}
        editMsg={editMsg}
        onCancelReply={() => setReplyTo(null)}
        onCancelEdit={() => setEditMsg(null)}
        onEditSave={handleEdit}
        uploading={uploading}
        disabled={userProfile?.isMuted}
      />
    </div>
  );
}