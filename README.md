# FitTuplo — Scheda Upper Body

PWA in italiano per seguire in palestra una scheda upper body di 12 settimane: sessioni A e B
alternate, superserie con timer di recupero, registrazione dei carichi e suggerimenti di
progressione automatici.

Funziona **offline**, si installa sulla home dello smartphone e **non ha backend né login**: tutti i
dati restano sul telefono (IndexedDB).

---

## Cosa fa

- **Oggi** — prossima sessione (A o B), ciclo, settimana e fase correnti con RIR e tempo di
  esecuzione, avanzamento del ciclo e aderenza, anteprima dei blocchi.
- **Modalità allenamento** — una schermata per serie, con:
  - spiegazione breve dell'esercizio sempre visibile, tecnica ed errori espandibili, nota ginocchia
    evidenziata;
  - **barra di avanzamento** della sessione, sempre in testa;
  - **carico suggerito** in base allo storico, regolabile con i pulsanti `+` e `−` (passo di 1 kg
    per i manubri, 2,5 kg per bilancieri, cavi e macchine);
  - ripetizioni (o secondi) e RIR facoltativo;
  - **timer di recupero che parte al click su “Completato”**, con `−15″` / `+15″` e **Salta**;
  - nelle superserie: transizione di 15″ tra i due esercizi e recupero completo solo dopo il secondo;
  - badge **DROP SET** sull'ultima serie degli esercizi ISO in fase di intensificazione;
  - pulsante **Sostituisci** per passare a un'alternativa, registrata come tale nello storico;
  - riscaldamento e defaticamento come checklist;
  - Screen Wake Lock attivo e salvataggio a ogni input.
- **Progressi** — dashboard con carico massimo e 1RM stimato (Epley) per esercizio, serie
  settimanali per gruppo muscolare, volume per sessione, peso corporeo con media mobile a 3
  misurazioni e circonferenza vita.
- **Storico** — elenco delle sessioni, dettaglio serie per serie, modifica ed eliminazione.
- **Esercizi** — una scheda per ciascuno dei 47 esercizi (alternative comprese) con muscoli,
  esecuzione, errori, nota ginocchia e ricerca su YouTube.
- **Consigli** — i principi della scheda, alimentazione, sonno, postura, ginocchia.
- **Impostazioni** — data di inizio, nuovo ciclo o reset, incrementi di carico, durata dei recuperi,
  suono e vibrazione, export/import del backup JSON, cancellazione dei dati.

### Il timer continua in background

Il timer non è un contatore in memoria: salva il **timestamp di fine** in `localStorage` e ricalcola
il tempo residuo a ogni tick e a ogni ritorno in primo piano. Se passi a un'altra app, blocchi lo
schermo o ricarichi la pagina, al rientro il conto alla rovescia è nel punto giusto.

---

## Come funziona la programmazione

La settimana si calcola dalle sessioni completate: la sessione *n* appartiene alla settimana
`ceil(n / 2)`, così una settimana saltata non fa perdere una fase.

| Fase | Settimane | Serie | RIR MULTI | RIR ISO | Tempo |
|---|---|---|---|---|---|
| 1. Riadattamento | 1–3 | standard −1 (min. 2) | 3 | 3 | 2-0-1 |
| 2. Costruzione | 4–8 | standard | 2 | 1–2 | 2-0-1 |
| 3. Intensificazione | 9–11 | standard | 1–2 | 0–1 | 3-0-1 sui MULTI, drop set sugli ISO |
| 4. Scarico | 12 | 50% arrotondato per eccesso | 4 | 4 | 2-0-1 |

Dal secondo ciclo la Fase 1 dura solo la settimana 1 e la Fase 2 va dalla 2 alla 8
(`phasesFirstCycle` e `phasesNextCycles` in `src/data/program.ts`).

**Progressione (doppia progressione):** quando tutte le serie di lavoro raggiungono il massimo del
range, la sessione successiva propone il carico aumentato e si riparte dal minimo. Dopo 2 sessioni
consecutive sotto il minimo in almeno metà delle serie, l'app propone −5/10%. Negli altri casi:
stesso carico, +1 ripetizione. I drop set non contano. Le trazioni assistite progrediscono
**riducendo** il peso di assistenza.

---

## Avvio

Serve Node 18 o superiore.

```bash
npm install
npm run dev      # sviluppo su http://localhost:5173
npm run build    # build di produzione in dist/
npm run preview  # anteprima della build
npm test         # test della logica (Vitest)
npm run lint     # ESLint
npm run format   # Prettier
```

## Installazione sullo smartphone

- **Android (Chrome):** apri il sito → menu ⋮ → *Installa app* / *Aggiungi a schermata Home*.
- **iOS (Safari):** apri il sito → *Condividi* → *Aggiungi a Home*. L'icona nera con il logogramma
  giallo FitTuplo comparirà tra le app.

Dopo la prima apertura l'app funziona senza rete.

## Deploy gratuito

Il progetto usa `base: './'` e `HashRouter`, quindi funziona sotto qualsiasi sottocartella.

**Netlify** — build `npm run build`, publish directory `dist`. Oppure trascina la cartella `dist`
su [app.netlify.com/drop](https://app.netlify.com/drop).

**Vercel** — importa il repository: Vite viene riconosciuto da solo (build `npm run build`, output
`dist`).

**GitHub Pages** — pubblica `dist` sul branch `gh-pages`:

```bash
npm run build
npx gh-pages -d dist
```

Poi *Settings → Pages → Branch: `gh-pages`*. Il service worker richiede HTTPS: tutte e tre le
piattaforme lo forniscono.

---

## Struttura

```
src/
  data/
    types.ts        tipi del dominio
    exercises.ts    libreria esercizi (scheda + alternative)
    program.ts      sessioni A e B, riscaldamento, defaticamento, fasi
  lib/
    logic.ts        settimana, fase, serie, progressione, timer, statistiche
    logic.test.ts   test della logica
    db.ts           Dexie (IndexedDB), backup export/import
    store.tsx       stato dell'app
    useTimer.ts     timer basato su timestamp, suono e vibrazione
  components/       componenti condivisi (vetro liquido, stepper, barra di avanzamento)
  pages/            Home, Workout, Progress, History, Library, Tips, Settings, Onboarding
  styles/index.css  design system "liquid glass"
```

Il programma è **separato dalla UI**: per cambiare esercizi, serie, ripetizioni o recuperi basta
modificare `src/data/program.ts` e `src/data/exercises.ts`, senza toccare i componenti.

## Stack

Vite · React 18 · TypeScript strict · Tailwind CSS · Dexie.js · React Router · Recharts ·
vite-plugin-pwa · Vitest · ESLint + Prettier

---

⚠︎ La scheda non sostituisce il parere medico. In caso di dolore acuto interrompi l'esercizio.
