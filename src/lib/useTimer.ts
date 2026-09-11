import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'fittuplo:timer';

interface Persisted {
  endsAt: number;
  totalSec: number;
  label: string;
  kind: 'rest' | 'transition';
}

export interface TimerState extends Persisted {
  remaining: number;
}

/**
 * Timer basato sul timestamp di fine, non su un contatore: continua a scorrere
 * anche se l'app finisce in background o lo schermo si spegne, e viene ripreso
 * da localStorage alla riapertura.
 */
export function useRestTimer(onDone?: () => void) {
  const [state, setState] = useState<TimerState | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const firedRef = useRef(false);

  const read = (): Persisted | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Persisted) : null;
    } catch {
      return null;
    }
  };

  const write = (p: Persisted | null) => {
    try {
      if (p) localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage non disponibile: il timer resta comunque in memoria */
    }
  };

  const tick = useCallback(() => {
    const p = read();
    if (!p) {
      setState(null);
      return;
    }
    const remaining = Math.max(0, Math.ceil((p.endsAt - Date.now()) / 1000));
    setState({ ...p, remaining });
    if (remaining === 0 && !firedRef.current) {
      firedRef.current = true;
      doneRef.current?.();
    }
  }, []);

  useEffect(() => {
    tick();
    const i = window.setInterval(tick, 250);
    const onVisible = () => tick();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      window.clearInterval(i);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [tick]);

  const start = useCallback(
    (seconds: number, label: string, kind: 'rest' | 'transition' = 'rest') => {
      if (seconds <= 0) return;
      firedRef.current = false;
      const p: Persisted = { endsAt: Date.now() + seconds * 1000, totalSec: seconds, label, kind };
      write(p);
      setState({ ...p, remaining: seconds });
    },
    [],
  );

  const stop = useCallback(() => {
    firedRef.current = true;
    write(null);
    setState(null);
  }, []);

  const adjust = useCallback((deltaSec: number) => {
    const p = read();
    if (!p) return;
    const next: Persisted = {
      ...p,
      endsAt: Math.max(Date.now(), p.endsAt + deltaSec * 1000),
      totalSec: Math.max(5, p.totalSec + deltaSec),
    };
    firedRef.current = false;
    write(next);
    setState({ ...next, remaining: Math.max(0, Math.ceil((next.endsAt - Date.now()) / 1000)) });
  }, []);

  return { timer: state, start, stop, adjust };
}

/** Suono breve via WebAudio: non richiede file esterni, funziona offline. */
export function beep(enabled: boolean) {
  if (!enabled) return;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [0, 0.22, 0.44].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.35, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    });
    window.setTimeout(() => void ctx.close(), 1200);
  } catch {
    /* audio non disponibile */
  }
}

export function vibrate(enabled: boolean, pattern: number[] = [220, 90, 220]) {
  if (!enabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* vibrazione non disponibile */
  }
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
