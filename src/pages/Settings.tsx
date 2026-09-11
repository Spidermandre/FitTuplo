import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { exportBackup, importBackup, wipeAll } from '../lib/db';
import { Card, SectionTitle, Stepper } from '../components/ui';

export default function SettingsPage() {
  const { settings, updateSettings, reload, completed } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const doExport = async () => {
    const data = await exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fittuplo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Backup esportato.');
  };

  const doImport = async (file: File) => {
    try {
      await importBackup(JSON.parse(await file.text()));
      await reload();
      setMsg('Backup importato: tutti i dati sono stati ripristinati.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Import non riuscito.');
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <header className="py-3">
        <h1 className="text-3xl font-black">Impostazioni</h1>
        <p className="text-sm font-medium text-ink/65">
          Tutti i dati restano sul telefono: nessun account, nessun server.
        </p>
      </header>

      <Link className="btn-ghost w-full" to="/consigli">
        💡 Consigli
      </Link>

      <SectionTitle>Ciclo</SectionTitle>
      <Card>
        <label className="label" htmlFor="sd">
          Data di inizio
        </label>
        <input
          id="sd"
          type="date"
          className="field"
          value={settings.startDate}
          onChange={(e) => void updateSettings({ startDate: e.target.value })}
        />
        <p className="mt-4 text-sm font-semibold">
          Ciclo corrente: {settings.cycle} · {completed.filter((w) => w.cycle === settings.cycle).length}{' '}
          sessioni completate
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            className="btn-ghost"
            onClick={() => {
              if (window.confirm(`Iniziare il ciclo ${settings.cycle + 1}? Lo storico resta.`))
                void updateSettings({ cycle: settings.cycle + 1 });
            }}
          >
            Nuovo ciclo
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              if (window.confirm('Tornare al ciclo 1? Lo storico resta, cambia solo il conteggio.'))
                void updateSettings({ cycle: 1 });
            }}
          >
            Reset ciclo
          </button>
        </div>
      </Card>

      <SectionTitle>Incrementi di carico</SectionTitle>
      <Card className="space-y-4">
        <div>
          <p className="label">Bilanciere (kg totali)</p>
          <Stepper
            value={settings.incrementBarbellKg}
            onChange={(v) => void updateSettings({ incrementBarbellKg: v })}
            step={0.5}
            min={0.5}
            max={10}
            suffix="kg"
            ariaLabel="incremento bilanciere"
          />
        </div>
        <div>
          <p className="label">Manubri (kg per manubrio)</p>
          <Stepper
            value={settings.incrementDumbbellKg}
            onChange={(v) => void updateSettings({ incrementDumbbellKg: v })}
            step={0.5}
            min={0.5}
            max={10}
            suffix="kg"
            ariaLabel="incremento manubri"
          />
        </div>
        <div>
          <p className="label">Cavi e macchine (valore di una tacca)</p>
          <Stepper
            value={settings.incrementCableKg}
            onChange={(v) => void updateSettings({ incrementCableKg: v })}
            step={0.5}
            min={0.5}
            max={20}
            suffix="kg"
            ariaLabel="incremento cavi e macchine"
          />
        </div>
      </Card>

      <SectionTitle>Recuperi, suono e vibrazione</SectionTitle>
      <Card>
        <p className="label">Durata dei recuperi</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            [0.75, '−25%'],
            [1, 'Scheda'],
            [1.25, '+25%'],
          ].map(([v, label]) => (
            <button
              key={String(v)}
              className={`btn-chip ${settings.restScale === v ? '!bg-ink !text-brand-400' : ''}`}
              aria-pressed={settings.restScale === v}
              onClick={() => void updateSettings({ restScale: v as number })}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-mute">
          I valori della scheda sono il default: 2′ sul principale, 90″ / 75″ / 60″ dopo le superserie,
          45″ dopo il core, 15″ di transizione.
        </p>

        <div className="mt-4 space-y-2">
          {(
            [
              ['sound', 'Suono a fine recupero'],
              ['vibration', 'Vibrazione a fine recupero'],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex min-h-[48px] items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white/55 px-4"
            >
              <span className="font-semibold">{label}</span>
              <input
                type="checkbox"
                className="h-6 w-6 accent-black"
                checked={settings[key]}
                onChange={(e) => void updateSettings({ [key]: e.target.checked })}
              />
            </label>
          ))}
        </div>
      </Card>

      <SectionTitle>Backup</SectionTitle>
      <Card>
        <button className="btn-primary w-full" onClick={doExport}>
          ⬇︎ Esporta backup JSON
        </button>
        <button className="btn-ghost mt-2 w-full" onClick={() => fileRef.current?.click()}>
          ⬆︎ Importa backup JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="sr-only"
          aria-label="Seleziona un file di backup"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void doImport(f);
            e.target.value = '';
          }}
        />
        <button
          className="btn-ghost mt-4 w-full !text-red-900"
          onClick={async () => {
            if (!window.confirm('Cancellare TUTTI i dati? L’operazione non è reversibile.')) return;
            await wipeAll();
            await reload();
            setMsg('Tutti i dati sono stati cancellati.');
          }}
        >
          Cancella tutti i dati
        </button>
        {msg && <p className="mt-3 text-center text-sm font-semibold">{msg}</p>}
      </Card>

      <p className="pb-4 text-center text-xs text-ink/45">FitTuplo · scheda upper body · v1.0</p>
    </div>
  );
}
