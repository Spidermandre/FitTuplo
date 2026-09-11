import { describe, expect, it } from 'vitest';
import {
  computeProgramState,
  epley1RM,
  isDropSetIndex,
  movingAverage,
  muscleGroupOf,
  phaseForWeek,
  setsForPhase,
  suggestForExercise,
  timerAfterSet,
  weekFromSessionNumber,
} from './logic';
import { getExercise } from '../data/exercises';
import { SESSION_A, phasesFirstCycle, phasesNextCycles } from '../data/program';
import type { SetLog, Settings, WorkoutLog } from '../data/types';

const settings: Settings = {
  id: 'settings',
  startDate: '2026-01-05',
  cycle: 1,
  sessionsBeforeCycle: 0,
  incrementBarbellKg: 2.5,
  incrementDumbbellKg: 2,
  incrementCableKg: 5,
  restScale: 1,
  sound: true,
  vibration: true,
};

const log = (id: string, startedAt: string, sets: SetLog[]): WorkoutLog => ({
  id,
  startedAt,
  finishedAt: startedAt,
  sessionId: 'A',
  cycle: 1,
  week: 4,
  phaseId: 'costruzione',
  sets,
  status: 'completed',
});

const setsOf = (exerciseId: string, weightKg: number, reps: number[], isDropSet = false): SetLog[] =>
  reps.map((value, setIndex) => ({
    exerciseId,
    setIndex,
    weightKg,
    value,
    done: true,
    isDropSet: isDropSet && setIndex === reps.length - 1,
  }));

describe('calcolo di settimana e fase', () => {
  it('la sessione n appartiene alla settimana ceil(n / 2)', () => {
    expect(weekFromSessionNumber(1)).toBe(1);
    expect(weekFromSessionNumber(2)).toBe(1);
    expect(weekFromSessionNumber(3)).toBe(2);
    expect(weekFromSessionNumber(24)).toBe(12);
  });

  it('assegna le fasi del primo ciclo secondo la tabella', () => {
    expect(phaseForWeek(1, 1).id).toBe('riadattamento');
    expect(phaseForWeek(3, 1).id).toBe('riadattamento');
    expect(phaseForWeek(4, 1).id).toBe('costruzione');
    expect(phaseForWeek(8, 1).id).toBe('costruzione');
    expect(phaseForWeek(9, 1).id).toBe('intensificazione');
    expect(phaseForWeek(11, 1).id).toBe('intensificazione');
    expect(phaseForWeek(12, 1).id).toBe('scarico');
  });

  it('dal secondo ciclo la fase 1 dura solo la settimana 1', () => {
    expect(phaseForWeek(1, 2).id).toBe('riadattamento');
    expect(phaseForWeek(2, 2).id).toBe('costruzione');
    expect(phaseForWeek(8, 2).id).toBe('costruzione');
    expect(phaseForWeek(9, 2).id).toBe('intensificazione');
    expect(phasesNextCycles[0].weeks).toEqual([1, 1]);
  });

  it('alterna A e B in base alle sessioni completate', () => {
    expect(computeProgramState(0, settings).nextSessionId).toBe('A');
    expect(computeProgramState(1, settings).nextSessionId).toBe('B');
    expect(computeProgramState(2, settings).nextSessionId).toBe('A');
    expect(computeProgramState(4, settings).week).toBe(3);
  });
});

describe('numero di serie per fase', () => {
  const [riadattamento, costruzione, intensificazione, scarico] = phasesFirstCycle;

  it('fase 1: standard −1 con minimo 2', () => {
    expect(setsForPhase(4, riadattamento)).toBe(3);
    expect(setsForPhase(3, riadattamento)).toBe(2);
    expect(setsForPhase(2, riadattamento)).toBe(2);
  });

  it('fase 2 e 3: serie standard', () => {
    expect(setsForPhase(4, costruzione)).toBe(4);
    expect(setsForPhase(3, intensificazione)).toBe(3);
  });

  it('scarico: metà delle serie arrotondata per eccesso', () => {
    expect(setsForPhase(4, scarico)).toBe(2);
    expect(setsForPhase(3, scarico)).toBe(2);
  });

  it('il drop set compare solo in fase 3 sull’ultima serie degli ISO', () => {
    const iso = getExercise('alzate-laterali-manubri');
    const multi = getExercise('panca-piana-bilanciere');
    expect(isDropSetIndex(intensificazione, iso, 2, 3)).toBe(true);
    expect(isDropSetIndex(intensificazione, iso, 1, 3)).toBe(false);
    expect(isDropSetIndex(intensificazione, multi, 3, 4)).toBe(false);
    expect(isDropSetIndex(costruzione, iso, 2, 3)).toBe(false);
  });
});

describe('regole di progressione', () => {
  const panca = getExercise('panca-piana-bilanciere');
  const costruzione = phasesFirstCycle[1];
  const scarico = phasesFirstCycle[3];

  it('prima sessione: chiede un carico di prova', () => {
    const s = suggestForExercise(panca, [], costruzione, settings);
    expect(s.action).toBe('firstTime');
    expect(s.weightKg).toBe(panca.startingWeightKg);
  });

  it('tutte le serie al massimo: aumenta il carico e riparte dal minimo', () => {
    const logs = [log('1', '2026-01-10', setsOf(panca.id, 40, [8, 8, 8, 8]))];
    const s = suggestForExercise(panca, logs, costruzione, settings);
    expect(s.action).toBe('increase');
    expect(s.weightKg).toBe(42.5);
    expect(s.targetReps).toBe(panca.min);
  });

  it('il drop set non conta per la doppia progressione', () => {
    const iso = getExercise('alzate-laterali-manubri');
    const logs = [log('1', '2026-01-10', setsOf(iso.id, 8, [15, 15, 15, 20], true))];
    const s = suggestForExercise(iso, logs, phasesFirstCycle[2], settings);
    expect(s.action).toBe('increase');
    expect(s.weightKg).toBe(10);
  });

  it('due sessioni sotto il minimo: riduce il carico', () => {
    const logs = [
      log('2', '2026-01-17', setsOf(panca.id, 60, [5, 4, 5, 6])),
      log('1', '2026-01-10', setsOf(panca.id, 60, [5, 5, 4, 6])),
    ];
    const s = suggestForExercise(panca, logs, costruzione, settings);
    expect(s.action).toBe('decrease');
    expect(s.weightKg).toBe(55.5);
  });

  it('negli altri casi mantiene il carico e aggiunge una ripetizione', () => {
    const logs = [log('1', '2026-01-10', setsOf(panca.id, 45, [7, 7, 6, 7]))];
    const s = suggestForExercise(panca, logs, costruzione, settings);
    expect(s.action).toBe('hold');
    expect(s.weightKg).toBe(45);
    expect(s.targetReps).toBe(8);
  });

  it('le trazioni assistite progrediscono riducendo l’assistenza', () => {
    const trazioni = getExercise('trazioni-assistite');
    const logs = [log('1', '2026-01-10', setsOf(trazioni.id, 30, [10, 10, 10, 10]))];
    const s = suggestForExercise(trazioni, logs, costruzione, settings);
    expect(s.action).toBe('increase');
    expect(s.weightKg).toBe(25);
  });

  it('esercizi a tempo: +5" quando tutte le serie sono al massimo', () => {
    const plank = getExercise('plank-avambracci');
    const logs = [log('1', '2026-01-10', setsOf(plank.id, 0, [45, 45, 45]))];
    const s = suggestForExercise(plank, logs, costruzione, settings);
    expect(s.action).toBe('increase');
    expect(s.targetReps).toBe(50);
  });

  it('settimana di scarico: nessun aumento', () => {
    const logs = [log('1', '2026-01-10', setsOf(panca.id, 40, [8, 8, 8, 8]))];
    const s = suggestForExercise(panca, logs, scarico, settings);
    expect(s.action).toBe('deload');
    expect(s.weightKg).toBe(40);
  });
});

describe('sequenza del timer', () => {
  const superset = SESSION_A.blocks.find((b) => b.id === 'a-ss1')!;

  it('tra il primo e il secondo esercizio della superserie non parte alcun timer', () => {
    const step = timerAfterSet({
      blockType: 'superset',
      exerciseIndexInBlock: 0,
      exercisesInBlock: 2,
      isLastSetOfBlock: false,
      restAfterRoundSec: superset.restAfterRoundSec,
    });
    expect(step.kind).toBe('none');
    expect(step.seconds).toBe(0);
  });

  it('dopo il secondo esercizio parte il recupero completo', () => {
    const step = timerAfterSet({
      blockType: 'superset',
      exerciseIndexInBlock: 1,
      exercisesInBlock: 2,
      isLastSetOfBlock: false,
      restAfterRoundSec: superset.restAfterRoundSec,
    });
    expect(step.kind).toBe('rest');
    expect(step.seconds).toBe(90);
  });

  it('nel blocco principale il recupero è di 2 minuti tra le serie', () => {
    const step = timerAfterSet({
      blockType: 'main',
      exerciseIndexInBlock: 0,
      exercisesInBlock: 1,
      isLastSetOfBlock: false,
      restBetweenSetsSec: 120,
    });
    expect(step).toMatchObject({ kind: 'rest', seconds: 120 });
  });

  it('dopo l’ultima serie del blocco non parte alcun timer', () => {
    const step = timerAfterSet({
      blockType: 'superset',
      exerciseIndexInBlock: 1,
      exercisesInBlock: 2,
      isLastSetOfBlock: true,
      restAfterRoundSec: 90,
    });
    expect(step.kind).toBe('none');
  });
});

describe('statistiche', () => {
  it('1RM stimato con la formula di Epley', () => {
    expect(epley1RM(100, 1)).toBe(100);
    expect(epley1RM(60, 10)).toBeCloseTo(80, 5);
    expect(epley1RM(50, 0)).toBe(0);
  });

  it('classifica gli esercizi per gruppo muscolare', () => {
    expect(muscleGroupOf(getExercise('panca-piana-bilanciere'))).toBe('Petto');
    expect(muscleGroupOf(getExercise('lat-machine-prona-larga'))).toBe('Dorso');
    expect(muscleGroupOf(getExercise('alzate-laterali-manubri'))).toBe('Spalle');
    expect(muscleGroupOf(getExercise('curl-bilanciere-ez'))).toBe('Bicipiti');
    expect(muscleGroupOf(getExercise('push-down-corda'))).toBe('Tricipiti');
    expect(muscleGroupOf(getExercise('plank-laterale'))).toBe('Core');
  });

  it('media mobile sulle ultime 3 misurazioni', () => {
    expect(movingAverage([70, 71, 72, 73])).toEqual([70, 70.5, 71, 72]);
  });
});
