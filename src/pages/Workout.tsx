import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { newId } from '../lib/db';
import { SESSIONS } from '../data/program';
import { getExercise } from '../data/exercises';
import type { Block, Exercise, SetLog, WorkoutLog } from '../data/types';
import {
  isDropSetIndex,
  rirForPhase,
  sessionVolume,
  setsForPhase,
  suggestForExercise,
  tempoForPhase,
  timerAfterSet,
  workingSets,
} from '../lib/logic';
import { beep, formatClock, useRestTimer, vibrate } from '../lib/useTimer';
import { BLOCK_STYLE } from '../components/blockStyle';
import { Card, Pill, ProgressBar, Stepper } from '../components/ui';

interface Step {
  block: Block;
  exIndex: number;
  exercise: Exercise;
  setIndex: number;
  totalSets: number;
  isDropSet: boolean;
  isLastSetOfBlock: boolean;
}

/** Elenco piatto di passi: nelle superserie B1 → B2 → recupero → B1… */
function buildSteps(blocks: Block[], setsOf: (e: Exercise) => number): Step[] {
  const steps: Step[] = [];
  for (const block of blocks) {
    if (block.type === 'warmup' || block.type === 'cooldown') continue;
    const rounds = Math.max(...block.exercises.map(setsOf));
    for (let setIndex = 0; setIndex < rounds; setIndex++) {
      block.exercises.forEach((exercise, exIndex) => {
        const total = setsOf(exercise);
        if (setIndex >= total) return;
        steps.push({
          block,
          exIndex,
          exercise,
          setIndex,
          totalSets: total,
          isDropSet: false,
          isLastSetOfBlock: false,
        });
      });
    }
  }
  return steps;
}

const measureLabel = (e: Exercise) =>
  e.measure === 'seconds'
    ? 'secondi'
    : e.measure === 'secondsPerSide'
      ? 'secondi per lato'
      : e.measure === 'repsPerSide'
        ? 'ripetizioni per lato'
        : 'ripetizioni';

const rangeLabel = (e: Exercise) =>
  `${e.min}${e.max !== e.min ? `–${e.max}` : ''}${e.measure.startsWith('seconds') ? '″' : ''}`;

export default function Workout() {
  const { program, settings, completed, inProgress, putWorkout, deleteWorkout } = useStore();
  const navigate = useNavigate();

  const sessionId = inProgress?.sessionId ?? program.nextSessionId;
  const session = SESSIONS[sessionId];
  const phase = program.phase;
  const setsOf = useCallback((e: Exercise) => setsForPhase(e.sets, phase), [phase]);

  const [log, setLog] = useState<WorkoutLog | null>(null);
  const [cursor, setCursor] = useState(0);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [phaseView, setPhaseView] = useState<'warmup' | 'work' | 'cooldown' | 'summary'>('warmup');
  const [expanded, setExpanded] = useState(false);
  const [substituting, setSubstituting] = useState(false);
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(0);
  const [rir, setRir] = useState<number | undefined>(undefined);
  const [kneePain, setKneePain] = useState(0);
  const [notes, setNotes] = useState('');
  const wakeRef = useRef<WakeLockSentinel | null>(null);

  const steps = useMemo(() => {
    const base = buildSteps(session.blocks, setsOf);
    return base.map((s, i) => ({
      ...s,
      isDropSet: isDropSetIndex(phase, s.exercise, s.setIndex, s.totalSets),
      isLastSetOfBlock: base[i + 1]?.block.id !== s.block.id,
    }));
  }, [session, setsOf, phase]);

  const { timer, start, stop, adjust } = useRestTimer(() => {
    vibrate(settings.vibration);
    beep(settings.sound);
  });

  /* ------------------------------------------------------------ avvio / ripresa */
  useEffect(() => {
    if (log) return;
    if (inProgress) {
      setLog(inProgress);
      setCursor(inProgress.cursor ?? 0);
      setChecklist(inProgress.checklist ?? []);
      setPhaseView((inProgress.cursor ?? 0) > 0 ? 'work' : 'warmup');
      setNotes(inProgress.notes ?? '');
      return;
    }
    const fresh: WorkoutLog = {
      id: newId(),
      startedAt: new Date().toISOString(),
      sessionId,
      cycle: program.cycle,
      week: program.week,
      phaseId: phase.id,
      sets: [],
      checklist: [],
      cursor: 0,
      status: 'inProgress',
    };
    setLog(fresh);
    void putWorkout(fresh);
  }, [inProgress, log, phase.id, program.cycle, program.week, putWorkout, sessionId]);

  /* ------------------------------------------------------------------ wake lock */
  useEffect(() => {
    let cancelled = false;
    const request = async () => {
      try {
        const wl = await navigator.wakeLock?.request('screen');
        if (cancelled) void wl?.release();
        else wakeRef.current = wl ?? null;
      } catch {
        /* wake lock non disponibile */
      }
    };
    void request();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void wakeRef.current?.release();
      wakeRef.current = null;
    };
  }, []);

  const step: Step | undefined = steps[cursor];

  /* Sostituzioni già registrate in questa sessione. */
  const substitutionOf = useCallback(
    (exerciseId: string) => log?.sets.find((s) => s.exerciseId === exerciseId)?.substitutedWithId,
    [log],
  );

  const shownExercise = useMemo(() => {
    if (!step) return undefined;
    const sub = substitutionOf(step.exercise.id);
    return sub ? getExercise(sub) : step.exercise;
  }, [step, substitutionOf]);

  const suggestion = useMemo(() => {
    if (!shownExercise) return undefined;
    return suggestForExercise(shownExercise, completed, phase, settings);
  }, [shownExercise, completed, phase, settings]);

  const lastTime = useMemo(() => {
    if (!shownExercise) return [];
    const previous = completed.find((l) => workingSets(l, shownExercise.id).length > 0);
    return previous ? workingSets(previous, shownExercise.id) : [];
  }, [completed, shownExercise]);

  /* Precompila i campi con i valori suggeriti a ogni cambio di serie. */
  useEffect(() => {
    if (!step || !shownExercise || !suggestion) return;
    const alreadyLogged = log?.sets.find(
      (s) => s.exerciseId === step.exercise.id && s.setIndex === step.setIndex,
    );
    if (alreadyLogged) {
      setWeight(alreadyLogged.weightKg ?? 0);
      setReps(alreadyLogged.value);
      setRir(alreadyLogged.rir);
    } else {
      const sameExerciseThisSession = log?.sets.filter((s) => s.exerciseId === step.exercise.id) ?? [];
      const lastThisSession = sameExerciseThisSession[sameExerciseThisSession.length - 1];
      setWeight(lastThisSession?.weightKg ?? suggestion.weightKg ?? 0);
      setReps(step.isDropSet ? shownExercise.min : suggestion.targetReps);
      setRir(undefined);
    }
    setExpanded(false);
    setSubstituting(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, shownExercise?.id]);

  const persist = useCallback(
    (patch: Partial<WorkoutLog>) => {
      setLog((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        void putWorkout(next);
        return next;
      });
    },
    [putWorkout],
  );

  const toggleCheck = (id: string) => {
    const next = checklist.includes(id) ? checklist.filter((x) => x !== id) : [...checklist, id];
    setChecklist(next);
    persist({ checklist: next });
  };

  const substitute = (altId: string) => {
    if (!log || !step) return;
    const sets = log.sets.map((s) =>
      s.exerciseId === step.exercise.id ? { ...s, substitutedWithId: altId } : s,
    );
    // Marcatore: memorizza la sostituzione anche se non ci sono ancora serie registrate.
    const marker: SetLog = {
      exerciseId: step.exercise.id,
      substitutedWithId: altId,
      setIndex: -1,
      value: 0,
      done: false,
    };
    const hasMarker = sets.some((s) => s.exerciseId === step.exercise.id);
    persist({ sets: hasMarker ? sets : [...sets, marker] });
    setSubstituting(false);
  };

  const completeSet = () => {
    if (!log || !step) return;
    const entry: SetLog = {
      exerciseId: step.exercise.id,
      ...(substitutionOf(step.exercise.id)
        ? { substitutedWithId: substitutionOf(step.exercise.id) }
        : {}),
      setIndex: step.setIndex,
      ...(shownExercise?.bodyweight ? {} : { weightKg: weight }),
      value: reps,
      ...(rir !== undefined ? { rir } : {}),
      done: true,
      ...(step.isDropSet ? { isDropSet: true } : {}),
    };
    const sets = log.sets
      .filter((s) => !(s.exerciseId === step.exercise.id && s.setIndex === step.setIndex))
      .concat(entry);

    const next = timerAfterSet({
      blockType: step.block.type,
      exerciseIndexInBlock: step.exIndex,
      exercisesInBlock: step.block.exercises.length,
      isLastSetOfBlock: step.isLastSetOfBlock,
      restBetweenSetsSec: step.block.restBetweenSetsSec,
      restAfterRoundSec: step.block.restAfterRoundSec,
      transitionSec: step.block.transitionSec,
    });
    if (next.kind !== 'none') {
      start(Math.round(next.seconds * settings.restScale), next.label, next.kind);
    }

    const nextCursor = Math.min(cursor + 1, steps.length);
    setCursor(nextCursor);
    persist({ sets, cursor: nextCursor });
    vibrate(settings.vibration, [40]);
    if (nextCursor >= steps.length) setPhaseView('cooldown');
  };

  const finish = async () => {
    if (!log) return;
    stop();
    const done: WorkoutLog = {
      ...log,
      finishedAt: new Date().toISOString(),
      status: 'completed',
      kneePain,
      notes,
      checklist,
      cursor: steps.length,
    };
    await putWorkout(done);
    navigate('/storico');
  };

  const abandon = async () => {
    if (!log) return;
    if (!window.confirm('Vuoi uscire e cancellare questa sessione? I dati non verranno salvati.'))
      return;
    stop();
    await deleteWorkout(log.id);
    navigate('/');
  };

  if (!log) return null;

  const doneSets = log.sets.filter((s) => s.done).length;
  const totalSets = steps.length;

  /* ---------------------------------------------------------------- intestazione */
  const Header = (
    <header className="sticky top-0 z-30 -mx-4 mb-3 border-b border-white/40 bg-brand-500/85 px-4 pb-3 pt-safe backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <button className="btn-chip" onClick={() => navigate('/')} aria-label="Torna alla home">
          ← Esci
        </button>
        <p className="text-sm font-black">
          Sessione {session.id} · Sett. {program.week} · {phase.name}
        </p>
        <span className="text-sm font-bold tabular-nums text-ink/60">
          {doneSets}/{totalSets}
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar value={doneSets} max={totalSets} label="Avanzamento sessione" />
      </div>
    </header>
  );

  /* ------------------------------------------------------------------ checklist */
  const renderChecklist = (kind: 'warmup' | 'cooldown') => {
    const block = session.blocks.find((b) => b.type === kind)!;
    const style = BLOCK_STYLE[kind];
    const allDone = block.exercises.every((e) => checklist.includes(e.id));
    return (
      <div className="space-y-3 pb-8">
        {Header}
        <Card>
          <span className={`pill ${style.chip}`}>{style.label}</span>
          <h1 className="mt-2 text-2xl font-black">
            {kind === 'warmup' ? 'Prepara il corpo' : 'Chiudi la sessione'}
          </h1>
          <p className="mt-1 text-sm text-ink/70">
            {kind === 'warmup'
              ? 'Circa 10 minuti. Spunta ogni voce quando l’hai fatta: apre spalle e dorso e ti evita infortuni.'
              : 'Circa 6 minuti di stretching e respirazione. Poi registri la sessione.'}
          </p>
          <div className="mt-4">
            <ProgressBar
              value={block.exercises.filter((e) => checklist.includes(e.id)).length}
              max={block.exercises.length}
              label="Completate"
              fillClass={style.bar}
            />
          </div>
        </Card>

        <ul className="space-y-2">
          {block.exercises.map((e) => {
            const on = checklist.includes(e.id);
            return (
              <li key={e.id}>
                <button
                  className={`glass w-full p-4 text-left transition ${on ? 'solid !bg-ink !text-white' : ''}`}
                  onClick={() => toggleCheck(e.id)}
                  aria-pressed={on}
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black ${
                        on ? 'border-brand-400 bg-brand-400 text-ink' : 'border-ink/30'
                      }`}
                    >
                      {on ? '✓' : ''}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold leading-snug">{e.name}</p>
                      <p className={`text-sm font-semibold ${on ? 'text-brand-400' : 'text-ink/60'}`}>
                        {e.dosage}
                      </p>
                      <p className={`mt-1 text-sm ${on ? 'text-white/70' : 'text-ink/65'}`}>
                        {e.summary}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <button
          className="btn-primary w-full"
          onClick={() => (kind === 'warmup' ? setPhaseView('work') : setPhaseView('summary'))}
        >
          {kind === 'warmup'
            ? allDone
              ? 'Vai al primo esercizio'
              : 'Salta al primo esercizio'
            : 'Registra la sessione'}
        </button>
      </div>
    );
  };

  if (phaseView === 'warmup') return renderChecklist('warmup');
  if (phaseView === 'cooldown') return renderChecklist('cooldown');

  /* -------------------------------------------------------------------- riepilogo */
  if (phaseView === 'summary') {
    const minutes = Math.round((Date.now() - new Date(log.startedAt).getTime()) / 60000);
    return (
      <div className="space-y-3 pb-10">
        {Header}
        <Card>
          <h1 className="text-2xl font-black">Sessione {session.id} completata</h1>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              ['Durata', `${minutes}′`],
              ['Serie', String(doneSets)],
              ['Volume', `${Math.round(sessionVolume(log)).toLocaleString('it-IT')} kg`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-ink/10 bg-white/55 p-3">
                <dt className="text-[10px] font-black uppercase tracking-wider text-ink-mute">{k}</dt>
                <dd className="text-xl font-black tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <label className="label" htmlFor="knee">
            Fastidio alle ginocchia (0–10)
          </label>
          <input
            id="knee"
            type="range"
            min={0}
            max={10}
            value={kneePain}
            onChange={(e) => setKneePain(Number(e.target.value))}
            className="w-full accent-black"
            aria-valuetext={`${kneePain} su 10`}
          />
          <p className="text-center text-3xl font-black tabular-nums">{kneePain}</p>
          {kneePain >= 4 && (
            <p className="mt-2 rounded-2xl bg-red-900/10 p-3 text-sm font-semibold text-red-900">
              Fastidio significativo: nella prossima sessione usa le alternative indicate nelle schede
              degli esercizi. Se il dolore persiste, consulta un medico o un fisioterapista.
            </p>
          )}
          <label className="label mt-4" htmlFor="notes">
            Note
          </label>
          <textarea
            id="notes"
            className="field py-3"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Sensazioni, carichi, cosa cambiare la prossima volta…"
          />
        </Card>

        <button className="btn-primary w-full text-lg" onClick={finish}>
          Salva la sessione
        </button>
        <button className="btn-ghost w-full" onClick={() => setPhaseView('work')}>
          Torna agli esercizi
        </button>
      </div>
    );
  }

  /* ------------------------------------------------------------------- esercizio */
  if (!step || !shownExercise || !suggestion) {
    return (
      <div className="space-y-3 pb-10">
        {Header}
        <Card>
          <p className="font-bold">Hai completato tutte le serie.</p>
          <button className="btn-primary mt-4 w-full" onClick={() => setPhaseView('cooldown')}>
            Vai al defaticamento
          </button>
        </Card>
      </div>
    );
  }

  const style = BLOCK_STYLE[step.block.type];
  const partner =
    step.block.exercises.length > 1
      ? step.block.exercises[(step.exIndex + 1) % step.block.exercises.length]
      : undefined;
  const isSub = shownExercise.id !== step.exercise.id;
  const timed = shownExercise.measure.startsWith('seconds');

  return (
    <div className="space-y-3 pb-10">
      {Header}

      {/* ------------------------------------------------------------ timer attivo */}
      {timer && (
        <Card
          className={`solid !border-white/15 ${timer.kind === 'transition' ? '!bg-orange-950 !text-white' : '!bg-ink !text-white'}`}
        >
          <p className="text-sm font-black uppercase tracking-wider text-brand-400">
            {timer.label}
            {timer.kind === 'transition' && (
              <span className="ml-2 font-semibold normal-case tracking-normal text-white/70">
                prepara la stazione successiva
              </span>
            )}
          </p>
          <p className="mt-1 text-center text-7xl font-black tabular-nums leading-none">
            {formatClock(timer.remaining)}
          </p>
          <div className="mt-3">
            <ProgressBar
              value={timer.totalSec - timer.remaining}
              max={timer.totalSec}
              fillClass="bg-brand-500"
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button className="btn bg-white/12 text-white" onClick={() => adjust(-15)}>
              −15″
            </button>
            <button className="btn bg-brand-500 text-ink" onClick={stop}>
              Salta
            </button>
            <button className="btn bg-white/12 text-white" onClick={() => adjust(15)}>
              +15″
            </button>
          </div>
          <p className="mt-2 text-center text-xs font-semibold text-white/55">
            Il timer continua anche se passi a un’altra app.
          </p>
        </Card>
      )}

      {/* --------------------------------------------------------------- esercizio */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`pill ${style.chip}`}>{step.block.label}</span>
          <Pill>{shownExercise.kind}</Pill>
          {step.isDropSet && <Pill tone="warn">Drop set</Pill>}
          {isSub && <Pill tone="good">Sostituito</Pill>}
        </div>

        <h1 className="mt-2 text-[26px] font-black leading-tight">
          {step.exercise.code && <span className="text-ink/40">{step.exercise.code} · </span>}
          {shownExercise.name}
        </h1>
        <p className="mt-1 text-sm font-medium text-ink/60">{shownExercise.muscles.join(' · ')}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/85">{shownExercise.summary}</p>

        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[
            ['Serie', `${step.setIndex + 1}/${step.totalSets}`],
            [timed ? 'Durata' : 'Rip.', rangeLabel(shownExercise)],
            ['RIR', rirForPhase(phase, shownExercise.kind)],
            ['Tempo', tempoForPhase(phase, shownExercise.kind)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-ink/10 bg-white/55 py-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-ink-mute">{k}</p>
              <p className="text-lg font-black tabular-nums leading-tight">{v}</p>
            </div>
          ))}
        </div>

        {step.isDropSet && (
          <p className="mt-3 rounded-2xl bg-red-900/10 p-3 text-sm font-semibold text-red-900">
            DROP SET: chiudi la serie, riduci il carico del 20–25% e prosegui fino al cedimento
            tecnico. Non conta per la progressione.
          </p>
        )}

        {shownExercise.kneeNote && (
          <p className="mt-3 rounded-2xl border border-orange-900/20 bg-orange-100/60 p-3 text-sm font-semibold text-orange-950">
            🦵 {shownExercise.kneeNote}
          </p>
        )}

        <button
          className="btn-ghost mt-3 w-full"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? 'Nascondi la tecnica' : 'Come si esegue'}
        </button>

        {expanded && (
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <p className="section-title">Esecuzione</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-ink/85">
                {shownExercise.cues.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="section-title">Errori da evitare</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-ink/85">
                {shownExercise.mistakes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
            {shownExercise.safetyNote && (
              <p className="rounded-2xl bg-ink/6 p-3 font-semibold">⚠︎ {shownExercise.safetyNote}</p>
            )}
            <a
              className="btn-ghost w-full"
              target="_blank"
              rel="noreferrer"
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(shownExercise.name)}`}
            >
              ▶︎ Guarda un video
            </a>
          </div>
        )}
      </Card>

      {/* -------------------------------------------------------- carico e ripetizioni */}
      <Card>
        <p className="rounded-2xl bg-brand-200/60 p-3 text-sm font-semibold text-ink">
          💡 {suggestion.message}
        </p>

        {lastTime.length > 0 && (
          <p className="mt-3 text-sm text-ink/70">
            <span className="font-bold">Ultima volta:</span>{' '}
            {lastTime
              .map((s) => `${s.weightKg ? `${s.weightKg}kg × ` : ''}${s.value}${timed ? '″' : ''}`)
              .join(' · ')}
          </p>
        )}

        {!shownExercise.bodyweight && (
          <div className="mt-4">
            <p className="label">
              Carico {shownExercise.id === 'trazioni-assistite' ? '(assistenza)' : ''} — kg
            </p>
            <Stepper
              value={weight}
              onChange={setWeight}
              step={shownExercise.equipment === 'dumbbell' ? 1 : 2.5}
              min={0}
              max={300}
              suffix="kg"
              ariaLabel="carico in chilogrammi"
            />
          </div>
        )}

        <div className="mt-4">
          <p className="label">{measureLabel(shownExercise)}</p>
          <Stepper
            value={reps}
            onChange={setReps}
            step={timed ? 5 : 1}
            min={0}
            max={timed ? 300 : 60}
            suffix={timed ? '″' : ''}
            ariaLabel={measureLabel(shownExercise)}
            decimals={0}
          />
        </div>

        <div className="mt-4">
          <p className="label">RIR — ripetizioni ancora in riserva (facoltativo)</p>
          <div className="grid grid-cols-5 gap-2">
            {[0, 1, 2, 3, 4].map((n) => (
              <button
                key={n}
                className={`btn-chip !px-0 ${rir === n ? '!bg-ink !text-brand-400' : ''}`}
                aria-pressed={rir === n}
                onClick={() => setRir(rir === n ? undefined : n)}
              >
                {n === 4 ? '4+' : n}
              </button>
            ))}
          </div>
        </div>

        <button className="btn-primary mt-5 w-full text-lg" onClick={completeSet}>
          ✓ Completato
        </button>
        <p className="mt-2 text-center text-xs font-semibold text-ink/55">
          Al click parte il timer di recupero.
        </p>
      </Card>

      {/* ------------------------------------------------------------- navigazione */}
      <div className="grid grid-cols-2 gap-2">
        <button
          className="btn-ghost"
          onClick={() => setCursor((c) => Math.max(0, c - 1))}
          disabled={cursor === 0}
        >
          ← Indietro
        </button>
        <button
          className="btn-ghost"
          onClick={() => setCursor((c) => Math.min(steps.length, c + 1))}
        >
          Salta →
        </button>
      </div>

      {partner && (
        <p className="text-center text-xs font-semibold text-ink/60">
          In superserie con: {partner.code} · {partner.name}
        </p>
      )}

      <button className="btn-ghost w-full" onClick={() => setSubstituting((v) => !v)}>
        ⇄ Sostituisci esercizio
      </button>

      {substituting && (
        <Card>
          <p className="section-title">Alternative</p>
          <ul className="mt-2 space-y-2">
            {[...step.exercise.alternatives, ...(isSub ? [step.exercise.id] : [])].map((id) => {
              const alt = getExercise(id);
              return (
                <li key={id}>
                  <button className="btn-ghost w-full justify-start text-left" onClick={() => substitute(id)}>
                    {id === step.exercise.id ? '↩︎ Torna a: ' : ''}
                    {alt.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <button className="btn-ghost w-full" onClick={() => setPhaseView('cooldown')}>
        Vai al defaticamento
      </button>
      <button className="btn-ghost w-full !text-red-900" onClick={abandon}>
        Annulla la sessione
      </button>
    </div>
  );
}
