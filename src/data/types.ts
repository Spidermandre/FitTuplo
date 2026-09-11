export type BlockType = 'warmup' | 'main' | 'superset' | 'core' | 'cooldown';
export type ExerciseKind = 'MULTI' | 'ISO' | 'CORE' | 'MOBILITY';
export type Measure = 'reps' | 'repsPerSide' | 'seconds' | 'secondsPerSide';
export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bodyweight'
  | 'band'
  | 'other';

export interface Exercise {
  id: string;
  /** Codice nel blocco, es. "B1". Vuoto per riscaldamento/defaticamento e alternative di libreria. */
  code: string;
  name: string;
  kind: ExerciseKind;
  muscles: string[];
  /** Serie standard (Fase 2). */
  sets: number;
  min: number;
  max: number;
  measure: Measure;
  equipment: Equipment;
  /** Spiegazione breve mostrata sempre in allenamento. */
  summary: string;
  cues: string[];
  mistakes: string[];
  kneeNote?: string;
  safetyNote?: string;
  /** id di altri esercizi della libreria */
  alternatives: string[];
  /** Carico di partenza suggerito la primissima volta (kg). undefined = a corpo libero / da scegliere. */
  startingWeightKg?: number;
  /** true quando il carico non ha senso (plank, mobilità). */
  bodyweight?: boolean;
  /** Dosaggio testuale per riscaldamento/defaticamento. */
  dosage?: string;
}

export interface Block {
  id: string;
  label: string;
  type: BlockType;
  restBetweenSetsSec?: number;
  restAfterRoundSec?: number;
  transitionSec?: number;
  exercises: Exercise[];
}

export interface WorkoutSession {
  id: 'A' | 'B';
  name: string;
  estimatedMinutes: number;
  blocks: Block[];
}

export type SetsRule = 'minusOne' | 'standard' | 'half';

export interface Phase {
  id: string;
  name: string;
  weeks: [number, number];
  setsRule: SetsRule;
  rirMulti: string;
  rirIso: string;
  tempo: { multi: string; iso: string };
  dropSetOnLastIsoSet: boolean;
  suggestsIncrease: boolean;
  description: string;
  loadNote?: string;
}

export interface SetLog {
  exerciseId: string;
  substitutedWithId?: string;
  setIndex: number;
  weightKg?: number;
  /** ripetizioni o secondi */
  value: number;
  rir?: number;
  done: boolean;
  isDropSet?: boolean;
}

export interface WorkoutLog {
  id: string;
  startedAt: string;
  finishedAt?: string;
  sessionId: 'A' | 'B';
  cycle: number;
  week: number;
  phaseId: string;
  sets: SetLog[];
  /** id degli elementi di riscaldamento/defaticamento spuntati */
  checklist?: string[];
  /** indice di avanzamento per riprendere dal punto esatto */
  cursor?: number;
  kneePain?: number;
  notes?: string;
  status: 'inProgress' | 'completed';
}

export interface BodyMetric {
  id: string;
  date: string;
  weightKg?: number;
  waistCm?: number;
}

export interface Settings {
  id: 'settings';
  startDate: string;
  cycle: number;
  /** sessioni completate prima dell'inizio del ciclo corrente (per il calcolo della settimana) */
  sessionsBeforeCycle: number;
  incrementBarbellKg: number;
  incrementDumbbellKg: number;
  incrementCableKg: number;
  restScale: number;
  sound: boolean;
  vibration: boolean;
  onboarded: boolean;
}
