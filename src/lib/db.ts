import Dexie, { type Table } from 'dexie';
import type { BodyMetric, Settings, WorkoutLog } from '../data/types';

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  startDate: new Date().toISOString().slice(0, 10),
  cycle: 1,
  sessionsBeforeCycle: 0,
  incrementBarbellKg: 2.5,
  incrementDumbbellKg: 2,
  incrementCableKg: 5,
  restScale: 1,
  sound: true,
  vibration: true,
  onboarded: false,
};

class FitTuploDB extends Dexie {
  workouts!: Table<WorkoutLog, string>;
  metrics!: Table<BodyMetric, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('fittuplo');
    this.version(1).stores({
      workouts: 'id, startedAt, sessionId, status, cycle, week',
      metrics: 'id, date',
      settings: 'id',
    });
  }
}

export const db = new FitTuploDB();

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('settings');
  if (s) return { ...DEFAULT_SETTINGS, ...s };
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = { ...current, ...patch, id: 'settings' as const };
  await db.settings.put(next);
  return next;
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface BackupFile {
  app: 'fittuplo';
  version: 1;
  exportedAt: string;
  settings: Settings;
  workouts: WorkoutLog[];
  metrics: BodyMetric[];
}

export async function exportBackup(): Promise<BackupFile> {
  const [settings, workouts, metrics] = await Promise.all([
    getSettings(),
    db.workouts.toArray(),
    db.metrics.toArray(),
  ]);
  return { app: 'fittuplo', version: 1, exportedAt: new Date().toISOString(), settings, workouts, metrics };
}

export async function importBackup(raw: unknown): Promise<void> {
  const data = raw as Partial<BackupFile>;
  if (!data || data.app !== 'fittuplo' || !Array.isArray(data.workouts)) {
    throw new Error('File di backup non valido.');
  }
  await db.transaction('rw', db.workouts, db.metrics, db.settings, async () => {
    await Promise.all([db.workouts.clear(), db.metrics.clear(), db.settings.clear()]);
    await db.workouts.bulkPut(data.workouts ?? []);
    await db.metrics.bulkPut(data.metrics ?? []);
    await db.settings.put({ ...DEFAULT_SETTINGS, ...(data.settings ?? {}), id: 'settings' });
  });
}

export async function wipeAll(): Promise<void> {
  await db.transaction('rw', db.workouts, db.metrics, db.settings, async () => {
    await Promise.all([db.workouts.clear(), db.metrics.clear(), db.settings.clear()]);
  });
}
