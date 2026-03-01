import { useState, useEffect } from 'react';
import { subscribeToMessages } from '@/services/firestore';

export function useMessages(channelId, limitCount = 100) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsub = subscribeToMessages(
      channelId,
      (msgs) => {
        setMessages(msgs);
        setLoading(false);
      },
      limitCount
    );

    return () => unsub && unsub();
  }, [channelId, limitCount]);

  return { messages, loading, error };
}
