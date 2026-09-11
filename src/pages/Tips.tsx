import { Link } from 'react-router-dom';
import { Card, SectionTitle } from '../components/ui';

const PRINCIPLES = [
  [
    'Due sessioni upper body complete, alternate',
    'Sessione A e Sessione B: ogni gruppo muscolare viene allenato 2 volte a settimana, la frequenza più efficace disponendo di soli 2 giorni.',
  ],
  [
    'Superserie di muscoli antagonisti',
    'Abbinare muscoli che non competono aumenta densità e dispendio energetico della sessione senza penalizzare la prestazione, restando nei 90 minuti.',
  ],
  [
    'Più serie di tirata che di spinta',
    'Rinforzano dorso e deltoidi posteriori per contrastare la postura da scrivania e da bici.',
  ],
  [
    'Esercizi che caricano il muscolo in allungamento',
    'Croci ai cavi, curl su panca inclinata, estensioni tricipiti sopra la testa, pullover: le evidenze più recenti li indicano come particolarmente efficaci per la crescita muscolare.',
  ],
  [
    'Intensità gestita con il RIR',
    'Reps In Reserve: quante ripetizioni pulite resterebbero prima del cedimento. Un RIR 2 significa che ti saresti fermato due ripetizioni prima di non farcela più.',
  ],
  [
    'Doppia progressione',
    'Prima si aumentano le ripetizioni all’interno del range, poi il carico. L’app te lo suggerisce da sola a ogni esercizio.',
  ],
  [
    'Ginocchia protette',
    'Nessuna posizione in ginocchio, nessun rematore con il ginocchio sulla panca: esercizi da seduti con schienale o in piedi, con carico solo sulla parte superiore.',
  ],
  [
    'Il dimagrimento dipende soprattutto dal bilancio calorico',
    'L’allenamento serve a mantenere e costruire muscolo mentre si perde grasso, ed è ciò che produce l’effetto “tonico”.',
  ],
] as const;

const ADVICE = [
  [
    '🍽 Alimentazione',
    'Deficit calorico moderato: circa 300–500 kcal al giorno sotto il fabbisogno. Proteine 1,6–2,2 g per kg di peso corporeo (circa 110–150 g al giorno). Una perdita di peso sostenibile è lo 0,5–1% del peso a settimana. Per un piano alimentare personalizzato rivolgiti a un nutrizionista o a un dietista.',
  ],
  ['😴 Sonno', '7–9 ore per notte: sono fondamentali per il recupero e per il controllo della fame.'],
  [
    '💻 Lavoro sedentario',
    'Alzati 2–3 minuti ogni 45–60 minuti. Micro-routine da scrivania: retrazioni scapolari, rotazioni toraciche da seduto, stretching dei pettorali allo stipite.',
  ],
  [
    '🦵 Ginocchia',
    'Nessun esercizio della scheda dovrebbe caricarle. Se una posizione provoca un fastidio superiore a 3 su 10, usa l’alternativa indicata; se il dolore persiste consulta un medico o un fisioterapista. Nei ciclisti una posizione in sella non corretta (altezza e arretramento della sella) è una causa frequente di dolore alle ginocchia: valuta un controllo della posizione in bici.',
  ],
] as const;

export default function Tips() {
  return (
    <div className="space-y-4 pb-4">
      <header className="py-3">
        <Link to="/" className="btn-chip">
          ← Home
        </Link>
        <h1 className="mt-3 text-3xl font-black">Come funziona</h1>
        <p className="text-sm font-medium text-ink/65">
          I principi dietro la scheda, e cosa fare fuori dalla palestra.
        </p>
      </header>

      <SectionTitle>Principi della scheda</SectionTitle>
      <ol className="space-y-2">
        {PRINCIPLES.map(([title, body], i) => (
          <li key={title}>
            <Card>
              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-black text-brand-400">
                  {i + 1}
                </span>
                <div>
                  <p className="font-bold leading-snug">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink/75">{body}</p>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ol>

      <SectionTitle>Consigli</SectionTitle>
      <div className="space-y-2">
        {ADVICE.map(([title, body]) => (
          <Card key={title}>
            <p className="font-bold">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink/75">{body}</p>
          </Card>
        ))}
      </div>

      <Card className="solid !bg-red-50">
        <p className="font-bold">⚠︎ Avviso</p>
        <p className="mt-1 text-sm leading-relaxed text-ink/80">
          La scheda non sostituisce il parere medico. In caso di dolore acuto interrompi l’esercizio.
        </p>
      </Card>
    </div>
  );
}
