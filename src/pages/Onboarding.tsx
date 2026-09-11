import { useState } from 'react';
import { useStore } from '../lib/store';
import { newId } from '../lib/db';
import { Card, Logo } from '../components/ui';

export default function Onboarding() {
  const { updateSettings, putMetric } = useStore();
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState('70');
  const [waist, setWaist] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const w = Number(weight.replace(',', '.'));
    const c = Number(waist.replace(',', '.'));
    if (!Number.isNaN(w) && w > 0) {
      await putMetric({
        id: newId(),
        date: startDate,
        weightKg: w,
        ...(waist && !Number.isNaN(c) ? { waistCm: c } : {}),
      });
    }
    await updateSettings({ startDate, onboarded: true, cycle: 1 });
  };

  return (
    <div className="mx-auto w-full max-w-[480px] px-4 pb-10 pt-safe">
      <header className="mb-6 mt-6 text-center">
        <Logo />
        <h1 className="mt-4 text-3xl font-black leading-tight">
          La tua scheda
          <br />
          upper body.
        </h1>
        <p className="mt-2 text-sm font-medium text-ink/70">
          Due sessioni a settimana, alternate A → B. Ti guido serie per serie, tengo il tempo di
          recupero e ricordo i carichi al posto tuo.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <label className="label" htmlFor="start">
            Data di inizio
          </label>
          <input
            id="start"
            type="date"
            className="field"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="w">
                Peso attuale (kg)
              </label>
              <input
                id="w"
                type="number"
                inputMode="decimal"
                step="0.1"
                className="field"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="c">
                Vita (cm)
              </label>
              <input
                id="c"
                type="number"
                inputMode="decimal"
                step="0.5"
                className="field"
                placeholder="facolt."
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card className="solid !bg-red-50">
          <h2 className="text-sm font-black uppercase tracking-wide">Prima di iniziare</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink/80">
            La scheda non sostituisce il parere medico. In caso di dolore acuto interrompi
            l’esercizio. Nessun esercizio carica le ginocchia: se una posizione provoca un fastidio
            superiore a 3 su 10, usa l’alternativa indicata nella scheda dell’esercizio; se il dolore
            persiste consulta un medico o un fisioterapista.
          </p>
        </Card>

        <button className="btn-primary w-full" type="submit" disabled={busy}>
          Inizia
        </button>
      </form>
    </div>
  );
}
