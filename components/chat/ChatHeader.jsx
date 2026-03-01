'use client';

import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';

const GRAD = [
  'linear-gradient(135deg,#667eea,#764ba2)', 'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)', 'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)', 'linear-gradient(135deg,#a18cd1,#fbc2eb)',
];
const gc = (id) => GRAD[(id?.charCodeAt(0) || 0) % GRAD.length];
const gi = (name) => name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

export default function ChatHeader({ channel, onSearchToggle, onPinnedToggle, memberCount, onSettingsOpen }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!channel) return (
    <div style={{ height: 58, background: 'var(--chat-header-bg)', borderBottom: '1px solid var(--chat-header-border)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, backdropFilter: 'blur(12px)', flexShrink: 0 }}>
      <div style={{ width: 120, height: 14, borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }} />
    </div>
  );

  const isGroup = channel.type === 'group';
  const isChannel = channel.type === 'channel' || !isGroup;
  const typeIcon = isGroup ? '👥' : '📢';
  const typeLabel = isGroup ? 'Guruh' : 'Kanal';

  return (
    <div
      style={{
        height: 58, background: 'var(--chat-header-bg)', borderBottom: '1px solid var(--chat-header-border)',
        display: 'flex', alignItems: 'center', padding: '0 12px', gap: 10,
        backdropFilter: 'blur(12px)', flexShrink: 0, position: 'relative', zIndex: 10,
      }}
    >
      {/* Avatar + Name — clickable for settings */}
      <button
        onClick={onSettingsOpen}
        style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 12, transition: 'background .15s', textAlign: 'left' }}
        onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        title="Sozlamalarni ochish"
      >
        {/* Avatar */}
        <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          {channel.avatar
            ? <img src={channel.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
            : <div style={{ width: '100%', height: '100%', background: gc(channel.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 14 }}>{gi(channel.title)}</div>
          }
        </div>
        {/* Name + info */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <h2 style={{ fontWeight: 800, fontSize: 14, color: isDark ? 'rgba(255,255,255,0.9)' : '#1a1a2e', truncate: true, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
              {channel.title}
            </h2>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.08)', color: '#8b5cf6', whiteSpace: 'nowrap' }}>
              {typeIcon} {typeLabel}
            </span>
          </div>
          <p style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.4)' : '#8b8fa8', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>
            {channel.description
              ? channel.description
              : `${memberCount || (isGroup ? channel.members?.length : channel.subscribers?.length) || 0} a'zo • sozlash uchun bosing`
            }
          </p>
        </div>
      </button>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {[
          { icon: '📌', title: 'Mahkamlangan', action: onPinnedToggle },
          { icon: '🔍', title: 'Qidirish', action: onSearchToggle },
          { icon: '⚙️', title: 'Sozlamalar', action: onSettingsOpen },
        ].map((btn) => (
          <button key={btn.title} onClick={btn.action} title={btn.title}
            style={{ width: 36, height: 36, border: 'none', background: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, transition: 'background .15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >{btn.icon}</button>
        ))}
      </div>
    </div>
  );
}