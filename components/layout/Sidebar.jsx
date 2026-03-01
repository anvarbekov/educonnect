'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/lib/firebase';
import {
  collection, query, where, onSnapshot, getDocs, addDoc, serverTimestamp,
} from 'firebase/firestore';
import CreateGroupModal from '@/components/messaging/CreateGroupModal';
import CreateChannelModal from '@/components/messaging/CreateChannelModal';

const GRAD = [
  'from-violet-500 to-purple-600', 'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600', 'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600', 'from-fuchsia-500 to-purple-600',
];
const gc = (id) => GRAD[(id?.charCodeAt(0) || 0) % GRAD.length];
const gi = (name) => name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

async function getOrCreateDM(myUid, otherUid, otherName, myName) {
  const dmKey = [myUid, otherUid].sort().join('_');
  const snap = await getDocs(query(collection(db, 'conversations'), where('dmKey', '==', dmKey)));
  if (!snap.empty) return snap.docs[0].id;
  const ref = await addDoc(collection(db, 'conversations'), {
    type: 'dm', dmKey, participants: [myUid, otherUid],
    participantNames: { [myUid]: myName || '', [otherUid]: otherName || '' },
    createdAt: serverTimestamp(), lastMessageAt: serverTimestamp(), lastMessage: '',
  });
  return ref.id;
}

const NAV_SECTIONS = [
  { key: 'messages', icon: '💬', label: 'Xabarlar' },
  { key: 'groups',   icon: '👥', label: 'Guruhlar' },
  { key: 'channels', icon: '📢', label: 'Kanallar' },
];

const NAV_LINKS = [
  { href: '/dashboard',           icon: '🏠', label: 'Bosh sahifa' },
  { href: '/dashboard/courses',   icon: '📚', label: 'Kurslar' },
  { href: '/dashboard/analytics', icon: '📊', label: 'Statistika', roles: ['teacher', 'admin'] },
  { href: '/dashboard/admin',     icon: '🛡️', label: 'Admin Panel', roles: ['admin'] },
  { href: '/dashboard/sus-survey',icon: '📋', label: "So'rovnoma" },
  { href: '/dashboard/profile',   icon: '⚙️', label: 'Sozlamalar' },
];

export default function Sidebar() {
  const { userProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const isDark = theme === 'dark';

  const [activeSection, setActiveSection] = useState('messages');
  const [dms, setDms] = useState([]);
  const [groups, setGroups] = useState([]);
  const [channels, setChannels] = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [dmLoading, setDmLoading] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = userProfile?.role === 'admin';
  const isTeacher = userProfile?.role === 'teacher';

  // -- Firestore subscriptions --
  useEffect(() => {
    if (!userProfile?.id) return;
    getDocs(collection(db, 'users')).then((snap) =>
      setAllUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((u) => u.id !== userProfile.id))
    );
  }, [userProfile?.id]);

  useEffect(() => {
    if (!userProfile?.id) return;
    return onSnapshot(
      query(collection(db, 'conversations'), where('participants', 'array-contains', userProfile.id)),
      (snap) => setDms(snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.lastMessageAt?.seconds || 0) - (a.lastMessageAt?.seconds || 0)))
    );
  }, [userProfile?.id]);

  useEffect(() => {
    if (!userProfile?.id) return;
    return onSnapshot(
      query(collection(db, 'conversations'), where('members', 'array-contains', userProfile.id)),
      (snap) => setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.lastMessageAt?.seconds || 0) - (a.lastMessageAt?.seconds || 0)))
    );
  }, [userProfile?.id]);

  useEffect(() => {
    if (!userProfile?.id) return;
    return onSnapshot(
      query(collection(db, 'conversations'), where('subscribers', 'array-contains', userProfile.id)),
      (snap) => setChannels(snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.lastMessageAt?.seconds || 0) - (a.lastMessageAt?.seconds || 0)))
    );
  }, [userProfile?.id]);

  const filteredUsers = allUsers.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const handleStartDM = async (u) => {
    setDmLoading(true);
    try {
      const id = await getOrCreateDM(userProfile.id, u.id, u.name, userProfile.name);
      setShowUserSearch(false); setUserSearch('');
      router.push(`/dashboard/messages/${id}`);
    } catch (e) { console.error(e); }
    setDmLoading(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getDMName = (dm) => {
    const otherId = dm.participants?.find((id) => id !== userProfile?.id);
    return dm.participantNames?.[otherId] || 'Foydalanuvchi';
  };

  const counts = { messages: dms.length, groups: groups.length, channels: channels.length };

  // -- Theme colors --
  const bg = isDark ? '#0f1117' : '#f8f9ff';
  const surface = isDark ? '#161b2e' : '#ffffff';
  const border = isDark ? 'rgba(255,255,255,0.07)' : '#e8eaf0';
  const textPrimary = isDark ? '#f0f2ff' : '#1a1a2e';
  const textMuted = isDark ? 'rgba(255,255,255,0.4)' : '#8b8fa8';
  const textSubtle = isDark ? 'rgba(255,255,255,0.2)' : '#c5c7d4';
  const activeBg = isDark ? 'rgba(109,40,217,0.2)' : 'rgba(109,40,217,0.08)';
  const activeText = isDark ? '#c4b5fd' : '#5b21b6';
  const hoverBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(109,40,217,0.05)';
  const inputBg = isDark ? 'rgba(255,255,255,0.07)' : '#f1f3fb';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : '#dde0ef';
  const sectionTabBg = isDark ? 'rgba(255,255,255,0.05)' : '#f0f1fa';

  const sidebar = (
    <div
      className="flex flex-col h-full w-[260px] flex-shrink-0"
      style={{ background: surface, borderRight: `1px solid ${border}` }}
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 flex-shrink-0">
        <div
          className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', boxShadow: '0 4px 12px rgba(124,58,237,0.4)' }}
        >
          <span className="text-white font-black text-sm">E</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm truncate" style={{ color: textPrimary }}>EduConnect</p>
          <p className="text-[10px] truncate" style={{ color: textMuted }}>{userProfile?.name}</p>
        </div>
        <button
          onClick={toggleTheme}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-violet-100/20 flex-shrink-0"
          title={isDark ? 'Kunduzgi' : 'Tungi'}
        >
          <span className="text-sm">{isDark ? '☀️' : '🌙'}</span>
        </button>
      </div>

      {/* ── Nav Links ── */}
      <div className="px-2 pb-2 flex-shrink-0">
        {NAV_LINKS.filter((n) => !n.roles || n.roles.includes(userProfile?.role)).map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl mb-0.5 cursor-pointer transition-all duration-150"
                style={{
                  background: active ? activeBg : 'transparent',
                  borderLeft: active ? '2.5px solid #7c3aed' : '2.5px solid transparent',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = hoverBg; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
                <span className="text-xs font-semibold truncate" style={{ color: active ? activeText : textMuted }}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mx-3 h-px flex-shrink-0" style={{ background: border }} />

      {/* ── Messaging Sections (Tabs) ── */}
      <div className="px-3 pt-3 pb-1 flex-shrink-0">
        <div className="flex rounded-2xl p-1 gap-0.5" style={{ background: sectionTabBg }}>
          {NAV_SECTIONS.map((s) => {
            const active = activeSection === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className="flex-1 flex flex-col items-center py-1.5 rounded-xl transition-all duration-200 relative"
                style={{ background: active ? (isDark ? 'rgba(124,58,237,0.3)' : 'white') : 'transparent' }}
              >
                <span className="text-sm">{s.icon}</span>
                <span className="text-[9px] font-bold mt-0.5 truncate" style={{ color: active ? activeText : textMuted }}>
                  {s.label}
                </span>
                {counts[s.key] > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center text-white"
                    style={{ background: '#7c3aed' }}
                  >
                    {counts[s.key] > 9 ? '9+' : counts[s.key]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section header with + button ── */}
      <div className="px-3 pt-2 pb-1 flex items-center justify-between flex-shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: textSubtle }}>
          {activeSection === 'messages' ? 'Shaxsiy xabarlar' :
           activeSection === 'groups' ? "A'zo guruhlar" : 'Obuna kanallar'}
        </span>
        {/* + button — always visible */}
        {activeSection === 'messages' && (
          <button
            onClick={() => { setShowUserSearch(!showUserSearch); setUserSearch(''); }}
            className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-sm transition-all hover:scale-110 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: 'white', boxShadow: '0 2px 8px rgba(124,58,237,0.35)' }}
            title="Yangi xabar"
          >
            {showUserSearch ? '✕' : '+'}
          </button>
        )}
        {activeSection === 'groups' && (
          <button
            onClick={() => setShowGroupModal(true)}
            className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-sm transition-all hover:scale-110 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: 'white', boxShadow: '0 2px 8px rgba(124,58,237,0.35)' }}
            title="Guruh yaratish"
          >+</button>
        )}
        {activeSection === 'channels' && (isAdmin || isTeacher) && (
          <button
            onClick={() => setShowChannelModal(true)}
            className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-sm transition-all hover:scale-110 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: 'white', boxShadow: '0 2px 8px rgba(124,58,237,0.35)' }}
            title="Kanal yaratish"
          >+</button>
        )}
      </div>

      {/* ── User search for DM ── */}
      {showUserSearch && activeSection === 'messages' && (
        <div className="px-3 pb-2 flex-shrink-0">
          <input
            autoFocus
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Ism yoki email..."
            className="w-full px-3 py-2 rounded-xl text-xs outline-none mb-1.5"
            style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: textPrimary }}
          />
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: `1px solid ${inputBorder}`, maxHeight: '160px', overflowY: 'auto' }}
          >
            {filteredUsers.slice(0, 8).map((u) => (
              <button
                key={u.id}
                onClick={() => handleStartDM(u)}
                disabled={dmLoading}
                className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                style={{ borderBottom: `1px solid ${inputBorder}` }}
                onMouseEnter={(e) => e.currentTarget.style.background = hoverBg}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${gc(u.id)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                  {gi(u.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold truncate" style={{ color: textPrimary }}>{u.name}</p>
                  <p className="text-[9px]" style={{ color: textMuted }}>
                    {u.role === 'teacher' ? "O'qituvchi" : u.role === 'admin' ? 'Admin' : 'Talaba'}
                  </p>
                </div>
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <p className="text-center py-3 text-[11px]" style={{ color: textMuted }}>Topilmadi</p>
            )}
          </div>
        </div>
      )}

      {/* ── Conversation list ── */}
      <div
        className="flex-1 overflow-y-auto px-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: `${border} transparent` }}
      >
        {activeSection === 'messages' && (
          dms.length === 0
            ? <Empty icon="💬" text="Xabar yo'q" sub="+ orqali boshlang" textMuted={textMuted} textSubtle={textSubtle} />
            : dms.map((dm) => {
              const name = getDMName(dm);
              const href = `/dashboard/messages/${dm.id}`;
              return <CItem key={dm.id} href={href} active={pathname === href} grad={gc(dm.id)} init={gi(name)} name={name} sub={dm.lastMessage || "Yangi suhbat"} activeBg={activeBg} activeText={activeText} hoverBg={hoverBg} textPrimary={textPrimary} textSubtle={textSubtle} border={border} />;
            })
        )}
        {activeSection === 'groups' && (
          groups.length === 0
            ? <Empty icon="👥" text="Guruh yo'q" sub="+ orqali guruh yarating" textMuted={textMuted} textSubtle={textSubtle} />
            : groups.map((g) => {
              const href = `/dashboard/messages/${g.id}`;
              return <CItem key={g.id} href={href} active={pathname === href} grad={gc(g.id)} init={gi(g.title)} name={g.title} sub={`${g.members?.length || 0} a'zo`} badge="👥" activeBg={activeBg} activeText={activeText} hoverBg={hoverBg} textPrimary={textPrimary} textSubtle={textSubtle} border={border} />;
            })
        )}
        {activeSection === 'channels' && (
          channels.length === 0
            ? <Empty icon="📢" text="Kanal yo'q" sub={isAdmin || isTeacher ? '+ orqali kanal yarating' : "Hali yo'q"} textMuted={textMuted} textSubtle={textSubtle} />
            : channels.map((ch) => {
              const href = `/dashboard/messages/${ch.id}`;
              return <CItem key={ch.id} href={href} active={pathname === href} grad={gc(ch.id)} init={gi(ch.title)} name={ch.title} sub={`${ch.subscribers?.length || 0} obunachi`} badge="📢" activeBg={activeBg} activeText={activeText} hoverBg={hoverBg} textPrimary={textPrimary} textSubtle={textSubtle} border={border} />;
            })
        )}
      </div>

      {/* ── LOGOUT BUTTON (ajratilgan, aniq ko'rinadigan) ── */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: `1px solid ${border}` }}>
        {!logoutConfirm ? (
          <div className="flex items-center gap-2">
            {/* User info */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 overflow-hidden"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}
              >
                {userProfile?.avatar
                  ? <img src={userProfile.avatar} className="w-full h-full object-cover" alt="" />
                  : gi(userProfile?.name)
                }
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold truncate" style={{ color: textPrimary }}>{userProfile?.name}</p>
                <p className="text-[9px] capitalize" style={{ color: textMuted }}>{userProfile?.role}</p>
              </div>
            </div>
            {/* Logout button — clearly labeled */}
            <button
              onClick={() => setLogoutConfirm(true)}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-bold transition-all hover:scale-105 flex-shrink-0"
              style={{
                background: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
              title="Chiqish"
            >
              <span>🚪</span>
              <span>Chiqish</span>
            </button>
          </div>
        ) : (
          /* Confirm logout */
          <div
            className="rounded-2xl p-3 text-center"
            style={{ background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: textPrimary }}>Chiqishni tasdiqlang</p>
            <div className="flex gap-2">
              <button
                onClick={() => setLogoutConfirm(false)}
                className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: inputBg, color: textMuted }}
              >Bekor</button>
              <button
                onClick={handleLogout}
                className="flex-1 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}
              >🚪 Chiqish</button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showGroupModal && (
        <CreateGroupModal
          onClose={() => setShowGroupModal(false)}
          onCreated={(id) => { setShowGroupModal(false); router.push(`/dashboard/messages/${id}`); }}
        />
      )}
      {showChannelModal && (
        <CreateChannelModal
          onClose={() => setShowChannelModal(false)}
          onCreated={(id) => { setShowChannelModal(false); router.push(`/dashboard/messages/${id}`); }}
        />
      )}
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg text-white"
        style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}
      >☰</button>

      {/* Desktop */}
      <div className="hidden lg:block h-full flex-shrink-0">{sidebar}</div>

      {/* Mobile */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 z-50 lg:hidden">{sidebar}</div>
        </>
      )}
    </>
  );
}

function CItem({ href, active, grad, init, name, sub, badge, activeBg, activeText, hoverBg, textPrimary, textSubtle, border }) {
  return (
    <Link href={href}>
      <div
        className="flex items-center gap-2.5 px-2 py-2 rounded-xl cursor-pointer transition-all duration-150 mb-0.5"
        style={{
          background: active ? activeBg : 'transparent',
          borderLeft: active ? '2.5px solid #7c3aed' : '2.5px solid transparent',
        }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = hoverBg; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
      >
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0`}>
          {init}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="text-[12px] font-semibold truncate" style={{ color: active ? activeText : textPrimary }}>{name}</p>
            {badge && <span className="text-[10px]">{badge}</span>}
          </div>
          <p className="text-[10px] truncate" style={{ color: textSubtle }}>{sub}</p>
        </div>
      </div>
    </Link>
  );
}

function Empty({ icon, text, sub, textMuted, textSubtle }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 opacity-50">
      <span className="text-2xl mb-1.5">{icon}</span>
      <p className="text-xs font-medium" style={{ color: textMuted }}>{text}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: textSubtle }}>{sub}</p>}
    </div>
  );
}