import { useState } from 'react';
import { useStore } from '../lib/store';
import { getExercise } from '../data/exercises';
import { sessionVolume } from '../lib/logic';
import { Card, EmptyState, Pill, SectionTitle } from '../components/ui';
import type { WorkoutLog } from '../data/types';

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

function Detail({ log, onClose }: { log: WorkoutLog; onClose: () => void }) {
  const { deleteWorkout, putWorkout } = useStore();
  const [notes, setNotes] = useState(log.notes ?? '');
  const byExercise = new Map<string, typeof log.sets>();
  for (const s of log.sets) {
    if (!s.done || s.setIndex < 0) continue;
    const key = s.substitutedWithId ?? s.exerciseId;
    byExercise.set(key, [...(byExercise.get(key) ?? []), s]);
  }
  const minutes = log.finishedAt
    ? Math.round((new Date(log.finishedAt).getTime() - new Date(log.startedAt).getTime()) / 60000)
    : undefined;

  return (
    <div className="space-y-3">
      <button className="btn-chip" onClick={onClose}>
        ← Torna allo storico
      </button>
      <Card>
        <h2 className="text-2xl font-black">Sessione {log.sessionId}</h2>
        <p className="text-sm font-semibold text-ink/65">{fmt(log.startedAt)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill tone="ink">Ciclo {log.cycle}</Pill>
          <Pill>Settimana {log.week}</Pill>
          <Pill>{log.phaseId}</Pill>
          {minutes !== undefined && <Pill>{minutes}′</Pill>}
          <Pill>{Math.round(sessionVolume(log)).toLocaleString('it-IT')} kg di volume</Pill>
          {log.kneePain !== undefined && (
            <Pill tone={log.kneePain >= 4 ? 'warn' : 'good'}>Ginocchia {log.kneePain}/10</Pill>
          )}
        </div>
      </Card>

      {[...byExercise.entries()].map(([id, sets]) => {
        const ex = getExercise(id);
        const timed = ex.measure.startsWith('seconds');
        return (
          <Card key={id}>
            <p className="font-bold">{ex.name}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {sets
                .sort((a, b) => a.setIndex - b.setIndex)
                .map((s, i) => (
                  <li
                    key={i}
                    className={`rounded-xl border px-3 py-1.5 text-sm font-bold tabular-nums ${
                      s.isDropSet ? 'border-red-900/25 bg-red-900/8 text-red-900' : 'border-ink/12 bg-white/60'
                    }`}
                  >
                    {s.weightKg ? `${s.weightKg} kg × ` : ''}
                    {s.value}
                    {timed ? '″' : ''}
                    {s.rir !== undefined ? ` · RIR ${s.rir}` : ''}
                    {s.isDropSet ? ' · DROP' : ''}
                  </li>
                ))}
            </ul>
          </Card>
        );
      })}

      <Card>
        <label className="label" htmlFor="n">
          Note
        </label>
        <textarea
          id="n"
          className="field py-3"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button
          className="btn-primary mt-3 w-full"
          onClick={() => void putWorkout({ ...log, notes })}
        >
          Salva le modifiche
        </button>
        <button
          className="btn-ghost mt-2 w-full !text-red-900"
          onClick={() => {
            if (window.confirm('Eliminare definitivamente questa sessione?')) {
              void deleteWorkout(log.id);
              onClose();
            }
          }}
        >
          Elimina la sessione
        </button>
      </Card>
    </div>
  );
}

export default function History() {
  const { workouts } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = workouts.find((w) => w.id === openId);

  if (open) return <Detail log={open} onClose={() => setOpenId(null)} />;

  return (
    <div className="space-y-4 pb-4">
      <header className="py-3">
        <h1 className="text-3xl font-black">Storico</h1>
        <p className="text-sm font-medium text-ink/65">
          {workouts.length} {workouts.length === 1 ? 'sessione registrata' : 'sessioni registrate'}.
        </p>
      </header>

      {workouts.length === 0 ? (
        <EmptyState title="Nessuna sessione" hint="Le sessioni che completi compaiono qui." />
      ) : (
        <>
          <SectionTitle>Tutte le sessioni</SectionTitle>
          <Card className="!p-0">
            <ul className="divide-y divide-ink/8">
              {workouts.map((w) => (
                <li key={w.id}>
                  <button
                    className="flex w-full items-center justify-between gap-3 p-4 text-left"
                    onClick={() => setOpenId(w.id)}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-lg font-black text-brand-400">
                      {w.sessionId}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{fmt(w.startedAt)}</span>
                      <span className="block text-xs text-ink-mute">
                        Sett. {w.week} · {w.sets.filter((s) => s.done).length} serie ·{' '}
                        {Math.round(sessionVolume(w)).toLocaleString('it-IT')} kg
                        {w.status === 'inProgress' ? ' · in corso' : ''}
                      </span>
                    </span>
                    <span aria-hidden className="text-ink/40">
                      ›
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
