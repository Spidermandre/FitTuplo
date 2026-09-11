import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_SETTINGS, db, getSettings, saveSettings } from './db';
import type { BodyMetric, Settings, WorkoutLog } from '../data/types';
import { computeProgramState, type ProgramState } from './logic';

interface Store {
  ready: boolean;
  settings: Settings;
  workouts: WorkoutLog[];
  metrics: BodyMetric[];
  completed: WorkoutLog[];
  inProgress?: WorkoutLog;
  program: ProgramState;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  putWorkout: (log: WorkoutLog) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  putMetric: (m: BodyMetric) => Promise<void>;
  deleteMetric: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);

  const reload = useCallback(async () => {
    const [s, w, m] = await Promise.all([
      getSettings(),
      db.workouts.toArray(),
      db.metrics.toArray(),
    ]);
    setSettings(s);
    setWorkouts(w.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1)));
    setMetrics(m.sort((a, b) => (a.date < b.date ? 1 : -1)));
    setReady(true);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<Store>(() => {
    const completed = workouts.filter((w) => w.status === 'completed');
    const inProgress = workouts.find((w) => w.status === 'inProgress');
    const completedInCycle = completed.filter((w) => w.cycle === settings.cycle).length;
    return {
      ready,
      settings,
      workouts,
      metrics,
      completed,
      inProgress,
      program: computeProgramState(completedInCycle, settings),
      updateSettings: async (patch) => {
        setSettings(await saveSettings(patch));
      },
      putWorkout: async (log) => {
        await db.workouts.put(log);
        setWorkouts((prev) => {
          const next = prev.filter((w) => w.id !== log.id).concat(log);
          return next.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
        });
      },
      deleteWorkout: async (id) => {
        await db.workouts.delete(id);
        setWorkouts((prev) => prev.filter((w) => w.id !== id));
      },
      putMetric: async (m) => {
        await db.metrics.put(m);
        setMetrics((prev) =>
          prev
            .filter((x) => x.id !== m.id)
            .concat(m)
            .sort((a, b) => (a.date < b.date ? 1 : -1)),
        );
      },
      deleteMetric: async (id) => {
        await db.metrics.delete(id);
        setMetrics((prev) => prev.filter((m) => m.id !== id));
      },
      reload,
    };
  }, [ready, settings, workouts, metrics, reload]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore va usato dentro StoreProvider');
  return ctx;
}
