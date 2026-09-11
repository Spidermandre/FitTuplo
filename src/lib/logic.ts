import {
  SESSIONS_PER_WEEK,
  WEEKS_PER_CYCLE,
  phasesFirstCycle,
  phasesNextCycles,
} from '../data/program';
import type { Exercise, Phase, SetLog, Settings, WorkoutLog } from '../data/types';

/* -------------------------------------------------------------- settimana e fase */

/** La sessione n (da 1) appartiene alla settimana ceil(n / 2). */
export function weekFromSessionNumber(sessionNumber: number): number {
  if (sessionNumber < 1) return 1;
  return Math.ceil(sessionNumber / SESSIONS_PER_WEEK);
}

export function phasesForCycle(cycle: number): Phase[] {
  return cycle <= 1 ? phasesFirstCycle : phasesNextCycles;
}

export function phaseForWeek(week: number, cycle: number): Phase {
  const phases = phasesForCycle(cycle);
  const w = Math.min(Math.max(week, 1), WEEKS_PER_CYCLE);
  return phases.find((p) => w >= p.weeks[0] && w <= p.weeks[1]) ?? phases[phases.length - 1];
}

/** Numero di serie effettive per la fase corrente. */
export function setsForPhase(standardSets: number, phase: Phase): number {
  switch (phase.setsRule) {
    case 'minusOne':
      return Math.max(2, standardSets - 1);
    case 'half':
      return Math.ceil(standardSets / 2);
    default:
      return standardSets;
  }
}

export function rirForPhase(phase: Phase, kind: Exercise['kind']): string {
  return kind === 'MULTI' ? phase.rirMulti : phase.rirIso;
}

export function tempoForPhase(phase: Phase, kind: Exercise['kind']): string {
  return kind === 'MULTI' ? phase.tempo.multi : phase.tempo.iso;
}

/** L'ultima serie di un esercizio ISO in fase di intensificazione è un drop set. */
export function isDropSetIndex(phase: Phase, ex: Exercise, setIndex: number, totalSets: number) {
  return phase.dropSetOnLastIsoSet && ex.kind === 'ISO' && setIndex === totalSets - 1;
}

/* ------------------------------------------------------------------ stato ciclo */

export interface ProgramState {
  cycle: number;
  week: number;
  phase: Phase;
  /** numero della prossima sessione all'interno del ciclo (da 1) */
  sessionNumber: number;
  nextSessionId: 'A' | 'B';
}

/** Alternanza A → B → A → B indipendente dal giorno della settimana. */
export function computeProgramState(
  completedInCycle: number,
  settings: Pick<Settings, 'cycle'>,
): ProgramState {
  const cycle = Math.max(1, settings.cycle);
  const sessionNumber = completedInCycle + 1;
  const week = Math.min(weekFromSessionNumber(sessionNumber), WEEKS_PER_CYCLE);
  return {
    cycle,
    week,
    phase: phaseForWeek(week, cycle),
    sessionNumber,
    nextSessionId: completedInCycle % 2 === 0 ? 'A' : 'B',
  };
}

/** Il ciclo è finito quando sono state completate tutte le sessioni delle 12 settimane. */
export function isCycleComplete(completedInCycle: number): boolean {
  return completedInCycle >= WEEKS_PER_CYCLE * SESSIONS_PER_WEEK;
}

/* ------------------------------------------------------------------ progressione */

export type ProgressionAction = 'increase' | 'decrease' | 'hold' | 'firstTime' | 'deload';

export interface Suggestion {
  action: ProgressionAction;
  weightKg?: number;
  targetReps: number;
  message: string;
}

export function loadIncrement(ex: Exercise, settings: Settings): number {
  switch (ex.equipment) {
    case 'barbell':
      return settings.incrementBarbellKg;
    case 'dumbbell':
      return settings.incrementDumbbellKg;
    case 'cable':
    case 'machine':
      return settings.incrementCableKg;
    default:
      return settings.incrementCableKg;
  }
}

/** Serie di lavoro di un esercizio in un log (esclusi i drop set). */
export function workingSets(log: WorkoutLog, exerciseId: string): SetLog[] {
  return log.sets.filter((s) => s.exerciseId === exerciseId && s.done && !s.isDropSet);
}

/** Storico di un esercizio, dal più recente al più vecchio. */
export function historyFor(logs: WorkoutLog[], exerciseId: string): WorkoutLog[] {
  return logs
    .filter((l) => l.status === 'completed' && workingSets(l, exerciseId).length > 0)
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
}

function roundTo(value: number, step: number) {
  return Math.round(value / step) * step;
}

/**
 * Regole di progressione (sezione 4.7 della scheda).
 * Le trazioni assistite usano il carico di ASSISTENZA: un progresso riduce il valore.
 */
export function suggestForExercise(
  ex: Exercise,
  logs: WorkoutLog[],
  phase: Phase,
  settings: Settings,
): Suggestion {
  const history = historyFor(logs, ex.id);
  const assisted = ex.id === 'trazioni-assistite';
  const timed = ex.measure === 'seconds' || ex.measure === 'secondsPerSide';

  if (history.length === 0) {
    return {
      action: 'firstTime',
      weightKg: ex.bodyweight ? undefined : ex.startingWeightKg,
      targetReps: ex.max,
      message: ex.bodyweight
        ? 'Prima volta: parti dal minimo del range e valuta le sensazioni.'
        : 'Prima volta su questo esercizio: scegli un carico di prova che ti permetta di arrivare al massimo delle ripetizioni con 3–4 ripetizioni ancora in riserva.',
    };
  }

  const last = workingSets(history[0], ex.id);
  const lastWeight = last.find((s) => s.weightKg !== undefined)?.weightKg;
  const allAtMax = last.length > 0 && last.every((s) => s.value >= ex.max);

  if (!phase.suggestsIncrease) {
    return {
      action: 'deload',
      weightKg: lastWeight,
      targetReps: ex.min,
      message: 'Settimana di scarico: stessi carichi o −10%, nessun aumento.',
    };
  }

  if (allAtMax) {
    if (timed) {
      return {
        action: 'increase',
        weightKg: lastWeight,
        targetReps: ex.max + 5,
        message: `Tutte le serie al massimo: prova +5" per serie (${ex.max + 5}") oppure la variante più impegnativa.`,
      };
    }
    if (ex.bodyweight || lastWeight === undefined) {
      return {
        action: 'increase',
        targetReps: ex.min,
        message: 'Tutte le serie al massimo: passa alla variante più impegnativa e riparti dal minimo del range.',
      };
    }
    const step = loadIncrement(ex, settings);
    const next = assisted ? Math.max(0, lastWeight - step) : lastWeight + step;
    return {
      action: 'increase',
      weightKg: roundTo(next, 0.5),
      targetReps: ex.min,
      message: assisted
        ? `Tutte le serie al massimo: riduci l’assistenza di una tacca (−${step} kg) e riparti da ${ex.min} ripetizioni.`
        : `Tutte le serie al massimo: +${step} kg e si riparte da ${ex.min} ripetizioni.`,
    };
  }

  // Regola 2: due sessioni consecutive sotto il minimo in almeno metà delle serie.
  const failedTwice = [0, 1].every((i) => {
    const l = history[i];
    if (!l) return false;
    const sets = workingSets(l, ex.id);
    if (sets.length === 0) return false;
    const below = sets.filter((s) => s.value < ex.min).length;
    return below >= sets.length / 2;
  });

  if (failedTwice && lastWeight !== undefined && !ex.bodyweight) {
    const reduced = assisted ? lastWeight * 1.075 : lastWeight * 0.925;
    return {
      action: 'decrease',
      weightKg: roundTo(reduced, 0.5),
      targetReps: ex.min,
      message: assisted
        ? 'Due sessioni sotto il minimo del range: aumenta un po’ l’assistenza (circa +7,5%) e ricostruisci.'
        : 'Due sessioni sotto il minimo del range: riduci il carico del 5–10% e ricostruisci le ripetizioni.',
    };
  }

  const bestLast = Math.max(...last.map((s) => s.value));
  const target = Math.min(ex.max, bestLast + (timed ? 5 : 1));
  return {
    action: 'hold',
    weightKg: lastWeight,
    targetReps: target,
    message: timed
      ? `Mantieni il carico e aggiungi 5" rispetto all’ultima volta (obiettivo ${target}").`
      : `Mantieni il carico e aggiungi 1 ripetizione rispetto all’ultima volta (obiettivo ${target}).`,
  };
}

/* ------------------------------------------------------------------- timer logic */

export type TimerStep =
  | { kind: 'transition'; seconds: number; label: string }
  | { kind: 'rest'; seconds: number; label: string }
  | { kind: 'none'; seconds: 0; label: string };

/**
 * Sequenza del timer: nelle superserie si passa subito al secondo esercizio
 * (transizione di 15") e il recupero completo parte solo dopo il secondo.
 */
export function timerAfterSet(params: {
  blockType: 'warmup' | 'main' | 'superset' | 'core' | 'cooldown';
  exerciseIndexInBlock: number;
  exercisesInBlock: number;
  isLastSetOfBlock: boolean;
  restBetweenSetsSec?: number;
  restAfterRoundSec?: number;
  transitionSec?: number;
}): TimerStep {
  const {
    blockType,
    exerciseIndexInBlock,
    exercisesInBlock,
    isLastSetOfBlock,
    restBetweenSetsSec,
    restAfterRoundSec,
    transitionSec,
  } = params;

  if (isLastSetOfBlock) return { kind: 'none', seconds: 0, label: 'Blocco completato' };

  if (blockType === 'superset' || blockType === 'core') {
    const isLastOfPair = exerciseIndexInBlock === exercisesInBlock - 1;
    if (!isLastOfPair) {
      return {
        kind: 'transition',
        seconds: transitionSec ?? 15,
        label: 'Transizione',
      };
    }
    return { kind: 'rest', seconds: restAfterRoundSec ?? 60, label: 'Recupero' };
  }

  if (blockType === 'main') {
    return { kind: 'rest', seconds: restBetweenSetsSec ?? 120, label: 'Recupero' };
  }

  return { kind: 'none', seconds: 0, label: '' };
}

/* ------------------------------------------------------------------ statistiche */

/** 1RM stimato con la formula di Epley. */
export function epley1RM(weightKg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function sessionVolume(log: WorkoutLog): number {
  return log.sets
    .filter((s) => s.done)
    .reduce((tot, s) => tot + (s.weightKg ?? 0) * (s.value ?? 0), 0);
}

export const MUSCLE_GROUPS = ['Petto', 'Dorso', 'Spalle', 'Bicipiti', 'Tricipiti', 'Core'] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export function muscleGroupOf(ex: Exercise): MuscleGroup {
  if (ex.kind === 'CORE') return 'Core';
  // Il primo muscolo elencato è quello primario: è lui a decidere il gruppo.
  const classify = (m: string): MuscleGroup | undefined => {
    const t = m.toLowerCase();
    if (t.includes('core') || t.includes('obliqui') || t.includes('addomin')) return 'Core';
    if (t.includes('dorsal') || t.includes('romboidi') || t.includes('trapezio')) return 'Dorso';
    if (t.includes('bicipiti')) return 'Bicipiti';
    if (t.includes('tricipiti')) return 'Tricipiti';
    if (t.includes('deltoid') || t.includes('cuffia')) return 'Spalle';
    if (t.includes('petto')) return 'Petto';
    return undefined;
  };
  for (const m of ex.muscles) {
    const g = classify(m);
    if (g) return g;
  }
  return 'Core';
}

/** Media mobile sulle ultime n misurazioni. */
export function movingAverage(values: number[], window = 3): number[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}
