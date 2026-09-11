import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { SESSIONS, WEEKS_PER_CYCLE } from '../data/program';
import { isCycleComplete, setsForPhase } from '../lib/logic';
import { Card, Logo, Pill, ProgressBar, SectionTitle } from '../components/ui';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });

/** Sintesi di una sessione, per scegliere a colpo d'occhio. */
const FOCUS: Record<'A' | 'B', string> = {
  A: 'Panca piana · lat machine · alzate · core',
  B: 'Trazioni · rematore · shoulder press · plank',
};

export default function Home() {
  const { program, completed, settings, updateSettings } = useStore();
  const navigate = useNavigate();
  // La sessione consigliata dall'alternanza è solo il default: scegli tu.
  const [selected, setSelected] = useState<'A' | 'B'>(program.nextSessionId);
  const session = SESSIONS[selected];
  const completedInCycle = completed.filter((w) => w.cycle === settings.cycle).length;
  const cycleDone = isCycleComplete(completedInCycle);

  const weeksElapsed = Math.max(
    1,
    Math.ceil(
      (Date.now() - new Date(settings.startDate).getTime()) / (7 * 24 * 3600 * 1000) || 0,
    ) || 1,
  );
  const expected = Math.min(weeksElapsed * 2, WEEKS_PER_CYCLE * 2);
  const adherence = Math.min(100, Math.round((completedInCycle / Math.max(1, expected)) * 100));

  const startNewCycle = async () => {
    await updateSettings({ cycle: settings.cycle + 1 });
  };

  return (
    <div className="space-y-4 pb-4">
      <header className="flex items-center justify-between py-3">
        <Logo />
        <Link to="/consigli" className="btn-chip" aria-label="Consigli">
          💡 Consigli
        </Link>
      </header>

      {cycleDone ? (
        <Card className="solid !bg-ink !text-white">
          <h2 className="text-xl font-black">Ciclo {settings.cycle} completato 🎉</h2>
          <p className="mt-2 text-sm text-white/75">
            Dodici settimane chiuse. Inizia il ciclo {settings.cycle + 1}: lo storico dei carichi
            resta, e la fase di riadattamento durerà solo una settimana.
          </p>
          <button className="btn mt-4 w-full bg-brand-500 text-ink" onClick={startNewCycle}>
            Inizia il ciclo {settings.cycle + 1}
          </button>
        </Card>
      ) : (
        <>
          <Card>
            <p className="section-title">Scegli l’allenamento</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(['A', 'B'] as const).map((id) => {
                const on = selected === id;
                const suggested = program.nextSessionId === id;
                return (
                  <button
                    key={id}
                    onClick={() => setSelected(id)}
                    aria-pressed={on}
                    className={`rounded-glass border p-4 text-left transition active:scale-[0.98] ${
                      on
                        ? 'border-ink bg-ink text-white shadow-lift'
                        : 'border-ink/12 bg-white/60 text-ink'
                    }`}
                  >
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-black ${
                        on ? 'bg-brand-500 text-ink' : 'bg-ink text-brand-400'
                      }`}
                    >
                      {id}
                    </span>
                    <span className="mt-2 block text-base font-black">Sessione {id}</span>
                    <span
                      className={`mt-0.5 block text-xs leading-snug ${on ? 'text-white/70' : 'text-ink/60'}`}
                    >
                      {FOCUS[id]}
                    </span>
                    {suggested && (
                      <span
                        className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                          on ? 'bg-brand-500 text-ink' : 'bg-ink/10 text-ink'
                        }`}
                      >
                        Consigliata
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-sm font-semibold text-ink/70">
              Ciclo {program.cycle} · Settimana {program.week} di {WEEKS_PER_CYCLE} ·{' '}
              {session.estimatedMinutes}′ circa
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Pill tone="ink">Fase: {program.phase.name}</Pill>
              <Pill>RIR multi {program.phase.rirMulti}</Pill>
              <Pill>RIR iso {program.phase.rirIso}</Pill>
              <Pill>Tempo {program.phase.tempo.multi}</Pill>
              {program.phase.dropSetOnLastIsoSet && <Pill tone="warn">Drop set ISO</Pill>}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink/75">{program.phase.description}</p>
            {program.phase.loadNote && (
              <p className="mt-1 text-sm font-semibold text-ink">{program.phase.loadNote}</p>
            )}

            <button
              className="btn-primary mt-5 w-full text-lg"
              onClick={() => navigate(`/allenamento?sessione=${selected}`)}
            >
              ▶︎ Inizia allenamento {selected}
            </button>
          </Card>
        </>
      )}

      <Card>
        <ProgressBar
          value={completedInCycle}
          max={WEEKS_PER_CYCLE * 2}
          label={`Ciclo ${settings.cycle}: ${completedInCycle} di ${WEEKS_PER_CYCLE * 2} sessioni`}
        />
        <div className="mt-4">
          <ProgressBar
            value={adherence}
            max={100}
            label={`Aderenza: ${completedInCycle} svolte su ${expected} previste`}
            fillClass="bg-emerald-700"
          />
        </div>
      </Card>

      <section>
        <SectionTitle>Anteprima Sessione {selected}</SectionTitle>
        <Card as="section" className="!p-0">
          <ul className="divide-y divide-ink/8">
            {session.blocks
              .filter((b) => b.type !== 'warmup' && b.type !== 'cooldown')
              .map((b) => (
                <li key={b.id} className="p-4">
                  <p className="section-title">{b.label}</p>
                  <ul className="mt-1 space-y-1">
                    {b.exercises.map((e) => (
                      <li key={e.id} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-semibold">
                          {e.code && <span className="text-ink/50">{e.code} · </span>}
                          {e.name}
                        </span>
                        <span className="shrink-0 font-bold tabular-nums text-ink/70">
                          {setsForPhase(e.sets, program.phase)} × {e.min}
                          {e.max !== e.min && `–${e.max}`}
                          {e.measure.startsWith('seconds') ? '″' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
          </ul>
        </Card>
      </section>

      <section>
        <SectionTitle>Ultime sessioni</SectionTitle>
        {completed.length === 0 ? (
          <Card>
            <p className="text-sm text-ink-mute">
              Nessuna sessione registrata. Inizia dalla Sessione A.
            </p>
          </Card>
        ) : (
          <Card className="!p-0">
            <ul className="divide-y divide-ink/8">
              {completed.slice(0, 4).map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-bold">
                      Sessione {w.sessionId}{' '}
                      <span className="font-medium text-ink/55">· sett. {w.week}</span>
                    </p>
                    <p className="text-xs text-ink-mute">
                      {fmtDate(w.startedAt)} · {w.sets.filter((s) => s.done).length} serie
                    </p>
                  </div>
                  <Link className="btn-chip" to="/storico">
                    Dettaglio
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
