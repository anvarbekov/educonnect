'use client';

export default function PinnedMessages({ messages, onUnpin }) {
  if (!messages.length) return null;

  return (
    <div className="bg-base-100 border-b border-base-300 px-4 py-2 space-y-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold text-base-content/50 uppercase tracking-wide">📌 Mahkamlangan</span>
        <span className="badge badge-xs badge-primary">{messages.length}</span>
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {messages.map((msg) => (
          <div key={msg.id} className="pinned-bar flex items-start gap-2 px-3 py-1.5 rounded-r-xl">
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-primary">{msg.senderName}: </span>
              <span className="text-xs text-base-content/70 truncate">{msg.body || '[fayl]'}</span>
            </div>
            <button
              onClick={() => onUnpin(msg.id)}
              className="btn btn-ghost btn-xs rounded-lg opacity-60 hover:opacity-100"
            >✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
