import type { BlockType } from '../data/types';

/** Colori distinti ma sobri per tipo di blocco. */
export const BLOCK_STYLE: Record<BlockType, { label: string; chip: string; bar: string }> = {
  warmup: { label: 'Riscaldamento', chip: 'bg-amber-900/12 text-amber-900', bar: 'bg-amber-700' },
  main: { label: 'Principale', chip: 'bg-ink text-brand-400', bar: 'bg-ink' },
  superset: { label: 'Superserie', chip: 'bg-orange-900/14 text-orange-900', bar: 'bg-orange-700' },
  core: { label: 'Core', chip: 'bg-teal-900/14 text-teal-900', bar: 'bg-teal-800' },
  cooldown: { label: 'Defaticamento', chip: 'bg-sky-900/14 text-sky-900', bar: 'bg-sky-800' },
};
