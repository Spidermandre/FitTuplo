import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'li';
}) {
  return <Tag className={`glass-tile ${className}`}>{children}</Tag>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="section-title mb-2 px-1">{children}</h2>;
}

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'ink' | 'warn' | 'good';
}) {
  const tones = {
    neutral: 'bg-ink/8 text-ink',
    ink: 'bg-ink text-brand-400',
    warn: 'bg-red-900/12 text-red-900',
    good: 'bg-emerald-900/12 text-emerald-900',
  } as const;
  return <span className={`pill ${tones[tone]}`}>{children}</span>;
}

/** Barra di avanzamento in stile vetro. */
export function ProgressBar({
  value,
  max,
  label,
  fillClass = 'bg-ink',
}: {
  value: number;
  max: number;
  label?: string;
  /** classe Tailwind statica per il riempimento (le classi dinamiche non vengono generate) */
  fillClass?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      {label && (
        <div className="mb-1 flex items-baseline justify-between text-xs font-semibold text-ink-mute">
          <span>{label}</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
      )}
      <div
        className="h-3 w-full overflow-hidden rounded-full border border-white/70 bg-white/45 shadow-glass-sm"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Avanzamento'}
      >
        <div
          className={`relative h-full rounded-full ${fillClass} transition-[width] duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        >
          <span className="absolute inset-0 overflow-hidden rounded-full">
            <span className="absolute inset-y-0 -left-1/3 w-1/3 animate-shimmer bg-white/35 blur-[2px]" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  suffix,
  ariaLabel,
  decimals = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  ariaLabel: string;
  decimals?: number;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100));
  const fmt = (v: number) =>
    Number.isInteger(v) ? String(v) : v.toFixed(decimals).replace('.', ',');
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="step-btn"
        aria-label={`Diminuisci ${ariaLabel}`}
        onClick={() => onChange(clamp(value - step))}
      >
        −
      </button>
      <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1 rounded-2xl border border-ink/10 bg-white/60 px-2 py-2 shadow-glass-sm">
        <input
          type="number"
          inputMode="decimal"
          className="w-full bg-transparent text-center text-3xl font-black tabular-nums outline-none"
          value={fmt(value)}
          aria-label={ariaLabel}
          onChange={(e) => {
            const v = Number(e.target.value.replace(',', '.'));
            if (!Number.isNaN(v)) onChange(clamp(v));
          }}
        />
        {suffix && <span className="text-sm font-bold text-ink-mute">{suffix}</span>}
      </div>
      <button
        type="button"
        className="step-btn"
        aria-label={`Aumenta ${ariaLabel}`}
        onClick={() => onChange(clamp(value + step))}
      >
        +
      </button>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card className="text-center">
      <p className="text-base font-bold">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink-mute">{hint}</p>}
    </Card>
  );
}

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'text-base px-2.5 py-1' : 'text-xl px-3 py-1.5';
  return (
    <span
      className={`inline-flex items-center rounded-xl bg-ink font-black tracking-tight text-brand-400 ${cls}`}
    >
      FitTuplo
    </span>
  );
}
