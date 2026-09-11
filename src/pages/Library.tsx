import { useMemo, useState } from 'react';
import { EXERCISES, getExercise } from '../data/exercises';
import { muscleGroupOf, MUSCLE_GROUPS } from '../lib/logic';
import { Card, Pill, SectionTitle } from '../components/ui';

export default function Library() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string>('Tutti');
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter((e) => e.kind !== 'MOBILITY')
      .filter((e) => group === 'Tutti' || muscleGroupOf(e) === group)
      .filter(
        (e) =>
          q === '' ||
          e.name.toLowerCase().includes(q) ||
          e.muscles.join(' ').toLowerCase().includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }, [query, group]);

  const open = openId ? getExercise(openId) : undefined;

  if (open) {
    return (
      <div className="space-y-3 pb-4">
        <button className="btn-chip mt-3" onClick={() => setOpenId(null)}>
          ← Torna alla libreria
        </button>
        <Card>
          <div className="flex flex-wrap gap-2">
            <Pill tone="ink">{open.kind}</Pill>
            <Pill>{muscleGroupOf(open)}</Pill>
            {open.code && <Pill>In scheda: {open.code}</Pill>}
          </div>
          <h1 className="mt-2 text-2xl font-black leading-tight">{open.name}</h1>
          <p className="mt-1 text-sm font-medium text-ink/60">{open.muscles.join(' · ')}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-ink/85">{open.summary}</p>

          <p className="section-title mt-4">Esecuzione</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink/85">
            {open.cues.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>

          <p className="section-title mt-4">Errori da evitare</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink/85">
            {open.mistakes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>

          {open.kneeNote && (
            <p className="mt-4 rounded-2xl border border-orange-900/20 bg-orange-100/60 p-3 text-sm font-semibold text-orange-950">
              🦵 {open.kneeNote}
            </p>
          )}
          {open.safetyNote && (
            <p className="mt-2 rounded-2xl bg-ink/6 p-3 text-sm font-semibold">⚠︎ {open.safetyNote}</p>
          )}

          {open.alternatives.length > 0 && (
            <>
              <p className="section-title mt-4">Alternative</p>
              <ul className="mt-1 space-y-2">
                {open.alternatives.map((id) => (
                  <li key={id}>
                    <button
                      className="btn-ghost w-full justify-start text-left"
                      onClick={() => setOpenId(id)}
                    >
                      {getExercise(id).name}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <a
            className="btn-primary mt-4 w-full"
            target="_blank"
            rel="noreferrer"
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(open.name)}`}
          >
            ▶︎ Guarda un video
          </a>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <header className="py-3">
        <h1 className="text-3xl font-black">Esercizi</h1>
        <p className="text-sm font-medium text-ink/65">
          {EXERCISES.filter((e) => e.kind !== 'MOBILITY').length} schede, alternative comprese.
        </p>
      </header>

      <input
        type="search"
        className="field"
        placeholder="Cerca un esercizio o un muscolo…"
        aria-label="Cerca un esercizio"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {['Tutti', ...MUSCLE_GROUPS].map((g) => (
          <button
            key={g}
            className={`btn-chip shrink-0 ${group === g ? '!bg-ink !text-brand-400' : ''}`}
            aria-pressed={group === g}
            onClick={() => setGroup(g)}
          >
            {g}
          </button>
        ))}
      </div>

      <SectionTitle>{list.length} esercizi</SectionTitle>
      <Card className="!p-0">
        <ul className="divide-y divide-ink/8">
          {list.map((e) => (
            <li key={e.id}>
              <button
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
                onClick={() => setOpenId(e.id)}
              >
                <span className="min-w-0">
                  <span className="block font-bold leading-snug">{e.name}</span>
                  <span className="block text-xs text-ink-mute">{e.muscles.join(' · ')}</span>
                </span>
                <span aria-hidden className="text-ink/40">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
