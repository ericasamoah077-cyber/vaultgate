'use client';
import { useState, useCallback, useRef } from 'react';

export function useToast() {
  const [t, setT] = useState(null);
  const timer = useRef();
  const show = useCallback((msg, kind = 'ok') => {
    setT({ msg, kind });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setT(null), 3800);
  }, []);
  const node = t ? <div className={`toast ${t.kind}`} role="status">{t.msg}</div> : null;
  return [node, show];
}
