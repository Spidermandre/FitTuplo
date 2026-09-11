import type { Phase, WorkoutSession } from './types';
import { getExercise } from './exercises';

export const SESSION_A: WorkoutSession = {
  id: 'A',
  name: 'Sessione A',
  estimatedMinutes: 65,
  blocks: [
    {
      id: 'a-main',
      label: 'Principale',
      type: 'main',
      restBetweenSetsSec: 120,
      exercises: [getExercise('panca-piana-bilanciere')],
    },
    {
      id: 'a-ss1',
      label: 'Superserie 1',
      type: 'superset',
      restAfterRoundSec: 90,
      exercises: [getExercise('lat-machine-prona-larga'), getExercise('spinte-manubri-inclinata')],
    },
    {
      id: 'a-ss2',
      label: 'Superserie 2',
      type: 'superset',
      restAfterRoundSec: 75,
      exercises: [getExercise('pulley-basso-neutra'), getExercise('alzate-laterali-manubri')],
    },
    {
      id: 'a-ss3',
      label: 'Superserie 3 (stessa stazione cavi)',
      type: 'superset',
      restAfterRoundSec: 75,
      exercises: [getExercise('face-pull'), getExercise('croci-cavi-alto-basso')],
    },
    {
      id: 'a-ss4',
      label: 'Superserie 4',
      type: 'superset',
      restAfterRoundSec: 60,
      exercises: [getExercise('curl-manubri-inclinata'), getExercise('ext-tricipiti-sopra-testa')],
    },
    {
      id: 'a-core',
      label: 'Core',
      type: 'core',
      restAfterRoundSec: 45,
      exercises: [getExercise('dead-bug'), getExercise('pallof-press')],
    },
  ],
};

export const SESSION_B: WorkoutSession = {
  id: 'B',
  name: 'Sessione B',
  estimatedMinutes: 65,
  blocks: [
    {
      id: 'b-main',
      label: 'Principale',
      type: 'main',
      restBetweenSetsSec: 120,
      exercises: [getExercise('trazioni-assistite')],
    },
    {
      id: 'b-ss1',
      label: 'Superserie 1',
      type: 'superset',
      restAfterRoundSec: 90,
      exercises: [getExercise('rematore-manubri-appoggio'), getExercise('shoulder-press-manubri')],
    },
    {
      id: 'b-ss2',
      label: 'Superserie 2',
      type: 'superset',
      restAfterRoundSec: 75,
      exercises: [getExercise('chest-press-macchina'), getExercise('pullover-cavo-alto')],
    },
    {
      id: 'b-ss3',
      label: 'Superserie 3',
      type: 'superset',
      restAfterRoundSec: 75,
      exercises: [getExercise('alzate-laterali-cavo'), getExercise('reverse-pec-deck')],
    },
    {
      id: 'b-ss4',
      label: 'Superserie 4',
      type: 'superset',
      restAfterRoundSec: 60,
      exercises: [getExercise('curl-bilanciere-ez'), getExercise('push-down-corda')],
    },
    {
      id: 'b-core',
      label: 'Core',
      type: 'core',
      restAfterRoundSec: 45,
      exercises: [getExercise('plank-avambracci'), getExercise('plank-laterale')],
    },
  ],
};

export const SESSIONS: Record<'A' | 'B', WorkoutSession> = { A: SESSION_A, B: SESSION_B };

/** Fasi del primo ciclo (12 settimane). */
export const phasesFirstCycle: Phase[] = [
  {
    id: 'riadattamento',
    name: 'Riadattamento',
    weeks: [1, 3],
    setsRule: 'minusOne',
    rirMulti: '3',
    rirIso: '3',
    tempo: { multi: '2-0-1', iso: '2-0-1' },
    dropSetOnLastIsoSet: false,
    suggestsIncrease: true,
    description:
      'Carichi moderati, priorità a tecnica e controllo. Una serie in meno per blocco: serve a riabituare tendini e articolazioni.',
  },
  {
    id: 'costruzione',
    name: 'Costruzione',
    weeks: [4, 8],
    setsRule: 'standard',
    rirMulti: '2',
    rirIso: '1–2',
    tempo: { multi: '2-0-1', iso: '2-0-1' },
    dropSetOnLastIsoSet: false,
    suggestsIncrease: true,
    description:
      'Serie complete e doppia progressione: prima si aumentano le ripetizioni nel range, poi il carico.',
  },
  {
    id: 'intensificazione',
    name: 'Intensificazione',
    weeks: [9, 11],
    setsRule: 'standard',
    rirMulti: '1–2',
    rirIso: '0–1',
    tempo: { multi: '3-0-1', iso: '2-0-1' },
    dropSetOnLastIsoSet: true,
    suggestsIncrease: true,
    description:
      'Si va vicino al cedimento. Drop set sull’ultima serie degli esercizi ISO: a fine serie riduci il carico del 20–25% e prosegui fino al cedimento tecnico.',
  },
  {
    id: 'scarico',
    name: 'Scarico',
    weeks: [12, 12],
    setsRule: 'half',
    rirMulti: '4',
    rirIso: '4',
    tempo: { multi: '2-0-1', iso: '2-0-1' },
    dropSetOnLastIsoSet: false,
    suggestsIncrease: false,
    description:
      'Settimana di recupero: metà delle serie, lontano dal cedimento. Serve a far arrivare i progressi.',
    loadNote: 'Stessi carichi o −10%. Nessun suggerimento di aumento.',
  },
];

/** Dal secondo ciclo in poi la Fase 1 dura solo la settimana 1 e la Fase 2 va dalla 2 alla 8. */
export const phasesNextCycles: Phase[] = [
  { ...phasesFirstCycle[0], weeks: [1, 1] },
  { ...phasesFirstCycle[1], weeks: [2, 8] },
  { ...phasesFirstCycle[2] },
  { ...phasesFirstCycle[3] },
];

export const WEEKS_PER_CYCLE = 12;
export const SESSIONS_PER_WEEK = 2;
