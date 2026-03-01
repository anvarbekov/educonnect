'use client';

import { useState } from 'react';
import { searchMessages } from '@/services/firestore';
import { format } from 'date-fns';

export default function SearchPanel({ channelId, onClose, onJumpToMessage }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const msgs = await searchMessages(channelId, query.trim());
      setResults(msgs);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (msg) => {
    onJumpToMessage?.(msg.id);
    onClose();
  };

  const highlightText = (text, search) => {
    if (!text || !search) return text;
    const idx = text.toLowerCase().indexOf(search.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">{text.slice(idx, idx + search.length)}</mark>
        {text.slice(idx + search.length)}
      </>
    );
  };

  return (
    <div className="bg-base-100 border-b border-base-300 shadow-sm">
      <form onSubmit={handleSearch} className="flex gap-2 p-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 text-sm">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Xabarlarni qidirish..."
            className="input input-bordered input-sm w-full rounded-xl pl-8 text-sm"
            autoFocus
          />
        </div>
        <button type="submit" className="btn btn-primary btn-sm rounded-xl px-4" disabled={loading}>
          {loading ? <span className="loading loading-spinner loading-xs" /> : 'Qidirish'}
        </button>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-sm rounded-xl">✕</button>
      </form>

      {results.length > 0 && (
        <div className="max-h-56 overflow-y-auto border-t border-base-200">
          <div className="px-3 py-1.5 text-xs text-base-content/40 font-medium">
            {results.length} ta natija topildi — bosing, o'sha joyga o'tadi ↓
          </div>
          {results.map((msg) => (
            <button
              key={msg.id}
              onClick={() => handleSelect(msg)}
              className="w-full text-left px-4 py-2.5 hover:bg-primary/5 border-b border-base-200/50 last:border-0 transition-colors group"
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-semibold text-primary">{msg.senderName}</span>
                <span className="text-xs text-base-content/40">
                  {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'dd.MM HH:mm') : ''}
                </span>
              </div>
              <p className="text-sm text-base-content/80 line-clamp-2">
                {highlightText(msg.body || '[fayl]', query)}
              </p>
              <span className="text-xs text-primary/60 group-hover:text-primary mt-0.5 inline-block transition-colors">
                → O'sha xabarga o'tish
              </span>
            </button>
          ))}
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <div className="px-4 py-4 text-center border-t border-base-200">
          <p className="text-2xl mb-1">🔎</p>
          <p className="text-sm text-base-content/40">"{query}" topilmadi</p>
        </div>
      )}
    </div>
  );
}