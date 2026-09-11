# FitTuplo — Scheda Upper Body

PWA in italiano per seguire in palestra una scheda upper body di 12 settimane: sessioni A e B
alternate, superserie con timer di recupero, registrazione dei carichi e suggerimenti di
progressione automatici.

Funziona **offline**, si installa sulla home dello smartphone e **non ha backend né login**: tutti i
dati restano sul telefono (IndexedDB).

---

## Cosa fa

- **Oggi** — scegli tu se fare la **Sessione A o la Sessione B** (quella suggerita
  dall'alternanza è marcata “consigliata”, ma non è vincolante); ciclo, settimana e fase correnti
  con RIR e tempo di esecuzione, avanzamento del ciclo e aderenza, anteprima dei blocchi della
  sessione scelta.
- **Modalità allenamento** — una schermata per serie, con:
  - spiegazione breve dell'esercizio sempre visibile, tecnica ed errori espandibili, nota ginocchia
    evidenziata;
  - **barra di avanzamento** della sessione, sempre in testa;
  - **carico suggerito** in base allo storico, regolabile con i pulsanti `+` e `−` (passo di 1 kg
    per i manubri, 2,5 kg per bilancieri, cavi e macchine);
  - ripetizioni (o secondi) e RIR facoltativo;
  - **timer di recupero che parte al click su “Completato”**, con `−15″` / `+15″` e **Salta**;
  - nelle superserie si passa subito al secondo esercizio, senza timer: il recupero parte solo
    dopo il secondo;
  - badge **DROP SET** sull'ultima serie degli esercizi ISO in fase di intensificazione;
  - pulsante **Sostituisci** per passare a un'alternativa, registrata come tale nello storico;
  - riscaldamento e defaticamento come checklist;
  - **Annulla la sessione** con conferma in-app: elimina le serie registrate e riporta alla home;
  - Screen Wake Lock attivo e salvataggio a ogni input.

  Ogni ingresso in allenamento **ricomincia la sessione da capo**: se esci a metà, la sessione
  interrotta viene scartata e non resta appesa nello storico.
- **Progressi** — dashboard con carico massimo e 1RM stimato (Epley) per esercizio, serie
  settimanali per gruppo muscolare, volume per sessione, peso corporeo con media mobile a 3
  misurazioni e circonferenza vita.
- **Storico** — elenco delle sessioni completate, dettaglio serie per serie, modifica ed
  eliminazione.
- **Consigli** — i principi della scheda, alimentazione, sonno, postura, ginocchia.
- **Impostazioni** — data di inizio, nuovo ciclo o reset, incrementi di carico, durata dei recuperi,
  suono e vibrazione, export/import del backup JSON, cancellazione dei dati.

### Il timer continua in background

Il timer non è un contatore in memoria: salva il **timestamp di fine** in `localStorage` e ricalcola
il tempo residuo a ogni tick e a ogni ritorno in primo piano. Se passi a un'altra app o blocchi lo
schermo, al rientro il conto alla rovescia è nel punto giusto.

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

Le icone sono già versionate in `public/`. Per rigenerarle dopo una modifica del logo:

```bash
npm i -D sharp && node scripts/build-icons.mjs
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

**GitHub Pages (già configurato)** — il workflow `.github/workflows/deploy.yml` esegue lint, test e
build a ogni push e pubblica `dist`. Serve **una sola volta** accendere Pages, perché il token di
GitHub Actions non ha il permesso di creare il sito da solo:

> *Settings → Pages → Build and deployment → Source: **GitHub Actions*** → salva.

Poi *Actions → CI e deploy su GitHub Pages → Run workflow* (o basta il push successivo). L'app sarà
su `https://spidermandre.github.io/FitTuplo/`.

Il service worker richiede HTTPS: tutte e tre le piattaforme lo forniscono.

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
  pages/            Home, Workout, Progress, History, Tips, Settings, Onboarding
  styles/index.css  design system "liquid glass"
```

Il programma è **separato dalla UI**: per cambiare esercizi, serie, ripetizioni o recuperi basta
modificare `src/data/program.ts` e `src/data/exercises.ts`, senza toccare i componenti.

## Stack

Vite · React 18 · TypeScript strict · Tailwind CSS · Dexie.js · React Router · Recharts ·
vite-plugin-pwa · Vitest · ESLint + Prettier

---

⚠︎ La scheda non sostituisce il parere medico. In caso di dolore acuto interrompi l'esercizio.
