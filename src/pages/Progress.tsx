import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStore } from '../lib/store';
import { newId } from '../lib/db';
import { EXERCISES, getExercise } from '../data/exercises';
import { SESSIONS } from '../data/program';
import {
  MUSCLE_GROUPS,
  epley1RM,
  muscleGroupOf,
  movingAverage,
  sessionVolume,
  workingSets,
} from '../lib/logic';
import { Card, EmptyState, SectionTitle } from '../components/ui';

const AXIS = { stroke: '#4A4A4F', fontSize: 11 };
const GRID = '#0B0B0C18';

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });

/** Esercizi che compaiono nelle sessioni A e B, in ordine. */
const PROGRAM_EXERCISE_IDS = Array.from(
  new Set(
    (['A', 'B'] as const).flatMap((id) =>
      SESSIONS[id].blocks
        .filter((b) => b.type !== 'warmup' && b.type !== 'cooldown')
        .flatMap((b) => b.exercises.map((e) => e.id)),
    ),
  ),
);

export default function Progress() {
  const { completed, metrics, putMetric, deleteMetric } = useStore();
  const [exerciseId, setExerciseId] = useState(PROGRAM_EXERCISE_IDS[0]);
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');

  const logsAsc = useMemo(
    () => [...completed].sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1)),
    [completed],
  );

  /* ------------------------------------------------------ carico max e 1RM stimato */
  const exerciseSeries = useMemo(() => {
    return logsAsc
      .map((l) => {
        const sets = workingSets(l, exerciseId);
        if (sets.length === 0) return null;
        const best = sets.reduce((a, b) => ((b.weightKg ?? 0) > (a.weightKg ?? 0) ? b : a));
        return {
          date: fmtDay(l.startedAt),
          carico: best.weightKg ?? 0,
          rm: Math.round(epley1RM(best.weightKg ?? 0, best.value) * 10) / 10,
        };
      })
      .filter((x): x is { date: string; carico: number; rm: number } => x !== null);
  }, [logsAsc, exerciseId]);

  /* ----------------------------------------------- serie settimanali per gruppo */
  const weeklySets = useMemo(() => {
    const lastTwo = logsAsc.slice(-4);
    const totals = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0])) as Record<string, number>;
    for (const l of lastTwo.slice(-2)) {
      for (const s of l.sets) {
        if (!s.done || s.setIndex < 0) continue;
        const ex = getExercise(s.substitutedWithId ?? s.exerciseId);
        totals[muscleGroupOf(ex)] += 1;
      }
    }
    return MUSCLE_GROUPS.map((g) => ({ gruppo: g, serie: totals[g] }));
  }, [logsAsc]);

  /* ---------------------------------------------------------------- volume e peso */
  const volumeSeries = useMemo(
    () =>
      logsAsc.map((l) => ({
        date: fmtDay(l.startedAt),
        volume: Math.round(sessionVolume(l)),
      })),
    [logsAsc],
  );

  const bodySeries = useMemo(() => {
    const asc = [...metrics].sort((a, b) => (a.date < b.date ? -1 : 1));
    const weights = asc.map((m) => m.weightKg ?? NaN);
    const avg = movingAverage(weights.filter((w) => !Number.isNaN(w)));
    let i = 0;
    return asc.map((m) => ({
      date: fmtDay(m.date),
      peso: m.weightKg,
      media: m.weightKg !== undefined ? Math.round(avg[i++] * 10) / 10 : undefined,
      vita: m.waistCm,
    }));
  }, [metrics]);

  const addMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = Number(weight.replace(',', '.'));
    const c = Number(waist.replace(',', '.'));
    if (!weight && !waist) return;
    await putMetric({
      id: newId(),
      date: new Date().toISOString().slice(0, 10),
      ...(weight && !Number.isNaN(w) ? { weightKg: w } : {}),
      ...(waist && !Number.isNaN(c) ? { waistCm: c } : {}),
    });
    setWeight('');
    setWaist('');
  };

  const totalVolume = volumeSeries.reduce((a, b) => a + b.volume, 0);

  return (
    <div className="space-y-4 pb-4">
      <header className="py-3">
        <h1 className="text-3xl font-black">Progressi</h1>
        <p className="text-sm font-medium text-ink/65">
          Ogni sessione registrata alimenta questi grafici.
        </p>
      </header>

      <Card>
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            ['Sessioni', String(completed.length)],
            ['Serie', String(completed.reduce((a, l) => a + l.sets.filter((s) => s.done).length, 0))],
            ['Volume', `${Math.round(totalVolume / 1000)}t`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-ink/10 bg-white/55 p-3">
              <dt className="text-[10px] font-black uppercase tracking-wider text-ink-mute">{k}</dt>
              <dd className="text-2xl font-black tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <section>
        <SectionTitle>Carico e 1RM stimato</SectionTitle>
        <Card>
          <label className="label" htmlFor="ex">
            Esercizio
          </label>
          <select
            id="ex"
            className="field"
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
          >
            {PROGRAM_EXERCISE_IDS.map((id) => (
              <option key={id} value={id}>
                {getExercise(id).name}
              </option>
            ))}
          </select>

          {exerciseSeries.length === 0 ? (
            <p className="mt-4 text-sm text-ink-mute">
              Nessun dato: registra almeno una sessione con questo esercizio.
            </p>
          ) : (
            <div className="mt-4 h-56" aria-label="Grafico del carico nel tempo">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={exerciseSeries} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="date" {...AXIS} />
                  <YAxis {...AXIS} width={44} />
                  <Tooltip
                    contentStyle={{ borderRadius: 14, border: 'none', fontSize: 12 }}
                    formatter={(v: number, n: string) => [`${v} kg`, n === 'rm' ? '1RM stimato' : 'Carico']}
                  />
                  <Line
                    type="monotone"
                    dataKey="carico"
                    stroke="#0B0B0C"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rm"
                    stroke="#B89800"
                    strokeWidth={3}
                    strokeDasharray="5 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-1 text-xs text-ink-mute">
            Linea piena: carico massimo usato. Tratteggiata: 1RM stimato con la formula di Epley.
          </p>
        </Card>
      </section>

      <section>
        <SectionTitle>Serie settimanali per gruppo muscolare</SectionTitle>
        <Card>
          <div className="h-52" aria-label="Grafico delle serie per gruppo muscolare">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklySets} margin={{ top: 5, right: 8, left: -26, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="gruppo" {...AXIS} interval={0} angle={-16} dy={8} height={44} />
                <YAxis {...AXIS} width={44} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 14, border: 'none', fontSize: 12 }}
                  formatter={(v: number) => [`${v} serie`, 'Ultime 2 sessioni']}
                />
                <Bar dataKey="serie" fill="#0B0B0C" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {volumeSeries.length > 1 && (
        <section>
          <SectionTitle>Volume per sessione (kg × ripetizioni)</SectionTitle>
          <Card>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeSeries} margin={{ top: 5, right: 8, left: -14, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="date" {...AXIS} />
                  <YAxis {...AXIS} width={56} />
                  <Tooltip
                    contentStyle={{ borderRadius: 14, border: 'none', fontSize: 12 }}
                    formatter={(v: number) => [`${v.toLocaleString('it-IT')} kg`, 'Volume']}
                  />
                  <Bar dataKey="volume" fill="#B89800" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      )}

      <section>
        <SectionTitle>Peso corporeo e vita</SectionTitle>
        <Card>
          <form onSubmit={addMetric} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <div>
              <label className="label" htmlFor="pw">
                Peso (kg)
              </label>
              <input
                id="pw"
                type="number"
                inputMode="decimal"
                step="0.1"
                className="field"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="pv">
                Vita (cm)
              </label>
              <input
                id="pv"
                type="number"
                inputMode="decimal"
                step="0.5"
                className="field"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
              />
            </div>
            <button className="btn-primary self-end !px-4" type="submit">
              Salva
            </button>
          </form>

          {bodySeries.length > 1 && (
            <div className="mt-4 h-48" aria-label="Grafico del peso corporeo">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bodySeries} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="date" {...AXIS} />
                  <YAxis {...AXIS} width={44} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ borderRadius: 14, border: 'none', fontSize: 12 }} />
                  <Line type="monotone" dataKey="peso" stroke="#0B0B0C" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="media" stroke="#B89800" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="vita" stroke="#0F766E" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <p className="mt-2 rounded-2xl bg-brand-200/60 p-3 text-sm font-semibold">
            📌 Pesati 1–2 volte a settimana alla stessa ora, appena sveglio. Misura la vita ogni 2
            settimane. La linea gialla è la media delle ultime 3 misurazioni: è quella che conta.
          </p>

          {metrics.length > 0 && (
            <ul className="mt-3 divide-y divide-ink/8">
              {metrics.slice(0, 6).map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-semibold">
                    {new Date(m.date).toLocaleDateString('it-IT')}
                  </span>
                  <span className="tabular-nums text-ink/70">
                    {m.weightKg ? `${m.weightKg} kg` : ''} {m.waistCm ? `· ${m.waistCm} cm` : ''}
                  </span>
                  <button
                    className="btn-chip !min-h-[36px]"
                    onClick={() => deleteMetric(m.id)}
                    aria-label={`Elimina misurazione del ${m.date}`}
                  >
                    Elimina
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {completed.length === 0 && (
        <EmptyState
          title="Ancora nessuna sessione"
          hint={`La libreria contiene ${EXERCISES.length} esercizi: completa la Sessione A per popolare la dashboard.`}
        />
      )}
    </div>
  );
}
