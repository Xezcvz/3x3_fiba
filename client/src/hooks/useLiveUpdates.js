import { useEffect, useRef } from 'react';

const LIVE_EVENTS_URL = `${import.meta.env.VITE_API_URL || '/api'}/live/events`;

export default function useLiveUpdates(onUpdate) {
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (typeof EventSource === 'undefined') return undefined;

    const eventSource = new EventSource(LIVE_EVENTS_URL, { withCredentials: true });
    const handleUpdate = () => onUpdateRef.current?.();
    eventSource.addEventListener('data-updated', handleUpdate);

    return () => {
      eventSource.removeEventListener('data-updated', handleUpdate);
      eventSource.close();
    };
  }, []);
}
