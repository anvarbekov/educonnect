import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDoc, getDocs, query, where, serverTimestamp,
  onSnapshot, limit, writeBatch, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ── USERS ────────────────────────────────────────────────────────
export const getUser = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getAllUsers = async () => {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const updateUser = async (uid, data) => {
  await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
};

export const searchUsers = async (searchText) => {
  const snap = await getDocs(collection(db, 'users'));
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (!searchText) return all;
  const q = searchText.toLowerCase();
  return all.filter((u) =>
    u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
  );
};

// ── CONVERSATIONS (DM / GROUP / CHANNEL) ─────────────────────────
// type: 'dm' | 'group' | 'channel'
// DM: { type:'dm', participants:[uid1,uid2], dmKey:'uid1_uid2' }
// Group: { type:'group', title, members:[...uids], createdBy, avatar }
// Channel: { type:'channel', title, description, subscribers:[...uids], createdBy, isPublic }

export const getOrCreateDM = async (myUid, otherUid, otherName) => {
  const dmKey = [myUid, otherUid].sort().join('_');
  // Check if exists
  const q = query(collection(db, 'conversations'), where('dmKey', '==', dmKey));
  const snap = await getDocs(q);
  if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
  // Create new DM
  const ref = await addDoc(collection(db, 'conversations'), {
    type: 'dm',
    dmKey,
    participants: [myUid, otherUid],
    participantNames: { [myUid]: '', [otherUid]: otherName },
    createdAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
    lastMessage: '',
  });
  return { id: ref.id, type: 'dm', dmKey, participants: [myUid, otherUid] };
};

export const createGroup = async (title, memberUids, createdByUid, avatar = '') => {
  const ref = await addDoc(collection(db, 'conversations'), {
    type: 'group',
    title,
    members: memberUids,
    createdBy: createdByUid,
    avatar,
    createdAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
    lastMessage: '',
  });
  return ref.id;
};

export const createChannel = async (title, description, createdByUid, isPublic = true) => {
  const ref = await addDoc(collection(db, 'conversations'), {
    type: 'channel',
    title,
    description,
    subscribers: [createdByUid],
    createdBy: createdByUid,
    isPublic,
    createdAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
    lastMessage: '',
  });
  return ref.id;
};

export const subscribeToConversation = (convId, callback) => {
  return onSnapshot(doc(db, 'conversations', convId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
};

// User's all conversations
export const subscribeToUserConversations = (uid, callback) => {
  // DMs
  const dmUnsub = onSnapshot(
    query(collection(db, 'conversations'), where('participants', 'array-contains', uid)),
    (snap) => {
      callback('dm', snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
  );
  // Groups
  const grpUnsub = onSnapshot(
    query(collection(db, 'conversations'), where('members', 'array-contains', uid)),
    (snap) => {
      callback('group', snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
  );
  // Channels subscribed
  const chUnsub = onSnapshot(
    query(collection(db, 'conversations'), where('subscribers', 'array-contains', uid)),
    (snap) => {
      callback('channel', snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
  );
  return () => { dmUnsub(); grpUnsub(); chUnsub(); };
};

export const subscribeToPublicChannels = (callback) => {
  return onSnapshot(
    query(collection(db, 'conversations'), where('type', '==', 'channel'), where('isPublic', '==', true)),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
};

export const joinChannel = async (convId, uid) => {
  await updateDoc(doc(db, 'conversations', convId), {
    subscribers: arrayUnion(uid),
  });
};

export const leaveChannel = async (convId, uid) => {
  await updateDoc(doc(db, 'conversations', convId), {
    subscribers: arrayRemove(uid),
  });
};

export const addGroupMember = async (convId, uid) => {
  await updateDoc(doc(db, 'conversations', convId), {
    members: arrayUnion(uid),
  });
};

export const removeGroupMember = async (convId, uid) => {
  await updateDoc(doc(db, 'conversations', convId), {
    members: arrayRemove(uid),
  });
};

export const updateConversation = async (convId, data) => {
  await updateDoc(doc(db, 'conversations', convId), data);
};

export const deleteConversation = async (convId) => {
  await deleteDoc(doc(db, 'conversations', convId));
};

// ── MESSAGES ────────────────────────────────────────────────────
export const sendMessage = async (data) => {
  // data: { conversationId, senderId, senderName, body, type, fileUrl, fileName, fileSize, replyTo }
  const msgRef = await addDoc(collection(db, 'messages'), {
    ...data,
    createdAt: serverTimestamp(),
    reactions: {},
    isPinned: false,
    isDeleted: false,
  });

  await updateDoc(doc(db, 'conversations', data.conversationId), {
    lastMessageAt: serverTimestamp(),
    lastMessage: data.body?.substring(0, 80) || (data.type === 'voice' ? '🎙️ Ovozli xabar' : '📎 Fayl'),
  });

  return msgRef.id;
};

export const subscribeToMessages = (conversationId, callback, msgLimit = 100) => {
  const q = query(
    collection(db, 'messages'),
    where('conversationId', '==', conversationId),
    where('isDeleted', '==', false)
  );
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
      .slice(-msgLimit);
    callback(msgs);
  });
};

export const editMessage = async (msgId, newBody) => {
  await updateDoc(doc(db, 'messages', msgId), {
    body: newBody,
    editedAt: serverTimestamp(),
  });
};

export const deleteMessage = async (msgId) => {
  await updateDoc(doc(db, 'messages', msgId), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    body: '',
  });
};

export const pinMessage = async (msgId, isPinned) => {
  await updateDoc(doc(db, 'messages', msgId), { isPinned });
};

export const addReaction = async (msgId, emoji, userId) => {
  const msgRef = doc(db, 'messages', msgId);
  const snap = await getDoc(msgRef);
  if (!snap.exists()) return;
  const reactions = snap.data().reactions || {};
  const users = reactions[emoji] || [];
  const newUsers = users.includes(userId) ? users.filter((u) => u !== userId) : [...users, userId];
  if (newUsers.length === 0) delete reactions[emoji];
  else reactions[emoji] = newUsers;
  await updateDoc(msgRef, { reactions });
};

export const searchMessages = async (conversationId, searchText) => {
  const q = query(
    collection(db, 'messages'),
    where('conversationId', '==', conversationId),
    where('isDeleted', '==', false)
  );
  const snap = await getDocs(q);
  const all = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  return all.filter((m) => m.body?.toLowerCase().includes(searchText.toLowerCase()));
};

// ── COURSES ─────────────────────────────────────────────────────
export const createCourse = async (data) => {
  const ref = await addDoc(collection(db, 'courses'), {
    ...data,
    videos: [],
    createdAt: serverTimestamp(),
    memberCount: 0,
  });
  return ref.id;
};

export const getCoursesByTeacher = async (teacherId) => {
  const q = query(collection(db, 'courses'), where('teacherId', '==', teacherId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getAllCourses = async () => {
  const snap = await getDocs(collection(db, 'courses'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const updateCourse = async (id, data) => {
  await updateDoc(doc(db, 'courses', id), data);
};

export const deleteCourse = async (id) => {
  await deleteDoc(doc(db, 'courses', id));
};

// Add YouTube video to course
export const addVideoToCourse = async (courseId, video) => {
  const courseRef = doc(db, 'courses', courseId);
  const snap = await getDoc(courseRef);
  if (!snap.exists()) throw new Error('Kurs topilmadi');
  const videos = snap.data().videos || [];
  const newVideo = {
    id: Date.now().toString(),
    title: video.title,
    description: video.description || '',
    youtubeUrl: video.youtubeUrl,
    youtubeId: extractYouTubeId(video.youtubeUrl),
    timestamps: video.timestamps || [],
    addedAt: new Date().toISOString(),
  };
  await updateDoc(courseRef, { videos: [...videos, newVideo] });
  return newVideo;
};

export const updateCourseVideo = async (courseId, videoId, updates) => {
  const courseRef = doc(db, 'courses', courseId);
  const snap = await getDoc(courseRef);
  if (!snap.exists()) return;
  const videos = snap.data().videos || [];
  const updated = videos.map((v) => v.id === videoId ? { ...v, ...updates } : v);
  await updateDoc(courseRef, { videos: updated });
};

export const deleteVideoFromCourse = async (courseId, videoId) => {
  const courseRef = doc(db, 'courses', courseId);
  const snap = await getDoc(courseRef);
  if (!snap.exists()) return;
  const videos = (snap.data().videos || []).filter((v) => v.id !== videoId);
  await updateDoc(courseRef, { videos });
};

function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// ── SUS SURVEYS ──────────────────────────────────────────────────
export const getSurveys = async () => {
  const snap = await getDocs(collection(db, 'surveys'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
};

export const subscribeSurveys = (callback) => {
  return onSnapshot(collection(db, 'surveys'), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    callback(list);
  });
};

export const createSurvey = async (data) => {
  const ref = await addDoc(collection(db, 'surveys'), {
    ...data,
    isActive: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateSurvey = async (id, data) => {
  await updateDoc(doc(db, 'surveys'), { ...data, updatedAt: serverTimestamp() });
};

export const deleteSurvey = async (id) => {
  await deleteDoc(doc(db, 'surveys', id));
};

export const submitSurveyResponse = async (surveyId, userId, userName, userRole, answers, score) => {
  await addDoc(collection(db, 'surveyResponses'), {
    surveyId, userId, userName, userRole, answers, score,
    submittedAt: serverTimestamp(),
  });
};

export const getSurveyResponses = async (surveyId) => {
  const q = query(collection(db, 'surveyResponses'), where('surveyId', '==', surveyId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getUserSurveyResponse = async (surveyId, userId) => {
  const q = query(
    collection(db, 'surveyResponses'),
    where('surveyId', '==', surveyId),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
};

// Legacy SUS (backward compat)
export const getLegacySusResponses = async () => {
  const snap = await getDocs(collection(db, 'susResponses'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ── ANALYTICS ────────────────────────────────────────────────────
export const getMessageStats = async () => {
  const snap = await getDocs(
    query(collection(db, 'messages'), where('isDeleted', '==', false))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getAllConversations = async () => {
  const snap = await getDocs(collection(db, 'conversations'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ── AUDIT LOGS ────────────────────────────────────────────────────
export const addAuditLog = async (actorId, action, target, details = '') => {
  try {
    await addDoc(collection(db, 'auditLogs'), {
      actorId, action, target, details,
      createdAt: serverTimestamp(),
    });
  } catch {}
};

export const getAuditLogs = async (limitCount = 100) => {
  const snap = await getDocs(collection(db, 'auditLogs'));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .slice(0, limitCount);
};

// ── MARK AS READ ─────────────────────────────────────────────────
export const markAsRead = async (messageId, userId) => {
  try {
    const q = query(
      collection(db, 'readReceipts'),
      where('messageId', '==', messageId),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      await addDoc(collection(db, 'readReceipts'), {
        messageId, userId,
        readAt: serverTimestamp(),
      });
    }
  } catch {}
};